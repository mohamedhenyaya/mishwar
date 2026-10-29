import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { loadParties, PartySummary } from '../../common/utils/admin-parties.util';
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

  async findAllForAdmin(query: AdminAuditLogsQueryDto): Promise<PaginatedResult<AdminAuditLogWithParties>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.auditLogRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');
    if (query.adminId) qb.andWhere('log."adminId" = :adminId', { adminId: query.adminId });
    // Préfixe accepté : "user." renvoie user.block, user.delete, …
    if (query.action) qb.andWhere('log.action LIKE :action', { action: `${query.action}%` });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt <= :to', { to: query.to });

    const [logs, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    const party = await loadParties(this.auditLogRepo.manager, [
      ...logs.map((l) => ({ type: 'user', id: l.adminId })),
      ...logs.map((l) => ({ type: auditTargetPartyType(l.targetType), id: l.targetId })),
    ]);
    const data = logs.map((l) => {
      const targetType = auditTargetPartyType(l.targetType);
      return {
        ...l,
        admin:  party('user', l.adminId),
        target: targetType ? party(targetType, l.targetId) : null,
      };
    });
    return { data, total, page, limit };
  }
}

export type AdminAuditLogWithParties = AdminAuditLog & {
  admin: PartySummary | null;
  target: PartySummary | null;
};

// Cibles d'audit qui désignent un compte : entités User/Driver ou ownerType wallet "user"/"driver"
function auditTargetPartyType(targetType: string): 'user' | 'driver' | null {
  const t = targetType.toLowerCase();
  if (t === 'user') return 'user';
  if (t === 'driver') return 'driver';
  return null;
}
