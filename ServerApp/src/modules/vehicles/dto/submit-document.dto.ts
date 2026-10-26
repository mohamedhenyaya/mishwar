import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleDocumentType } from '../entities/vehicle-document.entity';

export class SubmitDocumentDto {
  @ApiProperty({ enum: VehicleDocumentType })
  @IsEnum(VehicleDocumentType)
  type: VehicleDocumentType;

  @ApiProperty({ example: 'https://storage.example.com/documents/abc.jpg' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
