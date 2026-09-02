import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  FileText,
  Globe2,
  Heart,
  Info,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react';
import { getAvatarUrl } from '../lib/supabase';
import nigeriaLocations from '../data/nigeriaLocations.json';
import {
  blockUser,
  deleteMyAccount,
  deleteSavedSearch,
  fetchBlockedUsers,
  fetchFollowSummary,
  fetchMyDrafts,
  fetchMyListings,
  fetchMyReports,
  fetchNotifications,
  fetchPaymentHistory,
  fetchProfileRelations,
  fetchProfileReviews,
  fetchVerificationApplications,
  fetchRecentlyViewed,
  fetchSavedListings,
  fetchSavedSearches,
  fetchSellerStats,
  fetchSellerEntitlement,
  fetchBoostPackages,
  fetchMyBoosts,
  initializeBoostPayment,
  getBusinessProfile,
  getProfile,
  getProfileContacts,
  getProfilePreferences,
  markNotificationRead,
  saveBusinessProfile,
  saveSavedSearch,
  removeAvatar,
  removeRecentlyViewed,
  clearRecentlyViewed,
  submitUserReport,

  unblockUser,
  updatePassword,
  updateProfile,
  updateProfileContacts,
  updateProfilePreferences,
  uploadAvatar,
  uploadBusinessLogo,
  submitVerificationApplication,
  uploadVerificationDocument,
} from '../lib/marketplace';

function initials(value = 'bese26 user') {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BE';
}

function Avatar({ name, path, size = 'md', tone = 'navy' }) {
  return path ? <img className={`avatar avatar-${size} profile-avatar-image`} src={getAvatarUrl(path)} alt={`${name || 'Profile'} profile`} /> : <div className={`avatar avatar-${tone} avatar-${size}`} aria-label={`${name || 'Profile'} initials`}>{initials(name)}</div>;
}

function VerifiedBadge({ verified }) {
  return verified ? <span className="verified-badge"><BadgeCheck size={13} strokeWidth={2.6} /> Verified</span> : <span className="profile-unverified"><Info size={13} /> Not verified</span>;
}

function SubpageHeader({ title, eyebrow, onBack }) {
  return <div className="profile-subpage-header"><button className="icon-button" type="button" onClick={onBack} aria-label={`Back from ${title}`}><ArrowLeft size={18} /></button><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div></div>;
}

function SectionLabel({ eyebrow, title }) {
  return <div className="profile-section-label"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div></div>;
}

function ProfileMenuCard({ item, onOpen }) {
  const Icon = item.icon;
  return <button type="button" className="profile-menu-card" onClick={() => onOpen(item.page)}><span className={`profile-menu-card-icon ${item.tone || ''}`}><Icon size={17} /></span><span className="profile-menu-card-copy"><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={16} /></button>;
}

