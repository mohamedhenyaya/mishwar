import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Driver, DeviceToken, NotificationPreference]),
    GeolocationModule,
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
