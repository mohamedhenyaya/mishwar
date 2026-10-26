<<<<<<< HEAD
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
=======
import { apiGet } from './api';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export async function searchPlaces(
  input: string,
  lat?: number,
  lng?: number,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ input });
  if (lat != null) params.set('lat', String(lat));
  if (lng != null) params.set('lng', String(lng));
  return apiGet<PlaceSuggestion[]>(`/places/autocomplete?${params.toString()}`);
}

export interface PlaceDetails {
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  return apiGet<PlaceDetails | null>(`/places/details?placeId=${encodeURIComponent(placeId)}`);
>>>>>>> 0d66f1bbdace3333ddbfb43b3718538b62c6bfba
}
