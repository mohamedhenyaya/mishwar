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
var _a, _b, _c;
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
const users_service_1 = require("../users/users.service");
const public_profile_util_1 = require("../../common/utils/public-profile.util");
let RidesService = RidesService_1 = class RidesService {
    constructor(rideRepo, geolocationGateway, driversService, usersService, config, settingsService, walletService, promotionsService, usersService) {
        this.rideRepo = rideRepo;
        this.geolocationGateway = geolocationGateway;
        this.driversService = driversService;
        this.usersService = usersService;
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
        const isOpenTrip = dto.isOpenTrip === true;
        const hasDestination = !isOpenTrip && dto.endLatitude != null && dto.endLongitude != null;
        if (!isOpenTrip && !dto.destinationName?.trim()) {
            throw new common_1.BadRequestException('Destination requise (ou choisissez un trajet ouvert)');
        }
        const price = hasDestination
            ? (0, pricing_util_1.computeFare)(dto.startLatitude, dto.startLongitude, dto.endLatitude, dto.endLongitude)
            : null;
        const ride = this.rideRepo.create({
            userId,
            startLatitude: dto.startLatitude,
            startLongitude: dto.startLongitude,
            destinationName: isOpenTrip ? 'Trajet ouvert' : dto.destinationName.trim(),
            endLatitude: hasDestination ? dto.endLatitude : null,
            endLongitude: hasDestination ? dto.endLongitude : null,
            vehicleType: dto.vehicleType ?? ride_entity_1.RideVehicleClass.ECONOMY,
            isOpenTrip,
            price,
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
        return this.withParticipants(ride);
    }
    async findActive(jwt) {
        const ride = jwt.role === 'driver'
            ? await this.rideRepo.findOne({
                where: { driverId: jwt.sub, status: (0, typeorm_2.In)(ride_entity_1.ACTIVE_RIDE_STATUSES) },
                order: { createdAt: 'DESC' },
            })
            : await this.rideRepo.findOne({
                where: { userId: jwt.sub, status: (0, typeorm_2.In)([ride_entity_1.RideStatus.PENDING, ...ride_entity_1.ACTIVE_RIDE_STATUSES]) },
                order: { createdAt: 'DESC' },
            });
        return ride ? this.withParticipants(ride) : null;
    }
    async withParticipants(ride) {
        const [user, driver] = await Promise.all([
            this.usersService.findById(ride.userId),
            ride.driverId ? this.driversService.findById(ride.driverId) : null,
        ]);
        return {
            ...ride,
            user: (0, public_profile_util_1.toPublicUser)(user),
            driver: driver ? (0, public_profile_util_1.toPublicDriver)(driver) : null,
        };
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
        await this.geolocationGateway.notifyRideAccepted(ride, driver);
        return this.withParticipants(ride);
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
            .set({ status: ride_entity_1.RideStatus.CANCELLED, cancelledBy: 'system' })
            .where('id = :id AND status = :status', { id: rideId, status: ride_entity_1.RideStatus.PENDING })
            .execute();
        if (result.affected) {
            this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'no_driver_available');
        }
    }
    async arriveRide(rideId, driverId) {
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.ARRIVED })
            .where('id = :id AND status = :status AND "driverId" = :driverId', {
            id: rideId,
            status: ride_entity_1.RideStatus.ACCEPTED,
            driverId,
        })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Impossible de signaler l\'arrivée pour cette course');
        }
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        this.geolocationGateway.notifyRideArrived(ride);
        return ride;
    }
    async startRide(rideId, driverId) {
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.IN_PROGRESS, startedAt: new Date() })
            .where('id = :id AND status IN (:...statuses) AND "driverId" = :driverId', {
            id: rideId,
            statuses: [ride_entity_1.RideStatus.ACCEPTED, ride_entity_1.RideStatus.ARRIVED],
            driverId,
        })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Impossible de démarrer cette course');
        }
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        this.geolocationGateway.notifyRideStarted(ride);
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
        const movedMeters = haversineMeters(Number(ride.lastMeterLatitude), Number(ride.lastMeterLongitude), latitude, longitude);
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
        const endLatitude = dto.endLatitude ?? existing.endLatitude ?? existing.startLatitude;
        const endLongitude = dto.endLongitude ?? existing.endLongitude ?? existing.startLongitude;
        const price = existing.isOpenTrip && existing.startedAt
            ? (0, pricing_util_1.computeOpenTripFare)(existing.distanceMeters, existing.startedAt).price
            : (0, pricing_util_1.computeFare)(existing.startLatitude, existing.startLongitude, endLatitude, endLongitude);
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
        await this.usersService.incrementTotalRides(existing.userId);
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        this.geolocationGateway.notifyRideCompleted(ride);
        return ride;
    }
    async cancelRide(rideId, userId, reason) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.userId !== userId)
            throw new common_1.ForbiddenException('Cette course ne vous appartient pas');
        const cancellable = [ride_entity_1.RideStatus.PENDING, ride_entity_1.RideStatus.ACCEPTED, ride_entity_1.RideStatus.ARRIVED];
        if (!cancellable.includes(ride.status)) {
            throw new common_1.ConflictException('Cette course ne peut plus être annulée');
        }
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.CANCELLED, cancelledBy: 'rider' })
            .where('id = :id AND status = :status', { id: rideId, status: ride.status })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Cette course ne peut plus être annulée');
        }
        if (ride.driverId) {
            await this.driversService.updateStatus(ride.driverId, driver_entity_1.DriverStatus.ONLINE);
            this.geolocationGateway.releaseDriver(ride.driverId);
            this.geolocationGateway.notifyRideCancelled(`driver:${ride.driverId}`, rideId, 'rider_cancelled');
        }
        else {
            for (const driverId of ride.notifiedDriverIds) {
                this.geolocationGateway.notifyRideUnavailable(driverId, rideId);
            }
        }
    }
    async cancelRideByDriver(rideId, driverId) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.driverId !== driverId)
            throw new common_1.ForbiddenException('Cette course ne vous est pas assignée');
        const result = await this.rideRepo
            .createQueryBuilder()
            .update(ride_entity_1.Ride)
            .set({ status: ride_entity_1.RideStatus.CANCELLED, cancelledBy: 'driver' })
            .where('id = :id AND "driverId" = :driverId AND status IN (:...statuses)', {
            id: rideId,
            driverId,
            statuses: [ride_entity_1.RideStatus.ACCEPTED, ride_entity_1.RideStatus.ARRIVED],
        })
            .execute();
        if (!result.affected) {
            throw new common_1.ConflictException('Une course démarrée ne peut plus être annulée');
        }
        await this.driversService.updateStatus(driverId, driver_entity_1.DriverStatus.ONLINE);
        this.geolocationGateway.releaseDriver(driverId);
        this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'driver_cancelled');
        this.logger.log(`Course ${rideId} annulée par le chauffeur ${driverId}`);
    }
    async rateRide(rideId, jwt, rating) {
        const ride = await this.rideRepo.findOne({ where: { id: rideId } });
        if (!ride)
            throw new common_1.NotFoundException('Course non trouvée');
        if (ride.status !== ride_entity_1.RideStatus.COMPLETED) {
            throw new common_1.BadRequestException('Seule une course terminée peut être notée');
        }
        if (jwt.role === 'driver') {
            if (ride.driverId !== jwt.sub)
                throw new common_1.ForbiddenException('Cette course ne vous est pas assignée');
            if (ride.userRating != null)
                throw new common_1.ConflictException('Vous avez déjà noté ce client');
            await this.rideRepo.update(rideId, { userRating: rating });
            await this.usersService.addRating(ride.userId, rating);
        }
        else {
            if (ride.userId !== jwt.sub)
                throw new common_1.ForbiddenException('Cette course ne vous appartient pas');
            if (ride.driverRating != null)
                throw new common_1.ConflictException('Vous avez déjà noté ce chauffeur');
            await this.rideRepo.update(rideId, { driverRating: rating });
            await this.driversService.addRating(ride.driverId, rating);
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
                .set({ status: ride_entity_1.RideStatus.CANCELLED, cancelledBy: 'system' })
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
        const distanceKm = haversineMeters(dto.startLatitude, dto.startLongitude, dto.endLatitude, dto.endLongitude) / 1000;
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
        const distanceKm = haversineMeters(ride.startLatitude, ride.startLongitude, ride.endLatitude ?? ride.startLatitude, ride.endLongitude ?? ride.startLongitude) / 1000;
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
                scheduledAt: LessThanOrEqual(new Date(Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS)),
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
            where: { status: ride_entity_1.RideStatus.COMPLETED, createdAt: MoreThanOrEqual(from) },
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
    __param(1, Inject(forwardRef(() => geolocation_gateway_1.GeolocationGateway))),
    __param(2, Inject(forwardRef(() => drivers_service_1.DriversService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        geolocation_gateway_1.GeolocationGateway,
        drivers_service_1.DriversService,
        users_service_1.UsersService,
        config_1.ConfigService, typeof (_a = typeof SettingsService !== "undefined" && SettingsService) === "function" ? _a : Object, typeof (_b = typeof WalletService !== "undefined" && WalletService) === "function" ? _b : Object, typeof (_c = typeof PromotionsService !== "undefined" && PromotionsService) === "function" ? _c : Object, users_service_1.UsersService])
], RidesService);
//# sourceMappingURL=rides.service.js.map