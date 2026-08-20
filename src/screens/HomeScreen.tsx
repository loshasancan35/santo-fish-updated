import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Thermometer, Sparkles, Shuffle, Fish, CloudOff, CirclePlus as PlusCircle, Waves, MessageCircleQuestion, ScanLine } from 'lucide-react';
import { Catch, FishSpeciesInfo } from '@/types';
import { Coords, getCurrentPosition } from '@/lib/geo';
import { fetchCurrentWeather, WeatherSnapshot } from '@/lib/weather';
import { findSimilarPastCatch, nearbyCatches } from '@/lib/matchCatch';
import { fishTipOfTheDay } from '@/lib/tipOfDay';
import { FISH_SPECIES_INFO } from '@/data/fishInfo';
import { formatDateTR } from '@/lib/format';
import { PullToRefresh } from '@/components/PullToRefresh';
import { FadeImage } from '@/components/FadeImage';
import { TipCardSkeleton } from '@/components/Skeletons';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { FishingScoreCard } from '@/components/FishingScoreCard';
import { FishForecastCard } from '@/components/FishForecastCard';
import { LureRecommendationCard } from '@/components/LureRecommendationCard';
import { FishIdentifyModal } from '@/components/FishIdentifyModal';
import { computeFishingScore } from '@/lib/fishingScore';
import { getMoonPhase } from '@/lib/moon';
import { getSunTimes } from '@/lib/sunTimes';
import { seasonFromDate } from '@/lib/season';
import { FishingScoreResult } from '@/types/fishing';

