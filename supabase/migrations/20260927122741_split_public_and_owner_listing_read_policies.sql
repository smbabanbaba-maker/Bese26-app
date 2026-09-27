-- Keep ownership/team checks behind authenticated-only policies. The former
-- anon policy called a helper whose EXECUTE privilege is intentionally withheld
-- from anon, causing public listing reads to fail with SQLSTATE 42501.
ALTER POLICY listings_public_or_owner_read ON public.listings TO authenticated;
CREATE POLICY listings_public_read ON public.listings
  FOR SELECT TO anon
  USING (status = 'active' AND moderation_status = 'approved');

ALTER POLICY listing_media_public_or_owner_read ON public.listing_media TO authenticated;
CREATE POLICY listing_media_public_read ON public.listing_media
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1
    FROM public.listings AS l
    WHERE l.id = listing_media.listing_id
      AND l.status = 'active'
      AND l.moderation_status = 'approved'
  ));
