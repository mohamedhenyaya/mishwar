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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendOtpDto = exports.AuthRole = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var AuthRole;
(function (AuthRole) {
    AuthRole["USER"] = "user";
    AuthRole["DRIVER"] = "driver";
})(AuthRole || (exports.AuthRole = AuthRole = {}));
class SendOtpDto {
}
exports.SendOtpDto = SendOtpDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+213612345678', description: 'Numéro au format international (E.164)' }),
    (0, class_validator_1.IsPhoneNumber)(),
    __metadata("design:type", String)
], SendOtpDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: AuthRole, default: AuthRole.USER }),
    (0, class_validator_1.IsEnum)(AuthRole),
    __metadata("design:type", String)
], SendOtpDto.prototype, "role", void 0);
//# sourceMappingURL=send-otp.dto.js.map