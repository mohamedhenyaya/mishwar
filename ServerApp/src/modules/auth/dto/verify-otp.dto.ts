import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsPhoneNumber, IsString, Length } from 'class-validator';
import { AuthRole } from './send-otp.dto';

export class VerifyOtpDto {
  @ApiProperty({ example: '+213612345678' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: '123456', description: 'Code OTP à 6 chiffres' })
  @IsString()
  @Length(6, 6, { message: "Le code OTP doit contenir exactement 6 chiffres" })
  code: string;

  @ApiProperty({ enum: AuthRole })
  @IsEnum(AuthRole)
  role: AuthRole;
}