const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Açık',
  1: 'Az Bulutlu',
  2: 'Parçalı Bulutlu',
  3: 'Kapalı',
  45: 'Sisli',
  48: 'Kırağı Sisi',
  51: 'Hafif Çisenti',
  53: 'Çisenti',
  55: 'Yoğun Çisenti',
  61: 'Hafif Yağmurlu',
  63: 'Yağmurlu',
  65: 'Şiddetli Yağmurlu',
  71: 'Hafif Karlı',
  73: 'Karlı',
  75: 'Yoğun Karlı',
  80: 'Sağanak',
  81: 'Kuvvetli Sağanak',
  82: 'Şiddetli Sağanak',
  95: 'Fırtınalı',
  96: 'Dolulu Fırtına',
  99: 'Şiddetli Dolulu Fırtına',
};

const WIND_DIR_LABELS = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BGB', 'BB', 'KKB'];

export interface WeatherSnapshot {
  temp: number;
  condition: string;
  /** Bulut örtüsü yüzdesi (0-100) */
  cloudCover?: number;
  windSpeed?: number;
  windDirection?: number;
  windDirectionLabel?: string;
  humidity?: number;
  waveHeight?: number;
  precipitation?: number;
}

export function weatherLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? 'Bilinmiyor';
}

export function windDirectionLabel(deg: number): string {
  const idx = Math.round(deg / 22.5) % 16;
  return WIND_DIR_LABELS[idx];
}

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation` +
    `&hourly=wave_height`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Hava durumu alınamadı (${response.status})`);
  }
  const data = await response.json();

  const temp = data?.current?.temperature_2m;
  const code = data?.current?.weather_code;
  const cloudCover = data?.current?.cloud_cover;
  const windSpeed = data?.current?.wind_speed_10m;
  const windDirection = data?.current?.wind_direction_10m;
  const humidity = data?.current?.relative_humidity_2m;
  const precipitation = data?.current?.precipitation;

  if (typeof temp !== 'number' || typeof code !== 'number') {
    throw new Error('Hava durumu verisi eksik geldi');
  }

  let waveHeight: number | undefined;
  if (Array.isArray(data?.hourly?.wave_height) && Array.isArray(data?.hourly?.time)) {
    const nowIso = new Date().toISOString().slice(0, 13);
    const idx = data.hourly.time.findIndex((t: string) => t.startsWith(nowIso));
    if (idx >= 0 && typeof data.hourly.wave_height[idx] === 'number') {
      waveHeight = data.hourly.wave_height[idx];
    }
  }

  return {
    temp,
    condition: weatherLabel(code),
    cloudCover: typeof cloudCover === 'number' ? cloudCover : undefined,
    windSpeed: typeof windSpeed === 'number' ? windSpeed : undefined,
    windDirection: typeof windDirection === 'number' ? windDirection : undefined,
    windDirectionLabel: typeof windDirection === 'number' ? windDirectionLabel(windDirection) : undefined,
    humidity: typeof humidity === 'number' ? humidity : undefined,
    waveHeight,
    precipitation: typeof precipitation === 'number' ? precipitation : undefined,
  };
}
