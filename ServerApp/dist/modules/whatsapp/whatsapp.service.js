"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(WhatsappService_1.name);
        this.twilioClient = null;
        this.isDev = config.get('NODE_ENV') !== 'production';
        const sid = config.get('TWILIO_ACCOUNT_SID');
        const token = config.get('TWILIO_AUTH_TOKEN');
        this.from = config.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886');
        if (sid && token) {
            const twilio = require('twilio');
            this.twilioClient = twilio(sid, token);
            this.logger.log('Twilio WhatsApp initialisé');
        }
        else {
            this.logger.warn('Twilio non configuré — OTP envoyé en console uniquement');
        }
    }
    async sendOtp(phone, code) {
        const body = `🔐 Votre code de vérification Mishwar est : *${code}*\n\nValide 5 minutes. Ne le partagez pas.`;
        if (this.twilioClient) {
            try {
                await this.twilioClient.messages.create({
                    from: this.from,
                    to: `whatsapp:${phone}`,
                    body,
                });
                this.logger.log(`OTP envoyé via WhatsApp à ${phone}`);
            }
            catch (err) {
                this.logger.error(`Échec WhatsApp pour ${phone}: ${err.message}`);
                if (this.isDev)
                    this.logger.warn(`[OTP DEV FALLBACK] ${phone} → ${code}`);
            }
        }
        else {
            this.logger.log(`[OTP DEV] ${phone} → ${code}`);
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map