import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { WalletOwnerType } from '../entities/wallet-transaction.entity';

export class WalletTransactionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WalletOwnerType })
  @IsOptional()
  @IsEnum(WalletOwnerType)
  ownerType?: WalletOwnerType;

  @ApiPropertyOptional({ description: 'Filtrer sur un compte précis' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
