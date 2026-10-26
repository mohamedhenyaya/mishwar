import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum WalletOwnerType {
  USER   = 'user',
  DRIVER = 'driver',
}

export enum WalletTransactionType {
  ADMIN_CREDIT          = 'admin_credit',
  ADMIN_DEBIT           = 'admin_debit',
  COMMISSION_DEDUCTION  = 'commission_deduction',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: WalletOwnerType })
  ownerType: WalletOwnerType;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type: WalletTransactionType;

  // Signé : positif = crédit, négatif = débit
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number;

  @Column({ type: 'uuid', nullable: true })
  relatedRideId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdByAdminId: string | null;

  @Column({ nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
