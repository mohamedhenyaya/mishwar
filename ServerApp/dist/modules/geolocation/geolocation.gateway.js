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
const socket_io_1 = require("socket.io");
const drivers_service_1 = require("../drivers/drivers.service");
let GeolocationGateway = GeolocationGateway_1 = class GeolocationGateway {
    constructor(driversService) {
        this.driversService = driversService;
        this.logger = new common_1.Logger(GeolocationGateway_1.name);
        this.connectedDrivers = new Map();
    }
    handleConnection(client) {
        this.logger.log(`Client connecté: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client déconnecté: ${client.id}`);
        for (const [driverId, socketId] of this.connectedDrivers) {
            if (socketId === client.id) {
                this.connectedDrivers.delete(driverId);
                break;
            }
        }
    }
    handleDriverRegister(data, client) {
        this.connectedDrivers.set(data.driverId, client.id);
        client.join(`driver:${data.driverId}`);
        this.logger.log(`Chauffeur enregistré: ${data.driverId}`);
    }
    async handleDriverPosition(data) {
        await this.driversService.updateLocation(data.driverId, {
            latitude: data.latitude,
            longitude: data.longitude,
        });
        this.server.emit('driver:position', {
            driverId: data.driverId,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date().toISOString(),
        });
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
        const nearbyDrivers = await this.driversService.findNearby({
            lat: ride.startLatitude,
            lng: ride.startLongitude,
            radius: 5_000,
        });
        this.logger.log(`Course ${ride.id}: notification de ${nearbyDrivers.length} chauffeur(s) proche(s)`);
        this.server.emit('ride:new', {
            rideId: ride.id,
            startLatitude: ride.startLatitude,
            startLongitude: ride.startLongitude,
            destinationName: ride.destinationName,
            status: ride.status,
            nearbyDriverIds: nearbyDrivers.map((d) => d.id),
        });
    }
};
exports.GeolocationGateway = GeolocationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GeolocationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:register'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GeolocationGateway.prototype, "handleDriverRegister", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:position'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __metadata("design:paramtypes", [drivers_service_1.DriversService])
], GeolocationGateway);
//# sourceMappingURL=geolocation.gateway.js.map