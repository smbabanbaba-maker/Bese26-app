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

export function getStoragePublicUrl(bucket, path) {
  if (!supabase || !path) return '';
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function getListingMediaUrls(paths = []) {
  if (!supabase || !paths.length) return [];
  // Listing media is intentionally public: marketplace visitors and shared
  // listing links must be able to load images without an authenticated session.
  return paths.map((path) => getStoragePublicUrl('listing-media', path));
}

export function getAvatarUrl(path) {
  return getStoragePublicUrl('avatars', path);
}
