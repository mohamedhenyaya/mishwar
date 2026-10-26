import { ApiPropertyOptional } from '@nestjs/swagger';
<<<<<<< HEAD
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VehicleType } from '../entities/driver.entity';

export class UpdateDriverDto {
  @ApiPropertyOptional({ example: 'Karim Benali' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
=======
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../entities/driver.entity';

export class UpdateDriverDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  name?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

<<<<<<< HEAD
  @ApiPropertyOptional({ example: 'Renault Symbol' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicleModel?: string;

  @ApiPropertyOptional({ example: '01234-116-16' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
=======
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  vehiclePlate?: string;
}
