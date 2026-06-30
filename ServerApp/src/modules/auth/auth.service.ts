import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { SendOtpDto, AuthRole } from './dto/send-otp.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

interface OtpEntry {
  code: string;
  role: AuthRole;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, OtpEntry>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly jwtService: JwtService,
    private readonly whatsappService: WhatsappService,
  ) {}

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

  async registerVerify(dto: RegisterVerifyDto): Promise<{ accessToken: string }> {
    const entry = this.otpStore.get(dto.phone);

    if (!entry) throw new BadRequestException('Aucun OTP trouvé pour ce numéro');
    if (entry.code !== dto.code) throw new UnauthorizedException('Code OTP invalide');
    if (entry.expiresAt < new Date()) {
      this.otpStore.delete(dto.phone);
      throw new UnauthorizedException('OTP expiré, veuillez en demander un nouveau');
    }
    this.otpStore.delete(dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crée ou met à jour le compte avec le hash du mot de passe
    let user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (user) {
      await this.userRepo.update(user.id, { passwordHash });
    } else {
      user = this.userRepo.create({ phone: dto.phone, passwordHash });
      await this.userRepo.save(user);
      this.logger.log(`Nouvel utilisateur inscrit: ${user.id}`);
    }

    const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: 'user' });
    return { accessToken };
  }

  // ── Connexion : téléphone + mot de passe ─────────────────────────────────

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
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

    const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken };
  }
}