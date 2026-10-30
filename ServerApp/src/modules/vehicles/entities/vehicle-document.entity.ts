import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Pièces du dossier du capitaine, rattachées à son véhicule (un capitaine = un véhicule)
export enum VehicleDocumentType {
  ID_CARD_FRONT      = 'ID_CARD_FRONT',
  ID_CARD_BACK       = 'ID_CARD_BACK',
  TRANSPORT_PERMIT   = 'TRANSPORT_PERMIT',
  REGISTRATION_FRONT = 'REGISTRATION_FRONT',
  REGISTRATION_BACK  = 'REGISTRATION_BACK',
  INSURANCE          = 'INSURANCE',
  // Anciens types, conservés pour les documents déjà enregistrés
  REGISTRATION       = 'REGISTRATION',
  INSPECTION         = 'INSPECTION',
}

// Exigées pour approuver le dossier (en plus de la photo de profil du capitaine)
export const REQUIRED_DOCUMENT_TYPES = [
  VehicleDocumentType.ID_CARD_FRONT,
  VehicleDocumentType.ID_CARD_BACK,
  VehicleDocumentType.TRANSPORT_PERMIT,
  VehicleDocumentType.REGISTRATION_FRONT,
  VehicleDocumentType.REGISTRATION_BACK,
  VehicleDocumentType.INSURANCE,
];

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

  // Nom du fichier dans DOCUMENTS_DIR — jamais servi en statique, lu par les admins via
  // GET /admin/vehicles/documents/:id/file (pièces d'identité)
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
