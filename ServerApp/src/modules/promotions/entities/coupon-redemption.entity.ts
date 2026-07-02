import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupon_redemptions')
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  couponId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  rideId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
