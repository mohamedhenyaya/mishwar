import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par administrateur ayant réalisé l\'action' })
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par clé d\'action, ex. "user.block", "wallet.adjust"' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Date ISO — début de la période' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Date ISO — fin de la période' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
