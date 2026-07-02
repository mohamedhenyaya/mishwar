import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdminVehiclesQueryDto } from './dto/admin-vehicles-query.dto';
import { RejectVehicleDto } from './dto/reject-vehicle.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-vehicles')
@ApiBearerAuth()
@Controller('admin/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminVehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des véhicules, filtrable par statut/chauffeur' })
  findAll(@Query() query: AdminVehiclesQueryDto) {
    return this.vehiclesService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un véhicule et de ses documents' })
  getOne(@Param('id') id: string) {
    return this.vehiclesService.findByIdForAdmin(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approuver un véhicule (activation automatique si aucun véhicule actif)' })
  async approve(@CurrentUser() admin: JwtPayload, @Param('id') id: string) {
    const vehicle = await this.vehiclesService.approve(id);
    await this.auditLogService.log(admin.sub, 'vehicle.approve', 'Vehicle', id);
    return vehicle;
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeter un véhicule avec un motif' })
  async reject(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: RejectVehicleDto) {
    const vehicle = await this.vehiclesService.reject(id, dto);
    await this.auditLogService.log(admin.sub, 'vehicle.reject', 'Vehicle', id, { reason: dto.reason });
    return vehicle;
  }

  @Patch('documents/:id/review')
  @ApiOperation({ summary: 'Approuver ou rejeter un document de véhicule' })
  async reviewDocument(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: ReviewDocumentDto) {
    const document = await this.vehiclesService.reviewDocument(id, dto);
    await this.auditLogService.log(admin.sub, 'vehicle.document.review', 'VehicleDocument', id, { status: dto.status });
    return document;
  }
}
