import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader as Loader2, Fish, TriangleAlert as AlertTriangle, Check, Plus, Upload } from 'lucide-react';
import { FishIdentificationResult } from '@/types/fishing';
import { supabase } from '@/lib/supabase';

interface FishIdentifyModalProps {
  open: boolean;
  onClose: () => void;
  onAddToCatches?: (result: FishIdentificationResult, photoUrl: string) => void;
}

export function FishIdentifyModal({ open, onClose, onAddToCatches }: FishIdentifyModalProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FishIdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setResult(null);
    setError(null);
    setAdded(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setResult(null);
    setError(null);
    setAdded(false);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleIdentify = async () => {
    if (!photoFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", photoFile);
      const { data, error: invokeError } = await supabase.functions.invoke("fish-identify", {
        body: formData,
      });
      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.result) throw new Error("Tanıma sonucu alınamadı");
      setResult(data.result as FishIdentificationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tanıma başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCatches = async () => {
    if (!result || !photoFile || !onAddToCatches) return;
    setAdded(true);
    onAddToCatches(result, photoPreview ?? "");
  };

  const lowConfidence = result && result.confidence < 75 && result.species !== "Bilinmiyor";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="ocean-bg relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-x border-white/10"
          >
            <div className="flex shrink-0 items-center justify-between glass px-5 py-3 pt-[max(env(safe-area-inset-top),12px)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lake-500/20">
                  <Fish className="h-4 w-4 text-lake-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Balık Tanıma</p>
                  <p className="text-[10px] text-slate-400">AI ile tür belirleme</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {!photoPreview && (
                <div className="flex flex-col items-center gap-4 pt-12">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass flex h-40 w-full max-w-xs flex-col items-center justify-center gap-3 rounded-2xl border-dashed text-lake-300 active:scale-95 transition-transform"
                  >
                    <Camera className="h-10 w-10" />
                    <span className="text-sm font-medium">Fotoğraf Çek veya Seç</span>
                  </button>
                  <p className="text-center text-xs text-slate-400">
                    Balığın net bir yan profil fotoğrafını yükleyin.
                    Daha doğru sonuç için arka plan sade olmalı.
                  </p>
                </div>
              )}

              {photoPreview && !result && !loading && (
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl shadow-lift">
                    <img src={photoPreview} alt="Yüklenen balık" className="h-56 w-full object-cover" />
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur active:scale-90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleIdentify}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lake-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lift active:scale-[0.98]"
                  >
                    <Fish className="h-4 w-4" />
                    Balığı Tanı
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center gap-3 pt-16">
                  <Loader2 className="h-8 w-8 animate-spin text-lake-300" />
                  <p className="text-sm text-slate-300">AI balığı analiz ediyor...</p>
                </div>
              )}

              {error && (
                <div className="space-y-3 pt-8">
                  <div className="flex items-start gap-2 rounded-xl bg-coral-500/20 px-4 py-3 text-sm text-coral-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                  <button
                    onClick={handleIdentify}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-lake-600 px-4 py-3 text-sm font-semibold text-white active:scale-95"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {photoPreview && (
                    <div className="relative overflow-hidden rounded-2xl shadow-lift">
                      <img src={photoPreview} alt={result.species} className="h-40 w-full object-cover" />
                    </div>
                  )}

                  {result.species === "Bilinmiyor" ? (
                    <div className="glass-card rounded-2xl p-4 text-center">
                      <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-coral-300" />
                      <p className="text-sm font-semibold text-white">Balık tespit edilemedi</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {result.characteristics?.[0] ?? "Daha net bir fotoğraf deneyin."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold text-white">{result.species}</p>
                            <p className="text-xs text-slate-400">
                              {lowConfidence ? "Olası" : "Tanımlandı"} · %{result.confidence} güven
                            </p>
                          </div>
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full"
                            style={{
                              background: result.confidence >= 85
                                ? "rgb(52 211 153 / 0.2)"
                                : result.confidence >= 75
                                ? "rgb(74 222 128 / 0.2)"
                                : "rgb(251 191 36 / 0.2)",
                            }}
                          >
                            <Check
                              className="h-5 w-5"
                              style={{
                                color: result.confidence >= 85
                                  ? "#34d399"
                                  : result.confidence >= 75
                                  ? "#4ade80"
                                  : "#fbbf24",
                              }}
                            />
                          </div>
                        </div>

                        {lowConfidence && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            Daha net bir yan profil fotoğrafı yükleyerek sonucu iyileştirebilirsin.
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {result.estimatedSizeCm != null && (
                            <InfoTile label="Tahmini Boy" value={`${result.estimatedSizeCm} cm`} />
                          )}
                          {result.estimatedWeightKg != null && (
                            <InfoTile label="Tahmini Ağırlık" value={`${result.estimatedWeightKg} kg`} />
                          )}
                        </div>

                        {result.characteristics && result.characteristics.length > 0 && (
                          <Section title="Özellikler">
                            <ul className="space-y-1">
                              {result.characteristics.map((c, i) => (
                                <li key={i} className="flex gap-1.5 text-xs text-slate-300">
                                  <span className="text-lake-300">•</span>
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </Section>
                        )}

                        {result.habitat && (
                          <Section title="Yaşam Alanı">
                            <p className="text-xs text-slate-300">{result.habitat}</p>
                          </Section>
                        )}

                        {result.recommendedBaits && result.recommendedBaits.length > 0 && (
                          <Section title="Önerilen Yemler">
                            <div className="flex flex-wrap gap-1.5">
                              {result.recommendedBaits.map((b, i) => (
                                <span key={i} className="glass rounded-full px-2.5 py-1 text-xs text-slate-200">{b}</span>
                              ))}
                            </div>
                          </Section>
                        )}

                        {result.recommendedMethods && result.recommendedMethods.length > 0 && (
                          <Section title="Önerilen Yöntemler">
                            <div className="flex flex-wrap gap-1.5">
                              {result.recommendedMethods.map((m, i) => (
                                <span key={i} className="glass rounded-full px-2.5 py-1 text-xs text-slate-200">{m}</span>
                              ))}
                            </div>
                          </Section>
                        )}

                        {result.seasonalSuitability && (
                          <Section title="Mevsimsel Uygunluk">
                            <p className="text-xs text-slate-300">{result.seasonalSuitability}</p>
                          </Section>
                        )}
                      </div>

                      {onAddToCatches && !added && (
                        <button
                          onClick={handleAddToCatches}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lake-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lift active:scale-[0.98]"
                        >
                          <Plus className="h-4 w-4" />
                          Avlarıma Ekle
                        </button>
                      )}

                      {added && (
                        <div className="flex items-center justify-center gap-2 rounded-2xl bg-success-600/20 px-5 py-3.5 text-sm font-semibold text-success-300">
                          <Check className="h-4 w-4" />
                          Avlarına eklendi
                        </div>
                      )}
                    </>
                  )}

                  <button
                    onClick={reset}
                    className="flex w-full items-center justify-center gap-2 rounded-xl glass px-4 py-2.5 text-sm text-slate-200 active:scale-95"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Başka Fotoğraf Yükle
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}
