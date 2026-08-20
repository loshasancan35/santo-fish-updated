import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, LocateFixed, Camera, X, Fish, CalendarDays, Thermometer, Cloud, Leaf, Loader as Loader2, Save, ChevronDown, Plus, Check, Anchor, Waves, Crosshair, ArrowLeft, Wrench, Bug, Network, Scale, Trash2, Droplets, Compass, Ruler } from 'lucide-react';
import { Coords, getCurrentPosition } from '@/lib/geo';
import { fetchCurrentWeather, WeatherSnapshot } from '@/lib/weather';
import { seasonFromDate } from '@/lib/season';
import { todayIsoLocal, nowHHmm } from '@/lib/format';
import { resolveSpeciesInfo, allSpeciesNames } from '@/lib/speciesResolver';
import { useCustomSpecies } from '@/hooks/useCustomSpecies';
import { FishInfoCard } from '@/components/FishInfoCard';
import { FadeImage } from '@/components/FadeImage';
import { NightFishingCard } from '@/components/NightFishingCard';
import { supabase } from '@/lib/supabase';
import { uploadCatchPhoto } from '@/lib/uploadPhoto';
import { getMoonPhase, moonlightBrightness } from '@/lib/moon';
import { isNightCatch } from '@/lib/sunTimes';
import {
  FishingMethod,
  NewCatch,
  TidalCurrent,
  TIDAL_CURRENT_OPTIONS,
  TIDAL_DIRECTION_OPTIONS,
  WaterVisibility,
  WATER_VISIBILITY_OPTIONS,
} from '@/types';

interface AddCatchScreenProps {
  onSaved: () => void;
  onCancel: () => void;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const METHODS: { id: FishingMethod; label: string; description: string; icon: typeof Anchor }[] = [
  { id: 'olta', label: 'Olta', description: 'Kamış ve misina ile av', icon: Anchor },
  { id: 'ag', label: 'Ağ', description: 'Ağ ile av', icon: Waves },
  { id: 'zipkin', label: 'Zıpkın', description: 'Zıpkın/su altı avı', icon: Crosshair },
];

export function AddCatchScreen({ onSaved, onCancel }: AddCatchScreenProps) {
  const { customSpecies, addCustomSpecies } = useCustomSpecies();
  const [method, setMethod] = useState<FishingMethod | null>(null);
  const [fishName, setFishName] = useState('');
  const [species, setSpecies] = useState('');
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [savingSpecies, setSavingSpecies] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationName, setLocationName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tackle, setTackle] = useState('');
  const [bait, setBait] = useState('');
  const [netType, setNetType] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [waterVisibility, setWaterVisibility] = useState<WaterVisibility | ''>('');
  const [tidalCurrent, setTidalCurrent] = useState<TidalCurrent | ''>('');
  const [tidalDirection, setTidalDirection] = useState('');
  const [catchTime, setCatchTime] = useState<string | null>(null);
  const [depth, setDepth] = useState('');
  const [extraFish, setExtraFish] = useState<{ fish_name: string; species: string; weight_kg: string }[]>([]);
  const [newFishName, setNewFishName] = useState('');
  const [newFishSpecies, setNewFishSpecies] = useState('');
  const [newFishWeight, setNewFishWeight] = useState('');
  const [date] = useState(todayIsoLocal());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const season = useMemo(() => seasonFromDate(new Date(`${date}T00:00:00`)), [date]);
  const resolvedInfo = useMemo(() => resolveSpeciesInfo(species, customSpecies), [species, customSpecies]);
  const allNames = useMemo(() => allSpeciesNames(customSpecies), [customSpecies]);
  const filteredNames = useMemo(
    () => allNames.filter((n) => n.toLocaleLowerCase('tr-TR').includes(species.toLocaleLowerCase('tr-TR'))),
    [allNames, species]
  );
  const isUnknownSpecies = species.trim().length > 0 && !resolveSpeciesInfo(species, customSpecies);
  const isNetMethod = method === 'ag';
  const isSpearMethod = method === 'zipkin';

  const nightInfo = useMemo(() => {
    if (!coords || !catchTime) return null;
    if (!isNightCatch(date, catchTime, coords.lat, coords.lng)) return null;
    const moment = new Date(`${date}T${catchTime}:00`);
    const phase = getMoonPhase(moment);
    const brightness = moonlightBrightness(phase.illumination, weather?.cloudCover);
    return { phase, brightness };
  }, [coords, catchTime, date, weather]);

