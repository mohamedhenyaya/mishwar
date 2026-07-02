import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectWalletRequestDto {
  @ApiProperty({ description: 'Motif du rejet de la demande' })
  @IsString()
  @IsNotEmpty()
  reviewNote: string;
}
