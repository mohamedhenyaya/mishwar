// Dossier du capitaine : photo de profil + pièces vérifiées par un admin avant le passage en ligne.
// Les clés correspondent aux types du serveur (VehicleDocumentType), PROFILE_PHOTO à part.
export type DocumentType =
  | 'ID_CARD_FRONT' | 'ID_CARD_BACK' | 'TRANSPORT_PERMIT'
  | 'REGISTRATION_FRONT' | 'REGISTRATION_BACK' | 'INSURANCE';
export type DossierItem = 'IDENTITY' | 'PROFILE_PHOTO' | DocumentType;

// Pièces en photo (l'identité, IDENTITY, est saisie à part).
// Libellés et consignes traduits : t('dossierLabels') / t('dossierHints').
export const DOSSIER_ITEMS: Exclude<DossierItem, 'IDENTITY'>[] = [
  'PROFILE_PHOTO', 'ID_CARD_FRONT', 'ID_CARD_BACK', 'TRANSPORT_PERMIT',
  'REGISTRATION_FRONT', 'REGISTRATION_BACK', 'INSURANCE',
];

// NNI mauritanien : 10 chiffres (même règle que le serveur)
export const isValidNni = (nni: string): boolean => /^\d{10}$/.test(nni);

// ── Date de fin d'assurance saisie « JJ/MM/AAAA » (t('commonDatePlaceholder')) ──

// Met en forme pendant la saisie : 31122027 → 31/12/2027
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

// « JJ/MM/AAAA » valide et à venir → « AAAA-MM-JJ » (format attendu par le serveur), sinon null
export function futureDateToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Date.UTC(+yyyy, +mm - 1, +dd, 23, 59, 59));
  if (date.getUTCDate() !== +dd || date.getUTCMonth() !== +mm - 1) return null; // ex. 31/02
  return date > new Date() ? `${yyyy}-${mm}-${dd}` : null;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}
