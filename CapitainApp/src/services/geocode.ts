import * as Location from 'expo-location';

// Adresse lisible d'un point (géocodeur du téléphone), gardée en mémoire : le serveur ne stocke
// que les coordonnées du point de départ d'une course.
const cache = new Map<string, Promise<string | null>>();

export function placeName(latitude: number, longitude: number): Promise<string | null> {
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = Location.reverseGeocodeAsync({ latitude, longitude })
      .then(([a]) => {
        if (!a) return null;
        const parts = [a.name ?? a.street, a.district ?? a.city].filter((p): p is string => !!p);
        return [...new Set(parts)].join(', ') || null;
      })
      .catch(() => {
        cache.delete(key); // réessayé au prochain affichage
        return null;
      });
    cache.set(key, pending);
  }
  return pending;
}
