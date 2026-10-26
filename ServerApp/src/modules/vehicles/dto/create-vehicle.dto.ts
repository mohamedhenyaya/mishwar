import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { VehicleType } from '../../drivers/entities/driver.entity';

export class CreateVehicleDto {
  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2020 })
  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 'AB-123-DZ' })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiPropertyOptional({ example: 'Blanc' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  capacity?: number;
}
