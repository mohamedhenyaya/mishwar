import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardTimeseriesQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 7, maximum: 180, description: 'Nombre de jours (aujourd\'hui inclus)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(180)
  days?: number = 30;
}
