import { blockedMessage, stillBlocked } from '../../common/utils/account-block.util';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { DriversService } from '../drivers/drivers.service';
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { ACTIVE_RIDE_STATUSES, Ride, RideStatus } from '../rides/entities/ride.entity';
import { RidesService } from '../rides/rides.service';
import { estimateEtaMinutes } from '../rides/utils/pricing.util';
import { toPublicDriver } from '../../common/utils/public-profile.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { User, UserRole } from '../users/entities/user.entity';
import { PushService } from '../push/push.service';

const ADMINS_ROOM = 'admins';

type RideCancelReason = 'no_driver_available' | 'timeout' | 'rider_cancelled' | 'driver_cancelled' | 'admin_cancelled';

interface ActiveRide {
  rideId: string;
  userId: string;
}

// Relevé du compteur d'un trajet ouvert, envoyé à intervalle fixe même à l'arrêt
// (le téléphone n'envoie pas de position quand il ne bouge pas : le temps d'arrêt doit quand même compter)
const METER_TICK_MS = 5_000;
// Chauffeur déconnecté sans course en cours : repasse hors ligne s'il ne revient pas dans ce délai
// (sauf s'il reçoit les courses par push : il reste en ligne app fermée)
const OFFLINE_GRACE_MS = 60_000;
// Capitaine « en ligne » sans position reçue depuis ce délai (téléphone éteint, app tuée) : hors ligne
const STALE_POSITION_MS = 15 * 60_000;
const STALE_CHECK_MS = 5 * 60_000;
// Durée de vie d'une demande de course envoyée par push (= délai d'acceptation côté serveur)
const RIDE_OFFER_TTL_MS = 60_000;

