import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Karim Benali' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'karim@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}