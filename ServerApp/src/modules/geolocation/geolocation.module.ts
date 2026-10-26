<<<<<<< HEAD
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
=======
import { Module, forwardRef } from '@nestjs/common';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
import { GeolocationGateway } from './geolocation.gateway';
import { Ride } from '../rides/entities/ride.entity';
import { DriversModule } from '../drivers/drivers.module';
import { AuthModule } from '../auth/auth.module';
import { RidesModule } from '../rides/rides.module';

@Module({
<<<<<<< HEAD
  imports: [TypeOrmModule.forFeature([Ride]), DriversModule, AuthModule],
=======
  imports: [forwardRef(() => DriversModule), forwardRef(() => RidesModule), AuthModule],
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  providers: [GeolocationGateway],
  exports: [GeolocationGateway],
})
export class GeolocationModule {}