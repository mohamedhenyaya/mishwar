import {
  BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { documentUploadOptions } from '../../common/utils/photo-upload.util';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('drivers/vehicle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('driver')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Dossier du chauffeur connecté : véhicule, pièces, pièces manquantes, fin d’assurance' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.vehiclesService.findMine(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier son véhicule — repasse en attente de validation' })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.updateOwn(user.sub, dto);
  }

  @Get('documents/:id/file')
  @ApiOperation({ summary: 'Photo d’une de ses pièces (validée ou non)' })
  async documentFile(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    res.sendFile(await this.vehiclesService.documentFile(id, user.sub));
  }

  @Post('documents')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envoyer la photo d’une pièce du dossier (champ « photo ») — assurance : avec sa date de fin' })
  @UseInterceptors(FileInterceptor('photo', documentUploadOptions))
  submitDocument(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucune photo reçue');
    return this.vehiclesService.submitDocument(user.sub, dto, file);
  }
}
