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
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const user_entity_1 = require("../users/entities/user.entity");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
let AuthService = AuthService_1 = class AuthService {
    constructor(userRepo, driverRepo, refreshTokenRepo, jwtService, whatsappService, config) {
        this.userRepo = userRepo;
        this.driverRepo = driverRepo;
        this.refreshTokenRepo = refreshTokenRepo;
        this.jwtService = jwtService;
        this.whatsappService = whatsappService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.otpStore = new Map();
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    async issueTokenPair(sub, phone, role) {
        const accessToken = this.jwtService.sign({ sub, phone, role });
        const refreshToken = crypto.randomBytes(40).toString('hex');
        await this.refreshTokenRepo.save(this.refreshTokenRepo.create({
            ownerId: sub,
            role,
            phone,
            tokenHash: this.hashToken(refreshToken),
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            revokedAt: null,
        }));
        return { accessToken, refreshToken };
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
        if (entry.role === send_otp_dto_1.AuthRole.DRIVER) {
            let driver = await this.driverRepo.findOne({ where: { phone: dto.phone } });
            if (driver) {
                await this.driverRepo.update(driver.id, { passwordHash });
            }
            else {
                driver = this.driverRepo.create({ phone: dto.phone, passwordHash });
                await this.driverRepo.save(driver);
                this.logger.log(`Nouveau chauffeur inscrit: ${driver.id}`);
            }
            return this.issueTokenPair(driver.id, driver.phone, 'driver');
        }
        let user = await this.userRepo.findOne({ where: { phone: dto.phone } });
        if (user) {
            await this.userRepo.update(user.id, { passwordHash });
        }
        else {
            user = this.userRepo.create({ phone: dto.phone, passwordHash });
            await this.userRepo.save(user);
            this.logger.log(`Nouvel utilisateur inscrit: ${user.id}`);
        }
        return this.issueTokenPair(user.id, user.phone, 'user');
    }
    async login(dto) {
        const role = dto.role ?? send_otp_dto_1.AuthRole.USER;
        if (role === send_otp_dto_1.AuthRole.DRIVER) {
            const driver = await this.driverRepo
                .createQueryBuilder('driver')
                .addSelect('driver.passwordHash')
                .where('driver.phone = :phone', { phone: dto.phone })
                .getOne();
            if (!driver) {
                throw new common_1.UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
            }
            if (!driver.passwordHash) {
                throw new common_1.UnauthorizedException('Ce compte n\'a pas encore de mot de passe — utilisez l\'inscription');
            }
            const isValid = await bcrypt.compare(dto.password, driver.passwordHash);
            if (!isValid) {
                throw new common_1.UnauthorizedException('Numéro de téléphone ou mot de passe incorrect');
            }
            if (!driver.isActive) {
                throw new common_1.ForbiddenException(driver.blockedReason ?? 'Compte bloqué');
            }
            return this.issueTokenPair(driver.id, driver.phone, 'driver');
        }
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
        if (!user.isActive) {
            throw new common_1.ForbiddenException(user.blockedReason ?? 'Compte bloqué');
        }
        return this.issueTokenPair(user.id, user.phone, user.role);
    }
    async bootstrapAdmin(dto) {
        const expectedSecret = this.config.get('ADMIN_BOOTSTRAP_SECRET');
        if (!expectedSecret || dto.secret !== expectedSecret) {
            throw new common_1.ForbiddenException('Secret invalide');
        }
        const adminCount = await this.userRepo.count({ where: { role: user_entity_1.UserRole.ADMIN } });
        if (adminCount > 0) {
            throw new common_1.ForbiddenException('Un admin existe déjà — utilisez POST /admin/users/admins avec un compte admin existant');
        }
        const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
        if (existing)
            throw new common_1.BadRequestException('Un compte avec ce numéro existe déjà');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const admin = this.userRepo.create({
            phone: dto.phone,
            name: dto.name,
            passwordHash,
            role: user_entity_1.UserRole.ADMIN,
        });
        await this.userRepo.save(admin);
        this.logger.log(`Premier compte admin créé: ${admin.id}`);
        return this.issueTokenPair(admin.id, admin.phone, 'admin');
    }
    async refresh(dto) {
        const tokenHash = this.hashToken(dto.refreshToken);
        const record = await this.refreshTokenRepo.findOne({ where: { tokenHash } });
        if (!record || record.revokedAt || record.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token invalide ou expiré');
        }
        await this.refreshTokenRepo.update(record.id, { revokedAt: new Date() });
        return this.issueTokenPair(record.ownerId, record.phone, record.role);
    }
    async logout(jwt) {
        await this.refreshTokenRepo.update({ ownerId: jwt.sub }, { revokedAt: new Date() });
        return { message: 'Déconnexion réussie' };
    }
    async forgotPassword(dto) {
        return this.sendOtp(dto);
    }
    async resetPassword(dto) {
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
        const passwordHash = await bcrypt.hash(dto.newPassword, 10);
        let ownerId;
        if (entry.role === send_otp_dto_1.AuthRole.DRIVER) {
            const driver = await this.driverRepo.findOne({ where: { phone: dto.phone } });
            if (!driver)
                throw new common_1.NotFoundException('Aucun compte chauffeur trouvé pour ce numéro');
            await this.driverRepo.update(driver.id, { passwordHash });
            ownerId = driver.id;
        }
        else {
            const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
            if (!user)
                throw new common_1.NotFoundException('Aucun compte utilisateur trouvé pour ce numéro');
            await this.userRepo.update(user.id, { passwordHash });
            ownerId = user.id;
        }
        await this.refreshTokenRepo.update({ ownerId }, { revokedAt: new Date() });
        return { message: 'Mot de passe réinitialisé avec succès' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(driver_entity_1.Driver)),
    __param(2, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService,
        whatsapp_service_1.WhatsappService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map