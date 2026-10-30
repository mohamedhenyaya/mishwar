import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Blocage d'un compte (client, capitaine, admin) : sans durée = définitif
export class BlockAccountDto {
  @ApiPropertyOptional({ example: 'Signalements répétés' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 1440, description: 'Durée en minutes ; absente = blocage définitif' })
  @IsOptional()
  @IsInt({ message: 'Durée de blocage invalide' })
  @Min(1, { message: 'Durée de blocage invalide' })
  @Max(5 * 365 * 24 * 60, { message: 'Durée de blocage trop longue (5 ans au plus)' })
  durationMinutes?: number;
}
