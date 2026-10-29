import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @ApiProperty({ description: 'Nouveau mot de passe — toutes les sessions du compte sont révoquées' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
