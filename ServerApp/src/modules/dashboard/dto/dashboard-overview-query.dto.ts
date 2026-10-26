import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DashboardOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Date ISO — début de la période (défaut : depuis le début)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Date ISO — fin de la période (défaut : maintenant)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
