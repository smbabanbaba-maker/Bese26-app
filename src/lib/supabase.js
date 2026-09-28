import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const browserSingleton = typeof window !== 'undefined' ? window.__bese26_supabase__ : null;

export const supabase = isSupabaseConfigured
  ? (browserSingleton || createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }))
  : null;

if (typeof window !== 'undefined' && isSupabaseConfigured && !window.__bese26_supabase__) {
  window.__bese26_supabase__ = supabase;
}

export function getStoragePublicUrl(bucket, path, options) {
  if (!supabase || !path) return '';
  const value = String(path).trim();
  if (!value) return '';
  // Some older rows contain a complete Storage URL rather than a relative path.
  if (/^https?:\/\//i.test(value)) return value;
  const cleanPath = value.replace(/^\/+/, '').replace(new RegExp(`^${bucket}/`, 'i'), '');
  return supabase.storage.from(bucket).getPublicUrl(cleanPath, options).data.publicUrl;
}

export function getOptimizedPublicImageUrl(url, { width = 1024, quality = 75, format = 'webp' } = {}) {
  if (!supabase || !url) return url || '';
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(supabaseUrl).origin) return url;
    const match = parsed.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return url;
    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);
    return getStoragePublicUrl(bucket, path, { transform: { width, quality, format } });
  } catch {
    return url;
  }
}

const listingMediaUrlCache = new Map();
let listingMediaInFlight = null;

export async function getListingMediaUrls(paths = []) {
  if (!supabase || !paths.length) return [];
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const now = Date.now();
  const missingPaths = uniquePaths.filter((path) => {
    const cached = listingMediaUrlCache.get(path);
    return !cached || cached.expiresAt <= now;
  });
  if (!missingPaths.length) return paths.map((path) => listingMediaUrlCache.get(path)?.url || '');
  if (listingMediaInFlight) {
    await listingMediaInFlight;
    const stillMissing = missingPaths.filter((path) => !listingMediaUrlCache.get(path)?.url);
    if (!stillMissing.length) return paths.map((path) => listingMediaUrlCache.get(path)?.url || '');
  }
  const refresh = async () => {
  // The bucket is public in the intended schema, but existing objects may not
  // be addressable through /object/public URLs after the storage rollout.
  // Signed URLs work for anonymous visitors and reliably resolve those objects.
    const { data, error } = await supabase.storage.from('listing-media').createSignedUrls(missingPaths, 3600);
    if (!error) (data || []).forEach((item, index) => {
      const url = item?.signedUrl || '';
      if (url) listingMediaUrlCache.set(missingPaths[index], { url, expiresAt: Date.now() + 50 * 60 * 1000 });
    });
  };
  listingMediaInFlight = refresh().finally(() => { listingMediaInFlight = null; });
  await listingMediaInFlight;
  return paths.map((path) => listingMediaUrlCache.get(path)?.url || '');
}

export function getAvatarUrl(path) {
  return getStoragePublicUrl('avatars', path, { transform: { width: 256, quality: 75, format: 'webp' } });
}
