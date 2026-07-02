import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DeviceOwnerType } from './device-token.entity';

@Entity('notification_preferences')
@Unique(['ownerType', 'ownerId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DeviceOwnerType })
  ownerType: DeviceOwnerType;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ default: true })
  rideUpdates: boolean;

  @Column({ default: true })
  promotions: boolean;

  @Column({ default: true })
  marketing: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
