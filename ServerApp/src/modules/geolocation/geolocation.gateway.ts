import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Ride } from '../rides/entities/ride.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class GeolocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GeolocationGateway.name);

  // driverId → socketId
  private readonly connectedDrivers = new Map<string, string>();

  constructor(private readonly driversService: DriversService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
    for (const [driverId, socketId] of this.connectedDrivers) {
      if (socketId === client.id) {
        this.connectedDrivers.delete(driverId);
        break;
      }
    }
  }

  // ── Chauffeur s'enregistre au démarrage ───────────────────────────────────

  @SubscribeMessage('driver:register')
  handleDriverRegister(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedDrivers.set(data.driverId, client.id);
    client.join(`driver:${data.driverId}`);
    this.logger.log(`Chauffeur enregistré: ${data.driverId}`);
  }

  // ── Chauffeur envoie sa position GPS ─────────────────────────────────────

  @SubscribeMessage('driver:position')
  async handleDriverPosition(
    @MessageBody() data: { driverId: string; latitude: number; longitude: number },
  ) {
    await this.driversService.updateLocation(data.driverId, {
      latitude: data.latitude,
      longitude: data.longitude,
    });

    this.server.emit('driver:position', {
      driverId:  data.driverId,
      latitude:  data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Utilisateur envoie sa position → reçoit les chauffeurs proches ────────

  @SubscribeMessage('user:location')
  async handleUserLocation(
    @MessageBody() data: { userId?: string; latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    const nearbyDrivers = await this.driversService.findNearby({
      lat: data.latitude,
      lng: data.longitude,
      radius: 5_000,
    });

    client.emit('drivers:update', nearbyDrivers);
  }

  // ── Notifie tous les chauffeurs proches d'une nouvelle course ─────────────
  // Appelé par RidesService après création d'une course

  async notifyNearbyDrivers(ride: Ride): Promise<void> {
    const nearbyDrivers = await this.driversService.findNearby({
      lat: ride.startLatitude,
      lng: ride.startLongitude,
      radius: 5_000,
    });

    this.logger.log(
      `Course ${ride.id}: notification de ${nearbyDrivers.length} chauffeur(s) proche(s)`,
    );

    // Émettre à tous les clients connectés — les chauffeurs filtrent côté app
    this.server.emit('ride:new', {
      rideId:         ride.id,
      startLatitude:  ride.startLatitude,
      startLongitude: ride.startLongitude,
      destinationName: ride.destinationName,
      status:         ride.status,
      nearbyDriverIds: nearbyDrivers.map((d: any) => d.id),
    });
  }
}