function ToggleRow({ icon: Icon, label, description, checked, onChange, disabled = false }) {
  return <div className={`profile-toggle-row ${disabled ? 'is-disabled' : ''}`}><span className="profile-toggle-icon"><Icon size={16} /></span><span className="profile-toggle-copy"><strong>{label}</strong><small>{description}</small></span><button type="button" className={`profile-toggle ${checked ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(!checked)} aria-label={`Toggle ${label}`} aria-pressed={checked}><span /></button></div>;
}

async function prepareAvatarFile(file, rotation = 0) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The selected photo could not be read.'));
      element.src = objectUrl;
    });
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = cropSize;
    canvas.height = cropSize;
    const context = canvas.getContext('2d');
    context.translate(cropSize / 2, cropSize / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The photo could not be prepared.')), 'image/jpeg', 0.9));
    return new File([blob], 'bese26-profile-photo.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function EmptyState({ icon: Icon = Package, title, description, action, onAction }) {
  return <div className="empty-state compact-empty"><Icon size={24} /><h3>{title}</h3><p>{description}</p>{action && <button type="button" className="primary-button" onClick={onAction}>{action}<ArrowRight size={16} /></button>}</div>;
}

function UnavailablePage({ page, onBack }) {
  return <div className="profile-subpage"><SubpageHeader title={page.title} eyebrow={page.eyebrow || 'BESE26'} onBack={onBack} /><div className="future-card"><Info size={22} /><div><strong>{page.title} is not connected yet</strong><p>{page.description || 'This feature will appear here after its real marketplace service and secure backend are ready. No fake data is shown.'}</p></div></div></div>;
}

function ListingManager({ user, onBack, tab, setTab, onCreateListing, onEditListing, onOpenListing }) {
  const tabs = ['Active', 'Drafts', 'Pending', 'Sold', 'Paused', 'Expired', 'Rejected'];
  const statusByTab = { Active: 'active', Pending: 'pending', Sold: 'sold', Paused: 'paused', Expired: 'expired', Rejected: 'archived' };
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isDraftTab = tab === 'Drafts';
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    const request = isDraftTab ? fetchMyDrafts(user.id) : fetchMyListings({ sellerId: user.id, status: statusByTab[tab] });
    request.then((rows) => mounted && setItems(rows)).catch((requestError) => mounted && setError(requestError.message || 'Could not load your listings.')).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [isDraftTab, tab, user.id]);
  return <div className="profile-subpage"><SubpageHeader title="My Listings" eyebrow="SELLER CENTER" onBack={onBack} /><div className="profile-tabs profile-tabs-scroll">{tabs.map((name) => <button type="button" className={tab === name ? 'active' : ''} key={name} onClick={() => setTab(name)}>{name}{tab === name && !loading && <b>{items.length}</b>}</button>)}</div>{tab === 'Pending' && <div className="marketplace-note listing-review-note">Pending listings are visible only to you until they pass marketplace review.</div>}{error && <div className="auth-status error">{error}</div>}{loading ? <EmptyState title="Loading your listings" description="Getting the latest account data from Bese26." /> : items.length ? <div className="managed-listings">{isDraftTab ? items.map((draft) => <div className="managed-listing" key={draft.id}><div className="managed-listing-placeholder"><FileText size={20} /></div><div className="managed-listing-copy"><span className="status-pill pending">draft</span><strong>{draft.title || 'Untitled draft'}</strong><span><Clock3 size={12} /> Saved {new Date(draft.updated_at || draft.last_saved_at).toLocaleDateString()}</span><small className="profile-muted-note">Open Sell to continue editing this draft.</small></div></div>) : items.map((listing) => <div className="managed-listing" key={listing.id}>{listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" decoding="async" /> : <div className="managed-listing-placeholder"><Package size={20} /></div>}<div className="managed-listing-copy"><div className="managed-listing-top"><span className={`status-pill ${listing.raw?.status || tab.toLowerCase()}`}>{listing.raw?.status || tab.toLowerCase()}</span><span className="managed-listing-category">{listing.category}</span></div><strong>{listing.title}</strong><b>{listing.price}</b><span><MapPin size={12} /> {listing.location}</span><div className="managed-meta"><span><Eye size={12} /> {Number(listing.raw?.views_count || 0).toLocaleString()} views</span><span>{listing.subcategory || listing.condition || 'Marketplace listing'}</span></div><div className="profile-inline-actions"><button type="button" className="text-action" onClick={() => onOpenListing?.(listing)}>View</button>{listing.raw?.status === 'rejected' && <button type="button" className="secondary-button" onClick={() => onEditListing?.(listing)}>Edit & resubmit</button>}</div>{listing.raw?.status === 'rejected' && <div className="managed-rejection"><strong>Review feedback</strong><span>{listing.raw.rejection_reason || 'Please update the listing details and resubmit it.'}</span></div>}</div></div>)}</div> : <EmptyState title={`No ${tab.toLowerCase()} listings yet`} description={isDraftTab ? 'Drafts saved from Sell will appear here.' : 'Listings from your account will appear here with their current status.'} action={tab === 'Active' || tab === 'Drafts' ? 'Create new listing' : undefined} onAction={onCreateListing} />}<button type="button" className="primary-button full-width" onClick={onCreateListing}><Plus size={16} /> Create new listing</button></div>;
}

function SavedItemsPage({ user, onBack, onOpenListing, onToggleSave }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); fetchSavedListings(user.id).then(setItems).catch((requestError) => setError(requestError.message || 'Could not load your saved items.')).finally(() => setLoading(false)); };
  useEffect(load, [user.id]);
  return <div className="profile-subpage"><SubpageHeader title="Saved Items" eyebrow="MY MARKETPLACE" onBack={onBack} />{error && <div className="auth-status error">{error}</div>}{loading ? <EmptyState title="Loading saved items" description="Getting your saved listings from Bese26." /> : items.length ? <div className="saved-list profile-saved-list">{items.map((listing) => <div className="saved-row" key={listing.id}><button type="button" className="saved-row-media" onClick={() => onOpenListing?.(listing)} aria-label={`Open ${listing.title}`}>{listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" decoding="async" /> : <Package size={20} />}</button><button type="button" className="saved-row-copy" onClick={() => onOpenListing?.(listing)}><strong>{listing.title}</strong><span>{listing.seller} · {listing.location}</span><b>{listing.price}</b></button><button type="button" className="save-button saved" aria-label={`Remove ${listing.title} from saved`} onClick={() => { onToggleSave(listing.id); setItems((current) => current.filter((item) => item.id !== listing.id)); }}><Heart size={17} fill="currentColor" /></button></div>)}</div> : <EmptyState icon={Heart} title="No saved items yet" description="Listings you save from the marketplace will appear here." action="Explore marketplace" onAction={onBack} />}<button type="button" className="secondary-button full-width" onClick={load}><RefreshCw size={15} /> Refresh saved items</button></div>;
}

function RecentlyViewedPage({ user, onBack, onOpenListing, onNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); fetchRecentlyViewed(user.id).then(setItems).catch((requestError) => setError(requestError.message || 'Could not load recently viewed listings.')).finally(() => setLoading(false)); };
  useEffect(load, [user.id]);
  const remove = async (id) => { try { await removeRecentlyViewed(user.id, id); setItems((current) => current.filter((item) => item.id !== id)); onNotice('Removed from recently viewed.'); } catch (requestError) { setError(requestError.message || 'Could not remove this item.'); } };
  const clear = async () => { try { await clearRecentlyViewed(user.id); setItems([]); onNotice('Recently viewed history cleared.'); } catch (requestError) { setError(requestError.message || 'Could not clear history.'); } };
  return <div className="profile-subpage"><SubpageHeader title="Recently Viewed" eyebrow="MY MARKETPLACE" onBack={onBack} />{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}{loading ? <EmptyState title="Loading history" description="Getting your saved viewing history." /> : items.length ? <><div className="profile-inline-actions"><button type="button" className="secondary-button" onClick={load}><RefreshCw size={15} /> Refresh</button><button type="button" className="text-action danger-action" onClick={clear}><Trash2 size={15} /> Clear history</button></div><div className="saved-list profile-saved-list">{items.map((listing) => <div className="saved-row" key={listing.id}><button type="button" className="saved-row-media" onClick={() => onOpenListing?.(listing)} aria-label={`Open ${listing.title}`}>{listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" decoding="async" /> : <Package size={20} />}</button><button type="button" className="saved-row-copy" onClick={() => onOpenListing?.(listing)}><strong>{listing.title}</strong><span>{listing.seller} · {listing.location}</span><b>{listing.price}</b></button><button type="button" className="icon-button" onClick={() => remove(listing.id)} aria-label={`Remove ${listing.title} from history`}><Trash2 size={16} /></button></div>)}</div></> : <EmptyState icon={Clock3} title="No recently viewed listings" description="Listings you open will appear here across your devices after you sign in." />}</div>;
}

function ReviewsPage({ user, onBack }) {
  const [mode, setMode] = useState('about');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; setLoading(true); fetchProfileReviews(user.id, mode).then((rows) => mounted && setItems(rows)).catch((requestError) => mounted && setError(requestError.message || 'Could not load reviews.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [mode, user.id]);
  return <div className="profile-subpage"><SubpageHeader title="Reviews" eyebrow="TRUST & REPUTATION" onBack={onBack} /><div className="profile-tabs"><button type="button" className={mode === 'about' ? 'active' : ''} onClick={() => setMode('about')}>About me</button><button type="button" className={mode === 'mine' ? 'active' : ''} onClick={() => setMode('mine')}>My reviews</button></div>{error && <div className="auth-status error">{error}</div>}{loading ? <EmptyState title="Loading reviews" description="Getting reviews from the marketplace." /> : items.length ? <div className="history-list">{items.map((review) => { const person = mode === 'about' ? review.reviewer : review.reviewee; return <div key={review.id}><Avatar name={person?.display_name} path={person?.avatar_path} /><span><strong>{person?.display_name || 'Bese26 member'}</strong><small><Star size={11} fill="currentColor" /> {review.rating}/5 · {review.listing?.title || 'Marketplace listing'}</small><small>{review.body || 'No written comment.'}</small></span><b>{new Date(review.created_at).toLocaleDateString()}</b></div>; })}</div> : <EmptyState icon={Star} title={mode === 'about' ? 'No reviews yet' : 'You have not reviewed anyone yet'} description={mode === 'about' ? 'Published reviews from real marketplace interactions will appear here.' : 'Reviews you write after eligible interactions will appear here.'} />}</div>;
}

function AnalyticsPage({ user, onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let mounted = true; fetchSellerStats(user.id).then((data) => mounted && setStats(data)).catch(() => mounted && setStats(null)).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id]);
  const values = stats || {};
  return <div className="profile-subpage"><SubpageHeader title="Seller Analytics" eyebrow="SELLER TOOLS" onBack={onBack} />{loading ? <EmptyState title="Loading analytics" description="Calculating your real seller activity." /> : <><div className="analytics-stats"><div><Eye size={17} /><strong>{Number(values.views || 0).toLocaleString()}</strong><span>Total views</span></div><div><MessageCircle size={17} /><strong>{values.inquiries || 0}</strong><span>Buyer inquiries</span></div><div><ShoppingBag size={17} /><strong>{values.sold || 0}</strong><span>Sold listings</span></div><div><Package size={17} /><strong>{values.active || 0}</strong><span>Active listings</span></div></div><div className="analytics-card"><div className="analytics-card-head"><div><div className="eyebrow">LISTING PERFORMANCE</div><h2>Account overview</h2></div><BarChart3 size={20} /></div><p className="profile-help-note">Views and inquiry totals are read from your current marketplace records. Historical charts are not shown because no time-series analytics table exists yet.</p></div><div className="future-card"><Info size={20} /><div><strong>Not enough historical data yet</strong><p>Per-listing trends, conversion rates, and performance-over-time reports will appear after Bese26 adds an analytics event ledger.</p></div></div></>}</div>;
}

function NotificationPage({ user, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; fetchNotifications(user.id).then((rows) => mounted && setItems(rows)).catch((requestError) => mounted && setError(requestError.message || 'Could not load notifications.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id]);
  const markRead = async (item) => { if (item.read_at) return; try { await markNotificationRead(item.id, user.id); setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)); } catch (requestError) { setError(requestError.message || 'Could not mark notification as read.'); } };
  return <div className="profile-subpage"><SubpageHeader title="Notifications" eyebrow="ACCOUNT UPDATES" onBack={onBack} />{error && <div className="auth-status error">{error}</div>}{loading ? <EmptyState title="Loading notifications" description="Getting your account and marketplace updates." /> : items.length ? <div className="notification-list">{items.map((item) => <button type="button" key={item.id} className={`notification-row ${item.read_at ? '' : 'unread'}`} onClick={() => markRead(item)}><span className="notification-row-icon"><Bell size={16} /></span><span><strong>{item.title}</strong><small>{item.body || 'Bese26 account update'}</small><small>{new Date(item.created_at).toLocaleString()}</small></span>{!item.read_at && <i aria-label="Unread" />}</button>)}</div> : <EmptyState icon={Bell} title="No notifications yet" description="Important account, listing, and message updates will appear here." />}</div>;
}

function PersonalPage({ user, profile, onBack, onSaved, onAuthRequired }) {
  const [form, setForm] = useState({ displayName: profile?.display_name || '', username: profile?.username || '', phone: '', whatsapp: '', city: profile?.city || '', state: profile?.state || '', country: profile?.country || 'Nigeria', bio: profile?.bio || '', accountType: profile?.account_type || 'Individual' });
  const [contacts, setContacts] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : '');
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; getProfileContacts(user.id).then((data) => mounted && (setContacts(data), setForm((current) => ({ ...current, phone: data?.phone || '', whatsapp: data?.whatsapp || '' })))).catch((requestError) => mounted && setError(requestError.message || 'Could not load your contact details.')); return () => { mounted = false; }; }, [user.id]);
  useEffect(() => () => { if (photoPreview && photoFile) URL.revokeObjectURL(photoPreview); }, [photoPreview, photoFile]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const choosePhoto = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setError('Choose a JPG, PNG, or WEBP image.'); return; } setPhotoFile(file); setRotation(0); setPhotoPreview(URL.createObjectURL(file)); setError(''); event.target.value = ''; };
  const save = async () => { setSaving(true); setError(''); try { const savedProfile = await updateProfile(user.id, { display_name: form.displayName.trim() || 'bese26 user', username: form.username.trim().replace(/^@/, '') || null, bio: form.bio.trim() || null, city: form.city.trim() || null, state: form.state.trim() || null, country: form.country.trim() || 'Nigeria', account_type: form.accountType }); await updateProfileContacts(user.id, { phone: form.phone.trim() || null, whatsapp: form.whatsapp.trim() || null, allow_calls: contacts?.allow_calls ?? true, allow_whatsapp: contacts?.allow_whatsapp ?? true }); onSaved(savedProfile); } catch (requestError) { setError(requestError.message || 'Your profile could not be saved.'); } finally { setSaving(false); } };
  const uploadPhoto = async () => { if (!photoFile) return; setPhotoBusy(true); setError(''); try { const processedFile = await prepareAvatarFile(photoFile, rotation); const result = await uploadAvatar({ userId: user.id, file: processedFile, previousPath: profile?.avatar_path }); onSaved(result.profile); setPhotoFile(null); setRotation(0); setPhotoPreview(result.url); } catch (requestError) { setError(requestError.message || 'Your photo could not be uploaded. Please try again.'); } finally { setPhotoBusy(false); } };
  const deletePhoto = async () => { if (!profile?.avatar_path) return; setPhotoBusy(true); setError(''); try { const savedProfile = await removeAvatar({ userId: user.id, path: profile.avatar_path }); onSaved(savedProfile); setPhotoPreview(''); } catch (requestError) { setError(requestError.message || 'Your photo could not be removed. Please try again.'); } finally { setPhotoBusy(false); } };
  return <div className="profile-subpage"><SubpageHeader title="Personal Information" eyebrow="ACCOUNT" onBack={onBack} />{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<div className="personal-photo"><div className="profile-photo-editor">{photoPreview ? <img className="avatar avatar-xl profile-avatar-image" src={photoPreview} alt="Profile preview" style={{ transform: `rotate(${rotation}deg)` }} /> : <Avatar name={form.displayName} size="xl" />}<div className="photo-editor-actions"><label className="secondary-button">Choose photo<input className="hidden-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} /></label>{photoFile && <><button type="button" className="secondary-button" onClick={() => setRotation((value) => (value + 90) % 360)} disabled={photoBusy}>Rotate</button><button type="button" className="primary-button" onClick={uploadPhoto} disabled={photoBusy}>{photoBusy ? 'Uploading…' : 'Crop & upload'}</button></>}{profile?.avatar_path && !photoFile && <button type="button" className="text-action danger-action" onClick={deletePhoto} disabled={photoBusy}><Trash2 size={14} /> Remove photo</button>}</div><p className="profile-help-note">Use a clear image. It is stored in Bese26 persistent storage and reused across your listings.</p></div></div><div className="personal-fields"><label>Full name<input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} /></label><label>Username<input value={form.username ? `@${form.username.replace(/^@/, '')}` : ''} onChange={(event) => update('username', event.target.value.replace(/^@/, ''))} placeholder="Choose a username" /></label><label>Phone number<input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="e.g. +234 800 000 0000" /></label><label>WhatsApp number<input value={form.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} placeholder="Optional" /></label><label>Country<input value={form.country} onChange={(event) => update('country', event.target.value)} /></label><label>State<input value={form.state} onChange={(event) => update('state', event.target.value)} placeholder="e.g. Kano" /></label><label>City<input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="e.g. Kano Municipal" /></label><label>Account type<select value={form.accountType} onChange={(event) => update('accountType', event.target.value)}>{['Individual', 'Farmer', 'Seller', 'Business', 'Professional', 'Organization'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="full-field">Bio<textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Tell buyers a little about you" /></label><label className="full-field">Email<input value={user.email || ''} readOnly /></label></div><button type="button" className="primary-button full-width" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'} <Check size={16} /></button></div>;
}

function SettingsPage({ page, user, onBack, isDark, onToggleTheme, onNotice }) {
  const [preferences, setPreferences] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; const request = page.key === 'communication' ? getProfileContacts(user.id) : getProfilePreferences(user.id); request.then((data) => mounted && (page.key === 'communication' ? setContacts(data || {}) : setPreferences(data || {}))).catch((requestError) => mounted && setError(requestError.message || 'Could not load your preferences.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [page.key, user.id]);
  const current = page.key === 'communication' ? contacts || {} : preferences || {};
  const update = async (values) => { setSaving(true); setError(''); try { const next = page.key === 'communication' ? await updateProfileContacts(user.id, values) : await updateProfilePreferences(user.id, values); page.key === 'communication' ? setContacts(next) : setPreferences(next); if (values.theme) onToggleTheme(values.theme === 'dark'); onNotice('Preference saved.'); } catch (requestError) { setError(requestError.message || 'Your preference could not be saved.'); } finally { setSaving(false); } };
  if (loading) return <div className="profile-subpage"><SubpageHeader title={page.title} eyebrow={page.eyebrow} onBack={onBack} /><EmptyState title="Loading settings" description="Getting your saved preferences." /></div>;
  if (error) return <div className="profile-subpage"><SubpageHeader title={page.title} eyebrow={page.eyebrow} onBack={onBack} /><div className="auth-status error">{error}</div><button type="button" className="secondary-button" onClick={onBack}>Back</button></div>;
  if (page.key === 'language') return <div className="profile-subpage"><SubpageHeader title="Language & Region" eyebrow="PREFERENCES" onBack={onBack} /><div className="settings-card"><label className="settings-select-row"><span><Languages size={16} /> Interface language</span><select value={current.language || 'English'} disabled={saving} onChange={(event) => update({ language: event.target.value })}>{['English', 'Hausa', 'Yoruba', 'Igbo', 'Kanuri'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="settings-select-row"><span><WalletCards size={16} /> Currency</span><select value={current.currency || 'NGN'} disabled><option>NGN / ₦</option></select></label><label className="settings-select-row"><span><Globe2 size={16} /> Date format</span><select value={current.date_format || 'DD/MM/YYYY'} onChange={(event) => update({ date_format: event.target.value })}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></label></div><p className="profile-help-note">Language selection is stored in your Bese26 account. Full translation coverage will expand as each interface string is translated.</p></div>;
  if (page.key === 'appearance') return <div className="profile-subpage"><SubpageHeader title="Appearance" eyebrow="PREFERENCES" onBack={onBack} /><div className="appearance-options">{[['light', 'Light', 'Use the clean white marketplace theme', Moon], ['dark', 'Dark', 'Use the dark marketplace theme', Moon], ['system', 'System', 'Follow this device preference', Info]].map(([value, label, description, Icon]) => <button type="button" key={value} className={(current.theme || (isDark ? 'dark' : 'light')) === value ? 'selected' : ''} onClick={() => update({ theme: value })}><span><Icon size={17} /> <span><strong>{label}</strong><small>{description}</small></span></span>{(current.theme || (isDark ? 'dark' : 'light')) === value && <Check size={17} />}</button>)}</div></div>;
  if (page.key === 'privacy') return <div className="profile-subpage"><SubpageHeader title="Privacy" eyebrow="PREFERENCES" onBack={onBack} /><div className="settings-card"><ToggleRow icon={Eye} label="Profile visibility" description="Allow people to discover your seller profile" checked={current.profile_visibility !== false} onChange={(value) => update({ profile_visibility: value })} /><ToggleRow icon={MapPin} label="Show approximate location" description="Display your city, not your exact address" checked={current.show_approximate_location !== false} onChange={(value) => update({ show_approximate_location: value })} /><ToggleRow icon={Users} label="Show online status" description="Let buyers know when you are active" checked={current.show_online_status !== false} onChange={(value) => update({ show_online_status: value })} /><ToggleRow icon={Phone} label="Show phone number" description="Allow your phone to appear where supported" checked={current.show_phone_number === true} onChange={(value) => update({ show_phone_number: value })} /><ToggleRow icon={MessageCircle} label="Show email" description="Allow your email to appear where supported" checked={current.show_email === true} onChange={(value) => update({ show_email: value })} /><ToggleRow icon={Sparkles} label="Personalized recommendations" description="Use your activity to improve marketplace suggestions" checked={current.personalized_recommendations !== false} onChange={(value) => update({ personalized_recommendations: value })} /></div></div>;
  if (page.key === 'communication') return <div className="profile-subpage"><SubpageHeader title="Communication" eyebrow="PREFERENCES" onBack={onBack} /><div className="settings-card"><ToggleRow icon={Phone} label="Allow calls" description="Let buyers call when you choose phone contact" checked={current.allow_calls !== false} onChange={(value) => update({ allow_calls: value })} /><ToggleRow icon={MessageCircle} label="Allow WhatsApp" description="Allow WhatsApp contact where supported" checked={current.allow_whatsapp !== false} onChange={(value) => update({ allow_whatsapp: value })} /><ToggleRow icon={MessageCircle} label="Buyer messages" description="Receive conversations started from listings" checked={current.buyer_messages !== false} onChange={(value) => update({ buyer_messages: value })} /></div></div>;
  if (page.key === 'notifications') return <div className="profile-subpage"><SubpageHeader title="Notification Preferences" eyebrow="PREFERENCES" onBack={onBack} /><div className="settings-card"><ToggleRow icon={Bell} label="In-app notifications" description="Show important updates inside Bese26" checked={current.in_app_notifications !== false} onChange={(value) => update({ in_app_notifications: value })} /><ToggleRow icon={Bell} label="Email notifications" description="Receive non-critical marketplace updates by email" checked={current.email_notifications !== false} onChange={(value) => update({ email_notifications: value })} /></div><p className="profile-help-note">Critical security notifications cannot be disabled.</p></div>;
  return null;
}


const pageDefinitions = {
  listings: { title: 'My Listings', eyebrow: 'SELLER CENTER' },
  saved: { title: 'Saved Items', eyebrow: 'MY MARKETPLACE' },
  drafts: { title: 'Drafts', eyebrow: 'MY MARKETPLACE' },
  sold: { title: 'Sold Items', eyebrow: 'MY MARKETPLACE' },
  'saved-searches': { title: 'Saved Searches', eyebrow: 'MY MARKETPLACE' },
  'recently-viewed': { title: 'Recently Viewed', eyebrow: 'MY MARKETPLACE', description: 'Recently viewed history is not persisted by the current marketplace backend, so no fake history is shown.' },
  analytics: { title: 'Seller Analytics', eyebrow: 'SELLER TOOLS' },
  business: { title: 'Business Profile', eyebrow: 'SELLER TOOLS' },
  verification: { title: 'Verification & Trust', eyebrow: 'SELLER TOOLS' },
  reviews: { title: 'Reviews', eyebrow: 'TRUST & REPUTATION' },
  personal: { title: 'Personal Information', eyebrow: 'ACCOUNT' },
  security: { title: 'Login & Security', eyebrow: 'ACCOUNT', description: 'Password changes and sign-out use Supabase Auth. Connected accounts and active-session management require additional secure backend flows.' },
  'delete-account': { title: 'Delete Account', eyebrow: 'ACCOUNT ACTIONS', description: 'Account deletion requires a secure server-side workflow that can preserve legally required marketplace and financial records. It is not connected yet, so no destructive action is exposed.' },
  language: { title: 'Language & Region', eyebrow: 'PREFERENCES' },
  notifications: { title: 'Notifications', eyebrow: 'PREFERENCES' },
  'notification-settings': { title: 'Notification Preferences', eyebrow: 'PREFERENCES' },
  privacy: { title: 'Privacy', eyebrow: 'PREFERENCES' },
  communication: { title: 'Communication', eyebrow: 'PREFERENCES' },
  appearance: { title: 'Appearance', eyebrow: 'PREFERENCES' },
  wallet: { title: 'Wallet', eyebrow: 'PAYMENTS & SERVICES', description: 'Wallet, payments, and transaction records are not connected yet. No balance is shown.' },
  subscription: { title: 'Subscription', eyebrow: 'PAYMENTS & SERVICES', description: 'View seller plans and your free-post allowance.' },
  boosting: { title: 'Boosting', eyebrow: 'PAYMENTS & SERVICES', description: 'Listing promotion and boost payments are not connected yet. No advertising data is shown.' },
  'payment-history': { title: 'Payment History', eyebrow: 'PAYMENTS & SERVICES', description: 'View verified Paystack payments for your account.' },
  safety: { title: 'Safety Center', eyebrow: 'TRUST & SAFETY' },
  blocked: { title: 'Blocked Users', eyebrow: 'TRUST & SAFETY' },
  reports: { title: 'Reports', eyebrow: 'TRUST & SAFETY' },
  following: { title: 'Followers & Following', eyebrow: 'YOUR COMMUNITY' },
  help: { title: 'Help Center', eyebrow: 'SUPPORT' },
  support: { title: 'Contact Support', eyebrow: 'SUPPORT', description: 'Support ticket submission is not connected yet. Please use the Help Center and the published contact channel when it is available.' },
  terms: { title: 'Terms & Conditions', eyebrow: 'LEGAL' },
  'privacy-policy': { title: 'Privacy Policy', eyebrow: 'LEGAL' },
  prohibited: { title: 'Prohibited Items', eyebrow: 'LEGAL' },
  about: { title: 'About Bese26', eyebrow: 'ABOUT' },
};

function HelpPage({ onBack }) {
  const [open, setOpen] = useState(null);
  const faqs = [['How do I find products?', 'Use Home search or browse approved listings.'], ['How do I post a listing?', 'Open Sell, add your real photos and details, then submit it for review.'], ['How do I save a listing?', 'Open an approved listing and tap the heart icon. Saved listings require an account.'], ['How do I contact a seller?', 'Open an approved listing and tap Chat with seller to start a real conversation.'], ['Why is my listing not public?', 'New listings remain pending until a moderator approves them. Rejected listings include review feedback in My Listings.']];
  return <div className="profile-subpage"><SubpageHeader title="Help Center" eyebrow="SUPPORT" onBack={onBack} /><div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${open === index ? 'open' : ''}`} key={question}><button type="button" onClick={() => setOpen(open === index ? null : index)}><span><CircleHelp size={16} />{question}</span><ChevronRight size={16} className={open === index ? 'rotate-90' : ''} /></button>{open === index && <p>{answer}</p>}</div>)}</div><p className="profile-help-note">Answers reflect the Bese26 features currently connected to the real marketplace backend.</p></div>;
}

