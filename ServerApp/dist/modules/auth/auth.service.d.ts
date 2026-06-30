import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
export declare class AuthService {
    private readonly userRepo;
    private readonly driverRepo;
    private readonly jwtService;
    private readonly whatsappService;
    private readonly logger;
    private readonly otpStore;
    constructor(userRepo: Repository<User>, driverRepo: Repository<Driver>, jwtService: JwtService, whatsappService: WhatsappService);
    sendOtp(dto: SendOtpDto): Promise<{
        message: string;
        otp?: string;
    }>;
    registerVerify(dto: RegisterVerifyDto): Promise<{
        accessToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
    }>;
}
