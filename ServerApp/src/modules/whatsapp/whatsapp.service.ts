import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private twilioClient: any = null;
  private readonly from: string;
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.isDev = config.get<string>('NODE_ENV') !== 'production';

    const sid   = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    this.from   = config.get<string>('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886');

    if (sid && token) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio');
      this.twilioClient = twilio(sid, token);
      this.logger.log('Twilio WhatsApp initialisé');
    } else {
      this.logger.warn('Twilio non configuré — OTP envoyé en console uniquement');
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const body = `🔐 Votre code de vérification Mishwar est : *${code}*\n\nValide 5 minutes. Ne le partagez pas.`;

    if (this.twilioClient) {
      try {
        await this.twilioClient.messages.create({
          from: this.from,
          to:   `whatsapp:${phone}`,
          body,
        });
        this.logger.log(`OTP envoyé via WhatsApp à ${phone}`);
      } catch (err: any) {
        this.logger.error(`Échec WhatsApp pour ${phone}: ${err.message}`);
        // En cas d'erreur Twilio, on loggue seulement — l'OTP reste valide
        if (this.isDev) this.logger.warn(`[OTP DEV FALLBACK] ${phone} → ${code}`);
      }
    } else {
      this.logger.log(`[OTP DEV] ${phone} → ${code}`);
    }
  }
}