import { Module } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';
import { DriversModule } from '../drivers/drivers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DriversModule, AuthModule],
  providers: [GeolocationGateway],
  exports: [GeolocationGateway],
})
export class GeolocationModule {}