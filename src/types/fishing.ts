import { Season } from '@/types';

export type ScoreRating = 'poor' | 'weak' | 'moderate' | 'good' | 'excellent';

export interface FishingScoreResult {
  score: number;
  rating: ScoreRating;
  bestTimeStart?: string;
  bestTimeEnd?: string;
  targetSpecies?: string;
  recommendedMethod?: string;
  recommendedBait?: string;
  reasons: string[];
}

export interface FishingScoreInput {
  coords?: { lat: number; lng: number } | null;
  weather?: {
    temp: number;
    condition: string;
    cloudCover?: number;
    windSpeed?: number;
    windDirection?: number;
    humidity?: number;
    rainProbability?: number;
    waveHeight?: number;
    waterTemp?: number;
  } | null;
  moonPhase?: {
    name: string;
    illumination: number;
  } | null;
  sunTimes?: {
    sunrise: Date;
    sunset: Date;
  } | null;
  currentTime?: Date;
  season?: Season;
  targetSpecies?: string | null;
  catches?: Array<{
    species: string | null;
    fish_name: string;
    fishing_method: string | null;
    bait: string | null;
    location_name: string | null;
    catch_date: string;
    catch_time: string | null;
    weather_condition: string | null;
    weather_temp: number | null;
  }>;
}

export interface AIFishingRecommendation {
  targetSpecies?: string;
  bestTime?: string;
  recommendedLocation?: string;
  technique?: string;
  bait?: string;
  suitabilityScore?: number;
  explanation: string;
}

export interface FishIdentificationResult {
  species: string;
  confidence: number;
  estimatedSizeCm?: number;
  estimatedWeightKg?: number;
  characteristics?: string[];
  habitat?: string;
  recommendedBaits?: string[];
  recommendedMethods?: string[];
  seasonalSuitability?: string;
  warning?: string;
}

export interface WeatherConditions {
  temp: number;
  condition: string;
  cloudCover?: number;
  windSpeed?: number;
  windDirection?: number;
  humidity?: number;
  rainProbability?: number;
  waveHeight?: number;
  waterTemp?: number;
}
