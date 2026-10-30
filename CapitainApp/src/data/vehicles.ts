// Marques et modèles proposés à l'inscription du capitaine. « Autre » permet de saisir
// une marque ou un modèle absent de la liste (valeur interne, affichée via t('commonOther')).
export const OTHER = 'Autre';

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

// Même borne que le serveur (RegisterVerifyDto)
export const MIN_VEHICLE_YEAR = 1990;

export type FuelType = 'essence' | 'diesel' | 'hybrid' | 'electric';

// Libellés traduits : t('fuelTypes')
export const FUEL_TYPES: FuelType[] = ['essence', 'diesel', 'hybrid', 'electric'];

// ── Immatriculation « 1234 AB 12 » ─────────────────────────────────────────────

export const PLATE_PLACEHOLDER = '1234 AB 12';

// Met en forme pendant la saisie : 4 chiffres, 2 lettres, 2 chiffres, séparés par des espaces
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

export function isValidPlate(plate: string): boolean {
  return /^\d{4} [A-Z]{2} \d{2}$/.test(plate);
}
