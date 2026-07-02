import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RideStatus {
  PENDING     = 'PENDING',
  ACCEPTED    = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  CANCELLED   = 'CANCELLED',
}

// Classe de réservation choisie par le client (distincte du type physique du véhicule du chauffeur)
export enum RideVehicleClass {
  ECONOMY = 'economy',
  COMFORT = 'comfort',
  PREMIUM = 'premium',
}

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  startLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  startLongitude: number;

  @Column({ nullable: true })
  destinationName: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  endLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  endLongitude: number | null;

  @Column({
    type: 'enum',
    enum: RideVehicleClass,
    default: RideVehicleClass.ECONOMY,
  })
  vehicleType: RideVehicleClass;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.PENDING,
  })
  status: RideStatus;

  // Chauffeurs notifiés pour cette course (ride:new envoyé)
  @Column('uuid', { array: true, default: '{}' })
  notifiedDriverIds: string[];

  // Chauffeurs ayant refusé cette course
  @Column('uuid', { array: true, default: '{}' })
  rejectedDriverIds: string[];

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  price: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}