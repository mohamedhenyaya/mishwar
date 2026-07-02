import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BlockUserDto {
  @ApiPropertyOptional({ example: 'Comportement abusif signalé par plusieurs chauffeurs' })
  @IsOptional()
  @IsString()
  reason?: string;
}
