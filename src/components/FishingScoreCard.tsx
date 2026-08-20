import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Fish, Wrench, Bug, ChevronDown, ChevronUp, Sparkles, Loader as Loader2 } from 'lucide-react';
import { FishingScoreResult, AIFishingRecommendation } from '@/types/fishing';
import { ratingLabel, ratingColor } from '@/lib/fishingScore';
import { supabase } from '@/lib/supabase';

interface FishingScoreCardProps {
  result: FishingScoreResult;
  loading?: boolean;
  coords?: { lat: number; lng: number } | null;
  weather?: {
    temp: number;
    condition: string;
    windSpeed?: number;
    humidity?: number;
    waveHeight?: number;
    rainProbability?: number;
    waterTemp?: number;
  } | null;
  moonPhase?: { name: string; illumination: number } | null;
  season?: string;
  catches?: unknown[];
}

export function FishingScoreCard({
  result,
  loading,
  coords,
  weather,
  moonPhase,
  season,
  catches,
}: FishingScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIFishingRecommendation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const color = ratingColor(result.rating);
  const label = ratingLabel(result.rating);

  const handleAnalyze = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fish-assistant', {
        body: {
          message: 'Should I go fishing today? Analyze current conditions and give me recommendations.',
          history: [],
          context: {
            coords,
            weather,
            moonPhase,
            season,
            score: result.score,
            catchCount: catches?.length ?? 0,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.recommendation) {
        setAiResult(data.recommendation as AIFishingRecommendation);
      } else if (data?.reply) {
        setAiResult({ explanation: data.reply } as AIFishingRecommendation);
      } else {
        throw new Error('AI yanıtı alınamadı');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analizi başarısız');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/20">
            <Activity className="h-3.5 w-3.5 text-lake-300" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-lake-200">Av Skoru</span>
        </div>
        <div className="skeleton h-20 rounded-xl" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden rounded-2xl"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left active:scale-[0.99] transition-transform"
      >
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(result.score / 100) * 175.9} 175.9`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <span className="absolute text-lg font-bold text-white">{result.score}</span>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-lake-300" />
            <span className="text-xs font-semibold uppercase tracking-wide text-lake-200">Av Skoru</span>
          </div>
          <p className="text-sm font-semibold" style={{ color }}>{label}</p>
          <p className="text-xs text-slate-400">/ 100</p>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/10 px-4 py-4">
              {result.bestTimeStart && result.bestTimeEnd && (
                <DetailRow icon={Clock} label="En İyi Saatler" value={`${result.bestTimeStart} – ${result.bestTimeEnd}`} />
              )}
              {result.targetSpecies && (
                <DetailRow icon={Fish} label="Hedef Tür" value={result.targetSpecies} />
              )}
              {result.recommendedMethod && (
                <DetailRow icon={Wrench} label="Önerilen Yöntem" value={result.recommendedMethod} />
              )}
              {result.recommendedBait && (
                <DetailRow icon={Bug} label="Önerilen Yem" value={result.recommendedBait} />
              )}

              <div className="pt-1">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Açıklama</p>
                <ul className="space-y-1">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                      <span className="text-lake-300">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={aiLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lake-600/80 px-4 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? 'AI Analiz Ediliyor...' : 'AI ile Analiz Et'}
              </button>

              <AnimatePresence>
                {aiError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-coral-500/20 px-4 py-3 text-sm text-coral-300"
                  >
                    {aiError}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {aiResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-lake-300" />
                      <span className="text-xs font-semibold text-lake-200">AI Önerisi</span>
                    </div>
                    {aiResult.targetSpecies && <DetailRow icon={Fish} label="Tür" value={aiResult.targetSpecies} />}
                    {aiResult.bestTime && <DetailRow icon={Clock} label="Saat" value={aiResult.bestTime} />}
                    {aiResult.technique && <DetailRow icon={Wrench} label="Teknik" value={aiResult.technique} />}
                    {aiResult.bait && <DetailRow icon={Bug} label="Yem" value={aiResult.bait} />}
                    {aiResult.suitabilityScore != null && (
                      <p className="text-xs text-slate-400">Uygunluk: {aiResult.suitabilityScore}/100</p>
                    )}
                    <p className="text-xs leading-relaxed text-slate-300">{aiResult.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Fish; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-lake-300" />
      <span className="text-xs text-slate-400">{label}:</span>
      <span className="text-xs font-medium text-slate-200">{value}</span>
    </div>
  );
}
