import { SITE_URL } from './lib/site';
import { Component, lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Bell,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Activity,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Cog,
  Dumbbell,
  Heart,
  House,
  Globe,
  Image as ImageIcon,
  Laptop,
  Mic,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Store,
  Tag,
  UtensilsCrossed,
  UserPlus,
  UserRound,
  WalletCards,
  Wheat,
  Wrench,
  Share2,
  ZoomIn,
  X,
  MoreVertical,
  Reply,
  BellOff,
  Flag,
  ShieldAlert,
} from 'lucide-react';

function lazyWithRetry(importer, chunkName) {
  return lazy(() => Promise.race([
    importer(),
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(`The ${chunkName} page took too long to load.`)), 12000)),
  ]).then((module) => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(`bese26:chunk-retry:${chunkName}`);
    return module;
  }).catch((error) => {
    if (typeof window !== 'undefined') {
      const retryKey = `bese26:chunk-retry:${chunkName}`;
      if (!window.sessionStorage.getItem(retryKey)) {
        window.sessionStorage.setItem(retryKey, '1');
        window.location.reload();
        return new Promise(() => {});
      }
    }
    throw error;
  }));
}

const ProfileView = lazyWithRetry(() => import('./components/ProfileView'), 'profile');
const BusinessOwnerView = lazyWithRetry(() => import('./components/ProfileView').then((module) => ({ default: module.BusinessProfilePage })), 'business-owner');
const AdminView = lazyWithRetry(() => import('./components/AdminView'), 'admin');
const SellView = lazyWithRetry(() => import('./components/SellView'), 'sell');
const ListingDetailsView = lazyWithRetry(() => import('./components/ListingDetailsView'), 'listing-details');
import AuthPanel from './components/AuthPanel';
import InstallPrompt from './components/InstallPrompt';
import VerificationBadges from './components/VerificationBadges';
import VoiceNotePlayer from './components/VoiceNotePlayer';
import { initAnalytics, trackEvent, trackPageView } from './lib/analytics';
import { getAvatarUrl, getOptimizedPublicImageUrl, isSupabaseConfigured, supabase } from './lib/supabase';
import { getBusinessLogoDisplayUrl, handleBusinessLogoLoad, isOfficialBese26Business } from './lib/businessLogoFit';
import { getPublicIdentity } from './lib/identity';
import { resolveNotificationDestination } from './lib/notificationDestinations';
import { I18nProvider, useI18n } from './lib/i18n';
import { createChatMeeting, createChatOffer, deleteChatMedia, deleteListing, fetchActiveListings, fetchTrendingListingScores, fetchActiveAdCampaigns, fetchNotifications, markNotificationRead, fetchBusinessDirectory, fetchCategories, fetchConversationDeals, fetchPublicBusiness, fetchPublicProfile, fetchPublicSellerViews, fetchPublicProfileViewSummary, recordPublicProfileView, fetchSavedIds, fetchConversations, fetchMessages, fetchListingDetails, fetchListingReviews, fetchListingComments, submitListingReview, submitListingComment, fetchSellerReviews, fetchListingContact, fetchSellerEntitlement, fetchMyListings, fetchMyBoosts, fetchSimilarListings, fetchSellerListings, fetchProfileRelations, fetchFollowSummary, ensureAccountDashboard, getBusinessProfile, ensureBusinessProfile, getFollowState, getOrCreateConversation, isAdminUser, fetchAdminAccess, blockUser, markConversationMessagesRead, recordListingView, recordRecentlyViewed, reportListing, submitUserReport, sendMessage, setListingStatus, signOut, startPaystackCheckout, subscribeToMessages, subscribeToNotifications, toggleFavorite, toggleFollow, getProfile, getProfileContacts, getProfilePreferences, updateChatMeeting, updateChatOffer, updateListing, updateProfilePreferences, uploadChatMedia, verifyPaystackPayment } from './lib/marketplace';
import { fetchPlatformSettings } from './lib/marketplace';
function BrandLoader({ message = 'Loading Bese26…', offline = false, compact = false }) {
  return <div className={`brand-loader ${compact ? 'brand-loader-compact' : ''}`} role="status" aria-live="polite">
    <div className="brand-loader-orbit" aria-hidden="true"><span className="brand-loader-ring" /><img src="/images/bese26-logo-icon.webp" alt="" /></div>
    <span className="brand-loader-message">{offline ? 'Checking your connection…' : message}</span>
  </div>;
}
function ConnectionScreen({ children }) {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const markOffline = () => setOffline(true);
    const markOnline = () => setOffline(false);
    window.addEventListener('offline', markOffline);
    window.addEventListener('online', markOnline);
    return () => { window.removeEventListener('offline', markOffline); window.removeEventListener('online', markOnline); };
  }, []);
  return <>{children}{offline && <div className="connection-screen" role="status" aria-live="polite"><div className="connection-screen-card"><div className="connection-screen-art" aria-hidden="true"><span className="connection-screen-ring ring-one" /><span className="connection-screen-ring ring-two" /><img src="/images/bese26-logo-icon.webp" alt="" /></div><div className="eyebrow">BESE26</div><h1>We are waiting for your connection</h1><p>Your marketplace is safe. Turn on mobile data or Wi-Fi and Bese26 will continue automatically.</p><span className="connection-screen-dots" aria-hidden="true"><i /><i /><i /></span><button type="button" className="primary-button" onClick={() => window.location.reload()}>Try again</button></div></div>}</>;
}

function SplashScreen({ message = 'Preparing your marketplace…', error = false, onRetry }) {
  return <div className="splash-screen" role="status" aria-label="Bese26 is loading">
    <div className="splash-brand-lockup">
      <img className="splash-bese26-logo" src="/images/bese26-logo-icon.webp" alt="Bese26" />
      <span className="splash-brand-name">Bese26<span>.shop</span></span>
    </div>
    <div className="splash-status" aria-live="polite"><strong>{message}</strong>{error && onRetry && <button type="button" className="splash-retry" onClick={onRetry}>Try again</button>}</div>
    <div className="splash-credit" aria-label="From SYLUTION">
      <span className="splash-credit-label">From</span>
      <img className="splash-sylution-logo" src="/branding-sylution-logo.webp" alt="SYLUTION" />
      <span className="splash-credit-name">SYLUTION</span>
    </div>
  </div>;
}

function MiniwebLoadingScreen() {
  return <MiniwebDashboardShell />;
}

function MiniwebDashboardShell() {
  return <div className="miniweb-dashboard-shell" aria-busy="true" aria-label="Opening Miniweb">
    <header className="miniweb-dashboard-shell-topbar"><span className="miniweb-dashboard-shell-brand"><img src="/images/bese26-logo-icon.webp" alt="" /> <strong>Bese26<span>.shop</span></strong></span><span className="miniweb-dashboard-shell-action" /></header>
    <main className="miniweb-dashboard-shell-main"><section className="miniweb-dashboard-shell-hero"><div className="miniweb-shell-avatar" /><div className="miniweb-shell-copy"><span /><span /><span /></div></section><section className="miniweb-dashboard-shell-stats"><span /><span /><span /><span /></section><section className="miniweb-dashboard-shell-card"><div className="miniweb-shell-heading"><span /><i /></div><div className="miniweb-shell-listings"><span /><span /><span /></div></section></main>
  </div>;
}

class AppErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Bese26 UI error', error, info); }
  retry = () => this.setState({ hasError: false, error: null });
  render() {
    if (!this.state.hasError) return this.props.children;
    const message = this.state.error?.message || 'Unknown UI error'; const offline = /network|fetch|load|connection|chunk/i.test(message); return <div className="route-error-card"><BrandLoader message={offline ? 'Reconnecting to Bese26…' : 'Bese26 needs a moment…'} offline={offline} compact /><h2>Something went wrong loading this page</h2><p>Your account session is safe. Try the page again or reload Bese26 if your connection changed.</p><div className="route-error-detail" role="alert"><strong>Technical detail</strong><code>{message}</code></div><div className="route-error-actions"><button type="button" className="secondary-button" onClick={this.retry}>Try again</button><button type="button" className="primary-button" onClick={() => window.location.reload()}>Reload Bese26</button></div></div>;
  }
}

const iconMap = {
  smartphone: Smartphone,
  laptop: Laptop,
  car: CarFront,
  house: House,
  shirt: Shirt,
  sprout: Sprout,
  sofa: Package,
  wrench: Wrench,
  cog: Cog,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  'shopping-basket': ShoppingBasket,
};

const mobileNavItems = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'sell', label: 'Sell', icon: Plus },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'analytics', label: 'Dashboard', icon: Activity },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

function formatNaira(value) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function normalizeWhatsAppUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const digits = raw.split('').filter((character) => character >= '0' && character <= '9').join('');
  if (!digits) return '';
  const normalized = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

const businessDayLabels = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];

function getBusinessHoursRows(hours = {}) {
  if (!hours || typeof hours !== 'object') return [];
  return businessDayLabels.map(([key, label]) => {
    const value = hours[key] || hours[label] || {};
    if (typeof value === 'string') return { key, label, value };
    if (value.closed) return { key, label, value: 'Closed' };
    if (!value.open && !value.close) return null;
    return { key, label, value: `${value.open || '—'} – ${value.close || '—'}` };
  }).filter(Boolean);
}

function Avatar({ initials, tone = 'rose', size = 'md' }) {
  return <div className={`avatar avatar-${tone} avatar-${size}`}>{initials}</div>;
}

function VerifiedBadge({ text = 'Verified' }) {
  return <span className="verified-badge"><BadgeCheck size={13} strokeWidth={2.6} /> {text}</span>;
}

function SectionHeading({ eyebrow, title, action, onAction }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action && <button className="text-button" onClick={onAction}>{action}<ArrowRight size={15} /></button>}
    </div>
  );
}

function ListingCardMedia({ listing, children }) {
  const images = useMemo(() => Array.from(new Set([...(listing.gallery || []), listing.image].filter(Boolean))), [listing.gallery, listing.image]);
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => { setActiveImage(0); }, [listing.id]);
  useEffect(() => { if (images.length < 2) return undefined; const timer = window.setInterval(() => setActiveImage((current) => (current + 1) % images.length), 7000); return () => window.clearInterval(timer); }, [images.length]);
  return <div className={`product-image-wrap ${images.length > 1 ? 'has-gallery' : ''}`}>
    {images.length ? images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={listing.title} className={`product-image product-image-slide ${index === activeImage ? 'is-active' : ''}`} loading="lazy" decoding="async" onError={(event) => event.currentTarget.classList.add('is-broken')} />) : <div className="product-image-placeholder"><Package size={26} /></div>}
    {images.length > 1 && <span className="product-gallery-dots" aria-label={`${images.length} listing photos`}>{images.map((image, index) => <i className={index === activeImage ? 'active' : ''} key={`${image}-dot-${index}`} />)}</span>}
    {children}
  </div>;
}

const ProductCard = memo(function ProductCard({ listing, onOpen, isSaved, onToggleSave, compact = false, featured = false }) {
  const isNew = Boolean(listing.raw?.created_at && Date.now() - new Date(listing.raw.created_at).getTime() < 24 * 60 * 60 * 1000);
  const isTopRated = Number(listing.sellerRating || 0) >= 4.5;
  return (
    <article className={`product-card ${compact ? 'product-card-compact' : ''}`} role="button" tabIndex={0} aria-label={`Open listing: ${listing.title}`} onClick={() => onOpen(listing)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); onOpen(listing); } }}>
      <ListingCardMedia listing={listing}>
        <div className="listing-card-badges">{featured && <span className="featured-pill"><Star size={11} fill="currentColor" /> FEATURED</span>}{listing.promoted && <span className="promoted-pill"><Sparkles size={12} /> SPONSORED</span>}{isNew && <span className="fresh-pill">NEW</span>}{isTopRated && <span className="trust-pill"><BadgeCheck size={11} /> TOP RATED</span>}</div>
        <button className={`save-button ${isSaved ? 'saved' : ''}`} aria-label={isSaved ? 'Remove from saved' : 'Save listing'} onClick={(event) => { event.stopPropagation(); onToggleSave(listing.id); }}>
          <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </ListingCardMedia>
      <div className="product-info">
        <div className="product-price">{listing.price}</div>
        <h3>{listing.title}</h3>
        <div className="product-meta"><MapPin size={13} /> {listing.location}</div>
        <div className="listing-seller-line"><span className={`listing-seller-avatar ${listing.sellerAvatarIsBusinessLogo ? 'is-business-logo' : ''}`}>{listing.sellerAvatar ? <img src={listing.sellerAvatar} alt="" onLoad={listing.sellerAvatarIsBusinessLogo ? handleBusinessLogoLoad : undefined} onError={(event) => { event.currentTarget.remove(); event.currentTarget.parentElement.textContent = listing.sellerInitials || 'BE'; }} /> : listing.sellerInitials || 'BE'}</span><div className="listing-seller-copy"><span className="listing-seller-name">{listing.sellerDisplayName || listing.seller}</span><VerificationBadges idVerified={listing.idVerified} cacVerified={listing.cacVerified} compact /></div></div>
        <div className="product-foot">
          <span>{listing.condition}</span>
          <span>{listing.posted}</span>
          <span aria-label={`${Number(listing.viewsCount || listing.raw?.views_count || 0).toLocaleString('en-NG')} views`}>Views {Number(listing.viewsCount || listing.raw?.views_count || 0).toLocaleString('en-NG')}</span>
        </div>
      </div>
    </article>
  );
});

function ListingGridSkeleton({ count = 6 }) {
  return <div className="product-grid listing-grid-skeleton" aria-label="Loading listings" aria-busy="true">{Array.from({ length: count }, (_, index) => <article className="product-card skeleton-product-card" key={index}><div className="skeleton-block skeleton-product-image" /><div className="skeleton-product-copy"><span className="skeleton-block skeleton-line skeleton-line-short" /><span className="skeleton-block skeleton-line skeleton-line-title" /><span className="skeleton-block skeleton-line skeleton-line-price" /><span className="skeleton-block skeleton-line skeleton-line-meta" /><span className="skeleton-block skeleton-button" /></div></article>)}</div>;
}

function CategoryTile({ category, onClick }) {
  const Icon = iconMap[category.icon] || Package;
  return (
    <button className={`category-tile tone-${category.tone}`} onClick={onClick}>
      <span className="category-icon"><Icon size={20} strokeWidth={1.9} /></span>
      <span>{category.name}</span>
      <ChevronRight size={14} className="category-chevron" />
    </button>
  );
}

function QuickAction({ icon: Icon, label, note, tone, onClick }) {
  return <button className={`quick-action quick-action-${tone}`} onClick={onClick}><span className="quick-action-icon"><Icon size={17} /></span><span><strong>{label}</strong><small>{note}</small></span><ChevronRight size={14} className="quick-action-arrow" /></button>;
}

function UnavailableView({ icon: Icon, eyebrow, title, description, onBack, backLabel = 'Back to Home' }) {
  return <div className="page-stack unavailable-page"><section className="unavailable-card"><span className="unavailable-icon"><Icon size={24} /></span><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p><button className="primary-button" onClick={onBack}>{backLabel}<ArrowRight size={16} /></button></section></div>;
}

function NotificationsView({ user, onAuthRequired, onBack, onNotice, onNavigate, onOpenListing, onOpenConversation, onOpenPublicProfile, onOpenProfilePage, browserNotificationPermission, onEnableBrowserNotifications }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(Boolean(user)); const [expanded, setExpanded] = useState({}); const [notificationSearch, setNotificationSearch] = useState('');
  useEffect(() => { let mounted = true; if (!user) { setLoading(false); return undefined; } fetchNotifications(user.id).then((rows) => { if (mounted) setItems(rows || []); }).catch((error) => mounted && onNotice?.(error.message || 'Could not load notifications.')).finally(() => mounted && setLoading(false)); const unsubscribe = subscribeToNotifications(user.id, (payload) => { if (!mounted || !payload?.new) return; fetchNotifications(user.id).then((rows) => mounted && setItems(rows || [])).catch(() => {}); }); return () => { mounted = false; unsubscribe?.(); }; }, [user, onNotice]);
  const unreadCount = items.filter((item) => !item.read_at).length;
  const markAllAsRead = async () => { const unread = items.filter((item) => !item.read_at); const results = await Promise.allSettled(unread.map((item) => markNotificationRead(item.id, user.id))); const updatedIds = new Set(unread.filter((_, index) => results[index].status === 'fulfilled').map((item) => item.id)); if (updatedIds.size) setItems((current) => current.map((item) => updatedIds.has(item.id) ? { ...item, read_at: new Date().toISOString() } : item)); if (updatedIds.size < unread.length) onNotice?.('Some notifications could not be marked as read. Please try again.'); };
  const open = async (item) => {
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id, user.id);
        setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
      } catch {}
    }
    const destination = resolveNotificationDestination(item);
    if (destination.kind === 'conversation') {
      if (onOpenConversation) onOpenConversation(destination.conversationId, destination.target);
      else onNotice?.('This conversation cannot be opened right now.');
      return;
    }
    if (destination.kind === 'listing') {
      try {
        const listing = await fetchListingDetails(destination.listingId);
        if (listing) onOpenListing?.(listing, destination.focus);
        else onNotice?.('This listing is no longer available.');
      } catch {
        onNotice?.('Could not open this listing. Please try again.');
      }
      return;
    }
    if (destination.kind === 'public-profile') {
      if (destination.username) onOpenPublicProfile?.(destination.username);
      else onNotice?.('This member does not have a public profile link yet.');
      return;
    }
    if (destination.kind === 'account') {
      onOpenProfilePage?.(destination.page);
      return;
    }
    onNotice?.('This notification does not have a direct destination yet.');
  };
  const relativeTime = (value) => { if (!value) return 'Recently'; const diff = Math.max(0, Date.now() - new Date(value).getTime()); const minutes = Math.floor(diff / 60000); if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return days === 1 ? 'Yesterday' : `${days}d ago`; };
  const isCurrent = (record = {}) => Boolean(record.is_verified || String(record.verification_status || '').toLowerCase() === 'verified') && (!record.verification_expires_at || new Date(record.verification_expires_at).getTime() > Date.now());
  const isAdminNotification = (item) => ['admin', 'moderator'].includes(String(item.actor?.app_role || '').toLowerCase()) || ['listing_moderated', 'identity_verification_reviewed'].includes(item.notification_type);
  const identityBusiness = (item) => item.actorBusiness || item.business || null;
  const notificationIdentity = (item) => getPublicIdentity({ ...(item.actor || {}), business: identityBusiness(item) }, 'Bese26');
  const verificationFor = (item) => { if (isAdminNotification(item) || (!item.actor_id && !identityBusiness(item))) return <span className="notification-admin-mark" aria-label="Official Bese26 notification"><ShieldCheck size={14} /></span>; const business = identityBusiness(item); const idVerified = !business && isCurrent(item.actor || {}); const cacVerified = Boolean(item.actor?.cac_verified_name) || Boolean(business && isCurrent(business)); if (idVerified || cacVerified) return <VerificationBadges idVerified={idVerified} cacVerified={cacVerified} compact />; return null; };
  const senderName = (item) => isAdminNotification(item) ? 'Bese26' : notificationIdentity(item).name;
  const senderImage = (item) => isAdminNotification(item) && !item.data?.listing_id ? '/images/bese26-logo-icon.webp' : item.data?.listing_id && item.listing?.image_url ? item.listing.image_url : notificationIdentity(item).image || '/images/bese26-logo-icon.webp';
  const senderIsBusinessLogo = (item) => Boolean(!isAdminNotification(item) && notificationIdentity(item).hasBusinessLogo && !(item.data?.listing_id && item.listing?.image_url));
  const messageFor = (item) => item.body || item.title || 'You have a new Bese26 update.';
  const today = new Date().toDateString();
  const searchNeedle = notificationSearch.trim().toLowerCase(); const visibleItems = searchNeedle ? items.filter((item) => `${item.title || ''} ${item.body || ''} ${senderName(item)} ${item.notification_type || ''}`.toLowerCase().includes(searchNeedle)) : items; const grouped = [{ label: 'New', rows: visibleItems.filter((item) => new Date(item.created_at || 0).toDateString() === today) }, { label: 'Earlier', rows: visibleItems.filter((item) => new Date(item.created_at || 0).toDateString() !== today) }].filter((group) => group.rows.length);
  const renderRow = (item) => { const message = messageFor(item); const businessLogo = senderIsBusinessLogo(item); const isExpanded = Boolean(expanded[item.id]); const isLong = message.length > 150; const displayMessage = !isExpanded && isLong ? `${message.slice(0, 150).trimEnd()}…` : message; return <article className={`notification-feed-row ${item.read_at ? 'is-read' : 'is-unread'}`} key={item.id} role="button" tabIndex={0} onClick={() => open(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(item); } }}><div className={`notification-feed-media ${businessLogo ? 'is-business-logo' : ''}`}><img src={senderImage(item)} alt="" onLoad={businessLogo ? handleBusinessLogoLoad : undefined} onError={(event) => { event.currentTarget.src = '/images/bese26-logo-icon.webp'; }} /></div><div className="notification-feed-content"><div className="notification-feed-heading"><strong>{senderName(item)}</strong>{verificationFor(item)}</div><p>{displayMessage}</p><div className="notification-feed-meta"><time>{relativeTime(item.created_at)}</time>{isLong && <button type="button" className="notification-more" onClick={(event) => { event.stopPropagation(); setExpanded((current) => ({ ...current, [item.id]: !isExpanded })); }}>{isExpanded ? 'Less' : 'More'}</button>}</div></div>{!item.read_at && <span className="notification-unread-dot" aria-label="Unread" />}</article>; };
  if (!user) return <div className="page-stack notifications-page"><section className="notifications-empty"><Bell size={30} /><div className="eyebrow">YOUR NOTIFICATIONS</div><h1>Stay up to date</h1><p>Sign in to see listing updates, messages, offers, and safety alerts.</p><button className="primary-button" onClick={onAuthRequired}>Login to continue</button><button className="text-action" onClick={onBack}>Back to Home</button></section></div>;
  return <div className="page-stack notifications-page notification-center"><div className="notification-search-shell"><Search size={18} /><input type="search" value={notificationSearch} onChange={(event) => setNotificationSearch(event.target.value)} placeholder="Search notifications" aria-label="Search notifications" />{notificationSearch && <button type="button" aria-label="Clear notification search" onClick={() => setNotificationSearch()}><X size={15} /></button>}<span className="notification-search-kbd">⌘ K</span></div><header className="notification-center-header"><div><h1>Notifications</h1><p>Updates about your listings, messages and account.</p><div className="notification-device-status"><Bell size={14} />{browserNotificationPermission === 'granted' ? 'Phone alerts are on' : browserNotificationPermission === 'denied' ? 'Phone alerts are blocked in browser settings' : 'Get message and listing alerts at the top of your phone'}</div></div><div className="notification-header-actions"><div className="notification-header-icon" aria-label={`${unreadCount} unread notifications`}><Bell size={21} />{unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}</div>{browserNotificationPermission !== 'granted' && browserNotificationPermission !== 'denied' && <button type="button" className="notification-enable-device" onClick={onEnableBrowserNotifications}><Bell size={14} /> Turn on phone alerts</button>}{unreadCount > 0 && <button type="button" className="notification-mark-all" onClick={markAllAsRead}>Mark all as read</button>}</div></header>{loading ? <BrandLoader message="Loading your notifications…" compact /> : grouped.length ? <div className="notification-feed">{grouped.map((group) => <section className="notification-feed-group" key={group.label}><h2>{group.label}</h2>{group.rows.map(renderRow)}</section>)}</div> : <div className="notifications-empty compact"><Bell size={26} /><h2>{notificationSearch ? 'No matching notifications' : 'No notifications yet'}</h2><p>{notificationSearch ? 'Try another word or clear the search.' : 'New messages, listing updates, and account alerts will appear here.'}</p></div>}</div>;
}
const subscriptionPlans = [
  { key: 'free', name: 'Free', price: 0, cadence: 'forever', summary: 'For anyone starting to sell.', highlight: '3 active listings included', features: ['3 active marketplace listings', 'Basic seller profile', 'Bese26 chat with buyers', 'Saved items and seller following', 'Listing review before publishing', 'Edit, pause, resume and mark as sold', 'Personal public profile link'], tone: 'free' },
  { key: 'basic', name: 'Basic', price: 2500, cadence: 'month', summary: 'For a growing local seller.', highlight: '10 active listings', features: ['Everything in Free', '10 active listings', 'Basic seller analytics', 'Listing management tools', 'Saved searches', 'Standard seller support', 'Personal publishing identity', 'Public personal profile link'], tone: 'basic' },
  { key: 'premium', name: 'Premium', price: 4500, cadence: 'month', summary: 'For sellers with regular stock.', highlight: '20 active listings · verification eligible', features: ['Everything in Basic', '20 active listings', 'Advanced seller analytics', 'Detailed seller dashboard', 'Identity verification request, subject to review', 'Verified badge after approval while active', '5 free boost credits every month', 'Priority support', 'Advanced listing organization'], tone: 'premium', popular: true },
];



