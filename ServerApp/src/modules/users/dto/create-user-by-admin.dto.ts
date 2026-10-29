import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserByAdminDto {
  @ApiProperty({ example: '+22220122724' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: 'Sidi Mohamed' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ description: 'Mot de passe initial — le client peut le changer via « mot de passe oublié »' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'client@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
