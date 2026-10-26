import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BlockDriverDto {
  @ApiPropertyOptional({ example: 'Signalements répétés de clients' })
  @IsOptional()
  @IsString()
  reason?: string;
}
