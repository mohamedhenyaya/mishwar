import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { WalletRequestType } from '../entities/wallet-request.entity';

export class CreateWalletRequestDto {
  @ApiProperty({ enum: WalletRequestType, description: 'Type de demande : recharge ou retrait' })
  @IsEnum(WalletRequestType)
  type: WalletRequestType;

  @ApiProperty({ example: 1000, description: 'Montant demandé (toujours positif)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'cash', description: 'Méthode utilisée (cash, mobile money, virement bancaire...)' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiPropertyOptional({ description: 'Référence externe (numéro de transaction, reçu...)' })
  @IsOptional()
  @IsString()
  reference?: string;
}
