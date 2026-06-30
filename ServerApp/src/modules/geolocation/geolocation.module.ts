import { Module } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [DriversModule],
  providers: [GeolocationGateway],
  exports: [GeolocationGateway],
})
export class GeolocationModule {}