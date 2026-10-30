import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DriverStatus } from '../entities/driver.entity';
import { VehicleApprovalStatus } from '../../vehicles/entities/vehicle.entity';

export class AdminDriversQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DriverStatus })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @ApiPropertyOptional({ enum: ['active', 'pending', 'blocked'], description: 'État du compte : actif (dossier approuvé), en cours de validation, bloqué' })
  @IsOptional()
  @IsIn(['active', 'pending', 'blocked'])
  account?: 'active' | 'pending' | 'blocked';

  @ApiPropertyOptional({ description: '"true"/"false" — filtrer les comptes bloqués (isActive=false)' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ enum: VehicleApprovalStatus, description: 'Statut de validation du véhicule' })
  @IsOptional()
  @IsEnum(VehicleApprovalStatus)
  vehicleStatus?: VehicleApprovalStatus;

  @ApiPropertyOptional({ description: '"true" — dossiers à vérifier (compte en attente ou pièce en attente)' })
  @IsOptional()
  @IsBooleanString()
  toReview?: string;

  @ApiPropertyOptional({ description: '"true" — comptes approuvés dont l’assurance validée est expirée (ou absente)' })
  @IsOptional()
  @IsBooleanString()
  insuranceExpired?: string;

  @ApiPropertyOptional({ description: '"true" — dossiers incomplets : identité, photo ou pièce manquante ou refusée' })
  @IsOptional()
  @IsBooleanString()
  incomplete?: string;

  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le téléphone' })
  @IsOptional()
  @IsString()
  search?: string;
}
