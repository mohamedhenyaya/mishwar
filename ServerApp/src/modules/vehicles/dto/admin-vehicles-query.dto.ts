import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VehicleApprovalStatus } from '../entities/vehicle.entity';

export class AdminVehiclesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VehicleApprovalStatus })
  @IsOptional()
  @IsEnum(VehicleApprovalStatus)
  status?: VehicleApprovalStatus;

  @ApiPropertyOptional({ description: 'Filtrer par chauffeur' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
