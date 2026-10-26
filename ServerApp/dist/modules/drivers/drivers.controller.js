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
exports.DriversController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const photo_upload_util_1 = require("../../common/utils/photo-upload.util");
const update_driver_dto_1 = require("./dto/update-driver.dto");
const drivers_service_1 = require("./drivers.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const nearby_drivers_dto_1 = require("./dto/nearby-drivers.dto");
const update_location_dto_1 = require("./dto/update-location.dto");
const driver_entity_1 = require("./entities/driver.entity");
let DriversController = class DriversController {
    constructor(driversService) {
        this.driversService = driversService;
    }
    findNearby(dto) {
        return this.driversService.findNearby(dto);
    }
    getProfile(user) {
        return this.driversService.findById(user.sub);
    }
    updateProfile(user, dto) {
        return this.driversService.updateProfile(user.sub, dto);
    }
    uploadPhoto(user, file) {
        if (!file)
            throw new common_1.BadRequestException('Aucune photo reçue');
        return this.driversService.updateProfile(user.sub, { photoUrl: (0, photo_upload_util_1.photoPath)(file) });
    }
    updateLocation(user, dto) {
        return this.driversService.updateLocation(user.sub, dto);
    }
    updateStatus(user, status) {
        return this.driversService.updateStatus(user.sub, status);
    }
};
exports.DriversController = DriversController;
__decorate([
    (0, common_1.Get)('nearby'),
    (0, swagger_1.ApiOperation)({ summary: 'Chauffeurs ONLINE dans un rayon (PostGIS ST_DWithin)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [nearby_drivers_dto_1.NearbyDriversDto]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "findNearby", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('driver'),
    (0, swagger_1.ApiOperation)({ summary: 'Profil du chauffeur connecté' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('driver'),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour son profil et son véhicule' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_driver_dto_1.UpdateDriverDto]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('me/photo'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('driver'),
    (0, swagger_1.ApiOperation)({ summary: 'Envoyer sa photo de profil (champ "photo")' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', photo_upload_util_1.photoUploadOptions)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "uploadPhoto", null);
__decorate([
    (0, common_1.Patch)('location'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('driver'),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour la position GPS (REST fallback)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_location_dto_1.UpdateLocationDto]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Patch)('status'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('driver'),
    (0, swagger_1.ApiOperation)({ summary: 'Passer ONLINE / OFFLINE / BUSY' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DriversController.prototype, "updateStatus", null);
exports.DriversController = DriversController = __decorate([
    (0, swagger_1.ApiTags)('drivers'),
    (0, common_1.Controller)('drivers'),
    __metadata("design:paramtypes", [drivers_service_1.DriversService])
], DriversController);
//# sourceMappingURL=drivers.controller.js.map