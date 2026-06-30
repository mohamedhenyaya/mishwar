import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ example: 36.7538 })
  @IsNumber()
  @Min(-90) @Max(90)
  latitude: number;

  @ApiProperty({ example: 3.0588 })
  @IsNumber()
  @Min(-180) @Max(180)
  longitude: number;
}