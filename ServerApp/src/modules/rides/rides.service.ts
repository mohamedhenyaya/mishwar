import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Ride, RideStatus } from './entities/ride.entity';
import { CreateRideDto } from './dto/create-ride.dto';
import { CompleteRideDto } from './dto/complete-ride.dto';
import { AdminRidesQueryDto } from './dto/admin-rides-query.dto';
import { CreateScheduledRideDto } from './dto/create-scheduled-ride.dto';
import { UpdateScheduledRideDto } from './dto/update-scheduled-ride.dto';
import { EstimateRideDto } from './dto/estimate-ride.dto';
import { DriverCancelRideDto } from './dto/driver-cancel-ride.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { DriversService } from '../drivers/drivers.service';
import { DriverStatus } from '../drivers/entities/driver.entity';
import { computeFare } from './utils/pricing.util';
import { haversineMeters } from '../../common/utils/geo.util';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from '../wallet/wallet.service';
import { PromotionsService } from '../promotions/promotions.service';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const AVG_TRIP_SPEED_KMH = 30;
// Une course programmée est activée (PENDING + notification des chauffeurs) dès qu'elle entre dans cette fenêtre
const SCHEDULED_ACTIVATION_WINDOW_MS = 5 * 60 * 1_000;
const SCHEDULED_POLL_INTERVAL_MS = 60 * 1_000;

