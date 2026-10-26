import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { DriverStatus } from '../entities/driver.entity';

export class AdminDriversQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DriverStatus })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @ApiPropertyOptional({ description: '"true"/"false" — filtrer les comptes bloqués (isActive=false)' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le téléphone' })
  @IsOptional()
  @IsString()
  search?: string;
}
