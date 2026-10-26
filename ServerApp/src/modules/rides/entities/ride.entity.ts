import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RideStatus {
  SCHEDULED   = 'SCHEDULED',
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

<<<<<<< HEAD
  // Trajet ouvert : pas de destination, prix au compteur (temps + distance réellement parcourue)
=======
  // Trajet ouvert : destination inconnue à la création, tarif calculé en temps réel via le compteur
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
  @Column({ default: false })
  isOpenTrip: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

<<<<<<< HEAD
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
=======
  // Tarif indicatif figé à la création pour une course classique (destination connue) — jamais recalculé
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedPrice: number | null;

  // ── Compteur temps réel (trajet ouvert uniquement) ────────────────────────
  @Column({ type: 'decimal', precision: 8, scale: 3, default: 0 })
  traveledDistanceKm: number;

  @Column({ type: 'int', default: 0 })
  stoppedSeconds: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lastMeterLatitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lastMeterLongitude: number | null;

  @Column({ type: 'timestamp', nullable: true })
  lastMeterAt: Date | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  livePrice: number | null;

  // Note donnée par le rider au driver après la course
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  ratingForDriver: number | null;

  // Note donnée par le driver au rider après la course
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  ratingForRider: number | null;

  // Course programmée pour plus tard — activée automatiquement (statut PENDING) par le sondeur de RidesService
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ nullable: true })
  couponCode: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  discountAmount: number | null;

  // 'user' | 'driver' | 'system' — qui est à l'origine de l'annulation
  @Column({ nullable: true })
  cancelledBy: string | null;

  @Column({ nullable: true })
  cancelReason: string | null;
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}