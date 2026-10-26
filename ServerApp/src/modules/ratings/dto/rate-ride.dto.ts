import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RateRideDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: 'Note de 1 à 5 étoiles' })
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @ApiPropertyOptional({ maxLength: 1000, description: 'Commentaire optionnel' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
