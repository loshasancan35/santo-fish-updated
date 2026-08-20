/*
# Storage bucket for catch photos

1. Plain-English summary
   Creates a public storage bucket named `catch-photos` so the app can upload and
   display photos of each catch. The app has no login, so anyone using the app
   (the `anon` role) can upload and read photos.

2. Security
   - Bucket is public (read) so photo URLs work directly in <img> tags.
   - `anon` and `authenticated` roles may insert/select/update/delete objects only
     within the `catch-photos` bucket.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('catch-photos', 'catch-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_select_catch_photos" ON storage.objects;
CREATE POLICY "anon_select_catch_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'catch-photos');

DROP POLICY IF EXISTS "anon_insert_catch_photos" ON storage.objects;
CREATE POLICY "anon_insert_catch_photos" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'catch-photos');

DROP POLICY IF EXISTS "anon_update_catch_photos" ON storage.objects;
CREATE POLICY "anon_update_catch_photos" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'catch-photos') WITH CHECK (bucket_id = 'catch-photos');

DROP POLICY IF EXISTS "anon_delete_catch_photos" ON storage.objects;
CREATE POLICY "anon_delete_catch_photos" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'catch-photos');