function SafetyPage({ onBack }) {
  return <div className="profile-subpage"><SubpageHeader title="Safety Center" eyebrow="TRUST & SAFETY" onBack={onBack} /><div className="safety-hero"><ShieldCheck size={22} /><div><h2>Protect yourself</h2><p>Good habits make every exchange more comfortable.</p></div></div><div className="safety-list">{['Avoid suspicious offers or pressure to pay quickly.', 'Meet in safe, public places and tell someone where you are going.', 'Inspect products before paying or sharing sensitive details.', 'Never share passwords, OTPs, or private financial details.', 'Keep communication inside Bese26 when possible.'].map((tip) => <div key={tip}><Check size={16} />{tip}</div>)}</div><p className="profile-help-note">Reporting and blocking workflows will be added when their secure moderation backend is connected.</p></div>;
}

function PolicyPage({ page, onBack }) {
  const policies = { terms: { title: 'Terms & Conditions', intro: 'These terms explain the rules for using the Bese26 marketplace in a safe and honest way.', sections: [['Using Bese26', 'Provide accurate account and listing information, keep sign-in details private, and use the marketplace only for lawful buying and selling.'], ['Listings and review', 'Every seller listing is reviewed before it becomes public. Bese26 may reject, remove, or restrict listings that are misleading, unsafe, duplicated, or against these rules.'], ['Buyer and seller responsibility', 'Discuss important details in chat, inspect items before paying, and choose a safe public meeting place. Bese26 is a marketplace platform and does not take possession of items or guarantee a private transaction.']] }, 'privacy-policy': { title: 'Privacy Policy', intro: 'This page explains the account and marketplace data Bese26 uses to provide the service.', sections: [['Information we use', 'We use account details, profile information, listing content, saved items, and conversations to provide marketplace features and keep the service secure.'], ['Listings and messages', 'Approved listing details are public to marketplace visitors. Conversations are available only to their participants.'], ['Your choices', 'You can update profile details, remove saved items, mark notifications as read, and sign out.']] }, prohibited: { title: 'Prohibited Items', intro: 'Do not post, request, or promote items and services that are illegal, dangerous, deceptive, or restricted.', sections: [['Illegal or harmful goods', 'Weapons, controlled drugs, stolen goods, counterfeit documents, and products intended to harm people are not allowed.'], ['Fraud and deception', 'Do not post fake offers, misleading prices, impersonation, phishing links, or requests for passwords, OTPs, or private financial details.'], ['If your listing is rejected', 'Read the review feedback in My Listings, correct the issue, and use Edit & resubmit.']] } };
  const policy = policies[page.key];
  return <div className="profile-subpage"><SubpageHeader title={policy.title} eyebrow="LEGAL" onBack={onBack} /><article className="legal-card"><div className="legal-updated">Bese26 marketplace policy · Last updated Aug 2026</div><h2>{policy.title}</h2><p>{policy.intro}</p>{policy.sections.map(([heading, copy]) => <section key={heading}><h3>{heading}</h3><p>{copy}</p></section>)}</article></div>;
}

