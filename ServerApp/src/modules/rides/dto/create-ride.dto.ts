import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
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

  // Ignoré pour un trajet ouvert
  @IsOptional()
  @IsString()
  destinationName?: string;

  // Catégorie unique : champ conservé pour compatibilité, plus envoyé par l'app
  @IsOptional()
  @IsEnum(RideVehicleClass)
  vehicleType?: RideVehicleClass;

  // Trajet ouvert : pas de destination, prix au compteur
  @IsOptional()
  @IsBoolean()
  isOpenTrip?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endLongitude?: number;
}