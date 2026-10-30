import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeolocationGateway } from './geolocation.gateway';
import { Ride } from '../rides/entities/ride.entity';
import { DriversModule } from '../drivers/drivers.module';
import { AuthModule } from '../auth/auth.module';
import { RidesModule } from '../rides/rides.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ride]), forwardRef(() => DriversModule), forwardRef(() => RidesModule), AuthModule, PushModule],
  providers: [GeolocationGateway],
  exports: [GeolocationGateway],
})
export class GeolocationModule {}