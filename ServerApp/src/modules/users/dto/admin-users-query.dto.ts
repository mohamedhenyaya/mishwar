import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '"true"/"false" — filtrer les comptes bloqués (isActive=false)' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le téléphone' })
  @IsOptional()
  @IsString()
  search?: string;
}
