import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum VehicleDocumentType {
  REGISTRATION = 'REGISTRATION',
  INSURANCE    = 'INSURANCE',
  INSPECTION   = 'INSPECTION',
}

export enum DocumentReviewStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('vehicle_documents')
export class VehicleDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  vehicleId: string;

  @Column({ type: 'enum', enum: VehicleDocumentType })
  type: VehicleDocumentType;

  // URL fournie par le client — aucune bibliothèque d'upload/stockage dans ce projet
  @Column()
  fileUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'enum', enum: DocumentReviewStatus, default: DocumentReviewStatus.PENDING })
  status: DocumentReviewStatus;

  @Column({ nullable: true })
  reviewNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
