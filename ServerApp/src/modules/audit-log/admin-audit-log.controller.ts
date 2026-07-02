import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';

@ApiTags('admin-audit-logs')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée du journal d\'audit admin, filtrable par administrateur/action/période' })
  findAll(@Query() query: AdminAuditLogsQueryDto) {
    return this.auditLogService.findAllForAdmin(query);
  }
}
