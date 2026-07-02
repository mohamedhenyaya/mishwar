import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { DriversService } from '../drivers/drivers.service';
import { DriverStatus } from '../drivers/entities/driver.entity';
import { computeFare } from './utils/pricing.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    private readonly geolocationGateway: GeolocationGateway,
    private readonly driversService: DriversService,
    private readonly config: ConfigService,
  ) {}

  async createRide(userId: string, dto: CreateRideDto): Promise<Ride> {
    const ride = this.rideRepo.create({
      userId,
      startLatitude:  dto.startLatitude,
      startLongitude: dto.startLongitude,
      destinationName: dto.destinationName,
      endLatitude:   dto.endLatitude  ?? null,
      endLongitude:  dto.endLongitude ?? null,
      vehicleType:   dto.vehicleType,
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

  async findByIdForParticipant(id: string, jwt: JwtPayload): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Course non trouvée');

    const isRider          = jwt.role === 'user'   && ride.userId === jwt.sub;
    const isAssignedDriver = jwt.role === 'driver' && ride.driverId === jwt.sub;
    if (!isRider && !isAssignedDriver) {
      throw new ForbiddenException('Accès refusé à cette course');
    }
    return ride;
  }

  // ── Acceptation : le premier UPDATE conditionnel gagne ────────────────────

  async acceptRide(rideId: string, driverId: string): Promise<Ride> {
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

    return ride;
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
      .set({ status: RideStatus.CANCELLED })
      .where('id = :id AND status = :status', { id: rideId, status: RideStatus.PENDING })
      .execute();

    if (result.affected) {
      this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'no_driver_available');
    }
  }

  async startRide(rideId: string, driverId: string): Promise<Ride> {
    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.IN_PROGRESS })
      .where('id = :id AND status = :status AND "driverId" = :driverId', {
        id: rideId,
        status: RideStatus.ACCEPTED,
        driverId,
      })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Impossible de démarrer cette course');
    }

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    await this.geolocationGateway.notifyRideStarted(ride);
    return ride;
  }

  async completeRide(rideId: string, driverId: string, dto: CompleteRideDto): Promise<Ride> {
    const existing = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!existing) throw new NotFoundException('Course non trouvée');
    if (existing.driverId !== driverId) throw new ForbiddenException('Cette course ne vous est pas assignée');

    const endLatitude  = dto.endLatitude  ?? existing.endLatitude  ?? existing.startLatitude;
    const endLongitude = dto.endLongitude ?? existing.endLongitude ?? existing.startLongitude;
    const price = computeFare(existing.startLatitude, existing.startLongitude, endLatitude, endLongitude);

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

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    await this.geolocationGateway.notifyRideCompleted(ride);
    return ride;
  }

  async cancelRide(rideId: string, userId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.userId !== userId) throw new ForbiddenException('Cette course ne vous appartient pas');

    if (ride.status !== RideStatus.PENDING && ride.status !== RideStatus.ACCEPTED) {
      throw new ConflictException('Cette course ne peut plus être annulée');
    }

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.CANCELLED })
      .where('id = :id AND status = :status', { id: rideId, status: ride.status })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Cette course ne peut plus être annulée');
    }

    if (ride.driverId) {
      await this.driversService.updateStatus(ride.driverId, DriverStatus.ONLINE);
      this.geolocationGateway.notifyRideCancelled(`driver:${ride.driverId}`, rideId, 'rider_cancelled');
    } else {
      for (const driverId of ride.notifiedDriverIds) {
        this.geolocationGateway.notifyRideUnavailable(driverId, rideId);
      }
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
        .set({ status: RideStatus.CANCELLED })
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
