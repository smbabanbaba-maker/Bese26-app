import { getAvatarUrl, getListingMediaUrls, supabase } from './supabase';

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

export async function getProfileContacts(userId) {
  failIfUnavailable();
  const { data, error } = await supabase.from('profile_contacts').select('profile_id,phone,whatsapp,allow_calls,allow_whatsapp').eq('profile_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileContacts(userId, values) {
  failIfUnavailable();
  const { data, error } = await supabase.from('profile_contacts').upsert({ profile_id: userId, ...values }, { onConflict: 'profile_id' }).select().single();
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
    .limit(24);
  if (search.trim()) query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%,state.ilike.%${search.trim()}%`);
  if (category && category !== 'All') query = query.eq('category.name', category);
  const { data, error } = await query;
  if (error) throw error;
  return hydrateListingRows(data || [], { firstMediaOnly: true });
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

const listingSelect = 'id,seller_id,category_id,subcategory_id,title,description,price,currency,pricing_type,condition,quantity,unit,country,state,city,delivery_options,contact_preference,attributes,status,moderation_status,rejection_reason,created_at,updated_at,views_count,profiles:profiles!listings_seller_id_fkey(id,display_name,avatar_path,is_verified,seller_rating),category:categories!listings_category_id_fkey(name),subcategory:categories!listings_subcategory_id_fkey(name),listing_media(id,storage_path,media_type,sort_order)';

async function hydrateListingRows(rows = [], { firstMediaOnly = false } = {}) {
  const mediaByRow = rows.map((row) => ({
    row,
    media: [...(row.listing_media || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
  const signedEntries = mediaByRow.flatMap(({ row, media }) => (firstMediaOnly ? media.slice(0, 1) : media).map((item) => ({ key: `${row.id}:${item.storage_path}`, path: item.storage_path })));
  const signedUrls = await getListingMediaUrls(signedEntries.map((entry) => entry.path));
  const signedByKey = Object.fromEntries(signedEntries.map((entry, index) => [entry.key, signedUrls[index] || '']));
  return mediaByRow.map(({ row, media }) => mapListing({ ...row, listing_media: media.map((item) => ({ ...item, signed_url: signedByKey[`${row.id}:${item.storage_path}`] || '' })) }));
}

export async function fetchListingDetails(listingId) {
  failIfUnavailable();
  if (!listingId) return null;
  const { data, error } = await supabase.from('listings').select(listingSelect).eq('id', listingId).maybeSingle();
  if (error) throw error;
  const [listing] = await hydrateListingRows(data ? [data] : []);
  return listing || null;
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

export async function isAdminUser(userId) {
  failIfUnavailable();
  if (!userId) return false;
  const { data, error } = await supabase.rpc('current_user_can_moderate');
  if (error) throw error;
  return data === true;
}

export async function fetchPendingListings() {
  failIfUnavailable();
  const { data, error } = await supabase.from('listings').select(listingSelect).eq('status', 'pending').eq('moderation_status', 'pending').order('created_at', { ascending: true }).limit(100);
  if (error) throw error;
  return hydrateListingRows(data || []);
}

export async function moderateListing({ listingId, action, rejectionReason = null }) {
  failIfUnavailable();
  const { data, error } = await supabase.rpc('moderate_listing', {
    p_listing_id: listingId,
    p_action: action,
    p_rejection_reason: rejectionReason,
  });
  if (error) throw error;
  return data;
}

export async function reviseRejectedListing({ listingId, values }) {
  failIfUnavailable();
  const { data, error } = await supabase.rpc('revise_rejected_listing', {
    p_listing_id: listingId,
    p_category_id: values.categoryId,
    p_subcategory_id: values.subcategoryId || null,
    p_title: values.title,
    p_description: values.description,
    p_price: values.price,
    p_city: values.city,
    p_state: values.state,
    p_currency: values.currency || 'NGN',
    p_pricing_type: values.pricingType || 'fixed',
    p_condition: values.condition || null,
    p_quantity: values.quantity || null,
    p_unit: values.unit || null,
    p_country: values.country || 'Nigeria',
    p_delivery_options: values.deliveryOptions || [],
    p_contact_preference: values.contactPreference || 'chat',
    p_attributes: values.attributes || {},
  });
  if (error) throw error;
  return data;
}

export async function fetchModerationHistory() {
  failIfUnavailable();
  const { data, error } = await supabase
    .from('listing_moderation_events')
    .select('id,action,rejection_reason,created_at,listing:listings!listing_id(id,title,price,currency,city,state,status,moderation_status)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function fetchNotifications(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('notifications').select('id,notification_type,title,body,data,read_at,created_at').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId, userId) {
  failIfUnavailable();
  if (!notificationId || !userId) return;
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('recipient_id', userId);
  if (error) throw error;
}

export function subscribeToNotifications(userId, onInsert) {
  if (!supabase || !userId) return () => {};
  const channel = supabase.channel(`notifications:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, onInsert).subscribe();
  return () => { supabase.removeChannel(channel); };
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

export async function fetchConversations(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data: rows, error } = await supabase.from('conversations').select('id,listing_id,buyer_id,seller_id,last_message_at,updated_at,created_at').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  const conversations = rows || [];
  const listingIds = [...new Set(conversations.map((row) => row.listing_id).filter(Boolean))];
  const profileIds = [...new Set(conversations.flatMap((row) => [row.buyer_id, row.seller_id]).filter(Boolean))];
  const [{ data: listingRows, error: listingError }, { data: profileRows, error: profileError }] = await Promise.all([
    listingIds.length ? supabase.from('listings').select('id,title').in('id', listingIds).limit(100) : Promise.resolve({ data: [], error: null }),
    profileIds.length ? supabase.from('profiles').select('id,display_name,avatar_path,is_verified,seller_rating').in('id', profileIds).limit(200) : Promise.resolve({ data: [], error: null }),
  ]);
  if (listingError) throw listingError;
  if (profileError) throw profileError;
  const listingMap = Object.fromEntries((listingRows || []).map((row) => [row.id, row]));
  const profileMap = Object.fromEntries((profileRows || []).map((row) => [row.id, row]));
  return conversations.map((row) => ({ ...row, listing: listingMap[row.listing_id] || null, buyer: profileMap[row.buyer_id] || null, seller: profileMap[row.seller_id] || null }));
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
