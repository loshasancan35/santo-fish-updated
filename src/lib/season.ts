import { Season } from '@/types';

export function seasonFromDate(date: Date): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'İlkbahar';
  if (month >= 6 && month <= 8) return 'Yaz';
  if (month >= 9 && month <= 11) return 'Sonbahar';
  return 'Kış';
}

export function currentTimeOfDay(): 'sabah' | 'öğle' | 'akşam' | 'gece' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'sabah';
  if (hour >= 11 && hour < 17) return 'öğle';
  if (hour >= 17 && hour < 21) return 'akşam';
  return 'gece';
}
