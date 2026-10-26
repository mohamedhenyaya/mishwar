import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CouponType {
  PERCENT = 'PERCENT',
  FIXED   = 'FIXED',
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  // Pourcentage (0-100) pour PERCENT, montant fixe pour FIXED
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  // Plafond de remise applicable uniquement au type PERCENT
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number | null;

  // Montant minimum de la course pour que le coupon soit applicable
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minRideAmount: number | null;

  // Nombre total d'utilisations autorisées, null = illimité
  @Column({ nullable: true })
  usageLimit: number | null;

  // Nombre d'utilisations autorisées par utilisateur, null = illimité
  @Column({ nullable: true })
  usageLimitPerUser: number | null;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ type: 'timestamp' })
  validFrom: Date;

  @Column({ type: 'timestamp' })
  validTo: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
