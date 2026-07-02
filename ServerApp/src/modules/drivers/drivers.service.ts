import { ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Driver, DriverStatus, VehicleType } from './entities/driver.entity';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { GeolocationGateway } from '../geolocation/geolocation.gateway';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import {
  WalletOwnerType,
  WalletTransaction,
  WalletTransactionType,
} from '../wallet/entities/wallet-transaction.entity';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';

export interface NearbyDriverResult {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  vehicleType: string;
  rating: number;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @Inject(forwardRef(() => GeolocationGateway))
    private readonly geolocationGateway: GeolocationGateway,
  ) {}

  // ── GET /drivers/nearby ───────────────────────────────────────────────────
  // Formule Haversine en SQL pur (pas de PostGIS requis).
  // Rayon terrestre : 6 371 000 m.
  // Précision suffisante pour des distances < 50 km.

  async findNearby(dto: NearbyDriversDto, vehicleTypes?: VehicleType[]): Promise<NearbyDriverResult[]> {
    const radius = dto.radius ?? 5_000;

    const rows = await this.driverRepo.query(
      `
      SELECT
        id,
        name,
        phone,
        status,
        "vehicleType",
        rating,
        latitude,
        longitude,
        6371000 * 2 * ASIN(SQRT(
          POWER(SIN((RADIANS($1) - RADIANS(latitude))  / 2), 2) +
          COS(RADIANS($1)) * COS(RADIANS(latitude)) *
          POWER(SIN((RADIANS($2) - RADIANS(longitude)) / 2), 2)
        )) AS "distanceMeters"
      FROM drivers
      WHERE
        status     = 'ONLINE'
        AND latitude  IS NOT NULL
        AND longitude IS NOT NULL
        AND "isActive" = true
        AND ($4::text[] IS NULL OR "vehicleType"::text = ANY($4))
        AND 6371000 * 2 * ASIN(SQRT(
          POWER(SIN((RADIANS($1) - RADIANS(latitude))  / 2), 2) +
          COS(RADIANS($1)) * COS(RADIANS(latitude)) *
          POWER(SIN((RADIANS($2) - RADIANS(longitude)) / 2), 2)
        )) <= $3
      ORDER BY "distanceMeters" ASC
      LIMIT 20
      `,
      [dto.lat, dto.lng, radius, vehicleTypes ?? null],
    );

    return rows.map((r: any) => ({
      ...r,
      latitude:       parseFloat(r.latitude),
      longitude:      parseFloat(r.longitude),
      distanceMeters: parseFloat(r.distanceMeters),
      rating:         parseFloat(r.rating),
    }));
  }

  // ── PATCH /drivers/location ────────────────────────────────────────────────

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<void> {
    await this.driverRepo.update(id, {
      latitude:           dto.latitude,
      longitude:          dto.longitude,
      lastLocationUpdate: new Date(),
    });
  }

  // ── PATCH /drivers/status ─────────────────────────────────────────────────

  async updateStatus(id: string, status: DriverStatus): Promise<Driver> {
    await this.driverRepo.update(id, { status });
    return this.findById(id);
  }

  // ── Utilitaire interne ────────────────────────────────────────────────────

  async findById(id: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) throw new NotFoundException('Chauffeur non trouvé');
    return driver;
  }

  async incrementTotalRides(id: string): Promise<void> {
    await this.driverRepo.increment({ id }, 'totalRides', 1);
  }

  // ═══════════════════════════ Administration ═══════════════════════════════

  async createByAdmin(dto: CreateDriverDto): Promise<Driver> {
    const existing = await this.driverRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Un chauffeur avec ce numéro existe déjà');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const driver = this.driverRepo.create({
      phone:        dto.phone,
      name:         dto.name,
      passwordHash,
      vehicleType:  dto.vehicleType,
      vehicleModel: dto.vehicleModel,
      vehiclePlate: dto.vehiclePlate,
    });
    return this.driverRepo.save(driver);
  }

  async updateByAdmin(id: string, dto: UpdateDriverDto): Promise<Driver> {
    await this.findById(id);
    await this.driverRepo.update(id, dto);
    return this.findById(id);
  }

  async block(id: string, reason?: string): Promise<Driver> {
    await this.findById(id);
    await this.driverRepo.update(id, {
      isActive:      false,
      blockedReason: reason ?? null,
      blockedAt:     new Date(),
      status:        DriverStatus.OFFLINE,
    });
    this.geolocationGateway.notifyCustom(`driver:${id}`, 'account:blocked', { reason: reason ?? null });
    return this.findById(id);
  }

  async unblock(id: string): Promise<Driver> {
    await this.findById(id);
    await this.driverRepo.update(id, { isActive: true, blockedReason: null, blockedAt: null });
    return this.findById(id);
  }

  async findAllPaginated(query: AdminDriversQueryDto): Promise<PaginatedResult<Driver>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.driverRepo.createQueryBuilder('driver').orderBy('driver.createdAt', 'DESC');
    if (query.status)      qb.andWhere('driver.status = :status', { status: query.status });
    if (query.isActive !== undefined) {
      qb.andWhere('driver.isActive = :isActive', { isActive: query.isActive === 'true' });
    }
    if (query.search) {
      qb.andWhere('(driver.name ILIKE :s OR driver.phone ILIKE :s)', { s: `%${query.search}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }

  async getStats(id: string) {
    const driver = await this.findById(id);
    const rideRepo = this.driverRepo.manager.getRepository(Ride);

    const statusCounts = await rideRepo
      .createQueryBuilder('ride')
      .select('ride.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ride.driverId = :id', { id })
      .groupBy('ride.status')
      .getRawMany();

    const ridesByStatus: Record<string, number> = {};
    let totalRides = 0;
    for (const row of statusCounts) {
      const count = parseInt(row.count, 10);
      ridesByStatus[row.status] = count;
      totalRides += count;
    }

    const earnedRow = await rideRepo
      .createQueryBuilder('ride')
      .select('COALESCE(SUM(ride.price), 0)', 'total')
      .where('ride.driverId = :id AND ride.status = :status', { id, status: RideStatus.COMPLETED })
      .getRawOne();

    const txRepo = this.driverRepo.manager.getRepository(WalletTransaction);
    const commissionRow = await txRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(-tx.amount), 0)', 'total')
      .where('tx.ownerType = :ownerType AND tx.ownerId = :id AND tx.type = :type', {
        ownerType: WalletOwnerType.DRIVER,
        id,
        type: WalletTransactionType.COMMISSION_DEDUCTION,
      })
      .getRawOne();

    return {
      driver,
      totalRides,
      ridesByStatus,
      totalEarned:         parseFloat(earnedRow.total),
      totalCommissionPaid: parseFloat(commissionRow.total),
      balance:              Number(driver.balance),
    };
  }
}