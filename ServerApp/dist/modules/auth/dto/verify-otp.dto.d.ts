import { AuthRole } from './send-otp.dto';
export declare class VerifyOtpDto {
    phone: string;
    code: string;
    role: AuthRole;
}
