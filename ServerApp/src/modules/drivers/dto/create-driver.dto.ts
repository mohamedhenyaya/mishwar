import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { VehicleType } from '../entities/driver.entity';

export class CreateDriverDto {
  @ApiProperty({ example: '+22220122724' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: 'Ahmed Benali' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mot de passe initial — le chauffeur peut le changer plus tard' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: VehicleType, default: VehicleType.SEDAN })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ example: 'Toyota Corolla' })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'AB-123-DZ' })
  @IsOptional()
  @IsString()
  vehiclePlate?: string;
}
