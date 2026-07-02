import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RideVehicleClass } from '../entities/ride.entity';

export class UpdateScheduledRideDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  startLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  startLongitude?: number;

  @IsOptional()
  @IsString()
  destinationName?: string;

  @IsOptional()
  @IsEnum(RideVehicleClass)
  vehicleType?: RideVehicleClass;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endLongitude?: number;
}
