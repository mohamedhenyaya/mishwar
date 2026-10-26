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
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rxjs_1 = require("rxjs");
const driver_entity_1 = require("./entities/driver.entity");
const public_profile_util_1 = require("../../common/utils/public-profile.util");
let DriversService = class DriversService {
    constructor(driverRepo) {
        this.driverRepo = driverRepo;
        this.statusChanges = new rxjs_1.Subject();
    }
    async findNearby(dto, vehicleTypes) {
        const radius = dto.radius ?? 5_000;
        const rows = await this.driverRepo.query(`
      SELECT * FROM (
        SELECT
          id,
          name,
          phone,
          status,
          "vehicleType",
          rating,
          latitude,
          longitude,
          6371000 * 2 * ASIN(SQRT(
            POWER(SIN((RADIANS($1) - RADIANS(latitude))  / 2), 2) +
            COS(RADIANS($1)) * COS(RADIANS(latitude)) *
            POWER(SIN((RADIANS($2) - RADIANS(longitude)) / 2), 2)
          )) AS "distanceMeters"
        FROM drivers
        WHERE
          status     = 'ONLINE'
          AND latitude  IS NOT NULL
          AND longitude IS NOT NULL
          AND "isActive" = true
          AND ($4::text[] IS NULL OR "vehicleType"::text = ANY($4))
      ) AS nearby
      WHERE "distanceMeters" <= $3
      ORDER BY "distanceMeters" ASC
      LIMIT 20
      `, [dto.lat, dto.lng, radius, vehicleTypes ?? null]);
        return rows.map((r) => ({
            ...r,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
            distanceMeters: parseFloat(r.distanceMeters),
            rating: parseFloat(r.rating),
        }));
    }
    async updateLocation(id, dto) {
        await this.driverRepo.update(id, {
            latitude: dto.latitude,
            longitude: dto.longitude,
            lastLocationUpdate: new Date(),
        });
    }
    async updateStatus(id, status) {
        await this.driverRepo.update(id, { status });
        this.statusChanges.next({ driverId: id, status });
        return this.findById(id);
    }
    async findById(id) {
        const driver = await this.driverRepo.findOne({ where: { id } });
        if (!driver)
            throw new common_1.NotFoundException('Chauffeur non trouvé');
        return driver;
    }
    async incrementTotalRides(id) {
        await this.driverRepo.increment({ id }, 'totalRides', 1);
    }
    async updateProfile(id, dto) {
        await this.driverRepo.update(id, dto);
        return this.findById(id);
    }
    async addRating(id, rating) {
        const driver = await this.findById(id);
        await this.driverRepo.update(id, {
            rating: (0, public_profile_util_1.nextAverage)(driver.rating, driver.ratingCount, rating),
            ratingCount: driver.ratingCount + 1,
        });
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(driver_entity_1.Driver)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DriversService);
//# sourceMappingURL=drivers.service.js.map