interface HomeScreenProps {
  catches: Catch[];
  loading: boolean;
  reload: () => Promise<void>;
  onAddCatch: () => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function HomeScreen({ catches, loading, reload, onAddCatch }: HomeScreenProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [geoState, setGeoState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [tip, setTip] = useState<FishSpeciesInfo>(() => fishTipOfTheDay());
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [fishIdOpen, setFishIdOpen] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        setCoords(pos);
        const w = await fetchCurrentWeather(pos.lat, pos.lng);
        if (cancelled) return;
        setWeather(w);
        setGeoState('ready');
        setScoreLoading(false);
      } catch (err) {
        if (cancelled) return;
        setGeoError(err instanceof Error ? err.message : 'Konum alınamadı');
        setGeoState('error');
        setScoreLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scoreResult = useMemo<FishingScoreResult | null>(() => {
    if (geoState === 'loading') return null;
    const now = new Date();
    const moon = getMoonPhase(now);
    const sunTimes = coords ? getSunTimes(now, coords.lat, coords.lng) : null;
    const season = seasonFromDate(now);
    return computeFishingScore({
      coords,
      weather,
      moonPhase: moon,
      sunTimes,
      currentTime: now,
      season,
      catches: catches.map((c) => ({
        species: c.species,
        fish_name: c.fish_name,
        fishing_method: c.fishing_method,
        bait: c.bait,
        location_name: c.location_name,
        catch_date: c.catch_date,
        catch_time: c.catch_time,
        weather_condition: c.weather_condition,
        weather_temp: c.weather_temp,
      })),
    });
  }, [coords, weather, geoState, catches]);

  const similarCatch = useMemo(() => {
    if (!coords || !weather) return null;
    return findSimilarPastCatch(catches, coords, weather.temp, weather.condition);
  }, [catches, coords, weather]);

  const nearby = useMemo(() => {
    if (!coords) return [];
    return nearbyCatches(catches, coords).slice(0, 6);
  }, [catches, coords]);

  const shuffleTip = () => {
    const pool = FISH_SPECIES_INFO.filter((f) => f.species !== tip.species);
    setTip(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleAddToCatches = () => {
    reload();
  };

  return (
    <div className="relative z-10 flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-[max(env(safe-area-inset-top),20px)]">
        <span className="eyebrow">Av Günlüğü</span>
        <p className="mt-1.5 text-sm font-medium text-lake-200">{greeting()}, balıkçı</p>
        <h1 className="mt-0.5 font-display text-[28px] font-semibold tracking-tight text-white">Ana Sayfa</h1>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {geoState === 'loading' && (
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-lake-300" />
              Konum ve hava durumu alınıyor...
            </span>
          )}
          {geoState === 'ready' && weather && (
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-100">
              <Thermometer className="h-3.5 w-3.5 text-lake-300" />
              {Math.round(weather.temp)}°C · {weather.condition}
            </span>
          )}
          {geoState === 'error' && (
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-300" title={geoError ?? undefined}>
              <CloudOff className="h-3.5 w-3.5" />
              Konum izni verilmedi
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <PullToRefresh onRefresh={reload}>
          <div className="space-y-4 px-5 pb-28 pt-3">
            {scoreResult && (
              <FishingScoreCard
                result={scoreResult}
                loading={scoreLoading}
                coords={coords}
                weather={weather}
                moonPhase={getMoonPhase(new Date())}
                season={seasonFromDate(new Date())}
                catches={catches}
              />
            )}

            <FishForecastCard
              weather={weather}
              season={seasonFromDate(new Date())}
              loading={geoState === 'loading'}
            />

            <LureRecommendationCard weather={weather} loading={geoState === 'loading'} />

            <AnimatePresence mode="wait">
              {similarCatch && (
                <motion.div
                  key={similarCatch.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="glass-card overflow-hidden rounded-2xl"
                >
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
                    <Sparkles className="h-4 w-4 text-lake-300" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-lake-200">Hatırlatma</span>
                  </div>
                  <div className="flex gap-3 p-4">
                    <FadeImage
                      src={similarCatch.photo_url}
                      alt={similarCatch.fish_name}
                      className="h-20 w-20 shrink-0 rounded-xl"
                    />
                    <p className="text-sm leading-relaxed text-slate-200">
                      <span className="font-semibold text-white">{formatDateTR(similarCatch.catch_date)}</span>{' '}
                      tarihinde, benzer hava koşullarında burada{' '}
                      <span className="font-semibold text-white">{similarCatch.fish_name}</span> tutmuştun.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              key={tip.species}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="glass-card overflow-hidden rounded-2xl"
            >
              {tip.photoUrl && (
                <FadeImage src={tip.photoUrl} alt={tip.species} className="h-28 w-full" />
              )}
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sand-400/20">
                      <Fish className="h-3.5 w-3.5 text-sand-300" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-sand-300">
                      Günün Balık Bilgisi
                    </span>
                  </div>
                  <button
                    onClick={shuffleTip}
                    className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-200 active:scale-95 transition-transform"
                  >
                    <Shuffle className="h-3 w-3" />
                    Başka
                  </button>
                </div>
                <p className="text-sm font-semibold text-white">{tip.species}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{tip.tip}</p>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFishIdOpen(true)}
                className="glass-card flex items-center gap-3 rounded-2xl p-4 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lake-500/20 text-lake-300">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Balık Tanı</p>
                  <p className="text-xs text-slate-300">Fotoğrafla tür belirle</p>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setAssistantOpen(true)}
                className="glass-card flex items-center gap-3 rounded-2xl p-4 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lake-500/20 text-lake-300">
                  <MessageCircleQuestion className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AI Asistan</p>
                  <p className="text-xs text-slate-300">Soru sor, öneri al</p>
                </div>
              </motion.button>
            </div>

            {coords && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  <MapPin className="h-4 w-4 text-lake-300" />
                  Yakınındaki Geçmiş Avlar
                </div>
                {loading ? (
                  <TipCardSkeleton />
                ) : nearby.length === 0 ? (
                  <p className="glass-card rounded-2xl p-4 text-sm text-slate-300">
                    Bu bölgede henüz kayıtlı av yok.
                  </p>
                ) : (
                  <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
                    {nearby.map((c) => (
                      <div
                        key={c.id}
                        className="glass-card w-36 shrink-0 overflow-hidden rounded-2xl"
                      >
                        <FadeImage src={c.photo_url} alt={c.fish_name} className="h-24 w-full" />
                        <div className="p-2.5">
                          <p className="truncate text-sm font-semibold text-white">{c.fish_name}</p>
                          <p className="truncate text-xs text-slate-300">{c.species || 'Tür belirtilmedi'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading && catches.length === 0 && (
              <motion.button
                onClick={onAddCatch}
                whileTap={{ scale: 0.97 }}
                className="glass-card flex w-full flex-col items-center gap-2 rounded-2xl border-dashed p-8 text-center"
              >
                <Waves className="h-8 w-8 text-lake-300" />
                <p className="text-sm font-medium text-slate-200">Henüz av kaydın yok</p>
                <span className="mt-1 flex items-center gap-1.5 rounded-full bg-lake-600 px-4 py-2 text-sm font-semibold text-white">
                  <PlusCircle className="h-4 w-4" />
                  İlk Avını Ekle
                </span>
              </motion.button>
            )}
          </div>
        </PullToRefresh>
      </div>

      <AIAssistantModal open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <FishIdentifyModal
        open={fishIdOpen}
        onClose={() => setFishIdOpen(false)}
        onAddToCatches={handleAddToCatches}
      />
    </div>
  );
}
