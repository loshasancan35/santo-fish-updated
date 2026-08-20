import { WeatherSnapshot } from '@/lib/weather';

export type LureCategory =
  | 'jig'
  | 'kaşık'
  | 'silikon'
  | 'maket_balık'
  | 'popper'
  | 'canlı_yem'
  | 'sinek'
  | 'dip_takımı';

export interface LureRecommendation {
  category: LureCategory;
  label: string;
  description: string;
  alternativeLabel?: string;
  alternativeDescription?: string;
  reasons: string[];
}

const LURE_LABELS: Record<LureCategory, string> = {
  jig: 'Metal Jig',
  kaşık: 'Kaşık (Spoon)',
  silikon: 'Silikon Yem (Grub/Shad)',
  maket_balık: 'Maket Balık (Rapala/Minnow)',
  popper: 'Popper / Yüzey Yemi',
  canlı_yem: 'Canlı Yem (Karides, Solucan, Kum Kurdu)',
  sinek: 'Sahte Sinek',
  dip_takımı: 'Ağır Dip Takımı',
};

function isRoughSea(weather: WeatherSnapshot): boolean {
  const wave = weather.waveHeight ?? 0.5;
  const wind = weather.windSpeed ?? 10;
  return wave >= 1.2 || wind >= 25;
}

function isMurkyConditions(weather: WeatherSnapshot): boolean {
  const rain = weather.precipitation ?? 0;
  const cloud = weather.cloudCover ?? 40;
  return rain > 0.5 || cloud >= 80;
}

function isBrightCalm(weather: WeatherSnapshot): boolean {
  const cloud = weather.cloudCover ?? 40;
  const wind = weather.windSpeed ?? 10;
  const wave = weather.waveHeight ?? 0.5;
  return cloud <= 25 && wind <= 12 && wave <= 0.6;
}

function isCold(weather: WeatherSnapshot): boolean {
  return weather.temp <= 12;
}

/**
 * Hava durumu (rüzgar, dalga, bulut örtüsü, yağış, sıcaklık) ve günün saatine göre
 * en uygun yem/takım türünü önerir. Kullanıcının geçmiş av kayıtlarından bağımsız,
 * saf hava koşullarına dayalı genel bir öneridir.
 */
