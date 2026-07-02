import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('drivers/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('driver')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Déclarer un nouveau véhicule (statut PENDING)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.createForDriver(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des véhicules du chauffeur connecté' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.vehiclesService.findMine(user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un véhicule en attente d\'approbation' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.updateOwn(id, user.sub, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activer un véhicule approuvé (devient le véhicule en cours d\'utilisation)' })
  activate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.vehiclesService.activate(id, user.sub);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Soumettre un document (carte grise, assurance, contrôle technique)' })
  submitDocument(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitDocumentDto,
  ) {
    return this.vehiclesService.submitDocument(id, user.sub, dto);
  }
}
