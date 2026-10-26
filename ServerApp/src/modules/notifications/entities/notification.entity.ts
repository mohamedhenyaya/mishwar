import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationRecipientType {
  USER   = 'user',
  DRIVER = 'driver',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationRecipientType })
  recipientType: NotificationRecipientType;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdByAdminId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
