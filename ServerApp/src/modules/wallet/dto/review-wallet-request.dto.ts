import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReviewWalletRequestDto {
  @ApiPropertyOptional({ description: 'Note de l\'admin sur la validation de la demande' })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
