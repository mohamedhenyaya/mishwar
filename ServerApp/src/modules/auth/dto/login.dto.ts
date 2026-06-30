import { IsString, IsMobilePhone, MinLength } from 'class-validator';

export class LoginDto {
  @IsMobilePhone()
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}