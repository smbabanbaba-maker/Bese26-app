-- Complete Bese26 Storage rollout.
-- Public: listing photos, profile avatars, and business logos.
-- Private: chat attachments and verification/KYC documents.

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'listing-media', 'listing-media', true, 10485760,
    ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars', 'avatars', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'chat-media', 'chat-media', false, 12000000,
    ARRAY['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mpeg','application/pdf']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'verification-documents', 'verification-documents', false, 8000000,
    ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END;
$$;

-- Public read is intentional only for marketplace photos and profile/business images.
DROP POLICY IF EXISTS public_marketplace_media_read ON storage.objects;
CREATE POLICY public_marketplace_media_read
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('listing-media', 'avatars'));

-- Listing photo writes remain owner-only.
DROP POLICY IF EXISTS listing_media_object_insert ON storage.objects;
CREATE POLICY listing_media_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-media' AND public.user_owns_listing_storage_path(name));

DROP POLICY IF EXISTS listing_media_object_update ON storage.objects;
CREATE POLICY listing_media_object_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-media' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'listing-media' AND owner_id = auth.uid()::text);

DROP POLICY IF EXISTS listing_media_object_delete ON storage.objects;
CREATE POLICY listing_media_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-media' AND owner_id = auth.uid()::text);

-- Profile and business image writes remain owner-only.
DROP POLICY IF EXISTS avatar_object_insert ON storage.objects;
CREATE POLICY avatar_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatar_object_update ON storage.objects;
CREATE POLICY avatar_object_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

DROP POLICY IF EXISTS avatar_object_delete ON storage.objects;
CREATE POLICY avatar_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);

-- Chat attachments are private and visible only to conversation participants.
DROP POLICY IF EXISTS chat_media_object_insert ON storage.objects;
CREATE POLICY chat_media_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS chat_media_object_read ON storage.objects;
CREATE POLICY chat_media_object_read
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS chat_media_object_delete ON storage.objects;
CREATE POLICY chat_media_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- KYC documents remain private: owner and trusted moderators only.
DROP POLICY IF EXISTS verification_docs_insert ON storage.objects;
CREATE POLICY verification_docs_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS verification_docs_select ON storage.objects;
CREATE POLICY verification_docs_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS verification_docs_admin_select ON storage.objects;
CREATE POLICY verification_docs_admin_select
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-documents' AND public.current_user_can_moderate());
