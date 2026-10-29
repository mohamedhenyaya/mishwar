import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UserRole } from '../entities/user.entity';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '"true"/"false" — filtrer les comptes bloqués (isActive=false)' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Recherche sur le nom ou le téléphone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Filtrer par rôle (clients ou administrateurs)' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
