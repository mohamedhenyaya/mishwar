import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WalletOwnerType } from './wallet-transaction.entity';

export enum WalletRequestType {
  TOPUP      = 'TOPUP',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum WalletRequestStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('wallet_requests')
export class WalletRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: WalletOwnerType })
  ownerType: WalletOwnerType;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'enum', enum: WalletRequestType })
  type: WalletRequestType;

  // Toujours un montant positif, quel que soit le type
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  method: string;

  @Column({ nullable: true })
  reference: string | null;

  @Column({ type: 'enum', enum: WalletRequestStatus, default: WalletRequestStatus.PENDING })
  status: WalletRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedByAdminId: string | null;

  @Column({ nullable: true })
  reviewNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;
}