function SubscriptionPlanCard({ plan, expanded, onToggle, onChoose, currentPlan, busyPlan }) {
  const isCurrent = currentPlan === plan.key;
  return <article className={`subscription-plan-card ${plan.tone} ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}><div className="subscription-plan-top"><span className="subscription-plan-badge">{plan.popular ? 'MOST POPULAR' : plan.key === 'free' ? 'START HERE' : plan.name.toUpperCase()}</span>{isCurrent && <span className="current-plan-pill">Your plan</span>}</div><h3>{plan.name}</h3><p className="subscription-plan-summary">{plan.summary}</p><div className="subscription-plan-price">{plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : formatNaira(plan.price)}<small>{plan.price === null ? ' pricing' : ` / ${plan.cadence}`}</small></div><strong className="subscription-plan-highlight"><Check size={15} /> {plan.highlight}</strong><div className="subscription-plan-actions"><button type="button" className={plan.key === 'free' ? 'secondary-button' : 'primary-button'} onClick={() => onChoose(plan)} disabled={isCurrent || busyPlan === plan.key}>{isCurrent ? 'Current plan' : busyPlan === plan.key ? 'Opening…' : plan.key === 'free' ? 'Use Free plan' : plan.price === null ? 'Contact for plan' : 'Pay for one month'} {busyPlan === plan.key ? null : <ArrowRight size={15} />}</button></div><button type="button" className="subscription-more-button" aria-expanded={expanded} aria-controls={`plan-features-${plan.key}`} onClick={() => onToggle(plan.key)}><span>{expanded ? 'Less' : 'More'}</span><ChevronDown size={15} className={expanded ? 'rotate-180' : ''} /></button><div id={`plan-features-${plan.key}`} className={`subscription-features ${expanded ? 'is-expanded' : ''}`}><div className="eyebrow">WHAT YOU GET</div><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}</ul></div></article>;
}

function SubscriptionView({ user, onBack, onAuthRequired, onDemoAction }) {
  const [expanded, setExpanded] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [busyPlan, setBusyPlan] = useState('');
  useEffect(() => { let mounted = true; if (!user) { setEntitlement(null); return undefined; } fetchSellerEntitlement().then((data) => mounted && setEntitlement(data)).catch(() => {}); return () => { mounted = false; }; }, [user]);
  const choose = async (plan) => { if (plan.key === 'free') { onDemoAction('The Free plan includes 3 active listings.'); return; } if (plan.price === null) { onDemoAction('Enterprise Lux needs a custom business quote.'); return; } if (!user) { onAuthRequired?.(); return; } trackEvent('begin_checkout', { plan_name: plan.key, value: plan.price, currency: 'NGN' }); setBusyPlan(plan.key); try { const checkout = await startPaystackCheckout(plan.key); if (!checkout.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(checkout.authorization_url); } catch (error) { onDemoAction(error.message || 'Could not start Paystack checkout.'); setBusyPlan(''); } };
  return <div className="page-stack subscription-page"><div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Payments & services</span></div><section className="subscription-hero"><div><div className="eyebrow light">BESE26 SELLER PLANS</div><h1>Grow when your business is ready.</h1><p>Start free with 3 active listings, then upgrade when you need more capacity, tools, verification eligibility, or visibility credits.</p></div><span className="subscription-hero-mark"><Sparkles size={22} /></span></section>{user && entitlement && <section className="subscription-usage"><div><div className="eyebrow">YOUR CURRENT ACCESS</div><strong>{entitlement.is_paid ? `${entitlement.plan_key} plan` : 'Free plan'}</strong><span>{`${entitlement.free_posts_used || 0} of ${entitlement.listing_limit} listing slots used · ${Math.max((entitlement.listing_limit || 3) - (entitlement.free_posts_used || 0), 0)} remaining`}</span></div><div className="subscription-usage-track"><span style={{ width: `${entitlement.is_paid ? 100 : Math.max(0, (entitlement.free_posts_remaining / entitlement.free_posts_limit) * 100)}%` }} /></div></section>}<div className="subscription-section-heading"><div><div className="eyebrow">SIMPLE START</div><h2>Choose the right level</h2></div><span>One month · prices match Paystack</span></div><div className="subscription-payment-note"><ShieldCheck size={16} /><span><strong>Secure one-time payment</strong><small>Checkout opens in Paystack. Your selected plan is active for one month after Paystack verifies the payment.</small></span><b>NGN</b></div><div className="subscription-plan-grid">{subscriptionPlans.map((plan) => <SubscriptionPlanCard plan={plan} key={plan.key} expanded={expanded === plan.key} onToggle={setExpanded} onChoose={choose} currentPlan={entitlement?.is_paid ? entitlement.plan_key : 'free'} busyPlan={busyPlan} />)}</div><p className="subscription-disclaimer"><ShieldCheck size={15} /> Plan access, verification eligibility, and boost credits remain active for the paid month. There is no automatic renewal; choose and pay again when the plan expires. Verification is subject to review and approval. Paystack verifies the payment reference, amount, and currency before access is granted.</p></div>;
}

const publicInfoPages = {
  terms: { eyebrow: 'LEGAL', title: 'Terms of Service', icon: ShieldCheck, intro: 'The rules that keep Bese26 fair, useful, and safe for buyers and sellers.', sections: [['Use Bese26 lawfully', 'Provide accurate account, listing, pricing, and business information. Do not use the marketplace for fraud, harassment, impersonation, or prohibited transactions.'], ['Respect other members', 'Keep conversations respectful and use Bese26 messaging when discussing a listing. Do not request passwords, secret keys, or unnecessary identity documents from other members.'], ['Listings and moderation', 'Listings may be reviewed before publication. Bese26 may pause, reject, or remove content that violates marketplace rules or creates a safety risk.'], ['Plans and payments', 'Paid plans and boosts become active only after the payment provider confirms the payment reference, amount, and currency.'] ] },
  privacy: { eyebrow: 'LEGAL', title: 'Privacy Policy', icon: ShieldCheck, intro: 'How Bese26 uses account and marketplace information to provide its services.', sections: [['Information we use', 'Bese26 uses account details, profile information, listing data, messages, and profile details to operate the marketplace and provide seller tools.'], ['Private documents', 'Verification documents are kept in private storage and are not displayed on public profiles, listings, storefronts, or search pages.'], ['Safety and moderation', 'Information may be used to investigate reports, protect members, review listings, and prevent abuse. Access is limited to authorized workflows.'], ['Your choices', 'You can update profile and profile details, manage communication preferences, and contact support about an account or privacy concern.'] ] },
  'refund-policy': { eyebrow: 'PAYMENTS', title: 'Refund Policy', icon: WalletCards, intro: 'What to do when you have a question about a plan, boost, or payment.', sections: [['Payment verification', 'Bese26 activates paid access only after Paystack confirms the transaction. A checkout attempt that was not confirmed does not activate a plan.'], ['Payment concerns', 'If money was deducted but access did not change, keep the Paystack reference and contact info@bese26.shop. The payment will be checked against the verified transaction record.'], ['Plans and boosts', 'Subscription access and boost credits are provided for the active paid period. Visibility boosts do not guarantee sales, buyers, or a particular search position.'], ['Support details', 'Include your account email, plan or boost name, transaction reference, payment date, and a short explanation when contacting support.'] ] },
  safety: { eyebrow: 'TRUST & SAFETY', title: 'Marketplace Safety', icon: ShieldCheck, intro: 'Simple practices for safer buying, selling, messaging, and meetups.', sections: [['Before you pay', 'Check the listing details, seller profile, price, location, and condition. Be careful with requests for urgent payment or unusual payment methods.'], ['Keep conversations clear', 'Use Bese26 chat to ask questions and keep important transaction details in writing. Never share your password, Paystack key, or one-time authentication code.'], ['Meet safely', 'Choose a public meeting place, tell someone you trust where you are going, and inspect the item before completing a handover.'], ['Report concerns', 'Use the report tools for suspicious listings, scams, harassment, fake information, or prohibited items. Contact info@bese26.shop for support.'] ] },
};
function PublicInfoPage({ page, onBack }) {
  const content = publicInfoPages[page] || publicInfoPages.terms;
  const Icon = content.icon;
  return <div className="page-stack public-info-page"><div className="back-row"><button type="button" className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Public information</span></div><section className="public-info-hero"><span className="public-info-icon"><Icon size={24} /></span><div><div className="eyebrow">{content.eyebrow}</div><h1>{content.title}</h1><p>{content.intro}</p></div></section><div className="public-info-sections">{content.sections.map(([heading, body]) => <article key={heading}><strong>{heading}</strong><p>{body}</p></article>)}</div><div className="public-info-support"><strong>Need help?</strong><span>Contact Bese26 support at <a href="mailto:info@bese26.shop?subject=Bese26%20Support">info@bese26.shop</a>.</span></div></div>;
}


function FirstVisitCard({ user, onNavigate }) {
  const [dismissed, setDismissed] = useState(() => { try { return window.localStorage.getItem('bese26:onboarding-dismissed') === '1'; } catch { return false; } });
  const [done, setDone] = useState(() => { try { return JSON.parse(window.localStorage.getItem('bese26:onboarding-progress') || '{}'); } catch { return {}; } });
  const update = (key, action) => { const next = { ...done, [key]: true }; setDone(next); try { window.localStorage.setItem('bese26:onboarding-progress', JSON.stringify(next)); } catch {} action?.(); };
  if (dismissed) return null;
  if (!user && !done.intent) return <section className="first-visit-card" aria-label="Choose how to use Bese26"><div><div className="eyebrow">WELCOME TO BESE26</div><h2>What do you want to do today?</h2><p>Browse marketplace listings or start selling in a few simple steps.</p></div><div className="first-visit-actions"><button type="button" className="primary-button" onClick={() => update('intent', () => onNavigate('search'))}><ShoppingBasket size={16} /> I want to buy</button><button type="button" className="secondary-button" onClick={() => update('intent', () => onNavigate('sell'))}><Plus size={16} /> I want to sell</button></div><button type="button" className="text-action first-visit-dismiss" onClick={() => { setDismissed(true); try { window.localStorage.setItem('bese26:onboarding-dismissed', '1'); } catch {} }}>Skip for now</button></section>;
  if (!user) return null;
  return null;
}
function DashboardProfileSnapshot({ user, onNavigate, onOpenProfilePage }) {
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  useEffect(() => {
    let mounted = true;
    if (!user?.id || !isSupabaseConfigured) { setProfile(null); setContacts(null); setLoading(false); return undefined; }
    setLoading(true);
    Promise.all([getProfile(user.id), getProfileContacts(user.id)])
      .then(([nextProfile, nextContacts]) => { if (mounted) { setProfile(nextProfile); setContacts(nextContacts); } })
      .catch(() => { if (mounted) { setProfile(null); setContacts(null); } })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [user?.id]);
  if (!user) return null;
  const name = profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Bese26 user';
  const username = profile?.username ? `@${profile.username}` : '@member';
  const openProfileMiniweb = () => onNavigate('business');
  return <section className="dashboard-profile-snapshot profile-miniweb-card" aria-label="Your Miniweb profile">
    <div className="dashboard-miniweb-action">
      <span className="dashboard-miniweb-icon" aria-hidden="true"><UserRound size={22} /></span>
      <div className="dashboard-miniweb-copy"><small>{loading ? 'BESE26 MINIWEB PROFILE' : 'PROFILE ƊINKA SHINE MINIWEB ƊINKA'}</small><strong>{loading ? 'Loading profile…' : `Duba Miniweb ɗin ${name}`}</strong><p>{loading ? 'Ana ɗauko bayanan profile ɗinka.' : 'Sarrafa suna, hoto, bayaninka da abin da masu saye za su gani daga profile ɗinka.'}</p></div>
      <button type="button" className="dashboard-miniweb-button" onClick={openProfileMiniweb}><span>Duba Miniweb</span><small className="dashboard-miniweb-hint">Danna nan</small><ArrowRight size={16} /></button>
    </div>
  </section>;
}
function MailIcon() { return <span className="dashboard-profile-detail-icon" aria-hidden="true">@</span>; }
function PhoneIcon() { return <span className="dashboard-profile-detail-icon" aria-hidden="true">+234</span>; }
function SponsoredBanner({ campaigns = [], placement, className = '' }) {
  const campaign = campaigns.find((item) => item.placement === placement && item.image_url);
  if (!campaign) return null;
  const linked = Boolean(campaign.cta_target?.trim());
  const open = () => linked && window.location.assign(campaign.cta_target);
  const image = <img src={getOptimizedPublicImageUrl(campaign.image_url, { width: 1600 })} alt={campaign.title || 'Sponsored promotion'} loading="lazy" decoding="async" />;
  return <section className={`sponsored-placement ${className}`} aria-label="Sponsored promotion"><div className="sponsored-placement-label"><span>SPONSORED</span><small>Advertisement</small></div>{linked ? <button type="button" className="sponsored-placement-art linked" onClick={open} aria-label={campaign.title || 'Open sponsored promotion'}>{image}</button> : <div className="sponsored-placement-art" aria-label="Sponsored promotion">{image}</div>}</section>;
}
function homeRotationHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function HomeView({ user, marketListings, trendingScores = [], marketLoading = false, adCampaigns = [], userPlace = '', locationBusy = false, onUseLocation, onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onOpenProfilePage, onShowNotifications, onLanguageChange }) {
  const { locale, locales, t } = useI18n();
  const [geo, setGeo] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedLga, setSelectedLga] = useState('');
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  useEffect(() => { if (!locationPickerOpen || geo) return undefined; let active = true; import('./data/nigeria-lgas.json').then((module) => { if (active) setGeo(module.default || module); }).catch(() => {}); return () => { active = false; }; }, [locationPickerOpen, geo]);
  const states = useMemo(() => (geo || []).map((item) => ({ isoCode: item.state, name: item.state })), [geo]);
  const localGovernments = useMemo(() => {
    if (!selectedState) return [];
    return (geo || []).find((item) => item.state === selectedState)?.lgas.map((name) => ({ name })) || [];
  }, [selectedState, geo]);
  const findByLocation = () => onSearch([selectedLga, states.find((state) => state.isoCode === selectedState)?.name, 'Nigeria'].filter(Boolean).join(' '));
  const selectLanguage = (event) => onLanguageChange?.(event.target.value);
  const [homeSearch, setHomeSearch] = useState('');
  const featuredListings = useMemo(() => {
    const scores = new Map((trendingScores || []).map((row, index) => [row.listing_id, { ...row, rank: index }]));
    const seen = new Set();
    const candidates = [...marketListings].filter((listing) => {
      const key = String(listing.title || listing.id || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((listing) => ({ ...listing, ...scores.get(listing.id), viewsCount: listing.viewsCount || Number(listing.raw?.views_count || 0) }))
      .sort((a, b) => Number(b.trending_score || b.trendingScore || 0) - Number(a.trending_score || a.trendingScore || 0) || Number(b.viewsCount || 0) - Number(a.viewsCount || 0) || new Date(b.raw?.created_at || 0) - new Date(a.raw?.created_at || 0));
    if (!candidates.length) return [];
    const dayKey = new Date().toISOString().slice(0, 10);
    const offset = homeRotationHash(`${dayKey}:${userPlace || 'Nigeria'}`) % candidates.length;
    const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
    const sellerGroups = new Map();
    rotated.forEach((item) => {
      const sellerKey = item.sellerId || item.seller || item.id;
      const group = sellerGroups.get(sellerKey) || [];
      group.push(item);
      sellerGroups.set(sellerKey, group);
    });
    const fair = [];
    let depth = 0;
    while (fair.length < rotated.length) {
      let added = false;
      for (const group of sellerGroups.values()) {
        if (group[depth]) { fair.push(group[depth]); added = true; }
      }
      if (!added) break;
      depth += 1;
    }
    return fair.slice(0, 50);
  }, [marketListings, trendingScores, userPlace]);
  return (
    <div className="page-stack home-page">
      <section className="marketplace-search-hero" aria-label="Find products and services">
        <div className="marketplace-hero-top"><div className="marketplace-hero-brand-lockup"><span className="marketplace-hero-brand"><img className="marketplace-official-logo-main" src="/images/bese26-logo-icon.webp" alt="Bese26" /><strong>bese26<span>.shop</span></strong></span></div><label className="language-switcher marketplace-language" title={t('Choose language')}><span className="language-icon-wrap"><Globe size={15} /></span><select value={locale} onChange={selectLanguage} aria-label={t('Choose language')}>{locales.map((item) => <option value={item.code} key={item.code}>{item.native}</option>)}</select><ChevronDown size={13} /></label></div>
        <div className="marketplace-hero-content"><div className="eyebrow">BESE26 MARKETPLACE</div><h1>{t('What are you looking for?')}</h1><p>{t('Find trusted products, services, and businesses near you.')}</p></div>
        <div className="marketplace-hero-search-row"><button type="button" className="marketplace-country-button" onClick={() => setLocationPickerOpen((open) => !open)}><MapPin size={17} /><span>{selectedState || t('Nigeria')}</span><ChevronDown size={16} /></button><div className="marketplace-search-input"><Search size={21} /><input aria-label={t('Search listings')} value={homeSearch} onChange={(event) => setHomeSearch(event.target.value)} placeholder={t('I am looking for…')} onKeyDown={(event) => event.key === 'Enter' && onSearch(homeSearch)} /><button type="button" onClick={() => onSearch(homeSearch)} aria-label={t('Search')}><ArrowRight size={19} /></button></div></div>
        {locationPickerOpen && <div id="home-location-picker" className="home-location-picker marketplace-location-picker" aria-label={t('Choose listing location')}><label><span>State</span><select value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setSelectedLga(''); }} disabled={!geo}><option value="">Select state</option>{states.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}</select></label><label><span>Local government</span><select value={selectedLga} onChange={(event) => setSelectedLga(event.target.value)} disabled={!selectedState}><option value="">Select local government</option>{localGovernments.map((lga) => <option key={lga.name}>{lga.name}</option>)}</select></label><button type="button" className="home-location-search" onClick={findByLocation} disabled={!selectedState || !selectedLga}><Search size={15} /> {t('Find listings')}</button></div>}
        <div className="marketplace-quick-actions"><button type="button" onClick={() => onNavigate('sell')}><Plus size={15} /> {t('How to sell')}</button><button type="button" onClick={() => onSearch('')}><Search size={15} /> {t('How to buy')}</button><button type="button" onClick={() => onNavigate('business')}><Store size={15} /> {t('Explore shops')}</button><button type="button" onClick={() => onNavigate('sell')}><Sparkles size={15} /> {t('List an item')}</button></div>
      </section>


      <section className="popular-categories"><SectionHeading eyebrow={t('CHOOSE A CATEGORY')} title={t('What are you looking for?')} action={t('View all')} onAction={() => onSearch('')} /><div className="popular-category-rail">{[['Phones', Smartphone, 'tone-lavender'], ['Cars', CarFront, 'tone-blue'], ['Property', Building2, 'tone-sand'], ['Fashion', Shirt, 'tone-pink'], ['Agriculture', Wheat, 'tone-green'], ['Services', BriefcaseBusiness, 'tone-peach'], ['Food', UtensilsCrossed, 'tone-gold'], ['Businesses', Store, 'tone-coral']].map(([label, Icon, tone]) => <button type="button" className={`popular-category ${tone}`} key={label} onClick={() => onSearch(label)} aria-label={`${t('Browse listings')}: ${t(label)}`}><span><Icon size={20} strokeWidth={2.1} /></span><strong>{t(label)}</strong></button>)}</div></section>
      {featuredListings.length > 0 && <section className="trending-deals-section" aria-label={t('Trending deals')}><div className="trending-deals-heading"><div><div className="eyebrow">{t('HOT OFFERS')}</div><h2>{t('Trending deals')}</h2><p>{t('Popular picks buyers are checking out now.')}</p></div><button type="button" className="trending-deals-view-all" onClick={() => onNavigate('search')}>{t('View all')} <ArrowRight size={15} /></button></div><div className="trending-deals-rail">{featuredListings.slice(0, 4).map((listing) => <button type="button" className="trending-deal-card" key={listing.id} onClick={() => onOpenListing(listing)}><span className="trending-deal-image">{listing.image ? <img src={listing.image} alt="" loading="lazy" /> : <Package size={24} />}</span><span className="trending-deal-copy"><strong>{listing.title}</strong><b>{listing.price}</b><small><MapPin size={11} /> {listing.location}</small><small className="trending-deal-views">Views {Number(listing.viewsCount || listing.raw?.views_count || 0).toLocaleString('en-NG')}{listing.promoted ? ' · Sponsored' : ''}</small></span><span className="trending-deal-arrow"><ArrowUpRight size={15} /></span></button>)}</div></section>}

      <section className="home-featured-section">
        <div className="home-featured-heading"><div><div className="eyebrow">{t('CURATED FOR YOU')}</div><h2>{t('Featured listings')}</h2></div><span>{featuredListings.length ? t('Fresh picks for you') : t('New picks appear here')}</span></div>
        {marketLoading && !marketListings.length ? <><div className="loading-section-note"><span className="loading-pulse-dot" /> {t('Loading the newest listings…')}</div><ListingGridSkeleton count={6} /></> : featuredListings.length ? <><div className="product-grid home-featured-grid">{featuredListings.map((listing, index) => <ProductCard key={listing.id} listing={listing} featured={index < 4} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div><button type="button" className="home-view-all-button" onClick={() => onNavigate('search')}>{t('View all listings')} <ArrowRight size={16} /></button></> : <div className="empty-state"><Package size={25} /><h3>{t('No live listings yet')}</h3><p>{t('Be one of the first sellers to add a product. New listings appear here after review.')}</p><div className="empty-state-actions"><button className="primary-button" onClick={() => onNavigate('sell')}><Plus size={15} /> {t('List an item')}</button><button className="secondary-button" onClick={() => onNavigate('business')}><Store size={15} /> {t('Explore businesses')}</button></div></div>}
      </section>

      <section className="trust-strip" aria-label="Why use Bese26">
        <div className="trust-strip-item"><span className="trust-strip-icon"><ShieldCheck size={16} /></span><span><strong>{t('Verified sellers')}</strong><small>{t('Check seller badges before you chat')}</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-blue"><MessageCircle size={16} /></span><span><strong>{t('Chat to buy')}</strong><small>{t('Ask questions before meeting')}</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-gold"><MapPin size={16} /></span><span><strong>{t('Find nearby')}</strong><small>{t('Discover listings by location')}</small></span></div>
      </section>



    </div>
  );
}

function SearchView({ marketListings, categories, marketLoading = false, search, setSearch, onOpenListing, savedIds, onToggleSave, onBack, adCampaigns = [] }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState('Recommended');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const hasFilters = Boolean(search.trim() || activeCategory !== 'All' || verifiedOnly || sort !== 'Recommended');
  const clearFilters = () => { setSearch(''); setActiveCategory('All'); setVerifiedOnly(false); setSort('Recommended'); };
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
    let result = marketListings.filter((listing) => !term || [listing.title, listing.description, listing.location, listing.category, listing.sellerDisplayName, listing.seller].map(normalize).join(' ').includes(term));
    if (activeCategory !== 'All') result = result.filter((listing) => normalize(listing.category) === normalize(activeCategory));
    if (verifiedOnly) result = result.filter((listing) => listing.verified === true);
    if (sort === 'Recommended') result = [...result].sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)));
    if (sort === 'Newest') result = [...result].sort((a, b) => new Date(b.raw?.created_at || b.created_at || 0) - new Date(a.raw?.created_at || a.created_at || 0));
    if (sort === 'Price low → high') result = [...result].sort((a, b) => {
      const aContact = a.raw?.price == null;
      const bContact = b.raw?.price == null;
      if (aContact !== bContact) return aContact ? 1 : -1;
      return Number(a.numericPrice || 0) - Number(b.numericPrice || 0);
    });
    if (sort === 'Price high → low') result = [...result].sort((a, b) => {
      const aContact = a.raw?.price == null;
      const bContact = b.raw?.price == null;
      if (aContact !== bContact) return aContact ? 1 : -1;
      return Number(b.numericPrice || 0) - Number(a.numericPrice || 0);
    });
    return result;
  }, [marketListings, search, activeCategory, sort, verifiedOnly]);

  return (
    <div className="page-stack search-page">
      <div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><span>Browse listings</span></div>
      <div className="page-title-row"><div><h1>Browse listings</h1><p>Find what you need quickly.</p></div><div className="results-count">{filtered.length} results</div></div>
      <div className="search-box large-search mobile-stable-search"><Search size={19} /><input type="search" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phones, cars, fashion or Kano…" enterKeyHint="search" /><button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search" disabled={!search}><X size={16} /></button></div>
      <div className="filter-toolbar"><div className="filter-toolbar-heading"><strong>Categories</strong>{hasFilters && <button type="button" className="clear-filter-button" onClick={clearFilters}>Clear all</button>}</div><div className="filter-scroll"><button type="button" className={activeCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory('All')}>All</button>{categories.filter((category) => !category.parent_id).map((category) => <button type="button" key={category.name} className={activeCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}<button type="button" className={`filter-chip verified-filter-chip ${verifiedOnly ? 'active' : ''}`} aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((value) => !value)}><ShieldCheck size={14} /> Verified</button></div></div>

      <div className="search-results-area"><div className="search-result-head"><span>Recommended listings</span><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings"><option>Recommended</option><option>Newest</option><option>Price low → high</option><option>Price high → low</option></select></div>
      {marketLoading && !marketListings.length ? <><div className="loading-section-note"><span className="loading-pulse-dot" /> Loading listings and categories…</div><ListingGridSkeleton count={6} /></> : filtered.length ? <><div className="product-grid search-grid">{filtered.slice(0, 8).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div><SponsoredBanner campaigns={adCampaigns} placement="search" className="search-sponsored-slot" /><div className="product-grid search-grid">{filtered.slice(8).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div></> : <div className="empty-state"><Search size={25} /><h3>{verifiedOnly ? 'No verified sellers found' : 'No listings found'}</h3><p>{verifiedOnly ? 'Try turning off Verified only or choose another category.' : 'Try a different search word or clear the filters.'}</p><button className="primary-button" onClick={clearFilters}>Clear filters</button></div>}</div>
    </div>
  );
}



function SavedView({ marketListings, savedIds, onOpenListing, onToggleSave }) {
  const saved = marketListings.filter((listing) => savedIds.includes(listing.id));
  return <div className="page-stack"><div className="page-title-row"><div><div className="eyebrow">KEEP AN EYE ON IT</div><h1>Saved</h1></div><span className="count-bubble">{saved.length}</span></div>
    <section><SectionHeading title="Saved listings" />{saved.length ? <div className="saved-list">{saved.map((listing) => <div className="saved-row" key={listing.id}><div className="saved-row-media" onClick={() => onOpenListing(listing)}>{listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" decoding="async" /> : <Package size={20} />}</div><div className="saved-row-copy" onClick={() => onOpenListing(listing)}><strong>{listing.title}</strong><span>{listing.location}</span><b>{listing.price}</b></div><button className="save-button saved" aria-label={`Remove ${listing.title} from saved`} onClick={() => onToggleSave(listing.id)}><Heart size={17} fill="currentColor" /></button></div>)}</div> : <div className="empty-state compact-empty"><Bookmark size={24} /><h3>Your shortlist is empty</h3><p>Listings you save will appear here.</p></div>}</section>
  </div>;
}



function formatChatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function chatAttachmentKind(message) {
  const mimeType = String(message?.attachment_mime_type || '').split(';')[0].toLowerCase();
  const path = String(message?.attachment_path || message?.name || '').toLowerCase();
  if (mimeType.startsWith('audio/') || /\.(webm|ogg|mp3|m4a|wav|mp4)$/i.test(path)) return 'audio';
  if (mimeType === 'application/pdf' || /\.pdf$/i.test(path)) return 'file';
  return 'image';
}

function MessagesView({ user, liveListing, onDemoAction, onAuthRequired, onOpenListing, initialMessageId, initialNotificationTarget = null, initialDealPanel = '', initialText = '', onSelectConversation, onBackToInbox }) {
  const [conversations, setConversations] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [text, setText] = useState(initialText || '');
  const composerTextRef = useRef(null);
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState('All');
  const [deals, setDeals] = useState({ offers: [], meetings: [] });
  const [dealPanel, setDealPanel] = useState(initialDealPanel || '');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingArea, setMeetingArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [imageViewerUrl, setImageViewerUrl] = useState('');
  useEffect(() => {
    const viewerOpen = Boolean(imageViewerUrl);
    document.body.classList.toggle('chat-image-viewer-open', viewerOpen);
    if (!viewerOpen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setImageViewerUrl('');
    };
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('chat-image-viewer-open');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [imageViewerUrl]);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recordingStartedAtRef = useRef(0);
  const recordingCancelledRef = useRef(false);
  const isMessagesViewMountedRef = useRef(true);
  const activeConversationIdRef = useRef(null);
  const previousConversationIdRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const messageEndRef = useRef(null);
  const emojis = ['😀', '😂', '😍', '🥰', '👍', '❤️', '✅', '👏', '🔥', '😮', '🙏', '🎉'];
  const selectedConversation = conversations.find((conversation) => conversation.id === initialMessageId) || null;
  activeConversationIdRef.current = selectedConversation?.id || null;
  const currentMessages = liveMessages.filter((item) => item.conversation_id === selectedConversation?.id);
  const liveMode = Boolean(isSupabaseConfigured && user && selectedConversation);
  const isSeller = Boolean(selectedConversation?.seller_id === user?.id);
  const conversationIdentity = (conversation) => { const profile = conversation?.buyer_id === user?.id ? conversation?.seller : conversation?.buyer; return { profile, ...getPublicIdentity(profile || {}) }; };
  const mergeMessageRows = (current, incomingRows) => {
    const byId = new Map(current.map((item) => [item.id, item]));
    for (const item of incomingRows || []) {
      const previous = byId.get(item.id) || {};
      byId.set(item.id, { ...previous, ...item, attachment_url: item.attachment_url || previous.attachment_url || '' });
    }
    return [...byId.values()].sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
  };

  useEffect(() => {
    let mounted = true;
    if (!user) { setConversations([]); return undefined; }
    setConversationLoading(true);
    fetchConversations(user.id).then((items) => { if (mounted) setConversations(items); }).catch((error) => onDemoAction(error.message || 'Could not load conversations.')).finally(() => mounted && setConversationLoading(false));
    return () => { mounted = false; };
  }, [user, onDemoAction]);

  useEffect(() => {
    if (!liveMode) { setLiveMessages([]); setDeals({ offers: [], meetings: [] }); return undefined; }
    let mounted = true;
    setLiveLoading(true);
    setLiveMessages([]);
    setDeals({ offers: [], meetings: [] });
    fetchMessages(selectedConversation.id, initialNotificationTarget?.messageId || null).then((items) => { if (mounted) setLiveMessages((current) => mergeMessageRows(current, items)); }).catch((error) => onDemoAction(error.message || 'Could not load messages.')).finally(() => mounted && setLiveLoading(false));
    markConversationMessagesRead(selectedConversation.id).then(() => {
      if (mounted) setConversations((items) => items.map((item) => item.id === selectedConversation.id ? { ...item, unread_count: 0 } : item));
    }).catch((error) => onDemoAction(error.message || 'Could not update the read status.'));
    fetchConversationDeals(selectedConversation.id).then((items) => mounted && setDeals(items)).catch((error) => onDemoAction(error.message || 'Deal tools need the latest Bese26 database migration.'));
    const unsubscribe = subscribeToMessages(selectedConversation.id, (incoming, eventType) => {
      if (!mounted) return;
      setLiveMessages((items) => mergeMessageRows(items, [incoming]));
      setConversations((items) => items.map((item) => {
        if (item.id !== selectedConversation.id) return item;
        const isLatest = !item.lastMessage || new Date(incoming.created_at) >= new Date(item.lastMessage.created_at);
        return { ...item, ...(isLatest ? { last_message_at: incoming.created_at, lastMessage: incoming } : {}), unread_count: incoming.sender_id !== user.id && eventType === 'INSERT' ? Number(item.unread_count || 0) + 1 : Number(item.unread_count || 0) };
      }));
      if (incoming.sender_id !== user.id && eventType === 'INSERT') markConversationMessagesRead(selectedConversation.id).then(() => {
        if (mounted) setConversations((items) => items.map((item) => item.id === selectedConversation.id ? { ...item, unread_count: 0 } : item));
      }).catch(() => {});
    });
    return () => { mounted = false; unsubscribe(); };
  }, [selectedConversation?.id, liveMode, onDemoAction, user?.id, initialNotificationTarget?.messageId]);
  useEffect(() => { setDealPanel(initialDealPanel || ''); }, [initialMessageId, initialDealPanel]);
  useEffect(() => { setText(initialText || ''); }, [initialMessageId, initialText]);
  useEffect(() => {
    const field = composerTextRef.current;
    if (!field) return;
    const maxHeight = 120;
    field.style.height = 'auto';
    const contentHeight = field.scrollHeight;
    field.style.height = `${Math.min(contentHeight, maxHeight)}px`;
    field.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
  }, [text]);
  useEffect(() => {
    if (!liveMode || liveLoading || !initialNotificationTarget) return undefined;
    let targetElement = null;
    if (initialNotificationTarget.kind === 'offer' && initialNotificationTarget.offerId) {
      targetElement = document.getElementById(`chat-offer-${initialNotificationTarget.offerId}`);
    } else if (initialNotificationTarget.kind === 'message' && initialNotificationTarget.messageId) {
      targetElement = document.getElementById(`chat-message-${initialNotificationTarget.messageId}`);
    } else if (initialNotificationTarget.kind === 'message' && currentMessages.length) {
      targetElement = document.querySelector('.chat-messages .message-bubble:last-child');
    }
    if (!targetElement) return undefined;
    const frame = window.requestAnimationFrame(() => targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => window.cancelAnimationFrame(frame);
  }, [liveMode, liveLoading, initialNotificationTarget?.kind, initialNotificationTarget?.offerId, initialNotificationTarget?.messageId, currentMessages.length, deals.offers.length]);
  useEffect(() => {
    if (!liveMode || liveLoading || initialNotificationTarget?.messageId || initialNotificationTarget?.offerId) return undefined;
    const frame = window.requestAnimationFrame(() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
    return () => window.cancelAnimationFrame(frame);
  }, [liveMode, liveLoading, currentMessages.length, initialNotificationTarget?.messageId, initialNotificationTarget?.offerId]);

  // Keep the chat inside Safari's actual visible viewport, including when its
  // browser toolbar or on-screen keyboard changes size.
  useEffect(() => {
    if (!liveMode) return undefined;
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const height = viewport?.height || window.innerHeight;
      const top = viewport?.offsetTop || 0;
      document.documentElement.style.setProperty('--bese26-chat-viewport-height', `${height}px`);
      document.documentElement.style.setProperty('--bese26-chat-viewport-top', `${top}px`);
    };
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.documentElement.style.removeProperty('--bese26-chat-viewport-height');
      document.documentElement.style.removeProperty('--bese26-chat-viewport-top');
    };
  }, [liveMode]);

  const clearAttachment = () => {
    if (attachmentPreview?.startsWith('blob:')) URL.revokeObjectURL(attachmentPreview);
    setAttachment(null);
    setAttachmentPreview('');
  };
  useEffect(() => {
    isMessagesViewMountedRef.current = true;
    return () => {
      isMessagesViewMountedRef.current = false;
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') { recordingCancelledRef.current = true; try { recorder.stop(); } catch {} }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => () => {
    if (attachmentPreview?.startsWith('blob:')) URL.revokeObjectURL(attachmentPreview);
  }, [attachmentPreview]);
  const send = async (message = text, file = attachment) => {
    const body = String(message || '').trim();
    if ((!body && !file) || !liveMode || mediaBusy) return;
    setMediaBusy(true);
    let uploaded = null;
    try {
      uploaded = file ? await uploadChatMedia({ userId: user.id, conversationId: selectedConversation.id, file }) : null;
      const sent = await sendMessage({ conversationId: selectedConversation.id, senderId: user.id, body: body || null, attachmentPath: uploaded?.path || null, attachmentMimeType: uploaded?.mimeType || null, attachmentSizeBytes: uploaded?.sizeBytes ?? null });
      const messageRow = { ...sent, attachment_url: uploaded?.url || '', reply_to: replyTo ? { id: replyTo.id, body: replyTo.body || (replyTo.attachment_url ? 'Voice note' : 'Attachment'), senderName: replyTo.sender_id === user.id ? 'You' : personName } : null };
      setLiveMessages((items) => mergeMessageRows(items, [messageRow]));
      setConversations((items) => items.map((item) => item.id === selectedConversation.id ? { ...item, last_message_at: sent.created_at, lastMessage: messageRow, unread_count: 0 } : item));
      setText('');
      setReplyTo(null);
      clearAttachment();
    } catch (error) {
      if (uploaded?.path) deleteChatMedia({ userId: user.id, path: uploaded.path }).catch(() => {});
      onDemoAction(error.message || 'Could not send this message.');
    } finally { setMediaBusy(false); }
  };
  const chooseAttachment = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const mimeType = String(file.type || '').split(';')[0].toLowerCase();
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']);
    if (file.size > 8 * 1024 * 1024) { onDemoAction('Choose a photo, PDF, or voice note smaller than 8 MB.'); return; }
    if (!allowedTypes.has(mimeType)) { onDemoAction('Choose a JPG, PNG, WebP, GIF, PDF, or supported voice note.'); return; }
    clearAttachment();
    setAttachment(file);
    setAttachmentPreview(mimeType.startsWith('image/') || mimeType.startsWith('audio/') ? URL.createObjectURL(file) : '');
  };
  const addEmoji = (emoji) => { setText((value) => `${value}${emoji}`); setEmojiOpen(false); };
  const toggleReaction = (messageId, reaction) => setMessageReactions((current) => ({ ...current, [messageId]: current[messageId] === reaction ? '' : reaction }));
  const stopRecording = () => {
    if (recordingTimerRef.current) { window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };
  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    stopRecording();
  };
  useEffect(() => {
    const nextConversationId = selectedConversation?.id || null;
    if (previousConversationIdRef.current && previousConversationIdRef.current !== nextConversationId) {
      if (mediaRecorderRef.current?.state === 'recording') cancelRecording();
      clearAttachment();
      setVoiceStarting(false);
      setEmojiOpen(false);
    }
    previousConversationIdRef.current = nextConversationId;
  }, [selectedConversation?.id]);
  const startRecording = async () => {
    if (!liveMode || recording || mediaBusy || voiceStarting || attachment) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') { onDemoAction('Voice recording is not supported in this browser. Try opening Bese26 in an up-to-date browser.'); return; }
    const requestedConversationId = selectedConversation?.id;
    if (!requestedConversationId) return;
    let stream = null;
    setVoiceStarting(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!isMessagesViewMountedRef.current || activeConversationIdRef.current !== requestedConversationId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
      const mimeType = candidates.find((type) => window.MediaRecorder.isTypeSupported?.(type));
      const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
      recordedChunksRef.current = [];
      recordingCancelledRef.current = false;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data?.size) recordedChunksRef.current.push(event.data); };
      recorder.onerror = () => { recordingCancelledRef.current = true; onDemoAction('The voice note could not be recorded. Please try again.'); stopRecording(); };
      recorder.onstop = () => {
        if (recordingTimerRef.current) { window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        const wasCancelled = recordingCancelledRef.current;
        recordingCancelledRef.current = false;
        const chunks = recordedChunksRef.current;
        recordedChunksRef.current = [];
        if (!isMessagesViewMountedRef.current) return;
        setRecording(false);
        setRecordingSeconds(0);
        if (wasCancelled) return;
        const actualMime = String(recorder.mimeType || chunks[0]?.type || 'audio/webm').split(';')[0].toLowerCase();
        const blob = new Blob(chunks, { type: actualMime });
        if (!blob.size) { onDemoAction('No voice was captured. Please try recording again.'); return; }
        const extension = actualMime.includes('mp4') ? 'm4a' : actualMime.includes('ogg') ? 'ogg' : actualMime.includes('mpeg') ? 'mp3' : 'webm';
        const voiceFile = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: actualMime });
        clearAttachment();
        setAttachment(voiceFile);
        setAttachmentPreview(URL.createObjectURL(voiceFile));
      };
      recorder.start(1000);
      recordingStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Math.min(120, Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
        setRecordingSeconds(elapsed);
        if (elapsed >= 120) {
          stopRecording();
          onDemoAction('Voice note limit is 2 minutes. The recording is ready to preview and send.');
        }
      }, 1000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      if (isMessagesViewMountedRef.current) {
        const message = error?.name === 'NotAllowedError' ? 'Allow microphone access in your browser to record a voice note.' : error.message || 'Microphone permission was not granted.';
        onDemoAction(message);
      }
    } finally {
      if (isMessagesViewMountedRef.current) setVoiceStarting(false);
    }
  };
  const submitOffer = async (event) => {
    event.preventDefault();
    if (!liveMode || isSeller) return;
    setBusy(true);
    try { const offer = await createChatOffer({ conversationId: selectedConversation.id, listingId: selectedConversation.listing_id, buyerId: user.id, sellerId: selectedConversation.seller_id, amount: offerAmount, message: offerNote }); setDeals((current) => ({ ...current, offers: [offer, ...current.offers] })); await send(`Offer sent: ₦${Number(offerAmount).toLocaleString('en-NG')}`); setOfferAmount(''); setOfferNote(''); setDealPanel(''); onDemoAction('Offer sent securely in this chat.'); }
    catch (error) { onDemoAction(error.message || 'Could not send the offer. Apply the latest deal workflow migration if needed.'); }
    finally { setBusy(false); }
  };
  const submitMeeting = async (event) => {
    event.preventDefault();
    if (!liveMode) return;
    setBusy(true);
    try { const meeting = await createChatMeeting({ conversationId: selectedConversation.id, proposedBy: user.id, meetingDate, meetingTime, area: meetingArea }); setDeals((current) => ({ ...current, meetings: [meeting, ...current.meetings] })); await send(`Meeting proposed: ${meetingDate} at ${meetingTime} in ${meetingArea}`); setMeetingDate(''); setMeetingTime(''); setMeetingArea(''); setDealPanel(''); onDemoAction('Safe meeting proposal sent.'); }
    catch (error) { onDemoAction(error.message || 'Could not propose the meeting. Apply the latest deal workflow migration if needed.'); }
    finally { setBusy(false); }
  };
  const updateOffer = async (offer, status) => { try { const updated = await updateChatOffer(offer.id, status); setDeals((current) => ({ ...current, offers: current.offers.map((item) => item.id === offer.id ? updated : item) })); onDemoAction(`Offer ${status}.`); } catch (error) { onDemoAction(error.message || 'Could not update the offer.'); } };
  const updateMeeting = async (meeting, status) => { try { const updated = await updateChatMeeting(meeting.id, status); setDeals((current) => ({ ...current, meetings: current.meetings.map((item) => item.id === meeting.id ? updated : item) })); onDemoAction(`Meeting ${status}.`); } catch (error) { onDemoAction(error.message || 'Could not update the meeting.'); } };
  const viewListing = async () => {
    setChatMenuOpen(false);
    if (liveListing) { onOpenListing?.(liveListing); return; }
    if (!selectedConversation?.listing_id) { onDemoAction?.('The listing details are no longer available.'); return; }
    setBusy(true);
    try {
      const listing = await fetchListingDetails(selectedConversation.listing_id);
      if (listing) onOpenListing?.(listing);
      else onDemoAction?.('The listing details are no longer available.');
    } catch (error) {
      onDemoAction?.(error.message || 'Could not open the listing details.');
    } finally { setBusy(false); }
  };
  const muteConversation = () => { if (!selectedConversation) return; try { window.localStorage.setItem(`bese26:muted-conversation:${selectedConversation.id}`, '1'); } catch { onDemoAction?.('Mute is unavailable in this browser session.'); return; } setChatMenuOpen(false); onDemoAction?.('Conversation muted on this device.'); };
  const reportConversation = async () => { const reportedUserId = selectedConversation?.buyer_id === user?.id ? selectedConversation?.seller_id : selectedConversation?.buyer_id; if (!selectedConversation?.id || !reportedUserId || reportedUserId === user?.id || !window.confirm(`Report ${personName} for harassment or unsafe conduct? Bese26 will receive the conversation and listing references.`)) return; setBusy(true); try { await submitUserReport(user.id, { target_type: 'user', target_id: reportedUserId, reason: 'harassment', description: `Reported from private conversation ${selectedConversation.id}; listing ${selectedConversation.listing_id || 'not linked'}.` }); setChatMenuOpen(false); onDemoAction?.('User report submitted securely to Bese26 moderation.'); } catch (error) { onDemoAction?.(error.message || 'Could not submit the report.'); } finally { setBusy(false); } };
  const blockConversation = async () => {
    const blockedId = selectedConversation?.buyer_id === user?.id ? selectedConversation?.seller_id : selectedConversation?.buyer_id;
    if (!blockedId || blockedId === user?.id || !window.confirm(`Block ${personName} on Bese26? They will no longer be able to message you.`)) return;
    setBusy(true);
    try {
      await blockUser(user.id, blockedId);
      setConversations((items) => items.filter((item) => item.id !== selectedConversation.id));
      setChatMenuOpen(false);
      onDemoAction?.(`${personName} has been blocked. You can manage blocked users from your profile.`);
      onBackToInbox?.();
    } catch (error) { onDemoAction?.(error.message || `Could not block ${personName}.`); } finally { setBusy(false); }
  };
  if (!user) return <div className="page-stack notifications-page messages-guest-page"><section className="notifications-empty"><ShieldCheck size={30} /><div className="eyebrow">PRIVATE CONVERSATIONS</div><h1>Sign in to use Messages</h1><p>Your chats, offers, meeting plans, and attachments stay private to you and the other participant.</p><button className="primary-button" onClick={() => onAuthRequired?.('Sign in to open your private messages.')}>Sign in to continue</button></section></div>;
  if (!selectedConversation) {
    const filteredConversations = conversations.filter((conversation) => {
      const identity = conversationIdentity(conversation);
      const { name } = identity;
      const title = conversation.listing?.title || 'Marketplace listing';
      const query = messageSearch.trim().toLowerCase();
      const matchesSearch = !query || `${name} ${title}`.toLowerCase().includes(query);
      const preview = conversation.lastMessage?.body || (conversation.lastMessage ? (chatAttachmentKind(conversation.lastMessage) === 'audio' ? 'Voice note' : chatAttachmentKind(conversation.lastMessage) === 'file' ? 'Shared a document' : 'Shared a photo') : '');
      const matchesMessage = !query || preview.toLowerCase().includes(query);
      const isUnanswered = conversation.seller_id === user?.id && conversation.lastMessage?.sender_id === conversation.buyer_id;
      const isUnread = Number(conversation.unread_count || 0) > 0;
      return (matchesSearch || matchesMessage) && (messageFilter === 'All' || (messageFilter === 'Unanswered' && isUnanswered) || (messageFilter === 'Unread' && isUnread) || (messageFilter === 'Spam' && false));
    });
    const totalUnread = conversations.reduce((total, item) => total + Number(item.unread_count || 0), 0);
    return <div className="messages-inbox-page messages-premium">
      <header className="messages-inbox-header">
        <div className="messages-inbox-title"><div className="eyebrow">BESE26 · PRIVATE MARKETPLACE CHAT</div><h1><span className="messages-inbox-brand">Bese<span>26</span></span><span className="messages-inbox-heading-label">Messages</span></h1><p>Every good deal starts with a clear conversation. Share photos, voice notes and safe plans.</p></div>
        <span className="message-count" aria-label={`${conversations.length} conversations`}><small>CHATS</small><strong>{conversations.length}</strong></span>
      </header>
      <div className="messages-inbox-workspace">
        <section className="messages-inbox-list-panel" aria-label="Your conversations">
          <div className="messages-inbox-controls">
            <div className="messages-search"><Search size={18} /><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search in messages…" aria-label="Search people, listings or messages" /></div>
            <div className="message-filter-tabs" role="tablist" aria-label="Filter conversations">{['All', 'Unread', 'Unanswered', 'Spam'].map((filter) => <button type="button" role="tab" aria-selected={messageFilter === filter} className={messageFilter === filter ? 'active' : ''} key={filter} onClick={() => setMessageFilter(filter)}>{filter}{filter === 'Unread' && totalUnread > 0 && <span className="message-filter-count">{totalUnread > 99 ? '99+' : totalUnread}</span>}</button>)}</div>
          </div>
          {conversationLoading ? <BrandLoader message="Loading conversations…" compact /> : filteredConversations.length ? <div className="message-inbox-list">{filteredConversations.map((conversation) => {
            const identity = conversationIdentity(conversation);
            const { name } = identity;
            const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
            const lastMessage = conversation.lastMessage;
            const preview = lastMessage?.body?.trim() || (lastMessage ? (chatAttachmentKind(lastMessage) === 'audio' ? 'Voice note' : chatAttachmentKind(lastMessage) === 'file' ? 'Shared a document' : 'Shared a photo') : 'Start the conversation');
            const lastActivity = lastMessage?.created_at || conversation.last_message_at;
            return <button key={conversation.id} className="message-inbox-row" type="button" onClick={() => onSelectConversation?.(conversation)}>
              <span className="message-inbox-listing-image">{conversation.listing?.image_url ? <img src={conversation.listing.image_url} alt={conversation.listing.title || 'Listing'} loading="lazy" /> : <Package size={24} />}<span className={`message-identity-avatar message-inbox-avatar-overlay ${identity.hasBusinessLogo ? 'is-business-logo' : ''}`}>{identity.image ? <img src={identity.image} alt="" onLoad={identity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <Avatar initials={initials} tone="rose" size="lg" />}</span></span>
              <span className="message-inbox-copy"><span className="message-inbox-name-line"><strong>{name}</strong><VerificationBadges idVerified={Boolean(identity.profile?.id_verified)} cacVerified={Boolean(identity.profile?.cac_verified)} compact /></span><b>{preview}</b><small className="inbox-listing-caption"><Package size={13} />{conversation.listing?.title || 'Marketplace listing'}</small></span>
              <span className="message-inbox-row-meta"><time>{lastActivity ? new Date(lastActivity).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'New'}</time>{Number(conversation.unread_count || 0) > 0 && <span className="message-unread-badge">{conversation.unread_count > 99 ? '99+' : conversation.unread_count}</span>}</span>
              <ChevronRight size={17} />
            </button>;
          })}</div> : <div className="message-inbox-empty"><MessageCircle size={30} /><strong>{messageSearch ? 'No matching conversations' : messageFilter !== 'All' ? `No ${messageFilter.toLowerCase()} conversations` : 'No conversations yet'}</strong><span>When you message a seller, the conversation will appear here.</span></div>}
        </section>
        <aside className="messages-inbox-welcome">
          <span className="messages-inbox-welcome-icon"><MessageCircle size={30} /></span>
          <div className="messages-inbox-welcome-copy"><span className="messages-inbox-welcome-kicker">YOUR BESE26 CHAT SPACE</span><h2>Talk it through. Trade with confidence.</h2><p>Keep questions, photos and meetup plans together so both sides know what comes next.</p></div>
          <div className="messages-inbox-trust-list">
            <div><ShieldCheck size={19} /><span><strong>Stay protected</strong><small>Keep your deal details inside Bese26.</small></span></div>
            <div><MessageCircle size={19} /><span><strong>Make it clear</strong><small>Use messages, photos and voice notes.</small></span></div>
          </div>
          <span className="messages-inbox-welcome-foot"><i aria-hidden="true" /> Private, one-to-one conversations</span>
        </aside>
      </div>
    </div>;
  }
  const selectedIdentity = conversationIdentity(selectedConversation);
  const otherProfile = selectedIdentity.profile;
  const personName = liveMode ? selectedIdentity.name : 'Marketplace chat';
  const listingTitle = liveMode ? (selectedConversation.listing?.title || 'Listing no longer available') : 'No listing selected';
  const listingImage = liveMode ? (selectedConversation?.listing?.image_url || selectedConversation?.listing?.image || liveListing?.image_url || liveListing?.image || '') : null;
  const personInitials = liveMode ? (personName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) : 'BE';
  const personImage = liveMode ? selectedIdentity.image : '';
  return <div className={`page-stack messages-page messages-premium chat-reference-mode ${selectedConversation ? 'messages-selected-page' : ''}`}><div className="page-title-row"><div><div className="eyebrow">KEEP IT MOVING</div><h1>Messages</h1></div><span className="messages-workspace-pill">Private chat</span></div><div className="message-layout"><div className="conversation-list">{conversationLoading ? <BrandLoader message="Loading conversations…" compact /> : conversations.length ? conversations.map((conversation) => { const identity = conversationIdentity(conversation); const { name } = identity; return <button key={conversation.id} className={`conversation-row ${conversation.id === initialMessageId ? 'active' : ''}`} type="button" onClick={() => onSelectConversation?.(conversation)}><span className={`message-identity-avatar conversation-listing-avatar ${identity.hasBusinessLogo ? 'is-business-logo' : ''}`}>{conversation.listing?.image_url ? <img className="conversation-listing-image" src={conversation.listing.image_url} alt={conversation.listing.title || 'Listing'} /> : identity.image ? <img src={identity.image} alt="" onLoad={identity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} tone="rose" />}{conversation.listing?.image_url && identity.image && <span className="conversation-seller-badge"><img src={identity.image} alt="" onLoad={identity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /></span>}</span><div className="conversation-copy"><strong>{name}</strong><span>{conversation.listing?.title || 'Marketplace listing'}</span></div><div className="conversation-meta"><small>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'New'}</small></div></button>; }) : <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>No conversations yet</h3><p>When you chat with a seller, your messages will appear here.</p></div>}</div><div className="chat-panel"><div className="chat-header"><button type="button" className="chat-back-button" onClick={onBackToInbox} aria-label="Back to messages"><ArrowLeft size={25} /></button><div className="chat-person"><span className={`message-identity-avatar chat-person-avatar ${selectedIdentity.hasBusinessLogo ? 'is-business-logo' : ''}`}>{personImage ? <img src={personImage} alt="" onLoad={selectedIdentity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <Avatar initials={personInitials} tone="rose" />}</span><div><span className="chat-person-name-row"><div className="chat-person-name-row"><strong>{personName}</strong><VerificationBadges idVerified={Boolean(otherProfile?.id_verified)} cacVerified={Boolean(otherProfile?.cac_verified)} compact /></div></span><span>{liveMode ? 'Active on Bese26 · messages only' : 'Marketplace chat'}</span></div></div><div className="chat-header-actions"><button type="button" className="chat-header-icon" aria-label="More options" aria-expanded={chatMenuOpen} onClick={() => setChatMenuOpen((value) => !value)}><MoreVertical size={23} /></button></div></div>{chatMenuOpen && <div className="chat-action-menu" role="menu"><button type="button" onClick={viewListing}><Package size={15} /> View listing</button><button type="button" onClick={muteConversation}><BellOff size={15} /> Mute conversation</button><button type="button" onClick={reportConversation} disabled={busy}><Flag size={15} /> Report conversation</button><button type="button" onClick={blockConversation} disabled={busy}><ShieldAlert size={15} /> Block user</button></div>}<div className="chat-context">{listingImage ? <img src={listingImage} alt="" /> : <div className="chat-context-placeholder"><Package size={17} /></div>}<div><span>Item details</span><strong>{listingTitle}</strong>{liveListing?.price && <b className="chat-context-price">{liveListing.price}</b>}</div></div>{liveMode && <div className="chat-safety-note chat-safety-note-top"><ShieldCheck size={14} /><span>Keep conversations on Bese26. Verify the item before payment.</span></div>}{dealPanel === 'offer' && <form className="deal-form" onSubmit={submitOffer}><strong>Make an offer</strong><small>Keep the price and agreement inside Bese26 chat.</small><input type="number" min="1" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} placeholder="Offer amount in NGN" required /><input value={offerNote} onChange={(event) => setOfferNote(event.target.value)} placeholder="Optional note" maxLength={500} /><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send offer'}</button></div></form>}{dealPanel === 'meeting' && <form className="deal-form safe-meeting-form" onSubmit={submitMeeting}><strong>Plan a safe meeting</strong><small>Choose a public area. Do not share your home address or pay before inspecting the item.</small><label>Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required /></label><label>Time<input type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} required /></label><label>General public area<input value={meetingArea} onChange={(event) => setMeetingArea(event.target.value)} placeholder="e.g. mall, fuel station, or police-approved area" maxLength={120} required /></label><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send meeting plan'}</button></div></form>}{deals.offers.map((offer) => <div id={`chat-offer-${offer.id}`} className={`deal-status-card ${initialNotificationTarget?.offerId === offer.id ? 'is-notification-target' : ''}`} key={offer.id}><div><strong>Offer · ₦{Number(offer.amount).toLocaleString('en-NG')}</strong><span>{offer.status}</span></div>{isSeller && offer.status === 'pending' && <div><button type="button" onClick={() => updateOffer(offer, 'accepted')}>Accept</button><button type="button" onClick={() => updateOffer(offer, 'rejected')}>Decline</button></div>}{!isSeller && offer.status === 'pending' && <button type="button" onClick={() => updateOffer(offer, 'cancelled')}>Cancel</button>}</div>)}{deals.meetings.map((meeting) => { const proposedByMe = meeting.proposed_by === user.id; return <div className="deal-status-card meeting-status-card" key={meeting.id}><div><strong>Safe meeting · {meeting.meeting_date} at {String(meeting.meeting_time).slice(0, 5)}</strong><span>{meeting.area} · {meeting.status}</span></div><div>{!proposedByMe && meeting.status === 'proposed' && <><button type="button" onClick={() => updateMeeting(meeting, 'accepted')}>Accept</button><button type="button" onClick={() => updateMeeting(meeting, 'declined')}>Decline</button></>}{proposedByMe && ['proposed', 'accepted'].includes(meeting.status) && <button type="button" onClick={() => updateMeeting(meeting, 'cancelled')}>Cancel</button>}{meeting.status === 'accepted' && <button type="button" onClick={() => updateMeeting(meeting, 'completed')}>Mark complete</button>}</div></div>; })}
  <div className="chat-messages">{liveMode ? (liveLoading ? <div className="chat-loading-state" role="status"><span className="chat-loading-spinner" /> <span>Loading messages…</span></div> : currentMessages.length ? currentMessages.map((item) => <div id={`chat-message-${item.id}`} className={`message-bubble ${item.attachment_url && chatAttachmentKind(item) === 'image' && !item.body ? 'message-image-only' : ''} ${item.sender_id === user.id ? 'mine' : 'other'} ${initialNotificationTarget?.messageId === item.id ? 'is-notification-target' : ''}`} key={item.id}>{item.reply_to && <div className="message-quoted"><small>{item.reply_to.senderName || 'Reply'}</small><span>{item.reply_to.body}</span></div>}{item.attachment_url && (chatAttachmentKind(item) === 'audio' ? <VoiceNotePlayer src={item.attachment_url} mine={item.sender_id === user.id} /> : chatAttachmentKind(item) === 'file' ? <a href={item.attachment_url} target="_blank" rel="noreferrer" className="message-file">PDF · Open document</a> : <button type="button" className="message-image-button" onClick={() => setImageViewerUrl(item.attachment_url)} aria-label="Open image in Bese26 viewer"><img src={item.attachment_url} alt="Chat attachment" className="message-image" loading="lazy" decoding="async" /></button>)}{item.body && <span>{item.body}</span>}{!item.body && !item.attachment_url && (item.attachment_path ? 'Attachment could not be loaded — ask them to resend.' : 'Attachment')}<small><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{item.sender_id === user.id && <span className={`message-read-status ${item.read_at ? 'is-read' : ''}`} title={item.read_at ? 'Seen' : 'Sent'} aria-label={item.read_at ? 'Seen' : 'Sent'}><Check size={12} />{item.read_at && <Check size={12} />}</span>}</small><button type="button" className={`message-reaction ${messageReactions[item.id] ? 'selected' : ''}`} onClick={() => toggleReaction(item.id, messageReactions[item.id] || '👍')} aria-label="React to message">{messageReactions[item.id] || '＋'}</button></div>) : <div className="chat-empty-note">Start the conversation with a clear question about the listing.</div>) : <div className="chat-empty-note">Select a listing to start a real conversation.</div>}<div ref={messageEndRef} aria-hidden="true" /></div>{attachment && <div className={`chat-attachment-preview ${chatAttachmentKind({ name: attachment.name, attachment_mime_type: attachment.type }) === 'audio' ? 'has-voice-preview' : ''}`}>{chatAttachmentKind({ name: attachment.name, attachment_mime_type: attachment.type }) === 'audio' ? <><div className="chat-voice-preview-copy"><Mic size={15} /><span><strong>Voice note ready</strong><small>Listen before sending</small></span></div>{attachmentPreview && <VoiceNotePlayer src={attachmentPreview} mine preview />}</> : <>{attachmentPreview ? <div className="chat-selected-photo"><img src={attachmentPreview} alt="Photo selected for sending" /><button type="button" className="chat-selected-photo-remove" onClick={clearAttachment} disabled={mediaBusy} aria-label="Remove selected photo and choose another"><X size={19} /></button></div> : <><span className="chat-attachment-file-kind">PDF</span><span>{attachment.name} <small>{Math.ceil(attachment.size / 1024)} KB</small></span></>}</>}<div className="chat-attachment-preview-actions">{!attachmentPreview && <button type="button" className="chat-preview-cancel" onClick={clearAttachment} disabled={mediaBusy} aria-label="Cancel selected attachment"><X size={16} /> Cancel</button>}<button type="button" className="chat-preview-send" onClick={() => send()} disabled={!liveMode || mediaBusy} aria-label="Send selected attachment">{mediaBusy ? 'Sending…' : <><Send size={16} /> Send</>}</button></div></div>}{emojiOpen && <div className="emoji-picker" role="dialog" aria-label="Choose an emoji"><div className="emoji-picker-header"><strong>Emojis</strong><button type="button" onClick={() => setEmojiOpen(false)} aria-label="Close emoji picker"><X size={14} /></button></div><div className="emoji-grid">{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => addEmoji(emoji)} aria-label={`Add ${emoji}`}>{emoji}</button>)}</div></div>}{replyTo && <div className="chat-reply-preview"><span><Reply size={14} /><strong>Replying to {replyTo.sender_id === user.id ? 'yourself' : personName}</strong><small>{replyTo.body || (replyTo.attachment_url ? 'Voice note' : 'Attachment')}</small></span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={15} /></button></div>}<div className="chat-composer">{recording ? <div className="chat-recording-status"><span className="chat-recording-pulse" aria-hidden="true" /><div><strong>Recording voice note</strong><small>{formatChatDuration(recordingSeconds)} / 02:00 · preview before sending</small></div><button type="button" className="chat-cancel-recording" onClick={cancelRecording}><X size={15} /> Cancel</button><button type="button" className="chat-finish-recording" onClick={stopRecording} aria-label="Finish recording and preview voice note"><CheckCircle2 size={14} /> Preview</button></div> : <><input id="chat-file-input" className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/webm,audio/ogg,audio/mp4,audio/mpeg" onChange={chooseAttachment} disabled={!liveMode || mediaBusy} /><label htmlFor="chat-file-input" className="icon-button chat-attach-button" aria-label="Attach a photo, document or voice note"><ImageIcon size={18} /></label><button type="button" className="icon-button chat-record-button" aria-label={voiceStarting ? 'Starting voice recording' : 'Record voice note'} title={attachment ? 'Remove the current attachment before recording' : 'Record a voice note'} onClick={startRecording} disabled={!liveMode || mediaBusy || voiceStarting || Boolean(attachment)}>{voiceStarting ? <span className="chat-voice-starting-spinner" aria-hidden="true" /> : <Mic size={18} />}<span className="chat-record-button-label">{voiceStarting ? 'Starting…' : 'Voice'}</span></button><button type="button" className={`icon-button emoji-toggle ${emojiOpen ? 'active' : ''}`} aria-label="Open emoji picker" onClick={() => setEmojiOpen((value) => !value)} disabled={!liveMode}><span aria-hidden="true">☺</span></button><textarea ref={composerTextRef} className="chat-message-composer-input" rows={1} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send(); } }} placeholder="Write a message…" disabled={!liveMode || mediaBusy} aria-label="Write a message" title="Enter sends; Shift+Enter starts a new line." spellCheck={true} /><button type="button" className="send-button" onClick={() => send()} disabled={!liveMode || mediaBusy || (!text.trim() && !attachment)} aria-label={attachment && chatAttachmentKind({ name: attachment.name, attachment_mime_type: attachment.type }) === 'audio' ? 'Send voice note' : 'Send message'} title={attachment && chatAttachmentKind({ name: attachment.name, attachment_mime_type: attachment.type }) === 'audio' ? 'Send voice note' : 'Send message'}>{mediaBusy ? '…' : <Send size={16} />}</button></>}</div></div></div>{imageViewerUrl && createPortal(<div className="chat-image-viewer" role="dialog" aria-modal="true" aria-label="Full-screen photo. Use Back or tap anywhere or press Escape to close." onClick={() => setImageViewerUrl('')}><button type="button" className="chat-image-viewer-back" aria-label="Back to chat" title="Back to chat" onClick={(event) => { event.stopPropagation(); setImageViewerUrl(''); }}><ArrowLeft size={22} strokeWidth={2.5} /></button><img src={imageViewerUrl} alt="Full chat attachment" /></div>, document.body)}</div>;
}




function isUsableGalleryUrl(value) {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url || /^(?:javascript:|data:)/i.test(url) || /(?:no listing photo|no photos|placeholder|no[-_ ]?photo|default[-_ ]?image)/i.test(url)) return false;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return ['http:', 'https:', 'blob:'].includes(parsed.protocol);
  } catch { return false; }
}

function PublicListingCard({ listing, featured = false }) {
  return <a className="product-card public-listing-card" href={`/listing/${encodeURIComponent(listing.id)}`}><ListingCardMedia listing={listing}>{featured && <span className="public-featured-label">Featured</span>}{listing.promoted && <span className="public-boosted-label">Boosted</span>}</ListingCardMedia><div className="product-info"><div className="product-price">{listing.price}</div><h3>{listing.title}</h3><div className="product-meta"><MapPin size={13} /> {listing.location}</div><div className="product-foot"><span>{listing.condition}</span><span>{listing.posted}</span></div><span className="public-card-action">View listing <ArrowRight size={14} /></span></div></a>;
}
function PublicFollowShowcase({ targetId, name }) {
  const [sessionUser, setSessionUser] = useState(null);
  const [summary, setSummary] = useState({ followers: 0, following: 0 });
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured || !supabase || !targetId) return undefined;
    (async () => {
      try {
        const [{ data: sessionData }, followSummary, followerRows, followingRows] = await Promise.all([
          supabase.auth.getSession(),
          fetchFollowSummary(targetId),
          fetchProfileRelations(targetId, 'followers'),
          fetchProfileRelations(targetId, 'following'),
        ]);
        const currentUser = sessionData?.session?.user || null;
        let relation = false;
        if (currentUser && currentUser.id !== targetId) relation = (await getFollowState(currentUser.id, targetId)).following;
        if (mounted) {
          setSessionUser(currentUser);
          setSummary(followSummary || { followers: 0, following: 0 });
          setFollowers((followerRows || []).map((row) => row.follower).filter(Boolean).slice(0, 6));
          setFollowing((followingRows || []).map((row) => row.following).filter(Boolean).slice(0, 6));
          setIsFollowing(Boolean(relation));
        }
      } catch { if (mounted) setSummary({ followers: 0, following: 0 }); }
    })();
    return () => { mounted = false; };
  }, [targetId]);
  const handleFollow = async () => {
    if (!sessionUser) { window.alert('Sign in to follow this profile.'); return; }
    if (sessionUser.id === targetId) return;
    const next = !isFollowing;
    setBusy(true); setIsFollowing(next); setSummary((current) => ({ ...current, followers: Math.max(0, current.followers + (next ? 1 : -1)) }));
    try { await toggleFollow(sessionUser.id, targetId, next); } catch { setIsFollowing(!next); setSummary((current) => ({ ...current, followers: Math.max(0, current.followers + (next ? -1 : 1)) })); window.alert('Could not update follow status. Try again.'); } finally { setBusy(false); }
  };
  const person = (item) => {
    const identity = getPublicIdentity(item);
    return <a className="public-follow-person" href={item.username ? `/@${item.username}` : '#'} key={item.id}><span className="public-follow-avatar">{item.avatar_path ? <img src={getAvatarUrl(item.avatar_path)} alt="" /> : identity.name.slice(0, 1).toUpperCase()}</span><span><strong>{identity.name}</strong><small>@{item.username || 'member'}</small></span><VerificationBadges idVerified={Boolean(item.id_verified)} cacVerified={Boolean(item.cac_verified)} compact static /></a>;
  };
  return <section className="public-follow-showcase" aria-labelledby="public-follow-title"><div className="public-follow-heading"><div><div className="eyebrow">COMMUNITY & TRUST</div><h2 id="public-follow-title">Stay connected with {name}</h2><p>Follow new listings, updates, and trusted activity from this Miniweb.</p></div><button type="button" className={`public-follow-button ${isFollowing ? 'following' : ''}`} onClick={handleFollow} disabled={busy || sessionUser?.id === targetId}><UserPlus size={15} /> {isFollowing ? 'Following' : 'Follow profile'}</button></div><div className="public-follow-stats"><div><strong>{summary.followers}</strong><span>People following</span></div><div><strong>{summary.following}</strong><span>Following</span></div><div><strong>{summary.followers + summary.following}</strong><span>Community links</span></div></div><div className="public-follow-columns"><div className="public-follow-list"><div className="public-follow-list-heading"><strong>People following this profile</strong><span>{summary.followers}</span></div>{followers.length ? followers.map(person) : <p className="public-follow-empty">No followers to show yet. Be the first to follow this profile.</p>}</div><div className="public-follow-list"><div className="public-follow-list-heading"><strong>{name} follows</strong><span>{summary.following}</span></div>{following.length ? following.map(person) : <p className="public-follow-empty">This profile has not followed anyone publicly yet.</p>}</div></div></section>;
}

function PublicProfileHeader({ profile, business: suppliedBusiness, listings, share }) {
  const business = suppliedBusiness || profile?.business || null;
  const isBusiness = Boolean(business?.business_name);
  const name = business?.business_name || profile?.display_name || 'Bese26 seller';
  const handle = business?.business_handle || profile?.username;
  const location = [business?.city || profile?.city, business?.state || profile?.state].filter(Boolean).filter((value, index, values) => values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index).join(', ');
  const avatar = business?.logo_path || profile?.avatar_path;
  const avatarUrl = getBusinessLogoDisplayUrl(business, avatar ? getAvatarUrl(avatar) : '');
  const description = business?.description || profile?.bio;
  const safeDescription = description && !/^admin$/i.test(String(description).trim()) ? description : '';
  const scrollToListings = () => document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const idVerified = Boolean(profile?.is_verified);
  const cacVerified = Boolean(profile?.cac_verified_name) || Boolean(business?.is_verified);
  const targetId = profile?.id;
  const [profileViews, setProfileViews] = useState(() => listings.reduce((total, item) => total + Number(item.views_count || 0), 0));
  const [visitorSummary, setVisitorSummary] = useState({ total_visits: 0, unique_visitors: 0, last_visited_at: null });
  const [heroFollow, setHeroFollow] = useState({ followers: 0, following: 0, isFollowing: false, busy: false });
  useEffect(() => {
    let mounted = true;
    if (!targetId || !isSupabaseConfigured || !supabase) return undefined;
    (async () => {
      try {
        const [{ data: sessionData }, followSummary] = await Promise.all([supabase.auth.getSession(), fetchFollowSummary(targetId)]);
        const currentUser = sessionData?.session?.user || null;
        const relation = currentUser && currentUser.id !== targetId ? await getFollowState(currentUser.id, targetId) : { following: false };
        if (mounted) setHeroFollow({ followers: Number(followSummary?.followers || 0), following: Number(followSummary?.following || 0), isFollowing: Boolean(relation?.following), busy: false });
      } catch { if (mounted) setHeroFollow((current) => ({ ...current, busy: false })); }
    })();
    return () => { mounted = false; };
  }, [targetId]);
  useEffect(() => {
    let mounted = true;
    if (!targetId || !isSupabaseConfigured || !supabase) return undefined;
    const day = new Date().toISOString().slice(0, 10);
    const storageKey = `bese26:public-profile-visitor:${targetId}`;
    let visitorKey = '';
    try {
      visitorKey = window.localStorage.getItem('bese26:visitor-key') || (crypto.randomUUID ? crypto.randomUUID() : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem('bese26:visitor-key', visitorKey);
    } catch { visitorKey = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    const alreadyRecordedToday = (() => { try { return window.localStorage.getItem(storageKey) === day; } catch { return false; } })();
    const load = alreadyRecordedToday ? fetchPublicProfileViewSummary(targetId) : recordPublicProfileView(targetId, visitorKey);
    Promise.all([fetchPublicSellerViews(targetId), load]).then(([views, summary]) => {
      if (!mounted) return;
      setProfileViews(Number(views || 0));
      setVisitorSummary({ total_visits: Number(summary?.total_visits || 0), unique_visitors: Number(summary?.unique_visitors || 0), last_visited_at: summary?.last_visited_at || null });
      if (!alreadyRecordedToday) { try { window.localStorage.setItem(storageKey, day); } catch {} }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [targetId]);
  const handleHeroFollow = async () => {
    if (!supabase || !targetId) return;
    const { data } = await supabase.auth.getSession();
    const currentUser = data?.session?.user || null;
    if (!currentUser) { window.alert('Sign in to follow this profile.'); return; }
    if (currentUser.id === targetId || heroFollow.busy) return;
    const next = !heroFollow.isFollowing;
    setHeroFollow((current) => ({ ...current, isFollowing: next, followers: Math.max(0, current.followers + (next ? 1 : -1)), busy: true }));
    try { await toggleFollow(currentUser.id, targetId, next); } catch { setHeroFollow((current) => ({ ...current, isFollowing: !next, followers: Math.max(0, current.followers + (next ? -1 : 1)), busy: false })); window.alert('Could not update follow status. Try again.'); return; }
    setHeroFollow((current) => ({ ...current, busy: false }));
  };
  return <><section className="miniweb-hero-v2"><div className="miniweb-hero-v2-top"><div className={`miniweb-hero-v2-logo ${avatarUrl ? 'has-business-logo' : ''}`}>{avatarUrl ? <img src={avatarUrl} alt={`${name} logo`} onLoad={handleBusinessLogoLoad} /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div><div className="miniweb-hero-v2-heading"><div className="miniweb-hero-v2-eyebrow">{isBusiness ? 'PUBLIC BUSINESS' : 'PUBLIC SELLER PROFILE'}</div><h1>{name}</h1><div className={`miniweb-hero-v2-verification ${idVerified || cacVerified ? 'is-verified' : ''}`}><BadgeCheck size={16} /><span><strong>{idVerified || cacVerified ? 'Verified profile' : 'Public profile'}</strong><small>{idVerified || cacVerified ? 'Verified by Bese26' : 'Public profile on Bese26'}</small><VerificationBadges idVerified={idVerified} cacVerified={cacVerified} compact /></span></div></div></div><div className="miniweb-hero-v2-meta"><span><MapPin size={13} /> {location || 'Nigeria'}</span>{(business?.category || business?.business_type) && <span className="miniweb-hero-v2-category">{business.category || business.business_type}</span>}</div>{safeDescription && <p className="miniweb-hero-v2-description">{safeDescription}</p>}<div className="miniweb-hero-v2-bottom"><div className="miniweb-hero-v2-stats"><span><strong>{listings.length}</strong><small>Listings</small></span><span><strong>{heroFollow.followers}</strong><small>Followers</small></span><span><strong>{heroFollow.following}</strong><small>Following</small></span><span><strong>{visitorSummary.unique_visitors || profileViews}</strong><small>Visitors</small></span><button type="button" className={`miniweb-hero-v2-follow ${heroFollow.isFollowing ? 'following' : ''}`} onClick={handleHeroFollow} disabled={heroFollow.busy || !targetId}><UserPlus size={13} /> <span>{heroFollow.isFollowing ? 'Following' : 'Follow'}</span></button></div><div className="miniweb-hero-v2-actions"><button type="button" className="miniweb-hero-v2-listings" onClick={scrollToListings}>View listings <ArrowRight size={14} /></button></div></div>{visitorSummary.last_visited_at && <div className="miniweb-visitor-note">{visitorSummary.total_visits.toLocaleString('en-NG')} visits · Last visit {new Date(visitorSummary.last_visited_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</div>}</section></>;

}
function PublicListingSection({ title, listings }) {
  return <section id="listings" className="public-business-listings storefront-listings-clean"><div className="section-heading"><div><div className="eyebrow">AVAILABLE NOW</div><h2>{title}</h2></div><span>{listings.length} listing{listings.length === 1 ? '' : 's'}</span></div>{listings.length ? <div className="product-grid">{listings.map((listing, index) => <PublicListingCard key={listing.id} listing={listing} featured={index === 0} />)}</div> : <div className="empty-state"><Package size={26} /><h3>No active listings yet</h3><p>Listings from this profile will appear here automatically.</p></div>}</section>;
}
function PublicBusinessAbout({ business }) {
  const services = [business?.delivery_available && 'Delivery available', business?.pickup_available && 'Pickup available'].filter(Boolean);
  return <section className="public-business-about" aria-labelledby="about-store-title"><div className="public-about-heading"><div><div className="eyebrow">ABOUT THE STORE</div><h2 id="about-store-title">About this store</h2></div><Store size={20} /></div><p className="public-about-description">{business?.description || 'Not available'}</p><div className="public-about-grid"><div className="public-about-item"><Tag size={16} /><span><b>Category</b>{business?.category || business?.business_type || 'Not available'}</span></div><div className="public-about-item"><Package size={16} /><span><b>Services</b>{services.length ? services.join(' · ') : 'Not available'}</span></div></div>{business?.website && <a className="public-about-link" href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noreferrer">Visit store website <ArrowUpRight size={14} /></a>}</section>;
}
function PublicStorefrontLayout({ title, share, children }) {
  useEffect(() => { import('./public-storefront.css'); document.title = `${title} | Bese26`; return () => { document.title = 'Bese26'; }; }, [title]);
  return <div className="public-business-shell"><header className="public-business-topbar"><a href="https://bese26.shop/" className="public-brand"><img className="public-brand-logo" src="/images/bese26-logo-icon.webp" alt="Bese26" /><strong>Bese26<span>.shop</span></strong></a><nav className="public-business-nav" aria-label="Public shop navigation"><a href="https://bese26.shop/">Marketplace</a><a href="#listings">Listings</a></nav><button type="button" className="public-topbar-share" onClick={share} aria-label="Share shop"><Share2 size={14} /> Share</button></header><main className="public-business-main">{children}</main><footer className="public-business-footer"><strong>Bese26<span>.shop</span></strong><span>Trusted local buying and selling</span></footer></div>;
}
function MiniwebPublicDashboard({ business, profile, listings, share, chrome = true }) {
  const identity = getPublicIdentity(profile || {});
  const name = business?.business_name || identity.name || 'Bese26 store';
  const content = <><div className="storefront-shell-intro"><span className="storefront-live-dot" /> <span>{chrome ? 'PUBLIC MINIWEB' : 'YOUR MINIWEB PREVIEW'}</span></div><PublicProfileHeader profile={profile} business={business} listings={listings} share={share} />{business && <PublicBusinessAbout business={business} />}<PublicListingSection title={business ? `Listings from ${name}` : `Listings by ${name}`} listings={listings} /></>;
  return chrome ? <PublicStorefrontLayout title={name} share={share}>{content}</PublicStorefrontLayout> : content;
}
function OwnerMiniwebDashboard({ user, onBack, onNavigate, onOpenSubscription, onNotice }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!user?.id) throw new Error('An tabbatar da account session ɗinka sannan ka sake gwadawa.');
        const savedProfile = await getProfile(user.id);
        const publicData = savedProfile?.username
          ? await fetchPublicProfile(savedProfile.username)
          : await fetchPublicProfile('', user.id);
        const fallbackProfile = savedProfile || { id: user.id, username: user.user_metadata?.username || user.email?.split('@')[0] || '', display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Bese26 user', country: 'Nigeria' };
        const fallbackListings = publicData?.listings || await fetchMyListings({ sellerId: user.id, status: 'active' });
        const resolvedData = publicData || { profile: fallbackProfile, listings: fallbackListings };
        if (mounted) setState({ loading: false, data: resolvedData, error: '' });
      } catch (error) {
        if (mounted) setState({ loading: false, data: null, error: error.message || 'Ba a iya loda Miniweb ɗinka ba.' });
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id]);
  const data = state.data;
  const profile = data?.profile || null;
  const business = profile?.business || null;
  const listings = data?.listings || [];
  const name = business?.business_name || profile?.display_name || user?.email?.split('@')[0] || 'Your Miniweb';
  const handle = business?.business_handle || profile?.username || '';
  const publicUrl = handle ? `${SITE_URL}/@${handle}` : '';
  const rankedListings = [...listings].sort((a, b) => Number(b.views_count || b.raw?.views_count || 0) - Number(a.views_count || a.raw?.views_count || 0)).slice(0, 5);
  const maxListingViews = Math.max(1, ...rankedListings.map((item) => Number(item.views_count || item.raw?.views_count || 0)));
  const share = async () => { if (!publicUrl) return; try { if (navigator.share) await navigator.share({ title: name, text: `Duba Miniweb ɗina na Bese26: ${publicUrl}`, url: publicUrl }); else { await navigator.clipboard?.writeText(publicUrl); onNotice?.('An kwafi link ɗin Miniweb.'); } } catch {} };
  const ownerHeader = (eyebrow) => <div className="owner-miniweb-header"><button type="button" className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><div><div className="eyebrow">{eyebrow}</div><strong>My Miniweb</strong></div></div>;
  if (state.loading) return <div className="owner-miniweb-shell">{ownerHeader('YOUR MINIWEB')}<BrandLoader message="Ana buɗe Miniweb ɗinka…" compact /></div>;
  if (state.error || !data) return <div className="owner-miniweb-shell">{ownerHeader('YOUR MINIWEB')}<div className="empty-state"><Store size={26} /><h3>Ba a iya buɗe Miniweb ba</h3><p>{state.error || 'Ƙara bayanan profile ɗinka sannan ka sake gwadawa.'}</p><button type="button" className="primary-button" onClick={() => onNavigate('profile')}>Gyara profile</button></div></div>;
  return <div className="owner-miniweb-shell">{ownerHeader('OWNER DASHBOARD')}<section className="owner-miniweb-control-bar"><div><div className="eyebrow">KAKE SARAWA</div><h1>{name}</h1><p>Wannan shi ne yadda masu amfani za su ga Miniweb ɗinka.</p></div><div className="owner-miniweb-control-actions"><button type="button" className="primary-button" onClick={() => onNavigate('profile')}>Gyara profile <Pencil size={15} /></button><button type="button" className="secondary-button" onClick={() => onNavigate('sell')}>Saka kaya <Package size={15} /></button><button type="button" className="secondary-button" onClick={() => onNavigate('messages')}>Saƙonni <MessageCircle size={15} /></button><button type="button" className="secondary-button" onClick={() => onNavigate('analytics')}>Analytics <Activity size={15} /></button>{publicUrl && <button type="button" className="secondary-button" onClick={share}>Share <Share2 size={15} /></button>}<button type="button" className="secondary-button" onClick={() => onOpenSubscription?.()}>Plans <Sparkles size={15} /></button></div></section><section className="owner-listing-tools"><div className="owner-listing-tools-heading"><div><div className="eyebrow">LISTING CONTROL</div><h2>Sarrafa kayayyaki cikin sauri</h2><p>Ƙara kaya, duba waɗanda suke live, ko gyara listing ɗinka daga nan.</p></div><Package size={24} /></div><div className="owner-listing-stats"><div><strong>{listings.length}</strong><span>Live listings</span></div><div><strong>{listings.reduce((total, item) => total + Number(item.views_count || 0), 0).toLocaleString()}</strong><span>Total views</span></div><div><strong>{listings.filter((item) => item.status === 'draft').length}</strong><span>Drafts</span></div></div><div className="owner-listing-actions"><button type="button" className="primary-button" onClick={() => onNavigate('sell')}><Plus size={15} /> Saka sabon kaya</button><button type="button" className="secondary-button" onClick={() => onNavigate('sell')}><Settings2 size={15} /> Duba duk kayayyaki</button></div></section><section className="owner-miniweb-analytics"><div className="owner-miniweb-analytics-heading"><div><div className="eyebrow">MINIWEB ANALYTICS</div><h2>Wane kaya ne ya fi samun kallo?</h2><p>Ka ga kayayyakin da suke jawo hankalin masu ziyara a Miniweb ɗinka.</p></div><Activity size={24} /></div>{rankedListings.length ? <div className="owner-top-listings">{rankedListings.map((listing, index) => { const views = Number(listing.views_count || listing.raw?.views_count || 0); return <article className="owner-top-listing" key={listing.id || `${listing.title}-${index}`}><span className="owner-top-listing-rank">{index + 1}</span><span className="owner-top-listing-image">{listing.image ? <img src={listing.image} alt="" loading="lazy" /> : <Package size={18} />}</span><div className="owner-top-listing-copy"><strong>{listing.title || 'Untitled listing'}</strong><div className="owner-top-listing-meter"><span style={{ width: `${Math.max(views ? 7 : 0, Math.round((views / maxListingViews) * 100))}%` }} /></div><small>{views.toLocaleString('en-NG')} views</small></div><span className="owner-top-listing-value">{views.toLocaleString('en-NG')}</span></article>; })}</div> : <div className="owner-analytics-empty"><Eye size={20} /><span>Ba a sami listing da views ba tukuna. Saka kaya domin ka fara ganin kididdiga.</span></div>}<div className="owner-analytics-footer"><span><Eye size={14} /> Jimillar views: <strong>{listings.reduce((total, item) => total + Number(item.views_count || item.raw?.views_count || 0), 0).toLocaleString('en-NG')}</strong></span><button type="button" className="secondary-button" onClick={() => onNavigate('analytics')}>Duba cikakken analytics <ArrowRight size={14} /></button></div></section><PublicStorefrontLayout title={name} share={share}><MiniwebPublicDashboard business={business} profile={profile} listings={listings} share={share} chrome={false} /></PublicStorefrontLayout></div>;
}
function PublicPersonalPage({ data }) {
  const { profile, listings } = data;
  const identity = getPublicIdentity(profile);
  const business = profile.business || null;
  const share = async () => { const url = `https://bese26.shop/@${profile.username}`; if (navigator.share) await navigator.share({ title: identity.name, text: business?.description || profile.bio || identity.name, url }); else await navigator.clipboard?.writeText(url); };
  return <PublicStorefrontLayout title={identity.name} share={share}><div className="storefront-shell-intro"><span className="storefront-live-dot" /> <span>PUBLIC MINIWEB</span></div><PublicProfileHeader profile={profile} business={business} listings={listings} share={share} />{business && <PublicBusinessAbout business={business} />}<PublicListingSection title={`Listings from ${identity.name}`} listings={listings} /></PublicStorefrontLayout>;
}
const SEO_SITE_URL = SITE_URL;
const SEO_DEFAULT_IMAGE = `${SEO_SITE_URL}/images/bese26-official-logo.png`;
function seoText(value, fallback = '') {
  return String(value || fallback).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function seoSetMeta(attribute, name, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, name); document.head.appendChild(tag); }
  tag.setAttribute('content', content);
}
function seoSetCanonical(url) {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) { tag = document.createElement('link'); tag.rel = 'canonical'; document.head.appendChild(tag); }
  tag.href = url;
}
function seoSetSchema(id, value) {
  let tag = document.head.querySelector(`script[data-bese26-schema="${id}"]`);
  if (!tag) { tag = document.createElement('script'); tag.type = 'application/ld+json'; tag.dataset.bese26Schema = id; document.head.appendChild(tag); }
  tag.textContent = JSON.stringify(value);
}
function seoListingSchema(listing) {
  const rawPrice = Number(listing?.raw?.price);
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null;
  const image = listing?.image || SEO_DEFAULT_IMAGE;
  const sellerName = listing?.sellerDisplayName || listing?.seller || 'Bese26 seller';
  const sellerUrl = listing?.sellerBusinessHandle ? `${SEO_SITE_URL}/@${listing.sellerBusinessHandle}` : undefined;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seoText(listing?.title, 'Marketplace listing'),
    description: seoText(listing?.description, `${listing?.title || 'Product'} available on Bese26 marketplace.`),
    image: [image],
    url: `${SEO_SITE_URL}/listing/${encodeURIComponent(listing.id)}`,
    brand: { '@type': 'Brand', name: 'Bese26' },
    offers: { '@type': 'Offer', url: `${SEO_SITE_URL}/listing/${encodeURIComponent(listing.id)}`, priceCurrency: 'NGN', availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/UsedCondition' },
  };
  if (price) schema.offers.price = price;
  schema.offers.seller = sellerUrl ? { '@type': 'Organization', name: sellerName, url: sellerUrl } : { '@type': 'Person', name: sellerName };
  return schema;
}
function seoCatalogProduct(item, index) {
  const rawPrice = Number(item?.raw?.price);
  const images = item?.gallery?.filter(Boolean).slice(0, 8) || [];
  const product = {
    '@type': 'Product',
    name: seoText(item?.title, 'Bese26 marketplace listing'),
    description: seoText(item?.description, `${item?.title || 'Product'} available in Nigeria on Bese26.`),
    image: images.length ? images : [item?.image || SEO_DEFAULT_IMAGE],
    url: `${SEO_SITE_URL}/listing/${encodeURIComponent(item.id)}`,
    category: seoText(item?.category),
    offers: {
      '@type': 'Offer',
      url: `${SEO_SITE_URL}/listing/${encodeURIComponent(item.id)}`,
      priceCurrency: 'NGN',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    },
  };
  if (Number.isFinite(rawPrice) && rawPrice > 0) product.offers.price = rawPrice;
  return { '@type': 'ListItem', position: index + 1, url: product.url, item: product };
}
function seoSocialLinks(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && /^https?:\/\//i.test(item));
  if (typeof value === 'object') return Object.values(value).filter((item) => typeof item === 'string' && /^https?:\/\//i.test(item));
  return String(value).split(/[,\s]+/).filter((item) => /^https?:\/\//i.test(item));
}
function seoPublicProfileSchema({ business, profile, listings, name, description, canonical, image }) {
  const location = business || profile || {};
  const entity = {
    '@context': 'https://schema.org',
    '@type': business ? 'Store' : 'Person',
    '@id': `${canonical}#profile`,
    name,
    alternateName: business?.business_handle ? `@${business.business_handle}` : undefined,
    url: canonical,
    description,
    image,
    brand: { '@type': 'Brand', name },
    areaServed: { '@type': 'Country', name: 'Nigeria' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: location.city || '',
      addressRegion: location.state || '',
      addressCountry: 'NG',
    },
    knowsLanguage: ['en', 'ha'],
  };
  if (business?.phone || business?.public_contact) entity.telephone = business.phone || business.public_contact;
  if (business?.email) entity.email = business.email;
  const social = seoSocialLinks(business?.social_links);
  if (social.length) entity.sameAs = social;
  if (business?.is_verified || profile?.is_verified) entity.additionalType = 'https://schema.org/TrustedContributor';
  entity.hasOfferCatalog = {
    '@type': 'OfferCatalog',
    name: `Products and services from ${name}`,
    itemListElement: listings.slice(0, 120).map(seoCatalogProduct),
  };
  entity.mainEntityOfPage = { '@type': 'WebPage', '@id': canonical };
  return entity;
}
function usePublicSeo({ title, description, canonical, image = SEO_DEFAULT_IMAGE, schema }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    seoSetMeta('name', 'description', description);
    seoSetMeta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1');
    seoSetMeta('property', 'og:title', title);
    seoSetMeta('property', 'og:description', description);
    seoSetMeta('property', 'og:type', 'website');
    seoSetMeta('property', 'og:url', canonical);
    seoSetMeta('property', 'og:image', image || SEO_DEFAULT_IMAGE);
    seoSetMeta('property', 'og:site_name', 'Bese26');
    seoSetMeta('name', 'twitter:card', 'summary_large_image');
    seoSetMeta('name', 'twitter:title', title);
    seoSetMeta('name', 'twitter:description', description);
    seoSetMeta('name', 'twitter:image', image || SEO_DEFAULT_IMAGE);
    seoSetCanonical(canonical);
    if (schema) seoSetSchema('public-page', schema);
    return () => { document.title = previousTitle; };
  }, [title, description, canonical, image, schema]);
}

