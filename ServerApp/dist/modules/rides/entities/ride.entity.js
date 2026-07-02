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
exports.Ride = exports.RideVehicleClass = exports.RideStatus = void 0;
const typeorm_1 = require("typeorm");
var RideStatus;
(function (RideStatus) {
    RideStatus["PENDING"] = "PENDING";
    RideStatus["ACCEPTED"] = "ACCEPTED";
    RideStatus["IN_PROGRESS"] = "IN_PROGRESS";
    RideStatus["COMPLETED"] = "COMPLETED";
    RideStatus["CANCELLED"] = "CANCELLED";
})(RideStatus || (exports.RideStatus = RideStatus = {}));
var RideVehicleClass;
(function (RideVehicleClass) {
    RideVehicleClass["ECONOMY"] = "economy";
    RideVehicleClass["COMFORT"] = "comfort";
    RideVehicleClass["PREMIUM"] = "premium";
})(RideVehicleClass || (exports.RideVehicleClass = RideVehicleClass = {}));
let Ride = class Ride {
};
exports.Ride = Ride;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Ride.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Ride.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Ride.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7 }),
    __metadata("design:type", Number)
], Ride.prototype, "startLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7 }),
    __metadata("design:type", Number)
], Ride.prototype, "startLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ride.prototype, "destinationName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Number)
], Ride.prototype, "endLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Number)
], Ride.prototype, "endLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RideVehicleClass,
        default: RideVehicleClass.ECONOMY,
    }),
    __metadata("design:type", String)
], Ride.prototype, "vehicleType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RideStatus,
        default: RideStatus.PENDING,
    }),
    __metadata("design:type", String)
], Ride.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], Ride.prototype, "notifiedDriverIds", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { array: true, default: '{}' }),
    __metadata("design:type", Array)
], Ride.prototype, "rejectedDriverIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Ride.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Ride.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Ride.prototype, "updatedAt", void 0);
exports.Ride = Ride = __decorate([
    (0, typeorm_1.Entity)('rides')
], Ride);
//# sourceMappingURL=ride.entity.js.map