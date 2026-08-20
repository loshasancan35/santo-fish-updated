import { Catch, Season } from '@/types';

export interface SpeciesCount {
  name: string;
  count: number;
}

export interface MonthCount {
  month: string;
  count: number;
}

export interface SeasonCount {
  season: string;
  count: number;
}

export interface StatsSummary {
  totalCatches: number;
  totalWeight: number;
  topSpecies: string | null;
  favoriteLocation: string | null;
}

const MONTH_LABELS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

function key(name: string | null | undefined): string {
  return (name ?? '').trim() || 'Bilinmiyor';
}

export function computeSummary(catches: Catch[]): StatsSummary {
  const totalCatches = catches.length;
  const totalWeight = catches.reduce((sum, c) => sum + (c.total_weight ?? 0), 0);

  const speciesCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();

  for (const c of catches) {
    const s = key(c.species || c.fish_name);
    speciesCounts.set(s, (speciesCounts.get(s) ?? 0) + 1);
    if (c.location_name) {
      const loc = c.location_name.trim();
      if (loc) locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
    }
  }

  let topSpecies: string | null = null;
  let maxSpecies = 0;
  for (const [name, count] of speciesCounts) {
    if (count > maxSpecies) {
      maxSpecies = count;
      topSpecies = name;
    }
  }

  let favoriteLocation: string | null = null;
  let maxLoc = 0;
  for (const [name, count] of locationCounts) {
    if (count > maxLoc) {
      maxLoc = count;
      favoriteLocation = name;
    }
  }

  return { totalCatches, totalWeight, topSpecies, favoriteLocation };
}

export function topSpecies(catches: Catch[], limit = 8): SpeciesCount[] {
  const counts = new Map<string, number>();
  for (const c of catches) {
    const name = key(c.species || c.fish_name);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function catchesPerMonth(catches: Catch[], lastN = 12): MonthCount[] {
  const now = new Date();
  const buckets: { key: string; label: string; count: number }[] = [];
  for (let i = lastN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({ key: k, label: `${MONTH_LABELS_TR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, count: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const c of catches) {
    const d = new Date(`${c.catch_date}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const i = index.get(k);
    if (i != null) buckets[i].count += 1;
  }
  return buckets.map((b) => ({ month: b.label, count: b.count }));
}

export function distributionBySeason(catches: Catch[]): SeasonCount[] {
  const order: Season[] = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];
  const counts = new Map<string, number>();
  for (const s of order) counts.set(s, 0);
  for (const c of catches) {
    const season = (c.season ?? 'Bilinmiyor').toString();
    counts.set(season, (counts.get(season) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([season, count]) => ({ season, count }));
}
