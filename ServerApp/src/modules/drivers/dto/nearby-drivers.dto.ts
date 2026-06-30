import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class NearbyDriversDto {
  @ApiProperty({ example: 36.7538, description: 'Latitude de l\'utilisateur' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90) @Max(90)
  lat: number;

  @ApiProperty({ example: 3.0588, description: 'Longitude de l\'utilisateur' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180) @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: 5000, description: 'Rayon de recherche en mètres (défaut: 5000)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(500)
  @Max(50_000)
  radius?: number;
}