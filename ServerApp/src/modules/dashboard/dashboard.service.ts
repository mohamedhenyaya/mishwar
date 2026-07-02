import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { WalletTransaction, WalletTransactionType } from '../wallet/entities/wallet-transaction.entity';
import { DriversService } from '../drivers/drivers.service';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';

interface DateRange {
  from: Date;
  to: Date;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly driversService: DriversService,
  ) {}

  async getOverview(query: DashboardOverviewQueryDto) {
    const range = this.dateRangeFilter(query.from, query.to);

    const [totalUsers, totalDrivers, onlineDrivers, blockedDrivers, blockedUsers] = await Promise.all([
      this.userRepo.count(),
      this.driverRepo.count(),
      this.driverRepo.count({ where: { status: DriverStatus.ONLINE } }),
      this.driverRepo.count({ where: { isActive: false } }),
      this.userRepo.count({ where: { isActive: false } }),
    ]);

    const rideStatusQb = this.rideRepo
      .createQueryBuilder('ride')
      .select('ride.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ride.status');
    if (range) rideStatusQb.where('ride.createdAt BETWEEN :from AND :to', range);
    const statusRows = await rideStatusQb.getRawMany();

    const ridesByStatus: Record<string, number> = {};
    for (const row of statusRows) ridesByStatus[row.status] = parseInt(row.count, 10);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const ridesToday = await this.rideRepo
      .createQueryBuilder('ride')
      .where('ride.createdAt >= :start', { start: startOfToday })
      .getCount();

    const revenueQb = this.rideRepo
      .createQueryBuilder('ride')
      .select('COALESCE(SUM(ride.price), 0)', 'total')
      .where('ride.status = :status', { status: RideStatus.COMPLETED });
    if (range) revenueQb.andWhere('ride.createdAt BETWEEN :from AND :to', range);
    const revenueRow = await revenueQb.getRawOne();

    const commissionQb = this.txRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(-tx.amount), 0)', 'total')
      .where('tx.type = :type', { type: WalletTransactionType.COMMISSION_DEDUCTION });
    if (range) commissionQb.andWhere('tx.createdAt BETWEEN :from AND :to', range);
    const commissionRow = await commissionQb.getRawOne();

    return {
      totalUsers,
      totalDrivers,
      onlineDrivers,
      blockedDrivers,
      blockedUsers,
      ridesByStatus,
      ridesToday,
      revenueTotal:    parseFloat(revenueRow.total),
      commissionTotal: parseFloat(commissionRow.total),
    };
  }

  async getDriversStats(pagination: PaginationQueryDto): Promise<PaginatedResult<unknown>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;

    const [drivers, total] = await this.driverRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = await Promise.all(drivers.map((d) => this.driversService.getStats(d.id)));
    return { data, total, page, limit };
  }

  private dateRangeFilter(from?: string, to?: string): DateRange | null {
    if (!from && !to) return null;
    return {
      from: from ? new Date(from) : new Date(0),
      to:   to   ? new Date(to)   : new Date(),
    };
  }
}