  useEffect(() => {
    if (!method) return;
    (async () => {
      setGeoState('loading');
      try {
        const pos = await getCurrentPosition();
        setCoords(pos);
        const w = await fetchCurrentWeather(pos.lat, pos.lng);
        setWeather(w);
        setCatchTime(nowHHmm());
        setGeoState('ready');
      } catch (err) {
        setGeoError(err instanceof Error ? err.message : 'Konum alınamadı');
        setGeoState('error');
      }
    })();
  }, [method]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUseCoords = async () => {
    setGeoState('loading');
    setGeoError(null);
    try {
      const pos = await getCurrentPosition();
      setCoords(pos);
      const w = await fetchCurrentWeather(pos.lat, pos.lng);
      setWeather(w);
      setCatchTime(nowHHmm());
      setGeoState('ready');
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Konum alınamadı');
      setGeoState('error');
    }
  };

  const handleSaveCustomSpecies = async () => {
    if (!species.trim()) return;
    setSavingSpecies(true);
    await addCustomSpecies(species.trim(), customTip, customPhotoUrl);
    setSavingSpecies(false);
    setShowCustomForm(false);
    setCustomTip('');
    setCustomPhotoUrl('');
  };

  const handleAddFish = () => {
    if (!newFishName.trim()) return;
    setExtraFish([...extraFish, { fish_name: newFishName.trim(), species: newFishSpecies.trim(), weight_kg: newFishWeight.trim() }]);
    setNewFishName('');
    setNewFishSpecies('');
    setNewFishWeight('');
  };

  const handleRemoveFish = (index: number) => {
    setExtraFish(extraFish.filter((_, i) => i !== index));
  };

  const canSave = method !== null && saveState !== 'saving' && (isNetMethod || fishName.trim().length > 0);

  const handleSave = async () => {
    if (!canSave || !method) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile && !finalPhotoUrl) {
        finalPhotoUrl = await uploadCatchPhoto(photoFile);
        setPhotoUrl(finalPhotoUrl);
      }

      const payload: NewCatch = {
        fish_name: isNetMethod ? (fishName.trim() || 'Ağ Avı') : fishName.trim(),
        species: species.trim() || null,
        photo_url: finalPhotoUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        location_name: locationName.trim() || null,
        catch_date: date,
        weather_temp: weather?.temp ?? null,
        weather_condition: weather?.condition ?? null,
        season,
        fishing_method: method,
        tackle: method === 'olta' ? tackle.trim() || null : null,
        bait: method === 'olta' ? bait.trim() || null : null,
        net_type: isNetMethod ? netType.trim() || null : null,
        total_weight: isNetMethod && totalWeight ? Number(totalWeight) : null,
        water_temp: isSpearMethod && waterTemp ? Number(waterTemp) : null,
        water_visibility: isSpearMethod && waterVisibility ? waterVisibility : null,
        tidal_current: isSpearMethod && tidalCurrent ? tidalCurrent : null,
        tidal_direction: isSpearMethod && tidalCurrent && tidalCurrent !== 'Yok' ? tidalDirection.trim() || null : null,
        catch_time: catchTime,
        cloud_cover: weather?.cloudCover ?? null,
        depth_m: depth ? Number(depth) : null,
        notes: notes.trim() || null,
      };

      const { data: inserted, error } = await supabase.from('catches').insert(payload).select().single();
      if (error) throw new Error(error.message);

      if (isNetMethod && extraFish.length > 0 && inserted) {
        const fishRows = extraFish.map((f) => ({
          catch_id: inserted.id,
          fish_name: f.fish_name,
          species: f.species || null,
          weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
        }));
        const { error: fishError } = await supabase.from('catch_fish').insert(fishRows);
        if (fishError) throw new Error(fishError.message);
      }

      setSaveState('success');
      setTimeout(() => onSaved(), 700);
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : 'Kayıt başarısız oldu');
    }
  };

  return (
    <div className="relative z-10 flex h-full flex-col">
      <header className="shrink-0 px-5 pb-5 pt-[max(env(safe-area-inset-top),20px)]">
        <div className="flex items-center justify-between">
          {method ? (
            <button
              onClick={() => setMethod(null)}
              className="glass flex h-9 w-9 items-center justify-center rounded-full text-slate-200 active:scale-90 transition-transform"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="glass flex h-9 w-9 items-center justify-center rounded-full text-slate-200 active:scale-90 transition-transform"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <h1 className="font-display text-lg font-semibold text-white">Yeni Av Ekle</h1>
          <div className="w-9" />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* Step 1: Method selection */}
        {!method && (
          <motion.div
            key="method-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="space-y-4 px-5 pb-8 pt-5">
              <div>
                <span className="eyebrow">Yeni Kayıt</span>
                <p className="mb-1 mt-1.5 text-sm text-slate-300">Önce av yöntemini seç.</p>
                <p className="text-xs text-slate-400">Bu adım zorunludur.</p>
              </div>
              <div className="space-y-3">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <motion.button
                      key={m.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setMethod(m.id)}
                      className="glass-card flex w-full items-center gap-4 rounded-2xl p-4 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lake-500/20 text-lake-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">{m.label}</p>
                        <p className="text-sm text-slate-300">{m.description}</p>
                      </div>
                      <ChevronDown className="ml-auto h-5 w-5 -rotate-90 text-slate-400" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Catch details */}
        {method && (
          <motion.div
            key="details-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="space-y-4 px-5 pb-32 pt-5">
              {/* Method badge */}
              <div className="glass flex items-center gap-2 rounded-xl px-4 py-2.5">
                {(() => {
                  const m = METHODS.find((x) => x.id === method)!;
                  const Icon = m.icon;
                  return (
                    <>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lake-500/20 text-lake-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-white">{m.label}</span>
                      <button
                        onClick={() => setMethod(null)}
                        className="ml-auto text-xs font-medium text-lake-300 active:scale-95"
                      >
                        Değiştir
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Photo */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Fotoğraf Yükle
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <AnimatePresence mode="wait">
                  {photoPreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="relative overflow-hidden rounded-2xl shadow-lift"
                    >
                      <img src={photoPreview} alt="Av fotoğrafı" className="h-48 w-full object-cover" />
                      <button
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          setPhotoUrl(null);
                        }}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur active:scale-90"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="glass flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-dashed text-lake-300"
                    >
                      <Camera className="h-7 w-7" />
                      <span className="text-sm font-medium">Fotoğraf seç</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Fish name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {isNetMethod ? 'Av Adı (opsiyonel)' : 'Balığa İsim Ver'}
                </label>
                <input
                  value={fishName}
                  onChange={(e) => setFishName(e.target.value)}
                  placeholder={isNetMethod ? 'Örn: Sabah avı' : 'Örn: Sabahın ilk levreği'}
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                />
              </div>

              {/* Species — hidden for net method */}
              {!isNetMethod && (
                <>
                <div className="relative">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Tür (opsiyonel)
                </label>
                <div className="relative">
                  <input
                    value={species}
                    onChange={(e) => {
                      setSpecies(e.target.value);
                      setSpeciesOpen(true);
                      setShowCustomForm(false);
                    }}
                    onFocus={() => setSpeciesOpen(true)}
                    onBlur={() => setTimeout(() => setSpeciesOpen(false), 150)}
                    placeholder="Örn: Levrek"
                    className="glass w-full rounded-xl px-4 py-3 pr-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-300" />
                </div>
                <AnimatePresence>
                  {speciesOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900/90 py-1 shadow-lift backdrop-blur-lg"
                    >
                      {filteredNames.map((name) => {
                        const info = resolveSpeciesInfo(name, customSpecies);
                        return (
                          <li key={name}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSpecies(name);
                                setSpeciesOpen(false);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                            >
                              {info?.photoUrl ? (
                                <FadeImage src={info.photoUrl} alt={name} className="h-8 w-8 shrink-0 rounded-lg" />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                                  <Fish className="h-3.5 w-3.5 text-slate-300" />
                                </div>
                              )}
                              {name}
                            </button>
                          </li>
                        );
                      })}
                      {isUnknownSpecies && (
                        <li>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSpeciesOpen(false);
                              setShowCustomForm(true);
                            }}
                            className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2.5 text-left text-sm font-medium text-lake-300 hover:bg-lake-500/10"
                          >
                            <Plus className="h-4 w-4" />
                            "{species}" türünü veritabanına ekle
                          </button>
                        </li>
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Custom species form */}
              <AnimatePresence>
                {showCustomForm && isUnknownSpecies && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="glass-card rounded-2xl p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/20">
                          <Plus className="h-3.5 w-3.5 text-lake-300" />
                        </div>
                        <span className="text-sm font-semibold text-white">Yeni Tür: {species}</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-300">İpucu / Not (opsiyonel)</label>
                          <textarea
                            value={customTip}
                            onChange={(e) => setCustomTip(e.target.value)}
                            rows={2}
                            placeholder="Bu balık hakkında bir ipucu yaz..."
                            className="glass w-full resize-none rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-300">Fotoğraf URL (opsiyonel)</label>
                          <input
                            value={customPhotoUrl}
                            onChange={(e) => setCustomPhotoUrl(e.target.value)}
                            placeholder="https://..."
                            className="glass w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                          />
                        </div>
                        <button
                          onClick={handleSaveCustomSpecies}
                          disabled={savingSpecies}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-lake-600 px-4 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
                        >
                          {savingSpecies ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Türü Kaydet
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </>
              )}

              {/* Fish info card — hidden for net method */}
              {!isNetMethod && (
                <AnimatePresence>
                  {resolvedInfo && !showCustomForm && (
                    <FishInfoCard key={resolvedInfo.species + resolvedInfo.source} info={resolvedInfo} />
                  )}
                </AnimatePresence>
              )}

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Konum Seç
                </label>
                <div className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-200">
                      <MapPin className="h-4 w-4 text-lake-300" />
                      {geoState === 'loading' && <span className="text-slate-300">Konum alınıyor...</span>}
                      {geoState === 'ready' && coords && (
                        <span className="font-mono text-xs">
                          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                        </span>
                      )}
                      {geoState === 'error' && <span className="text-coral-400">{geoError}</span>}
                      {geoState === 'idle' && <span className="text-slate-300">Henüz alınmadı</span>}
                    </div>
                    <button
                      onClick={handleUseCoords}
                      disabled={geoState === 'loading'}
                      className="flex items-center gap-1.5 rounded-full bg-lake-600 px-3 py-1.5 text-xs font-semibold text-white active:scale-95 disabled:opacity-50"
                    >
                      <LocateFixed className="h-3.5 w-3.5" />
                      Konum Al
                    </button>
                  </div>
                  <input
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Mekan adı (örn: Sarıyer Burnu)"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                  />
                </div>
              </div>

              {/* Tackle & bait — only for olta */}
              {method === 'olta' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Olta Takımı
                    </label>
                    <div className="relative">
                      <input
                        value={tackle}
                        onChange={(e) => setTackle(e.target.value)}
                        placeholder="Örn: spin, sörf, jig"
                        className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                      />
                      <Wrench className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Yem
                    </label>
                    <div className="relative">
                      <input
                        value={bait}
                        onChange={(e) => setBait(e.target.value)}
                        placeholder="Örn: kurt, karides, suni yem"
                        className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                      />
                      <Bug className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                </div>
              )}

              {/* Net-specific fields — only for ağ */}
              {isNetMethod && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Ağ Türü
                      </label>
                      <div className="relative">
                        <input
                          value={netType}
                          onChange={(e) => setNetType(e.target.value)}
                          placeholder="Örn: fanyalı ağ, gırgır, uzatma ağı"
                          className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                        />
                        <Network className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Toplam Ağırlık (kg)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={totalWeight}
                          onChange={(e) => setTotalWeight(e.target.value)}
                          placeholder="Örn: 12.5"
                          className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                        />
                        <Scale className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  </div>

                  {/* Multi-fish entry */}
                  <div className="glass-card rounded-2xl p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-500/20">
                        <Fish className="h-3.5 w-3.5 text-lake-300" />
                      </div>
                      <span className="text-sm font-semibold text-white">Birden Fazla Balık Ekle</span>
                    </div>

                    {extraFish.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {extraFish.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                            <Fish className="h-4 w-4 shrink-0 text-lake-300" />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-slate-100">{f.fish_name}</p>
                              <p className="truncate text-xs text-slate-300">
                                {f.species || 'Tür belirtilmedi'}
                                {f.weight_kg && ` · ${f.weight_kg} kg`}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveFish(i)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral-500/20 text-coral-300 active:scale-90"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        value={newFishName}
                        onChange={(e) => setNewFishName(e.target.value)}
                        placeholder="Balık adı (örn: Hamsi #1)"
                        className="glass w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                      />
                      <div className="flex gap-2">
                        <input
                          value={newFishSpecies}
                          onChange={(e) => setNewFishSpecies(e.target.value)}
                          placeholder="Tür (opsiyonel)"
                          className="glass flex-1 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={newFishWeight}
                          onChange={(e) => setNewFishWeight(e.target.value)}
                          placeholder="kg"
                          className="glass w-20 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                        />
                      </div>
                      <button
                        onClick={handleAddFish}
                        disabled={!newFishName.trim()}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-lake-600/80 px-4 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                        Balık Ekle
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Spear-specific fields — only for zıpkın */}
              {isSpearMethod && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Su Sıcaklığı (°C)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={waterTemp}
                        onChange={(e) => setWaterTemp(e.target.value)}
                        placeholder="Örn: 21.5"
                        className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                      />
                      <Thermometer className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Su Bulanıklığı
                    </label>
                    <div className="flex gap-2">
                      {WATER_VISIBILITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setWaterVisibility(opt)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors active:scale-95 ${
                            waterVisibility === opt ? 'bg-lake-500 text-white' : 'glass text-slate-300'
                          }`}
                        >
                          <Droplets className="h-3.5 w-3.5" />
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Derinlik (m) (opsiyonel)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={depth}
                        onChange={(e) => setDepth(e.target.value)}
                        placeholder="Örn: 12.5"
                        className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                      />
                      <Ruler className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Gelgit Akıntısı
                    </label>
                    <div className="flex gap-2">
                      {TIDAL_CURRENT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setTidalCurrent(opt)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium transition-colors active:scale-95 ${
                            tidalCurrent === opt ? 'bg-lake-500 text-white' : 'glass text-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {tidalCurrent && tidalCurrent !== 'Yok' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="relative mt-2">
                            <select
                              value={tidalDirection}
                              onChange={(e) => setTidalDirection(e.target.value)}
                              className="glass w-full appearance-none rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 outline-none focus:border-lake-400"
                            >
                              <option value="">Akıntı yönü (opsiyonel)</option>
                              {TIDAL_DIRECTION_OPTIONS.map((dir) => (
                                <option key={dir} value={dir}>
                                  {dir}
                                </option>
                              ))}
                            </select>
                            <Compass className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
                            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-300" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Night fishing info — shown automatically when the catch time falls between sunset and sunrise */}
              <AnimatePresence>{nightInfo && <NightFishingCard moonPhase={nightInfo.phase} brightness={nightInfo.brightness} />}</AnimatePresence>

              {/* Auto info */}
              <div className="grid grid-cols-2 gap-3">
                <InfoTile icon={CalendarDays} label="Tarih" value={new Date(`${date}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <InfoTile icon={Leaf} label="Mevsim" value={season} />
                <InfoTile
                  icon={Thermometer}
                  label="Sıcaklık"
                  value={weather ? `${Math.round(weather.temp)}°C` : geoState === 'loading' ? '...' : '—'}
                />
                <InfoTile
                  icon={Cloud}
                  label="Hava"
                  value={weather?.condition ?? (geoState === 'loading' ? '...' : '—')}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Notlar (opsiyonel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Av hakkında notlar..."
                  className="glass w-full resize-none rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                />
              </div>

              <AnimatePresence>
                {saveError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-coral-500/20 px-4 py-3 text-sm text-coral-300"
                  >
                    {saveError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save bar - only visible after method is selected */}
      {method && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-2">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            disabled={!canSave}
            onClick={handleSave}
            whileTap={{ scale: 0.97 }}
            className={`pointer-events-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-lift transition-colors ${
              saveState === 'success'
                ? 'bg-success-600 text-white'
                : canSave
                ? 'bg-lake-600 text-white'
                : 'cursor-not-allowed bg-white/10 text-slate-500'
            }`}
          >
            {saveState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveState === 'success' && <Save className="h-4 w-4" />}
            {saveState === 'idle' && <Save className="h-4 w-4" />}
            {saveState === 'saving' ? 'Kaydediliyor...' : saveState === 'success' ? 'Kaydedildi!' : 'Avı Kaydet'}
          </motion.button>
        </div>
      )}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
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
