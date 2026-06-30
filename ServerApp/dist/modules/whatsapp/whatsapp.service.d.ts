import { ConfigService } from '@nestjs/config';
export declare class WhatsappService {
    private readonly config;
    private readonly logger;
    private twilioClient;
    private readonly from;
    private readonly isDev;
    constructor(config: ConfigService);
    sendOtp(phone: string, code: string): Promise<void>;
}
