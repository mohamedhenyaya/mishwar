import { Alert, Linking, Platform } from 'react-native';
import { Coordinates } from '../types';

// Liens universels (https) : ouvrent l'app si elle est installée, sinon le navigateur.
// Aucun schéma à déclarer dans Info.plist, contrairement à comgooglemaps:// ou waze://.
const PROVIDERS = [
  ...(Platform.OS === 'ios'
    ? [{ label: 'Plans', url: (c: Coordinates) => `https://maps.apple.com/?daddr=${c.latitude},${c.longitude}&dirflg=d` }]
    : []),
  { label: 'Google Maps', url: (c: Coordinates) => `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}&travelmode=driving` },
  { label: 'Waze',        url: (c: Coordinates) => `https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes` },
];

// Demande au chauffeur quelle application de navigation utiliser puis lance l'itinéraire
export function openDirections(target: Coordinates, title: string): void {
  const open = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert('Navigation impossible', 'Aucune application de navigation disponible.'));

  Alert.alert(title, 'Ouvrir l\'itinéraire avec :', [
    ...PROVIDERS.map((p) => ({ text: p.label, onPress: () => open(p.url(target)) })),
    { text: 'Annuler', style: 'cancel' as const },
  ]);
}
