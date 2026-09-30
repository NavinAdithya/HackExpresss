import api from './api';

export interface PlaceSuggestion {
  place_id: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(input: string): Promise<PlaceSuggestion[]> {
  if (!input || input.trim().length < 2) return [];

  try {
    const res = await api.get(`/places/autocomplete?input=${encodeURIComponent(input.trim())}`);
    return res.data.suggestions || [];
  } catch (err) {
    console.warn('[PLACES] Autocomplete error:', err);
    return [];
  }
}

export const CHENNAI_AREAS = [
  { name: 'Guindy', lat: 13.0067, lng: 80.2206 },
  { name: 'Velachery', lat: 12.9815, lng: 80.2180 },
  { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'OMR Sholinganallur', lat: 12.9010, lng: 80.2279 },
  { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
  { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
  { name: 'Porur', lat: 13.0382, lng: 80.1565 },
  { name: 'Ramapuram', lat: 13.0327, lng: 80.1800 },
];

/** Human-readable label for a device location (nearest known Chennai area). */
export function nearestAreaName(lat: number, lng: number): string {
  let best = CHENNAI_AREAS[0];
  let min = Infinity;
  for (const a of CHENNAI_AREAS) {
    const d = Math.hypot(a.lat - lat, a.lng - lng);
    if (d < min) { min = d; best = a; }
  }
  return `Near ${best.name}`;
}
