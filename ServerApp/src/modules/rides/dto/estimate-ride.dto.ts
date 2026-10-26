import { IsEnum, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RideVehicleClass } from '../entities/ride.entity';

export class EstimateRideDto {
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

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  endLatitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  endLongitude: number;

  @IsEnum(RideVehicleClass)
  vehicleType: RideVehicleClass;
}
