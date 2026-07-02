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

  async findAllForAdmin(query: AdminWalletRequestsQueryDto): Promise<PaginatedResult<WalletRequest>> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.requestRepo.createQueryBuilder('req').orderBy('req.createdAt', 'DESC');
    if (query.status) qb.andWhere('req.status = :status', { status: query.status });
    if (query.type)   qb.andWhere('req.type = :type', { type: query.type });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
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

    await this.walletService.adjust(
      request.ownerType,
      request.ownerId,
      request.type === WalletRequestType.TOPUP ? amount : -amount,
      `Demande de wallet approuvée (${request.type})`,
      adminId,
    );

    request.status = WalletRequestStatus.APPROVED;
    request.reviewedByAdminId = adminId;
    request.reviewNote = dto.reviewNote ?? null;
    request.reviewedAt = new Date();
    return this.requestRepo.save(request);
  }

  async reject(id: string, adminId: string, dto: RejectWalletRequestDto): Promise<WalletRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== WalletRequestStatus.PENDING) {
      throw new ConflictException('Cette demande a déjà été traitée');
    }

    request.status = WalletRequestStatus.REJECTED;
    request.reviewedByAdminId = adminId;
    request.reviewNote = dto.reviewNote;
    request.reviewedAt = new Date();
    return this.requestRepo.save(request);
  }
}
