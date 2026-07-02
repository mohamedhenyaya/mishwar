import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class ReverseGeocodeQueryDto {
  @ApiProperty({ example: 36.7538, description: 'Latitude du point à géocoder' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90) @Max(90)
  lat: number;

  @ApiProperty({ example: 3.0588, description: 'Longitude du point à géocoder' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180) @Max(180)
  lng: number;
}
