import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './entities/ride.entity';
import { RidesController } from './rides.controller';
import { AdminRidesController } from './admin-rides.controller';
import { RidesService } from './rides.service';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { DriversModule } from '../drivers/drivers.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride]),
    GeolocationModule,
    DriversModule,
    SettingsModule,
    WalletModule,
    PromotionsModule,
  ],
  controllers: [RidesController, AdminRidesController],
  providers: [RidesService],
})
export class RidesModule {}