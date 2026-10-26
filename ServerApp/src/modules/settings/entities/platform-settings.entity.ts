import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Table à une seule ligne — configuration tarifaire globale de la plateforme
@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 30 })
  pricePerKm: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 100 })
  minimumFare: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  commissionPercent: number;

  // Trajet ouvert : prix ajouté par minute d'arrêt pendant la course (compteur temps réel)
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 5 })
  perStopMinuteRate: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
