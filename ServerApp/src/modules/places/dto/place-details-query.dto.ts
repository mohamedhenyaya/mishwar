import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PlaceDetailsQueryDto {
  @ApiProperty({ example: 'ChIJ...', description: 'placeId retourné par /places/autocomplete' })
  @IsString()
  @MinLength(1)
  placeId: string;
}
