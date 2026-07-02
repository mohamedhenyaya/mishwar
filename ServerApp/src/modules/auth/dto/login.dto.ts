import { IsString, IsPhoneNumber, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthRole } from './send-otp.dto';

export class LoginDto {
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @ApiPropertyOptional({ enum: AuthRole, default: AuthRole.USER })
  @IsOptional()
  @IsEnum(AuthRole)
  role?: AuthRole;
}