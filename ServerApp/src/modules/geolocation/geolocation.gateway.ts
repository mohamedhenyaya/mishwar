import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
<<<<<<< HEAD
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ride, RideStatus, ACTIVE_RIDE_STATUSES } from '../rides/entities/ride.entity';
import { toPublicDriver } from '../../common/utils/public-profile.util';
import { computeOpenTripFare, estimateEtaMinutes } from '../rides/utils/pricing.util';
import { haversineMeters } from '../../common/utils/geo.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled' | 'driver_cancelled';

// Compteur d'un trajet ouvert en cours
interface OpenTripMeter {
  rideId:         string;
  userId:         string;
  startedAt:      Date;
  distanceMeters: number;
  last:           { latitude: number; longitude: number } | null;
  timer:          NodeJS.Timeout;
}

const METER_TICK_MS = 5_000;
// Chauffeur déconnecté sans course en cours : repasse hors ligne s'il ne revient pas dans ce délai
const OFFLINE_GRACE_MS = 60_000;
// Filtre GPS : on ignore le bruit (< 8 m) et les sauts aberrants (> 2 km entre deux points)
const MIN_STEP_METERS = 8;
const MAX_STEP_METERS = 2_000;
=======
import { Driver } from '../drivers/entities/driver.entity';
import { Ride } from '../rides/entities/ride.entity';
import { RidesService } from '../rides/rides.service';
import { VEHICLE_CLASS_TO_DRIVER_TYPES } from '../rides/utils/vehicle-class.util';
import { estimateEtaMinutes } from '../rides/utils/pricing.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled' | 'driver_cancelled';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

