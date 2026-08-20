import { FISH_SPECIES_INFO } from '@/data/fishInfo';
import { FishSpeciesInfo } from '@/types';
import { seasonFromDate } from '@/lib/season';

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function fishTipOfTheDay(date: Date = new Date()): FishSpeciesInfo {
  const season = seasonFromDate(date);
  const seasonMatches = FISH_SPECIES_INFO.filter((f) => f.bestSeason.includes(season));
  const pool = seasonMatches.length > 0 ? seasonMatches : FISH_SPECIES_INFO;
  const index = dayOfYear(date) % pool.length;
  return pool[index];
}
