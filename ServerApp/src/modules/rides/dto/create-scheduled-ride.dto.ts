import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RideVehicleClass } from '../entities/ride.entity';

export class CreateScheduledRideDto {
  @IsDateString()
  scheduledAt: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  startLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  startLongitude: number;

  @IsString()
  destinationName: string;

  @IsEnum(RideVehicleClass)
  vehicleType: RideVehicleClass;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endLongitude?: number;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
