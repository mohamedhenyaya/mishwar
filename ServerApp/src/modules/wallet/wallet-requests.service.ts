import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletService } from './wallet.service';
import { WalletOwnerType } from './entities/wallet-transaction.entity';
import {
  WalletRequest,
  WalletRequestStatus,
  WalletRequestType,
} from './entities/wallet-request.entity';
import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { ReviewWalletRequestDto } from './dto/review-wallet-request.dto';
import { RejectWalletRequestDto } from './dto/reject-wallet-request.dto';
import { AdminWalletRequestsQueryDto } from './dto/admin-wallet-requests-query.dto';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { loadParties, PartySummary } from '../../common/utils/admin-parties.util';

@Injectable()
export class WalletRequestsService {
  constructor(
    @InjectRepository(WalletRequest)
    private readonly requestRepo: Repository<WalletRequest>,
    private readonly walletService: WalletService,
  ) {}

  async create(
    ownerType: WalletOwnerType,
    ownerId: string,
    dto: CreateWalletRequestDto,
  ): Promise<WalletRequest> {
    const request = this.requestRepo.create({
      ownerType,
      ownerId,
      type: dto.type,
      amount: dto.amount,
      method: dto.method,
      reference: dto.reference ?? null,
      status: WalletRequestStatus.PENDING,
    });
    return this.requestRepo.save(request);
  }

  async findMine(
    ownerType: WalletOwnerType,
    ownerId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<WalletRequest>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await this.requestRepo.findAndCount({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findAllForAdmin(
    query: AdminWalletRequestsQueryDto,
  ): Promise<PaginatedResult<WalletRequest & { owner: PartySummary | null }>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.requestRepo.createQueryBuilder('req').orderBy('req.createdAt', 'DESC');
    if (query.status) qb.andWhere('req.status = :status', { status: query.status });
    if (query.type)   qb.andWhere('req.type = :type', { type: query.type });

    const [requests, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const party = await loadParties(
      this.requestRepo.manager,
      requests.map((r) => ({ type: r.ownerType, id: r.ownerId })),
    );
    const data = requests.map((r) => ({ ...r, owner: party(r.ownerType, r.ownerId) }));
    return { data, total, page, limit };
  }

  async approve(id: string, adminId: string, dto: ReviewWalletRequestDto): Promise<WalletRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== WalletRequestStatus.PENDING) {
      throw new ConflictException('Cette demande a déjà été traitée');
    }

    const amount = Number(request.amount);

    if (request.type === WalletRequestType.WITHDRAWAL) {
      const balance = await this.walletService.getBalance(request.ownerType, request.ownerId);
      if (amount > balance) {
        throw new BadRequestException('Solde insuffisant pour ce retrait');
      }
    }

    // Réservation atomique : si deux admins approuvent en même temps, un seul passe
    // (sinon le compte serait crédité deux fois)
    const reviewedAt = new Date();
    const claimed = await this.requestRepo.update(
      { id, status: WalletRequestStatus.PENDING },
      { status: WalletRequestStatus.APPROVED, reviewedByAdminId: adminId, reviewNote: dto.reviewNote ?? null, reviewedAt },
    );
    if (!claimed.affected) throw new ConflictException('Cette demande a déjà été traitée');

    try {
      await this.walletService.adjust(
        request.ownerType,
        request.ownerId,
        request.type === WalletRequestType.TOPUP ? amount : -amount,
        `Demande de wallet approuvée (${request.type})`,
        adminId,
      );
    } catch (error) {
      await this.requestRepo.update(id, {
        status: WalletRequestStatus.PENDING, reviewedByAdminId: null, reviewNote: null, reviewedAt: null,
      });
      throw error;
    }

    return this.requestRepo.findOneOrFail({ where: { id } });
  }

  async reject(id: string, adminId: string, dto: RejectWalletRequestDto): Promise<WalletRequest> {
    const claimed = await this.requestRepo.update(
      { id, status: WalletRequestStatus.PENDING },
      { status: WalletRequestStatus.REJECTED, reviewedByAdminId: adminId, reviewNote: dto.reviewNote, reviewedAt: new Date() },
    );
    if (!claimed.affected) {
      const exists = await this.requestRepo.exists({ where: { id } });
      if (!exists) throw new NotFoundException('Demande introuvable');
      throw new ConflictException('Cette demande a déjà été traitée');
    }
    return this.requestRepo.findOneOrFail({ where: { id } });
  }
}
