import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateFavoritePlaceDto {
  @ApiPropertyOptional({ example: 'Maison', description: 'Nom donné au lieu favori' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({ example: '12 Rue Didouche Mourad, Alger' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({ example: 36.7538 })
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 3.0588 })
  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  longitude?: number;
}
