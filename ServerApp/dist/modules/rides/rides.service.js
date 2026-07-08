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
const leaderboard_query_dto_1 = require("./dto/leaderboard-query.dto");
const geolocation_gateway_1 = require("../geolocation/geolocation.gateway");
const drivers_service_1 = require("../drivers/drivers.service");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const pricing_util_1 = require("./utils/pricing.util");
const geo_util_1 = require("../../common/utils/geo.util");
const settings_service_1 = require("../settings/settings.service");
const wallet_service_1 = require("../wallet/wallet.service");
const promotions_service_1 = require("../promotions/promotions.service");
const users_service_1 = require("../users/users.service");
const AVG_TRIP_SPEED_KMH = 30;
const SCHEDULED_ACTIVATION_WINDOW_MS = 5 * 60 * 1_000;
const SCHEDULED_POLL_INTERVAL_MS = 60 * 1_000;
const METER_STOP_THRESHOLD_METERS = 25;
const METER_MAX_PING_GAP_SECONDS = 30;
const LEADERBOARD_LIMIT = 50;
function getLeaderboardPeriodStart(period) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
        case leaderboard_query_dto_1.LeaderboardPeriod.DAY:
            return start;
        case leaderboard_query_dto_1.LeaderboardPeriod.WEEK: {
            const dayIndex = (start.getDay() + 6) % 7;
            start.setDate(start.getDate() - dayIndex);
            return start;
        }
        case leaderboard_query_dto_1.LeaderboardPeriod.MONTH:
            return new Date(now.getFullYear(), now.getMonth(), 1);
        case leaderboard_query_dto_1.LeaderboardPeriod.YEAR:
            return new Date(now.getFullYear(), 0, 1);
    }
}
let RidesService = RidesService_1 = class RidesService {
    constructor(rideRepo, geolocationGateway, driversService, config, settingsService, walletService, promotionsService, usersService) {
        this.rideRepo = rideRepo;
        this.geolocationGateway = geolocationGateway;
        this.driversService = driversService;
        this.config = config;
        this.settingsService = settingsService;
        this.walletService = walletService;
        this.promotionsService = promotionsService;
        this.usersService = usersService;
        this.logger = new common_1.Logger(RidesService_1.name);
    }
    onModuleInit() {
        const timer = setInterval(() => {
            this.activateDueScheduledRides().catch((err) => this.logger.error(`Échec de l'activation des courses programmées: ${err.message}`));
        }, SCHEDULED_POLL_INTERVAL_MS);
        timer.unref();
    }
    async createRide(userId, dto) {
        const isOpenTrip = dto.isOpenTrip ?? false;
        let estimatedPrice = null;
        if (!isOpenTrip && dto.endLatitude != null && dto.endLongitude != null) {
            const settings = await this.settingsService.getSettings();
            estimatedPrice = (0, pricing_util_1.computeFare)(dto.startLatitude, dto.startLongitude, dto.endLatitude, dto.endLongitude, Number(settings.pricePerKm), Number(settings.minimumFare));
        }
        const ride = this.rideRepo.create({
            userId,
            startLatitude: dto.startLatitude,
            startLongitude: dto.startLongitude,
            destinationName: dto.destinationName,
            endLatitude: dto.endLatitude ?? null,
            endLongitude: dto.endLongitude ?? null,
            vehicleType: dto.vehicleType,
            couponCode: dto.couponCode ?? null,
            isOpenTrip,
            estimatedPrice,
            status: ride_entity_1.RideStatus.PENDING,
        });
        const saved = await this.rideRepo.save(ride);
        this.logger.log(`Course créée: ${saved.id} par user ${userId}`);
        await this.activatePendingRide(saved);
        return saved;
    }
    async activatePendingRide(ride) {
        const notifiedDriverIds = await this.geolocationGateway.notifyNearbyDrivers(ride);
        ride.notifiedDriverIds = notifiedDriverIds;
        await this.rideRepo.update(ride.id, { notifiedDriverIds });
        this.scheduleRideTimeout(ride.id);
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
        if (isAssignedDriver) {
            const rider = await this.usersService.findById(ride.userId);
            return { ...ride, riderName: rider.name ?? undefined, riderPhone: rider.phone };
        }
        return ride;
    }
    async acceptRide(rideId, driverId) {
        const driver = await this.driversService.findById(driverId);
        if (!driver.isActive) {
            throw new common_1.ForbiddenException(driver.blockedReason ?? 'Compte chauffeur bloqué');
        }
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
        const existing = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!existing)
            throw new common_1.NotFoundException('Course non trouvée');
        const startedAt = new Date();
        const meterSeed = existing.isOpenTrip
            ? {
                lastMeterLatitude: existing.startLatitude,
                lastMeterLongitude: existing.startLongitude,
                lastMeterAt: startedAt,
                traveledDistanceKm: 0,
                stoppedSeconds: 0,
            }
            : {};
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.IN_PROGRESS, startedAt, ...meterSeed })
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
    async recordMeterPing(rideId, latitude, longitude) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride || !ride.isOpenTrip || ride.status !== ride_entity_1.RideStatus.IN_PROGRESS)
            return null;
        if (ride.lastMeterLatitude == null || ride.lastMeterLongitude == null || !ride.lastMeterAt)
            return null;
        const now = new Date();
        const elapsedSeconds = Math.min(METER_MAX_PING_GAP_SECONDS, Math.max(0, (now.getTime() - ride.lastMeterAt.getTime()) / 1000));
        const movedMeters = (0, geo_util_1.haversineMeters)(Number(ride.lastMeterLatitude), Number(ride.lastMeterLongitude), latitude, longitude);
        let traveledDistanceKm = Number(ride.traveledDistanceKm);
        let stoppedSeconds = ride.stoppedSeconds;
        if (movedMeters < METER_STOP_THRESHOLD_METERS) {
            stoppedSeconds += Math.round(elapsedSeconds);
        }
        else {
            traveledDistanceKm += movedMeters / 1000;
        }
        const settings = await this.settingsService.getSettings();
        const livePrice = Math.max(Math.round((traveledDistanceKm * Number(settings.pricePerKm) +
            (stoppedSeconds / 60) * Number(settings.perStopMinuteRate)) * 100) / 100, Number(settings.minimumFare));
        await this.rideRepo.update(rideId, {
            traveledDistanceKm,
            stoppedSeconds,
            livePrice,
            lastMeterLatitude: latitude,
            lastMeterLongitude: longitude,
            lastMeterAt: now,
        });
        return {
            distanceKm: Math.round(traveledDistanceKm * 100) / 100,
            stoppedMinutes: Math.round((stoppedSeconds / 60) * 10) / 10,
            price: livePrice,
        };
    }
    async completeRide(rideId, driverId, dto) {
        const existing = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!existing)
            throw new common_1.NotFoundException('Course non trouvée');
        if (existing.driverId !== driverId)
            throw new common_1.ForbiddenException('Cette course ne vous est pas assignée');
        const endLatitude = dto.endLatitude ?? existing.lastMeterLatitude ?? existing.endLatitude ?? existing.startLatitude;
        const endLongitude = dto.endLongitude ?? existing.lastMeterLongitude ?? existing.endLongitude ?? existing.startLongitude;
        const settings = await this.settingsService.getSettings();
        const grossPrice = existing.isOpenTrip
            ? Math.max(Math.round((Number(existing.traveledDistanceKm) * Number(settings.pricePerKm) +
                (existing.stoppedSeconds / 60) * Number(settings.perStopMinuteRate)) * 100) / 100, Number(settings.minimumFare))
            : (0, pricing_util_1.computeFare)(existing.startLatitude, existing.startLongitude, endLatitude, endLongitude, Number(settings.pricePerKm), Number(settings.minimumFare));
        let discountAmount = 0;
        if (existing.couponCode) {
            try {
                const result = await this.promotionsService.redeem(existing.couponCode, existing.userId, rideId, grossPrice);
                discountAmount = result.discountAmount;
            }
            catch (err) {
                this.logger.warn(`Coupon ${existing.couponCode} non appliqué sur la course ${rideId}: ${err.message}`);
            }
        }
        const price = Math.max(0, Math.round((grossPrice - discountAmount) * 100) / 100);
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.COMPLETED, price, discountAmount, endLatitude, endLongitude })
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
        await this.walletService.deductCommission(driverId, rideId, price, Number(settings.commissionPercent));
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        await this.geolocationGateway.notifyRideCompleted(ride);
        return ride;
    }
    async cancelRide(rideId, userId, reason) {
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
            .set({ status: ride_entity_1.RideStatus.CANCELLED, cancelledBy: 'user', cancelReason: reason ?? null })
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
    async driverCancelRide(rideId, driverId, dto) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.driverId !== driverId)
            throw new common_1.ForbiddenException('Cette course ne vous est pas assignée');
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({
            status: ride_entity_1.RideStatus.CANCELLED,
            cancelledBy: 'driver',
            cancelReason: dto.reason ?? null,
        })
            .where('id = :id AND status = :status AND "driverId" = :driverId', {
            id: rideId,
            status: ride_entity_1.RideStatus.ACCEPTED,
            driverId,
        })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Cette course ne peut plus être annulée par le chauffeur');
        }
        await this.driversService.updateStatus(driverId, driver_entity_1.DriverStatus.ONLINE);
        this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'driver_cancelled');
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
    async estimateRide(dto) {
        const settings = await this.settingsService.getSettings();
        const distanceKm = (0, geo_util_1.haversineMeters)(dto.startLatitude, dto.startLongitude, dto.endLatitude, dto.endLongitude) / 1000;
        const estimatedPrice = (0, pricing_util_1.computeFare)(dto.startLatitude, dto.startLongitude, dto.endLatitude, dto.endLongitude, Number(settings.pricePerKm), Number(settings.minimumFare));
        return {
            distanceKm: Math.round(distanceKm * 100) / 100,
            estimatedDurationMinutes: Math.max(1, Math.round((distanceKm / AVG_TRIP_SPEED_KMH) * 60)),
            estimatedPrice,
        };
    }
    async getReceipt(rideId, jwt) {
        const ride = await this.findByIdForParticipant(rideId, jwt);
        if (ride.status !== ride_entity_1.RideStatus.COMPLETED) {
            throw new common_1.BadRequestException('Le reçu n\'est disponible qu\'une fois la course terminée');
        }
        const settings = await this.settingsService.getSettings();
        const distanceKm = (0, geo_util_1.haversineMeters)(ride.startLatitude, ride.startLongitude, ride.endLatitude ?? ride.startLatitude, ride.endLongitude ?? ride.startLongitude) / 1000;
        const discountAmount = Number(ride.discountAmount ?? 0);
        const finalPrice = Number(ride.price ?? 0);
        return {
            rideId: ride.id,
            distanceKm: Math.round(distanceKm * 100) / 100,
            pricePerKm: Number(settings.pricePerKm),
            minimumFare: Number(settings.minimumFare),
            grossFare: Math.round((finalPrice + discountAmount) * 100) / 100,
            couponCode: ride.couponCode,
            discountAmount,
            finalPrice,
            completedAt: ride.updatedAt,
        };
    }
    async createScheduledRide(userId, dto) {
        const scheduledAt = new Date(dto.scheduledAt);
        if (scheduledAt.getTime() < Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS) {
            throw new common_1.BadRequestException('La date programmée doit être au moins 5 minutes dans le futur');
        }
        const ride = this.rideRepo.create({
            userId,
            startLatitude: dto.startLatitude,
            startLongitude: dto.startLongitude,
            destinationName: dto.destinationName,
            endLatitude: dto.endLatitude ?? null,
            endLongitude: dto.endLongitude ?? null,
            vehicleType: dto.vehicleType,
            couponCode: dto.couponCode ?? null,
            scheduledAt,
            status: ride_entity_1.RideStatus.SCHEDULED,
        });
        const saved = await this.rideRepo.save(ride);
        this.logger.log(`Course programmée créée: ${saved.id} par user ${userId} pour ${scheduledAt.toISOString()}`);
        return saved;
    }
    async findScheduledByUser(userId) {
        return this.rideRepo.find({
            where: { userId, status: ride_entity_1.RideStatus.SCHEDULED },
            order: { scheduledAt: 'ASC' },
        });
    }
    async updateScheduledRide(rideId, userId, dto) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.userId !== userId)
            throw new common_1.ForbiddenException('Cette course ne vous appartient pas');
        if (ride.status !== ride_entity_1.RideStatus.SCHEDULED) {
            throw new common_1.ConflictException('Cette course ne peut plus être modifiée');
        }
        let scheduledAt = ride.scheduledAt;
        if (dto.scheduledAt) {
            scheduledAt = new Date(dto.scheduledAt);
            if (scheduledAt.getTime() < Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS) {
                throw new common_1.BadRequestException('La date programmée doit être au moins 5 minutes dans le futur');
            }
        }
        await this.rideRepo.update(rideId, {
            scheduledAt,
            startLatitude: dto.startLatitude ?? ride.startLatitude,
            startLongitude: dto.startLongitude ?? ride.startLongitude,
            destinationName: dto.destinationName ?? ride.destinationName,
            vehicleType: dto.vehicleType ?? ride.vehicleType,
            endLatitude: dto.endLatitude ?? ride.endLatitude,
            endLongitude: dto.endLongitude ?? ride.endLongitude,
        });
        return this.rideRepo.findOne({ where: { id: rideId } });
    }
    async cancelScheduledRide(rideId, userId) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.userId !== userId)
            throw new common_1.ForbiddenException('Cette course ne vous appartient pas');
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.CANCELLED, cancelledBy: 'user' })
            .where('id = :id AND status = :status', { id: rideId, status: ride_entity_1.RideStatus.SCHEDULED })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Cette course ne peut plus être annulée');
        }
    }
    async findScheduledForAdmin(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const qb = this.rideRepo
            .createQueryBuilder('ride')
            .where('ride.status = :status', { status: ride_entity_1.RideStatus.SCHEDULED })
            .orderBy('ride.scheduledAt', 'ASC');
        const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data, total, page, limit };
    }
    async activateDueScheduledRides() {
        const dueRides = await this.rideRepo.find({
            where: {
                status: ride_entity_1.RideStatus.SCHEDULED,
                scheduledAt: (0, typeorm_2.LessThanOrEqual)(new Date(Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS)),
            },
        });
        for (const ride of dueRides) {
            const result = await this.rideRepo
                .createQueryBuilder()
                .update(ride_entity_1.Ride)
                .set({ status: ride_entity_1.RideStatus.PENDING })
                .where('id = :id AND status = :status', { id: ride.id, status: ride_entity_1.RideStatus.SCHEDULED })
                .execute();
            if (!result.affected)
                continue;
            ride.status = ride_entity_1.RideStatus.PENDING;
            this.logger.log(`Course programmée activée: ${ride.id}`);
            await this.activatePendingRide(ride);
        }
    }
    async findAllForAdmin(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const qb = this.rideRepo.createQueryBuilder('ride').orderBy('ride.createdAt', 'DESC');
        if (query.status)
            qb.andWhere('ride.status = :status', { status: query.status });
        if (query.driverId)
            qb.andWhere('ride."driverId" = :driverId', { driverId: query.driverId });
        if (query.userId)
            qb.andWhere('ride."userId" = :userId', { userId: query.userId });
        if (query.from)
            qb.andWhere('ride.createdAt >= :from', { from: query.from });
        if (query.to)
            qb.andWhere('ride.createdAt <= :to', { to: query.to });
        const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data, total, page, limit };
    }
    async findByIdForAdmin(id) {
        const ride = await this.rideRepo.findOne({ where: { id } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        return ride;
    }
    async getLeaderboard(period, currentUserId) {
        const from = getLeaderboardPeriodStart(period);
        const completedRides = await this.rideRepo.find({
            where: { status: ride_entity_1.RideStatus.COMPLETED, createdAt: (0, typeorm_2.MoreThanOrEqual)(from) },
            select: ['userId'],
        });
        const pointsByUser = new Map();
        for (const ride of completedRides) {
            pointsByUser.set(ride.userId, (pointsByUser.get(ride.userId) ?? 0) + 1);
        }
        const ranked = [...pointsByUser.entries()]
            .map(([userId, points]) => ({ userId, points }))
            .sort((a, b) => b.points - a.points)
            .map((r, idx) => ({ ...r, rank: idx + 1 }));
        const top = ranked.slice(0, LEADERBOARD_LIMIT);
        const users = await this.usersService.findByIds(top.map((r) => r.userId));
        const nameById = new Map(users.map((u) => [u.id, u.name || 'Utilisateur']));
        const entries = top.map((r) => ({
            rank: r.rank,
            userId: r.userId,
            name: nameById.get(r.userId) ?? 'Utilisateur',
            points: r.points,
            isCurrentUser: r.userId === currentUserId,
        }));
        const currentUserRanked = ranked.find((r) => r.userId === currentUserId);
        const currentUser = currentUserRanked
            ? { rank: currentUserRanked.rank, points: currentUserRanked.points }
            : null;
        return { period, entries, currentUser };
    }
};
exports.RidesService = RidesService;
exports.RidesService = RidesService = RidesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ride_entity_1.Ride)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => geolocation_gateway_1.GeolocationGateway))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_service_1.DriversService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        geolocation_gateway_1.GeolocationGateway,
        drivers_service_1.DriversService,
        config_1.ConfigService,
        settings_service_1.SettingsService,
        wallet_service_1.WalletService,
        promotions_service_1.PromotionsService,
        users_service_1.UsersService])
], RidesService);
//# sourceMappingURL=rides.service.js.map