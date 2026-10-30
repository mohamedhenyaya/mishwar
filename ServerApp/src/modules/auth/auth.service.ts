import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Driver, DriverStatus, VehicleType } from '../drivers/entities/driver.entity';
import { DriversService } from '../drivers/drivers.service';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { VehicleApprovalStatus } from '../vehicles/entities/vehicle.entity';
import { createDriverVehicle } from '../vehicles/driver-vehicle.util';
import { assertNniFree } from '../drivers/identity.util';
import { blockedMessage, releaseExpiredBlocks, stillBlocked } from '../../common/utils/account-block.util';
import { RefreshToken } from './entities/refresh-token.entity';
import { SendOtpDto, AuthRole } from './dto/send-otp.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { AdminBootstrapDto } from './dto/admin-bootstrap.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { DeviceOwnerType, DeviceToken } from '../notifications/entities/device-token.entity';

interface OtpEntry {
  code: string;
  role: AuthRole;
  expiresAt: Date;
  attempts: number; // codes faux saisis
}

// Au-delà, le code est invalidé : il faut en redemander un (empêche de le deviner)
const MAX_OTP_ATTEMPTS = 5;

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, OtpEntry>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly whatsappService: WhatsappService,
    private readonly config: ConfigService,
    // Résolu à l'appel : DriversModule dépend (indirectement) d'AuthModule
    private readonly moduleRef: ModuleRef,
  ) {}

  // Blocages temporaires arrivés à échéance : comptes réactivés chaque minute
  onModuleInit(): void {
    const timer = setInterval(() => { void releaseExpiredBlocks(this.userRepo.manager).catch(() => undefined); }, 60_000);
    timer.unref();
  }

  // Connexion ou déconnexion d'un capitaine : il repasse hors ligne et devra cliquer
  // « En ligne » lui-même. Une course en cours (BUSY) n'est pas touchée.
  private async setDriverOffline(driverId: string): Promise<void> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId }, select: { id: true, status: true } });
    if (driver?.status !== DriverStatus.ONLINE) return;
    await this.moduleRef.get(DriversService, { strict: false }).updateStatus(driverId, DriverStatus.OFFLINE);
  }

  // ── Émet un couple access/refresh token et persiste le hash du refresh ────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueTokenPair(
    sub: string,
    phone: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({ sub, phone, role });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        ownerId: sub,
        role,
        phone,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
      }),
    );

    return { accessToken, refreshToken };
  }

  // ── Inscription : étape 1 — envoyer OTP ──────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; otp?: string }> {
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1_000);

    this.otpStore.set(dto.phone, { code, role: dto.role, expiresAt, attempts: 0 });

    await this.whatsappService.sendOtp(dto.phone, code);

    const response: { message: string; otp?: string } = {
      message: 'Code OTP envoyé avec succès',
    };
    if (process.env.NODE_ENV !== 'production') {
      response.otp = code;
    }
    return response;
  }

  // Code reçu valide et non expiré (sans le consommer) — sinon erreur explicite
  private checkOtp(phone: string, code: string): OtpEntry {
    const entry = this.otpStore.get(phone);
    if (!entry) throw new BadRequestException('Aucun code en cours pour ce numéro : demandez-en un nouveau');
    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(phone);
      throw new UnauthorizedException('Code expiré : demandez-en un nouveau');
    }
    if (entry.code !== code) {
      entry.attempts += 1;
      const left = MAX_OTP_ATTEMPTS - entry.attempts;
      if (left <= 0) {
        this.otpStore.delete(phone);
        throw new UnauthorizedException('Trop d’essais : demandez un nouveau code');
      }
      throw new UnauthorizedException(`Code incorrect (${left} essai${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''})`);
    }
    return entry;
  }

  // Inscription : vérifie le code dès sa saisie, avant les étapes véhicule et documents.
  // Le code reste valable pour la création du compte (register/verify).
  checkRegisterOtp(phone: string, code: string): { valid: true } {
    this.checkOtp(phone, code);
    return { valid: true };
  }

  // ── Inscription : étape 2 — vérifier OTP + créer compte avec mot de passe ─

  async registerVerify(dto: RegisterVerifyDto): Promise<{ accessToken: string; refreshToken: string }> {
    const entry = this.checkOtp(dto.phone, dto.code);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Le rôle est celui enregistré à l'étape send-otp — jamais fourni par le client ici
    if (entry.role === AuthRole.DRIVER) {
      let driver = await this.driverRepo.findOne({ where: { phone: dto.phone } });
      if (driver) {
        await this.driverRepo.update(driver.id, { passwordHash });
        await this.setDriverOffline(driver.id);
      } else {
        // Un capitaine = un véhicule : pas de compte sans véhicule. L'OTP n'est consommé
        // qu'après la création, pour pouvoir corriger une plaque refusée sans nouveau code.
        if (!dto.firstName?.trim() || !dto.lastName?.trim() || !dto.nni) {
          throw new BadRequestException('Le prénom, le nom et le NNI sont obligatoires');
        }
        if (!dto.vehicleMake?.trim() || !dto.vehicleModel?.trim() || !dto.vehicleYear || !dto.vehicleFuel || !dto.vehiclePlate?.trim()) {
          throw new BadRequestException('Marque, modèle, année, énergie et immatriculation du véhicule sont obligatoires');
        }
        const firstName = dto.firstName.trim();
        const lastName  = dto.lastName.trim();
        await assertNniFree(this.driverRepo.manager, dto.nni);
        driver = await this.driverRepo.manager.transaction(async (manager) => {
          const created = await manager.getRepository(Driver).save(
            manager.getRepository(Driver).create({
              phone: dto.phone, passwordHash, firstName, lastName, nni: dto.nni, name: `${firstName} ${lastName}`,
            }),
          );
          await createDriverVehicle(manager, created.id, {
            type:        dto.vehicleType ?? VehicleType.SEDAN,
            make:        dto.vehicleMake!.trim(),
            model:       dto.vehicleModel!.trim(),
            year:        dto.vehicleYear,
            fuelType:    dto.vehicleFuel,
            plateNumber: dto.vehiclePlate!,
          }, VehicleApprovalStatus.PENDING);
          return created;
        });
        this.logger.log(`Nouveau chauffeur inscrit: ${driver.id}`);
        this.moduleRef.get(GeolocationGateway, { strict: false }).notifyAdminsPendingChanged();
      }

      this.otpStore.delete(dto.phone);
      return this.issueTokenPair(driver.id, driver.phone, 'driver');
    }
    this.otpStore.delete(dto.phone);

    // Crée ou met à jour le compte avec le hash du mot de passe
    let user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (user) {
      await this.userRepo.update(user.id, { passwordHash });
    } else {
      user = this.userRepo.create({ phone: dto.phone, passwordHash });
      await this.userRepo.save(user);
      this.logger.log(`Nouvel utilisateur inscrit: ${user.id}`);
    }

    return this.issueTokenPair(user.id, user.phone, 'user');
  }

  // ── Connexion : téléphone + mot de passe ─────────────────────────────────

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const role = dto.role ?? AuthRole.USER;

    if (role === AuthRole.DRIVER) {
      const driver = await this.driverRepo
        .createQueryBuilder('driver')
        .addSelect('driver.passwordHash')
        .where('driver.phone = :phone', { phone: dto.phone })
        .getOne();

      if (!driver) {
        throw new UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
      }
      if (!driver.passwordHash) {
        throw new UnauthorizedException('Ce compte n\'a pas encore de mot de passe — utilisez l\'inscription');
      }

      const isValid = await bcrypt.compare(dto.password, driver.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
      }
      if (await stillBlocked(this.driverRepo.manager, Driver, driver)) {
        throw new ForbiddenException(blockedMessage(driver));
      }

      await this.setDriverOffline(driver.id);
      return this.issueTokenPair(driver.id, driver.phone, 'driver');
    }

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone: dto.phone })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Ce compte n\'a pas encore de mot de passe — utilisez l\'inscription');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
    }
    if (await stillBlocked(this.userRepo.manager, User, user)) {
      throw new ForbiddenException(blockedMessage(user));
    }

    return this.issueTokenPair(user.id, user.phone, user.role);
  }

  // ── Amorçage : créer le tout premier compte admin ─────────────────────────
  // Ne fonctionne qu'une seule fois (tant qu'aucun admin n'existe) et exige le secret serveur.

  async bootstrapAdmin(dto: AdminBootstrapDto): Promise<{ accessToken: string; refreshToken: string }> {
    const expectedSecret = this.config.get<string>('ADMIN_BOOTSTRAP_SECRET');
    if (!expectedSecret || dto.secret !== expectedSecret) {
      throw new ForbiddenException('Secret invalide');
    }

    const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    if (adminCount > 0) {
      throw new ForbiddenException(
        'Un admin existe déjà — utilisez POST /admin/users/admins avec un compte admin existant',
      );
    }

    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new BadRequestException('Un compte avec ce numéro existe déjà');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = this.userRepo.create({
      phone: dto.phone,
      name:  dto.name,
      passwordHash,
      role:  UserRole.ADMIN,
    });
    await this.userRepo.save(admin);
    this.logger.log(`Premier compte admin créé: ${admin.id}`);

    return this.issueTokenPair(admin.id, admin.phone, 'admin');
  }

  // ── Rafraîchissement du token — rotation : l'ancien refresh token est révoqué ──

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const record = await this.refreshTokenRepo.findOne({ where: { tokenHash } });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    await this.refreshTokenRepo.update(record.id, { revokedAt: new Date() });

    return this.issueTokenPair(record.ownerId, record.phone, record.role);
  }

  // ── Déconnexion : révoque tous les refresh tokens actifs de l'utilisateur courant ──

  async logout(jwt: JwtPayload): Promise<{ message: string }> {
    await this.refreshTokenRepo.update({ ownerId: jwt.sub }, { revokedAt: new Date() });
    if (jwt.role === 'driver') {
      await this.setDriverOffline(jwt.sub);
      // Plus d'écran « Nouvelle course » par push sur ce téléphone une fois déconnecté
      await this.refreshTokenRepo.manager.getRepository(DeviceToken)
        .delete({ ownerType: DeviceOwnerType.DRIVER, ownerId: jwt.sub });
    }
    return { message: 'Déconnexion réussie' };
  }

  // ── Mot de passe oublié : réutilise le mécanisme OTP existant ──────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; otp?: string }> {
    return this.sendOtp(dto);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const entry = this.checkOtp(dto.phone, dto.code);
    this.otpStore.delete(dto.phone);

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    let ownerId: string;

    if (entry.role === AuthRole.DRIVER) {
      const driver = await this.driverRepo.findOne({ where: { phone: dto.phone } });
      if (!driver) throw new NotFoundException('Aucun compte chauffeur trouvé pour ce numéro');
      await this.driverRepo.update(driver.id, { passwordHash });
      ownerId = driver.id;
    } else {
      const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
      if (!user) throw new NotFoundException('Aucun compte utilisateur trouvé pour ce numéro');
      await this.userRepo.update(user.id, { passwordHash });
      ownerId = user.id;
    }

    // Sécurité : invalide toutes les sessions existantes après un changement de mot de passe
    await this.refreshTokenRepo.update({ ownerId }, { revokedAt: new Date() });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }
}