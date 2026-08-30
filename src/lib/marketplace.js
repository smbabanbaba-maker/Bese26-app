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
export async function signInWithGoogle() {
  failIfUnavailable();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}
export async function signOut() {
  failIfUnavailable();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
export async function deleteMyAccount() {
  failIfUnavailable();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

export async function updatePassword(password) {
  failIfUnavailable();
  if (!password || password.length < 6) throw new Error('Use a password with at least 6 characters.');
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}

export async function fetchVerificationApplications(userId) {
  failIfUnavailable();
  const { data, error } = await supabase.from('verification_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function submitVerificationApplication(userId, values) {
  failIfUnavailable();
  const payload = { user_id: userId, verification_type: values.verification_type, full_name: values.full_name.trim(), phone: values.phone?.trim() || null, business_name: values.business_name?.trim() || null, business_handle: values.business_handle?.trim().toLowerCase() || null, notes: values.notes?.trim() || null, document_path: values.document_path || null, status: 'pending' };
  const { data, error } = await supabase.from('verification_applications').insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function fetchVerificationQueue() {
  failIfUnavailable();
  const { data, error } = await supabase.from('verification_applications').select('*,profile:profiles!verification_applications_user_id_fkey(display_name,username)').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function reviewVerificationApplication({ id, userId, status, reviewerNote }) {
  failIfUnavailable();
  const { data: currentUser } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('verification_applications').update({ status, reviewer_note: reviewerNote || null, reviewed_by: currentUser.user?.id || null, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  if (status === 'approved') { const { error: profileError } = await supabase.from('profiles').update({ is_verified: true }).eq('id', userId); if (profileError) throw profileError; }
  return data;
}
export async function uploadVerificationDocument({ userId, file }) {
  failIfUnavailable();
  if (!userId || !file) throw new Error('Choose a verification document first.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) throw new Error('Use JPG, PNG, WEBP, or PDF format.');
  if (file.size > 8000000) throw new Error('The document must be smaller than 8 MB.');
  const name = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${userId}/${crypto.randomUUID()}-${name}`;
  const { error } = await supabase.storage.from('verification-documents').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getProfile(userId) {
  failIfUnavailable();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_path,bio,city,state,country,account_type,is_verified,seller_rating,seller_rating_count,created_at,updated_at')
    .eq('id', userId)
    .maybeSingle();
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

export async function getProfilePreferences(userId) {
  failIfUnavailable();
  if (!userId) return null;
  const { data, error } = await supabase.from('profile_preferences').select('*').eq('profile_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfilePreferences(userId, values) {
  failIfUnavailable();
  const { data, error } = await supabase.from('profile_preferences').upsert({ profile_id: userId, ...values }, { onConflict: 'profile_id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar({ userId, file, previousPath = null }) {
  failIfUnavailable();
  if (!userId || !file) throw new Error('Choose a profile photo first.');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${userId}/${crypto.randomUUID()}-${safeName || 'profile-photo.jpg'}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  const profile = await updateProfile(userId, { avatar_path: path });
  if (previousPath && previousPath !== path) await supabase.storage.from('avatars').remove([previousPath]);
  return { profile, path, url: getAvatarUrl(path) };
}

export async function removeAvatar({ userId, path }) {
  failIfUnavailable();
  if (path) {
    const { error: removeError } = await supabase.storage.from('avatars').remove([path]);
    if (removeError) throw removeError;
  }
  return updateProfile(userId, { avatar_path: null });
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

export async function fetchPublicBusiness(handle) {
  failIfUnavailable();
  const normalized = String(handle || '').replace(/^@/, '').trim().toLowerCase();
  if (!normalized) return null;
  const { data: business, error: businessError } = await supabase.from('business_profiles').select('profile_id,business_name,business_handle,business_type,logo_path,category,description,phone,whatsapp,email,country,state,city,area,address,business_hours,website,social_links,delivery_available,pickup_available,years_in_business,public_contact,location_visibility,is_verified,is_active,created_at').eq('business_handle', normalized).eq('is_active', true).maybeSingle();
  if (businessError) throw businessError;
  if (!business || !business.is_verified) return null;
  const { data: ownerProfile, error: ownerError } = await supabase.from('profiles').select('id,display_name,username,avatar_path,bio,city,state,country,account_type,is_verified,seller_rating,seller_rating_count').eq('id', business.profile_id).maybeSingle();
  if (ownerError) throw ownerError;
  const { data: rows, error: listingsError } = await supabase.from('listings').select(listingSelect).eq('seller_id', business.profile_id).eq('status', 'active').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(60);
  if (listingsError) throw listingsError;
  const listings = await hydrateListingRows(rows || [], { firstMediaOnly: true });
  return { business, ownerProfile, listings };
}

export async function fetchPublicProfile(username) {
  failIfUnavailable();
  const normalized = String(username || '').replace(/^@/, '').trim().toLowerCase();
  if (!normalized) return null;
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,username,display_name,avatar_path,bio,city,state,country,account_type,is_verified,seller_rating,seller_rating_count,created_at').eq('username', normalized).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;
  const { data: rows, error: listingsError } = await supabase.from('listings').select(listingSelect).eq('seller_id', profile.id).eq('status', 'active').eq('moderation_status', 'approved').order('created_at', { ascending: false }).limit(60);
  if (listingsError) throw listingsError;
  return { profile, listings: await hydrateListingRows(rows || [], { firstMediaOnly: true }) };
}

export async function fetchBusinessDirectory(search = '') {
  failIfUnavailable();
  let query = supabase.from('business_profiles').select('profile_id,business_name,business_handle,business_type,logo_path,category,description,country,state,city,delivery_available,pickup_available,is_verified,is_active').eq('is_active', true).eq('is_verified', true).order('business_name').limit(60);
  const value = String(search || '').trim();
  if (value) query = query.or(`business_name.ilike.%${value}%,business_handle.ilike.%${value}%,category.ilike.%${value}%,city.ilike.%${value}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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
    p_delivery_options: Array.isArray(values.deliveryOptions) ? values.deliveryOptions : [],
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
  if (!userId) return { listings: 0, active: 0, sold: 0, pending: 0, saved: 0, reviews: 0, rating: 0, views: 0, inquiries: 0 };
  const [{ data: listingRows, error: listingError }, savedIds, { data: profile, error: profileError }, { count: inquiryCount, error: inquiryError }] = await Promise.all([
    supabase.from('listings').select('id,status,views_count').eq('seller_id', userId).limit(1000),
    fetchSavedIds(userId),
    supabase.from('profiles').select('seller_rating,seller_rating_count').eq('id', userId).maybeSingle(),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('seller_id', userId),
  ]);
  if (listingError) throw listingError;
  if (profileError) throw profileError;
  if (inquiryError) throw inquiryError;
  const rows = listingRows || [];
  return {
    listings: rows.length,
    active: rows.filter((row) => row.status === 'active').length,
    sold: rows.filter((row) => row.status === 'sold').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    saved: savedIds.length,
    reviews: Number(profile?.seller_rating_count || 0),
    rating: Number(profile?.seller_rating || 0),
    views: rows.reduce((total, row) => total + Number(row.views_count || 0), 0),
    inquiries: inquiryCount || 0,
  };
}

export async function fetchSavedListings(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const savedIds = await fetchSavedIds(userId);
  if (!savedIds.length) return [];
  const { data, error } = await supabase.from('listings').select(listingSelect).in('id', savedIds).limit(200);
  if (error) throw error;
  return hydrateListingRows(data || [], { firstMediaOnly: true });
}
export async function recordRecentlyViewed(userId, listingId) {
  failIfUnavailable();
  if (!userId || !listingId) return;
  const { error } = await supabase.from('recently_viewed').upsert({ user_id: userId, listing_id: listingId, viewed_at: new Date().toISOString() });
  if (error) throw error;
}
export async function fetchRecentlyViewed(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('recently_viewed').select('listing_id,viewed_at,listing:listings!listing_id(*)').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(50);
  if (error) throw error;
  return hydrateListingRows((data || []).map((item) => item.listing).filter(Boolean), { firstMediaOnly: true });
}
export async function removeRecentlyViewed(userId, listingId) {
  failIfUnavailable();
  const { error } = await supabase.from('recently_viewed').delete().eq('user_id', userId).eq('listing_id', listingId);
  if (error) throw error;
}
export async function clearRecentlyViewed(userId) {
  failIfUnavailable();
  const { error } = await supabase.from('recently_viewed').delete().eq('user_id', userId);
  if (error) throw error;
}
export async function fetchMyDrafts(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('listing_drafts').select('id,title,payload,last_saved_at,created_at,updated_at').eq('seller_id', userId).order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function fetchProfileReviews(userId, mode = 'about') {
  failIfUnavailable();
  if (!userId) return [];
  const column = mode === 'mine' ? 'reviewer_id' : 'reviewee_id';
  const { data, error } = await supabase
    .from('reviews')
    .select('id,listing_id,reviewer_id,reviewee_id,rating,body,status,created_at,listing:listings!listing_id(id,title),reviewer:profiles!reviews_reviewer_id_fkey(id,display_name,avatar_path),reviewee:profiles!reviews_reviewee_id_fkey(id,display_name,avatar_path)')
    .eq(column, userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function fetchSavedSearches(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('saved_searches').select('id,query,category,location,min_price,max_price,filters,alerts_enabled,created_at,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function saveSavedSearch(userId, values) {
  failIfUnavailable();
  const payload = {
    ...(values.id ? { id: values.id } : {}),
    user_id: userId,
    query: String(values.query || '').trim(),
    category: values.category || null,
    location: values.location || null,
    min_price: values.min_price === '' || values.min_price == null ? null : Number(values.min_price),
    max_price: values.max_price === '' || values.max_price == null ? null : Number(values.max_price),
    filters: values.filters || {},
    alerts_enabled: values.alerts_enabled !== false,
  };
  if (!payload.query && !payload.category && !payload.location) throw new Error('Add a search, category, or location before saving.');
  const { data, error } = await supabase.from('saved_searches').upsert(payload).select('id,query,category,location,min_price,max_price,filters,alerts_enabled,created_at,updated_at').single();
  if (error) throw error;
  return data;
}

export async function deleteSavedSearch(userId, searchId) {
  failIfUnavailable();
  const { error } = await supabase.from('saved_searches').delete().eq('id', searchId).eq('user_id', userId);
  if (error) throw error;
}

export async function getBusinessProfile(userId) {
  failIfUnavailable();
  if (!userId) return null;
  const { data, error } = await supabase.from('business_profiles').select('profile_id,business_name,business_handle,business_type,logo_path,category,description,phone,whatsapp,email,country,state,city,area,address,business_hours,website,social_links,registration_number,delivery_available,pickup_available,years_in_business,is_active,public_contact,location_visibility,is_verified,created_at,updated_at').eq('profile_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveBusinessProfile(userId, values) {
  failIfUnavailable();
  const payload = {
    profile_id: userId,
    business_name: String(values.business_name || '').trim(),
    business_handle: String(values.business_handle || '').trim().replace(/^@/, '').toLowerCase() || null,
    business_type: values.business_type || null,
    logo_path: values.logo_path || null,
    category: values.category || null,
    description: values.description || null,
    phone: values.phone || null,
    whatsapp: values.whatsapp || null,
    email: values.email || null,
    country: values.country || 'Nigeria',
    state: values.state || null,
    city: values.city || null,
    area: values.area || null,
    address: values.address || null,
    business_hours: values.business_hours || {},
    website: values.website || null,
    social_links: values.social_links || {},
    registration_number: values.registration_number || null,
    delivery_available: Boolean(values.delivery_available),
    pickup_available: values.pickup_available !== false,
    years_in_business: values.years_in_business === '' || values.years_in_business == null ? null : Number(values.years_in_business),
    public_contact: Boolean(values.public_contact),
    location_visibility: values.location_visibility || 'city',
  };
  if (!payload.business_name) throw new Error('Business name is required.');
  if (payload.business_handle && !/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(payload.business_handle)) throw new Error('Use 3–30 lowercase letters, numbers, or hyphens for the business handle.');
  const { data, error } = await supabase.from('business_profiles').upsert(payload).select('profile_id,business_name,business_handle,business_type,logo_path,category,description,phone,whatsapp,email,country,state,city,area,address,business_hours,website,social_links,registration_number,delivery_available,pickup_available,years_in_business,is_active,public_contact,location_visibility,is_verified,created_at,updated_at').single();
  if (error) throw error;
  return data;
}

export async function uploadBusinessLogo({ userId, file, previousPath = null }) {
  failIfUnavailable();
  if (!userId || !file || !file.type.startsWith('image/')) throw new Error('Choose a valid business logo image.');
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${userId}/business/${crypto.randomUUID()}-${safeName || 'business-logo.jpg'}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;
  if (previousPath) await supabase.storage.from('avatars').remove([previousPath]);
  return { path, url: getAvatarUrl(path) };
}

export async function fetchBlockedUsers(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('profile_blocks').select('blocked_id,created_at,blocked:profiles!profile_blocks_blocked_id_fkey(id,display_name,username,avatar_path)').eq('blocker_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function blockUser(userId, blockedId) {
  failIfUnavailable();
  if (!blockedId || userId === blockedId) throw new Error('You cannot block this profile.');
  const { error } = await supabase.from('profile_blocks').insert({ blocker_id: userId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(userId, blockedId) {
  failIfUnavailable();
  const { error } = await supabase.from('profile_blocks').delete().eq('blocker_id', userId).eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function submitUserReport(userId, values) {
  failIfUnavailable();
  const reason = String(values.reason || '').trim();
  if (!reason) throw new Error('Choose a report reason.');
  const { data, error } = await supabase.from('user_reports').insert({ reporter_id: userId, target_type: values.target_type || 'user', target_id: values.target_id || null, reason, description: values.description || null }).select('id,target_type,target_id,reason,description,status,created_at,updated_at').single();
  if (error) throw error;
  return data;
}

export async function fetchMyReports(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('user_reports').select('id,target_type,target_id,reason,description,status,created_at,updated_at').eq('reporter_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

export async function getFollowState(userId, targetId) {
  failIfUnavailable();
  if (!userId || !targetId || userId === targetId) return { following: false, followers: 0, followingCount: 0 };
  const [{ data: relation, error: relationError }, { count: followers, error: followerError }, { count: followingCount, error: followingError }] = await Promise.all([
    supabase.from('profile_follows').select('follower_id').eq('follower_id', userId).eq('following_id', targetId).maybeSingle(),
    supabase.from('profile_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', targetId),
    supabase.from('profile_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', targetId),
  ]);
  if (relationError) throw relationError;
  if (followerError) throw followerError;
  if (followingError) throw followingError;
  return { following: Boolean(relation), followers: followers || 0, followingCount: followingCount || 0 };
}

export async function toggleFollow(userId, targetId, shouldFollow) {
  failIfUnavailable();
  if (!targetId || userId === targetId) throw new Error('You cannot follow this profile.');
  if (shouldFollow) {
    const { error } = await supabase.from('profile_follows').upsert({ follower_id: userId, following_id: targetId }, { onConflict: 'follower_id,following_id' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('profile_follows').delete().eq('follower_id', userId).eq('following_id', targetId);
    if (error) throw error;
  }
}

export async function fetchProfileRelations(userId, mode = 'followers') {
  failIfUnavailable();
  if (!userId) return [];
  const isFollowers = mode === 'followers';
  const column = isFollowers ? 'following_id' : 'follower_id';
  const relation = isFollowers ? 'follower:profiles!profile_follows_follower_id_fkey(id,display_name,username,avatar_path,is_verified)' : 'following:profiles!profile_follows_following_id_fkey(id,display_name,username,avatar_path,is_verified)';
  const { data, error } = await supabase.from('profile_follows').select(`follower_id,following_id,created_at,${relation}`).eq(column, userId).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
}

export async function fetchFollowSummary(userId) {
  failIfUnavailable();
  if (!userId) return { followers: 0, following: 0 };
  const [{ count: followers, error: followersError }, { count: following, error: followingError }] = await Promise.all([
    supabase.from('profile_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('profile_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  if (followersError) throw followersError;
  if (followingError) throw followingError;
  return { followers: followers || 0, following: following || 0 };
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

export async function fetchSellerEntitlement() {
  failIfUnavailable();
  const { data, error } = await supabase.rpc('get_seller_entitlement');
  if (error) throw error;
  return data?.[0] || { plan_key: 'free', subscription_status: 'inactive', is_paid: false, free_posts_limit: 3, free_posts_used: 0, free_posts_remaining: 3, listing_limit: 3, current_period_end: null };
}

export async function fetchPaymentHistory(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('payment_transactions').select('id,plan_key,reference,amount_kobo,currency,status,provider_subscription_id,created_at,updated_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return data || [];
}

async function getAccessToken() {
  failIfUnavailable();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (session?.access_token) return session.access_token;
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  if (!refreshed.session?.access_token) throw new Error('Your session is not available. Sign in again.');
  return refreshed.session.access_token;
}

async function callPaystackEndpoint(path, body) {
  const accessToken = await getAccessToken();
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not contact the payment service.');
  return payload;
}

export async function startPaystackCheckout(planKey) {
  return callPaystackEndpoint('/api/paystack/initialize', { planKey });
}

export async function verifyPaystackPayment(reference) {
  return callPaystackEndpoint('/api/paystack/verify', { reference });
}

export async function createListing({ sellerId, values }) {
  failIfUnavailable();
  if (!sellerId) throw new Error('Sign in before posting a listing.');
  const { data, error } = await supabase.rpc('create_listing_with_plan', {
    p_category_id: values.category_id,
    p_subcategory_id: values.subcategory_id || null,
    p_title: values.title,
    p_description: values.description,
    p_price: values.price,
    p_currency: values.currency || 'NGN',
    p_pricing_type: values.pricing_type || 'fixed',
    p_condition: values.condition || null,
    p_quantity: values.quantity || null,
    p_unit: values.unit || null,
    p_country: values.country || 'Nigeria',
    p_state: values.state,
    p_city: values.city,
    p_delivery_options: Array.isArray(values.delivery_options) ? values.delivery_options : [],
    p_contact_preference: values.contact_preference || 'chat',
    p_attributes: values.attributes || {},
  });
  if (error) {
    if (error.message?.includes('FREE_POST_LIMIT_REACHED')) throw new Error('Your 3 free posts have been used. Choose a subscription plan to post more listings.');
    throw error;
  }
  return Array.isArray(data) ? data[0] : data;
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

export async function fetchBoostPackages() {
  failIfUnavailable();
  const { data, error } = await supabase.from('boost_packages').select('id,name,duration_days,price_kobo,placement').eq('is_active', true).order('price_kobo').limit(20);
  if (error) throw error;
  return data || [];
}

export async function fetchMyBoosts(userId) {
  failIfUnavailable();
  if (!userId) return [];
  const { data, error } = await supabase.from('listing_boosts').select('id,listing_id,package_id,status,starts_at,ends_at,created_at,listing:listings!listing_id(title),package:boost_packages!package_id(name,placement)').eq('seller_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function initializeBoostPayment({ listingId, packageId }) {
  const token = await getAccessToken();
  const response = await fetch('/api/paystack/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: 'boost', listingId, packageId }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not start boost checkout.');
  return payload;
}
