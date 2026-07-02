import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from '../rides/entities/ride.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { DriversModule } from '../drivers/drivers.module';
import { DashboardService } from './dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, Driver, User, WalletTransaction]),
    DriversModule,
  ],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
