import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DriverStatus {
  ONLINE  = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY    = 'BUSY',
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV   = 'suv',
  VAN   = 'van',
  MOTO  = 'moto',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.OFFLINE })
  status: DriverStatus;

  @Column({ type: 'enum', enum: VehicleType, default: VehicleType.SEDAN })
  vehicleType: VehicleType;

  @Column({ nullable: true })
  vehicleModel: string;

  @Column({ nullable: true })
  vehiclePlate: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ default: 0 })
  totalRides: number;

  // Coordonnées GPS stockées en colonnes séparées (compatible PostgreSQL standard)
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastLocationUpdate: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  blockedReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  blockedAt: Date | null;

  // Solde de crédit prépayé — la commission de chaque course terminée y est automatiquement déduite
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}