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
var RidesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ride_entity_1 = require("./entities/ride.entity");
const geolocation_gateway_1 = require("../geolocation/geolocation.gateway");
const drivers_service_1 = require("../drivers/drivers.service");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const pricing_util_1 = require("./utils/pricing.util");
let RidesService = RidesService_1 = class RidesService {
    constructor(rideRepo, geolocationGateway, driversService, config) {
        this.rideRepo = rideRepo;
        this.geolocationGateway = geolocationGateway;
        this.driversService = driversService;
        this.config = config;
        this.logger = new common_1.Logger(RidesService_1.name);
    }
    async createRide(userId, dto) {
        const ride = this.rideRepo.create({
            userId,
            startLatitude: dto.startLatitude,
            startLongitude: dto.startLongitude,
            destinationName: dto.destinationName,
            endLatitude: dto.endLatitude ?? null,
            endLongitude: dto.endLongitude ?? null,
            vehicleType: dto.vehicleType,
            status: ride_entity_1.RideStatus.PENDING,
        });
        const saved = await this.rideRepo.save(ride);
        this.logger.log(`Course créée: ${saved.id} par user ${userId}`);
        const notifiedDriverIds = await this.geolocationGateway.notifyNearbyDrivers(saved);
        saved.notifiedDriverIds = notifiedDriverIds;
        await this.rideRepo.update(saved.id, { notifiedDriverIds });
        this.scheduleRideTimeout(saved.id);
        return saved;
    }
    async findById(id) {
        return this.rideRepo.findOne({ where: { id } });
    }
    async findByUser(userId) {
        return this.rideRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async findByIdForParticipant(id, jwt) {
        const ride = await this.rideRepo.findOne({ where: { id } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        const isRider = jwt.role === 'user' && ride.userId === jwt.sub;
        const isAssignedDriver = jwt.role === 'driver' && ride.driverId === jwt.sub;
        if (!isRider && !isAssignedDriver) {
            throw new common_1.ForbiddenException('Accès refusé à cette course');
        }
        return ride;
    }
    async acceptRide(rideId, driverId) {
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ driverId, status: ride_entity_1.RideStatus.ACCEPTED })
            .where('id = :id AND status = :status', { id: rideId, status: ride_entity_1.RideStatus.PENDING })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Cette course a déjà été acceptée ou n\'est plus disponible');
        }
        await this.driversService.updateStatus(driverId, driver_entity_1.DriverStatus.BUSY);
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        const driver = await this.driversService.findById(driverId);
        await this.geolocationGateway.notifyRideAccepted(ride, driver);
        return ride;
    }
    async rejectRide(rideId, driverId) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (!ride.rejectedDriverIds.includes(driverId)) {
            ride.rejectedDriverIds = [...ride.rejectedDriverIds, driverId];
            await this.rideRepo.update(rideId, { rejectedDriverIds: ride.rejectedDriverIds });
        }
        const allRejected = ride.notifiedDriverIds.length > 0 &&
            ride.notifiedDriverIds.every((id) => ride.rejectedDriverIds.includes(id));
        if (!allRejected)
            return;
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.CANCELLED })
            .where('id = :id AND status = :status', { id: rideId, status: ride_entity_1.RideStatus.PENDING })
            .execute();
        if (result.affected) {
            this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'no_driver_available');
        }
    }
    async startRide(rideId, driverId) {
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.IN_PROGRESS })
            .where('id = :id AND status = :status AND "driverId" = :driverId', {
            id: rideId,
            status: ride_entity_1.RideStatus.ACCEPTED,
            driverId,
        })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Impossible de démarrer cette course');
        }
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        await this.geolocationGateway.notifyRideStarted(ride);
        return ride;
    }
    async completeRide(rideId, driverId, dto) {
        const existing = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!existing)
            throw new common_1.NotFoundException('Course non trouvée');
        if (existing.driverId !== driverId)
            throw new common_1.ForbiddenException('Cette course ne vous est pas assignée');
        const endLatitude = dto.endLatitude ?? existing.endLatitude ?? existing.startLatitude;
        const endLongitude = dto.endLongitude ?? existing.endLongitude ?? existing.startLongitude;
        const price = (0, pricing_util_1.computeFare)(existing.startLatitude, existing.startLongitude, endLatitude, endLongitude);
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.COMPLETED, price, endLatitude, endLongitude })
            .where('id = :id AND status = :status AND "driverId" = :driverId', {
            id: rideId,
            status: ride_entity_1.RideStatus.IN_PROGRESS,
            driverId,
        })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Impossible de terminer cette course');
        }
        await this.driversService.updateStatus(driverId, driver_entity_1.DriverStatus.ONLINE);
        await this.driversService.incrementTotalRides(driverId);
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        await this.geolocationGateway.notifyRideCompleted(ride);
        return ride;
    }
    async cancelRide(rideId, userId) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.userId !== userId)
            throw new common_1.ForbiddenException('Cette course ne vous appartient pas');
        if (ride.status !== ride_entity_1.RideStatus.PENDING && ride.status !== ride_entity_1.RideStatus.ACCEPTED) {
            throw new common_1.ConflictException('Cette course ne peut plus être annulée');
        }
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.CANCELLED })
            .where('id = :id AND status = :status', { id: rideId, status: ride.status })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Cette course ne peut plus être annulée');
        }
        if (ride.driverId) {
            await this.driversService.updateStatus(ride.driverId, driver_entity_1.DriverStatus.ONLINE);
            this.geolocationGateway.notifyRideCancelled(`driver:${ride.driverId}`, rideId, 'rider_cancelled');
        }
        else {
            for (const driverId of ride.notifiedDriverIds) {
                this.geolocationGateway.notifyRideUnavailable(driverId, rideId);
            }
        }
    }
    scheduleRideTimeout(rideId) {
        const timeoutMs = this.config.get('RIDE_ACCEPT_TIMEOUT_MS', 60_000);
        const timer = setTimeout(async () => {
            const ride = await this.rideRepo.findOne({ where: { id: rideId } });
            if (!ride)
                return;
            const result = await this.rideRepo
                .createQueryBuilder()
                .update(ride_entity_1.Ride)
                .set({ status: ride_entity_1.RideStatus.CANCELLED })
                .where('id = :id AND status = :status', { id: rideId, status: ride_entity_1.RideStatus.PENDING })
                .execute();
            if (!result.affected)
                return;
            this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'timeout');
            for (const driverId of ride.notifiedDriverIds) {
                this.geolocationGateway.notifyRideUnavailable(driverId, rideId);
            }
        }, timeoutMs);
        timer.unref();
    }
};
exports.RidesService = RidesService;
exports.RidesService = RidesService = RidesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ride_entity_1.Ride)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        geolocation_gateway_1.GeolocationGateway,
        drivers_service_1.DriversService,
        config_1.ConfigService])
], RidesService);
//# sourceMappingURL=rides.service.js.map