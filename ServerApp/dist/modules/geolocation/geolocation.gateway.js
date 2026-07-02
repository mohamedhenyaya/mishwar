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
const vehicle_class_util_1 = require("../rides/utils/vehicle-class.util");
const pricing_util_1 = require("../rides/utils/pricing.util");
let GeolocationGateway = GeolocationGateway_1 = class GeolocationGateway {
    constructor(driversService, jwtService) {
        this.driversService = driversService;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(GeolocationGateway_1.name);
        this.connectedDrivers = new Map();
        this.driverActiveRide = new Map();
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
            }
            else {
                client.join(`user:${payload.sub}`);
            }
        }
        catch {
            this.logger.warn(`Token invalide sur la connexion socket: ${client.id}`);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client déconnecté: ${client.id}`);
        if (client.data?.role === 'driver' && client.data?.sub) {
            this.connectedDrivers.delete(client.data.sub);
        }
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
        const activeRideId = this.driverActiveRide.get(driverId);
        if (activeRideId) {
            this.server.to(`ride:${activeRideId}`).emit('driver:position', payload);
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
        const vehicleTypes = vehicle_class_util_1.VEHICLE_CLASS_TO_DRIVER_TYPES[ride.vehicleType];
        const nearbyDrivers = await this.driversService.findNearby({ lat: ride.startLatitude, lng: ride.startLongitude, radius: 5_000 }, vehicleTypes);
        this.logger.log(`Course ${ride.id}: notification de ${nearbyDrivers.length} chauffeur(s) proche(s)`);
        const payload = {
            rideId: ride.id,
            startLatitude: ride.startLatitude,
            startLongitude: ride.startLongitude,
            destinationName: ride.destinationName,
            vehicleType: ride.vehicleType,
            createdAt: ride.createdAt,
        };
        for (const driver of nearbyDrivers) {
            this.server.to(`driver:${driver.id}`).emit('ride:new', payload);
        }
        return nearbyDrivers.map((d) => d.id);
    }
    async notifyRideAccepted(ride, driver) {
        this.driverActiveRide.set(driver.id, ride.id);
        await this.server.in(`driver:${driver.id}`).socketsJoin(`ride:${ride.id}`);
        await this.server.in(`user:${ride.userId}`).socketsJoin(`ride:${ride.id}`);
        this.server.to(`user:${ride.userId}`).emit('ride:accepted', {
            rideId: ride.id,
            driverId: driver.id,
            eta: (0, pricing_util_1.estimateEtaMinutes)(driver, ride),
            driver: {
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
                vehicleModel: driver.vehicleModel,
                vehiclePlate: driver.vehiclePlate,
                rating: driver.rating,
                latitude: driver.latitude,
                longitude: driver.longitude,
            },
        });
        for (const driverId of ride.notifiedDriverIds) {
            if (driverId !== driver.id) {
                this.notifyRideUnavailable(driverId, ride.id);
            }
        }
    }
    async notifyRideStarted(ride) {
        this.server.to(`user:${ride.userId}`).emit('ride:started', {
            rideId: ride.id,
            startedAt: new Date().toISOString(),
        });
    }
    async notifyRideCompleted(ride) {
        const payload = {
            rideId: ride.id,
            price: ride.price,
            completedAt: new Date().toISOString(),
        };
        this.server.to(`user:${ride.userId}`).emit('ride:completed', payload);
        await this.server.in(`user:${ride.userId}`).socketsLeave(`ride:${ride.id}`);
        if (ride.driverId) {
            this.server.to(`driver:${ride.driverId}`).emit('ride:completed', payload);
            await this.server.in(`driver:${ride.driverId}`).socketsLeave(`ride:${ride.id}`);
            this.driverActiveRide.delete(ride.driverId);
        }
    }
    notifyRideCancelled(room, rideId, reason) {
        this.server.to(room).emit('ride:cancelled', { rideId, reason });
    }
    notifyRideUnavailable(driverId, rideId) {
        this.server.to(`driver:${driverId}`).emit('ride:unavailable', { rideId });
    }
    notifyCustom(room, event, payload) {
        this.server.to(room).emit(event, payload);
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
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => drivers_service_1.DriversService))),
    __metadata("design:paramtypes", [drivers_service_1.DriversService,
        jwt_1.JwtService])
], GeolocationGateway);
//# sourceMappingURL=geolocation.gateway.js.map