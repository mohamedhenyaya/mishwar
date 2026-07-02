import { AuthRole } from './send-otp.dto';
export declare class LoginDto {
    phone: string;
    password: string;
    role?: AuthRole;
}
