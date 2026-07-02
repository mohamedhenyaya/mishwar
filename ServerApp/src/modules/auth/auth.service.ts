import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
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

interface OtpEntry {
  code: string;
  role: AuthRole;
  expiresAt: Date;
}

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
  ) {}

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

    this.otpStore.set(dto.phone, { code, role: dto.role, expiresAt });

    await this.whatsappService.sendOtp(dto.phone, code);

    const response: { message: string; otp?: string } = {
      message: 'Code OTP envoyé avec succès',
    };
    if (process.env.NODE_ENV !== 'production') {
      response.otp = code;
    }
    return response;
  }

  // ── Inscription : étape 2 — vérifier OTP + créer compte avec mot de passe ─

  async registerVerify(dto: RegisterVerifyDto): Promise<{ accessToken: string; refreshToken: string }> {
    const entry = this.otpStore.get(dto.phone);

    if (!entry) throw new BadRequestException('Aucun OTP trouvé pour ce numéro');
    if (entry.code !== dto.code) throw new UnauthorizedException('Code OTP invalide');
    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(dto.phone);
      throw new UnauthorizedException('OTP expiré, veuillez en demander un nouveau');
    }
    this.otpStore.delete(dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Le rôle est celui enregistré à l'étape send-otp — jamais fourni par le client ici
    if (entry.role === AuthRole.DRIVER) {
      let driver = await this.driverRepo.findOne({ where: { phone: dto.phone } });
      if (driver) {
        await this.driverRepo.update(driver.id, { passwordHash });
      } else {
        driver = this.driverRepo.create({ phone: dto.phone, passwordHash });
        await this.driverRepo.save(driver);
        this.logger.log(`Nouveau chauffeur inscrit: ${driver.id}`);
      }

      return this.issueTokenPair(driver.id, driver.phone, 'driver');
    }

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
      if (!driver.isActive) {
        throw new ForbiddenException(driver.blockedReason ?? 'Compte bloqué');
      }

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
    if (!user.isActive) {
      throw new ForbiddenException(user.blockedReason ?? 'Compte bloqué');
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
    return { message: 'Déconnexion réussie' };
  }

  // ── Mot de passe oublié : réutilise le mécanisme OTP existant ──────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; otp?: string }> {
    return this.sendOtp(dto);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const entry = this.otpStore.get(dto.phone);

    if (!entry) throw new BadRequestException('Aucun OTP trouvé pour ce numéro');
    if (entry.code !== dto.code) throw new UnauthorizedException('Code OTP invalide');
    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(dto.phone);
      throw new UnauthorizedException('OTP expiré, veuillez en demander un nouveau');
    }
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