import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Ride } from '../rides/entities/ride.entity';
import { Driver } from '../drivers/entities/driver.entity';
import { User } from '../users/entities/user.entity';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { DriverReviewsController } from './driver-reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Ride, Driver, User]), AuditLogModule],
  controllers: [RatingsController, DriverReviewsController, AdminReviewsController],
  providers: [RatingsService],
})
export class RatingsModule {}
