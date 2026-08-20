import { FishSpeciesInfo, Season } from '@/types';
import { FISH_SPECIES_INFO } from '@/data/fishInfo';
import { WeatherSnapshot } from '@/lib/weather';

export type LikelihoodLabel = 'ÇOK YÜKSEK' | 'YÜKSEK' | 'ORTA' | 'DÜŞÜK';

export interface SpeciesLikelihood {
  species: string;
  percent: number;
  label: LikelihoodLabel;
  photoUrl: string;
  tip: string;
  bestTime: string;
  bestSeason: string;
  habitat: string;
}

const SEASON_ORDER: Season[] = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];

function seasonAdjacent(a: Season, b: Season): boolean {
  const ia = SEASON_ORDER.indexOf(a);
  const ib = SEASON_ORDER.indexOf(b);
  const diff = Math.abs(ia - ib);
  return diff === 1 || diff === 3;
}

function seasonMatchScore(bestSeason: string, currentSeason: Season): number {
  if (bestSeason.includes(currentSeason)) return 95;
  const mentioned = SEASON_ORDER.filter((s) => bestSeason.includes(s));
  if (mentioned.some((s) => seasonAdjacent(s, currentSeason))) return 62;
  return 34;
}

function timeMatchScore(bestTime: string, hour: number): number {
  const isNight = hour >= 21 || hour < 6;
  const isDawnDusk = (hour >= 5 && hour < 8) || (hour >= 18 && hour < 21);
  const isMorning = hour >= 6 && hour < 11;
  const isMidday = hour >= 11 && hour < 17;

  const keywords: { match: (t: string) => boolean; active: boolean }[] = [
    { match: (t) => t.includes('gece'), active: isNight },
    { match: (t) => t.includes('alacakaranlık'), active: isDawnDusk },
    { match: (t) => t.includes('gün doğumu'), active: hour >= 5 && hour < 8 },
    { match: (t) => t.includes('gün batımı'), active: hour >= 18 && hour < 21 },
    { match: (t) => t.includes('sabah'), active: isMorning },
    { match: (t) => t.includes('öğle') || t.includes('gündüz'), active: isMidday },
    { match: (t) => t.includes('akşam'), active: isDawnDusk },
  ];

  const relevant = keywords.filter((k) => k.match(bestTime.toLowerCase()));
  if (relevant.length === 0) return 55;
  const hit = relevant.some((k) => k.active);
  return hit ? 92 : 38;
}

function weatherMatchScore(weatherPreference: string, weather: WeatherSnapshot | null): number {
  if (!weather) return 55;
  const pref = weatherPreference.toLowerCase();
  const temp = weather.temp;
  const wind = weather.windSpeed ?? 12;
  const wave = weather.waveHeight ?? 0.7;
  const cloud = weather.cloudCover ?? 40;

  const checks: { keyword: string; hit: boolean }[] = [
    { keyword: 'sıcak', hit: temp >= 22 },
    { keyword: 'ılık', hit: temp >= 15 && temp <= 25 },
    { keyword: 'ılıman', hit: temp >= 14 && temp <= 24 },
    { keyword: 'serin', hit: temp <= 17 },
    { keyword: 'soğuk', hit: temp <= 13 },
    { keyword: 'durgun', hit: wind <= 12 && wave <= 0.6 },
    { keyword: 'sakin', hit: wind <= 12 && wave <= 0.6 },
    { keyword: 'dalgalı', hit: wave >= 0.8 },
    { keyword: 'rüzgarlı', hit: wind >= 18 },
    { keyword: 'hafif rüzgarlı', hit: wind >= 6 && wind <= 18 },
    { keyword: 'bulutlu', hit: cloud >= 45 },
    { keyword: 'güneşli', hit: cloud <= 30 },
    { keyword: 'açık', hit: cloud <= 25 },
    { keyword: 'berrak', hit: cloud <= 35 && wave <= 0.7 },
  ];

  const relevant = checks.filter((c) => pref.includes(c.keyword));
  if (relevant.length === 0) return 55;
  const hits = relevant.filter((c) => c.hit).length;
  return Math.round((hits / relevant.length) * 100);
}

/** Small deterministic per-day variation so rankings don't feel static, without needing real randomness. */
function dailyJitter(species: string, dateSeed: string): number {
  const str = species + dateSeed;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 9) - 4; // -4..+4
}

function labelFromPercent(percent: number): LikelihoodLabel {
  if (percent >= 80) return 'ÇOK YÜKSEK';
  if (percent >= 65) return 'YÜKSEK';
  if (percent >= 45) return 'ORTA';
  return 'DÜŞÜK';
}

export interface SpeciesLikelihoodInput {
  weather: WeatherSnapshot | null;
  season: Season;
  now?: Date;
  pool?: FishSpeciesInfo[];
}

export function computeSpeciesLikelihood({
  weather,
  season,
  now = new Date(),
  pool = FISH_SPECIES_INFO,
}: SpeciesLikelihoodInput): SpeciesLikelihood[] {
  const hour = now.getHours();
  const dateSeed = now.toISOString().slice(0, 10);

  const scored = pool.map((fish) => {
    const seasonScore = seasonMatchScore(fish.bestSeason, season);
    const timeScore = timeMatchScore(fish.bestTime, hour);
    const weatherScore = weatherMatchScore(fish.weatherPreference, weather);

    const combined = seasonScore * 0.4 + timeScore * 0.25 + weatherScore * 0.35;
    const jitter = dailyJitter(fish.species, dateSeed);
    const percent = Math.max(8, Math.min(97, Math.round(combined + jitter)));

    return {
      species: fish.species,
      percent,
      label: labelFromPercent(percent),
      photoUrl: fish.photoUrl,
      tip: fish.tip,
      bestTime: fish.bestTime,
      bestSeason: fish.bestSeason,
      habitat: fish.habitat,
    };
  });

  return scored.sort((a, b) => b.percent - a.percent);
}
