import {
  IsEnum, IsInt, IsOptional, IsString, IsPhoneNumber, Length, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { NNI_MESSAGE, NNI_PATTERN } from '../../drivers/dto/identity.dto';
import { VehicleType } from '../../drivers/entities/driver.entity';
import { FuelType } from '../../vehicles/entities/vehicle.entity';

export class RegisterVerifyDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Le code OTP doit contenir exactement 6 chiffres' })
  code: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  // Identité et véhicule — obligatoires pour l'inscription d'un capitaine, ignorés pour un client
  @IsOptional()
  @IsString()
  @MaxLength(40)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastName?: string;

  @IsOptional()
  @Matches(NNI_PATTERN, { message: NNI_MESSAGE })
  nni?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vehicleMake?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vehicleModel?: string;

  @IsOptional()
  @IsInt({ message: 'Année du véhicule invalide' })
  @Min(1990, { message: 'Année du véhicule : 1990 au plus tôt' })
  @Max(new Date().getFullYear() + 1, { message: 'Année du véhicule invalide' })
  vehicleYear?: number;

  @IsOptional()
  @IsEnum(FuelType)
  vehicleFuel?: FuelType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;
}