@WebSocketGateway({ cors: { origin: '*' } })
export class GeolocationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GeolocationGateway.name);

  // driverId → socketId
  private readonly connectedDrivers = new Map<string, string>();
  // driverId → course en cours (position envoyée en direct au client de cette course)
  private readonly driverActiveRide = new Map<string, ActiveRide>();
  // driverId → minuterie du compteur (trajet ouvert démarré)
  private readonly meterTimers = new Map<string, NodeJS.Timeout>();
  // driverId → dernière position connue (relevé du compteur à l'arrêt)
  private readonly lastPositions = new Map<string, { latitude: number; longitude: number }>();

  constructor(
    @Inject(forwardRef(() => DriversService))
    private readonly driversService: DriversService,
    @Inject(forwardRef(() => RidesService))
    private readonly ridesService: RidesService,
    private readonly jwtService: JwtService,
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    private readonly push: PushService,
  ) {}

  onModuleInit(): void {
    const timer = setInterval(() => { void this.markStaleDriversOffline(); }, STALE_CHECK_MS);
    timer.unref();
  }

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
        // Même contrôle que JwtStrategy : un capitaine bloqué ne reçoit plus de courses
        const driver = await this.driversService.findById(payload.sub).catch(() => null);
        if (!driver || await stillBlocked(this.rideRepo.manager, Driver, driver)) {
          client.emit('account:blocked', { reason: driver ? blockedMessage(driver) : null });
          client.disconnect(true);
          return;
        }
        this.connectedDrivers.set(payload.sub, client.id);
        client.join(`driver:${payload.sub}`);
        await this.restoreActiveRide(payload.sub);
      } else if (payload.role === 'admin') {
        // Back-office : reçoit les changements des éléments à traiter (compteurs du menu)
        const admin = await this.rideRepo.manager.getRepository(User).findOne({
          where: { id: payload.sub }, select: { id: true, role: true, isActive: true, deletedAt: true },
        });
        if (admin?.role === UserRole.ADMIN && admin.isActive && !admin.deletedAt) client.join(ADMINS_ROOM);
      } else {
        client.join(`user:${payload.sub}`);
      }
    } catch {
      this.logger.warn(`Token invalide sur la connexion socket: ${client.id}`);
    }
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
    // Joignable par push : reste en ligne, l'écran de course s'ouvrira même app fermée
    if (await this.push.driverHasDevice(driverId)) return;
    const driver = await this.driversService.findById(driverId).catch(() => null);
    if (driver?.status !== DriverStatus.ONLINE) return;
    await this.driversService.updateStatus(driverId, DriverStatus.OFFLINE);
    this.logger.log(`Chauffeur ${driverId} hors ligne (déconnecté depuis ${OFFLINE_GRACE_MS / 1000} s)`);
  }

  // En ligne mais plus aucune position depuis longtemps (téléphone éteint, app tuée par le système) :
  // ne doit plus recevoir de courses auxquelles il ne répondra pas
  private async markStaleDriversOffline(): Promise<void> {
    const stale = await this.rideRepo.manager.getRepository(Driver).find({
      select: { id: true },
      where: { status: DriverStatus.ONLINE, lastLocationUpdate: LessThan(new Date(Date.now() - STALE_POSITION_MS)) },
    });
    for (const { id } of stale) {
      if (this.connectedDrivers.has(id) || this.driverActiveRide.has(id)) continue;
      await this.driversService.updateStatus(id, DriverStatus.OFFLINE).catch(() => undefined);
      this.logger.log(`Chauffeur ${id} hors ligne (aucune position depuis ${STALE_POSITION_MS / 60_000} min)`);
    }
  }

  // Après un redémarrage serveur, les Maps sont vides : on les reconstruit depuis la base
  private async restoreActiveRide(driverId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({
      where: { driverId, status: In(ACTIVE_RIDE_STATUSES) },
    });
    if (!ride) return;
    this.driverActiveRide.set(driverId, { rideId: ride.id, userId: ride.userId });
    if (ride.isOpenTrip && ride.status === RideStatus.IN_PROGRESS) this.startMeter(driverId);
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
    this.lastPositions.set(driverId, { latitude: data.latitude, longitude: data.longitude });

    const payload = {
      driverId,
      latitude:  data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    };

    const active = this.driverActiveRide.get(driverId);
    if (active) {
      // Course en cours : position envoyée en direct au client de la course uniquement
      this.server.to(`user:${active.userId}`).emit('driver:position', payload);
      await this.recordMeter(driverId);
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

  // ── Compteur du trajet ouvert (calcul et stockage : RidesService.recordMeterPing) ─

  private startMeter(driverId: string): void {
    if (this.meterTimers.has(driverId)) return;
    const timer = setInterval(() => { void this.recordMeter(driverId); }, METER_TICK_MS);
    timer.unref();
    this.meterTimers.set(driverId, timer);
  }

  private stopMeter(driverId: string): void {
    const timer = this.meterTimers.get(driverId);
    if (timer) clearInterval(timer);
    this.meterTimers.delete(driverId);
  }

  private async recordMeter(driverId: string): Promise<void> {
    const active = this.driverActiveRide.get(driverId);
    const position = this.lastPositions.get(driverId);
    if (!active || !position || !this.meterTimers.has(driverId)) return;

    const reading = await this.ridesService
      .recordMeterPing(active.rideId, position.latitude, position.longitude)
      .catch(() => null);
    if (!reading) return;

    const payload = { rideId: active.rideId, ...reading };
    this.server.to(`user:${active.userId}`).emit('ride:meter', payload);
    this.server.to(`driver:${driverId}`).emit('ride:meter', payload);
  }

  // ── Notifie tous les chauffeurs proches d'une nouvelle course ─────────────
  // Catégorie de véhicule unique : aucun filtre sur le type de véhicule

  async notifyNearbyDrivers(ride: Ride): Promise<string[]> {
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
      price:           ride.estimatedPrice,
      isOpenTrip:      ride.isOpenTrip,
      vehicleType:     ride.vehicleType,
      createdAt:       ride.createdAt,
    };

    for (const driver of nearbyDrivers) {
      this.server.to(`driver:${driver.id}`).emit('ride:new', payload);
    }

    // Même demande par push : réveille l'app fermée ou en arrière-plan (écran d'appel)
    const driverIds = nearbyDrivers.map((d) => d.id);
    void this.push.sendToDrivers(driverIds, {
      type:            'ride:new',
      rideId:          ride.id,
      destinationName: ride.destinationName ?? '',
      price:           ride.estimatedPrice != null ? String(ride.estimatedPrice) : '',
      isOpenTrip:      String(ride.isOpenTrip),
      startLatitude:   String(ride.startLatitude),
      startLongitude:  String(ride.startLongitude),
      createdAt:       new Date(ride.createdAt ?? Date.now()).toISOString(),
    }, RIDE_OFFER_TTL_MS);

    return driverIds;
  }

  // ── Course acceptée : notifie le client avec le profil complet du chauffeur ─

  async notifyRideAccepted(ride: Ride, driver: Driver): Promise<void> {
    this.driverActiveRide.set(driver.id, { rideId: ride.id, userId: ride.userId });

    this.server.to(`user:${ride.userId}`).emit('ride:accepted', {
      rideId:   ride.id,
      driverId: driver.id,
      eta:      estimateEtaMinutes(driver, ride),
      driver:   toPublicDriver(driver),
    });

    this.notifyRidesUnavailable(ride.notifiedDriverIds.filter((id) => id !== driver.id), ride.id);
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
    if (ride.isOpenTrip && ride.driverId) this.startMeter(ride.driverId);
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
      this.releaseDriver(ride.driverId);
    }
  }

  notifyRideCancelled(room: string, rideId: string, reason: RideCancelReason): void {
    this.server.to(room).emit('ride:cancelled', { rideId, reason });
  }

  notifyRideUnavailable(driverId: string, rideId: string): void {
    this.notifyRidesUnavailable([driverId], rideId);
  }

  // Course prise par un autre, expirée ou annulée : l'écran d'appel se ferme et la sonnerie s'arrête,
  // y compris sur les téléphones joints seulement par push
  notifyRidesUnavailable(driverIds: string[], rideId: string): void {
    for (const driverId of driverIds) {
      this.server.to(`driver:${driverId}`).emit('ride:unavailable', { rideId });
    }
    void this.push.sendToDrivers(driverIds, { type: 'ride:unavailable', rideId }, RIDE_OFFER_TTL_MS);
  }

  // Course terminée ou annulée : le chauffeur ne diffuse plus vers ce client
  releaseDriver(driverId: string): void {
    this.driverActiveRide.delete(driverId);
    this.stopMeter(driverId);
  }

  // Statut chauffeur (en ligne, hors ligne, occupé) diffusé à tous : la carte et le compteur
  // de chauffeurs disponibles des clients se mettent à jour sans rafraîchissement manuel
  notifyDriverStatus(driverId: string, status: DriverStatus): void {
    this.server.emit('driver:status', { driverId, status });
  }

  // ── Émission générique ciblée — réutilisée par NotificationsModule, blocage admin, etc. ──

  notifyCustom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }

  // Dossier capitaine créé, complété ou traité : les admins connectés rechargent leurs compteurs
  notifyAdminsPendingChanged(): void {
    this.server.to(ADMINS_ROOM).emit('admin:pending-changed');
  }

  // Dossier du capitaine traité ou modifié par un admin (pièce validée/refusée, compte approuvé…)
  notifyDriverDossierChanged(driverId: string, payload: Record<string, unknown>): void {
    this.server.to(`driver:${driverId}`).emit('driver:dossier-updated', payload);
  }

  // Compte bloqué ou supprimé : prévient l'app puis coupe ses sockets
  notifyAccountBlocked(room: string, reason: string | null): void {
    this.server.to(room).emit('account:blocked', { reason });
    this.server.in(room).disconnectSockets(true);
  }
}
