import { Catch } from '@/types';
import { Coords, distanceKm } from '@/lib/geo';

const NEARBY_RADIUS_KM = 5;
const TEMP_TOLERANCE = 3;

export function findSimilarPastCatch(
  catches: Catch[],
  coords: Coords,
  currentTemp: number,
  currentCondition: string
): Catch | null {
  const nearby = catches.filter(
    (c) => c.lat != null && c.lng != null && distanceKm(coords, { lat: c.lat, lng: c.lng }) <= NEARBY_RADIUS_KM
  );

  const similar = nearby.filter((c) => {
    const sameCondition = c.weather_condition === currentCondition;
    const closeTemp = c.weather_temp != null && Math.abs(c.weather_temp - currentTemp) <= TEMP_TOLERANCE;
    return sameCondition || closeTemp;
  });

  return similar[0] ?? null;
}

export function nearbyCatches(catches: Catch[], coords: Coords, radiusKm = NEARBY_RADIUS_KM): Catch[] {
  return catches.filter(
    (c) => c.lat != null && c.lng != null && distanceKm(coords, { lat: c.lat, lng: c.lng }) <= radiusKm
  );
}
