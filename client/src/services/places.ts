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
