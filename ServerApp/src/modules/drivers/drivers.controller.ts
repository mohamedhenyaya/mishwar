import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NearbyDriversDto } from './dto/nearby-drivers.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { DriverStatus } from './entities/driver.entity';

@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Chauffeurs ONLINE dans un rayon (PostGIS ST_DWithin)' })
  findNearby(@Query() dto: NearbyDriversDto) {
    return this.driversService.findNearby(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @ApiOperation({ summary: 'Profil du chauffeur connecté' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.driversService.findById(user.sub);
  }

  @Patch('location')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @ApiOperation({ summary: 'Mettre à jour la position GPS (REST fallback)' })
  updateLocation(@CurrentUser() user: JwtPayload, @Body() dto: UpdateLocationDto) {
    return this.driversService.updateLocation(user.sub, dto);
  }

  @Patch('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @ApiOperation({ summary: 'Passer ONLINE / OFFLINE / BUSY' })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Body('status') status: DriverStatus,
  ) {
    return this.driversService.updateStatus(user.sub, status);
  }
}