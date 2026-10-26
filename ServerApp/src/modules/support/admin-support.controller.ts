import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SupportService } from './support.service';
import { AdminTicketsQueryDto } from './dto/admin-tickets-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-support')
@ApiBearerAuth()
@Controller('admin/support/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les tickets de support (filtrable par statut/priorité/catégorie)' })
  findAll(@Query() query: AdminTicketsQueryDto) {
    return this.supportService.findAllForAdmin(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut/priorité d’un ticket' })
  async updateStatus(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    const ticket = await this.supportService.updateStatusByAdmin(id, dto);
    await this.auditLogService.log(admin.sub, 'support.ticket.updateStatus', 'SupportTicket', id, dto as Record<string, unknown>);
    return ticket;
  }
}
