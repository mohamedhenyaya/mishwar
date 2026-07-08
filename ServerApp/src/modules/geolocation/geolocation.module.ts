import { Module, forwardRef } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';
import { DriversModule } from '../drivers/drivers.module';
import { AuthModule } from '../auth/auth.module';
import { RidesModule } from '../rides/rides.module';

@Module({
  imports: [forwardRef(() => DriversModule), forwardRef(() => RidesModule), AuthModule],
  providers: [GeolocationGateway],
  exports: [GeolocationGateway],
})
export class GeolocationModule {}