@WebSocketGateway({ cors: { origin: '*' } })
export class GeolocationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GeolocationGateway.name);

  // driverId → socketId
  private readonly connectedDrivers = new Map<string, string>();
  // driverId → userId du client de la course en cours (position envoyée en direct à ce client)
  private readonly driverActiveRide = new Map<string, string>();
  // driverId → compteur du trajet ouvert en cours
  private readonly meters = new Map<string, OpenTripMeter>();

  constructor(
    @Inject(forwardRef(() => DriversService))
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => RidesService))
    private readonly ridesService: RidesService,
    private readonly jwtService: JwtService,
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
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
        await this.restoreActiveRide(payload.sub);
      } else {
        client.join(`user:${payload.sub}`);
      }
    } catch {
      this.logger.warn(`Token invalide sur la connexion socket: ${client.id}`);
    }
  }

  // Statut chauffeur (en ligne, hors ligne, occupé) diffusé à tous : la carte et le compteur
  // de chauffeurs disponibles des clients se mettent à jour sans rafraîchissement manuel
  afterInit() {
    this.driversService.statusChanges.subscribe(({ driverId, status }) => {
      this.server.emit('driver:status', { driverId, status });
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
    const driverId = client.data?.role === 'driver' ? (client.data?.sub as string | undefined) : undefined;
    // Ne retire l'entrée que si c'est bien ce socket (le chauffeur a pu se reconnecter entre-temps)
    if (!driverId || this.connectedDrivers.get(driverId) !== client.id) return;
    this.connectedDrivers.delete(driverId);

    const timer = setTimeout(() => this.markOfflineIfGone(driverId), OFFLINE_GRACE_MS);
    timer.unref();
  }

  // App fermée ou réseau perdu : un chauffeur « en ligne » fantôme ne doit pas rester visible
  private async markOfflineIfGone(driverId: string): Promise<void> {
    if (this.connectedDrivers.has(driverId) || this.driverActiveRide.has(driverId)) return;
    const driver = await this.driversService.findById(driverId).catch(() => null);
    if (driver?.status !== DriverStatus.ONLINE) return;
    await this.driversService.updateStatus(driverId, DriverStatus.OFFLINE);
    this.logger.log(`Chauffeur ${driverId} hors ligne (déconnecté depuis ${OFFLINE_GRACE_MS / 1000} s)`);
  }

  // Après un redémarrage serveur, la Map est vide : on la reconstruit depuis la base
  private async restoreActiveRide(driverId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({
      where: { driverId, status: In(ACTIVE_RIDE_STATUSES) },
    });
    if (!ride) return;
    this.driverActiveRide.set(driverId, ride.userId);
    if (ride.isOpenTrip && ride.status === RideStatus.IN_PROGRESS && !this.meters.has(driverId)) {
      await this.startMeter(driverId, ride);
    }
  }

  // ── Compteur du trajet ouvert ─────────────────────────────────────────────

  private async startMeter(driverId: string, ride: Ride): Promise<void> {
    // Point de départ du compteur : dernière position connue du chauffeur
    const driver = await this.driversService.findById(driverId).catch(() => null);
    const last = driver?.latitude != null && driver.longitude != null
      ? { latitude: Number(driver.latitude), longitude: Number(driver.longitude) }
      : null;
    if (this.meters.has(driverId)) return; // déjà démarré pendant l'attente (reconnexion)

    const meter: OpenTripMeter = {
      rideId:         ride.id,
      userId:         ride.userId,
      startedAt:      ride.startedAt ?? new Date(),
      distanceMeters: Number(ride.distanceMeters ?? 0),
      last,
      // Le prix augmente aussi avec le temps à l'arrêt : relevé envoyé à intervalle régulier
      timer:          setInterval(() => this.emitMeter(driverId), METER_TICK_MS),
    };
    meter.timer.unref();
    this.meters.set(driverId, meter);
    this.emitMeter(driverId);
  }

  private stopMeter(driverId: string): void {
    const meter = this.meters.get(driverId);
    if (!meter) return;
    clearInterval(meter.timer);
    this.meters.delete(driverId);
  }

  private async addMeterDistance(driverId: string, latitude: number, longitude: number): Promise<void> {
    const meter = this.meters.get(driverId);
    if (!meter) return;

    if (meter.last) {
      const step = haversineMeters(meter.last.latitude, meter.last.longitude, latitude, longitude);
      if (step < MIN_STEP_METERS) return; // bruit GPS : on garde l'ancien point de référence
      if (step <= MAX_STEP_METERS) {
        meter.distanceMeters += step;
        await this.rideRepo.update(meter.rideId, { distanceMeters: meter.distanceMeters });
      }
    }
    meter.last = { latitude, longitude };
    this.emitMeter(driverId);
  }

  private emitMeter(driverId: string): void {
    const meter = this.meters.get(driverId);
    if (!meter) return;
    const payload = { rideId: meter.rideId, ...computeOpenTripFare(meter.distanceMeters, meter.startedAt) };
    this.server.to(`user:${meter.userId}`).emit('ride:meter', payload);
    this.server.to(`driver:${driverId}`).emit('ride:meter', payload);
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

<<<<<<< HEAD
    await this.addMeterDistance(driverId, data.latitude, data.longitude);

    // Course en cours : position envoyée en direct au client uniquement
    const riderId = this.driverActiveRide.get(driverId);
    if (riderId) {
      this.server.to(`user:${riderId}`).emit('driver:position', payload);
=======
    const activeRideId = this.driverActiveRide.get(driverId);
    if (activeRideId) {
      this.server.to(`ride:${activeRideId}`).emit('driver:position', payload);

      const meterSnapshot = await this.ridesService.recordMeterPing(activeRideId, data.latitude, data.longitude);
      if (meterSnapshot) {
        this.server.to(`ride:${activeRideId}`).emit('ride:meter', { rideId: activeRideId, ...meterSnapshot });
      }
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
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
    // Catégorie unique : tous les chauffeurs proches sont sollicités, quel que soit le véhicule
    const nearbyDrivers = await this.driversService.findNearby(
      { lat: ride.startLatitude, lng: ride.startLongitude, radius: 5_000 },
    );

    this.logger.log(
      `Course ${ride.id}: notification de ${nearbyDrivers.length} chauffeur(s) proche(s)`,
    );

    const payload = {
      rideId:          ride.id,
      startLatitude:   ride.startLatitude,
      startLongitude:  ride.startLongitude,
      destinationName: ride.destinationName,
      endLatitude:     ride.endLatitude,
      endLongitude:    ride.endLongitude,
      price:           ride.price,
      isOpenTrip:      ride.isOpenTrip,
      vehicleType:     ride.vehicleType,
      createdAt:       ride.createdAt,
    };

    for (const driver of nearbyDrivers) {
      this.server.to(`driver:${driver.id}`).emit('ride:new', payload);
    }

    return nearbyDrivers.map((d) => d.id);
  }

  // ── Course acceptée : notifie le client avec le profil complet du chauffeur ─

  async notifyRideAccepted(ride: Ride, driver: Driver): Promise<void> {
    this.driverActiveRide.set(driver.id, ride.userId);

    this.server.to(`user:${ride.userId}`).emit('ride:accepted', {
      rideId:   ride.id,
      driverId: driver.id,
      eta:      estimateEtaMinutes(driver, ride),
      driver:   toPublicDriver(driver),
    });

    for (const driverId of ride.notifiedDriverIds) {
      if (driverId !== driver.id) {
        this.notifyRideUnavailable(driverId, ride.id);
      }
    }
  }

  notifyRideArrived(ride: Ride): void {
    this.server.to(`user:${ride.userId}`).emit('ride:arrived', {
      rideId:    ride.id,
      arrivedAt: new Date().toISOString(),
    });
  }

  notifyRideStarted(ride: Ride): void {
    this.server.to(`user:${ride.userId}`).emit('ride:started', {
      rideId:    ride.id,
      startedAt: (ride.startedAt ?? new Date()).toISOString(),
    });
    if (ride.isOpenTrip && ride.driverId) void this.startMeter(ride.driverId, ride);
  }

  notifyRideCompleted(ride: Ride): void {
    const payload = {
      rideId:      ride.id,
      price:       ride.price,
      completedAt: new Date().toISOString(),
    };

    this.server.to(`user:${ride.userId}`).emit('ride:completed', payload);
    if (ride.driverId) {
      this.server.to(`driver:${ride.driverId}`).emit('ride:completed', payload);
      this.driverActiveRide.delete(ride.driverId);
      this.stopMeter(ride.driverId);
    }
  }

  notifyRideCancelled(room: string, rideId: string, reason: RideCancelReason): void {
    this.server.to(room).emit('ride:cancelled', { rideId, reason });
  }

  notifyRideUnavailable(driverId: string, rideId: string): void {
    this.server.to(`driver:${driverId}`).emit('ride:unavailable', { rideId });
  }

<<<<<<< HEAD
  // Course annulée après acceptation : le chauffeur ne diffuse plus vers ce client
  releaseDriver(driverId: string): void {
    this.driverActiveRide.delete(driverId);
    this.stopMeter(driverId);
=======
  // ── Émission générique ciblée — réutilisée par NotificationsModule, blocage admin, etc. ──

  notifyCustom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  }
}
