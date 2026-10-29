import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { RidesService } from './rides.service';
import { AdminRidesQueryDto } from './dto/admin-rides-query.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-rides')
@ApiBearerAuth()
@Controller('admin/rides')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminRidesController {
  constructor(
    private readonly ridesService: RidesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée de toutes les courses (avec client et chauffeur), filtrable par statut/chauffeur/utilisateur/période' })
  findAll(@Query() query: AdminRidesQueryDto) {
    return this.ridesService.findAllForAdmin(query);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Liste paginée des courses programmées non encore activées' })
  findScheduled(@Query() query: PaginationQueryDto) {
    return this.ridesService.findScheduledForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail complet d\'une course (accès admin, sans vérification de participant)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ridesService.findByIdForAdmin(id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Annuler une course (programmée, en attente ou en cours)',
    description: 'Client et chauffeur sont notifiés en temps réel ; le chauffeur redevient disponible.',
  })
  async cancel(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelRideDto) {
    const ride = await this.ridesService.cancelByAdmin(id, dto.reason);
    await this.auditLogService.log(admin.sub, 'ride.cancel', 'Ride', id, { reason: dto.reason });
    return ride;
  }
}
