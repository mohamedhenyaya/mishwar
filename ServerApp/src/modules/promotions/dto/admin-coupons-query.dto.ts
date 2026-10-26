import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminCouponsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '"true"/"false" — filtrer les coupons actifs/inactifs' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Filtrer par code (recherche exacte)' })
  @IsOptional()
  @IsString()
  code?: string;
}
