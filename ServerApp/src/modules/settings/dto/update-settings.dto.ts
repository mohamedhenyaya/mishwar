import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 30, description: 'Prix par kilomètre (en DA/MRU/unité monétaire locale)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKm?: number;

  @ApiPropertyOptional({ example: 100, description: 'Prix minimum d\'une course, quelle que soit la distance' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumFare?: number;

  @ApiPropertyOptional({ example: 10, description: 'Pourcentage de commission plateforme déduit automatiquement du solde du chauffeur à chaque course terminée' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @ApiPropertyOptional({ example: 5, description: 'Prix par minute d\'arrêt pendant un trajet ouvert (compteur temps réel)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perStopMinuteRate?: number;
}
