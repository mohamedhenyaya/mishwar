import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// NNI mauritanien : 10 chiffres
export const NNI_PATTERN = /^\d{10}$/;
export const NNI_MESSAGE = 'Le NNI doit contenir 10 chiffres';

// Identité du capitaine, vérifiée par un admin avec sa carte d'identité
export class IdentityDto {
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
}
