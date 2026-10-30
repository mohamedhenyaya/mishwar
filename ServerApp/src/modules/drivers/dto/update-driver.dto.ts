import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { NNI_MESSAGE, NNI_PATTERN } from './identity.dto';
import { VehicleType } from '../entities/driver.entity';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Karim Benali' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ example: 'Renault Symbol' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicleModel?: string;

  @ApiPropertyOptional({ example: '01234-116-16' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  vehiclePlate?: string;
}

// Admin : peut aussi corriger l'identité du dossier
export class AdminUpdateDriverDto extends UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Mohamed' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Lemine' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  lastName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @Matches(NNI_PATTERN, { message: NNI_MESSAGE })
  nni?: string;
}
