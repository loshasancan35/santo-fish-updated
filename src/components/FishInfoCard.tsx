import { motion } from 'framer-motion';
import { Fish, Clock, CalendarDays, Waves } from 'lucide-react';
import { ResolvedSpeciesInfo } from '@/types';
import { FadeImage } from '@/components/FadeImage';

interface FishInfoCardProps {
  info: ResolvedSpeciesInfo;
  compact?: boolean;
}

export function FishInfoCard({ info, compact = false }: FishInfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-card overflow-hidden rounded-2xl"
    >
      {info.photoUrl && (
        <FadeImage
          src={info.photoUrl}
          alt={info.species}
          className="h-32 w-full"
        />
      )}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/30 text-lake-200">
            <Fish className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-white">{info.species} İpucu</span>
          {info.source === 'custom' && (
            <span className="ml-auto rounded-full bg-sand-400/20 px-2 py-0.5 text-[10px] font-medium text-sand-200">
              Özel
            </span>
          )}
        </div>
        <p className="mb-3 text-sm leading-relaxed text-slate-200">{info.tip}</p>
        {!compact && info.bestTime && (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
            {info.bestTime && (
              <div className="flex items-start gap-1.5">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lake-300" />
                <span>
                  <span className="font-medium">En iyi zaman:</span> {info.bestTime}
                </span>
              </div>
            )}
            {info.bestSeason && (
              <div className="flex items-start gap-1.5">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lake-300" />
                <span>
                  <span className="font-medium">En iyi mevsim:</span> {info.bestSeason}
                </span>
              </div>
            )}
            {info.habitat && (
              <div className="col-span-2 flex items-start gap-1.5">
                <Waves className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lake-300" />
                <span>
                  <span className="font-medium">Yaşam alanı:</span> {info.habitat}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
