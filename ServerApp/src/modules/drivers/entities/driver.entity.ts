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

  // Identité du dossier (vérifiée avec la carte d'identité) — name reste le nom affiché au client
  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  // Numéro national d'identification, unique (libéré à la suppression du compte)
  @Column({ type: 'varchar', nullable: true, unique: true })
  nni: string | null;

  // Chemin relatif servi en statique, ex. /uploads/xxx.jpg
  @Column({ nullable: true })
  photoUrl: string;

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

  // Nombre de notes reçues — nécessaire pour calculer une vraie moyenne glissante
  @Column({ default: 0 })
  ratingCount: number;

  @Column({ default: 0 })
  totalRides: number;

  // Token push (FCM/APNs) — stocké en préparation d'une future intégration, rien ne l'envoie encore
  @Column({ nullable: true })
  deviceToken: string | null;

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

  // Fin d'un blocage temporaire (null = définitif) — réactivation automatique à l'échéance
  @Column({ type: 'timestamp', nullable: true })
  blockedUntil: Date | null;

  // Suppression par un admin : le compte est anonymisé (pas effacé) pour garder l'historique cohérent
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // Solde de crédit prépayé — la commission de chaque course terminée y est automatiquement déduite
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}