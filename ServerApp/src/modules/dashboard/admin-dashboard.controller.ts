import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';
import { DashboardTimeseriesQueryDto } from './dto/dashboard-timeseries-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Indicateurs globaux de la plateforme',
    description: 'Totaux users/drivers, chauffeurs en ligne/bloqués, courses par statut, courses du jour, revenu total, commission totale collectée. Optionnellement filtré sur une période (from/to).',
  })
  getOverview(@Query() query: DashboardOverviewQueryDto) {
    return this.dashboardService.getOverview(query);
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Activité jour par jour (courses, terminées, annulées, revenu, commission, inscriptions)',
    description: 'Les jours sans activité sont inclus à zéro.',
  })
  getTimeseries(@Query() query: DashboardTimeseriesQueryDto) {
    return this.dashboardService.getTimeseries(query.days ?? 30);
  }

  @Get('drivers')
  @ApiOperation({
    summary: 'Tableau paginé des statistiques par chauffeur',
    description: 'Pour chaque chauffeur : nombre de courses (total/par statut), gains totaux, commission totale versée, solde actuel.',
  })
  getDriversStats(@Query() pagination: PaginationQueryDto) {
    return this.dashboardService.getDriversStats(pagination);
  }
}
