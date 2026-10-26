import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectVehicleDto {
  @ApiProperty({ example: 'Photo de la carte grise illisible' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
