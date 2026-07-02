import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WalletRequestStatus, WalletRequestType } from '../entities/wallet-request.entity';

export class AdminWalletRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WalletRequestStatus })
  @IsOptional()
  @IsEnum(WalletRequestStatus)
  status?: WalletRequestStatus;

  @ApiPropertyOptional({ enum: WalletRequestType })
  @IsOptional()
  @IsEnum(WalletRequestType)
  type?: WalletRequestType;
}
