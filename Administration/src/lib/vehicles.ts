// Mêmes listes et règles que l'inscription dans l'application Capitaine (CapitainApp/src/data/vehicles.ts)
export const VEHICLE_MAKES: Record<string, string[]> = {
  Toyota:          ['Corolla', 'Yaris', 'Camry', 'Avensis', 'Auris', 'Prius', 'RAV4', 'Hilux', 'Land Cruiser', 'Prado', 'Fortuner'],
  Hyundai:         ['i10', 'Accent', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta'],
  Kia:             ['Picanto', 'Rio', 'Cerato', 'Optima', 'Sportage', 'Sorento'],
  'Mercedes-Benz': ['190', 'Classe C', 'Classe E', 'Classe S', 'Vito', 'Sprinter'],
  Nissan:          ['Sunny', 'Almera', 'Micra', 'Qashqai', 'X-Trail', 'Patrol', 'Navara'],
  Peugeot:         ['206', '301', '307', '308', '406', '508', '3008', 'Partner'],
  Renault:         ['Logan', 'Symbol', 'Clio', 'Megane', 'Duster', 'Kangoo'],
  Dacia:           ['Logan', 'Sandero', 'Duster', 'Lodgy'],
  Suzuki:          ['Alto', 'Swift', 'Dzire', 'Celerio', 'Vitara'],
  Honda:           ['Civic', 'Accord', 'City', 'CR-V'],
  Volkswagen:      ['Polo', 'Golf', 'Jetta', 'Passat', 'Touareg'],
  Mitsubishi:      ['Lancer', 'Pajero', 'L200', 'Outlander'],
  Ford:            ['Fiesta', 'Focus', 'Ranger', 'Explorer'],
  Chevrolet:       ['Spark', 'Aveo', 'Cruze', 'Captiva'],
};

export const MIN_VEHICLE_YEAR = 1990;

// Immatriculation « 1234 AB 12 » : 4 chiffres, 2 lettres, 2 chiffres, mise en forme pendant la saisie
export function formatPlate(raw: string): string {
  const chars = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const parts = ['', '', ''];
  for (const ch of chars) {
    const isDigit = /\d/.test(ch);
    if (!parts[1] && parts[0].length < 4 && isDigit) parts[0] += ch;
    else if (parts[0].length === 4 && !parts[2] && parts[1].length < 2 && !isDigit) parts[1] += ch;
    else if (parts[1].length === 2 && parts[2].length < 2 && isDigit) parts[2] += ch;
  }
  return parts.filter(Boolean).join(' ');
}

export const isValidPlate = (plate: string): boolean => /^\d{4} [A-Z]{2} \d{2}$/.test(plate);
export const isValidNni = (nni: string): boolean => /^\d{10}$/.test(nni);

// Pièces du dossier, dans l'ordre de l'application (clé = type du serveur, PROFILE_PHOTO à part)
export const DOSSIER_PIECES = [
  { key: 'PROFILE_PHOTO',      label: 'Photo de profil',          hint: 'Visage bien visible, de face' },
  { key: 'ID_CARD_FRONT',      label: 'Carte d’identité — recto', hint: 'Carte entière, texte lisible' },
  { key: 'ID_CARD_BACK',       label: 'Carte d’identité — verso', hint: 'Carte entière, texte lisible' },
  { key: 'TRANSPORT_PERMIT',   label: 'Permis de transport',      hint: 'Document entier et lisible' },
  { key: 'REGISTRATION_FRONT', label: 'Carte grise — recto',      hint: 'Carte entière, texte lisible' },
  { key: 'REGISTRATION_BACK',  label: 'Carte grise — verso',      hint: 'Carte entière, texte lisible' },
  { key: 'INSURANCE',          label: 'Assurance',                hint: 'Attestation en cours, date de fin visible' },
] as const;
export type DossierPiece = (typeof DOSSIER_PIECES)[number]['key'];