function PublicBusinessPage({ handle, profileId = null }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => { let mounted = true; const request = profileId ? fetchPublicProfile('', profileId) : fetchPublicBusiness(handle).then((data) => data || fetchPublicProfile(handle)); request.then((data) => mounted && setState({ loading: false, data, error: '' })).catch((error) => mounted && setState({ loading: false, data: null, error: error.message || 'Unable to load this public profile.' })); return () => { mounted = false; }; }, [handle, profileId]);
const seoData = state.data;
  const seoBusiness = seoData?.business || seoData?.profile?.business;
  const seoProfile = seoData?.profile || seoData?.ownerProfile;
  const seoListings = seoData?.listings || [];
  const seoName = seoBusiness?.business_name || seoProfile?.display_name || handle;
  const seoDescription = seoText(seoBusiness?.description || seoProfile?.bio, `${seoName} on Bese26 — discover listings, products and services in Nigeria.`);
  const publicPath = seoBusiness?.business_handle || seoProfile?.username ? `/@${String(seoBusiness?.business_handle || seoProfile?.username).toLowerCase()}` : profileId ? `/seller/${encodeURIComponent(profileId)}` : `/@${String(handle || '').toLowerCase()}`;
  const seoCanonical = `${SEO_SITE_URL}${publicPath}`;
  const seoBusinessImage = getBusinessLogoDisplayUrl(seoBusiness, getAvatarUrl(seoBusiness?.logo_path)) || SEO_DEFAULT_IMAGE;
  usePublicSeo({ title: seoBusiness ? `${seoName} | Official company profile` : `${seoName} | Bese26 profile`, description: seoDescription, canonical: seoCanonical, image: seoBusinessImage, schema: seoData ? seoPublicProfileSchema({ business: seoBusiness, profile: seoProfile, listings: seoListings, name: seoName, description: seoDescription, canonical: seoCanonical, image: seoBusinessImage }) : null });
  if (state.loading) return <MiniwebDashboardShell />;
  if (state.error || !state.data) return <div className="public-business-shell"><section className="public-business-not-found"><div className="brand-mark">B</div><div className="eyebrow">BESE26 SHOP</div><h1>Shop not found</h1><p>This public shop does not exist, is inactive, or has no public profile.</p><a className="primary-button" href="https://bese26.shop/">Back to Bese26 <ArrowRight size={16} /></a></section></div>;
  if (state.data.profile) { const { profile, listings } = state.data; return <PublicPersonalPage data={{ profile, listings }} />; }
  const { business, ownerProfile, listings } = state.data;
  const share = async () => { const url = `https://bese26.shop${publicPath}`; if (navigator.share) await navigator.share({ title: business?.business_name || seoName, text: business?.description || seoName, url }); else await navigator.clipboard?.writeText(url); };
  return <PublicStorefrontLayout title={business.business_name} share={share}><div className="storefront-shell-intro"><span className="storefront-live-dot" /> <span>PUBLIC BUSINESS</span></div><PublicProfileHeader profile={ownerProfile} business={business} listings={listings} share={share} /><PublicBusinessAbout business={business} /><PublicListingSection title={`Listings from ${business.business_name}`} listings={listings} /></PublicStorefrontLayout>;
}
function PublicListingRoute({ listingId }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [authInitialMode, setAuthInitialMode] = useState('signin');
  useEffect(() => { let mounted = true; fetchListingDetails(listingId).then((data) => mounted && setListing(data)).catch(() => mounted && setListing(null)).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [listingId]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSessionUser(data?.session?.user || null)).catch(() => {});
    const { data: authState } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSessionUser(session?.user || null);
    });
    return () => { mounted = false; authState?.subscription?.unsubscribe?.(); };
  }, []);
  const listingDescription = listing ? seoText(listing.description, `${listing.title} — ${listing.price} in ${listing.location}. Find it on Bese26, Nigeria's marketplace.`) : '';
  usePublicSeo({ title: listing ? `${listing.title} | Bese26 Marketplace` : 'Bese26 Marketplace', description: listingDescription, canonical: listing ? `${SEO_SITE_URL}/listing/${encodeURIComponent(listing.id)}` : `${SEO_SITE_URL}/`, image: listing?.image || SEO_DEFAULT_IMAGE, schema: listing ? seoListingSchema(listing) : null });
  if (loading) return <BrandLoader message="Loading listing…" compact />;
  if (!listing) return <div className="empty-state listing-not-found"><Package size={30} /><h1>Listing not found</h1><p>This listing is no longer available or is not public.</p><a className="primary-button" href="/">Back to Bese26</a></div>;
  const requireAuth = (message = 'Create an account or sign in to join the listing discussion.') => { setAuthReason(message); setAuthInitialMode('signin'); setShowAuth(true); };
  return <>
    <ListingDetailsView listing={listing} user={sessionUser} onAuthRequired={requireAuth} onClose={() => window.location.assign('/')} onDemoAction={(message) => window.alert(message)} onStartChat={(_listing, intent = 'message', draft = '') => { const params = new URLSearchParams({ chat_listing: listing.id, chat_intent: intent }); if (draft) params.set('chat_draft', draft); window.location.assign(`/?${params.toString()}`); }} />
    {showAuth && <AuthPanel reason={authReason} initialMode={authInitialMode} onClose={() => setShowAuth(false)} onAuthenticated={(nextUser) => { setSessionUser(nextUser); setShowAuth(false); setAuthInitialMode('signin'); setAuthReason(''); }} />}
  </>;
}

