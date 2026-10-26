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
var GeolocationGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeolocationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const socket_io_1 = require("socket.io");
const drivers_service_1 = require("../drivers/drivers.service");
const driver_entity_1 = require("../drivers/entities/driver.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ride_entity_1 = require("../rides/entities/ride.entity");
const public_profile_util_1 = require("../../common/utils/public-profile.util");
const pricing_util_1 = require("../rides/utils/pricing.util");
const geo_util_1 = require("../../common/utils/geo.util");
const METER_TICK_MS = 5_000;
const OFFLINE_GRACE_MS = 60_000;
const MIN_STEP_METERS = 8;
const MAX_STEP_METERS = 2_000;
let GeolocationGateway = GeolocationGateway_1 = class GeolocationGateway {
    constructor(driversService, jwtService, rideRepo) {
        this.driversService = driversService;
        this.jwtService = jwtService;
        this.rideRepo = rideRepo;
        this.logger = new common_1.Logger(GeolocationGateway_1.name);
        this.connectedDrivers = new Map();
        this.driverActiveRide = new Map();
        this.meters = new Map();
    }
    async handleConnection(client) {
        this.logger.log(`Client connecté: ${client.id}`);
        const token = client.handshake.auth?.token;
        if (!token)
            return;
        try {
            const payload = await this.jwtService.verifyAsync(token);
            client.data.sub = payload.sub;
            client.data.role = payload.role;
            if (payload.role === 'driver') {
                this.connectedDrivers.set(payload.sub, client.id);
                client.join(`driver:${payload.sub}`);
                await this.restoreActiveRide(payload.sub);
            }
            else {
                client.join(`user:${payload.sub}`);
            }
        }
        catch {
            this.logger.warn(`Token invalide sur la connexion socket: ${client.id}`);
        }
    }
    afterInit() {
        this.driversService.statusChanges.subscribe(({ driverId, status }) => {
            this.server.emit('driver:status', { driverId, status });
        });
    }
    handleDisconnect(client) {
        this.logger.log(`Client déconnecté: ${client.id}`);
        const driverId = client.data?.role === 'driver' ? client.data?.sub : undefined;
        if (!driverId || this.connectedDrivers.get(driverId) !== client.id)
            return;
        this.connectedDrivers.delete(driverId);
        const timer = setTimeout(() => this.markOfflineIfGone(driverId), OFFLINE_GRACE_MS);
        timer.unref();
    }
    async markOfflineIfGone(driverId) {
        if (this.connectedDrivers.has(driverId) || this.driverActiveRide.has(driverId))
            return;
        const driver = await this.driversService.findById(driverId).catch(() => null);
        if (driver?.status !== driver_entity_1.DriverStatus.ONLINE)
            return;
        await this.driversService.updateStatus(driverId, driver_entity_1.DriverStatus.OFFLINE);
        this.logger.log(`Chauffeur ${driverId} hors ligne (déconnecté depuis ${OFFLINE_GRACE_MS / 1000} s)`);
    }
    async restoreActiveRide(driverId) {
        const ride = await this.rideRepo.findOne({
            where: { driverId, status: (0, typeorm_2.In)(ride_entity_1.ACTIVE_RIDE_STATUSES) },
        });
        if (!ride)
            return;
        this.driverActiveRide.set(driverId, ride.userId);
        if (ride.isOpenTrip && ride.status === ride_entity_1.RideStatus.IN_PROGRESS && !this.meters.has(driverId)) {
            await this.startMeter(driverId, ride);
        }
    }
    async startMeter(driverId, ride) {
        const driver = await this.driversService.findById(driverId).catch(() => null);
        const last = driver?.latitude != null && driver.longitude != null
            ? { latitude: Number(driver.latitude), longitude: Number(driver.longitude) }
            : null;
        if (this.meters.has(driverId))
            return;
        const meter = {
            rideId: ride.id,
            userId: ride.userId,
            startedAt: ride.startedAt ?? new Date(),
            distanceMeters: Number(ride.distanceMeters ?? 0),
            last,
            timer: setInterval(() => this.emitMeter(driverId), METER_TICK_MS),
        };
        meter.timer.unref();
        this.meters.set(driverId, meter);
        this.emitMeter(driverId);
    }
    stopMeter(driverId) {
        const meter = this.meters.get(driverId);
        if (!meter)
            return;
        clearInterval(meter.timer);
        this.meters.delete(driverId);
    }
    async addMeterDistance(driverId, latitude, longitude) {
        const meter = this.meters.get(driverId);
        if (!meter)
            return;
        if (meter.last) {
            const step = (0, geo_util_1.haversineMeters)(meter.last.latitude, meter.last.longitude, latitude, longitude);
            if (step < MIN_STEP_METERS)
                return;
            if (step <= MAX_STEP_METERS) {
                meter.distanceMeters += step;
                await this.rideRepo.update(meter.rideId, { distanceMeters: meter.distanceMeters });
            }
        }
        meter.last = { latitude, longitude };
        this.emitMeter(driverId);
    }
    emitMeter(driverId) {
        const meter = this.meters.get(driverId);
        if (!meter)
            return;
        const payload = { rideId: meter.rideId, ...(0, pricing_util_1.computeOpenTripFare)(meter.distanceMeters, meter.startedAt) };
        this.server.to(`user:${meter.userId}`).emit('ride:meter', payload);
        this.server.to(`driver:${driverId}`).emit('ride:meter', payload);
    }
    handleDriverRegister(client) {
        if (client.data?.role !== 'driver') {
            client.emit('auth:error', { message: 'Authentification chauffeur requise' });
            return;
        }
        this.connectedDrivers.set(client.data.sub, client.id);
        client.join(`driver:${client.data.sub}`);
        client.emit('driver:registered', { driverId: client.data.sub });
    }
    async handleDriverPosition(data, client) {
        if (client.data?.role !== 'driver')
            return;
        const driverId = client.data.sub;
        await this.driversService.updateLocation(driverId, {
            latitude: data.latitude,
            longitude: data.longitude,
        });
        const payload = {
            driverId,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date().toISOString(),
        };
        await this.addMeterDistance(driverId, data.latitude, data.longitude);
        const riderId = this.driverActiveRide.get(driverId);
        if (riderId) {
            this.server.to(`user:${riderId}`).emit('driver:position', payload);
        }
        else {
            this.server.emit('driver:position', payload);
        }
    }
    async handleUserLocation(data, client) {
        const nearbyDrivers = await this.driversService.findNearby({
            lat: data.latitude,
            lng: data.longitude,
            radius: 5_000,
        });
        client.emit('drivers:update', nearbyDrivers);
    }
    async notifyNearbyDrivers(ride) {
        const nearbyDrivers = await this.driversService.findNearby({ lat: ride.startLatitude, lng: ride.startLongitude, radius: 5_000 });
        this.logger.log(`Course ${ride.id}: notification de ${nearbyDrivers.length} chauffeur(s) proche(s)`);
        const payload = {
            rideId: ride.id,
            startLatitude: ride.startLatitude,
            startLongitude: ride.startLongitude,
            destinationName: ride.destinationName,
            endLatitude: ride.endLatitude,
            endLongitude: ride.endLongitude,
            price: ride.price,
            isOpenTrip: ride.isOpenTrip,
            vehicleType: ride.vehicleType,
            createdAt: ride.createdAt,
        };
        for (const driver of nearbyDrivers) {
            this.server.to(`driver:${driver.id}`).emit('ride:new', payload);
        }
        return nearbyDrivers.map((d) => d.id);
    }
    async notifyRideAccepted(ride, driver) {
        this.driverActiveRide.set(driver.id, ride.userId);
        this.server.to(`user:${ride.userId}`).emit('ride:accepted', {
            rideId: ride.id,
            driverId: driver.id,
            eta: (0, pricing_util_1.estimateEtaMinutes)(driver, ride),
            driver: (0, public_profile_util_1.toPublicDriver)(driver),
        });
        for (const driverId of ride.notifiedDriverIds) {
            if (driverId !== driver.id) {
                this.notifyRideUnavailable(driverId, ride.id);
            }
        }
    }
    notifyRideArrived(ride) {
        this.server.to(`user:${ride.userId}`).emit('ride:arrived', {
            rideId: ride.id,
            arrivedAt: new Date().toISOString(),
        });
    }
    notifyRideStarted(ride) {
        this.server.to(`user:${ride.userId}`).emit('ride:started', {
            rideId: ride.id,
            startedAt: (ride.startedAt ?? new Date()).toISOString(),
        });
        if (ride.isOpenTrip && ride.driverId)
            void this.startMeter(ride.driverId, ride);
    }
    notifyRideCompleted(ride) {
        const payload = {
            rideId: ride.id,
            price: ride.price,
            completedAt: new Date().toISOString(),
        };
        this.server.to(`user:${ride.userId}`).emit('ride:completed', payload);
        if (ride.driverId) {
            this.server.to(`driver:${ride.driverId}`).emit('ride:completed', payload);
            this.driverActiveRide.delete(ride.driverId);
            this.stopMeter(ride.driverId);
        }
    }
    notifyRideCancelled(room, rideId, reason) {
        this.server.to(room).emit('ride:cancelled', { rideId, reason });
    }
    notifyRideUnavailable(driverId, rideId) {
        this.server.to(`driver:${driverId}`).emit('ride:unavailable', { rideId });
    }
    releaseDriver(driverId) {
        this.driverActiveRide.delete(driverId);
        this.stopMeter(driverId);
    }
};
exports.GeolocationGateway = GeolocationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GeolocationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:register'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GeolocationGateway.prototype, "handleDriverRegister", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:position'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GeolocationGateway.prototype, "handleDriverPosition", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('user:location'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GeolocationGateway.prototype, "handleUserLocation", null);
exports.GeolocationGateway = GeolocationGateway = GeolocationGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' } }),
    __param(2, (0, typeorm_1.InjectRepository)(ride_entity_1.Ride)),
    __metadata("design:paramtypes", [drivers_service_1.DriversService,
        jwt_1.JwtService,
        typeorm_2.Repository])
], GeolocationGateway);
//# sourceMappingURL=geolocation.gateway.js.map