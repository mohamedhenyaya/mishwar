import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './entities/ride.entity';
import { RidesController } from './rides.controller';
import { AdminRidesController } from './admin-rides.controller';
import { RidesService } from './rides.service';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { DriversModule } from '../drivers/drivers.module';
<<<<<<< HEAD
=======
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { PromotionsModule } from '../promotions/promotions.module';
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride]),
<<<<<<< HEAD
    GeolocationModule,
    DriversModule,
=======
    forwardRef(() => GeolocationModule),
    forwardRef(() => DriversModule),
    SettingsModule,
    WalletModule,
    PromotionsModule,
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
    UsersModule,
  ],
  controllers: [RidesController, AdminRidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}