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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const register_verify_dto_1 = require("./dto/register-verify.dto");
const login_dto_1 = require("./dto/login.dto");
const admin_bootstrap_dto_1 = require("./dto/admin-bootstrap.dto");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    sendOtp(dto) {
        return this.authService.sendOtp(dto);
    }
    registerVerify(dto) {
        return this.authService.registerVerify(dto);
    }
    login(dto) {
        return this.authService.login(dto);
    }
    bootstrapAdmin(dto) {
        return this.authService.bootstrapAdmin(dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('register/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_verify_dto_1.RegisterVerifyDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "registerVerify", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('admin/bootstrap'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Créer le tout premier compte administrateur',
        description: 'Réservé à la mise en route de la plateforme. Nécessite ADMIN_BOOTSTRAP_SECRET et échoue si un admin existe déjà — utilisez ensuite POST /admin/users/admins en tant qu\'admin authentifié.',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_bootstrap_dto_1.AdminBootstrapDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "bootstrapAdmin", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map