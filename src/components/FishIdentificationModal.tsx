import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader as Loader2, Fish, TriangleAlert as AlertTriangle, Check, Plus, Ruler, Scale } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadCatchPhoto } from '@/lib/uploadPhoto';
import { FishIdentificationResult } from '@/types/fishing';
import { NewCatch } from '@/types';
import { seasonFromDate } from '@/lib/season';
import { todayIsoLocal, nowHHmm } from '@/lib/format';
import { Coords, getCurrentPosition } from '@/lib/geo';

interface FishIdentificationModalProps {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

type State = 'select' | 'analyzing' | 'result' | 'saving' | 'saved' | 'error';

export function FishIdentificationModal({ open, onClose, onAdded }: FishIdentificationModalProps) {
  const [state, setState] = useState<State>('select');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<FishIdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setState('select');
    setImagePreview(null);
    setImageData(null);
    setResult(null);
    setError(null);
    setCoords(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageData(dataUrl);
      setState('analyzing');
      setError(null);

      try {
        const pos = await getCurrentPosition().catch(() => null);
        if (pos) setCoords(pos);

        const { data, error: invokeError } = await supabase.functions.invoke('fish-identify', {
          body: { image: dataUrl },
        });

        if (invokeError) throw new Error(invokeError.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.result) throw new Error('Tanıma sonucu alınamadı');

        setResult(data.result as FishIdentificationResult);
        setState('result');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tanıma başarısız oldu');
        setState('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddToCatches = async () => {
    if (!result || !imageData) return;
    setState('saving');
    setError(null);
    try {
      const photoUrl = await uploadCatchPhoto(dataURLToFile(imageData, `${result.species}.jpg`));
      const now = new Date();
      const season = seasonFromDate(now);

      const payload: NewCatch = {
        fish_name: result.species,
        species: result.species,
        photo_url: photoUrl,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        location_name: null,
        catch_date: todayIsoLocal(),
        weather_temp: null,
        weather_condition: null,
        season,
        fishing_method: null,
        tackle: null,
        bait: null,
        net_type: null,
        total_weight: result.estimatedWeightKg ?? null,
        water_temp: null,
        water_visibility: null,
        tidal_current: null,
        tidal_direction: null,
        catch_time: nowHHmm(),
        cloud_cover: null,
        depth_m: null,
        notes: result.characteristics?.join('; ') || null,
      };

      const { error: insertError } = await supabase.from('catches').insert(payload);
      if (insertError) throw new Error(insertError.message);

      setState('saved');
      setTimeout(() => {
        handleClose();
        onAdded?.();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız oldu');
      setState('error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ocean-bg relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-x border-white/10"
          >
            <div className="flex shrink-0 items-center justify-between glass px-5 py-3 pt-[max(env(safe-area-inset-top),12px)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lake-500/20">
                  <Fish className="h-4 w-4 text-lake-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Balık Tanıma</p>
                  <p className="text-[10px] text-slate-400">AI ile balık türünü belirle</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
              {state === 'select' && (
                <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-lake-500/20">
                    <Camera className="h-10 w-10 text-lake-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Balık Fotoğrafı Ekle</p>
                    <p className="mt-1 text-xs text-slate-300">Tür, boy ve ağırlık tahmini için net bir yan profilden fotoğraf çek</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-2xl bg-lake-600 px-6 py-3.5 text-sm font-semibold text-white active:scale-95 transition-transform"
                  >
                    <Camera className="h-5 w-5" />
                    Fotoğraf Çek / Seç
                  </button>
                </div>
              )}

              {state === 'analyzing' && imagePreview && (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img src={imagePreview} alt="Analiz" className="h-48 w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-lake-300" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-200">AI balığı tanıyor...</p>
                </div>
              )}

              {state === 'result' && result && imagePreview && (
                <div className="space-y-4 p-5">
                  <img src={imagePreview} alt={result.species} className="h-48 w-full rounded-2xl object-cover" />

                  {result.warning && (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                      <p className="text-xs text-amber-200">{result.warning}</p>
                    </div>
                  )}

                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-semibold text-white">{result.species}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        result.confidence >= 85 ? 'bg-success-500/20 text-success-300' :
                        result.confidence >= 70 ? 'bg-lake-500/20 text-lake-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        %{result.confidence} güven
                      </span>
                    </div>

                    {(result.estimatedSizeCm != null || result.estimatedWeightKg != null) && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {result.estimatedSizeCm != null && (
                          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                            <Ruler className="h-3.5 w-3.5 text-lake-300" />
                            <span className="text-xs text-slate-200">~{result.estimatedSizeCm} cm</span>
                          </div>
                        )}
                        {result.estimatedWeightKg != null && (
                          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                            <Scale className="h-3.5 w-3.5 text-lake-300" />
                            <span className="text-xs text-slate-200">~{result.estimatedWeightKg} kg</span>
                          </div>
                        )}
                      </div>
                    )}

                    {result.characteristics && result.characteristics.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold text-slate-300">Özellikler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.characteristics.map((c, i) => (
                            <span key={i} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-slate-200">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.habitat && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold text-slate-300">Yaşam Alanı</p>
                        <p className="text-xs leading-relaxed text-slate-200">{result.habitat}</p>
                      </div>
                    )}

                    {result.recommendedBaits && result.recommendedBaits.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold text-slate-300">Önerilen Yemler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.recommendedBaits.map((b, i) => (
                            <span key={i} className="rounded-full bg-lake-500/15 px-2.5 py-1 text-[11px] text-lake-200">{b}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.recommendedMethods && result.recommendedMethods.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold text-slate-300">Önerilen Yöntemler</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.recommendedMethods.map((m, i) => (
                            <span key={i} className="rounded-full bg-sand-500/15 px-2.5 py-1 text-[11px] text-sand-200">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.seasonalSuitability && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold text-slate-300">Mevsimsel Uygunluk</p>
                        <p className="text-xs leading-relaxed text-slate-200">{result.seasonalSuitability}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddToCatches}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lake-600 px-5 py-3.5 text-sm font-semibold text-white active:scale-95 transition-transform"
                  >
                    <Plus className="h-4 w-4" />
                    Avlarıma Ekle
                  </button>
                </div>
              )}

              {state === 'saving' && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-lake-300" />
                  <p className="text-sm text-slate-200">Av kaydediliyor...</p>
                </div>
              )}

              {state === 'saved' && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-500/20">
                    <Check className="h-8 w-8 text-success-300" />
                  </div>
                  <p className="text-sm font-semibold text-white">Av eklendi!</p>
                </div>
              )}

              {state === 'error' && (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-500/20">
                    <AlertTriangle className="h-8 w-8 text-coral-300" />
                  </div>
                  <p className="text-center text-sm text-coral-300">{error}</p>
                  <button
                    onClick={reset}
                    className="rounded-full bg-lake-600 px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function dataURLToFile(dataURL: string, filename: string): File {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}
