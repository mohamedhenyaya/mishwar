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
  ARRIVED     = 'ARRIVED',     // chauffeur au point de prise en charge
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  CANCELLED   = 'CANCELLED',
}

export type RideCancelledBy = 'rider' | 'driver' | 'system';

// Course attribuée à un chauffeur et pas encore terminée
export const ACTIVE_RIDE_STATUSES = [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS];

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

  // Trajet ouvert : pas de destination, prix au compteur (temps + distance réellement parcourue)
  @Column({ default: false })
  isOpenTrip: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  // Distance cumulée depuis le démarrage, à partir des positions GPS du chauffeur
  @Column({ type: 'double precision', default: 0 })
  distanceMeters: number;

  // Auteur de l'annulation : 'rider', 'driver' ou 'system' (délai dépassé / aucun chauffeur)
  @Column({ type: 'varchar', length: 10, nullable: true })
  cancelledBy: RideCancelledBy | null;

  // Note (1-5) donnée par le client au chauffeur
  @Column({ type: 'smallint', nullable: true })
  driverRating: number | null;

  // Note (1-5) donnée par le chauffeur au client
  @Column({ type: 'smallint', nullable: true })
  userRating: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}