import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './entities/ride.entity';
import { RidesController } from './rides.controller';
import { AdminRidesController } from './admin-rides.controller';
import { RidesService } from './rides.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { DriversModule } from '../drivers/drivers.module';
import { SettingsModule } from '../settings/settings.module';
import { WalletModule } from '../wallet/wallet.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride]),
    forwardRef(() => GeolocationModule),
    forwardRef(() => DriversModule),
    SettingsModule,
    WalletModule,
    PromotionsModule,
    UsersModule,
    AuditLogModule,
  ],
  controllers: [RidesController, AdminRidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}