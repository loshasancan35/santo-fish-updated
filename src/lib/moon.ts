// Ay evresi hesaplaması: bilinen bir yeni ay referans anına göre, ayın sinodik
// döngüsündeki (~29.53 gün) konumunu bulur. Harici bir API gerektirmez.

const SYNODIC_MONTH_DAYS = 29.530588853;
// Referans yeni ay: 6 Ocak 2000, 18:14 UTC
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

const MOON_PHASE_NAMES = [
  'Yeni Ay',
  'Hilal (Büyüyen)',
  'İlk Dördün',
  'Şişkin Ay (Büyüyen)',
  'Dolunay',
  'Şişkin Ay (Küçülen)',
  'Son Dördün',
  'Hilal (Küçülen)',
] as const;

export interface MoonPhaseInfo {
  name: string;
  /** 0 (yeni ay) - 1 (dolunay) arası aydınlanma oranı */
  illumination: number;
  /** 0-7 arası evre indeksi, ikon seçimi için kullanılabilir */
  phaseIndex: number;
}

/**
 * Verilen tarih/saat için ay evresini ve aydınlanma oranını hesaplar.
 */
export function getMoonPhase(date: Date): MoonPhaseInfo {
  const daysSinceNewMoon = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
  const age = daysSinceNewMoon % SYNODIC_MONTH_DAYS;
  const normalizedAge = age < 0 ? age + SYNODIC_MONTH_DAYS : age;
  const phaseFraction = normalizedAge / SYNODIC_MONTH_DAYS; // 0..1

  const illumination = (1 - Math.cos(2 * Math.PI * phaseFraction)) / 2;
  const phaseIndex = Math.round(phaseFraction * 8) % 8;

  return {
    name: MOON_PHASE_NAMES[phaseIndex],
    illumination,
    phaseIndex,
  };
}

export interface MoonlightBrightness {
  /** 0-100 arası tahmini ay ışığı parlaklık yüzdesi */
  percent: number;
  label: string;
}

/**
 * Ay aydınlanma oranı ve (varsa) bulut örtüsü yüzdesine göre, o bölgedeki
 * tahmini ay ışığı parlaklığını hesaplar.
 */
export function moonlightBrightness(
  illumination: number,
  cloudCoverPercent?: number | null
): MoonlightBrightness {
  const cloudFactor = cloudCoverPercent != null ? Math.max(0, 1 - cloudCoverPercent / 100) : 1;
  const percent = Math.round(illumination * cloudFactor * 100);

  let label: string;
  if (percent >= 70) label = 'Çok Parlak';
  else if (percent >= 45) label = 'Parlak';
  else if (percent >= 20) label = 'Orta';
  else if (percent >= 5) label = 'Zayıf';
  else label = 'Neredeyse Karanlık';

  return { percent, label };
}
