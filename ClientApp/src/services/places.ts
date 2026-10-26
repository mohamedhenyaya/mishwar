/**
 * Autocomplétion d'adresses via Photon (OpenStreetMap) — gratuit, sans clé API.
 * https://photon.komoot.io — usage raisonnable : requêtes débouncées, pas de spam.
 */

const PHOTON_URL = 'https://photon.komoot.io/api/';

export interface PlaceSuggestion {
  id:        string;
  label:     string;
  sub:       string;
  latitude:  number;
  longitude: number;
}

interface PhotonFeature {
  properties: {
    osm_type: string;
    osm_id:   number;
    name?:    string;
    street?:  string;
    housenumber?: string;
    district?: string;
    city?:    string;
    state?:   string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
}

export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'fr' });
  // Favorise les résultats proches de la position du client
  if (near) {
    params.set('lat', String(near.latitude));
    params.set('lon', String(near.longitude));
  }

  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data: { features: PhotonFeature[] } = await res.json();

  return data.features.map(({ properties: p, geometry }) => {
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    return {
      id:        `${p.osm_type}${p.osm_id}`,
      label:     p.name || street || p.city || query,
      sub:       [p.name ? street : null, p.district, p.city, p.country].filter(Boolean).join(', '),
      latitude:  geometry.coordinates[1],
      longitude: geometry.coordinates[0],
    };
  });
}
