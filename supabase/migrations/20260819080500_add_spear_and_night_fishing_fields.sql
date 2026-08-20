/*
# Add zıpkın (spear fishing) and night-fishing fields to catches

1. Modified Tables
- `catches`
  - New column: `water_temp` (numeric, nullable) — Su Sıcaklığı (°C), yalnızca zıpkın için
  - New column: `water_visibility` (text, nullable) — Su Bulanıklığı (Berrak / Orta / Bulanık)
  - New column: `tidal_current` (text, nullable) — Gelgit Akıntısı şiddeti (Yok / Zayıf / Orta / Güçlü)
  - New column: `tidal_direction` (text, nullable) — Gelgit Akıntısı yönü (opsiyonel)
  - New column: `catch_time` (text, nullable) — Avın gerçekleştiği saat (HH:MM), gece/gündüz
    hesaplaması için kullanılır
  - New column: `cloud_cover` (numeric, nullable) — Av anındaki bulut örtüsü yüzdesi, ay ışığı
    parlaklığı hesaplamasını iyileştirmek için (hava durumu API'sinden alınabildiğinde)

2. Security
- No RLS policy changes. Existing policies already cover the new columns.

3. Notes
- All columns are nullable; existing records are unaffected.
- water_temp / water_visibility / tidal_current / tidal_direction yalnızca fishing_method
  "zipkin" olduğunda doldurulur.
- catch_time ve cloud_cover, istemci tarafında hesaplanan ay evresi / gece balıkçılığı
  bilgisini besler.
*/

ALTER TABLE catches
  ADD COLUMN IF NOT EXISTS water_temp numeric,
  ADD COLUMN IF NOT EXISTS water_visibility text,
  ADD COLUMN IF NOT EXISTS tidal_current text,
  ADD COLUMN IF NOT EXISTS tidal_direction text,
  ADD COLUMN IF NOT EXISTS catch_time text,
  ADD COLUMN IF NOT EXISTS cloud_cover numeric;
