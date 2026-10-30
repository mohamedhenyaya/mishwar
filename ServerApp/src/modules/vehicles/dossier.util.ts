import { ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Vehicle, VehicleApprovalStatus } from './entities/vehicle.entity';
import {
  DocumentReviewStatus,
  REQUIRED_DOCUMENT_TYPES,
  VehicleDocument,
  VehicleDocumentType,
} from './entities/vehicle-document.entity';

// Dossier du capitaine = véhicule + photo de profil + pièces (REQUIRED_DOCUMENT_TYPES)

export const PROFILE_PHOTO = 'PROFILE_PHOTO';
export const IDENTITY = 'IDENTITY'; // prénom, nom et NNI
export type DossierItem = VehicleDocumentType | typeof PROFILE_PHOTO | typeof IDENTITY;

export const DOSSIER_LABELS: Record<string, string> = {
  [IDENTITY]:                             'prénom, nom et NNI',
  [PROFILE_PHOTO]:                        'photo de profil',
  [VehicleDocumentType.ID_CARD_FRONT]:      'carte d’identité (recto)',
  [VehicleDocumentType.ID_CARD_BACK]:       'carte d’identité (verso)',
  [VehicleDocumentType.TRANSPORT_PERMIT]:   'permis de transport',
  [VehicleDocumentType.REGISTRATION_FRONT]: 'carte grise (recto)',
  [VehicleDocumentType.REGISTRATION_BACK]:  'carte grise (verso)',
  [VehicleDocumentType.INSURANCE]:          'assurance',
};

// Compte approuvé : identité, photo, véhicule et pièces validées sont figés côté capitaine
// (seule l'assurance se renouvelle). Un admin peut toujours corriger.
export const LOCKED_MESSAGE = 'Votre compte a été validé : ces informations ne sont plus modifiables. Contactez le support en cas d’erreur.';

export async function assertDossierEditable(manager: EntityManager, driverId: string): Promise<Vehicle | null> {
  const vehicle = await manager.getRepository(Vehicle).findOne({ where: { driverId } });
  if (vehicle?.status === VehicleApprovalStatus.APPROVED) throw new ConflictException(LOCKED_MESSAGE);
  return vehicle;
}

// Dernier document envoyé pour chaque type (les plus anciens restent dans l'historique)
export function latestByType(documents: VehicleDocument[]): Map<VehicleDocumentType, VehicleDocument> {
  const latest = new Map<VehicleDocumentType, VehicleDocument>();
  for (const doc of [...documents].sort((a, b) => +b.createdAt - +a.createdAt)) {
    if (!latest.has(doc.type)) latest.set(doc.type, doc);
  }
  return latest;
}

// Pièces absentes ou refusées (à envoyer à nouveau)
export function missingItems(
  documents: VehicleDocument[],
  { hasIdentity, hasProfilePhoto }: { hasIdentity: boolean; hasProfilePhoto: boolean },
): DossierItem[] {
  const latest = latestByType(documents);
  const missing: DossierItem[] = [];
  if (!hasIdentity) missing.push(IDENTITY);
  if (!hasProfilePhoto) missing.push(PROFILE_PHOTO);
  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const doc = latest.get(type);
    if (!doc || doc.status === DocumentReviewStatus.REJECTED) missing.push(type);
  }
  return missing;
}

// Fin de validité de l'assurance validée par un admin (la plus lointaine), null si aucune
export async function insuranceValidUntil(manager: EntityManager, vehicleId: string): Promise<Date | null> {
  const row = await manager.getRepository(VehicleDocument)
    .createQueryBuilder('d')
    .select('MAX(d.expiresAt)', 'until')
    .where('d.vehicleId = :vehicleId AND d.type = :type AND d.status = :status', {
      vehicleId, type: VehicleDocumentType.INSURANCE, status: DocumentReviewStatus.APPROVED,
    })
    .getRawOne<{ until: Date | null }>();
  return row?.until ? new Date(row.until) : null;
}

// Les conditions suivantes attendent les alias « driver » (drivers) et « vehicle » (vehicles).

// Dossier incomplet (le capitaine doit agir) : compte non approuvé avec identité, photo ou une pièce
// requise manquante, ou dont la dernière version a été refusée
export const INCOMPLETE_SQL = `(vehicle.status <> 'APPROVED' AND (
  driver."firstName" IS NULL OR driver."lastName" IS NULL OR driver.nni IS NULL OR driver."photoUrl" IS NULL
  OR EXISTS (
    SELECT 1 FROM unnest(ARRAY[${REQUIRED_DOCUMENT_TYPES.map((t) => `'${t}'`).join(', ')}]) AS required(type)
    WHERE COALESCE((
      SELECT vd.status::text FROM vehicle_documents vd
      WHERE vd."vehicleId" = vehicle.id AND vd.type::text = required.type
      ORDER BY vd."createdAt" DESC LIMIT 1
    ), 'MISSING') IN ('MISSING', 'REJECTED')
  )
))`;

// À traiter (l'admin doit agir) : une pièce envoyée attend sa vérification (ex. nouvelle assurance),
// ou le dossier est complet mais le compte pas encore approuvé
export const TO_REVIEW_SQL = `(
  EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd."vehicleId" = vehicle.id AND vd.status = 'PENDING')
  OR (vehicle.status = 'PENDING' AND NOT ${INCOMPLETE_SQL})
)`;

// Condition SQL réutilisée (matching, contrôle horaire) : assurance validée et non expirée.
// Attend un alias de la table drivers nommé « drivers ».
export const VALID_INSURANCE_SQL = `EXISTS (
  SELECT 1 FROM vehicles v JOIN vehicle_documents vd ON vd."vehicleId" = v.id
  WHERE v."driverId" = drivers.id AND vd.type = 'INSURANCE' AND vd.status = 'APPROVED' AND vd."expiresAt" >= timezone('UTC', now())
)`;
