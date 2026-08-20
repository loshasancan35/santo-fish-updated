import { CustomSpecies, ResolvedSpeciesInfo } from '@/types';
import { findFishInfo, FISH_SPECIES_NAMES } from '@/data/fishInfo';

export function resolveSpeciesInfo(
  species: string | null | undefined,
  customSpecies: CustomSpecies[]
): ResolvedSpeciesInfo | undefined {
  if (!species) return undefined;
  const trimmed = species.trim();
  const builtin = findFishInfo(trimmed);
  if (builtin) {
    return {
      source: 'builtin',
      species: builtin.species,
      tip: builtin.tip,
      photoUrl: builtin.photoUrl,
      bestTime: builtin.bestTime,
      bestSeason: builtin.bestSeason,
      habitat: builtin.habitat,
      weatherPreference: builtin.weatherPreference,
      funFact: builtin.funFact,
    };
  }
  const custom = customSpecies.find(
    (s) => s.name.toLocaleLowerCase('tr-TR') === trimmed.toLocaleLowerCase('tr-TR')
  );
  if (custom) {
    return {
      source: 'custom',
      species: custom.name,
      tip: custom.tip || `${custom.name} için henüz bir ipucu eklenmemiş.`,
      photoUrl: custom.photo_url,
    };
  }
  return undefined;
}

export function allSpeciesNames(customSpecies: CustomSpecies[]): string[] {
  const customNames = customSpecies.map((s) => s.name);
  return [...FISH_SPECIES_NAMES, ...customNames].sort((a, b) => a.localeCompare(b, 'tr'));
}
