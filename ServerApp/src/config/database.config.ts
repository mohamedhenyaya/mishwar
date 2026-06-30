import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Driver } from '../modules/drivers/entities/driver.entity';
import { Ride } from '../modules/rides/entities/ride.entity';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host:     config.get<string>('DB_HOST', 'localhost'),
  port:     config.get<number>('DB_PORT', 5432),
  username: config.get<string>('DB_USERNAME', 'vtc_user'),
  password: config.get<string>('DB_PASSWORD', 'vtc_password'),
  database: config.get<string>('DB_NAME', 'vtc_db'),
  entities: [User, Driver, Ride],
  // synchronize crée/met à jour les tables automatiquement — DÉSACTIVER en production
  synchronize: config.get<string>('NODE_ENV') !== 'production',
  logging:     config.get<string>('NODE_ENV') === 'development',
  // L'image Docker postgis/postgis active l'extension PostGIS automatiquement.
  // Sur PostgreSQL brut : CREATE EXTENSION IF NOT EXISTS postgis;
});