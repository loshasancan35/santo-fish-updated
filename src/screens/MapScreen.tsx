import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, X, Fish, Loader as Loader2, Save, ChevronDown, Camera, Ruler, CalendarDays,
  ArrowLeft, Thermometer, Wind, Waves, Droplets, Moon, Filter, SlidersHorizontal, LocateFixed,
} from 'lucide-react';
import { Catch, NewCatch, FishingMethod, FISHING_METHOD_LABELS } from '@/types';
import { formatDateTR, todayIsoLocal } from '@/lib/format';
import { seasonFromDate } from '@/lib/season';
import { allSpeciesNames, resolveSpeciesInfo } from '@/lib/speciesResolver';
import { useCustomSpecies } from '@/hooks/useCustomSpecies';
import { supabase } from '@/lib/supabase';
import { uploadCatchPhoto } from '@/lib/uploadPhoto';
import { FishInfoCard } from '@/components/FishInfoCard';
import { FadeImage } from '@/components/FadeImage';
import { fetchCurrentWeather, WeatherSnapshot } from '@/lib/weather';
import { getCurrentPosition, Coords } from '@/lib/geo';
import { getMoonPhase } from '@/lib/moon';

interface MapScreenProps {
  catches: Catch[];
  reload: () => Promise<void>;
}

