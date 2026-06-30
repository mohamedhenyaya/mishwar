import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMobilePhone } from 'class-validator';

export enum AuthRole {
  USER   = 'user',
  DRIVER = 'driver',
}

export class SendOtpDto {
  @ApiProperty({ example: '+213612345678', description: 'Numéro au format international' })
  @IsMobilePhone()
  phone: string;

  @ApiProperty({ enum: AuthRole, default: AuthRole.USER })
  @IsEnum(AuthRole)
  role: AuthRole;
}