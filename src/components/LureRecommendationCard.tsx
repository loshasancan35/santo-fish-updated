import { motion } from 'framer-motion';
import { Anchor, Sparkles } from 'lucide-react';
import { WeatherSnapshot } from '@/lib/weather';
import { recommendLure } from '@/lib/lureRecommendation';
import { currentTimeOfDay } from '@/lib/season';

interface LureRecommendationCardProps {
  weather: WeatherSnapshot | null;
  loading?: boolean;
}

export function LureRecommendationCard({ weather, loading }: LureRecommendationCardProps) {
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/20">
            <Anchor className="h-3.5 w-3.5 text-lake-300" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-lake-200">Hava Durumuna Göre Yem</span>
        </div>
        <div className="skeleton h-16 rounded-xl" />
      </motion.div>
    );
  }

  const recommendation = recommendLure(weather, currentTimeOfDay());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden rounded-2xl p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/20">
          <Anchor className="h-3.5 w-3.5 text-lake-300" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-lake-200">Hava Durumuna Göre Yem</span>
      </div>

      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lake-500/25 text-lake-200">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{recommendation.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{recommendation.description}</p>
        </div>
      </div>

      {recommendation.alternativeLabel && (
        <div className="mb-3 rounded-xl bg-white/5 p-2.5">
          <p className="text-xs font-medium text-sand-200">Alternatif: {recommendation.alternativeLabel}</p>
          {recommendation.alternativeDescription && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{recommendation.alternativeDescription}</p>
          )}
        </div>
      )}

      <ul className="space-y-1">
        {recommendation.reasons.map((r, i) => (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-400">
            <span className="text-lake-300">•</span>
            {r}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