@Injectable()
export class RidesService implements OnModuleInit {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    private readonly geolocationGateway: GeolocationGateway,
    private readonly driversService: DriversService,
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
    private readonly walletService: WalletService,
    private readonly promotionsService: PromotionsService,
  ) {}

  // ── Sondeur des courses programmées — couvre aussi le redémarrage du serveur ──
  // (pas de lib de cron dans ce projet ; suit le même style que scheduleRideTimeout)

  onModuleInit(): void {
    const timer = setInterval(() => {
      this.activateDueScheduledRides().catch((err) =>
        this.logger.error(`Échec de l'activation des courses programmées: ${err.message}`),
      );
    }, SCHEDULED_POLL_INTERVAL_MS);
    timer.unref();
  }

  async createRide(userId: string, dto: CreateRideDto): Promise<Ride> {
    const ride = this.rideRepo.create({
      userId,
      startLatitude:  dto.startLatitude,
      startLongitude: dto.startLongitude,
      destinationName: dto.destinationName,
      endLatitude:   dto.endLatitude  ?? null,
      endLongitude:  dto.endLongitude ?? null,
      vehicleType:   dto.vehicleType,
      couponCode:    dto.couponCode ?? null,
      status: RideStatus.PENDING,
    });

    const saved = await this.rideRepo.save(ride);
    this.logger.log(`Course créée: ${saved.id} par user ${userId}`);

    await this.activatePendingRide(saved);

    return saved;
  }

  // ── Notifie les chauffeurs proches et programme le délai d'acceptation ────
  // Partagé entre la création immédiate et l'activation d'une course programmée

  private async activatePendingRide(ride: Ride): Promise<void> {
    const notifiedDriverIds = await this.geolocationGateway.notifyNearbyDrivers(ride);
    ride.notifiedDriverIds = notifiedDriverIds;
    await this.rideRepo.update(ride.id, { notifiedDriverIds });

    this.scheduleRideTimeout(ride.id);
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
    const driver = await this.driversService.findById(driverId);
    if (!driver.isActive) {
      throw new ForbiddenException(driver.blockedReason ?? 'Compte chauffeur bloqué');
    }

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

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
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
    const settings = await this.settingsService.getSettings();
    const grossPrice = computeFare(
      existing.startLatitude, existing.startLongitude,
      endLatitude, endLongitude,
      Number(settings.pricePerKm), Number(settings.minimumFare),
    );

    // Le coupon n'est appliqué qu'à la complétion, une fois le tarif connu — un code invalide/expiré
    // n'empêche jamais de terminer la course, il annule simplement la remise
    let discountAmount = 0;
    if (existing.couponCode) {
      try {
        const result = await this.promotionsService.redeem(existing.couponCode, existing.userId, rideId, grossPrice);
        discountAmount = result.discountAmount;
      } catch (err: any) {
        this.logger.warn(`Coupon ${existing.couponCode} non appliqué sur la course ${rideId}: ${err.message}`);
      }
    }
    const price = Math.max(0, Math.round((grossPrice - discountAmount) * 100) / 100);

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.COMPLETED, price, discountAmount, endLatitude, endLongitude })
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
    await this.walletService.deductCommission(driverId, rideId, price, Number(settings.commissionPercent));

    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    await this.geolocationGateway.notifyRideCompleted(ride);
    return ride;
  }

  async cancelRide(rideId: string, userId: string, reason?: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.userId !== userId) throw new ForbiddenException('Cette course ne vous appartient pas');

    if (ride.status !== RideStatus.PENDING && ride.status !== RideStatus.ACCEPTED) {
      throw new ConflictException('Cette course ne peut plus être annulée');
    }

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.CANCELLED, cancelledBy: 'user', cancelReason: reason ?? null })
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

  // ── Annulation par le chauffeur d'une course acceptée mais pas encore démarrée ──

  async driverCancelRide(rideId: string, driverId: string, dto: DriverCancelRideDto): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.driverId !== driverId) throw new ForbiddenException('Cette course ne vous est pas assignée');

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({
        status: RideStatus.CANCELLED,
        cancelledBy: 'driver',
        cancelReason: dto.reason ?? null,
      })
      .where('id = :id AND status = :status AND "driverId" = :driverId', {
        id: rideId,
        status: RideStatus.ACCEPTED,
        driverId,
      })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Cette course ne peut plus être annulée par le chauffeur');
    }

    await this.driversService.updateStatus(driverId, DriverStatus.ONLINE);
    this.geolocationGateway.notifyRideCancelled(`user:${ride.userId}`, rideId, 'driver_cancelled');
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

  // ── Estimation de tarif avant réservation — ne crée rien ──────────────────

  async estimateRide(dto: EstimateRideDto): Promise<{
    distanceKm: number;
    estimatedDurationMinutes: number;
    estimatedPrice: number;
  }> {
    const settings = await this.settingsService.getSettings();
    const distanceKm = haversineMeters(
      dto.startLatitude, dto.startLongitude,
      dto.endLatitude, dto.endLongitude,
    ) / 1000;

    const estimatedPrice = computeFare(
      dto.startLatitude, dto.startLongitude,
      dto.endLatitude, dto.endLongitude,
      Number(settings.pricePerKm), Number(settings.minimumFare),
    );

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      estimatedDurationMinutes: Math.max(1, Math.round((distanceKm / AVG_TRIP_SPEED_KMH) * 60)),
      estimatedPrice,
    };
  }

  // ── Reçu détaillé d'une course terminée ───────────────────────────────────

  async getReceipt(rideId: string, jwt: JwtPayload): Promise<Record<string, unknown>> {
    const ride = await this.findByIdForParticipant(rideId, jwt);
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Le reçu n\'est disponible qu\'une fois la course terminée');
    }

    const settings = await this.settingsService.getSettings();
    const distanceKm = haversineMeters(
      ride.startLatitude, ride.startLongitude,
      ride.endLatitude ?? ride.startLatitude, ride.endLongitude ?? ride.startLongitude,
    ) / 1000;

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

  // ═══════════════════════ Courses programmées ═══════════════════════════════

  async createScheduledRide(userId: string, dto: CreateScheduledRideDto): Promise<Ride> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() < Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS) {
      throw new BadRequestException('La date programmée doit être au moins 5 minutes dans le futur');
    }

    const ride = this.rideRepo.create({
      userId,
      startLatitude:  dto.startLatitude,
      startLongitude: dto.startLongitude,
      destinationName: dto.destinationName,
      endLatitude:   dto.endLatitude  ?? null,
      endLongitude:  dto.endLongitude ?? null,
      vehicleType:   dto.vehicleType,
      couponCode:    dto.couponCode ?? null,
      scheduledAt,
      status: RideStatus.SCHEDULED,
    });

    const saved = await this.rideRepo.save(ride);
    this.logger.log(`Course programmée créée: ${saved.id} par user ${userId} pour ${scheduledAt.toISOString()}`);
    return saved;
  }

  async findScheduledByUser(userId: string): Promise<Ride[]> {
    return this.rideRepo.find({
      where: { userId, status: RideStatus.SCHEDULED },
      order: { scheduledAt: 'ASC' },
    });
  }

  async updateScheduledRide(rideId: string, userId: string, dto: UpdateScheduledRideDto): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.userId !== userId) throw new ForbiddenException('Cette course ne vous appartient pas');
    if (ride.status !== RideStatus.SCHEDULED) {
      throw new ConflictException('Cette course ne peut plus être modifiée');
    }

    let scheduledAt = ride.scheduledAt;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);
      if (scheduledAt.getTime() < Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS) {
        throw new BadRequestException('La date programmée doit être au moins 5 minutes dans le futur');
      }
    }

    await this.rideRepo.update(rideId, {
      scheduledAt,
      startLatitude:   dto.startLatitude   ?? ride.startLatitude,
      startLongitude:  dto.startLongitude  ?? ride.startLongitude,
      destinationName: dto.destinationName ?? ride.destinationName,
      vehicleType:     dto.vehicleType     ?? ride.vehicleType,
      endLatitude:     dto.endLatitude     ?? ride.endLatitude,
      endLongitude:    dto.endLongitude    ?? ride.endLongitude,
    });

    return this.rideRepo.findOne({ where: { id: rideId } });
  }

  async cancelScheduledRide(rideId: string, userId: string): Promise<void> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.userId !== userId) throw new ForbiddenException('Cette course ne vous appartient pas');

    const result = await this.rideRepo
      .createQueryBuilder()
      .update(Ride)
      .set({ status: RideStatus.CANCELLED, cancelledBy: 'user' })
      .where('id = :id AND status = :status', { id: rideId, status: RideStatus.SCHEDULED })
      .execute();

    if (!result.affected) {
      throw new ConflictException('Cette course ne peut plus être annulée');
    }
  }

  async findScheduledForAdmin(query: PaginationQueryDto): Promise<PaginatedResult<Ride>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.rideRepo
      .createQueryBuilder('ride')
      .where('ride.status = :status', { status: RideStatus.SCHEDULED })
      .orderBy('ride.scheduledAt', 'ASC');

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  // Fait passer en PENDING (et notifie les chauffeurs proches) les courses programmées
  // dont l'heure approche — tourne toutes les minutes via le sondeur démarré dans onModuleInit
  private async activateDueScheduledRides(): Promise<void> {
    const dueRides = await this.rideRepo.find({
      where: {
        status: RideStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(new Date(Date.now() + SCHEDULED_ACTIVATION_WINDOW_MS)),
      },
    });

    for (const ride of dueRides) {
      const result = await this.rideRepo
        .createQueryBuilder()
        .update(Ride)
        .set({ status: RideStatus.PENDING })
        .where('id = :id AND status = :status', { id: ride.id, status: RideStatus.SCHEDULED })
        .execute();

      if (!result.affected) continue;

      ride.status = RideStatus.PENDING;
      this.logger.log(`Course programmée activée: ${ride.id}`);
      await this.activatePendingRide(ride);
    }
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async findAllForAdmin(query: AdminRidesQueryDto): Promise<PaginatedResult<Ride>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.rideRepo.createQueryBuilder('ride').orderBy('ride.createdAt', 'DESC');
    if (query.status)   qb.andWhere('ride.status = :status', { status: query.status });
    if (query.driverId) qb.andWhere('ride."driverId" = :driverId', { driverId: query.driverId });
    if (query.userId)   qb.andWhere('ride."userId" = :userId', { userId: query.userId });
    if (query.from)      qb.andWhere('ride.createdAt >= :from', { from: query.from });
    if (query.to)         qb.andWhere('ride.createdAt <= :to', { to: query.to });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async findByIdForAdmin(id: string): Promise<Ride> {
    const ride = await this.rideRepo.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    return ride;
  }
}
