import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Recevoir les notifications liées aux courses' })
  @IsOptional()
  @IsBoolean()
  rideUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Recevoir les notifications promotionnelles' })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiPropertyOptional({ description: 'Recevoir les notifications marketing' })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}
