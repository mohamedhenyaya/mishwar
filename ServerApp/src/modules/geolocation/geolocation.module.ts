import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeolocationGateway } from './geolocation.gateway';
import { Ride } from '../rides/entities/ride.entity';
import { DriversModule } from '../drivers/drivers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ride]), DriversModule, AuthModule],
  providers: [GeolocationGateway],
  exports: [GeolocationGateway],
})
export class GeolocationModule {}