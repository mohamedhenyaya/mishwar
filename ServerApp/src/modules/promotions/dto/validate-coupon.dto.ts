import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 500, description: 'Montant de la course avant remise' })
  @IsNumber()
  @Min(0)
  rideAmount: number;
}
