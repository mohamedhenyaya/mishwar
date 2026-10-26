import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewParticipantType } from './entities/review.entity';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { RateRideDto } from './dto/rate-ride.dto';
import { AdminReviewsQueryDto } from './dto/admin-reviews-query.dto';
import { DriverReviewsQueryDto } from './dto/driver-reviews-query.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── POST /rides/:id/rate — le rider note le chauffeur ─────────────────────

  async rateDriver(rideId: string, userId: string, dto: RateRideDto): Promise<Review> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.userId !== userId) {
      throw new ForbiddenException('Cette course ne vous appartient pas');
    }
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('La course doit être terminée pour être notée');
    }
    if (!ride.driverId) {
      throw new BadRequestException('Cette course n\'a pas de chauffeur assigné');
    }
    if (ride.ratingForDriver != null) {
      throw new ConflictException('Cette course a déjà été notée');
    }

    const review = this.reviewRepo.create({
      rideId,
      raterType: ReviewParticipantType.USER,
      raterId: userId,
      targetType: ReviewParticipantType.DRIVER,
      targetId: ride.driverId,
      stars: dto.stars,
      comment: dto.comment ?? null,
    });
    const saved = await this.reviewRepo.save(review);

    await this.rideRepo.update(rideId, { ratingForDriver: dto.stars });

    const driver = await this.driverRepo.findOne({ where: { id: ride.driverId } });
    if (driver) {
      const currentRating = Number(driver.rating);
      const newAvg = (currentRating * driver.ratingCount + dto.stars) / (driver.ratingCount + 1);
      await this.driverRepo.update(driver.id, {
        rating: Math.round(newAvg * 100) / 100,
        ratingCount: driver.ratingCount + 1,
      });
    }

    return saved;
  }

  // ── POST /rides/:id/rate-rider — le chauffeur note le rider ───────────────

  async rateRider(rideId: string, driverId: string, dto: RateRideDto): Promise<Review> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');
    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Cette course ne vous est pas assignée');
    }
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('La course doit être terminée pour être notée');
    }
    if (ride.ratingForRider != null) {
      throw new ConflictException('Cette course a déjà été notée');
    }

    const review = this.reviewRepo.create({
      rideId,
      raterType: ReviewParticipantType.DRIVER,
      raterId: driverId,
      targetType: ReviewParticipantType.USER,
      targetId: ride.userId,
      stars: dto.stars,
      comment: dto.comment ?? null,
    });
    const saved = await this.reviewRepo.save(review);

    await this.rideRepo.update(rideId, { ratingForRider: dto.stars });

    const user = await this.userRepo.findOne({ where: { id: ride.userId } });
    if (user) {
      const currentRating = Number(user.rating);
      const newAvg = (currentRating * user.ratingCount + dto.stars) / (user.ratingCount + 1);
      await this.userRepo.update(user.id, {
        rating: Math.round(newAvg * 100) / 100,
        ratingCount: user.ratingCount + 1,
      });
    }

    return saved;
  }

  // ── GET /rides/:id/reviews ─────────────────────────────────────────────────

  async getRideReviews(rideId: string, jwt: JwtPayload): Promise<Review[]> {
    const ride = await this.rideRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Course non trouvée');

    const isRider          = jwt.role === 'user'   && ride.userId === jwt.sub;
    const isAssignedDriver = jwt.role === 'driver' && ride.driverId === jwt.sub;
    if (!isRider && !isAssignedDriver) {
      throw new ForbiddenException('Accès refusé à cette course');
    }

    return this.reviewRepo.find({ where: { rideId } });
  }

  // ── GET /drivers/:id/reviews (public) ──────────────────────────────────────

  async getDriverReviews(driverId: string, query: DriverReviewsQueryDto): Promise<PaginatedResult<Review>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.reviewRepo.findAndCount({
      where: {
        targetType: ReviewParticipantType.DRIVER,
        targetId: driverId,
        isHidden: false,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async findAllForAdmin(query: AdminReviewsQueryDto): Promise<PaginatedResult<Review>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.reviewRepo.createQueryBuilder('review').orderBy('review.createdAt', 'DESC');
    if (query.stars) qb.andWhere('review.stars = :stars', { stars: query.stars });
    if (query.targetType) qb.andWhere('review."targetType" = :targetType', { targetType: query.targetType });
    if (query.isHidden !== undefined) qb.andWhere('review."isHidden" = :isHidden', { isHidden: query.isHidden });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async hideReview(id: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Avis non trouvé');

    await this.reviewRepo.update(id, { isHidden: true });
    return this.reviewRepo.findOne({ where: { id } });
  }
}
