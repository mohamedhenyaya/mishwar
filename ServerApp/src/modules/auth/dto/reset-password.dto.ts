import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsPhoneNumber, IsString, Length, MinLength } from 'class-validator';
import { AuthRole } from './send-otp.dto';

export class ResetPasswordDto {
  @ApiProperty({ example: '+213612345678' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ enum: AuthRole })
  @IsEnum(AuthRole)
  role: AuthRole;

  @ApiProperty({ description: 'Code OTP reçu par WhatsApp' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  newPassword: string;
}
