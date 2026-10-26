import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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
  @MaxLength(20)
  vehiclePlate?: string;
}
