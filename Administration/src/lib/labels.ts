import type { BadgeTone } from '@/components/ui/Badge';

type LabelMap = Record<string, { label: string; tone: BadgeTone }>;

export const RIDE_STATUS: LabelMap = {
  SCHEDULED:   { label: 'Programmée', tone: 'violet' },
  PENDING:     { label: 'En attente', tone: 'amber' },
  ACCEPTED:    { label: 'Acceptée', tone: 'blue' },
  ARRIVED:     { label: 'Chauffeur arrivé', tone: 'blue' },
  IN_PROGRESS: { label: 'En cours', tone: 'blue' },
  COMPLETED:   { label: 'Terminée', tone: 'green' },
  CANCELLED:   { label: 'Annulée', tone: 'red' },
};

export const ACTIVE_RIDE_STATUSES = ['SCHEDULED', 'PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];

export const DRIVER_STATUS: LabelMap = {
  ONLINE:  { label: 'En ligne', tone: 'green' },
  BUSY:    { label: 'En course', tone: 'blue' },
  OFFLINE: { label: 'Hors ligne', tone: 'gray' },
};

export const FUEL_TYPE: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Gazoil',
  hybrid: 'Hybride',
  electric: 'Électrique',
};

export const VEHICLE_TYPE: Record<string, string> = {
  sedan: 'Berline',
  suv: 'SUV',
  van: 'Van',
  moto: 'Moto',
};

export const RIDE_CLASS: Record<string, string> = {
  economy: 'Économique',
  comfort: 'Confort',
  premium: 'Premium',
};

export const CANCELLED_BY: Record<string, string> = {
  user: 'le client',
  driver: 'le chauffeur',
  system: 'le système',
  admin: 'un administrateur',
};

export const WALLET_TX_TYPE: LabelMap = {
  admin_credit:         { label: 'Crédit admin', tone: 'green' },
  admin_debit:          { label: 'Débit admin', tone: 'red' },
  commission_deduction: { label: 'Commission', tone: 'violet' },
};

export const WALLET_REQUEST_STATUS: LabelMap = {
  PENDING:  { label: 'À traiter', tone: 'amber' },
  APPROVED: { label: 'Approuvée', tone: 'green' },
  REJECTED: { label: 'Rejetée', tone: 'red' },
};

export const WALLET_REQUEST_TYPE: Record<string, string> = {
  TOPUP: 'Recharge',
  WITHDRAWAL: 'Retrait',
};

export const APPROVAL_STATUS: LabelMap = {
  PENDING:  { label: 'En attente', tone: 'amber' },
  APPROVED: { label: 'Approuvé', tone: 'green' },
  REJECTED: { label: 'Rejeté', tone: 'red' },
};

// Statut du dossier d'un capitaine (liste des capitaines)
export const DOSSIER_STATUS: LabelMap = {
  PENDING:  { label: 'En attente d’approbation', tone: 'amber' },
  APPROVED: { label: 'Compte approuvé', tone: 'green' },
  REJECTED: { label: 'Dossier refusé', tone: 'red' },
};

export const DOCUMENT_TYPE: Record<string, string> = {
  IDENTITY: 'Prénom, nom et NNI',
  PROFILE_PHOTO: 'Photo de profil',
  ID_CARD_FRONT: 'Carte d’identité (recto)',
  ID_CARD_BACK: 'Carte d’identité (verso)',
  TRANSPORT_PERMIT: 'Permis de transport',
  REGISTRATION_FRONT: 'Carte grise (recto)',
  REGISTRATION_BACK: 'Carte grise (verso)',
  INSURANCE: 'Assurance',
  REGISTRATION: 'Carte grise',
  INSPECTION: 'Contrôle technique',
};

export const TICKET_STATUS: LabelMap = {
  OPEN:        { label: 'Ouvert', tone: 'amber' },
  IN_PROGRESS: { label: 'En cours', tone: 'blue' },
  RESOLVED:    { label: 'Résolu', tone: 'green' },
  CLOSED:      { label: 'Fermé', tone: 'gray' },
};

export const TICKET_PRIORITY: LabelMap = {
  LOW:    { label: 'Basse', tone: 'gray' },
  MEDIUM: { label: 'Moyenne', tone: 'amber' },
  HIGH:   { label: 'Haute', tone: 'red' },
};

export const TICKET_CATEGORY: Record<string, string> = {
  RIDE_ISSUE: 'Problème de course',
  PAYMENT: 'Paiement',
  ACCOUNT: 'Compte',
  OTHER: 'Autre',
};

export const OWNER_TYPE: Record<string, string> = {
  user: 'Client',
  driver: 'Capitaine',
};

// Libellés lisibles du journal d'audit
export const AUDIT_ACTION: Record<string, string> = {
  'user.create': 'Création d\'un client',
  'user.createAdmin': 'Création d\'un administrateur',
  'user.update': 'Modification d\'un compte',
  'user.block': 'Blocage d\'un compte',
  'user.unblock': 'Déblocage d\'un compte',
  'user.resetPassword': 'Réinitialisation du mot de passe',
  'user.changeOwnPassword': 'Changement de son mot de passe',
  'user.delete': 'Suppression d\'un compte',
  'driver.create': 'Création d\'un capitaine',
  'driver.update': 'Modification d\'un capitaine',
  'driver.block': 'Blocage d\'un capitaine',
  'driver.unblock': 'Déblocage d\'un capitaine',
  'driver.resetPassword': 'Mot de passe capitaine réinitialisé',
  'driver.delete': 'Suppression d\'un capitaine',
  'wallet.adjust': 'Ajustement de solde',
  'wallet.request.approve': 'Demande wallet approuvée',
  'wallet.request.reject': 'Demande wallet rejetée',
  'ride.cancel': 'Annulation d\'une course',
  'review.hide': 'Avis masqué',
  'review.unhide': 'Avis réaffiché',
  'settings.update': 'Paramètres tarifaires modifiés',
  'coupon.create': 'Création d\'un coupon',
  'coupon.update': 'Modification d\'un coupon',
  'coupon.deactivate': 'Désactivation d\'un coupon',
  'vehicle.approve': 'Véhicule approuvé',
  'vehicle.reject': 'Véhicule rejeté',
  'vehicle.document.review': 'Document véhicule examiné',
  'support.ticket.updateStatus': 'Ticket support mis à jour',
};

export const AUDIT_ACTION_GROUPS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'user.', label: 'Comptes clients / admins' },
  { value: 'driver.', label: 'Capitaines' },
  { value: 'wallet.', label: 'Portefeuilles' },
  { value: 'ride.', label: 'Courses' },
  { value: 'vehicle.', label: 'Véhicules' },
  { value: 'coupon.', label: 'Coupons' },
  { value: 'review.', label: 'Avis' },
  { value: 'support.', label: 'Support' },
  { value: 'settings.', label: 'Paramètres' },
];
