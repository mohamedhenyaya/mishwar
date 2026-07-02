import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import {
  WalletOwnerType,
  WalletTransaction,
  WalletTransactionType,
} from './entities/wallet-transaction.entity';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  private repoFor(ownerType: WalletOwnerType): Repository<any> {
    return ownerType === WalletOwnerType.DRIVER ? this.driverRepo : this.userRepo;
  }

  async getBalance(ownerType: WalletOwnerType, ownerId: string): Promise<number> {
    const owner = await this.repoFor(ownerType).findOne({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('Compte introuvable');
    return Number(owner.balance);
  }

  // ── Ajustement manuel par un admin (montant signé : positif = crédit, négatif = débit) ──

  async adjust(
    ownerType: WalletOwnerType,
    ownerId: string,
    amount: number,
    note: string | undefined,
    createdByAdminId: string,
  ): Promise<WalletTransaction> {
    return this.applyTransaction(
      ownerType,
      ownerId,
      amount,
      amount >= 0 ? WalletTransactionType.ADMIN_CREDIT : WalletTransactionType.ADMIN_DEBIT,
      null,
      createdByAdminId,
      note ?? null,
    );
  }

  // ── Déduction automatique de commission à la complétion d'une course ─────

  async deductCommission(
    driverId: string,
    rideId: string,
    fareAmount: number,
    commissionPercent: number,
  ): Promise<WalletTransaction> {
    const commission = Math.round(((fareAmount * commissionPercent) / 100) * 100) / 100;
    return this.applyTransaction(
      WalletOwnerType.DRIVER,
      driverId,
      -commission,
      WalletTransactionType.COMMISSION_DEDUCTION,
      rideId,
      null,
      `Commission ${commissionPercent}% sur la course ${rideId}`,
    );
  }

  private async applyTransaction(
    ownerType: WalletOwnerType,
    ownerId: string,
    amount: number,
    type: WalletTransactionType,
    relatedRideId: string | null,
    createdByAdminId: string | null,
    note: string | null,
  ): Promise<WalletTransaction> {
    return this.txRepo.manager.transaction(async (manager) => {
      const repo = ownerType === WalletOwnerType.DRIVER
        ? manager.getRepository(Driver)
        : manager.getRepository(User);

      const owner = await repo.findOne({ where: { id: ownerId } });
      if (!owner) throw new NotFoundException('Compte introuvable');

      const balanceAfter = Math.round((Number(owner.balance) + amount) * 100) / 100;
      await repo.update(ownerId, { balance: balanceAfter } as any);

      const tx = manager.getRepository(WalletTransaction).create({
        ownerType,
        ownerId,
        type,
        amount,
        balanceAfter,
        relatedRideId,
        createdByAdminId,
        note,
      });
      return manager.getRepository(WalletTransaction).save(tx);
    });
  }

  async getTransactions(
    filters: { ownerType?: WalletOwnerType; ownerId?: string },
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<WalletTransaction>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;

    const qb = this.txRepo.createQueryBuilder('tx').orderBy('tx.createdAt', 'DESC');
    if (filters.ownerType) qb.andWhere('tx.ownerType = :ownerType', { ownerType: filters.ownerType });
    if (filters.ownerId)   qb.andWhere('tx.ownerId = :ownerId', { ownerId: filters.ownerId });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }
}
