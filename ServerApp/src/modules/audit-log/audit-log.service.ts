import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../common/dto/pagination-query.dto';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  // Contrat public — appelé par les autres modules après import de AuditLogModule.
  // Ne doit jamais faire échouer l'action admin qui déclenche la journalisation.
  async log(
    adminId: string,
    action: string,
    targetType: string,
    targetId?: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const entry = this.auditLogRepo.create({
        adminId,
        action,
        targetType,
        targetId: targetId ?? null,
        metadata: metadata ?? null,
      });
      await this.auditLogRepo.save(entry);
    } catch (error) {
      this.logger.warn(`Échec de l'écriture du journal d'audit (action="${action}"): ${(error as Error).message}`);
    }
  }

  async findAllForAdmin(query: AdminAuditLogsQueryDto): Promise<PaginatedResult<AdminAuditLog>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.auditLogRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');
    if (query.adminId) qb.andWhere('log."adminId" = :adminId', { adminId: query.adminId });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt <= :to', { to: query.to });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }
}
