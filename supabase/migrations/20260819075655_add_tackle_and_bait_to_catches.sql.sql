/*
# Add tackle and bait columns to catches

1. Modified Tables
- `catches`
  - New column: `tackle` (text, nullable) — Olta takımı (rod & line tackle/gear used, e.g. spin, surf, jig)
  - New column: `bait` (text, nullable) — Yem (bait used, e.g. worm, shrimp, artificial lure)
2. Security
- No RLS policy changes. Existing policies already cover the new columns.
3. Notes
- Both columns are nullable so existing and non-olta catches are unaffected.
- Only populated when the fishing method is "olta".
*/

ALTER TABLE catches
  ADD COLUMN IF NOT EXISTS tackle text,
  ADD COLUMN IF NOT EXISTS bait text;
