import { getSupabaseAdmin } from '../lib/server/supabase.js';

const SITE_URL = 'https://www.bese26.shop';

function xmlEscape(value = '') {
  return String(value).replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[character]));
}

function isoDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

export default async function handler(_req, res) {
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: businesses, error: businessError }, { data: listings, error: listingError }, { data: profiles, error: profileError }] = await Promise.all([
      supabase.from('business_profiles').select('business_handle,updated_at,created_at,is_active').eq('is_active', true).not('business_handle', 'is', null).neq('business_handle', '').limit(5000),
      supabase.from('listings').select('id,updated_at,created_at').eq('status', 'active').eq('moderation_status', 'approved').limit(10000),
      supabase.from('profiles').select('username,updated_at,created_at').not('username', 'is', null).neq('username', '').limit(5000),
    ]);
    if (businessError) throw businessError;
    if (listingError) throw listingError;
    if (profileError) throw profileError;
    const urls = [
      { loc: `${SITE_URL}/`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '1.0' },
      ...(businesses || []).map((business) => ({ loc: `${SITE_URL}/@${encodeURIComponent(String(business.business_handle).toLowerCase())}`, lastmod: isoDate(business.updated_at || business.created_at), changefreq: 'daily', priority: '0.9' })),
      ...(profiles || []).map((profile) => ({ loc: `${SITE_URL}/@${encodeURIComponent(String(profile.username).toLowerCase())}`, lastmod: isoDate(profile.updated_at || profile.created_at), changefreq: 'weekly', priority: '0.7' })),
      ...(listings || []).map((listing) => ({ loc: `${SITE_URL}/listing/${encodeURIComponent(listing.id)}`, lastmod: isoDate(listing.updated_at || listing.created_at), changefreq: 'daily', priority: '0.8' })),
    ];
    const uniqueUrls = [...new Map(urls.map((item) => [item.loc, item])).values()];
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniqueUrls.map((item) => `<url><loc>${xmlEscape(item.loc)}</loc><lastmod>${xmlEscape(item.lastmod)}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`).join('')}</urlset>`;
    res.status(200).setHeader('Content-Type', 'application/xml; charset=utf-8').setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600').end(body);
  } catch (error) {
    res.status(500).setHeader('Content-Type', 'application/xml; charset=utf-8').end(`<?xml version="1.0" encoding="UTF-8"?><error>${xmlEscape(error.message || 'Sitemap unavailable')}</error>`);
  }
}
