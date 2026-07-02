import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { GeolocationModule } from './modules/geolocation/geolocation.module';
import { RidesModule } from './modules/rides/rides.module';
import { PlacesModule } from './modules/places/places.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    AuthModule,
    UsersModule,
    DriversModule,
    GeolocationModule,
    RidesModule,
    PlacesModule,
    SettingsModule,
    WalletModule,
    NotificationsModule,
    DashboardModule,
  ],
})
export class AppModule {}