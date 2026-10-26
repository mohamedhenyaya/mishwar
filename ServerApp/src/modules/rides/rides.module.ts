import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './entities/ride.entity';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { DriversModule } from '../drivers/drivers.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride]),
    GeolocationModule,
    DriversModule,
    UsersModule,
  ],
  controllers: [RidesController],
  providers: [RidesService],
})
export class RidesModule {}