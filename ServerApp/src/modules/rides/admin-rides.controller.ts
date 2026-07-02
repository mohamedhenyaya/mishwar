import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RidesService } from './rides.service';
import { AdminRidesQueryDto } from './dto/admin-rides-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('admin-rides')
@ApiBearerAuth()
@Controller('admin/rides')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminRidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée de toutes les courses, filtrable par statut/chauffeur/utilisateur/période' })
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
  findOne(@Param('id') id: string) {
    return this.ridesService.findByIdForAdmin(id);
  }
}
