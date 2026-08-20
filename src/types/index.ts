export type Season = 'İlkbahar' | 'Yaz' | 'Sonbahar' | 'Kış';

export type FishingMethod = 'olta' | 'ag' | 'zipkin';

export const FISHING_METHOD_LABELS: Record<FishingMethod, string> = {
  olta: 'Olta',
  ag: 'Ağ',
  zipkin: 'Zıpkın',
};

export type WaterVisibility = 'Berrak' | 'Orta' | 'Bulanık';
export const WATER_VISIBILITY_OPTIONS: WaterVisibility[] = ['Berrak', 'Orta', 'Bulanık'];

export type TidalCurrent = 'Yok' | 'Zayıf' | 'Orta' | 'Güçlü';
export const TIDAL_CURRENT_OPTIONS: TidalCurrent[] = ['Yok', 'Zayıf', 'Orta', 'Güçlü'];

export const TIDAL_DIRECTION_OPTIONS = [
  'Kuzey',
  'Kuzeydoğu',
  'Doğu',
  'Güneydoğu',
  'Güney',
  'Güneybatı',
  'Batı',
  'Kuzeybatı',
];

export interface Catch {
  id: string;
  fish_name: string;
  species: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  catch_date: string;
  weather_temp: number | null;
  weather_condition: string | null;
  season: Season | string | null;
  fishing_method: FishingMethod | null;
  tackle: string | null;
  bait: string | null;
  net_type: string | null;
  total_weight: number | null;
  water_temp: number | null;
  water_visibility: WaterVisibility | string | null;
  tidal_current: TidalCurrent | string | null;
  tidal_direction: string | null;
  catch_time: string | null;
  cloud_cover: number | null;
  depth_m: number | null;
  notes: string | null;
  created_at: string;
}

export type NewCatch = Omit<Catch, 'id' | 'created_at'>;

export interface CatchFish {
  id: string;
  catch_id: string;
  fish_name: string;
  species: string | null;
  weight_kg: number | null;
  created_at: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface FishSpeciesInfo {
  species: string;
  bestTime: string;
  bestSeason: string;
  habitat: string;
  weatherPreference: string;
  tip: string;
  funFact: string;
  photoUrl: string;
}

export interface CustomSpecies {
  id: string;
  name: string;
  tip: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface ResolvedSpeciesInfo {
  source: 'builtin' | 'custom';
  species: string;
  tip: string;
  photoUrl: string | null;
  bestTime?: string;
  bestSeason?: string;
  habitat?: string;
  weatherPreference?: string;
  funFact?: string;
}
