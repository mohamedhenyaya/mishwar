import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TicketParticipantType {
  USER   = 'user',
  DRIVER = 'driver',
}

export enum TicketCategory {
  RIDE_ISSUE = 'RIDE_ISSUE',
  PAYMENT    = 'PAYMENT',
  ACCOUNT    = 'ACCOUNT',
  OTHER      = 'OTHER',
}

export enum TicketStatus {
  OPEN        = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED    = 'RESOLVED',
  CLOSED      = 'CLOSED',
}

export enum TicketPriority {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TicketParticipantType })
  requesterType: TicketParticipantType;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column()
  subject: string;

  @Column({ type: 'enum', enum: TicketCategory, default: TicketCategory.OTHER })
  category: TicketCategory;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Column({ type: 'uuid', nullable: true })
  relatedRideId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
