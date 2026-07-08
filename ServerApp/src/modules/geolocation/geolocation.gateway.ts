import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Driver } from '../drivers/entities/driver.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RidesService } from '../rides/rides.service';
import { VEHICLE_CLASS_TO_DRIVER_TYPES } from '../rides/utils/vehicle-class.util';
import { estimateEtaMinutes } from '../rides/utils/pricing.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled' | 'driver_cancelled';

@WebSocketGateway({ cors: { origin: '*' } })
export class GeolocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GeolocationGateway.name);

  // driverId → socketId
  private readonly connectedDrivers = new Map<string, string>();
  // driverId → rideId en cours (scope les mises à jour de position à la course active)
  private readonly driverActiveRide = new Map<string, string>();

  constructor(
    @Inject(forwardRef(() => DriversService))
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => RidesService))
    private readonly ridesService: RidesService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Connexion : authentifie via le JWT envoyé par le client (handshake.auth.token)

  async handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);

    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return; // connexion anonyme tolérée (aperçu carte non authentifié)

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.data.sub  = payload.sub;
      client.data.role = payload.role;

      if (payload.role === 'driver') {
        this.connectedDrivers.set(payload.sub, client.id);
        client.join(`driver:${payload.sub}`);
      } else {
        client.join(`user:${payload.sub}`);
      }
    } catch {
      this.logger.warn(`Token invalide sur la connexion socket: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
    if (client.data?.role === 'driver' && client.data?.sub) {
      this.connectedDrivers.delete(client.data.sub);
    }
  }

  // ── Chauffeur (re)rejoint sa room, ex. après reconnexion ──────────────────

  @SubscribeMessage('driver:register')
  handleDriverRegister(@ConnectedSocket() client: Socket) {
    if (client.data?.role !== 'driver') {
      client.emit('auth:error', { message: 'Authentification chauffeur requise' });
      return;
    }
    this.connectedDrivers.set(client.data.sub, client.id);
    client.join(`driver:${client.data.sub}`);
    client.emit('driver:registered', { driverId: client.data.sub });
  }

  // ── Chauffeur envoie sa position GPS ─────────────────────────────────────

  @SubscribeMessage('driver:position')
  async handleDriverPosition(
    @MessageBody() data: { latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data?.role !== 'driver') return;
    const driverId = client.data.sub as string;

    await this.driversService.updateLocation(driverId, {
      latitude:  data.latitude,
      longitude: data.longitude,
    });

    const payload = {
      driverId,
      latitude:  data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    };

    const activeRideId = this.driverActiveRide.get(driverId);
    if (activeRideId) {
      this.server.to(`ride:${activeRideId}`).emit('driver:position', payload);

      const meterSnapshot = await this.ridesService.recordMeterPing(activeRideId, data.latitude, data.longitude);
      if (meterSnapshot) {
        this.server.to(`ride:${activeRideId}`).emit('ride:meter', { rideId: activeRideId, ...meterSnapshot });
      }
    } else {
      // Aucune course active : diffusion globale conservée pour l'aperçu carte (HomeScreen)
      this.server.emit('driver:position', payload);
    }
  }

  // ── Utilisateur envoie sa position → reçoit les chauffeurs proches ────────

  @SubscribeMessage('user:location')
  async handleUserLocation(
    @MessageBody() data: { latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    const nearbyDrivers = await this.driversService.findNearby({
      lat: data.latitude,
      lng: data.longitude,
      radius: 5_000,
    });

    client.emit('drivers:update', nearbyDrivers);
  }

  // ── Notifie les chauffeurs proches compatibles d'une nouvelle course ──────
  // Appelé par RidesService après création d'une course

  async notifyNearbyDrivers(ride: Ride): Promise<string[]> {
    const vehicleTypes = VEHICLE_CLASS_TO_DRIVER_TYPES[ride.vehicleType];

    const nearbyDrivers = await this.driversService.findNearby(
      { lat: ride.startLatitude, lng: ride.startLongitude, radius: 5_000 },
      vehicleTypes,
    );

    this.logger.log(
      `Course ${ride.id}: notification de ${nearbyDrivers.length} chauffeur(s) proche(s)`,
    );

    const payload = {
      rideId:          ride.id,
      startLatitude:   ride.startLatitude,
      startLongitude:  ride.startLongitude,
      destinationName: ride.destinationName,
      vehicleType:     ride.vehicleType,
      createdAt:       ride.createdAt,
    };

    for (const driver of nearbyDrivers) {
      this.server.to(`driver:${driver.id}`).emit('ride:new', payload);
    }

    return nearbyDrivers.map((d) => d.id);
  }

  // ── Course acceptée : notifie le rider, libère les autres chauffeurs ──────

  async notifyRideAccepted(ride: Ride, driver: Driver): Promise<void> {
    this.driverActiveRide.set(driver.id, ride.id);
    await this.server.in(`driver:${driver.id}`).socketsJoin(`ride:${ride.id}`);
    await this.server.in(`user:${ride.userId}`).socketsJoin(`ride:${ride.id}`);

    this.server.to(`user:${ride.userId}`).emit('ride:accepted', {
      rideId:   ride.id,
      driverId: driver.id,
      eta:      estimateEtaMinutes(driver, ride),
      driver: {
        id:           driver.id,
        name:         driver.name,
        phone:        driver.phone,
        vehicleModel: driver.vehicleModel,
        vehiclePlate: driver.vehiclePlate,
        rating:       driver.rating,
        latitude:     driver.latitude,
        longitude:    driver.longitude,
      },
    });

    for (const driverId of ride.notifiedDriverIds) {
      if (driverId !== driver.id) {
        this.notifyRideUnavailable(driverId, ride.id);
      }
    }
  }

  async notifyRideStarted(ride: Ride): Promise<void> {
    this.server.to(`user:${ride.userId}`).emit('ride:started', {
      rideId:    ride.id,
      startedAt: new Date().toISOString(),
    });
  }

  async notifyRideCompleted(ride: Ride): Promise<void> {
    const payload = {
      rideId:      ride.id,
      price:       ride.price,
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

  notifyRideCancelled(room: string, rideId: string, reason: RideCancelReason): void {
    this.server.to(room).emit('ride:cancelled', { rideId, reason });
  }

  notifyRideUnavailable(driverId: string, rideId: string): void {
    this.server.to(`driver:${driverId}`).emit('ride:unavailable', { rideId });
  }

  // ── Émission générique ciblée — réutilisée par NotificationsModule, blocage admin, etc. ──

  notifyCustom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }
}
