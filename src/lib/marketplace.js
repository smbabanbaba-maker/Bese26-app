import { getAvatarUrl, getListingMediaUrl, supabase } from './supabase';

function failIfUnavailable() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

function formatNaira(value) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function relativeTime(value) {
  if (!value) return 'Recently';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(value = 'bese26 user') {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BE';
}

export function mapListing(row) {
  const media = [...(row.listing_media || [])].sort((a, b) => a.sort_order - b.sort_order);
  const gallery = media.map((item) => item.signed_url || '').filter(Boolean);
  const seller = row.profiles || {};
  const category = row.category || row.categories || {};
  const subcategory = row.subcategory || {};
  const location = [row.city, row.state].filter(Boolean).join(', ') || row.country || 'Nigeria';
  const numericPrice = row.price == null ? 0 : Number(row.price);
  return {
    id: row.id,
    title: row.title,
    price: row.price == null ? 'Contact seller' : formatNaira(row.price),
    numericPrice,
    location,
    condition: row.condition || 'See description',
    posted: relativeTime(row.created_at),
    image: gallery[0] || '',
    gallery,
    category: category.name || 'Marketplace',
    subcategory: subcategory.name || '',
    seller: seller.display_name || 'bese26 seller',
    sellerId: row.seller_id,
    sellerAvatar: getAvatarUrl(seller.avatar_path),
    sellerInitials: initials(seller.display_name),
    sellerRating: Number(seller.seller_rating || 0),
    verified: Boolean(seller.is_verified),
    promoted: false,
    description: row.description || '',
    attributes: row.attributes || {},
    deliveryOptions: row.delivery_options || [],
    raw: row,
  };
}

export async function getCurrentSession() {
  if (!supabase) return { session: null, user: null };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { session: data.session, user: data.session?.user || null };
}

export async function signUp({ email, password, displayName, username }) {
  failIfUnavailable();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  failIfUnavailable();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  failIfUnavailable();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId) {
  failIfUnavailable();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, values) {
  failIfUnavailable();
  const { data, error } = await supabase.from('profiles').update(values).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function fetchActiveListings({ search = '', category = '' } = {}) {
  if (!supabase) return [];
  let query = supabase
    .from('listings')
    .select(listingSelect)
    .eq('status', 'active')
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);
  if (search.trim()) query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%,state.ilike.%${search.trim()}%`);
  if (category && category !== 'All') query = query.eq('category.name', category);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data || []).map(async (row) => {
    const media = [...(row.listing_media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const signedUrls = await Promise.all(media.map((item) => getListingMediaUrl(item.storage_path)));
    return mapListing({ ...row, listing_media: media.map((item, index) => ({ ...item, signed_url: signedUrls[index] })) });
  }));
}

export async function fetchCategories() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('categories').select('id,parent_id,name,slug,icon,sort_order').eq('is_active', true).order('sort_order').limit(100);
  if (error) throw error;
  return data || [];
}

export async function fetchSavedIds(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.from('listing_favorites').select('listing_id').eq('user_id', userId).limit(200);
  if (error) throw error;
  return (data || []).map((item) => item.listing_id);
}

const listingSelect = '*, profiles:profiles!listings_seller_id_fkey(id,display_name,avatar_path,is_verified,seller_rating), category:categories!listings_category_id_fkey(name), subcategory:categories!listings_subcategory_id_fkey(name), listing_media(id,storage_path,media_type,sort_order)';

async function hydrateListingRows(rows = []) {
  return Promise.all(rows.map(async (row) => {
    const media = [...(row.listing_media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const signedUrls = await Promise.all(media.map((item) => getListingMediaUrl(item.storage_path)));
    return mapListing({ ...row, listing_media: media.map((item, index) => ({ ...item, signed_url: signedUrls[index] })) });
  }));
}

export async function fetchMyListings({ sellerId, status = 'all' } = {}) {
  failIfUnavailable();
  if (!sellerId) return [];
  let query = supabase.from('listings').select(listingSelect).eq('seller_id', sellerId).order('updated_at', { ascending: false }).limit(200);
  if (status === 'active') query = query.eq('status', 'active');
  if (status === 'pending') query = query.in('status', ['draft', 'pending']);
  if (status === 'sold') query = query.eq('status', 'sold');
  if (status === 'archived') query = query.in('status', ['archived', 'rejected']);
  const { data, error } = await query;
  if (error) throw error;
  return hydrateListingRows(data || []);
}

export async function fetchSellerStats(userId) {
  failIfUnavailable();
  if (!userId) return { listings: 0, sold: 0, saved: 0, reviews: 0, rating: 0, views: 0 };
  const [{ data: listingRows, error: listingError }, savedIds, { data: profile, error: profileError }] = await Promise.all([
    supabase.from('listings').select('id,status,views_count').eq('seller_id', userId).limit(1000),
    fetchSavedIds(userId),
    supabase.from('profiles').select('seller_rating,seller_rating_count').eq('id', userId).maybeSingle(),
  ]);
  if (listingError) throw listingError;
  if (profileError) throw profileError;
  const rows = listingRows || [];
  return {
    listings: rows.length,
    sold: rows.filter((row) => row.status === 'sold').length,
    saved: savedIds.length,
    reviews: Number(profile?.seller_rating_count || 0),
    rating: Number(profile?.seller_rating || 0),
    views: rows.reduce((total, row) => total + Number(row.views_count || 0), 0),
  };
}

export async function toggleFavorite(userId, listingId, shouldSave) {
  failIfUnavailable();
  if (shouldSave) {
    const { error } = await supabase.from('listing_favorites').upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('listing_favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw error;
  }
}

export async function saveListingDraft({ id, sellerId, title, payload }) {
  failIfUnavailable();
  const values = { ...(id ? { id } : {}), seller_id: sellerId, title: title || null, payload, last_saved_at: new Date().toISOString() };
  const request = id
    ? supabase.from('listing_drafts').update(values).eq('id', id).eq('seller_id', sellerId).select().single()
    : supabase.from('listing_drafts').insert(values).select().single();
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function createListing({ sellerId, values }) {
  failIfUnavailable();
  const { data, error } = await supabase.from('listings').insert({ ...values, seller_id: sellerId, status: 'pending', moderation_status: 'pending' }).select().single();
  if (error) throw error;
  return data;
}

export async function uploadListingMedia({ userId, listingId, file, sortOrder = 0 }) {
  failIfUnavailable();
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${userId}/${listingId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('listing-media').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
  const { data, error } = await supabase.from('listing_media').insert({ listing_id: listingId, owner_id: userId, storage_path: path, media_type: mediaType, mime_type: file.type, file_size_bytes: file.size, sort_order: sortOrder }).select().single();
  if (error) throw error;
  return data;
}

export async function getOrCreateConversation({ listingId, buyerId, sellerId }) {
  failIfUnavailable();
  const { data: existing, error: findError } = await supabase.from('conversations').select('id,listing_id,buyer_id,seller_id').eq('listing_id', listingId).eq('buyer_id', buyerId).eq('seller_id', sellerId).maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;
  const { data, error } = await supabase.from('conversations').insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId }).select().single();
  if (error) throw error;
  return data;
}

export async function fetchMessages(conversationId) {
  failIfUnavailable();
  const { data, error } = await supabase.from('messages').select('id,conversation_id,sender_id,body,attachment_path,created_at,read_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(200);
  if (error) throw error;
  return data || [];
}

export async function sendMessage({ conversationId, senderId, body, attachmentPath = null }) {
  failIfUnavailable();
  const { data, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body: body || null, attachment_path: attachmentPath }).select().single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(conversationId, onMessage) {
  if (!supabase || !conversationId) return () => {};
  const channel = supabase.channel(`conversation-${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => onMessage(payload.new)).subscribe();
  return () => { supabase.removeChannel(channel); };
}
