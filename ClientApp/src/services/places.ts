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
