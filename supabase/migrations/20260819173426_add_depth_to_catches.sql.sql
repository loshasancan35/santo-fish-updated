/*
# Add depth column to catches

1. Modified Tables
- `catches`
  - New column: `depth_m` (numeric, nullable) - Av anindaki balikcilik derinligi
    (metre cinsinden; yem/misina/zipkinin ne kadar derinde oldugu). `water_temp`
    alanindan farkli olarak bu, su sicakligini degil derinligi kaydeder.

2. Security
- No RLS policy changes. Existing policies already cover the new column.

3. Notes
- Idempotent: uses ADD COLUMN IF NOT EXISTS.
- No data loss: the column is nullable and defaults to NULL for existing rows.
*/

ALTER TABLE catches ADD COLUMN IF NOT EXISTS depth_m numeric;