import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { LoginDto } from './dto/login.dto';
import { AdminBootstrapDto } from './dto/admin-bootstrap.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    bootstrapAdmin(dto: AdminBootstrapDto): Promise<{
        accessToken: string;
    }>;
}
