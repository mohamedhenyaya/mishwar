import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ACTIVE_RIDE_STATUSES, Ride, RideStatus, RideVehicleClass } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { DriversService } from '../drivers/drivers.service';
import { DriverStatus } from '../drivers/entities/driver.entity';
import { computeFare, computeOpenTripFare } from './utils/pricing.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import {
  PublicDriver, PublicUser, toPublicDriver, toPublicUser,
} from '../../common/utils/public-profile.util';

// Course + profils publics des deux participants
export type RideDetails = Ride & { driver: PublicDriver | null; user: PublicUser };

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    private readonly geolocationGateway: GeolocationGateway,
    private readonly driversService: DriversService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async createRide(userId: string, dto: CreateRideDto): Promise<Ride> {
    // Trajet ouvert → prix au compteur pendant la course.
    // Destination connue → prix fixe au kilomètre ; sinon prix calculé à la fin.
    const isOpenTrip = dto.isOpenTrip === true;
    const hasDestination = !isOpenTrip && dto.endLatitude != null && dto.endLongitude != null;
    if (!isOpenTrip && !dto.destinationName?.trim()) {
      throw new BadRequestException('Destination requise (ou choisissez un trajet ouvert)');
    }
    const price = hasDestination
      ? computeFare(dto.startLatitude, dto.startLongitude, dto.endLatitude, dto.endLongitude)
      : null;

    const ride = this.rideRepo.create({
      userId,
      startLatitude:  dto.startLatitude,
      startLongitude: dto.startLongitude,
      destinationName: isOpenTrip ? 'Trajet ouvert' : dto.destinationName.trim(),
      endLatitude:   hasDestination ? dto.endLatitude  : null,
      endLongitude:  hasDestination ? dto.endLongitude : null,
      vehicleType:   dto.vehicleType ?? RideVehicleClass.ECONOMY,
      isOpenTrip,
      price,
      status: RideStatus.PENDING,
    });

    const saved = await this.rideRepo.save(ride);
    this.logger.log(`Course créée: ${saved.id} par user ${userId}`);

    // Notifie les chauffeurs proches compatibles avec la classe demandée
    const notifiedDriverIds = await this.geolocationGateway.notifyNearbyDrivers(saved);
    saved.notifiedDriverIds = notifiedDriverIds;
    await this.rideRepo.update(saved.id, { notifiedDriverIds });

    this.scheduleRideTimeout(saved.id);

    return saved;
  }

  async findById(id: string): Promise<Ride | null> {
    return this.rideRepo.findOne({ where: { id } });
  }

  async findByUser(userId: string): Promise<Ride[]> {
    return this.rideRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdForParticipant(id: string, jwt: JwtPayload): Promise<RideDetails> {
    const ride = await this.rideRepo.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Course non trouvée');

    const isRider          = jwt.role === 'user'   && ride.userId === jwt.sub;
    const isAssignedDriver = jwt.role === 'driver' && ride.driverId === jwt.sub;
    if (!isRider && !isAssignedDriver) {
      throw new ForbiddenException('Accès refusé à cette course');
    }
    return this.withParticipants(ride);
  }

  // Course en attente ou en cours du client / chauffeur connecté (reprise après redémarrage de l'app)
  async findActive(jwt: JwtPayload): Promise<RideDetails | null> {
    const ride = jwt.role === 'driver'
      ? await this.rideRepo.findOne({
          where: { driverId: jwt.sub, status: In(ACTIVE_RIDE_STATUSES) },
          order: { createdAt: 'DESC' },
        })
      : await this.rideRepo.findOne({
          where: { userId: jwt.sub, status: In([RideStatus.PENDING, ...ACTIVE_RIDE_STATUSES]) },
          order: { createdAt: 'DESC' },
        });
    return ride ? this.withParticipants(ride) : null;
  }

  private async withParticipants(ride: Ride): Promise<RideDetails> {
    const [user, driver] = await Promise.all([
      this.usersService.findById(ride.userId),
      ride.driverId ? this.driversService.findById(ride.driverId) : null,
    ]);
    return {
      ...ride,
      user:   toPublicUser(user),
      driver: driver ? toPublicDriver(driver) : null,
    };
  }

  // ── Acceptation : le premier UPDATE conditionnel gagne ────────────────────

  async acceptRide(rideId: string, driverId: string): Promise<RideDetails> {
    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ driverId, status: RideStatus.ACCEPTED })
      .where('id = :id AND status = :status', { id: rideId, status: RideStatus.PENDING })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Cette course a déjà été acceptée ou n\'est plus disponible');
    }

    await this.driversService.updateStatus(driverId, DriverStatus.BUSY);

    const ride   = await this.rideRepo.findOne({ where: { id: rideId } });
    const driver = await this.driversService.findById(driverId);
    await this.geolocationGateway.notifyRideAccepted(ride, driver);

    // Le chauffeur reçoit le profil du client dans la réponse
    return this.withParticipants(ride);
  }

  async rejectRide(rideId: string, driverId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');

    if (!ride.rejectedDriverIds.includes(driverId)) {
      ride.rejectedDriverIds = [...ride.rejectedDriverIds, driverId];
      await this.rideRepo.update(rideId, { rejectedDriverIds: ride.rejectedDriverIds });
    }

    const allRejected =
      ride.notifiedDriverIds.length > 0 &&
      ride.notifiedDriverIds.every((id) => ride.rejectedDriverIds.includes(id));

    if (!allRejected) return;

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.CANCELLED, cancelledBy: 'system' })
      .where('id = :id AND status = :status', { id: rideId, status: RideStatus.PENDING })
      .execute();

    if (result.affected) {
      this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'no_driver_available');
    }
  }

  async arriveRide(rideId: string, driverId: string): Promise<Ride> {
    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.ARRIVED })
      .where('id = :id AND status = :status AND "driverId" = :driverId', {
        id: rideId,
        status: RideStatus.ACCEPTED,
        driverId,
      })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Impossible de signaler l\'arrivée pour cette course');
    }

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    this.geolocationGateway.notifyRideArrived(ride);
    return ride;
  }

  async startRide(rideId: string, driverId: string): Promise<Ride> {
    // Démarrage possible depuis « arrivé » ou directement depuis « acceptée »
    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.IN_PROGRESS, startedAt: new Date() })
      .where('id = :id AND status IN (:...statuses) AND "driverId" = :driverId', {
        id: rideId,
        statuses: [RideStatus.ACCEPTED, RideStatus.ARRIVED],
        driverId,
      })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Impossible de démarrer cette course');
    }

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    this.geolocationGateway.notifyRideStarted(ride);
    return ride;
  }

  async completeRide(rideId: string, driverId: string, dto: CompleteRideDto): Promise<Ride> {
    const existing = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!existing) throw new NotFoundException('Course non trouvée');
    if (existing.driverId !== driverId) throw new ForbiddenException('Cette course ne vous est pas assignée');

    const endLatitude  = dto.endLatitude  ?? existing.endLatitude  ?? existing.startLatitude;
    const endLongitude = dto.endLongitude ?? existing.endLongitude ?? existing.startLongitude;
    // Trajet ouvert : relevé final du compteur (distance cumulée par le gateway + durée)
    const price = existing.isOpenTrip && existing.startedAt
      ? computeOpenTripFare(existing.distanceMeters, existing.startedAt).price
      : computeFare(existing.startLatitude, existing.startLongitude, endLatitude, endLongitude);

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.COMPLETED, price, endLatitude, endLongitude })
      .where('id = :id AND status = :status AND "driverId" = :driverId', {
        id: rideId,
        status: RideStatus.IN_PROGRESS,
        driverId,
      })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Impossible de terminer cette course');
    }

    await this.driversService.updateStatus(driverId, DriverStatus.ONLINE);
    await this.driversService.incrementTotalRides(driverId);
    await this.usersService.incrementTotalRides(existing.userId);

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    this.geolocationGateway.notifyRideCompleted(ride);
    return ride;
  }

  async cancelRide(rideId: string, userId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.userId !== userId) throw new ForbiddenException('Cette course ne vous appartient pas');

    const cancellable = [RideStatus.PENDING, RideStatus.ACCEPTED, RideStatus.ARRIVED];
    if (!cancellable.includes(ride.status)) {
      throw new ConflictException('Cette course ne peut plus être annulée');
    }

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.CANCELLED, cancelledBy: 'rider' })
      .where('id = :id AND status = :status', { id: rideId, status: ride.status })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Cette course ne peut plus être annulée');
    }

    if (ride.driverId) {
      await this.driversService.updateStatus(ride.driverId, DriverStatus.ONLINE);
      this.geolocationGateway.releaseDriver(ride.driverId);
      this.geolocationGateway.notifyRideCancelled(`driver:${ride.driverId}`, rideId, 'rider_cancelled');
    } else {
      for (const driverId of ride.notifiedDriverIds) {
        this.geolocationGateway.notifyRideUnavailable(driverId, rideId);
      }
    }
  }

  // ── Annulation par le chauffeur (avant le démarrage de la course) ─────────

  async cancelRideByDriver(rideId: string, driverId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.driverId !== driverId) throw new ForbiddenException('Cette course ne vous est pas assignée');

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.CANCELLED, cancelledBy: 'driver' })
      .where('id = :id AND "driverId" = :driverId AND status IN (:...statuses)', {
        id: rideId,
        driverId,
        statuses: [RideStatus.ACCEPTED, RideStatus.ARRIVED],
      })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Une course démarrée ne peut plus être annulée');
    }

    await this.driversService.updateStatus(driverId, DriverStatus.ONLINE);
    this.geolocationGateway.releaseDriver(driverId);
    this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'driver_cancelled');
    this.logger.log(`Course ${rideId} annulée par le chauffeur ${driverId}`);
  }

  // ── Notation croisée : le client note le chauffeur, le chauffeur note le client

  async rateRide(rideId: string, jwt: JwtPayload, rating: number): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Seule une course terminée peut être notée');
    }

    if (jwt.role === 'driver') {
      if (ride.driverId !== jwt.sub) throw new ForbiddenException('Cette course ne vous est pas assignée');
      if (ride.userRating != null) throw new ConflictException('Vous avez déjà noté ce client');
      await this.rideRepo.update(rideId, { userRating: rating });
      await this.usersService.addRating(ride.userId, rating);
    } else {
      if (ride.userId !== jwt.sub) throw new ForbiddenException('Cette course ne vous appartient pas');
      if (ride.driverRating != null) throw new ConflictException('Vous avez déjà noté ce chauffeur');
      await this.rideRepo.update(rideId, { driverRating: rating });
      await this.driversService.addRating(ride.driverId, rating);
    }
  }

  // ── Annulation automatique si aucun chauffeur n'accepte à temps ───────────

  private scheduleRideTimeout(rideId: string): void {
    const timeoutMs = this.config.get<number>('RIDE_ACCEPT_TIMEOUT_MS', 60_000);

    const timer = setTimeout(async () => {
      const ride = await this.rideRepo.findOne({ where: { id: rideId } });
      if (!ride) return;

      const result = await this.rideRepo
        .createQueryBuilder()
        .update(Ride)
        .set({ status: RideStatus.CANCELLED, cancelledBy: 'system' })
        .where('id = :id AND status = :status', { id: rideId, status: RideStatus.PENDING })
        .execute();

      if (!result.affected) return;

      this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'timeout');
      for (const driverId of ride.notifiedDriverIds) {
        this.geolocationGateway.notifyRideUnavailable(driverId, rideId);
      }
    }, timeoutMs);

    timer.unref();
  }
}
