import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { photoPath, photoUploadOptions } from '../../common/utils/photo-upload.util';
import { normalizeUploadedImage } from '../../common/utils/heic.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { AdminUpdateDriverDto } from './dto/update-driver.dto';
import { BlockDriverDto } from './dto/block-driver.dto';
import { AdminDriversQueryDto } from './dto/admin-drivers-query.dto';
import { AdminResetPasswordDto } from '../../common/dto/admin-reset-password.dto';
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
  @ApiOperation({ summary: 'Liste paginée des chauffeurs, filtrable par statut/actif/recherche (nom, téléphone, plaque)' })
  findAll(@Query() query: AdminDriversQueryDto) {
    return this.driversService.findAllPaginated(query);
  }

  // Déclaré avant ':id' pour que « live » ne soit pas pris pour un identifiant
  @Get('live')
  @ApiOperation({ summary: 'Chauffeurs en ligne ou occupés avec leur dernière position connue (carte en direct)' })
  findLive() {
    return this.driversService.findLiveForAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un chauffeur + statistiques (courses, gains, commission versée, solde)' })
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.getStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un chauffeur directement (sans passer par l\'inscription OTP)' })
  async create(@CurrentUser() admin: JwtPayload, @Body() dto: CreateDriverDto) {
    const driver = await this.driversService.createByAdmin(dto);
    await this.auditLogService.log(admin.sub, 'driver.create', 'Driver', driver.id, { phone: dto.phone });
    return driver;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier le profil / véhicule d\'un chauffeur' })
  async update(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateDriverDto) {
    const driver = await this.driversService.updateByAdmin(id, dto);
    await this.auditLogService.log(admin.sub, 'driver.update', 'Driver', id, { ...dto });
    return driver;
  }

  @Post(':id/photo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envoyer la photo de profil d’un chauffeur (champ « photo »)' })
  @UseInterceptors(FileInterceptor('photo', photoUploadOptions))
  async uploadPhoto(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucune photo reçue');
    await normalizeUploadedImage(file);
    const driver = await this.driversService.setPhotoByAdmin(id, photoPath(file));
    await this.auditLogService.log(admin.sub, 'driver.photo', 'Driver', id);
    return driver;
  }

  @Patch(':id/block')
  @ApiOperation({
    summary: 'Bloquer un chauffeur',
    description: 'Empêche toute connexion future, révoque ses sessions, force son statut à OFFLINE, et notifie sa session en temps réel si elle est connectée. Refusé pendant une course en cours.',
  })
  async block(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BlockDriverDto) {
    const driver = await this.driversService.block(id, dto.reason, dto.durationMinutes);
    await this.auditLogService.log(admin.sub, 'driver.block', 'Driver', id, { reason: dto.reason, durationMinutes: dto.durationMinutes ?? null });
    return driver;
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Débloquer un chauffeur' })
  async unblock(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const driver = await this.driversService.unblock(id);
    await this.auditLogService.log(admin.sub, 'driver.unblock', 'Driver', id);
    return driver;
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Définir un nouveau mot de passe pour un chauffeur (révoque ses sessions)' })
  async resetPassword(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    const result = await this.driversService.resetPasswordByAdmin(id, dto.newPassword);
    await this.auditLogService.log(admin.sub, 'driver.resetPassword', 'Driver', id);
    return result;
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un compte chauffeur',
    description: 'Anonymise le compte et le désactive. Courses, gains et commissions restent dans l\'historique. Refusé pendant une course en cours.',
  })
  async remove(@CurrentUser() admin: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.driversService.softDelete(id);
    await this.auditLogService.log(admin.sub, 'driver.delete', 'Driver', id);
    return result;
  }
}
