import * as SecureStore from './secureStorage';

export interface PlaceHistoryEntry {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type PlaceField = 'origin' | 'destination';

const MAX_ENTRIES = 6;
const keyFor = (field: PlaceField) => `itinerary_history_${field}`;

export async function getPlaceHistory(field: PlaceField): Promise<PlaceHistoryEntry[]> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(field));
    if (!raw) return [];
    return JSON.parse(raw) as PlaceHistoryEntry[];
  } catch {
    return [];
  }
}

export async function addPlaceToHistory(field: PlaceField, entry: PlaceHistoryEntry): Promise<void> {
  const current = await getPlaceHistory(field);
  const deduped = current.filter((e) => e.label !== entry.label || e.address !== entry.address);
  const next = [entry, ...deduped].slice(0, MAX_ENTRIES);
  try {
    await SecureStore.setItemAsync(keyFor(field), JSON.stringify(next));
  } catch { /* stockage indisponible — silencieux */ }
}
