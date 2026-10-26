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
}
