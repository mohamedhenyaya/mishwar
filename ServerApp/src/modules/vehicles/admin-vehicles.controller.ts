import {
  BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { documentUploadOptions } from '../../common/utils/photo-upload.util';
import { SubmitDocumentDto } from './dto/submit-document.dto';
import { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @Post('drivers/:driverId/documents')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envoyer une pièce du dossier d’un chauffeur (champ « photo ») — assurance : avec sa date de fin' })
  @UseInterceptors(FileInterceptor('photo', documentUploadOptions))
  async submitDocument(
    @CurrentUser() admin: JwtPayload,
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Body() dto: SubmitDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucune photo reçue');
    const document = await this.vehiclesService.submitDocument(driverId, dto, file, { byAdmin: true });
    await this.auditLogService.log(admin.sub, 'vehicle.document.submit', 'VehicleDocument', document.id, { type: dto.type });
    return document;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un véhicule et de ses documents' })
  getOne(@Param('id') id: string) {
    return this.vehiclesService.findByIdForAdmin(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approuver le dossier du capitaine (toutes les pièces requises), ses pièces en attente avec' })
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

  @Get('documents/:id/file')
  @ApiOperation({ summary: 'Fichier d’une pièce du dossier (pièces d’identité : jamais publiques)' })
  async documentFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    res.sendFile(await this.vehiclesService.documentFile(id));
  }

  @Patch('documents/:id/review')
  @ApiOperation({ summary: 'Approuver ou rejeter un document de véhicule' })
  async reviewDocument(@CurrentUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: ReviewDocumentDto) {
    const document = await this.vehiclesService.reviewDocument(id, dto);
    await this.auditLogService.log(admin.sub, 'vehicle.document.review', 'VehicleDocument', id, { status: dto.status });
    return document;
  }
}