function AboutPage({ onBack }) {
  return <div className="profile-subpage"><SubpageHeader title="About Bese26" eyebrow="ABOUT" onBack={onBack} /><div className="future-card about-card"><Store size={22} /><div><strong>Bese26 marketplace</strong><p>Buy and sell with confidence. Bese26 connects people and businesses around real local listings, secure conversations, and marketplace review.</p><p className="profile-muted-note">Bese26 web marketplace · v1.0</p></div></div></div>;
}

function SavedSearchesPage({ user, onBack, onNotice }) {
  const blank = { query: '', category: '', location: '', min_price: '', max_price: '', alerts_enabled: true };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); fetchSavedSearches(user.id).then(setItems).catch((requestError) => setError(requestError.message || 'Could not load saved searches.')).finally(() => setLoading(false)); };
  useEffect(load, [user.id]);
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const item = await saveSavedSearch(user.id, form); setItems((current) => [item, ...current.filter((row) => row.id !== item.id)]); setForm(blank); onNotice('Search alert saved.'); } catch (requestError) { setError(requestError.message || 'Could not save this search.'); } finally { setSaving(false); } };
  const remove = async (id) => { try { await deleteSavedSearch(user.id, id); setItems((current) => current.filter((item) => item.id !== id)); onNotice('Search alert removed.'); } catch (requestError) { setError(requestError.message || 'Could not remove this search.'); } };
  return <div className="profile-subpage"><SubpageHeader title="Saved Searches" eyebrow="MY MARKETPLACE" onBack={onBack} />{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<form className="settings-card profile-form-card" onSubmit={save}><label>Search<input value={form.query} onChange={(event) => setForm((current) => ({ ...current, query: event.target.value }))} placeholder="e.g. iPhone 13" /></label><label>Category<input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Optional" /></label><label>Location<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="e.g. Kano" /></label><div className="two-field-row"><label>Minimum price<input type="number" min="0" value={form.min_price} onChange={(event) => setForm((current) => ({ ...current, min_price: event.target.value }))} /></label><label>Maximum price<input type="number" min="0" value={form.max_price} onChange={(event) => setForm((current) => ({ ...current, max_price: event.target.value }))} /></label></div><ToggleRow icon={Bell} label="Alert me about matches" description="Keep this alert active for future marketplace matches" checked={form.alerts_enabled} onChange={(value) => setForm((current) => ({ ...current, alerts_enabled: value }))} /><button className="primary-button full-width" disabled={saving}>{saving ? 'Saving…' : 'Save search'} <Save size={15} /></button></form>{loading ? <EmptyState title="Loading saved searches" description="Getting your real search alerts." /> : items.length ? <div className="notification-list">{items.map((item) => <div className="notification-row" key={item.id}><span className="notification-row-icon"><Save size={16} /></span><span><strong>{item.query || item.category || item.location}</strong><small>{[item.category, item.location].filter(Boolean).join(' · ') || 'All marketplace locations'}{item.min_price != null || item.max_price != null ? ` · ${item.min_price ?? 0}–${item.max_price ?? 'any'}` : ''}</small><small>{item.alerts_enabled ? 'Alerts on' : 'Alerts off'}</small></span><button type="button" className="icon-button" onClick={() => remove(item.id)} aria-label={`Delete saved search ${item.query || item.category || item.location}`}><Trash2 size={15} /></button></div>)}</div> : <EmptyState icon={Save} title="No saved searches yet" description="Save a search to receive a real alert when matching listings are added." />}</div>;
}

