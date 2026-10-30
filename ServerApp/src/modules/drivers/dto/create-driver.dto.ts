import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum, IsInt, IsNotEmpty, IsPhoneNumber, IsString, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { FuelType } from '../../vehicles/entities/vehicle.entity';
import { NNI_MESSAGE, NNI_PATTERN } from './identity.dto';

// Mêmes informations que l'inscription dans l'application Capitaine ; les pièces (photo,
// carte d'identité, permis, carte grise, assurance) s'envoient ensuite, comme dans l'app
export class CreateDriverDto {
  @ApiProperty({ example: '+22220122724' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'Mot de passe initial — le chauffeur peut le changer plus tard' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Mohamed' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @MaxLength(40)
  firstName: string;

  @ApiProperty({ example: 'Lemine' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(40)
  lastName: string;

  @ApiProperty({ example: '1234567890' })
  @Matches(NNI_PATTERN, { message: NNI_MESSAGE })
  nni: string;

  // Un capitaine = un véhicule : créés ensemble
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty({ message: 'La marque est obligatoire' })
  @MaxLength(40)
  vehicleMake: string;

  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @IsNotEmpty({ message: 'Le modèle est obligatoire' })
  @MaxLength(60)
  vehicleModel: string;

  @ApiProperty({ example: 2018 })
  @IsInt({ message: 'Année du véhicule invalide' })
  @Min(1990, { message: 'Année du véhicule : 1990 au plus tôt' })
  @Max(new Date().getFullYear() + 1, { message: 'Année du véhicule invalide' })
  vehicleYear: number;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType, { message: 'Énergie invalide' })
  vehicleFuel: FuelType;

  @ApiProperty({ example: '1234 AB 12' })
  @IsString()
  @IsNotEmpty({ message: 'L’immatriculation est obligatoire' })
  @MaxLength(20)
  vehiclePlate: string;
}