export function recommendLure(
  weather: WeatherSnapshot | null | undefined,
  timeOfDay: 'sabah' | 'öğle' | 'akşam' | 'gece'
): LureRecommendation {
  if (!weather) {
    return {
      category: 'silikon',
      label: LURE_LABELS.silikon,
      description: 'Hava verisi olmadan genel amaçlı, her koşulda işe yarayan doğal renkli bir silikon yem tercih edilebilir.',
      reasons: ['Hava durumu verisi mevcut değil — genel amaçlı öneri'],
    };
  }

  const reasons: string[] = [];
  const rough = isRoughSea(weather);
  const murky = isMurkyConditions(weather);
  const brightCalm = isBrightCalm(weather);
  const cold = isCold(weather);
  const night = timeOfDay === 'gece';
  const dawnDusk = timeOfDay === 'sabah' || timeOfDay === 'akşam';

  if (rough) {
    reasons.push(`Rüzgar ${Math.round(weather.windSpeed ?? 0)} km/s, dalga ${(weather.waveHeight ?? 0).toFixed(1)} m — dalgalı ve rüzgarlı koşullar`);
    if (murky) {
      reasons.push('Dalgalanma suyu bulandırıyor — balık titreşim ve sesle avını buluyor');
      return {
        category: 'jig',
        label: LURE_LABELS.jig,
        description: 'Dalgalı ve bulanık suda ağır metal jig hem dibe hızlı iner hem de güçlü titreşimiyle balığın dikkatini çeker. Parlak (gümüş, sarı) renkler tercih edilmeli.',
        alternativeLabel: LURE_LABELS.dip_takımı,
        alternativeDescription: 'Dipten avlanıyorsan kokulu canlı yemle ağır dip takımı da bu koşullarda etkilidir.',
        reasons,
      };
    }
    return {
      category: 'kaşık',
      label: LURE_LABELS.kaşık,
      description: 'Güçlü rüzgar ve dalgada ağırlığı sayesinde suda kalabilen ve parıltısıyla dikkat çeken kaşık (spoon) idealdir.',
      alternativeLabel: LURE_LABELS.jig,
      alternativeDescription: 'Daha derin ve akıntılı noktalarda ağır jig de iyi bir alternatiftir.',
      reasons,
    };
  }

  if (murky) {
    reasons.push('Yağışlı veya kapalı hava suyu bulandırıyor, görüş mesafesi düşük');
    return {
      category: 'maket_balık',
      label: LURE_LABELS.maket_balık,
      description: 'Bulanık suda içi çıngıraklı (rattle) maket balıklar, çıkardıkları ses ve titreşimle balığı kendine çeker. Koyu veya parlak turuncu renkler tercih edilmeli.',
      alternativeLabel: LURE_LABELS.canlı_yem,
      alternativeDescription: 'Kokuya dayalı avlanmak için karides veya solucan gibi canlı yemler de bulanık suda etkilidir.',
      reasons,
    };
  }

  if (night) {
    reasons.push('Gece avı — görsel avdan çok titreşim ve koku etkili');
    return {
      category: 'canlı_yem',
      label: LURE_LABELS.canlı_yem,
      description: 'Gece saatlerinde canlı yem (karides, kum kurdu, küçük balık) kokusuyla balığı karanlıkta bile kendine çeker.',
      alternativeLabel: LURE_LABELS.jig,
      alternativeDescription: 'Aktif avcı türler (lüfer, palamut) için fosforlu veya koyu silüetli jigler de gece etkilidir.',
      reasons,
    };
  }

  if (cold) {
    reasons.push(`Su/hava sıcaklığı düşük (${Math.round(weather.temp)}°C) — balık metabolizması yavaş`);
    return {
      category: 'silikon',
      label: LURE_LABELS.silikon,
      description: 'Soğuk sularda balıklar yavaş hareket eder; küçük ve yavaş çekilen silikon yemler (grub, shad) bu koşullarda daha çok tercih edilir.',
      alternativeLabel: LURE_LABELS.dip_takımı,
      alternativeDescription: 'Dipte hareketsiz bekleyen türler için canlı yemle sabit dip takımı da iyi sonuç verir.',
      reasons,
    };
  }

  if (brightCalm && dawnDusk) {
    reasons.push('Durgun, berrak ve az bulutlu hava, altın saat — yüzey avcılığı için ideal');
    return {
      category: 'popper',
      label: LURE_LABELS.popper,
      description: 'Sakin ve berrak suda, gün doğumu/batımı saatlerinde yüzeyde beslenen balıklar için popper veya yüzey yemleri çok etkilidir.',
      alternativeLabel: LURE_LABELS.maket_balık,
      alternativeDescription: 'Yüzeyin hemen altında gezen maket balıklar da bu saatlerde iyi sonuç verir.',
      reasons,
    };
  }

  if (brightCalm) {
    reasons.push('Durgun, berrak ve güneşli hava — balık daha temkinli ve seçici');
    return {
      category: 'silikon',
      label: LURE_LABELS.silikon,
      description: 'Berrak ve sakin suda balık daha temkinlidir; doğal renkli, ince ve küçük silikon yemler ile yavaş sunum en iyi sonucu verir.',
      alternativeLabel: LURE_LABELS.canlı_yem,
      alternativeDescription: 'Temkinli balıklar için karides gibi doğal canlı yem de güvenli bir seçenektir.',
      reasons,
    };
  }

  reasons.push('Orta düzey, ortalama hava koşulları');
  return {
    category: 'maket_balık',
    label: LURE_LABELS.maket_balık,
    description: 'Ilıman ve orta koşullarda çok yönlü maket balıklar (Rapala tarzı) hem yüzeyde hem orta suda etkilidir; iyi bir başlangıç seçimidir.',
    alternativeLabel: LURE_LABELS.silikon,
    alternativeDescription: 'Alternatif olarak doğal renkli silikon yemler de her koşulda güvenilir sonuç verir.',
    reasons,
  };
}
