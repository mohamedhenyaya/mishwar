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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const create_ride_dto_1 = require("./dto/create-ride.dto");
const complete_ride_dto_1 = require("./dto/complete-ride.dto");
const rate_ride_dto_1 = require("./dto/rate-ride.dto");
const rides_service_1 = require("./rides.service");
const pricing_util_1 = require("./utils/pricing.util");
let RidesController = class RidesController {
    constructor(ridesService) {
        this.ridesService = ridesService;
    }
    create(user, dto) {
        return this.ridesService.createRide(user.sub, dto);
    }
    estimate(dto) {
        return this.ridesService.estimateRide(dto);
    }
    createScheduled(user, dto) {
        return this.ridesService.createScheduledRide(user.sub, dto);
    }
    myScheduledRides(user) {
        return this.ridesService.findScheduledByUser(user.sub);
    }
    updateScheduled(user, id, dto) {
        return this.ridesService.updateScheduledRide(id, user.sub, dto);
    }
    cancelScheduled(user, id) {
        return this.ridesService.cancelScheduledRide(id, user.sub);
    }
    myRides(user) {
        return this.ridesService.findByUser(user.sub);
    }
    tariff() {
        return pricing_util_1.TARIFF;
    }
    active(user) {
        return this.ridesService.findActive(user);
    }
    findOne(user, id) {
        return this.ridesService.findByIdForParticipant(id, user);
    }
    receipt(user, id) {
        return this.ridesService.getReceipt(id, user);
    }
    accept(user, id) {
        return this.ridesService.acceptRide(id, user.sub);
    }
    reject(user, id) {
        return this.ridesService.rejectRide(id, user.sub);
    }
    arrive(user, id) {
        return this.ridesService.arriveRide(id, user.sub);
    }
    rate(user, id, dto) {
        return this.ridesService.rateRide(id, user, dto.rating);
    }
    start(user, id) {
        return this.ridesService.startRide(id, user.sub);
    }
    complete(user, id, dto) {
        return this.ridesService.completeRide(id, user.sub, dto);
    }
    cancel(user, id, dto) {
        return this.ridesService.cancelRide(id, user.sub, dto.reason);
    }
    driverCancel(user, id, dto) {
        return this.ridesService.driverCancelRide(id, user.sub, dto);
    }
    driverCancel(user, id) {
        return this.ridesService.cancelRideByDriver(id, user.sub);
    }
};
exports.RidesController = RidesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_ride_dto_1.CreateRideDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('estimate'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof EstimateRideDto !== "undefined" && EstimateRideDto) === "function" ? _a : Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "estimate", null);
__decorate([
    (0, common_1.Post)('scheduled'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, typeof (_b = typeof CreateScheduledRideDto !== "undefined" && CreateScheduledRideDto) === "function" ? _b : Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "createScheduled", null);
__decorate([
    (0, common_1.Get)('scheduled/my'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "myScheduledRides", null);
__decorate([
    (0, common_1.Patch)('scheduled/:id'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, typeof (_c = typeof UpdateScheduledRideDto !== "undefined" && UpdateScheduledRideDto) === "function" ? _c : Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "updateScheduled", null);
__decorate([
    (0, common_1.Delete)('scheduled/:id'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "cancelScheduled", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "myRides", null);
__decorate([
    (0, common_1.Get)('tariff'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "tariff", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "active", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/receipt'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "receipt", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/arrive'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "arrive", null);
__decorate([
    (0, common_1.Post)(':id/rate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, rate_ride_dto_1.RateRideDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "rate", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, complete_ride_dto_1.CompleteRideDto]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, roles_decorator_1.Roles)('user'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, typeof (_d = typeof CancelRideDto !== "undefined" && CancelRideDto) === "function" ? _d : Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/driver-cancel'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, typeof (_e = typeof DriverCancelRideDto !== "undefined" && DriverCancelRideDto) === "function" ? _e : Object]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "driverCancel", null);
__decorate([
    (0, common_1.Post)(':id/driver-cancel'),
    (0, roles_decorator_1.Roles)('driver'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RidesController.prototype, "driverCancel", null);
exports.RidesController = RidesController = __decorate([
    (0, common_1.Controller)('rides'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [rides_service_1.RidesService])
], RidesController);
//# sourceMappingURL=rides.controller.js.map