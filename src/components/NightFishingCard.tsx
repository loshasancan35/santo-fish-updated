import { motion } from 'framer-motion';
import { Moon, Sparkles } from 'lucide-react';
import { MoonPhaseInfo, MoonlightBrightness } from '@/lib/moon';

interface NightFishingCardProps {
  moonPhase: MoonPhaseInfo;
  brightness: MoonlightBrightness;
}

export function NightFishingCard({ moonPhase, brightness }: NightFishingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-card overflow-hidden rounded-2xl"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Moon className="h-4 w-4 text-lake-300" />
        <span className="text-xs font-semibold uppercase tracking-wide text-lake-200">
          Gece Balıkçılığı Bilgisi
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Moon className="h-3.5 w-3.5" />
            Ay Evresi
          </div>
          <p className="text-sm font-semibold text-slate-100">{moonPhase.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">%{Math.round(moonPhase.illumination * 100)} aydınlık</p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5" />
            Ay Işığı Parlaklığı
          </div>
          <p className="text-sm font-semibold text-slate-100">{brightness.label}</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-lake-400"
              style={{ width: `${Math.min(100, Math.max(4, brightness.percent))}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
