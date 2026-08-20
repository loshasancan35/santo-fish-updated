/*
# Fishing log schema (no-auth, single-tenant)

1. Plain-English summary
   This app has no login, so every visitor shares the same data (like a shared logbook).
   It stores fishing catch records and a small list of named locations the user has saved.

2. New Tables
   - `catches`
     - `id` (uuid, primary key) - unique record id
     - `fish_name` (text, required) - the name the user gave the fish
     - `species` (text, optional) - fish species (e.g. Levrek, Çipura)
     - `photo_url` (text, optional) - public URL of the uploaded catch photo
     - `lat` (double precision, optional) - latitude where the catch happened
     - `lng` (double precision, optional) - longitude where the catch happened
     - `location_name` (text, optional) - human readable location label
     - `catch_date` (date, required, defaults to today) - date of the catch
     - `weather_temp` (numeric, optional) - temperature (°C) recorded at catch time
     - `weather_condition` (text, optional) - short weather description
     - `season` (text, optional) - Turkish season name derived from the date
     - `notes` (text, optional) - free-form notes
     - `created_at` (timestamptz) - record creation timestamp
   - `locations`
     - `id` (uuid, primary key) - unique record id
     - `name` (text, required) - saved location label
     - `lat` (double precision, required) - latitude
     - `lng` (double precision, required) - longitude
     - `created_at` (timestamptz) - record creation timestamp

3. Security
   - Row Level Security is enabled on both tables.
   - Because the app has no sign-in, policies grant full CRUD to both the `anon` and
     `authenticated` roles (`USING (true)` / `WITH CHECK (true)`). This is intentional:
     the data is a shared, public logbook, not per-user private data.

4. Notes
   - No foreign key relationship is enforced between `catches` and `locations` since a
     catch may use an ad-hoc location that was never saved to `locations`.
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fish_name text NOT NULL,
  species text,
  photo_url text,
  lat double precision,
  lng double precision,
  location_name text,
  catch_date date NOT NULL DEFAULT CURRENT_DATE,
  weather_temp numeric,
  weather_condition text,
  season text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catches_catch_date ON catches (catch_date);
CREATE INDEX IF NOT EXISTS idx_catches_season ON catches (season);
CREATE INDEX IF NOT EXISTS idx_catches_lat_lng ON catches (lat, lng);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locations" ON locations;
CREATE POLICY "anon_select_locations" ON locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
CREATE POLICY "anon_insert_locations" ON locations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_locations" ON locations;
CREATE POLICY "anon_update_locations" ON locations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
CREATE POLICY "anon_delete_locations" ON locations FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_catches" ON catches;
CREATE POLICY "anon_select_catches" ON catches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_catches" ON catches;
CREATE POLICY "anon_insert_catches" ON catches FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_catches" ON catches;
CREATE POLICY "anon_update_catches" ON catches FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_catches" ON catches;
CREATE POLICY "anon_delete_catches" ON catches FOR DELETE
  TO anon, authenticated USING (true);