const TURKEY_CENTER: [number, number] = [39.0, 35.5];
const TURKEY_ZOOM = 6;

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeCatchIcon(): L.DivIcon {
  return L.divIcon({
    className: 'catch-marker',
    html: `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;">
        <span style="position:absolute;inset:0;border-radius:999px;background:rgb(30 58 95 / 0.35);animation:catch-ping 2.4s ease-out infinite;"></span>
        <span style="position:relative;display:block;width:14px;height:14px;border-radius:999px;background:#1e3a5f;border:2px solid #dbeafe;"></span>
      </span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function makeUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:22px;height:22px;">
        <span style="position:absolute;inset:0;border-radius:999px;background:rgb(59 95 138 / 0.4);animation:user-pulse 2s ease-out infinite;"></span>
        <span style="position:relative;display:block;width:12px;height:12px;border-radius:999px;background:#3b5f8a;border:2px solid #fff;"></span>
      </span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

type MapMode = 'map' | 'create-catch';
type SaveState = 'idle' | 'saving' | 'success' | 'error';
type SortMode = 'newest' | 'oldest' | 'weight-desc' | 'weight-asc';

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'En Yeni' },
  { id: 'oldest', label: 'En Eski' },
  { id: 'weight-desc', label: 'Ağırlık (Çok→Az)' },
  { id: 'weight-asc', label: 'Ağırlık (Az→Çok)' },
];

export function MapScreen({ catches, reload }: MapScreenProps) {
  const { customSpecies } = useCustomSpecies();
  const allNames = useMemo(() => allSpeciesNames(customSpecies), [customSpecies]);

  const [mode, setMode] = useState<MapMode>('map');
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<FishingMethod | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  // Create-catch form state
  const [fishName, setFishName] = useState('');
  const [species, setSpecies] = useState('');
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [depth, setDepth] = useState('');
  const [catchDate, setCatchDate] = useState(todayIsoLocal());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [moon] = useState(() => getMoonPhase(new Date()));
  const [locating, setLocating] = useState(false);
  const [flyToSignal, setFlyToSignal] = useState(0);

  const speciesOptions = useMemo(() => {
    const set = new Map<string, string>();
    catches.forEach((c) => {
      const s = (c.species || c.fish_name || '').trim();
      if (s) set.set(s, s);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [catches]);

  const methodOptions = useMemo(() => {
    const set = new Set<FishingMethod>();
    catches.forEach((c) => {
      if (c.fishing_method) set.add(c.fishing_method);
    });
    return Array.from(set);
  }, [catches]);

  const filteredCatches = useMemo(() => {
    let result = catches.filter((c) => c.lat != null && c.lng != null);

    if (speciesFilter !== 'all') {
      result = result.filter((c) => (c.species || c.fish_name || '') === speciesFilter);
    }
    if (methodFilter !== 'all') {
      result = result.filter((c) => c.fishing_method === methodFilter);
    }
    if (dateFrom) {
      result = result.filter((c) => c.catch_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((c) => c.catch_date <= dateTo);
    }
    if (weightMin) {
      const min = Number(weightMin);
      if (!Number.isNaN(min)) result = result.filter((c) => c.total_weight != null && c.total_weight >= min);
    }
    if (weightMax) {
      const max = Number(weightMax);
      if (!Number.isNaN(max)) result = result.filter((c) => c.total_weight != null && c.total_weight <= max);
    }

    const sorted = [...result];
    switch (sortMode) {
      case 'newest':
        sorted.sort((a, b) => b.catch_date.localeCompare(a.catch_date) || b.created_at.localeCompare(a.created_at));
        break;
      case 'oldest':
        sorted.sort((a, b) => a.catch_date.localeCompare(b.catch_date) || a.created_at.localeCompare(b.created_at));
        break;
      case 'weight-desc':
        sorted.sort((a, b) => (b.total_weight ?? -1) - (a.total_weight ?? -1));
        break;
      case 'weight-asc':
        sorted.sort((a, b) => (a.total_weight ?? Infinity) - (b.total_weight ?? Infinity));
        break;
    }
    return sorted;
  }, [catches, speciesFilter, methodFilter, dateFrom, dateTo, weightMin, weightMax, sortMode]);

  const geoCatches = filteredCatches;
  const resolvedInfo = useMemo(() => resolveSpeciesInfo(species, customSpecies), [species, customSpecies]);
  const filteredNames = useMemo(
    () => allNames.filter((n) => n.toLocaleLowerCase('tr-TR').includes(species.toLocaleLowerCase('tr-TR'))),
    [allNames, species]
  );

  const catchIcon = useMemo(() => makeCatchIcon(), []);
  const userIcon = useMemo(() => makeUserLocationIcon(), []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (speciesFilter !== 'all') count++;
    if (methodFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (weightMin || weightMax) count++;
    if (sortMode !== 'newest') count++;
    return count;
  }, [speciesFilter, methodFilter, dateFrom, dateTo, weightMin, weightMax, sortMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;
        setUserCoords(pos);
        const w = await fetchCurrentWeather(pos.lat, pos.lng);
        if (cancelled) return;
        setWeather(w);
      } catch {
        // silent fail — map still works without weather
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const locateMe = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setUserCoords(pos);
      const w = await fetchCurrentWeather(pos.lat, pos.lng);
      setWeather(w);
      setFlyToSignal((n) => n + 1);
    } catch {
      // ignore — button just won't move the map
    } finally {
      setLocating(false);
    }
  };

  const startDraft = (lat: number, lng: number) => {
    setDraft({ lat, lng });
    setMode('create-catch');
  };

  const resetForm = () => {
    setFishName('');
    setSpecies('');
    setNotes('');
    setDepth('');
    setCatchDate(todayIsoLocal());
    setPhotoFile(null);
    setPhotoPreview(null);
    setSaveState('idle');
    setSaveError(null);
    setSpeciesOpen(false);
  };

  const cancelDraft = () => {
    setMode('map');
    setDraft(null);
    resetForm();
  };

  const clearFilters = () => {
    setSpeciesFilter('all');
    setMethodFilter('all');
    setDateFrom('');
    setDateTo('');
    setWeightMin('');
    setWeightMax('');
    setSortMode('newest');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSave = fishName.trim().length > 0 && saveState !== 'saving';

  const handleSave = async () => {
    if (!canSave || !draft) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadCatchPhoto(photoFile);
      }
      const season = seasonFromDate(new Date(`${catchDate}T00:00:00`));
      const payload: NewCatch = {
        fish_name: fishName.trim(),
        species: species.trim() || null,
        photo_url: photoUrl,
        lat: draft.lat,
        lng: draft.lng,
        location_name: null,
        catch_date: catchDate,
        weather_temp: null,
        weather_condition: null,
        season,
        fishing_method: null,
        tackle: null,
        bait: null,
        net_type: null,
        total_weight: null,
        water_temp: null,
        water_visibility: null,
        tidal_current: null,
        tidal_direction: null,
        catch_time: null,
        cloud_cover: null,
        depth_m: depth ? Number(depth) : null,
        notes: notes.trim() || null,
      };

      const { error } = await supabase.from('catches').insert(payload);
      if (error) throw new Error(error.message);

      setSaveState('success');
      setTimeout(async () => {
        setMode('map');
        setDraft(null);
        resetForm();
        await reload();
      }, 600);
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : 'Kayıt başarısız oldu');
    }
  };

  return (
    <div className="relative z-10 flex h-full flex-col">
      <header className="shrink-0 px-5 pb-3 pt-[max(env(safe-area-inset-top),20px)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow" style={{ color: '#18BFFF' }}>Harita</span>
            <h1 className="mt-1.5 font-display text-[24px] font-semibold tracking-tight text-white">Av Haritası</h1>
          </div>
          {mode === 'map' && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="glass relative flex h-10 w-10 items-center justify-center rounded-full text-slate-200 active:scale-90 transition-transform"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-lake-500 px-1 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Filter panel */}
      <AnimatePresence>
        {mode === 'map' && showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden px-5"
          >
            <div className="glass-card space-y-3 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-lake-300" />
                  <span className="text-sm font-semibold text-white">Harita Filtreleri</span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-coral-300 active:scale-95"
                  >
                    Temizle
                  </button>
                )}
              </div>

              {/* Species filter */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Balık Türü
                </label>
                <select
                  value={speciesFilter}
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-lake-400"
                >
                  <option value="all">Tüm türler</option>
                  {speciesOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Method filter */}
              {methodOptions.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Yöntem
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMethodFilter('all')}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors active:scale-95 ${
                        methodFilter === 'all' ? 'bg-lake-500 text-white' : 'glass text-slate-300'
                      }`}
                    >
                      Tümü
                    </button>
                    {methodOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethodFilter(m)}
                        className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors active:scale-95 ${
                          methodFilter === m ? 'bg-lake-500 text-white' : 'glass text-slate-300'
                        }`}
                      >
                        {FISHING_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date range */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Tarih Aralığı
                </label>
                <div className="flex items-center gap-2">
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
              </div>

              {/* Weight range */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Ağırlık Aralığı (kg)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightMin}
                    onChange={(e) => setWeightMin(e.target.value)}
                    placeholder="Min"
                    className="flex-1 rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                  />
                  <span className="text-slate-300">—</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightMax}
                    onChange={(e) => setWeightMax(e.target.value)}
                    placeholder="Max"
                    className="flex-1 rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Sıralama
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="w-full rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none focus:border-lake-400"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-1 text-center text-xs text-slate-400">
                {geoCatches.length} av gösteriliyor
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'map' && (
          <motion.div
            key="map-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative min-h-0 flex-1 px-3 pb-3"
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-lake-400/15 shadow-lift">
              <MapContainer
                center={userCoords ? [userCoords.lat, userCoords.lng] : TURKEY_CENTER}
                zoom={userCoords ? 12 : TURKEY_ZOOM}
                scrollWheelZoom
                className="h-full w-full plain-navy-map"
                style={{ background: '#0e2340' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap &copy; CARTO'
                  maxZoom={19}
                />

                <FitBounds catches={geoCatches} userCoords={userCoords} />
                <FlyToUser coords={userCoords} signal={flyToSignal} />

                {geoCatches.map((c) => (
                  <Marker key={c.id} position={[c.lat!, c.lng!]} icon={catchIcon}>
                    <Popup className="catch-popup">
                      <div className="min-w-[180px] space-y-1.5">
                        <p className="text-sm font-semibold text-white">{c.fish_name}</p>
                        {c.species && (
                          <p className="flex items-center gap-1 text-xs text-slate-200">
                            <Fish className="h-3 w-3" />
                            {c.species}
                          </p>
                        )}
                        <p className="text-xs text-slate-300">{formatDateTR(c.catch_date)}</p>
                        {c.location_name && (
                          <p className="flex items-center gap-1 text-xs text-slate-200">
                            <MapPin className="h-3 w-3" />
                            {c.location_name}
                          </p>
                        )}
                        {c.total_weight != null && (
                          <p className="text-xs text-slate-200">{c.total_weight} kg</p>
                        )}
                        {c.depth_m != null && (
                          <p className="flex items-center gap-1 text-xs text-slate-200">
                            <Ruler className="h-3 w-3" />
                            {c.depth_m} m derinlik
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {userCoords && (
                  <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
                    <Popup>
                      <p className="text-xs font-semibold text-white">Mevcut Konumun</p>
                    </Popup>
                  </Marker>
                )}

                <ClickHandler onMapClick={startDraft} />
              </MapContainer>

              <button
                onClick={locateMe}
                disabled={locating}
                className="glass absolute bottom-4 right-4 z-[600] flex h-11 w-11 items-center justify-center rounded-full text-lake-200 shadow-lift active:scale-90 transition-transform disabled:opacity-60"
                aria-label="Konumuma git"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </button>

              {geoCatches.length === 0 && !userCoords && (
                <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
                  <div className="glass rounded-full px-4 py-2 text-xs font-medium text-slate-200 shadow-lift">
                    Haritaya dokunarak yeni av ekleyebilirsin.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'create-catch' && draft && (
          <motion.div
            key="create-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between px-5 pb-3">
              <button
                onClick={cancelDraft}
                className="glass flex h-9 w-9 items-center justify-center rounded-full text-slate-200 active:scale-90 transition-transform"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-white">Yeni Av Ekle</span>
              <div className="w-9" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-4 px-5 pb-6 pt-2">
                <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-slate-300">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-lake-300" />
                  <span className="font-mono">{draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}</span>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Fotoğraf (opsiyonel)
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
                        <img src={photoPreview} alt="Av fotoğrafı" className="h-40 w-full object-cover" />
                        <button
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
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
                        className="glass flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border-dashed text-lake-300"
                      >
                        <Camera className="h-6 w-6" />
                        <span className="text-sm font-medium">Fotoğraf seç</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Balığa İsim Ver
                  </label>
                  <input
                    value={fishName}
                    onChange={(e) => setFishName(e.target.value)}
                    placeholder="Örn: Sabahın ilk levreği"
                    className="glass w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                  />
                </div>

                <div className="relative">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Tür (opsiyonel)
                  </label>
                  <div className="relative">
                    <input
                      value={species}
                      onChange={(e) => { setSpecies(e.target.value); setSpeciesOpen(true); }}
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
                                onClick={() => { setSpecies(name); setSpeciesOpen(false); }}
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
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {resolvedInfo && (
                    <FishInfoCard key={resolvedInfo.species + resolvedInfo.source} info={resolvedInfo} compact />
                  )}
                </AnimatePresence>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Tarih
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={catchDate}
                      onChange={(e) => setCatchDate(e.target.value)}
                      className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 outline-none focus:border-lake-400"
                    />
                    <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-300" />
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
                    Notlar (opsiyonel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
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
            </div>

            <div className="shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
              <button
                disabled={!canSave}
                onClick={handleSave}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-lift transition-colors active:scale-[0.98] ${
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
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky weather/sea panel — only in map mode */}
      {mode === 'map' && weather && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),72px)]">
          <div className="glass pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/12 px-4 py-2.5 backdrop-blur-xl">
            <WeatherTile icon={Thermometer} value={`${Math.round(weather.temp)}°C`} />
            {weather.windSpeed != null && <WeatherTile icon={Wind} value={`${Math.round(weather.windSpeed)} km/s`} />}
            {weather.waveHeight != null && <WeatherTile icon={Waves} value={`${weather.waveHeight.toFixed(1)} m`} />}
            {weather.humidity != null && <WeatherTile icon={Droplets} value={`%${Math.round(weather.humidity)}`} />}
            <WeatherTile icon={Moon} value={`%${Math.round(moon.illumination * 100)}`} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes catch-ping {
          0% { transform: scale(0.8); opacity: 0.6; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes user-pulse {
          0% { transform: scale(0.6); opacity: 0.5; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .plain-navy-map .leaflet-tile-pane {
          filter: saturate(0.85) brightness(0.9) hue-rotate(4deg);
        }
        .leaflet-container { font-family: 'Manrope', system-ui, sans-serif; background: #0e2340 !important; }
        .leaflet-popup-content-wrapper {
          border-radius: 0.75rem;
          background: rgb(6 29 50 / 0.94);
          color: #e2e8f0;
          border: 1px solid rgb(24 191 255 / 0.15);
          box-shadow: 0 8px 24px rgb(0 0 0 / 0.5);
        }
        .leaflet-popup-tip { background: rgb(6 29 50 / 0.94); }
        .leaflet-popup-content { margin: 10px 12px; }
        .leaflet-bar {
          border: 1px solid rgb(24 191 255 / 0.12) !important;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .leaflet-bar a {
          background: rgb(6 29 50 / 0.85);
          color: #18BFFF;
          border-color: rgb(24 191 255 / 0.08);
        }
        .leaflet-bar a:hover {
          background: rgb(8 41 67 / 0.9);
          color: #fff;
        }
        .leaflet-control-attribution {
          background: rgb(3 21 37 / 0.6) !important;
          color: #475569 !important;
          font-size: 9px;
          border-radius: 0.25rem 0 0 0;
        }
        .leaflet-control-attribution a { color: #18BFFF !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          text-indent: -9999px;
          position: relative;
        }
        .leaflet-control-zoom-in::after {
          content: '+';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-indent: 0;
          font-size: 16px;
          font-weight: 600;
        }
        .leaflet-control-zoom-out::after {
          content: '−';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-indent: 0;
          font-size: 16px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

function WeatherTile({ icon: Icon, value }: { icon: typeof Thermometer; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-cyan-400" />
      <span className="text-xs font-medium text-slate-200">{value}</span>
    </div>
  );
}

function FitBounds({ catches, userCoords }: { catches: Catch[]; userCoords: Coords | null }) {
  const map = useMap();
  useEffect(() => {
    if (catches.length === 0 && !userCoords) return;
    const points: [number, number][] = catches.map((c) => [c.lat!, c.lng!] as [number, number]);
    if (userCoords) points.push([userCoords.lat, userCoords.lng]);
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, catches, userCoords]);
  return null;
}

function FlyToUser({ coords, signal }: { coords: Coords | null; signal: number }) {
  const map = useMap();
  useEffect(() => {
    if (!coords || signal === 0) return;
    map.flyTo([coords.lat, coords.lng], 14, { duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
  return null;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
