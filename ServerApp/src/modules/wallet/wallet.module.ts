import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletRequest } from './entities/wallet-request.entity';
import { WalletService } from './wallet.service';
import { WalletRequestsService } from './wallet-requests.service';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([WalletTransaction, WalletRequest, User, Driver]), AuditLogModule],
  controllers: [WalletController, AdminWalletController],
  providers: [WalletService, WalletRequestsService],
  exports: [WalletService, WalletRequestsService],
})
export class WalletModule {}
