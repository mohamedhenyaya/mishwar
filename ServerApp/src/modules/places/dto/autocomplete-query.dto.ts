import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class AutocompleteQueryDto {
  @ApiProperty({ example: 'Mauric', description: 'Texte tapé par l\'utilisateur' })
  @IsString()
  @MinLength(2)
  input: string;

  @ApiPropertyOptional({ description: 'Latitude de référence pour biaiser les résultats (position de départ)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90) @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude de référence pour biaiser les résultats' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180) @Max(180)
  lng?: number;
}
