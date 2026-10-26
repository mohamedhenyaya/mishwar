import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum MessageSenderType {
  USER   = 'user',
  DRIVER = 'driver',
  ADMIN  = 'admin',
}

@Entity('support_ticket_messages')
export class SupportTicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @Column({ type: 'enum', enum: MessageSenderType })
  senderType: MessageSenderType;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
