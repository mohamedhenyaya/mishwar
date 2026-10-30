import { Alert, Linking, Platform } from 'react-native';
import { Coordinates } from '../types';
import { tr } from '../i18n/LanguageContext';

// Liens universels (https) : ouvrent l'app si elle est installée, sinon le navigateur.
// Aucun schéma à déclarer dans Info.plist, contrairement à comgooglemaps:// ou waze://.
// Libellés calculés à l'appel : ils suivent la langue choisie.
const providers = () => [
  ...(Platform.OS === 'ios'
    ? [{ label: tr('directionsAppleMaps'), url: (c: Coordinates) => `https://maps.apple.com/?daddr=${c.latitude},${c.longitude}&dirflg=d` }]
    : []),
  { label: 'Google Maps', url: (c: Coordinates) => `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}&travelmode=driving` },
  { label: 'Waze',        url: (c: Coordinates) => `https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes` },
];

// Demande au chauffeur quelle application de navigation utiliser puis lance l'itinéraire
export function openDirections(target: Coordinates, title: string): void {
  const open = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert(tr('directionsFailedTitle'), tr('directionsFailedMessage')));

  Alert.alert(title, tr('directionsOpenWith'), [
    ...providers().map((p) => ({ text: p.label, onPress: () => open(p.url(target)) })),
    { text: tr('commonCancel'), style: 'cancel' as const },
  ]);
}
