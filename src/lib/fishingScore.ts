import { FishingScoreInput, FishingScoreResult, ScoreRating } from '@/types/fishing';
import { Season } from '@/types';
import { getMoonPhase } from '@/lib/moon';
import { getSunTimes } from '@/lib/sunTimes';
import { seasonFromDate } from '@/lib/season';

const WEIGHTS = {
  weather: 0.20,
  wind: 0.15,
  seaConditions: 0.15,
  timeAndSun: 0.15,
  moonPhase: 0.10,
  season: 0.10,
  targetSpecies: 0.10,
  userHistory: 0.05,
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ratingFromScore(score: number): ScoreRating {
  if (score <= 30) return 'poor';
  if (score <= 50) return 'weak';
  if (score <= 70) return 'moderate';
  if (score <= 85) return 'good';
  return 'excellent';
}

const RATING_LABELS: Record<ScoreRating, string> = {
  poor: 'Zayıf av koşulları',
  weak: 'İdare eder koşullar',
  moderate: 'Orta seviye koşullar',
  good: 'İyi av koşulları',
  excellent: 'Mükemmel av koşulları',
};

function weatherScore(weather: NonNullable<FishingScoreInput['weather']>): { score: number; reason: string } {
  const temp = weather.temp;
  let tempScore = 70;
  if (temp >= 18 && temp <= 28) tempScore = 90;
  else if (temp >= 12 && temp <= 32) tempScore = 75;
  else if (temp >= 5 && temp <= 35) tempScore = 55;
  else tempScore = 35;

  const rain = weather.rainProbability ?? 50;
  const rainScore = rain <= 20 ? 90 : rain <= 40 ? 75 : rain <= 60 ? 55 : 30;

  const combined = tempScore * 0.55 + rainScore * 0.45;
  let reason = `Sıcaklık ${Math.round(temp)}°C, yağış olasılığı %${Math.round(rain)}`;
  if (combined >= 80) reason += ' — elverişli hava';
  else if (combined >= 55) reason += ' — kabul edilebilir hava';
  else reason += ' — zorlu hava koşulları';
  return { score: combined, reason };
}

function windScore(weather: NonNullable<FishingScoreInput['weather']>): { score: number; reason: string } {
  const wind = weather.windSpeed ?? 15;
  let score: number;
  if (wind <= 8) score = 92;
  else if (wind <= 15) score = 80;
  else if (wind <= 25) score = 58;
  else if (wind <= 35) score = 38;
  else score = 20;
  const reason = `Rüzgar ${Math.round(wind)} km/s${score >= 75 ? ' — ideal' : score >= 55 ? ' — orta' : ' — güçlü'}`;
  return { score, reason };
}

function seaScore(weather: NonNullable<FishingScoreInput['weather']>): { score: number; reason: string } {
  const wave = weather.waveHeight ?? 0.8;
  let waveScore: number;
  if (wave <= 0.5) waveScore = 90;
  else if (wave <= 1.0) waveScore = 78;
  else if (wave <= 1.5) waveScore = 58;
  else if (wave <= 2.5) waveScore = 38;
  else waveScore = 20;

  const humidity = weather.humidity ?? 60;
  const humidityScore = humidity >= 50 && humidity <= 80 ? 80 : 60;

  const combined = waveScore * 0.65 + humidityScore * 0.35;
  let reason = `Dalga ${wave.toFixed(1)} m, nem %${Math.round(humidity)}`;
  if (waveScore >= 75) reason += ' — sakin deniz';
  else if (waveScore >= 50) reason += ' — hafif dalga';
  else reason += ' — dalgalı deniz';
  return { score: combined, reason };
}

function timeAndSunScore(
  now: Date,
  sunTimes: NonNullable<FishingScoreInput['sunTimes']>
): { score: number; reason: string; bestStart?: string; bestEnd?: string } {
  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;
  const nowTime = now.getTime();

  const goldenMorningStart = new Date(sunrise.getTime() - 60 * 60 * 1000);
  const goldenMorningEnd = new Date(sunrise.getTime() + 90 * 60 * 1000);
  const goldenEveningStart = new Date(sunset.getTime() - 120 * 60 * 1000);
  const goldenEveningEnd = new Date(sunset.getTime() + 60 * 60 * 1000);

  let score = 50;
  let bestStart: string | undefined;
  let bestEnd: string | undefined;

  const fmt = (d: Date) => d.toTimeString().slice(0, 5);

  if (nowTime >= goldenMorningStart.getTime() && nowTime <= goldenMorningEnd.getTime()) {
    score = 92;
    bestStart = fmt(goldenMorningStart);
    bestEnd = fmt(goldenMorningEnd);
  } else if (nowTime >= goldenEveningStart.getTime() && nowTime <= goldenEveningEnd.getTime()) {
    score = 90;
    bestStart = fmt(goldenEveningStart);
    bestEnd = fmt(goldenEveningEnd);
  } else if (nowTime > goldenMorningEnd.getTime() && nowTime < goldenEveningStart.getTime()) {
    score = 55;
    bestStart = fmt(goldenEveningStart);
    bestEnd = fmt(goldenEveningEnd);
  } else {
    score = 68;
    bestStart = fmt(goldenMorningStart);
    bestEnd = fmt(goldenMorningEnd);
  }

  let reason = `Şu an ${fmt(now)} — gün doğumu ${fmt(sunrise)}, gün batımı ${fmt(sunset)}`;
  if (score >= 85) reason += ' — altın saatte';
  return { score, reason, bestStart, bestEnd };
}

function moonScore(moon: NonNullable<FishingScoreInput['moonPhase']>): { score: number; reason: string } {
  const illum = moon.illumination;
  let score: number;
  if (illum >= 0.85) score = 82;
  else if (illum >= 0.6) score = 75;
  else if (illum >= 0.3) score = 65;
  else if (illum >= 0.1) score = 58;
  else score = 50;
  const reason = `${moon.name} (%${Math.round(illum * 100)} aydınlanma)`;
  return { score, reason };
}

function seasonScore(season: Season): { score: number; reason: string } {
  const scores: Record<Season, number> = {
    'İlkbahar': 82,
    'Yaz': 75,
    'Sonbahar': 80,
    'Kış': 50,
  };
  return { score: scores[season], reason: `${season} mevsimi` };
}

function targetSpeciesScore(
  species: string | null | undefined,
  season: Season,
  catches: FishingScoreInput['catches']
): { score: number; reason: string; method?: string; bait?: string } {
  if (!species) {
    if (catches && catches.length > 0) {
      const counts = new Map<string, number>();
      for (const c of catches) {
        const s = (c.species || c.fish_name || '').trim();
        if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        species = top[0];
      }
    }
  }
  if (!species) return { score: 65, reason: 'Hedef tür belirtilmedi' };

  const seasonMatch = catches?.filter(
    (c) => (c.species === species || c.fish_name === species) &&
    new Date(`${c.catch_date}T00:00:00`).getMonth() === new Date().getMonth()
  );

  let score = 65;
  let method: string | undefined;
  let bait: string | undefined;

  if (seasonMatch && seasonMatch.length > 0) {
    score = 82;
    const methods = new Map<string, number>();
    const baits = new Map<string, number>();
    for (const c of seasonMatch) {
      if (c.fishing_method) methods.set(c.fishing_method, (methods.get(c.fishing_method) ?? 0) + 1);
      if (c.bait) baits.set(c.bait, (baits.get(c.bait) ?? 0) + 1);
    }
    const topMethod = Array.from(methods.entries()).sort((a, b) => b[1] - a[1])[0];
    const topBait = Array.from(baits.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topMethod) method = topMethod[0];
    if (topBait) bait = topBait[0];
  } else {
    const seasonBoost: Record<Season, number> = {
      'İlkbahar': 70, 'Yaz': 72, 'Sonbahar': 75, 'Kış': 55,
    };
    score = seasonBoost[season];
  }

  let reason = `Hedef: ${species}`;
  if (method) reason += `, yöntem: ${method}`;
  if (bait) reason += `, yem: ${bait}`;
  return { score, reason, method, bait };
}

function userHistoryScore(catches: FishingScoreInput['catches']): { score: number; reason: string } {
  if (!catches || catches.length === 0) return { score: 60, reason: 'Henüz av geçmişi yok' };
  const recent = catches.filter((c) => {
    const d = new Date(`${c.catch_date}T00:00:00`);
    const daysAgo = (Date.now() - d.getTime()) / 86400000;
    return daysAgo <= 90;
  });
  let score: number;
  if (recent.length >= 10) score = 85;
  else if (recent.length >= 5) score = 75;
  else if (recent.length >= 1) score = 65;
  else score = 55;
  return { score, reason: `Son 90 günde ${recent.length} av kaydı` };
}

export function computeFishingScore(input: FishingScoreInput): FishingScoreResult {
  const now = input.currentTime ?? new Date();
  const season = input.season ?? seasonFromDate(now);
  const moon = input.moonPhase ?? getMoonPhase(now);
  const sunTimes = input.sunTimes ?? (input.coords ? getSunTimes(now, input.coords.lat, input.coords.lng) : null);

  const activeWeights = { ...WEIGHTS };
  if (!input.weather) {
    activeWeights.weather = 0;
    activeWeights.wind = 0;
    activeWeights.seaConditions = 0;
  }
  if (!sunTimes) activeWeights.timeAndSun = 0;

  const totalWeight = Object.values(activeWeights).reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return { score: 50, rating: 'moderate', reasons: ['Yeterli veri yok — ortalaman koşullar'] };
  }

  let weightedSum = 0;
  const reasons: string[] = [];

  if (input.weather) {
    const w = weatherScore(input.weather);
    weightedSum += w.score * activeWeights.weather;
    reasons.push(w.reason);

    const wind = windScore(input.weather);
    weightedSum += wind.score * activeWeights.wind;
    reasons.push(wind.reason);

    const sea = seaScore(input.weather);
    weightedSum += sea.score * activeWeights.seaConditions;
    reasons.push(sea.reason);
  }

  if (sunTimes) {
    const ts = timeAndSunScore(now, sunTimes);
    weightedSum += ts.score * activeWeights.timeAndSun;
    reasons.push(ts.reason);
  }

  const moonResult = moonScore(moon);
  weightedSum += moonResult.score * activeWeights.moonPhase;
  reasons.push(moonResult.reason);

  const seasonResult = seasonScore(season);
  weightedSum += seasonResult.score * activeWeights.season;
  reasons.push(seasonResult.reason);

  const target = targetSpeciesScore(input.targetSpecies, season, input.catches);
  weightedSum += target.score * activeWeights.targetSpecies;
  reasons.push(target.reason);

  const history = userHistoryScore(input.catches);
  weightedSum += history.score * activeWeights.userHistory;
  reasons.push(history.reason);

  const score = clampScore(weightedSum / totalWeight);
  const rating = ratingFromScore(score);

  const result: FishingScoreResult = {
    score,
    rating,
    reasons,
  };

  if (sunTimes) {
    const ts = timeAndSunScore(now, sunTimes);
    if (ts.bestStart) result.bestTimeStart = ts.bestStart;
    if (ts.bestEnd) result.bestTimeEnd = ts.bestEnd;
  }
  if (input.targetSpecies || (input.catches && input.catches.length > 0)) {
    result.targetSpecies = input.targetSpecies ?? targetReasonSpecies(input.catches);
  }
  if (target.method) result.recommendedMethod = target.method;
  if (target.bait) result.recommendedBait = target.bait;

  return result;
}

function targetReasonSpecies(catches: FishingScoreInput['catches']): string | undefined {
  if (!catches || catches.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const c of catches) {
    const s = (c.species || c.fish_name || '').trim();
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return top?.[0];
}

export function ratingLabel(rating: ScoreRating): string {
  return RATING_LABELS[rating];
}

export function ratingColor(rating: ScoreRating): string {
  switch (rating) {
    case 'poor': return '#f87171';
    case 'weak': return '#fb923c';
    case 'moderate': return '#fbbf24';
    case 'good': return '#4ade80';
    case 'excellent': return '#34d399';
  }
}
