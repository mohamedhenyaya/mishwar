import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Ride, RideStatus } from '../rides/entities/ride.entity';
import { Driver, DriverStatus } from '../drivers/entities/driver.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { WalletRequest, WalletRequestStatus } from '../wallet/entities/wallet-request.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { TO_REVIEW_SQL } from '../vehicles/dossier.util';
import { SupportTicket, TicketStatus } from '../support/entities/support-ticket.entity';
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

    // Les comptes supprimés (anonymisés) et les administrateurs ne comptent pas comme clients
    const [totalUsers, totalDrivers, onlineDrivers, blockedDrivers, blockedUsers] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.USER, deletedAt: IsNull() } }),
      this.driverRepo.count({ where: { deletedAt: IsNull() } }),
      this.driverRepo.count({ where: { status: DriverStatus.ONLINE } }),
      this.driverRepo.count({ where: { isActive: false, deletedAt: IsNull() } }),
      this.userRepo.count({ where: { role: UserRole.USER, isActive: false, deletedAt: IsNull() } }),
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

    const manager = this.rideRepo.manager;
    const [busyDrivers, pendingWalletRequests, pendingVehicles, openTickets] = await Promise.all([
      this.driverRepo.count({ where: { status: DriverStatus.BUSY } }),
      manager.getRepository(WalletRequest).count({ where: { status: WalletRequestStatus.PENDING } }),
      // Mêmes dossiers que le filtre « À vérifier » de la liste : comptes supprimés exclus
      manager.getRepository(Vehicle).createQueryBuilder('vehicle')
        .innerJoin(Driver, 'driver', 'driver.id = vehicle.driverId AND driver.deletedAt IS NULL')
        .where(TO_REVIEW_SQL)
        .getCount(),
      manager.getRepository(SupportTicket).count({ where: { status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]) } }),
    ]);

    return {
      totalUsers,
      totalDrivers,
      onlineDrivers,
      busyDrivers,
      blockedDrivers,
      blockedUsers,
      ridesByStatus,
      ridesToday,
      revenueTotal:    parseFloat(revenueRow.total),
      commissionTotal: parseFloat(commissionRow.total),
      // Files d'attente du back-office (badges du menu)
      pending: {
        walletRequests: pendingWalletRequests,
        vehicles:       pendingVehicles,
        tickets:        openTickets,
      },
    };
  }

  // Activité jour par jour sur les N derniers jours (graphiques du tableau de bord) —
  // les jours sans activité sont renvoyés à zéro pour garder un axe continu
  async getTimeseries(days: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const rideRows = await this.rideRepo
      .createQueryBuilder('ride')
      .select(`TO_CHAR(DATE_TRUNC('day', ride.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'rides')
      .addSelect(`COUNT(*) FILTER (WHERE ride.status = :completed)`, 'completed')
      .addSelect(`COUNT(*) FILTER (WHERE ride.status = :cancelled)`, 'cancelled')
      .addSelect(`COALESCE(SUM(ride.price) FILTER (WHERE ride.status = :completed), 0)`, 'revenue')
      .where('ride.createdAt >= :start', { start })
      .setParameters({ completed: RideStatus.COMPLETED, cancelled: RideStatus.CANCELLED })
      .groupBy('day')
      .getRawMany();

    const commissionRows = await this.txRepo
      .createQueryBuilder('tx')
      .select(`TO_CHAR(DATE_TRUNC('day', tx.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COALESCE(SUM(-tx.amount), 0)', 'commission')
      .where('tx.type = :type AND tx.createdAt >= :start', { type: WalletTransactionType.COMMISSION_DEDUCTION, start })
      .groupBy('day')
      .getRawMany();

    const signupRows = await this.userRepo
      .createQueryBuilder('user')
      .select(`TO_CHAR(DATE_TRUNC('day', user.createdAt), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'signups')
      .where('user.createdAt >= :start AND user.role = :role', { start, role: UserRole.USER })
      .groupBy('day')
      .getRawMany();

    const rideByDay = new Map(rideRows.map((r) => [r.day, r]));
    const commissionByDay = new Map(commissionRows.map((r) => [r.day, parseFloat(r.commission)]));
    const signupsByDay = new Map(signupRows.map((r) => [r.day, parseInt(r.signups, 10)]));

    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const r = rideByDay.get(day);
      series.push({
        day,
        rides:      r ? parseInt(r.rides, 10) : 0,
        completed:  r ? parseInt(r.completed, 10) : 0,
        cancelled:  r ? parseInt(r.cancelled, 10) : 0,
        revenue:    r ? parseFloat(r.revenue) : 0,
        commission: commissionByDay.get(day) ?? 0,
        signups:    signupsByDay.get(day) ?? 0,
      });
    }
    return series;
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
