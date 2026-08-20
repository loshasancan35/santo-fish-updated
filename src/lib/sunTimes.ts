// Standart güneş konumu formülleriyle (Julian gün, ekliptik boylam, saat açısı)
// gün doğumu / gün batımı hesaplaması. Harici bir API'ye ihtiyaç duymadan,
// geçmiş tarihler için de çalışır.

const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397; // Dünya'nın eksen eğikliği
const J0 = 0.0009;
const J1970 = 2440588;
const J2000 = 2451545;

function toJulian(date: Date): number {
  return date.getTime() / 86400000 - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * 86400000);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function declination(l: number): number {
  return Math.asin(Math.sin(l) * Math.sin(OBLIQUITY));
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(m: number): number {
  const center = RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m));
  const perihelion = RAD * 102.9372;
  return m + center + perihelion + Math.PI;
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - J0 - lw / (2 * Math.PI));
}

function approxTransit(ht: number, lw: number, n: number): number {
  return J0 + (ht + lw) / (2 * Math.PI) + n;
}

function solarTransitJ(ds: number, m: number, l: number): number {
  return J2000 + ds + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * l);
}

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

/**
 * Belirli bir tarih, enlem ve boylam için (yaklaşık) gün doğumu / gün batımı saatlerini döndürür.
 */
export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const dsNoon = approxTransit(0, lw, n);
  const m = solarMeanAnomaly(dsNoon);
  const l = eclipticLongitude(m);
  const dec = declination(l);
  const jNoon = solarTransitJ(dsNoon, m, l);

  const h0 = -0.833 * RAD; // standart ufuk açısı (atmosferik kırılma dahil)
  const w = hourAngle(h0, phi, dec);
  const a = approxTransit(w, lw, n);
  const jSet = solarTransitJ(a, m, l);
  const jRise = jNoon - (jSet - jNoon);

  return { sunrise: fromJulian(jRise), sunset: fromJulian(jSet) };
}

/**
 * Verilen tarih (YYYY-MM-DD) ve saat (HH:MM), o konumda gün batımı ile gün doğumu
 * arasında mı (yani "gece avı" mı) kontrol eder.
 */
export function isNightCatch(dateStr: string, timeStr: string, lat: number, lng: number): boolean {
  const moment = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(moment.getTime())) return false;

  // Aynı takvim günü için gün doğumu/batımı: bu saatin öncesi (00:00-gün doğumu) veya
  // sonrası (gün batımı-23:59) "gece" sayılır.
  const { sunrise, sunset } = getSunTimes(moment, lat, lng);
  return moment.getTime() < sunrise.getTime() || moment.getTime() > sunset.getTime();
}
