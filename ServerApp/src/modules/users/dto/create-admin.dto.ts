import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: '+22220122724' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: 'Fatima Mint Admin' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mot de passe initial de ce nouvel administrateur' })
  @IsString()
  @MinLength(6)
  password: string;
}
