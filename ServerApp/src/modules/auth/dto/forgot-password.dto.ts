import { SendOtpDto } from './send-otp.dto';

// Même forme que l'étape 1 de l'inscription — réutilise le même mécanisme OTP en mémoire
export class ForgotPasswordDto extends SendOtpDto {}
