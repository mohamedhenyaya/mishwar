import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { PromotionsService } from './promotions.service';
import { CouponsController } from './coupons.controller';
import { AdminCouponsController } from './admin-coupons.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, CouponRedemption]), AuditLogModule],
  controllers: [CouponsController, AdminCouponsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
