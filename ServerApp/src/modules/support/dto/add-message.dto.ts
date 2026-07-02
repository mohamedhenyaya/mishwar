import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddMessageDto {
  @ApiProperty({ example: 'Merci de vérifier ma dernière transaction.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
