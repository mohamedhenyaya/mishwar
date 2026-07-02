import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VehicleType } from '../../drivers/entities/driver.entity';

export enum VehicleApprovalStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  driverId: string;

  @Column({ type: 'enum', enum: VehicleType })
  type: VehicleType;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ unique: true })
  plateNumber: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  capacity: number;

  @Column({ type: 'enum', enum: VehicleApprovalStatus, default: VehicleApprovalStatus.PENDING })
  status: VehicleApprovalStatus;

  // Le seul véhicule actuellement utilisé par ce chauffeur
  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  rejectedReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
