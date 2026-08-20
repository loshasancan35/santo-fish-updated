import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, MapPin, Calendar, Leaf, X, Thermometer, Cloud, Fish, ArrowLeft, Wrench, Bug, Droplets, Waves, Compass, Ruler } from 'lucide-react';
import { Catch, Season } from '@/types';
import { formatDateTR } from '@/lib/format';
import { resolveSpeciesInfo } from '@/lib/speciesResolver';
import { useCustomSpecies } from '@/hooks/useCustomSpecies';
import { FadeImage } from '@/components/FadeImage';
import { FishInfoCard } from '@/components/FishInfoCard';
import { NightFishingCard } from '@/components/NightFishingCard';
import { CatchCardSkeleton } from '@/components/Skeletons';
import { PullToRefresh } from '@/components/PullToRefresh';
import { getMoonPhase, moonlightBrightness } from '@/lib/moon';
import { isNightCatch } from '@/lib/sunTimes';

interface HistoryScreenProps {
  catches: Catch[];
  loading: boolean;
  reload: () => Promise<void>;
}

type FilterMode = 'all' | 'season' | 'location' | 'date';
const SEASONS: Season[] = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'];

export function HistoryScreen({ catches, loading, reload }: HistoryScreenProps) {
  const { customSpecies } = useCustomSpecies();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Catch | null>(null);

  const locations = useMemo(() => {
    const set = new Map<string, string>();
    catches.forEach((c) => {
      if (c.location_name) set.set(c.location_name, c.location_name);
    });
    return Array.from(set.values());
  }, [catches]);

  const filtered = useMemo(() => {
    return catches.filter((c) => {
      if (filterMode === 'season' && seasonFilter !== 'all' && c.season !== seasonFilter) return false;
      if (filterMode === 'location' && locationFilter !== 'all' && c.location_name !== locationFilter) return false;
      if (filterMode === 'date') {
        if (dateFrom && c.catch_date < dateFrom) return false;
        if (dateTo && c.catch_date > dateTo) return false;
      }
      return true;
    });
  }, [catches, filterMode, seasonFilter, locationFilter, dateFrom, dateTo]);

  const selectedInfo = selected ? resolveSpeciesInfo(selected.species, customSpecies) : undefined;

  const selectedNightInfo = useMemo(() => {
    if (!selected || !selected.catch_time || selected.lat == null || selected.lng == null) return null;
    if (!isNightCatch(selected.catch_date, selected.catch_time, selected.lat, selected.lng)) return null;
    const moment = new Date(`${selected.catch_date}T${selected.catch_time}:00`);
    const phase = getMoonPhase(moment);
    const brightness = moonlightBrightness(phase.illumination, selected.cloud_cover);
    return { phase, brightness };
  }, [selected]);

  return (
    <div className="relative z-10 flex h-full flex-col">
      <header className="shrink-0 px-5 pb-5 pt-[max(env(safe-area-inset-top),20px)]">
        <span className="eyebrow" style={{ color: '#78d9c2' }}>Arşiv</span>
        <h1 className="mt-1.5 font-display text-[28px] font-semibold tracking-tight text-white">Geçmiş Avlarım</h1>
        <p className="mt-0.5 text-sm text-lake-200">{catches.length} av kaydı</p>
      </header>

      {/* Filter bar */}
      <div className="glass shrink-0 mx-5 rounded-2xl px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filterMode === 'all'} onClick={() => setFilterMode('all')}>
            Tümü
          </FilterChip>
          <FilterChip active={filterMode === 'season'} onClick={() => setFilterMode('season')} icon={Leaf}>
            Mevsime Göre
          </FilterChip>
          <FilterChip active={filterMode === 'location'} onClick={() => setFilterMode('location')} icon={MapPin}>
            Konuma Göre
          </FilterChip>
          <FilterChip active={filterMode === 'date'} onClick={() => setFilterMode('date')} icon={Calendar}>
            Tarihe Göre
          </FilterChip>
        </div>

        <AnimatePresence>
          {filterMode === 'season' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 pt-2">
                <SeasonChip active={seasonFilter === 'all'} onClick={() => setSeasonFilter('all')}>
                  Hepsi
                </SeasonChip>
                {SEASONS.map((s) => (
                  <SeasonChip key={s} active={seasonFilter === s} onClick={() => setSeasonFilter(s)}>
                    {s}
                  </SeasonChip>
                ))}
              </div>
            </motion.div>
          )}
          {filterMode === 'location' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-lake-400"
              >
                <option value="all">Tüm konumlar</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </motion.div>
          )}
          {filterMode === 'date' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-lake-400"
                />
                <span className="text-slate-300">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-lake-400"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="min-h-0 flex-1">
        <PullToRefresh onRefresh={reload}>
          <div className="space-y-3 px-5 pb-28 pt-4">
            {loading ? (
              <>
                <CatchCardSkeleton />
                <CatchCardSkeleton />
                <CatchCardSkeleton />
              </>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-16 text-center">
                <Filter className="h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-300">Bu filtrelere uygun av bulunamadı.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((c) => (
                  <motion.button
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelected(c)}
                    className="glass-card flex w-full gap-3 rounded-2xl p-3 text-left"
                  >
                    <FadeImage src={c.photo_url} alt={c.fish_name} className="h-20 w-20 shrink-0 rounded-xl" />
                    <div className="flex flex-1 flex-col justify-center py-1">
                      <p className="text-sm font-semibold text-white">{c.fish_name}</p>
                      {c.species && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-300">
                          <Fish className="h-3 w-3" />
                          {c.species}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">{formatDateTR(c.catch_date)}</p>
                      {c.location_name && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {c.location_name}
                        </p>
                      )}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="ocean-bg relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 pb-[max(env(safe-area-inset-bottom),16px)] shadow-lift sm:rounded-3xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between glass px-5 py-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-90"
                >
                  <ArrowLeft className="h-4 w-4 text-slate-200" />
                </button>
                <span className="text-sm font-semibold text-white">Av Detayı</span>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 active:scale-90"
                >
                  <X className="h-4 w-4 text-slate-200" />
                </button>
              </div>

              <div className="relative z-10 px-5 pb-6 pt-2">
                {selected.photo_url && (
                  <FadeImage src={selected.photo_url} alt={selected.fish_name} className="mb-4 h-52 w-full rounded-2xl" />
                )}
                <h2 className="font-display text-xl font-semibold text-white">{selected.fish_name}</h2>
                {selected.species && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300">
                    <Fish className="h-3.5 w-3.5" />
                    {selected.species}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <DetailTile icon={Calendar} label="Tarih" value={formatDateTR(selected.catch_date)} />
                  {selected.season && <DetailTile icon={Leaf} label="Mevsim" value={selected.season} />}
                  {selected.weather_temp != null && (
                    <DetailTile icon={Thermometer} label="Sıcaklık" value={`${Math.round(selected.weather_temp)}°C`} />
                  )}
                  {selected.weather_condition && (
                    <DetailTile icon={Cloud} label="Hava" value={selected.weather_condition} />
                  )}
                  {selected.location_name && (
                    <DetailTile icon={MapPin} label="Konum" value={selected.location_name} />
                  )}
                  {selected.lat != null && selected.lng != null && (
                    <DetailTile
                      icon={MapPin}
                      label="Koordinat"
                      value={`${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}
                    />
                  )}
                  {selected.tackle && (
                    <DetailTile icon={Wrench} label="Olta Takımı" value={selected.tackle} />
                  )}
                  {selected.bait && (
                    <DetailTile icon={Bug} label="Yem" value={selected.bait} />
                  )}
                  {selected.water_temp != null && (
                    <DetailTile icon={Thermometer} label="Su Sıcaklığı" value={`${selected.water_temp}°C`} />
                  )}
                  {selected.water_visibility && (
                    <DetailTile icon={Droplets} label="Su Bulanıklığı" value={selected.water_visibility} />
                  )}
                  {selected.depth_m != null && (
                    <DetailTile icon={Ruler} label="Derinlik" value={`${selected.depth_m} m`} />
                  )}
                  {selected.tidal_current && (
                    <DetailTile
                      icon={Waves}
                      label="Gelgit Akıntısı"
                      value={selected.tidal_current}
                    />
                  )}
                  {selected.tidal_direction && (
                    <DetailTile icon={Compass} label="Akıntı Yönü" value={selected.tidal_direction} />
                  )}
                </div>

                {selectedNightInfo && (
                  <div className="mt-4">
                    <NightFishingCard moonPhase={selectedNightInfo.phase} brightness={selectedNightInfo.brightness} />
                  </div>
                )}

                {selected.notes && (
                  <div className="glass mt-4 rounded-xl p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Notlar</p>
                    <p className="mt-1 text-sm text-slate-200">{selected.notes}</p>
                  </div>
                )}

                {selectedInfo && (
                  <div className="mt-4">
                    <FishInfoCard info={selectedInfo} />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: typeof Leaf;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
        active ? 'bg-lake-500 text-white' : 'bg-white/10 text-slate-300'
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function SeasonChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${
        active ? 'bg-lake-500/30 text-lake-100' : 'bg-white/5 text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function DetailTile({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
