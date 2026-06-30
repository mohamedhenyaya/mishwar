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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const user_entity_1 = require("../users/entities/user.entity");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepo, driverRepo, jwtService, whatsappService) {
        this.userRepo = userRepo;
        this.driverRepo = driverRepo;
        this.jwtService = jwtService;
        this.whatsappService = whatsappService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.otpStore = new Map();
    }
    async sendOtp(dto) {
        const code = Math.floor(100_000 + Math.random() * 900_000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1_000);
        this.otpStore.set(dto.phone, { code, role: dto.role, expiresAt });
        await this.whatsappService.sendOtp(dto.phone, code);
        const response = {
            message: 'Code OTP envoyé avec succès',
        };
        if (process.env.NODE_ENV !== 'production') {
            response.otp = code;
        }
        return response;
    }
    async registerVerify(dto) {
        const entry = this.otpStore.get(dto.phone);
        if (!entry)
            throw new common_1.BadRequestException('Aucun OTP trouvé pour ce numéro');
        if (entry.code !== dto.code)
            throw new common_1.UnauthorizedException('Code OTP invalide');
        if (entry.expiresAt < new Date()) {
            this.otpStore.delete(dto.phone);
            throw new common_1.UnauthorizedException('OTP expiré, veuillez en demander un nouveau');
        }
        this.otpStore.delete(dto.phone);
        const passwordHash = await bcrypt.hash(dto.password, 10);
        let user = await this.userRepo.findOne({ where: { phone: dto.phone } });
        if (user) {
            await this.userRepo.update(user.id, { passwordHash });
        }
        else {
            user = this.userRepo.create({ phone: dto.phone, passwordHash });
            await this.userRepo.save(user);
            this.logger.log(`Nouvel utilisateur inscrit: ${user.id}`);
        }
        const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: 'user' });
        return { accessToken };
    }
    async login(dto) {
        const user = await this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.phone = :phone', { phone: dto.phone })
            .getOne();
        if (!user) {
            throw new common_1.UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('Ce compte n\'a pas encore de mot de passe — utilisez l\'inscription');
        }
        const isValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
        }
        const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
        return { accessToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(driver_entity_1.Driver)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        whatsapp_service_1.WhatsappService])
], AuthService);
//# sourceMappingURL=auth.service.js.map