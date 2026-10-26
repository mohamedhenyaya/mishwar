import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class AdminBootstrapDto {
  @ApiProperty({ description: 'Doit correspondre à ADMIN_BOOTSTRAP_SECRET côté serveur' })
  @IsString()
  secret: string;

  @ApiProperty({ example: '+22220122724' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ example: 'Admin Principal' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
