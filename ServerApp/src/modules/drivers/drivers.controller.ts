import {
  BadRequestException, Body, Controller, Get, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { photoPath, photoUploadOptions } from '../../common/utils/photo-upload.util';
import { normalizeUploadedImage } from '../../common/utils/heic.util';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { IdentityDto } from './dto/identity.dto';
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

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @ApiOperation({ summary: 'Mettre à jour son profil et son véhicule' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateDriverDto) {
    return this.driversService.updateProfile(user.sub, dto);
  }

  @Patch('me/identity')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @ApiOperation({ summary: 'Prénom, nom et NNI du dossier — modifiables tant que le compte n\u2019est pas approuvé' })
  updateIdentity(@CurrentUser() user: JwtPayload, @Body() dto: IdentityDto) {
    return this.driversService.updateIdentity(user.sub, dto);
  }

  @Post('me/photo')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @ApiOperation({ summary: 'Envoyer sa photo de profil (champ "photo")' })
  @UseInterceptors(FileInterceptor('photo', photoUploadOptions))
  async uploadPhoto(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucune photo reçue');
    await normalizeUploadedImage(file); // HEIC (iPhone) → JPEG
    return this.driversService.updateProfile(user.sub, { photoUrl: photoPath(file) });
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
    return this.driversService.updateStatusByDriver(user.sub, status);
  }
}