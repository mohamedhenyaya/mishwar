import { IsString, IsMobilePhone, Length, MinLength } from 'class-validator';

export class RegisterVerifyDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Le code OTP doit contenir exactement 6 chiffres' })
  code: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}