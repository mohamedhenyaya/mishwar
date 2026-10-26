import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ReviewParticipantType {
  USER = 'user',
  DRIVER = 'driver',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rideId: string;

  @Column({ type: 'enum', enum: ReviewParticipantType })
  raterType: ReviewParticipantType;

  @Column({ type: 'uuid' })
  raterId: string;

  @Column({ type: 'enum', enum: ReviewParticipantType })
  targetType: ReviewParticipantType;

  @Column({ type: 'uuid' })
  targetId: string;

  @Column({ type: 'int' })
  stars: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // Masqué par un admin (modération) — n'apparaît plus dans les listes publiques
  @Column({ default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
