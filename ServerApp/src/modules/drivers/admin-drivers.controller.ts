import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { BlockDriverDto } from './dto/block-driver.dto';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';

@ApiTags('admin-drivers')
@ApiBearerAuth()
@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDriversController {
  constructor(private readonly driversService: DriversService) {}

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
  block(@Param('id') id: string, @Body() dto: BlockDriverDto) {
    return this.driversService.block(id, dto.reason);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un chauffeur' })
  unblock(@Param('id') id: string) {
    return this.driversService.unblock(id);
  }
}
