import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { VehicleDocumentType } from '../entities/vehicle-document.entity';

// Envoyé en multipart/form-data avec le fichier dans le champ « photo »
export class SubmitDocumentDto {
  @ApiProperty({ enum: VehicleDocumentType })
  @IsEnum(VehicleDocumentType)
  type: VehicleDocumentType;

  @ApiPropertyOptional({ example: '2027-01-01', description: 'Obligatoire pour l’assurance : date de fin de validité' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
