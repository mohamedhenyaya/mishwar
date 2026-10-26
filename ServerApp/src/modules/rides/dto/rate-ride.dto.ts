import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RateRideDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;
}
