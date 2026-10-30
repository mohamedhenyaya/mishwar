import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../../drivers/entities/driver.entity';

export enum FuelType {
  ESSENCE    = 'essence',
  DIESEL     = 'diesel',
  HYBRID     = 'hybrid',
  ELECTRIC   = 'electric',
}

export enum VehicleApprovalStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Un capitaine = un véhicule : créé en même temps que le capitaine (inscription ou admin),
// driverId unique. Type, modèle et plaque sont recopiés dans Driver pour le matching des courses.
@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  driverId: string;

  @Column({ type: 'enum', enum: VehicleType })
  type: VehicleType;

  @Column({ type: 'varchar', nullable: true })
  make: string | null;

  @Column()
  model: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'enum', enum: FuelType, nullable: true })
  fuelType: FuelType | null;

  @Column({ unique: true })
  plateNumber: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  capacity: number;

  @Column({ type: 'enum', enum: VehicleApprovalStatus, default: VehicleApprovalStatus.PENDING })
  status: VehicleApprovalStatus;

  @Column({ nullable: true })
  rejectedReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
