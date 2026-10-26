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
const bcrypt = require("bcryptjs");
const driver_entity_1 = require("./entities/driver.entity");
const geolocation_gateway_1 = require("../geolocation/geolocation.gateway");
const ride_entity_1 = require("../rides/entities/ride.entity");
const wallet_transaction_entity_1 = require("../wallet/entities/wallet-transaction.entity");
let DriversService = class DriversService {
    constructor(driverRepo, geolocationGateway) {
        this.driverRepo = driverRepo;
        this.geolocationGateway = geolocationGateway;
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
        this.geolocationGateway.notifyDriverStatus(id, status);
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
    async createByAdmin(dto) {
        const existing = await this.driverRepo.findOne({ where: { phone: dto.phone } });
        if (existing)
            throw new common_1.ConflictException('Un chauffeur avec ce numéro existe déjà');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const driver = this.driverRepo.create({
            phone: dto.phone,
            name: dto.name,
            passwordHash,
            vehicleType: dto.vehicleType,
            vehicleModel: dto.vehicleModel,
            vehiclePlate: dto.vehiclePlate,
        });
        return this.driverRepo.save(driver);
    }
    async updateByAdmin(id, dto) {
        await this.findById(id);
        await this.driverRepo.update(id, dto);
        return this.findById(id);
    }
    async block(id, reason) {
        await this.findById(id);
        await this.driverRepo.update(id, {
            isActive: false,
            blockedReason: reason ?? null,
            blockedAt: new Date(),
            status: driver_entity_1.DriverStatus.OFFLINE,
        });
        this.geolocationGateway.notifyCustom(`driver:${id}`, 'account:blocked', { reason: reason ?? null });
        return this.findById(id);
    }
    async unblock(id) {
        await this.findById(id);
        await this.driverRepo.update(id, { isActive: true, blockedReason: null, blockedAt: null });
        return this.findById(id);
    }
    async findAllPaginated(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const qb = this.driverRepo.createQueryBuilder('driver').orderBy('driver.createdAt', 'DESC');
        if (query.status)
            qb.andWhere('driver.status = :status', { status: query.status });
        if (query.isActive !== undefined) {
            qb.andWhere('driver.isActive = :isActive', { isActive: query.isActive === 'true' });
        }
        if (query.search) {
            qb.andWhere('(driver.name ILIKE :s OR driver.phone ILIKE :s)', { s: `%${query.search}%` });
        }
        const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data, total, page, limit };
    }
    async getStats(id) {
        const driver = await this.findById(id);
        const rideRepo = this.driverRepo.manager.getRepository(ride_entity_1.Ride);
        const statusCounts = await rideRepo
            .createQueryBuilder('ride')
            .select('ride.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('ride.driverId = :id', { id })
            .groupBy('ride.status')
            .getRawMany();
        const ridesByStatus = {};
        let totalRides = 0;
        for (const row of statusCounts) {
            const count = parseInt(row.count, 10);
            ridesByStatus[row.status] = count;
            totalRides += count;
        }
        const earnedRow = await rideRepo
            .createQueryBuilder('ride')
            .select('COALESCE(SUM(ride.price), 0)', 'total')
            .where('ride.driverId = :id AND ride.status = :status', { id, status: ride_entity_1.RideStatus.COMPLETED })
            .getRawOne();
        const txRepo = this.driverRepo.manager.getRepository(wallet_transaction_entity_1.WalletTransaction);
        const commissionRow = await txRepo
            .createQueryBuilder('tx')
            .select('COALESCE(SUM(-tx.amount), 0)', 'total')
            .where('tx.ownerType = :ownerType AND tx.ownerId = :id AND tx.type = :type', {
            ownerType: wallet_transaction_entity_1.WalletOwnerType.DRIVER,
            id,
            type: wallet_transaction_entity_1.WalletTransactionType.COMMISSION_DEDUCTION,
        })
            .getRawOne();
        return {
            driver,
            totalRides,
            ridesByStatus,
            totalEarned: parseFloat(earnedRow.total),
            totalCommissionPaid: parseFloat(commissionRow.total),
            balance: Number(driver.balance),
        };
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(driver_entity_1.Driver)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => geolocation_gateway_1.GeolocationGateway))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        geolocation_gateway_1.GeolocationGateway])
], DriversService);
//# sourceMappingURL=drivers.service.js.map