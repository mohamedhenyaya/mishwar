import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { AdminBootstrapDto } from './dto/admin-bootstrap.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { JwtPayload } from './strategies/jwt.strategy';
export declare class AuthService {
    private readonly userRepo;
    private readonly driverRepo;
    private readonly refreshTokenRepo;
    private readonly jwtService;
    private readonly whatsappService;
    private readonly config;
    private readonly logger;
    private readonly otpStore;
    constructor(userRepo: Repository<User>, driverRepo: Repository<Driver>, refreshTokenRepo: Repository<RefreshToken>, jwtService: JwtService, whatsappService: WhatsappService, config: ConfigService);
    private hashToken;
    private issueTokenPair;
    sendOtp(dto: SendOtpDto): Promise<{
        message: string;
        otp?: string;
    }>;
    registerVerify(dto: RegisterVerifyDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    bootstrapAdmin(dto: AdminBootstrapDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(jwt: JwtPayload): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        otp?: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