function BusinessDirectoryView({ onBack, adCampaigns = [] }) {
  const [businesses, setBusinesses] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadBusinesses = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try { setBusinesses(await fetchBusinessDirectory(search)); }
    catch (reason) { setBusinesses([]); setError(reason.message || 'Could not load public miniwebs.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);
  const submitSearch = (event) => { event.preventDefault(); loadBusinesses(query); };
  return <div className="page-stack directory-premium">
    <div className="directory-topbar">
      <button type="button" className="directory-back-button" onClick={onBack} aria-label="Back to marketplace"><ArrowLeft size={17} /><span>Back to marketplace</span></button>
      <div className="directory-brand-pill"><Sparkles size={13} aria-hidden="true" /><span>BESE26 MINIWEBS</span></div>
    </div>
    <section className="directory-hero">
      <div className="directory-hero-copy">
        <div className="directory-eyebrow"><span /> BUSINESS DIRECTORY</div>
        <h1>Discover businesses worth <span>knowing.</span></h1>
        <p>Find the company or store you need. Explore local businesses and their miniwebs, all in one place.</p>
        <div className="directory-hero-proof"><span className="directory-proof-icon"><Check size={13} /></span><span>Local stores. Trusted businesses. Easy discovery.</span></div>
      </div>
      <div className="directory-hero-art" aria-hidden="true">
        <span className="directory-orbit directory-orbit-one" />
        <span className="directory-orbit directory-orbit-two" />
        <span className="directory-hero-store"><Store size={37} strokeWidth={1.7} /></span>
        <span className="directory-hero-note"><Sparkles size={13} /><span><strong>Made for discovery</strong><small>Find your next favourite</small></span></span>
      </div>
      <form className="directory-search" onSubmit={submitSearch} role="search">
        <Search size={19} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business, category or city" aria-label="Search businesses by name, category or city" />
        <button type="submit" className="directory-search-submit"><span>Search</span><ArrowRight size={16} /></button>
      </form>
    </section>
    <SponsoredBanner campaigns={adCampaigns} placement="business_directory" className="business-sponsored-slot" />
    {error && <div className="auth-status error" role="alert"><AlertCircle size={15} /> {error} <button type="button" className="text-action" onClick={() => loadBusinesses(query)}>Retry</button></div>}
    <section className="directory-results" aria-labelledby="directory-results-title">
      <div className="directory-results-heading">
        <div><span className="directory-section-kicker">CURATED FOR YOU</span><h2 id="directory-results-title">Miniwebs to explore</h2><p>Meet businesses and stores from around your community.</p></div>
        {!loading && <span className="directory-results-count"><strong>{businesses.length}</strong> {businesses.length === 1 ? 'business' : 'businesses'}</span>}
      </div>
      {loading ? <BrandLoader message="Loading public miniwebs…" compact /> : error ? null : businesses.length ? <div className="directory-business-grid">{businesses.map((business) => {
        const name = business.business_name || 'Bese26 business';
        const handle = business.business_handle;
        const logoUrl = getBusinessLogoDisplayUrl(business, getAvatarUrl(business.logo_path));
        const location = [business.city, business.state].filter(Boolean).join(', ') || 'Nigeria';
        return <article className="directory-business-card" key={business.profile_id || handle} role={handle ? 'link' : undefined} tabIndex={handle ? 0 : -1} aria-label={handle ? `Open ${name} miniweb` : name} onClick={(event) => { if (!handle || event.target.closest?.('a, button')) return; window.location.assign(`/@${handle}`); }} onKeyDown={(event) => { if (!handle || event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return; event.preventDefault(); window.location.assign(`/@${handle}`); }}>
          <div className="directory-business-card-main">
            <div className="directory-business-logo">{business.logo_path || isOfficialBese26Business(business) ? <img src={logoUrl} alt={`${name} logo`} onLoad={handleBusinessLogoLoad} /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div>
            <div className="directory-business-identity">
              <div className="directory-business-title"><h3>{name}</h3><ArrowUpRight size={16} aria-hidden="true" /></div>
              <span className="directory-business-handle">@{handle || 'public-store'}</span>
              <VerificationBadges idVerified={business.id_verified} cacVerified={business.cac_verified} compact />
            </div>
          </div>
          <div className="directory-business-footer">
            <span className="directory-business-location"><MapPin size={15} aria-hidden="true" /><span>{location}</span></span>
            {handle ? <a className="directory-visit-link" href={`/@${handle}`}>Visit miniweb <ArrowRight size={15} aria-hidden="true" /></a> : <span className="directory-visit-link is-unavailable">Miniweb</span>}
          </div>
        </article>;
      })}</div> : <div className="directory-empty-state"><span className="directory-empty-icon"><Store size={24} /></span><h3>No public miniwebs found</h3><p>Try another business name, category or city to find what you need.</p>{query && <button type="button" className="directory-clear-search" onClick={() => { setQuery(''); loadBusinesses(); }}>Clear search</button>}</div>}
    </section>
  </div>;
}

function AppContent() {
  const { locale, locales, setLocale, t } = useI18n();
  const publicSellerId = typeof window !== 'undefined' ? window.location.pathname.match(/^\/?seller\/([0-9a-f-]{20,})\/?$/i)?.[1] : null;
  const publicHandle = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1] || window.location.pathname.match(/^\/?(?:business|store|miniweb)\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1] || new URLSearchParams(window.location.search).get('business'))?.toLowerCase() : null;
  const publicListingId = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/?listing\/([^/]+)\/?$/i)?.[1] || new URLSearchParams(window.location.search).get('listing') || new URLSearchParams(window.location.search).get('listing_id')) : null;
  if (publicListingId) return <PublicListingRoute listingId={publicListingId} />;
  if (publicSellerId) return <PublicBusinessPage profileId={publicSellerId} handle={publicSellerId} />;
  if (publicHandle) return <PublicBusinessPage handle={publicHandle} />;
  const [activeNav, setActiveNav] = useState('home');
  const navigationReadyRef = useRef(false);
  const [savedIds, setSavedIds] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingFocusTarget, setListingFocusTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(() => { try { return localStorage.getItem('bese26:theme') === 'dark'; } catch { return false; } });
  const [toast, setToast] = useState('');
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [profileReset, setProfileReset] = useState(0);
  const [profilePageTarget, setProfilePageTarget] = useState('main');
  const [chatTargetId, setChatTargetId] = useState(null);
  const [chatNotificationTarget, setChatNotificationTarget] = useState(null);
  const [marketListings, setMarketListings] = useState([]);
  const [marketLoading, setMarketLoading] = useState(isSupabaseConfigured);
  const [marketCategories, setMarketCategories] = useState([]);
  const [trendingScores, setTrendingScores] = useState([]);
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [userPlace, setUserPlace] = useState('');
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [businessOwnerProfile, setBusinessOwnerProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [isOwnerAdmin, setIsOwnerAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(() => typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
  const recoveryLinkRequested = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('auth') === 'recovery' || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery');
  const [showAuth, setShowAuth] = useState(recoveryLinkRequested);
  const [authReason, setAuthReason] = useState(recoveryLinkRequested ? 'Create a new password for your Bese26 account.' : '');
  const [authInitialMode, setAuthInitialMode] = useState(recoveryLinkRequested ? 'recovery' : 'signin');
  const [authTarget, setAuthTarget] = useState('');
  const [chatListing, setChatListing] = useState(null);
  const [chatDealPanel, setChatDealPanel] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [editingListing, setEditingListing] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [copySourceListing, setCopySourceListing] = useState(null);
  const [startupReady, setStartupReady] = useState(!isSupabaseConfigured);
  const [startupError, setStartupError] = useState('');
  const [platformSettings, setPlatformSettings] = useState({ maintenance_mode: false });
  const startupReadyRef = useRef(!isSupabaseConfigured);
  const ownerAdminEmail = 'smbabanbaba@gmail.com';
  const canAccessAdmin = Boolean(isAdmin || adminPermissions.length > 0 || sessionUser?.email?.toLowerCase() === ownerAdminEmail);
  const privateAdminEntry = new URLSearchParams(window.location.search).get('admin') === 'login';
  useEffect(() => { if (!isSupabaseConfigured) return undefined; let mounted = true; fetchPlatformSettings().then((value) => mounted && setPlatformSettings(value || { maintenance_mode: false })).catch(() => {}); return () => { mounted = false; }; }, []);

  // Start on the requested deep link while keeping the normal marketplace shell on Home.
  useEffect(() => {
    const policyPages = new Set(['terms', 'privacy', 'refund-policy', 'safety']);
    const applyDeepLink = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, '').toLowerCase();
      if (policyPages.has(hash)) setActiveNav(`public-${hash}`);
      else if (params.has('business_dashboard')) setActiveNav('business');
      else if (!params.has('chat_listing') && !params.has('reference') && !params.has('payment')) setActiveNav('home');
    };
    applyDeepLink();
    window.addEventListener('hashchange', applyDeepLink);
    return () => window.removeEventListener('hashchange', applyDeepLink);
  }, []);
  useEffect(() => { try { localStorage.setItem('bese26:theme', isDark ? 'dark' : 'light'); } catch {} }, [isDark]);

  const showToast = useCallback((message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); }, []);
  const changeLocale = useCallback(async (next) => {
    if (!locales.some((item) => item.code === next)) return;
    setLocale(next);
    if (sessionUser?.id && isSupabaseConfigured) {
      try { await updateProfilePreferences(sessionUser.id, { language: next }); }
      catch { showToast('Language changed on this device, but account sync is temporarily unavailable.'); }
    }
  }, [locales, sessionUser?.id, setLocale, showToast]);
  const consumeProfilePageTarget = useCallback(() => setProfilePageTarget('main'), []);
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) { showToast('Location is not available in this browser.'); return; }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setUserCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(coords.latitude)}&lon=${encodeURIComponent(coords.longitude)}&zoom=10&addressdetails=1`, { headers: { Accept: 'application/json' } });
        const result = await response.json();
        const address = result.address || {};
        setUserPlace(address.city || address.town || address.municipality || address.county || address.state || 'your area');
        showToast('Location updated. Showing nearby listings first.');
      } catch { setUserPlace('your area'); showToast('Location found, but the place name could not be loaded.'); }
      setLocationBusy(false);
    }, (error) => { setLocationBusy(false); showToast(error.code === 1 ? 'Location permission was not granted.' : 'Could not detect your location.'); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }, [showToast]);
  const nearbyListings = useMemo(() => {
    if (!userPlace) return marketListings;
    const needle = userPlace.toLowerCase();
    return [...marketListings].sort((a, b) => {
      const aMatch = `${a.location || ''} ${a.city || ''} ${a.state || ''}`.toLowerCase().includes(needle) ? 1 : 0;
      const bMatch = `${b.location || ''} ${b.city || ''} ${b.state || ''}`.toLowerCase().includes(needle) ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [marketListings, userPlace]);
  const requireAuth = useCallback((message = 'Create an account or sign in to continue with your marketplace account.', initialMode = 'signin', target = '') => { setAuthReason(message); setAuthInitialMode(initialMode === 'signin' ? 'signin' : 'signup'); setAuthTarget(target); setShowAuth(true); }, []);  useEffect(() => {
    if (!sessionUser || !authTarget) return undefined;
    const destination = authTarget;
    setAuthTarget('');
    if (destination !== activeNav) navigate(destination);
    return undefined;
  }, [sessionUser, authTarget]);
  useEffect(() => {
    let mounted = true;
    if (!sessionUser) { setUnreadNotifications(0); setBusinessOwnerProfile(null); return undefined; }
    fetchNotifications(sessionUser.id).then((rows) => mounted && setUnreadNotifications((rows || []).filter((item) => !item.read_at).length)).catch(() => {});
    if (isSupabaseConfigured) ensureAccountDashboard(sessionUser.id, { displayName: sessionUser.user_metadata?.display_name, email: sessionUser.email || '' }).then((result) => mounted && setBusinessOwnerProfile(result?.business || null)).catch(() => ensureBusinessProfile(sessionUser).then((profile) => mounted && setBusinessOwnerProfile(profile)).catch(() => mounted && setBusinessOwnerProfile(null)));
    const unsubscribe = subscribeToNotifications(sessionUser.id, (payload) => {
      if (!mounted || !payload?.new) return;
      if (!payload.new.read_at) setUnreadNotifications((count) => count + 1);
      const title = payload.new.title || 'New Bese26 notification';
      showToast(title);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const systemNotification = new Notification(title, { body: payload.new.body || 'You have a new update on Bese26.', icon: '/images/bese26-logo-icon.webp', badge: '/images/bese26-logo-icon.webp', tag: `bese26-${payload.new.id || payload.new.notification_type || Date.now()}`, renotify: true });
        systemNotification.onclick = () => { window.focus(); systemNotification.close(); };
      }
    });
    const badgeTimer = window.setInterval(() => { fetchNotifications(sessionUser.id).then((rows) => mounted && setUnreadNotifications((rows || []).filter((item) => !item.read_at).length)).catch(() => {}); }, 20000);
    return () => { mounted = false; window.clearInterval(badgeTimer); unsubscribe?.(); };
  }, [sessionUser, showToast]);
  const enableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) { showToast('This browser does not support phone notifications.'); return; }
    try { const permission = await Notification.requestPermission(); setBrowserNotificationPermission(permission); showToast(permission === 'granted' ? 'Phone alerts are now on.' : 'Phone alerts were not enabled.'); } catch { showToast('Could not enable phone alerts in this browser.'); }
  };
  useEffect(() => {
    if (!sessionUser?.id || typeof window === 'undefined' || !('Notification' in window)) return undefined;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      setBrowserNotificationPermission(Notification.permission);
      return undefined;
    }
    // Ask once when an authenticated user opens the app; browsers may defer this until a user gesture.
    let cancelled = false;
    Notification.requestPermission().then((permission) => {
      if (!cancelled) setBrowserNotificationPermission(permission);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [sessionUser?.id]);
  useEffect(() => {
    let mounted = true;
    if (!sessionUser?.id || !isSupabaseConfigured) return undefined;
    getProfilePreferences(sessionUser.id).then((preferences) => {
      if (!mounted || !preferences?.language || !locales.some((item) => item.code === preferences.language)) return;
      setLocale(preferences.language);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [sessionUser?.id, locales, setLocale]);
  const toggleSave = (id) => {
    const wasSaved = savedIds.includes(id);
    if (isSupabaseConfigured && !sessionUser) { requireAuth('Sign in to save listings for later.'); return; }
    setSavedIds((ids) => wasSaved ? ids.filter((item) => item !== id) : [...ids, id]);
    showToast(wasSaved ? 'Removed from saved' : 'Saved for later');
    if (isSupabaseConfigured && sessionUser) toggleFavorite(sessionUser.id, id, !wasSaved).catch(() => {
      setSavedIds((ids) => wasSaved ? [...ids, id] : ids.filter((item) => item !== id));
      showToast('Could not update saved listings. Try again.');
    });
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let mounted = true;
    let lastRefreshAt = 0;
    const loadBackend = ({ initial = false } = {}) => {
      if (!initial && Date.now() - lastRefreshAt < 10000) return loadBackend.inFlight;
      if (loadBackend.inFlight) return loadBackend.inFlight;
      lastRefreshAt = Date.now();
      loadBackend.inFlight = (async () => {
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;
        // Auth restoration and suspension checks run independently from public
        // listing data so slow private requests never block marketplace browsing.
        if (mounted) setSessionUser(session?.user || null);
        if (session?.user) {
          const { data: accessProfile, error: accessError } = await supabase.from('profiles').select('admin_suspended').eq('id', session.user.id).maybeSingle();
          if (!accessError && accessProfile?.admin_suspended) {
            await supabase.auth.signOut();
            if (mounted) { setSessionUser(null); setIsAdmin(false); showToast('This account is currently suspended. Contact Bese26 support.'); }
            return;
          }
        }
      } catch (error) {
        if (mounted && !initial) showToast(error.message || 'Could not restore your session.');
      }
      try {
        const [remoteListings, remoteCategories, remoteTrending] = await Promise.all([fetchActiveListings(), fetchCategories(), fetchTrendingListingScores(40).catch(() => [])]);
        if (mounted) {
          setMarketListings(remoteListings || []);
          setMarketCategories(remoteCategories || []);
          setTrendingScores(remoteTrending || []);
          setMarketLoading(false);
        }
      } catch (error) {
        if (mounted) setMarketLoading(false);
        if (mounted && initial) setStartupError('Bese26 could not finish loading the marketplace data.');
        if (mounted && !initial) showToast(error.message || 'Could not load live marketplace data.');
        if (initial) return;
      }
      const [homeAds, homeSlots, searchAds, businessAds, settingsResult] = await Promise.allSettled([
        fetchActiveAdCampaigns(),
        fetchActiveAdCampaigns({ placement: 'homepage' }),
        fetchActiveAdCampaigns({ placement: 'search' }),
        fetchActiveAdCampaigns({ placement: 'business_directory' }),
        fetchPlatformSettings(),
      ]);
      if (mounted) {
        setAdCampaigns([
          ...(homeAds.status === 'fulfilled' ? (homeAds.value || []) : []),
          ...(homeSlots.status === 'fulfilled' ? (homeSlots.value || []) : []),
          ...(searchAds.status === 'fulfilled' ? (searchAds.value || []) : []),
          ...(businessAds.status === 'fulfilled' ? (businessAds.value || []) : []),
        ]);
        if (settingsResult.status === 'fulfilled') setPlatformSettings(settingsResult.value || { maintenance_mode: false });
      }
      if (session?.user) {
        try {
          const remoteSaved = await fetchSavedIds(session.user.id);
          if (mounted) setSavedIds(remoteSaved || []);
        } catch {
          if (mounted) setSavedIds([]);
        }
      } else if (mounted) {
        setSavedIds([]);
        setIsAdmin(false); setAdminPermissions([]); setIsOwnerAdmin(false);
      }
      if (mounted && initial && !startupReadyRef.current) {
        setStartupError('');
        startupReadyRef.current = true;
        setStartupReady(true);
      }
      })().finally(() => { loadBackend.inFlight = null; });
      return loadBackend.inFlight;
    };
    loadBackend({ initial: true });
    // Keep the branded splash visible until the initial marketplace data is
    // complete. This avoids opening the app into a half-empty loading shell.
    const startupTimeout = window.setTimeout(() => {
      if (mounted && !startupReadyRef.current) {
        // Never trap users on a splash screen when marketplace data is slow.
        // Home/Search skeletons can keep loading while Login/Register stays usable.
        startupReadyRef.current = true;
        setStartupError('');
        setStartupReady(true);
      }
    }, 12000);
    const refreshTimer = window.setInterval(loadBackend, 5 * 60 * 1000);
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') loadBackend(); };
    const refreshWhenFocused = () => loadBackend();
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenFocused);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSessionUser(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthInitialMode('recovery');
        setAuthReason('Create a new password for your Bese26 account.');
        setShowAuth(true);
      }
      if (event === 'SIGNED_IN' && session?.user) {
        loadBackend();
        fetchSavedIds(session.user.id).then(setSavedIds).catch(() => {});
      }
      if (event === 'SIGNED_OUT') { setSavedIds([]); setIsAdmin(false); setAdminPermissions([]); setIsOwnerAdmin(false); setSelectedListing(null); setChatListing(null); setChatTargetId(null); setChatDealPanel(''); setChatNotificationTarget(null); setChatDraft(''); setEditingListing(null); setSearch(''); setActiveNav('home'); loadBackend(); }
    });
    return () => { mounted = false; window.clearTimeout(startupTimeout); window.clearInterval(refreshTimer); document.removeEventListener('visibilitychange', refreshWhenVisible); window.removeEventListener('focus', refreshWhenFocused); subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!sessionUser?.id || !isSupabaseConfigured) {
      setIsAdmin(false); setAdminPermissions([]); setIsOwnerAdmin(false);
      return undefined;
    }
    let mounted = true;
    const refreshAccess = () => fetchAdminAccess().then((access) => {
      if (!mounted) return;
      setIsAdmin(Boolean(access?.isAdmin));
      setAdminPermissions(access?.permissions || []);
      setIsOwnerAdmin(Boolean(access?.isOwner));
    }).catch(() => {
      if (mounted) { setIsAdmin(false); setAdminPermissions([]); setIsOwnerAdmin(false); }
    });
    refreshAccess();
    const refreshOnVisibility = () => { if (document.visibilityState === 'visible') refreshAccess(); };
    window.addEventListener('focus', refreshAccess);
    document.addEventListener('visibilitychange', refreshOnVisibility);
    const timer = window.setInterval(refreshAccess, 60 * 1000);
    return () => { mounted = false; window.removeEventListener('focus', refreshAccess); document.removeEventListener('visibilitychange', refreshOnVisibility); window.clearInterval(timer); };
  }, [sessionUser?.id]);
  useEffect(() => {
    if (!sessionUser || !isSupabaseConfigured) return undefined;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (!reference || window.sessionStorage.getItem(`bese26-verified:${reference}`)) return undefined;
    window.sessionStorage.setItem(`bese26-verified:${reference}`, 'pending');
    setPaymentVerifying(true);
    verifyPaystackPayment(reference).then((result) => {
      if (result.successful) showToast(`Congratulations! Your ${result.planKey} plan is now active.`);
      else showToast(result.message || 'Payment is still being confirmed.');
      window.sessionStorage.setItem(`bese26-verified:${reference}`, result.successful ? 'complete' : 'pending');
    }).catch((error) => { window.sessionStorage.removeItem(`bese26-verified:${reference}`); showToast(error.message || 'Could not verify the payment yet.'); }).finally(() => setPaymentVerifying(false));
    params.delete('reference');
    params.delete('payment');
    const nextQuery = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
    return undefined;
  }, [sessionUser]);
  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { trackPageView(`${window.location.pathname}#${activeNav}`); }, [activeNav]);
  useEffect(() => {
    const currentState = window.history.state || {};
    window.history.replaceState({ ...currentState, bese26Route: 'home' }, '', window.location.href);
    navigationReadyRef.current = true;
    const handlePopState = (event) => {
      setSelectedListing(null);
      setListingFocusTarget(null);
      setEditingListing(null);
      setEditingDraft(null);
      setCopySourceListing(null);
      setActiveNav(event.state?.bese26Route || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const navigate = (page) => {
    const protectedPages = new Set(['notifications', 'saved', 'sell', 'messages', 'analytics', 'business', 'profile', 'subscription', 'admin']);
    if (protectedPages.has(page) && !sessionUser) {
      requireAuth('Login or create a free Bese26 account to continue.', 'signin', page);
      return;
    }
    if (page !== 'sell') { setEditingListing(null); setCopySourceListing(null); }
    if (page === 'sell') trackEvent('open_sell');
    if (page === 'subscription') trackEvent('view_pricing');
    if (page === 'profile' && activeNav === 'profile') setProfileReset((value) => value + 1);
    if (selectedListing) window.history.replaceState({ ...(window.history.state || {}), bese26Route: activeNav, bese26Listing: false }, '', window.location.href);
    if (navigationReadyRef.current && page !== activeNav) window.history.pushState({ ...(window.history.state || {}), bese26Route: page }, '', window.location.href);
    setSelectedListing(null);
    setListingFocusTarget(null);
    setActiveNav(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openSell = async (copySource = null) => {
    if (isSupabaseConfigured && !sessionUser) { requireAuth('Login before posting a listing.', 'signin', 'sell'); return; }
    if (canAccessAdmin || !isSupabaseConfigured) {
      setEditingDraft(null); setEditingListing(null); setCopySourceListing(copySource); navigate('sell'); return;
    }
    try {
      const entitlement = await fetchSellerEntitlement();
      const expired = entitlement?.plan_key !== 'free' && !entitlement?.is_paid;
      const remaining = entitlement?.is_paid
        ? Number(entitlement.listing_limit || 0) - Number(entitlement.free_posts_used || 0)
        : Number(entitlement?.free_posts_remaining ?? 0);
      if (expired || remaining <= 0) {
        showToast(expired ? 'Your plan has expired. Choose a subscription to continue selling.' : 'Your listing limit is finished. Choose a subscription to post more listings.');
        navigate('subscription');
        return;
      }
    } catch {
      // Fail closed: never expose Sell when the account quota cannot be verified.
      showToast('We could not verify your listing limit. Choose a plan or try again.');
      navigate('subscription');
      return;
    }
    setEditingDraft(null); setEditingListing(null); setCopySourceListing(copySource); navigate('sell');
  };
  const goBack = () => {
    if (window.history.state?.bese26Route && activeNav !== 'home') window.history.back();
    else if (activeNav !== 'home') navigate('home');
  };
  const goPublicSection = (section) => { trackEvent('view_public_policy', { policy: section }); setActiveNav(`public-${section}`); setEditingListing(null); window.scrollTo({ top: 0, behavior: 'smooth' }); window.history.replaceState({}, '', `/#${section}`); };
  const goSearch = (value) => { setSearch(value); trackEvent('search', { search_term: value }); navigate('search'); };
  const openListing = (listing, focusTarget = null) => {
    trackEvent('view_listing', { listing_id: listing?.id, listing_category: listing?.category });
    window.history.pushState({ ...(window.history.state || {}), bese26Route: activeNav, bese26Listing: true }, '', window.location.href);
    setListingFocusTarget(focusTarget || null);
    setSelectedListing(listing);
    if (sessionUser?.id) recordRecentlyViewed(sessionUser.id, listing.id).catch(() => {});
    fetchListingDetails(listing.id).then((details) => {
      if (details) setSelectedListing((current) => current?.id === listing.id ? details : current);
    }).catch(() => {});
  };
  const openNotificationConversation = (conversationId, target = null) => {
    if (!conversationId) return showToast('This conversation is no longer available.');
    setSelectedListing(null);
    setListingFocusTarget(null);
    setChatListing(null);
    setChatDealPanel('');
    setChatDraft('');
    setChatTargetId(conversationId);
    setChatNotificationTarget(target || null);
    navigate('messages');
  };
  const openNotificationProfilePage = (page) => {
    setProfilePageTarget(page || 'main');
    navigate('profile');
  };
  const openNotificationPublicProfile = (username) => {
    const handle = String(username || '').replace(/^@/, '').trim();
    if (!handle) return showToast('This member does not have a public profile link yet.');
    window.location.assign(`/@${encodeURIComponent(handle)}`);
  };
  const openChat = async (listing, intent = 'message', draft = '') => {
    if (isSupabaseConfigured && !sessionUser) { setSelectedListing(null); requireAuth('Login to chat with this seller.', 'signin', 'messages'); return; }
    if (!isSupabaseConfigured) { showToast('Chat is unavailable right now.'); return; }
    if (!listing.sellerId || listing.sellerId === sessionUser.id) { showToast('This listing is not available for a buyer conversation.'); return; }
    try {
      const conversation = await getOrCreateConversation({ listingId: listing.id, buyerId: sessionUser.id, sellerId: listing.sellerId });
      setSelectedListing(null);
      setListingFocusTarget(null);
      setChatListing(listing);
      setChatDealPanel(intent === 'offer' ? 'offer' : '');
      setChatDraft(draft || '');
      setChatNotificationTarget(null);
      showToast(`Chat opened for ${listing.title}`);
      setChatTargetId(conversation.id);
      navigate('messages');
    } catch (error) { showToast(error.message || 'Could not open the seller chat.'); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('chat_listing');
    const chatIntent = params.get('chat_intent') || 'message';
    const chatDraft = params.get('chat_draft') || '';
    if (!listingId) return;
    if (isSupabaseConfigured && !sessionUser) { requireAuth('Login to message this business.', 'signin', 'messages'); return; }
    fetchListingDetails(listingId).then((listing) => {
      if (!listing) throw new Error('This listing is no longer available.');
      params.delete('chat_listing');
      params.delete('chat_intent');
      params.delete('chat_draft');
      const nextQuery = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
      return openChat(listing, chatIntent, chatDraft);
    }).catch((error) => showToast(error.message || 'Could not open the business message.'));
  }, [sessionUser]);

  const retryStartup = () => {
    setStartupReady(false);
    setStartupError('');
    window.location.reload();
  };
  if (!startupReady) return <SplashScreen message={startupError || 'Connecting to Bese26…'} error={Boolean(startupError)} onRetry={retryStartup} />;
  if (platformSettings.maintenance_mode && !canAccessAdmin && privateAdminEntry) return <div className="maintenance-screen maintenance-auth-screen"><AuthPanel reason="Owner or delegated admin access" onClose={() => { window.history.replaceState({}, '', window.location.pathname); window.location.reload(); }} onAuthenticated={(nextUser) => { setSessionUser(nextUser); setAuthReason(''); setActiveNav('admin'); window.history.replaceState({}, '', `${window.location.pathname}?admin=login`); showToast('Signed in to Bese26.'); }} /></div>;
  if (platformSettings.maintenance_mode && !canAccessAdmin) return <div className="maintenance-screen"><div className="maintenance-card"><div className="maintenance-icon-wrap"><ShieldCheck size={30} /></div><div className="eyebrow">BESE26 MARKETPLACE</div><h1>{t('We’ll be back shortly')}</h1><p>{platformSettings.maintenance_message || t('Bese26 is temporarily unavailable while we make improvements.')}</p><small>{t('Thank you for your patience.', 'Thank you for your patience.')}</small><div className="maintenance-animation" aria-label="A cheetah running while maintenance is in progress"><span className="maintenance-cloud cloud-one" /><span className="maintenance-cloud cloud-two" /><span className="maintenance-animal" role="img" aria-label="Running cheetah">🐆</span><span className="maintenance-track" /><span className="maintenance-progress" /></div><div className="maintenance-status"><span className="maintenance-pulse" /> Maintenance in progress</div></div></div>;

  const renderView = () => {
    if (activeNav.startsWith('public-')) return <PublicInfoPage page={activeNav.slice(7)} onBack={goBack} />;
    if (activeNav === 'home') return <HomeView user={sessionUser} trendingScores={trendingScores} marketLoading={marketLoading} adCampaigns={adCampaigns} marketListings={nearbyListings} userPlace={userPlace} locationBusy={locationBusy} onUseLocation={useMyLocation} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} onOpenProfilePage={openNotificationProfilePage} onLanguageChange={changeLocale} />;
    if (activeNav === 'search') return <SearchView adCampaigns={adCampaigns} marketLoading={marketLoading} marketListings={marketListings} categories={marketCategories} search={search} setSearch={setSearch} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={goBack} />;
    if (activeNav === 'notifications') return <NotificationsView user={sessionUser} onAuthRequired={() => requireAuth('Login to view notifications.')} onBack={goBack} onNotice={showToast} onNavigate={navigate} onOpenListing={openListing} onOpenConversation={openNotificationConversation} onOpenPublicProfile={openNotificationPublicProfile} onOpenProfilePage={openNotificationProfilePage} browserNotificationPermission={browserNotificationPermission} onEnableBrowserNotifications={enableBrowserNotifications} />;
    if (activeNav === 'saved') return <SavedView marketListings={marketListings} savedIds={savedIds} onOpenListing={openListing} onToggleSave={toggleSave} />;
    if (activeNav === 'wallet') return <UnavailableView icon={WalletCards} eyebrow="WALLET" title="Wallet is coming soon" description="Wallet, payments, and transactions are not connected yet. No balance or transaction data is shown until the real service is ready." onBack={goBack} />;
    if (activeNav === 'subscription') return <SubscriptionView user={sessionUser} onBack={goBack} onAuthRequired={() => requireAuth('Sign in to view your seller plan.')} onDemoAction={showToast} />;
    if (activeNav === 'analytics') return <ProfileView key={`analytics-${profileReset}`} user={sessionUser} initialPage="analytics" onInitialPageConsumed={() => {}} onAuthRequired={() => requireAuth('Sign in to view your dashboard.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={openSell} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'analytics'} isAdmin={canAccessAdmin} onOpenAdmin={() => navigate('admin')} onOpenSubscription={() => navigate('subscription')} />;
    if (activeNav === 'business') return <OwnerMiniwebDashboard user={sessionUser} onBack={goBack} onNavigate={navigate} onOpenSubscription={() => navigate('subscription')} onNotice={showToast} />;
    if (activeNav === 'sell') return <SellView key={`sell-${editingListing?.id || editingDraft?.id || copySourceListing?.id || 'new'}`} user={sessionUser} isAdmin={canAccessAdmin} initialListing={editingListing} initialDraft={editingDraft} copySource={copySourceListing} onAuthRequired={() => requireAuth('Sign in before posting a listing.')} onDemoAction={showToast} onNavigate={navigate} onOpenSubscription={() => navigate('subscription')} />;
    if (activeNav === 'messages') return <MessagesView user={sessionUser} liveListing={chatListing} onOpenListing={openListing} onDemoAction={showToast} onAuthRequired={(message) => requireAuth(message)} initialMessageId={chatTargetId} initialNotificationTarget={chatNotificationTarget} initialDealPanel={chatDealPanel} initialText={chatDraft} onSelectConversation={(conversation) => { setChatTargetId(conversation.id); setChatListing(null); setChatDealPanel(''); setChatNotificationTarget(null); }} onBackToInbox={() => { setChatTargetId(null); setChatDealPanel(''); setChatNotificationTarget(null); }} />;
    if (activeNav === 'admin') return canAccessAdmin ? <AdminView user={sessionUser} adminPermissions={adminPermissions} isOwnerAdmin={isOwnerAdmin} onBack={goBack} onNotice={showToast} onCreateListing={() => { setEditingDraft(null); setEditingListing(null); setCopySourceListing(null); navigate('sell'); }} /> : <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={openSell} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={false} onOpenAdmin={() => {}} onOpenSubscription={() => navigate('subscription')} />;
    return <ProfileView key={profileReset} user={sessionUser} initialPage={profilePageTarget} onInitialPageConsumed={consumeProfilePageTarget} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={openSell} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={canAccessAdmin} onOpenAdmin={() => navigate('admin')} onOpenSubscription={() => navigate('subscription')} />;
  };

  // Keep primary navigation on top-level destinations, not focused workflows.
  const showPrimaryBottomNav = !selectedListing && !showAuth && !chatTargetId &&
    ['home', 'notifications', 'saved', 'messages', 'analytics', 'profile'].includes(activeNav) &&
    !(activeNav === 'profile' && profilePageTarget && profilePageTarget !== 'main');

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`} data-release="comments-v2">
    <main className="main-container"><AppErrorBoundary key={activeNav}><Suspense fallback={<BrandLoader message="Loading page…" compact />}>{renderView()}</Suspense></AppErrorBoundary></main>
    <footer className="site-footer"><div><strong>Bese26<span>.shop</span></strong><p>{t('Nigerian online marketplace for buying and selling.')}</p></div><nav aria-label="Public information"><a href="/#terms" onClick={(event) => { event.preventDefault(); goPublicSection('terms'); }} title="Read Terms of Service">{t('Terms')}</a><a href="/#privacy" onClick={(event) => { event.preventDefault(); goPublicSection('privacy'); }} title="Read Privacy Policy">{t('Privacy')}</a><a href="/#refund-policy" onClick={(event) => { event.preventDefault(); goPublicSection('refund-policy'); }} title="Read Refund Policy">{t('Refunds')}</a><a href="/#safety" onClick={(event) => { event.preventDefault(); goPublicSection('safety'); }} title="Read Marketplace Safety">{t('Safety')}</a><a href="mailto:info@bese26.shop?subject=Bese26%20Support" title="Email Bese26 support">info@bese26.shop</a></nav></footer>
    {showPrimaryBottomNav && <nav className="bottom-nav" aria-label="Primary navigation">{mobileNavItems.map(({ key, label, icon: Icon }) => <button key={key} aria-current={activeNav === key ? 'page' : undefined} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => key === 'sell' ? openSell() : navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} />{key === 'notifications' && unreadNotifications > 0 && <b className="bottom-nav-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</b>}</span><span>{t(label)}</span></button>)}</nav>}

    {showAuth && <AuthPanel reason={authReason} initialMode={authInitialMode} onClose={() => { setAuthTarget(''); setShowAuth(false); }} onAuthenticated={(user) => { setSessionUser(user); setAuthInitialMode('signin'); setAuthReason(''); showToast('Signed in to bese26.'); }} />}
    {selectedListing && <Suspense fallback={<BrandLoader message="Loading listing…" compact />}><ListingDetailsView listing={selectedListing} user={sessionUser} activeBusiness={businessOwnerProfile} focusSection={listingFocusTarget?.section || null} focusCommentId={listingFocusTarget?.commentId || null} onClose={() => { setListingFocusTarget(null); window.history.back(); }} onAuthRequired={requireAuth} isSaved={savedIds.includes(selectedListing.id)} savedIds={savedIds} onToggleSave={toggleSave} onDemoAction={showToast} onStartChat={openChat} onOpenListing={openListing} onEditListing={(item) => { setSelectedListing(null); setCopySourceListing(null); setEditingListing(item); navigate('sell'); }} onCopyListing={openSell} /></Suspense>}
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    {paymentVerifying && <div className="payment-verifying-overlay"><BrandLoader message="Verifying your Bese26 payment…" /></div>}
    <InstallPrompt />
  </div>;
}


export default function App() {
  return <I18nProvider><AppErrorBoundary><ConnectionScreen><AppContent /></ConnectionScreen></AppErrorBoundary></I18nProvider>;
}
