import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { BlockDriverDto } from './dto/block-driver.dto';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('admin-drivers')
@ApiBearerAuth()
@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des chauffeurs, filtrable par statut/actif/recherche' })
  findAll(@Query() query: AdminDriversQueryDto) {
    return this.driversService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un chauffeur + statistiques (courses, gains, commission versée, solde)' })
  getOne(@Param('id') id: string) {
    return this.driversService.getStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un chauffeur directement (sans passer par l\'inscription OTP)' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.createByAdmin(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier le profil / véhicule d\'un chauffeur' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.updateByAdmin(id, dto);
  }

  @Patch(':id/block')
  @ApiOperation({
    summary: 'Bloquer un chauffeur',
    description: 'Empêche toute connexion future, force son statut à OFFLINE, et notifie sa session en temps réel si elle est connectée.',
  })
  async block(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: BlockDriverDto) {
    const driver = await this.driversService.block(id, dto.reason);
    await this.auditLogService.log(admin.sub, 'driver.block', 'Driver', id, { reason: dto.reason });
    return driver;
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un chauffeur' })
  async unblock(@CurrentUser() admin: JwtPayload, @Param('id') id: string) {
    const driver = await this.driversService.unblock(id);
    await this.auditLogService.log(admin.sub, 'driver.unblock', 'Driver', id);
    return driver;
  }
}
