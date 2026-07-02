import { IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RideVehicleClass } from '../entities/ride.entity';

export class CreateRideDto {
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