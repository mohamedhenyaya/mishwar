import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DriverCancelRideDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
