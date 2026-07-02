import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { WalletOwnerType } from '../entities/wallet-transaction.entity';

export class AdjustWalletDto {
  @ApiProperty({ enum: WalletOwnerType, description: 'Type de compte à créditer/débiter' })
  @IsEnum(WalletOwnerType)
  ownerType: WalletOwnerType;

  @ApiProperty({ description: 'ID du user ou du driver ciblé' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({
    example: 1000,
    description: 'Montant signé — positif pour créditer (ajouter du crédit), négatif pour débiter/corriger',
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 'Recharge manuelle guichet Nouakchott' })
  @IsOptional()
  @IsString()
  note?: string;
}
