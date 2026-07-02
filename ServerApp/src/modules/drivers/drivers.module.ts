import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversController } from './drivers.controller';
import { AdminDriversController } from './admin-drivers.controller';
import { DriversService } from './drivers.service';
import { Driver } from './entities/driver.entity';
import { GeolocationModule } from '../geolocation/geolocation.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver]),
    forwardRef(() => GeolocationModule),
    AuditLogModule,
  ],
  controllers: [DriversController, AdminDriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}