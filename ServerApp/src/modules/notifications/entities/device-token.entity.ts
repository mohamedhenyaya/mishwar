import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DeviceOwnerType {
  USER   = 'user',
  DRIVER = 'driver',
}

export enum DevicePlatform {
  IOS     = 'ios',
  ANDROID = 'android',
  WEB     = 'web',
}

@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DeviceOwnerType })
  ownerType: DeviceOwnerType;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