function CompanyLinkEditor({ user, onBack, onNotice }) {
  const [form, setForm] = useState({ business_name: '', description: '', business_handle: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; getBusinessProfile(user.id).then((data) => { if (mounted && data) setForm({ business_name: data.business_name || '', description: data.description || '', business_handle: data.business_handle || '' }); }).catch((requestError) => mounted && setError(requestError.message || 'Could not load company profile.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await saveBusinessProfile(user.id, form); onNotice('Company profile and public link saved.'); } catch (requestError) { setError(requestError.message || 'Could not save company profile.'); } finally { setSaving(false); } };
  const handle = form.business_handle ? form.business_handle : 'yourcompany';
  if (loading) return <div className="profile-subpage company-link-page"><SubpageHeader title="Company name, description & links" eyebrow="BUSINESS PROFILE" onBack={onBack} /><EmptyState title="Loading company profile" description="Getting your company details." /></div>;
  return <div className="profile-subpage company-link-page"><SubpageHeader title="Company name, description & links" eyebrow="BUSINESS PROFILE" onBack={onBack} />{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<form className="company-link-form" onSubmit={save}><label>Business name*<input required maxLength="120" value={form.business_name} onChange={(event) => update('business_name', event.target.value)} placeholder="e.g. Kano Agro Ltd" /></label><label>About company<textarea maxLength="3000" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Tell customers what your company does" /></label><label>Customize your Bese26 link<div className="company-handle-input"><span>bese44.shop/</span><input required pattern="[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?" value={form.business_handle} onChange={(event) => update('business_handle', event.target.value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="yourcompany" /></div><small className="company-link-preview">Public link: https://bese44.shop/@{handle}</small></label><div className="company-link-status"><Check size={17} /> {form.business_handle ? 'Link ready' : 'Choose a handle to create your link'}</div><button type="submit" className="company-save-button" disabled={saving}>{saving ? 'Saving…' : 'Save'} <Save size={17} /></button>{form.business_handle && <a className="company-preview-link" href={`/@${form.business_handle}`}>Open public company page <ArrowRight size={15} /></a>}</form></div>;
}

function BusinessProfilePage({ user, onBack, onNotice, onOpenSubscription, onOpenVerification }) {
  const [entitlement, setEntitlement] = useState(null);
  const [activeListings, setActiveListings] = useState(null);
  const blank = { business_name: '', business_handle: '', business_type: '', category: '', description: '', phone: '', whatsapp: '', email: user.email || '', country: 'Nigeria', state: '', city: '', area: '', address: '', website: '', registration_number: '', years_in_business: '', delivery_available: false, pickup_available: true, public_contact: false, location_visibility: 'city', logo_path: '' };
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; getBusinessProfile(user.id).then((data) => { if (!mounted) return; if (data) setForm((current) => ({ ...current, ...data, email: data.email || user.email || '' })); }).catch((requestError) => mounted && setError(requestError.message || 'Could not load business profile.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id, user.email]);
  useEffect(() => { let mounted = true; Promise.all([fetchSellerEntitlement(), fetchMyListings({ sellerId: user.id, status: 'active' })]).then(([access, listings]) => { if (mounted) { setEntitlement(access); setActiveListings(listings.length); } }).catch(() => {}); return () => { mounted = false; }; }, [user.id]);
  useEffect(() => () => { if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const chooseLogo = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setError('Choose a JPG, PNG, WEBP, or HEIC logo image.'); return; } setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); setError(''); event.target.value = ''; };
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { let next = form; if (logoFile) { setLogoBusy(true); const uploaded = await uploadBusinessLogo({ userId: user.id, file: logoFile, previousPath: form.logo_path }); next = { ...form, logo_path: uploaded.path }; setLogoPreview(uploaded.url); setLogoFile(null); setLogoBusy(false); } const data = await saveBusinessProfile(user.id, next); setForm((current) => ({ ...current, ...data })); onNotice('Business profile saved.'); } catch (requestError) { setLogoBusy(false); setError(requestError.message || 'Could not save business profile.'); } finally { setSaving(false); } };
  if (loading) return <div className="profile-subpage"><SubpageHeader title="Business Profile" eyebrow="SELLER TOOLS" onBack={onBack} /><EmptyState title="Loading business profile" description="Getting your real business record." /></div>;
  const states = Object.keys(nigeriaLocations).sort(); const lgas = nigeriaLocations[form.state] || [];
  const businessPlanActive = entitlement?.is_paid && entitlement?.plan_key === 'business';
  const verificationFields = [['business_name', 'Business name'], ['business_handle', 'Public handle'], ['business_type', 'Business type'], ['category', 'Business category'], ['description', 'Business description'], ['email', 'Business email'], ['phone', 'Business phone'], ['state', 'State'], ['city', 'Local Government Area']];
  const missingVerificationFields = verificationFields.filter(([key]) => !String(form[key] || '').trim());
  const publicUrl = form.business_handle ? `/@${form.business_handle}` : '';
  const startVerification = () => { if (missingVerificationFields.length) { setError(`Complete these business details before verification: ${missingVerificationFields.map(([, label]) => label).join(', ')}.`); return; } onOpenVerification?.(); };
  return <div className="profile-subpage"><SubpageHeader title="Business Center" eyebrow="SELLER TOOLS" onBack={onBack} /><section className="settings-card business-center-summary"><div className="profile-section-label"><div><div className="eyebrow">BUSINESS CENTER</div><h2>{form.business_name || 'Set up your business'}</h2></div><span className={`status-pill ${form.is_verified ? 'successful' : 'pending'}`}>{form.is_verified ? 'Verified' : 'Not verified'}</span></div><div className="settings-info-row"><strong>Current plan</strong><span>{entitlement?.plan_key === 'business' ? 'Business' : entitlement?.plan_key ? entitlement.plan_key : 'Free'} · {businessPlanActive ? 'Business tools active' : 'Basic profile access'}</span></div><div className="settings-info-row"><strong>Active listings</strong><span>{activeListings == null ? 'Loading…' : `${activeListings} of ${entitlement?.listing_limit || 3}`}</span></div><div className="settings-info-row"><strong>Public page</strong><span>{publicUrl ? 'Ready to publish' : 'Handle required'}</span></div><div className="settings-info-row"><strong>Verification</strong><span>{form.is_verified ? 'Verified' : 'Not verified — approval required'}</span></div><div className="publish-success-actions"><button type="button" className="primary-button" onClick={() => onOpenSubscription?.()}>{businessPlanActive ? 'View subscription' : 'Unlock Business tools'} <ArrowRight size={15} /></button>{publicUrl && <a className="secondary-button" href={publicUrl}>View public page <ArrowRight size={15} /></a>}<button type="button" className="secondary-button" onClick={startVerification}>Start verification <ShieldCheck size={15} /></button></div></section>{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<section className="verification-readiness-card"><div><ShieldCheck size={19} /><strong>Verification readiness</strong></div><p>{missingVerificationFields.length ? `Complete ${missingVerificationFields.length} required business detail${missingVerificationFields.length === 1 ? '' : 's'} before submitting verification.` : 'Your business details are complete and ready for verification review.'}</p><div className="verification-checklist">{verificationFields.map(([key, label]) => <span key={key} className={String(form[key] || '').trim() ? 'complete' : ''}><Check size={13} /> {label}</span>)}</div></section><div className="future-card"><Store size={20} /><div><strong>{form.is_verified ? 'Verified business' : 'Business verification pending'}</strong><p>{form.is_verified ? 'Your verified status is controlled by Bese26 moderation.' : 'Save accurate details. Bese26 staff control verification; it is never granted automatically.'}</p></div></div><form className="settings-card profile-form-card" onSubmit={save}><div className="personal-photo"><div className="profile-photo-editor">{logoPreview || form.logo_path ? <img className="avatar avatar-xl profile-avatar-image" src={logoPreview || getAvatarUrl(form.logo_path)} alt="Business logo" /> : <div className="avatar avatar-xl avatar-navy"><Store size={28} /></div>}<div className="photo-editor-actions"><label className="secondary-button">Choose logo<input className="hidden-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/heic" onChange={chooseLogo} /></label>{logoFile && <span className="profile-muted-note">Ready to upload</span>}</div></div></div><label>Business name*<input required maxLength="120" value={form.business_name} onChange={(event) => update('business_name', event.target.value)} placeholder="Your business name" /></label><label>Public handle<input pattern="[a-z0-9-]{3,30}" value={form.business_handle || ''} onChange={(event) => update('business_handle', event.target.value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. kanoagro" /><small className="profile-help-note">Public URL: https://bese44.shop/@{form.business_handle || 'yourhandle'}</small></label><label>Business type<select value={form.business_type || ''} onChange={(event) => update('business_type', event.target.value)}><option value="">Choose type</option>{['Retailer', 'Wholesaler', 'Manufacturer', 'Distributor', 'Service Provider', 'Agribusiness', 'Farm', 'Company', 'Professional', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Business category<input value={form.category || ''} onChange={(event) => update('category', event.target.value)} placeholder="e.g. Agriculture" /></label><label>Email<input type="email" value={form.email || ''} onChange={(event) => update('email', event.target.value)} /></label><label>Phone<input value={form.phone || ''} onChange={(event) => update('phone', event.target.value)} placeholder="Optional business number" /></label><label>WhatsApp<input value={form.whatsapp || ''} onChange={(event) => update('whatsapp', event.target.value)} placeholder="Optional" /></label><label>Country<input value={form.country || 'Nigeria'} onChange={(event) => update('country', event.target.value)} /></label><label>State<select value={form.state || ''} onChange={(event) => { update('state', event.target.value); update('city', nigeriaLocations[event.target.value]?.[0] || ''); }}><option value="">Choose state</option>{states.map((item) => <option key={item}>{item}</option>)}</select></label><label>Local Government Area<select value={form.city || ''} onChange={(event) => update('city', event.target.value)} disabled={!lgas.length}><option value="">Choose LGA</option>{lgas.map((item) => <option key={item}>{item}</option>)}</select></label><label>Area<input value={form.area || ''} onChange={(event) => update('area', event.target.value)} placeholder="Optional area" /></label><label>Location visibility<select value={form.location_visibility || 'city'} onChange={(event) => update('location_visibility', event.target.value)}><option value="city">City only</option><option value="approximate">Approximate location</option><option value="exact">Exact address</option></select></label><label>Website<input type="url" value={form.website || ''} onChange={(event) => update('website', event.target.value)} placeholder="https://" /></label><label>Years in business<input type="number" min="0" max="200" value={form.years_in_business ?? ''} onChange={(event) => update('years_in_business', event.target.value)} /></label><label className="full-field">Business address<input value={form.address || ''} onChange={(event) => update('address', event.target.value)} placeholder="Optional; only shown according to visibility" /></label><label className="full-field">Description<textarea maxLength="3000" value={form.description || ''} onChange={(event) => update('description', event.target.value)} placeholder="Tell customers what your business offers" /></label><label className="full-field">Registration number<input value={form.registration_number || ''} onChange={(event) => update('registration_number', event.target.value)} placeholder="Optional" /></label><ToggleRow icon={Phone} label="Show contact details publicly" description="Only enable this if you want phone, WhatsApp, or email visible on your business profile." checked={form.public_contact === true} onChange={(value) => update('public_contact', value)} /><ToggleRow icon={Package} label="Delivery available" description="Tell buyers whether your business offers delivery." checked={form.delivery_available === true} onChange={(value) => update('delivery_available', value)} /><ToggleRow icon={MapPin} label="Pickup available" description="Tell buyers whether they can collect orders." checked={form.pickup_available !== false} onChange={(value) => update('pickup_available', value)} /><button className="primary-button full-width" disabled={saving || logoBusy}>{saving ? 'Saving…' : 'Save business profile'} <Check size={15} /></button></form></div>;
}
function SecurityPage({ user, onBack, onNotice }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async (event) => { event.preventDefault(); if (password !== confirm) { setError('Passwords do not match.'); return; } setSaving(true); setError(''); try { await updatePassword(password); setPassword(''); setConfirm(''); onNotice('Password updated securely.'); } catch (requestError) { setError(requestError.message || 'Could not update your password.'); } finally { setSaving(false); } };
  return <div className="profile-subpage"><SubpageHeader title="Login & Security" eyebrow="ACCOUNT" onBack={onBack} />{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<div className="future-card"><LockKeyhole size={20} /><div><strong>Signed in with Supabase Auth</strong><p>{user.email} · Password changes use the authenticated session. Connected accounts and active-session management are not exposed without a secure workflow.</p></div></div><form className="settings-card profile-form-card" onSubmit={save}><label>New password<input required type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label><label>Confirm new password<input required type="password" minLength="6" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label><button className="primary-button full-width" disabled={saving}>{saving ? 'Updating…' : 'Update password'} <LockKeyhole size={15} /></button></form></div>;
}

function RelationsPage({ user, onBack }) {
  const [mode, setMode] = useState('followers');
  const [summary, setSummary] = useState({ followers: 0, following: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; Promise.all([fetchFollowSummary(user.id), fetchProfileRelations(user.id, mode)]).then(([nextSummary, nextItems]) => { if (mounted) { setSummary(nextSummary); setItems(nextItems); } }).catch((requestError) => mounted && setError(requestError.message || 'Could not load relationships.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [mode, user.id]);
  return <div className="profile-subpage"><SubpageHeader title="Followers & Following" eyebrow="YOUR COMMUNITY" onBack={onBack} /><div className="profile-stats"><button type="button" className={mode === 'followers' ? 'selected' : ''} onClick={() => { setMode('followers'); setLoading(true); }}><strong>{summary.followers}</strong><span>Followers</span></button><button type="button" className={mode === 'following' ? 'selected' : ''} onClick={() => { setMode('following'); setLoading(true); }}><strong>{summary.following}</strong><span>Following</span></button></div>{error && <div className="auth-status error">{error}</div>}{loading ? <EmptyState title="Loading relationships" description="Getting your real account connections." /> : items.length ? <div className="history-list">{items.map((item) => { const person = mode === 'followers' ? item.follower : item.following; return <div key={`${item.follower_id}-${item.following_id}`}><Avatar name={person?.display_name} path={person?.avatar_path} /><span><strong>{person?.display_name || 'Bese26 member'}</strong><small>{person?.username ? `@${person.username}` : 'Username not set'}</small></span><small>{new Date(item.created_at).toLocaleDateString()}</small></div>; })}</div> : <EmptyState icon={Users} title={`No ${mode} yet`} description="Real account connections will appear here when users follow your profile." />}</div>;
}

function BlockedUsersPage({ user, onBack, onNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); fetchBlockedUsers(user.id).then(setItems).catch((requestError) => setError(requestError.message || 'Could not load blocked users.')).finally(() => setLoading(false)); };
  useEffect(load, [user.id]);
  const unblock = async (id) => { try { await unblockUser(user.id, id); setItems((current) => current.filter((item) => item.blocked_id !== id)); onNotice('User unblocked.'); } catch (requestError) { setError(requestError.message || 'Could not unblock this user.'); } };
  return <div className="profile-subpage"><SubpageHeader title="Blocked Users" eyebrow="TRUST & SAFETY" onBack={onBack} />{error && <div className="auth-status error">{error}</div>}{loading ? <EmptyState title="Loading blocked users" description="Getting your private block list." /> : items.length ? <div className="history-list">{items.map((item) => <div key={item.blocked_id}><Avatar name={item.blocked?.display_name} path={item.blocked?.avatar_path} /><span><strong>{item.blocked?.display_name || 'Bese26 member'}</strong><small>{item.blocked?.username ? `@${item.blocked.username}` : 'Profile blocked'}</small></span><button type="button" className="text-action" onClick={() => unblock(item.blocked_id)}>Unblock</button></div>)}</div> : <EmptyState icon={ShieldCheck} title="No blocked users" description="Profiles you block will appear here, and their conversations will be hidden from you." />}</div>;
}

function ReportsPage({ user, onBack, onNotice }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ target_type: 'user', target_id: '', reason: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = () => { setLoading(true); fetchMyReports(user.id).then(setItems).catch((requestError) => setError(requestError.message || 'Could not load reports.')).finally(() => setLoading(false)); };
  useEffect(load, [user.id]);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const report = await submitUserReport(user.id, { ...form, target_id: form.target_id.trim() || null }); setItems((current) => [report, ...current]); setForm({ target_type: 'user', target_id: '', reason: '', description: '' }); onNotice('Report submitted to the moderation queue.'); } catch (requestError) { setError(requestError.message || 'Could not submit this report.'); } finally { setSaving(false); } };
  return <div className="profile-subpage"><SubpageHeader title="Reports" eyebrow="TRUST & SAFETY" onBack={onBack} />{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<form className="settings-card profile-form-card" onSubmit={submit}><label>What are you reporting?<select value={form.target_type} onChange={(event) => setForm((current) => ({ ...current, target_type: event.target.value }))}>{['listing', 'user', 'message', 'business', 'scam', 'prohibited_item', 'harassment', 'fake_information'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label><label>Target ID (optional)<input value={form.target_id} onChange={(event) => setForm((current) => ({ ...current, target_id: event.target.value }))} placeholder="Paste the listing or profile ID if available" /></label><label>Reason<input required value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="What happened?" /></label><label className="full-field">Details<textarea maxLength="3000" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add useful details for the moderation team" /></label><button className="primary-button full-width" disabled={saving}>{saving ? 'Submitting…' : 'Submit report'} <AlertCircle size={15} /></button></form><h2 className="profile-subpage-title">Your submitted reports</h2>{loading ? <EmptyState title="Loading reports" description="Getting your private report history." /> : items.length ? <div className="notification-list">{items.map((item) => <div className="notification-row" key={item.id}><span className="notification-row-icon"><AlertCircle size={16} /></span><span><strong>{item.reason}</strong><small>{item.target_type.replaceAll('_', ' ')} · {item.status}</small><small>{new Date(item.created_at).toLocaleString()}</small></span></div>)}</div> : <EmptyState icon={AlertCircle} title="No reports submitted" description="Reports you submit will appear here with their moderation status." />}</div>;
}

function VerificationPage({ user, profile, onBack, onNotice }) {
  const [items, setItems] = useState([]); const [form, setForm] = useState({ verification_type: 'seller', full_name: profile?.display_name || '', phone: '', business_name: '', business_handle: '', notes: '' }); const [file, setFile] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let mounted = true; fetchVerificationApplications(user.id).then((rows) => mounted && setItems(rows)).catch((requestError) => mounted && setError(requestError.message || 'Could not load verification status.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id]);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const document_path = file ? await uploadVerificationDocument({ userId: user.id, file }) : null; const application = await submitVerificationApplication(user.id, { ...form, document_path }); setItems((current) => [application, ...current]); setFile(null); onNotice('Verification application submitted for review.'); } catch (requestError) { setError(requestError.message || 'Could not submit verification application.'); } finally { setSaving(false); } };
  const latest = items[0]; const verified = Boolean(profile?.is_verified);
  return <div className="profile-subpage"><SubpageHeader title="Verification & Trust" eyebrow="SELLER TOOLS" onBack={onBack} /><div className="safety-hero"><ShieldCheck size={22} /><div><h2>{verified ? 'Verified profile' : latest?.status === 'pending' ? 'Application under review' : 'Build buyer trust'}</h2><p>{verified ? 'Your verified status is controlled by the Bese26 moderation record.' : latest?.status === 'rejected' || latest?.status === 'action_required' ? latest.reviewer_note || 'Update your details and submit again.' : 'Submit accurate details so the Bese26 team can review your seller or business identity.'}</p></div></div>{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}<div className="settings-card"><div className="settings-info-row"><strong>Email</strong><span>{user.email_confirmed_at ? 'Verified' : 'Not verified'}</span></div><div className="settings-info-row"><strong>Profile</strong><span>{verified ? 'Verified' : 'Not verified'}</span></div>{latest && <div className="settings-info-row"><strong>{latest.verification_type} application</strong><span className={`status-pill ${latest.status}`}>{latest.status.replace('_', ' ')}</span></div>}</div>{!verified && latest?.status !== 'pending' && <form className="settings-card profile-form-card" onSubmit={submit}><label>Verification type<select value={form.verification_type} onChange={(event) => setForm((current) => ({ ...current, verification_type: event.target.value }))}><option value="seller">Seller verification</option><option value="business">Business verification</option><option value="identity">Identity verification</option></select></label><label>Full name*<input required value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} /></label><label>Phone number<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="For verification contact" /></label>{form.verification_type === 'business' && <><label>Business name<input value={form.business_name} onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))} /></label><label>Business handle<input value={form.business_handle} onChange={(event) => setForm((current) => ({ ...current, business_handle: event.target.value.replace(/^@/, '').toLowerCase() }))} placeholder="e.g. kanoagro" /></label></>}<label>Document (optional)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /><small className="profile-help-note">Use a clear document under 8 MB. It is stored privately for review.</small></label><label className="full-field">Additional notes<textarea maxLength="1500" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Tell the review team anything relevant" /></label><button className="primary-button full-width" disabled={saving}>{saving ? 'Submitting…' : 'Submit for review'} <ShieldCheck size={15} /></button></form>}<p className="profile-help-note">Business tools require the Business plan. Verification is separate from payment and does not guarantee a transaction. Never share passwords or payment PINs with anyone claiming to be a Bese26 verifier.</p></div>;
}

function PaymentHistoryPage({ user, onBack }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; fetchPaymentHistory(user?.id).then((data) => mounted && setRows(data)).catch((reason) => mounted && setError(reason.message || 'Could not load payment history.')); return () => { mounted = false; }; }, [user?.id]);
  return <div className="profile-subpage"><SubpageHeader title="Payment History" eyebrow="PAYMENTS & SERVICES" onBack={onBack} /><p className="profile-subpage-intro">Only verified Paystack payment records for your account appear here.</p>{error && <div className="profile-state-card error"><AlertCircle size={18} /><p>{error}</p></div>}{rows === null && !error && <div className="profile-state-card"><Clock3 size={18} /><p>Loading payment history…</p></div>}{rows?.length === 0 && <div className="profile-state-card"><WalletCards size={18} /><p>No verified payments yet. Your payment record will appear after Paystack confirms a transaction.</p></div>}{rows?.length > 0 && <div className="profile-payment-list">{rows.map((row) => <div className="profile-payment-row" key={row.id}><div><strong>{row.plan_key === 'boost' ? 'Listing boost' : `${row.plan_key === 'business' ? 'Business' : row.plan_key === 'premium' ? 'Premium' : 'Basic'} plan`}</strong><small>{row.status === 'successful' ? 'Payment successful' : row.status === 'initialized' ? 'Payment pending' : row.status} · {new Date(row.created_at).toLocaleDateString('en-NG')}</small><small>Ref: {row.reference.slice(0, 18)}…</small></div><div className="profile-payment-meta"><strong>₦{(Number(row.amount_kobo) / 100).toLocaleString('en-NG')}</strong><span className={`status-pill ${row.status}`}>{row.status}</span></div></div>)}</div>}</div>;
}

function BoostingPage({ user, onBack, onNotice }) {
  const [listings, setListings] = useState([]); const [packages, setPackages] = useState([]); const [boosts, setBoosts] = useState([]); const [listingId, setListingId] = useState(''); const [packageId, setPackageId] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let mounted = true; Promise.all([fetchMyListings({ sellerId: user.id, status: 'active' }), fetchBoostPackages(), fetchMyBoosts(user.id)]).then(([nextListings, nextPackages, nextBoosts]) => { if (mounted) { setListings(nextListings); setPackages(nextPackages); setBoosts(nextBoosts); setListingId(nextListings[0]?.id || ''); setPackageId(nextPackages[0]?.id || ''); } }).catch((reason) => mounted && setError(reason.message || 'Could not load boosting data.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id]);
  const start = async () => { if (!listingId || !packageId) return setError('Choose a listing and a boost package.'); setSaving(true); setError(''); try { const result = await initializeBoostPayment({ listingId, packageId }); if (!result.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(result.authorization_url); } catch (reason) { setError(reason.message || 'Could not start boost checkout.'); setSaving(false); } };
  return <div className="profile-subpage"><SubpageHeader title="Boosting" eyebrow="PAYMENTS & SERVICES" onBack={onBack} /><p className="profile-subpage-intro">Give an approved active listing more visibility. Your boost starts only after Paystack confirms the payment.</p>{error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}{loading ? <EmptyState title="Loading boost options" description="Getting active listings and packages." /> : <><div className="settings-card profile-form-card"><label>Listing<select value={listingId} onChange={(event) => setListingId(event.target.value)}><option value="">Choose listing</option>{listings.map((listing) => <option value={listing.id} key={listing.id}>{listing.title} · {listing.price}</option>)}</select></label><label>Boost package<select value={packageId} onChange={(event) => setPackageId(event.target.value)}><option value="">Choose package</option>{packages.map((pkg) => <option value={pkg.id} key={pkg.id}>{pkg.name} · ₦{(pkg.price_kobo / 100).toLocaleString('en-NG')}</option>)}</select></label><button type="button" className="primary-button full-width" disabled={saving || !listings.length || !packages.length} onClick={start}>{saving ? 'Opening Paystack…' : 'Boost listing'} <Sparkles size={15} /></button>{!listings.length && <small className="profile-help-note">Only approved active listings can be boosted.</small>}</div><h2 className="profile-subpage-title">Your boosts</h2>{boosts.length ? <div className="notification-list">{boosts.map((boost) => <div className="notification-row" key={boost.id}><span className="notification-row-icon"><Sparkles size={16} /></span><span><strong>{boost.listing?.title || 'Listing boost'}</strong><small>{boost.package?.name || 'Package'} · ₦{boost.package?.price_kobo ? (Number(boost.package.price_kobo) / 100).toLocaleString('en-NG') : '—'}</small><small>Status: {boost.status} · {boost.starts_at ? `Started ${new Date(boost.starts_at).toLocaleDateString('en-NG')}` : 'Awaiting payment'}</small><small>{boost.ends_at ? `Ends ${new Date(boost.ends_at).toLocaleDateString('en-NG')}` : 'Not active until payment is verified'}</small></span></div>)}</div> : <EmptyState icon={Sparkles} title="No boosts yet" description="Choose an approved listing above to improve its visibility." />}</>}</div>;
}

export default function ProfileView({ user, onAuthRequired, onSignOut, onDemoAction, isDark, onToggleTheme, onNavigate, onCreateListing, onEditListing, onOpenListing, onToggleSave, isAdmin = false, onOpenAdmin, onOpenSubscription, isActive = true }) {
  const [subPage, setSubPage] = useState('main');
  const [listingTab, setListingTab] = useState('Active');
  const [stats, setStats] = useState(null);
  const [profileRecord, setProfileRecord] = useState(null);
  const [profileContacts, setProfileContacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const profileRequest = useRef(0);
  useEffect(() => { if (isActive) setSubPage('main'); }, [isActive]);
  useEffect(() => { let mounted = true; const requestId = ++profileRequest.current; if (!user) { setStats(null); setProfileRecord(null); setProfileContacts(null); return undefined; } setLoading(true); Promise.all([fetchSellerStats(user.id), getProfile(user.id), getProfileContacts(user.id)]).then(([nextStats, nextProfile, nextContacts]) => { if (mounted && requestId === profileRequest.current) { setStats(nextStats); setProfileRecord(nextProfile); setProfileContacts(nextContacts); } }).catch((error) => mounted && onDemoAction(error.message || 'Could not load your profile.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user, onDemoAction]);
  const open = async (page) => { if (!user && !['about', 'terms', 'privacy-policy', 'prohibited', 'help', 'safety', 'subscription'].includes(page)) { onAuthRequired?.(); return; } if (page === 'saved' && onNavigate) { onNavigate('saved'); return; } if (page === 'admin') { onOpenAdmin?.(); return; } if (page === 'subscription') { onOpenSubscription?.(); return; } if (page === 'logout') { try { await onSignOut?.(); } catch (error) { onDemoAction(error.message || 'Could not log out.'); } return; } if (page === 'delete-account') { if (!window.confirm('Delete your Bese26 account permanently? This cannot be undone.')) return; try { await deleteMyAccount(); onDemoAction('Your account was deleted.'); } catch (error) { onDemoAction(error.message || 'Could not delete your account.'); } return; } setSubPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const displayName = profileRecord?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Your Bese26 profile';
  const username = profileRecord?.username ? `@${profileRecord.username}` : user?.user_metadata?.username ? `@${user.user_metadata.username}` : user ? 'Username not set' : 'Sign in to personalize your profile';
  const profileLocation = [profileRecord?.city, profileRecord?.state, profileRecord?.country].filter(Boolean).join(', ') || 'Location not set';
  const completionItems = useMemo(() => user ? [{ label: 'Profile photo', done: Boolean(profileRecord?.avatar_path) }, { label: 'Phone number', done: Boolean(profileContacts?.phone) }, { label: 'Location', done: Boolean(profileRecord?.city && profileRecord?.state) }, { label: 'Bio', done: Boolean(profileRecord?.bio) }, { label: 'Verified email', done: Boolean(user.email_confirmed_at) }] : [], [profileContacts, profileRecord, user]);
  const completion = completionItems.length ? Math.round((completionItems.filter((item) => item.done).length / completionItems.length) * 100) : 0;
  if (subPage === 'listings' || subPage === 'sold' || subPage === 'drafts') return <ListingManager user={user} onBack={() => setSubPage('main')} tab={subPage === 'sold' ? 'Sold' : subPage === 'drafts' ? 'Drafts' : listingTab} setTab={setListingTab} onCreateListing={onCreateListing} onEditListing={onEditListing} onOpenListing={onOpenListing} />;
  if (subPage === 'saved') return <SavedItemsPage user={user} onBack={() => setSubPage('main')} onOpenListing={onOpenListing} onToggleSave={onToggleSave} />;
  if (subPage === 'reviews') return <ReviewsPage user={user} onBack={() => setSubPage('main')} />;
  if (subPage === 'analytics') return <AnalyticsPage user={user} onBack={() => setSubPage('main')} />;
  if (subPage === 'recently-viewed') return <RecentlyViewedPage user={user} onBack={() => setSubPage('main')} onOpenListing={onOpenListing} onNotice={onDemoAction} />;
  if (subPage === 'notifications') return <NotificationPage user={user} onBack={() => setSubPage('main')} />;
  if (subPage === 'personal') return <PersonalPage user={user} profile={profileRecord} onBack={() => setSubPage('main')} onAuthRequired={onAuthRequired} onSaved={(nextProfile) => { setProfileRecord(nextProfile); onDemoAction('Profile changes saved successfully.'); }} />;
  if (subPage === 'saved-searches') return <SavedSearchesPage user={user} onBack={() => setSubPage('main')} onNotice={onDemoAction} />;
  if (subPage === 'security') return <SecurityPage user={user} onBack={() => setSubPage('main')} onNotice={onDemoAction} />;
  if (subPage === 'following') return <RelationsPage user={user} onBack={() => setSubPage('main')} />;
  if (subPage === 'blocked') return <BlockedUsersPage user={user} onBack={() => setSubPage('main')} onNotice={onDemoAction} />;
  if (subPage === 'reports') return <ReportsPage user={user} onBack={() => setSubPage('main')} onNotice={onDemoAction} />;
  if (subPage === 'business') return <BusinessProfilePage user={user} onBack={() => setSubPage('main')} onNotice={onDemoAction} onOpenSubscription={() => setSubPage('subscription')} onOpenVerification={() => setSubPage('verification')} />;
  if (subPage === 'verification') return <VerificationPage user={user} profile={profileRecord} onBack={() => setSubPage('main')} onNotice={onDemoAction} />;
  if (['language', 'notification-settings', 'privacy', 'communication', 'appearance'].includes(subPage)) return <SettingsPage page={{ ...pageDefinitions[subPage], key: subPage }} user={user} onBack={() => setSubPage('main')} isDark={isDark} onToggleTheme={onToggleTheme} onNotice={onDemoAction} />;
  if (subPage === 'help') return <HelpPage onBack={() => setSubPage('main')} />;
  if (subPage === 'safety') return <SafetyPage onBack={() => setSubPage('main')} />;
  if (['terms', 'privacy-policy', 'prohibited'].includes(subPage)) return <PolicyPage page={{ key: subPage }} onBack={() => setSubPage('main')} />;
  if (subPage === 'about') return <AboutPage onBack={() => setSubPage('main')} />;
  if (subPage === 'payment-history') return <PaymentHistoryPage user={user} onBack={() => setSubPage('main')} />;
  if (subPage === 'boosting') return <BoostingPage user={user} onBack={() => setSubPage('main')} onNotice={onDemoAction} />;
  if (['recently-viewed', 'wallet', 'boosting', 'support'].includes(subPage)) return <UnavailablePage page={pageDefinitions[subPage]} onBack={() => setSubPage('main')} />;
  if (subPage !== 'main') return <UnavailablePage page={pageDefinitions[subPage] || { title: subPage, eyebrow: 'BESE26' }} onBack={() => setSubPage('main')} />;

  const statsCards = [{ label: 'Listings', value: loading ? '…' : stats?.listings ?? 0, page: 'listings' }, { label: 'Sold', value: loading ? '…' : stats?.sold ?? 0, page: 'sold' }, { label: 'Saved', value: loading ? '…' : stats?.saved ?? 0, page: 'saved' }, { label: 'Views', value: loading ? '…' : stats?.views ?? 0, page: 'analytics' }];
  const marketplaceItems = [{ label: 'My Listings', description: 'Manage real listings and review status', icon: Package, page: 'listings', tone: 'coral' }, { label: 'Saved Items', description: 'Your saved marketplace listings', icon: Heart, page: 'saved', tone: 'lavender' }, { label: 'Drafts', description: 'Continue listings saved from Sell', icon: FileText, page: 'drafts', tone: 'gold' }, { label: 'Sold Items', description: 'Listings marked as sold', icon: Tag, page: 'sold', tone: 'mint' }, { label: 'Saved Searches', description: 'Save real searches and alerts', icon: Save, page: 'saved-searches', tone: 'navy' }, { label: 'Recently Viewed', description: 'Your cross-device viewing history', icon: Clock3, page: 'recently-viewed', tone: 'navy' }];
  const sellerItems = [{ label: 'Seller Analytics', description: 'Real views, inquiries, and listing counts', icon: BarChart3, page: 'analytics', tone: 'coral' }, { label: 'Business Profile', description: 'Save your real business record', icon: Store, page: 'business', tone: 'gold' }, { label: 'Verification & Trust', description: profileRecord?.is_verified ? 'Verified by the account record' : 'Current status: not verified', icon: ShieldCheck, page: 'verification', tone: 'mint' }, { label: 'Reviews', description: `${stats?.reviews || 0} real review${stats?.reviews === 1 ? '' : 's'}`, icon: Star, page: 'reviews', tone: 'lavender' }, { label: 'Followers & Following', description: 'Manage real profile connections', icon: Users, page: 'following', tone: 'navy' }];
  const accountItems = [{ label: 'Personal Information', description: `${displayName} · ${profileLocation}`, icon: UserRound, page: 'personal', tone: 'coral' }, { label: 'Login & Security', description: 'Supabase Auth and account sign-out', icon: LockKeyhole, page: 'security', tone: 'navy' }];
  const preferenceItems = [{ label: 'Language & Region', description: 'English · Nigeria · NGN', icon: Globe2, page: 'language', tone: 'navy' }, { label: 'Notifications', description: 'Read your real account updates', icon: Bell, page: 'notifications', tone: 'coral' }, { label: 'Notification Preferences', description: 'Control non-critical updates', icon: Bell, page: 'notification-settings', tone: 'lavender' }, { label: 'Privacy', description: 'Profile and location visibility', icon: Eye, page: 'privacy', tone: 'mint' }, { label: 'Communication', description: 'Calls, WhatsApp, and buyer messages', icon: MessageCircle, page: 'communication', tone: 'gold' }, { label: 'Appearance', description: isDark ? 'Dark mode' : 'Light mode', icon: Moon, page: 'appearance', tone: 'navy' }];
  const paymentItems = [{ label: 'Wallet', description: 'Wallet balance and transfers coming soon', icon: WalletCards, page: 'wallet', tone: 'coral' }, { label: 'Subscription', description: 'View seller plans and free posts', icon: Tag, page: 'subscription', tone: 'lavender' }, { label: 'Boosting', description: 'Promote approved listings with Paystack', icon: Sparkles, page: 'boosting', tone: 'gold' }, { label: 'Payment History', description: 'View your verified payment records', icon: FileText, page: 'payment-history', tone: 'navy' }];
  const safetyItems = [{ label: 'Safety Center', description: 'Safe buying and selling guidance', icon: ShieldCheck, page: 'safety', tone: 'mint' }, { label: 'Blocked Users', description: 'Private block list and chat protection', icon: Users, page: 'blocked', tone: 'navy' }, { label: 'Reports', description: 'Submit real reports to moderation', icon: AlertCircle, page: 'reports', tone: 'coral' }];
  return <div className="page-stack profile-page premium-profile account-center"><section className="profile-cover"><div className="profile-heading"><Avatar name={displayName} path={profileRecord?.avatar_path} size="xl" /><div className="profile-identity"><div className="profile-name-row"><h1>{displayName}</h1><VerifiedBadge verified={Boolean(profileRecord?.is_verified)} /></div><span className="profile-username">{username}</span><span className="profile-account-type">{profileRecord?.account_type || 'Account type not set'}</span><div className="product-meta"><MapPin size={13} /> {profileLocation}</div><div className="seller-stats"><Star size={13} fill="currentColor" /> {stats?.rating ? stats.rating.toFixed(1) : 'No rating yet'} <span>•</span> {stats?.reviews || 0} reviews <span>•</span> Member since {profileRecord?.created_at ? new Date(profileRecord.created_at).getFullYear() : '—'}</div></div><button type="button" className="outline-button" onClick={() => user ? open('personal') : onAuthRequired?.()}><Pencil size={14} /> {user ? 'Edit profile' : 'Sign in'}</button></div>{user && <div className="profile-cover-bottom"><span>{profileRecord?.bio || 'Add a short bio to help buyers know you.'}</span><span><VerifiedBadge verified={Boolean(profileRecord?.is_verified)} /></span></div>}</section>{user && <section className="profile-completion"><div><div className="eyebrow">PROFILE COMPLETION</div><strong>{completion}% complete</strong><span>{completionItems.filter((item) => !item.done).map((item) => item.label).join(' · ') || 'Your profile is complete.'}</span></div><div className="completion-track"><span style={{ width: `${completion}%` }} /></div><button type="button" className="text-action" onClick={() => open('personal')}>Complete profile <ArrowRight size={14} /></button></section>}<div className="profile-stats">{statsCards.map((stat) => <button type="button" key={stat.label} onClick={() => open(stat.page)}><strong>{stat.value}</strong><span>{stat.label}</span></button>)}</div><section><SectionLabel eyebrow="YOUR MARKETPLACE" title="Marketplace" /><div className="profile-menu-grid">{marketplaceItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}{isAdmin && <ProfileMenuCard item={{ label: 'Admin Moderation', description: 'Review seller listings securely', icon: ShieldCheck, page: 'admin', tone: 'coral' }} onOpen={open} />}</div></section><section><SectionLabel eyebrow="SELLER TOOLS" title="Grow with confidence" /><div className="profile-menu-grid">{sellerItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="ACCOUNT" title="Your account" /><div className="profile-menu-grid">{accountItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="PREFERENCES" title="Make it yours" /><div className="profile-menu-grid">{preferenceItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="PAYMENTS & SERVICES" title="Services" /><div className="profile-menu-grid">{paymentItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="TRUST & SAFETY" title="Stay safe" /><div className="profile-menu-grid">{safetyItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="SUPPORT & LEGAL" title="Need help?" /><div className="profile-menu-grid">{[{ label: 'Help Center', description: 'Answers for buying, selling, and safety', icon: CircleHelp, page: 'help', tone: 'navy' }, { label: 'Contact Support', description: 'Support contact is coming soon', icon: MessageCircle, page: 'support', tone: 'coral' }, { label: 'Terms & Conditions', description: 'Marketplace rules', icon: FileText, page: 'terms', tone: 'gold' }, { label: 'Privacy Policy', description: 'How Bese26 uses account data', icon: BookOpen, page: 'privacy-policy', tone: 'lavender' }, { label: 'Prohibited Items', description: 'What cannot be listed', icon: ShieldCheck, page: 'prohibited', tone: 'mint' }, { label: 'About Bese26', description: 'Mission and current version', icon: Info, page: 'about', tone: 'navy' }].map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section className="profile-account-actions"><button type="button" onClick={() => open('logout')}><LogOut size={16} /> Logout</button><button type="button" onClick={() => open('delete-account')}><Trash2 size={16} /> Delete account</button></section></div>;
}
