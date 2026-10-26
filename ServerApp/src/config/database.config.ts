import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Driver } from '../modules/drivers/entities/driver.entity';
import { Ride } from '../modules/rides/entities/ride.entity';
import { PlatformSettings } from '../modules/settings/entities/platform-settings.entity';
import { WalletTransaction } from '../modules/wallet/entities/wallet-transaction.entity';
import { WalletRequest } from '../modules/wallet/entities/wallet-request.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { DeviceToken } from '../modules/notifications/entities/device-token.entity';
import { NotificationPreference } from '../modules/notifications/entities/notification-preference.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Review } from '../modules/ratings/entities/review.entity';
import { Coupon } from '../modules/promotions/entities/coupon.entity';
import { CouponRedemption } from '../modules/promotions/entities/coupon-redemption.entity';
import { SupportTicket } from '../modules/support/entities/support-ticket.entity';
import { SupportTicketMessage } from '../modules/support/entities/support-ticket-message.entity';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity';
import { VehicleDocument } from '../modules/vehicles/entities/vehicle-document.entity';
import { FavoritePlace } from '../modules/places/entities/favorite-place.entity';
import { AdminAuditLog } from '../modules/audit-log/entities/admin-audit-log.entity';

// Railway (et la plupart des hébergeurs) fournit une seule variable DATABASE_URL ;
// en local, on garde les variables DB_HOST / DB_PORT / … séparées.
function connectionOptions(config: ConfigService) {
  const url = config.get<string>('DATABASE_URL');
  if (url) {
    // DB_SSL=true pour une connexion par l'URL publique (le réseau privé Railway n'en a pas besoin)
    const ssl = config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false;
    return { url, ssl };
  }
  return {
    host:     config.get<string>('DB_HOST', 'localhost'),
    port:     config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USERNAME', 'vtc_user'),
    password: config.get<string>('DB_PASSWORD', 'vtc_password'),
    database: config.get<string>('DB_NAME', 'vtc_db'),
  };
}

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  ...connectionOptions(config),
  entities: [
    User, Driver, Ride, PlatformSettings, WalletTransaction, Notification,
    WalletRequest, DeviceToken, NotificationPreference, RefreshToken,
    Review, Coupon, CouponRedemption, SupportTicket, SupportTicketMessage,
    Vehicle, VehicleDocument, FavoritePlace, AdminAuditLog,
  ],
  // synchronize crée/met à jour les tables à partir des entités. Actif hors production ;
  // en production, uniquement si DB_SYNCHRONIZE=true (le projet n'a pas encore de migrations :
  // sans ce réglage, une base neuve resterait vide). À remplacer par des migrations à terme.
  synchronize: config.get<string>('NODE_ENV') !== 'production' || config.get<string>('DB_SYNCHRONIZE') === 'true',
  logging:     config.get<string>('NODE_ENV') === 'development',
  // L'image Docker postgis/postgis active l'extension PostGIS automatiquement.
  // Sur PostgreSQL brut : CREATE EXTENSION IF NOT EXISTS postgis;
});