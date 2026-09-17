import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const out = { checks: [] };
const add = (name, result, details = {}) => out.checks.push({ name, ok: !result.error, error: result.error ? { code: result.error.code, message: result.error.message } : null, ...details });
const media = await supabase.from('listing_media').select('storage_path,media_type').limit(5);
add('listing media metadata read', media, { rows: media.data?.length || 0 });
if (!media.error && media.data?.length) {
  const paths = media.data.map((row) => row.storage_path).filter(Boolean);
  const signed = await supabase.storage.from('listing-media').createSignedUrls(paths, 300);
  add('listing media signed URLs', signed, { requested: paths.length, resolved: (signed.data || []).filter((row) => row?.signedUrl).length });
}
const ads = await supabase.from('ad_campaigns').select('id,title,status,placement,image_url').eq('status','active').limit(10);
add('active ad campaigns read', ads, { rows: ads.data?.length || 0 });
const boosts = await supabase.from('boost_packages').select('id,name,price_kobo,is_active').eq('is_active', true).limit(10);
add('active boost packages read', boosts, { rows: boosts.data?.length || 0 });
console.log(JSON.stringify(out, null, 2));
