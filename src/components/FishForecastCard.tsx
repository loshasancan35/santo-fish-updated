import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fish, Sparkles, ChevronRight, MapPin, Clock } from 'lucide-react';
import { WeatherSnapshot } from '@/lib/weather';
import { Season } from '@/types';
import { computeSpeciesLikelihood, SpeciesLikelihood } from '@/lib/speciesLikelihood';

interface FishForecastCardProps {
  weather: WeatherSnapshot | null;
  season: Season;
  loading?: boolean;
  maxItems?: number;
}

const BADGE_STYLES: Record<string, string> = {
  'ÇOK YÜKSEK': 'bg-emerald-400/15 text-emerald-300',
  YÜKSEK: 'bg-lake-400/15 text-lake-200',
  ORTA: 'bg-amber-400/15 text-amber-300',
  DÜŞÜK: 'bg-slate-400/15 text-slate-400',
};

const BAR_COLORS: Record<string, string> = {
  'ÇOK YÜKSEK': 'linear-gradient(90deg, #22d3ee, #38bdf8)',
  YÜKSEK: 'linear-gradient(90deg, #38bdf8, #818cf8)',
  ORTA: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
  DÜŞÜK: 'linear-gradient(90deg, #64748b, #475569)',
};

export function FishForecastCard({ weather, season, loading, maxItems = 5 }: FishForecastCardProps) {
  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);

  const forecast = useMemo<SpeciesLikelihood[]>(() => {
    return computeSpeciesLikelihood({ weather, season }).slice(0, maxItems);
  }, [weather, season, maxItems]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lake-500/20">
            <Fish className="h-4 w-4 text-lake-300" />
          </div>
          <span className="text-sm font-semibold text-white">Bugün Hangi Balıklar Çıkabilir?</span>
        </div>
        <div className="skeleton h-40 rounded-xl" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden rounded-2xl p-4"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lake-500/20">
            <Fish className="h-4 w-4 text-lake-300" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Bugün Hangi Balıklar Çıkabilir?</p>
            <p className="mt-0.5 text-xs text-slate-400">Hava ve mevcut koşullara göre tahmini uygunluk</p>
          </div>
        </div>
        <Sparkles className="mt-1 h-4 w-4 shrink-0 text-lake-300/70" />
      </div>

      <div className="space-y-3.5">
        {forecast.map((item, idx) => {
          const isExpanded = expandedSpecies === item.species;
          return (
            <div key={item.species}>
              <button
                onClick={() => setExpandedSpecies(isExpanded ? null : item.species)}
                className="flex w-full items-center gap-3 text-left active:scale-[0.99] transition-transform"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-slate-300">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{item.species}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${BADGE_STYLES[item.label]}`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-white">%{item.percent}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ background: BAR_COLORS[item.label] }}
                    />
                  </div>
                </div>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-9 mt-2 space-y-1.5 rounded-xl bg-white/5 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Clock className="h-3 w-3 shrink-0 text-lake-300" />
                        {item.bestTime}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="h-3 w-3 shrink-0 text-lake-300" />
                        {item.habitat}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-400">{item.tip}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
