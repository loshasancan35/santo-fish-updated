/*
# Custom fish species table (no-auth, single-tenant)

1. Plain-English summary
   Allows users to create and save their own custom fish species that don't exist
   in the built-in knowledge base. Each custom species can have an optional tip/note.
   Saved species appear in the species dropdown for future catches.

2. New Tables
   - `custom_species`
     - `id` (uuid, primary key) - unique record id
     - `name` (text, required, unique) - the species name (e.g. "Turna")
     - `tip` (text, optional) - a custom tip or note about this species
     - `photo_url` (text, optional) - URL to a representative photo
     - `created_at` (timestamptz) - record creation timestamp

3. Security
   - Row Level Security is enabled.
   - Because the app has no sign-in, policies grant full CRUD to both `anon` and
     `authenticated` roles. The data is intentionally shared/public.

4. Notes
   - The `name` column has a unique constraint so duplicate species are avoided.
*/

CREATE TABLE IF NOT EXISTS custom_species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tip text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_custom_species" ON custom_species;
CREATE POLICY "anon_select_custom_species" ON custom_species FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_custom_species" ON custom_species;
CREATE POLICY "anon_insert_custom_species" ON custom_species FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_custom_species" ON custom_species;
CREATE POLICY "anon_update_custom_species" ON custom_species FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_custom_species" ON custom_species;
CREATE POLICY "anon_delete_custom_species" ON custom_species FOR DELETE
  TO anon, authenticated USING (true);
