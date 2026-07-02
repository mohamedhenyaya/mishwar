import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateFavoritePlaceDto {
  @ApiProperty({ example: 'Maison', description: 'Nom donné au lieu favori' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label: string;

  @ApiProperty({ example: '12 Rue Didouche Mourad, Alger' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 36.7538 })
  @IsNumber()
  @Min(-90) @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.0588 })
  @IsNumber()
  @Min(-180) @Max(180)
  longitude: number;
}
