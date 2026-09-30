import { SITE_URL } from './lib/site';
import { Component, lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
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
  Image as ImageIcon,
  Laptop,
  Mic,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Phone,
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
import { initAnalytics, trackEvent, trackPageView } from './lib/analytics';
import { getAvatarUrl, getOptimizedPublicImageUrl, isSupabaseConfigured, supabase } from './lib/supabase';
import { getBusinessLogoDisplayUrl, handleBusinessLogoLoad, isOfficialBese26Business } from './lib/businessLogoFit';
import { getPublicIdentity } from './lib/identity';
import { resolveNotificationDestination } from './lib/notificationDestinations';
import { I18nProvider, useI18n } from './lib/i18n';
import { createChatMeeting, createChatOffer, deleteListing, fetchActiveListings, fetchActiveAdCampaigns, fetchNotifications, markNotificationRead, fetchBusinessDirectory, fetchCategories, fetchConversationDeals, fetchPublicBusiness, fetchPublicProfile, fetchPublicSellerViews, fetchSavedIds, fetchConversations, fetchMessages, fetchListingDetails, fetchListingReviews, fetchListingComments, submitListingReview, submitListingComment, fetchSellerReviews, fetchListingContact, fetchSellerEntitlement, fetchMyListings, fetchMyBoosts, fetchSimilarListings, fetchSellerListings, fetchProfileRelations, fetchFollowSummary, getBusinessProfile, getFollowState, getOrCreateConversation, isAdminUser, blockUser, recordListingView, recordRecentlyViewed, reportListing, sendMessage, setListingStatus, signOut, startPaystackCheckout, subscribeToMessages, subscribeToNotifications, toggleFavorite, toggleFollow, updateChatMeeting, updateChatOffer, updateListing, uploadChatMedia, verifyPaystackPayment } from './lib/marketplace';
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
  return <div className="miniweb-loading-screen" role="status" aria-label="Loading Bese26 shop">
    <div className="miniweb-loading-orbit" aria-hidden="true">
      <span className="miniweb-loading-ring ring-one" />
      <span className="miniweb-loading-ring ring-two" />
      <span className="miniweb-loading-spark spark-one" />
      <span className="miniweb-loading-spark spark-two" />
      <img src="/images/bese26-logo-icon.webp" alt="" />
    </div>
    <div className="miniweb-loading-brand">Bese26<span>.shop</span></div>
    <strong>Opening this shop</strong>
    <p>Getting the store and latest listings ready…</p>
    <span className="miniweb-loading-dots" aria-hidden="true"><i /><i /><i /></span>
  </div>;
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
  { key: 'business', label: 'Shop', icon: Store },
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
        <div className="listing-card-badges">{featured && <span className="featured-pill"><Star size={11} fill="currentColor" /> FEATURED</span>}{listing.promoted && <span className="promoted-pill"><Sparkles size={12} /> BOOSTED</span>}{isNew && <span className="fresh-pill">NEW</span>}{isTopRated && <span className="trust-pill"><BadgeCheck size={11} /> TOP RATED</span>}</div>
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

function NotificationsView({ user, onAuthRequired, onBack, onNotice, onNavigate, onOpenListing, onOpenConversation, onOpenPublicProfile, onOpenProfilePage }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(Boolean(user)); const [expanded, setExpanded] = useState({});
  useEffect(() => { let mounted = true; if (!user) { setLoading(false); return undefined; } fetchNotifications(user.id).then((rows) => { if (mounted) setItems(rows || []); }).catch((error) => mounted && onNotice?.(error.message || 'Could not load notifications.')).finally(() => mounted && setLoading(false)); const unsubscribe = subscribeToNotifications(user.id, (payload) => { if (!mounted || !payload?.new) return; fetchNotifications(user.id).then((rows) => mounted && setItems(rows || [])).catch(() => {}); }); return () => { mounted = false; unsubscribe?.(); }; }, [user, onNotice]);
  const unreadCount = items.filter((item) => !item.read_at).length;
  const markAllAsRead = async () => { const unread = items.filter((item) => !item.read_at); await Promise.all(unread.map((item) => markNotificationRead(item.id, user.id).catch(() => null))); setItems((current) => current.map((item) => item.read_at ? item : { ...item, read_at: new Date().toISOString() })); };
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
  const verificationFor = (item) => { if (isAdminNotification(item) || (!item.actor_id && !identityBusiness(item))) return <span className="notification-admin-mark" aria-label="Official Bese26 notification"><ShieldCheck size={14} /></span>; const business = identityBusiness(item); const idVerified = !business && isCurrent(item.actor || {}); const cacVerified = Boolean(business && isCurrent(business)); if (idVerified || cacVerified) return <VerificationBadges idVerified={idVerified} cacVerified={cacVerified} compact />; return null; };
  const senderName = (item) => isAdminNotification(item) ? 'Bese26' : notificationIdentity(item).name;
  const senderImage = (item) => isAdminNotification(item) && !item.data?.listing_id ? '/images/bese26-logo-icon.webp' : item.data?.listing_id && item.listing?.image_url ? item.listing.image_url : notificationIdentity(item).image || '/images/bese26-logo-icon.webp';
  const senderIsBusinessLogo = (item) => Boolean(!isAdminNotification(item) && notificationIdentity(item).hasBusinessLogo && !(item.data?.listing_id && item.listing?.image_url));
  const messageFor = (item) => item.body || item.title || 'You have a new Bese26 update.';
  const today = new Date().toDateString();
  const grouped = [{ label: 'New', rows: items.filter((item) => new Date(item.created_at || 0).toDateString() === today) }, { label: 'Earlier', rows: items.filter((item) => new Date(item.created_at || 0).toDateString() !== today) }].filter((group) => group.rows.length);
  const renderRow = (item) => { const message = messageFor(item); const businessLogo = senderIsBusinessLogo(item); const isExpanded = Boolean(expanded[item.id]); const isLong = message.length > 150; const displayMessage = !isExpanded && isLong ? `${message.slice(0, 150).trimEnd()}…` : message; return <article className={`notification-feed-row ${item.read_at ? 'is-read' : 'is-unread'}`} key={item.id} role="button" tabIndex={0} onClick={() => open(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(item); } }}><div className={`notification-feed-media ${businessLogo ? 'is-business-logo' : ''}`}><img src={senderImage(item)} alt="" onLoad={businessLogo ? handleBusinessLogoLoad : undefined} onError={(event) => { event.currentTarget.src = '/images/bese26-logo-icon.webp'; }} /></div><div className="notification-feed-content"><div className="notification-feed-heading"><strong>{senderName(item)}</strong>{verificationFor(item)}</div><p>{displayMessage}</p><div className="notification-feed-meta"><time>{relativeTime(item.created_at)}</time>{isLong && <button type="button" className="notification-more" onClick={(event) => { event.stopPropagation(); setExpanded((current) => ({ ...current, [item.id]: !isExpanded })); }}>{isExpanded ? 'Less' : 'More'}</button>}</div></div>{!item.read_at && <span className="notification-unread-dot" aria-label="Unread" />}</article>; };
  if (!user) return <div className="page-stack notifications-page"><section className="notifications-empty"><Bell size={30} /><div className="eyebrow">YOUR NOTIFICATIONS</div><h1>Stay up to date</h1><p>Sign in to see listing updates, messages, offers, and safety alerts.</p><button className="primary-button" onClick={onAuthRequired}>Login to continue</button><button className="text-action" onClick={onBack}>Back to Home</button></section></div>;
  return <div className="page-stack notifications-page notification-center"><header className="notification-center-header"><div><h1>Notifications</h1><p>Updates about your listings, messages and account.</p></div><div className="notification-header-actions"><div className="notification-header-icon" aria-label={`${unreadCount} unread notifications`}><Bell size={21} />{unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}</div>{unreadCount > 0 && <button type="button" className="notification-mark-all" onClick={markAllAsRead}>Mark all as read</button>}</div></header>{loading ? <BrandLoader message="Loading your notifications…" compact /> : grouped.length ? <div className="notification-feed">{grouped.map((group) => <section className="notification-feed-group" key={group.label}><h2>{group.label}</h2>{group.rows.map(renderRow)}</section>)}</div> : <div className="notifications-empty compact"><Bell size={26} /><h2>No notifications yet</h2><p>New messages, listing updates, and account alerts will appear here.</p></div>}</div>;
}
const subscriptionPlans = [
  { key: 'free', name: 'Free', price: 0, cadence: 'forever', summary: 'For anyone starting to sell.', highlight: '3 active listings included', features: ['3 active marketplace listings', 'Basic seller profile', 'Bese26 chat with buyers', 'Saved items and seller following', 'Listing review before publishing', 'Edit, pause, resume and mark as sold', 'Personal public profile link'], tone: 'free' },
  { key: 'basic', name: 'Basic', price: 2500, cadence: 'month', summary: 'For a growing local seller.', highlight: '15 active listings', features: ['Everything in Free', '15 active listings', 'Basic seller analytics', 'Listing management tools', 'Saved searches', 'Standard seller support', 'Personal or business publishing identity', 'Public seller or business link'], tone: 'basic' },
  { key: 'premium', name: 'Premium', price: 4500, cadence: 'month', summary: 'For sellers with regular stock.', highlight: '35 active listings · verification eligible', features: ['Everything in Basic', '35 active listings', 'Advanced seller analytics', 'Detailed seller dashboard', 'Identity verification request, subject to review', 'Verified badge after approval while active', '5 free boost credits every month', 'Business profile tools', 'Priority support', 'Advanced listing organization'], tone: 'premium', popular: true },
  { key: 'business', name: 'Business', price: 7000, cadence: 'month', summary: 'For professional businesses.', highlight: '60 active listings · verification eligible', features: ['Everything in Premium', '60 active listings', 'Professional business storefront', 'Business name, logo and branding', 'Business handle and shareable link', 'Business verification request, subject to review', 'Verified badge after approval while active', '10 free boost credits every month', 'Business profile management', 'Promotional tools and priority business support'], tone: 'business' },
];



function SubscriptionPlanCard({ plan, expanded, onToggle, onChoose, currentPlan, busyPlan }) {
  const isCurrent = currentPlan === plan.key;
  return <article className={`subscription-plan-card ${plan.tone} ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}><div className="subscription-plan-top"><span className="subscription-plan-badge">{plan.popular ? 'MOST POPULAR' : plan.key === 'free' ? 'START HERE' : plan.name.toUpperCase()}</span>{isCurrent && <span className="current-plan-pill">Your plan</span>}</div><h3>{plan.name}</h3><p className="subscription-plan-summary">{plan.summary}</p><div className="subscription-plan-price">{plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : formatNaira(plan.price)}<small>{plan.price === null ? ' pricing' : ` / ${plan.cadence}`}</small></div><strong className="subscription-plan-highlight"><Check size={15} /> {plan.highlight}</strong><div className="subscription-plan-actions"><button type="button" className={plan.key === 'free' ? 'secondary-button' : 'primary-button'} onClick={() => onChoose(plan)} disabled={isCurrent || busyPlan === plan.key}>{isCurrent ? 'Current plan' : busyPlan === plan.key ? 'Opening…' : plan.key === 'free' ? 'Use Free plan' : plan.price === null ? 'Contact for plan' : 'Choose plan'} {busyPlan === plan.key ? null : <ArrowRight size={15} />}</button></div><button type="button" className="subscription-more-button" aria-expanded={expanded} aria-controls={`plan-features-${plan.key}`} onClick={() => onToggle(plan.key)}><span>{expanded ? 'Less' : 'More'}</span><ChevronDown size={15} className={expanded ? 'rotate-180' : ''} /></button><div id={`plan-features-${plan.key}`} className={`subscription-features ${expanded ? 'is-expanded' : ''}`}><div className="eyebrow">WHAT YOU GET</div><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}</ul></div></article>;
}

function SubscriptionView({ user, onBack, onAuthRequired, onDemoAction }) {
  const [expanded, setExpanded] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [busyPlan, setBusyPlan] = useState('');
  useEffect(() => { let mounted = true; if (!user) { setEntitlement(null); return undefined; } fetchSellerEntitlement().then((data) => mounted && setEntitlement(data)).catch(() => {}); return () => { mounted = false; }; }, [user]);
  const choose = async (plan) => { if (plan.key === 'free') { onDemoAction('The Free plan includes 3 active listings.'); return; } if (plan.price === null) { onDemoAction('Enterprise Lux needs a custom business quote.'); return; } if (!user) { onAuthRequired?.(); return; } trackEvent('begin_checkout', { plan_name: plan.key, value: plan.price, currency: 'NGN' }); setBusyPlan(plan.key); try { const checkout = await startPaystackCheckout(plan.key); if (!checkout.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(checkout.authorization_url); } catch (error) { onDemoAction(error.message || 'Could not start Paystack checkout.'); setBusyPlan(''); } };
  return <div className="page-stack subscription-page"><div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Payments & services</span></div><section className="subscription-hero"><div><div className="eyebrow light">BESE26 SELLER PLANS</div><h1>Grow when your business is ready.</h1><p>Start free with 3 active listings, then upgrade when you need more capacity, tools, verification eligibility, or visibility credits.</p></div><span className="subscription-hero-mark"><Sparkles size={22} /></span></section>{user && entitlement && <section className="subscription-usage"><div><div className="eyebrow">YOUR CURRENT ACCESS</div><strong>{entitlement.is_paid ? `${entitlement.plan_key} plan` : 'Free plan'}</strong><span>{`${entitlement.free_posts_used || 0} of ${entitlement.listing_limit} listing slots used · ${Math.max((entitlement.listing_limit || 3) - (entitlement.free_posts_used || 0), 0)} remaining`}</span></div><div className="subscription-usage-track"><span style={{ width: `${entitlement.is_paid ? 100 : Math.max(0, (entitlement.free_posts_remaining / entitlement.free_posts_limit) * 100)}%` }} /></div></section>}<div className="subscription-section-heading"><div><div className="eyebrow">SIMPLE START</div><h2>Choose the right level</h2></div><span>Monthly · prices match Paystack</span></div><div className="subscription-payment-note"><ShieldCheck size={16} /><span><strong>Secure monthly payment</strong><small>Checkout opens in Paystack. Bese26 activates access only after the payment is verified.</small></span><b>NGN</b></div><div className="subscription-plan-grid">{subscriptionPlans.map((plan) => <SubscriptionPlanCard plan={plan} key={plan.key} expanded={expanded === plan.key} onToggle={setExpanded} onChoose={choose} currentPlan={entitlement?.is_paid ? entitlement.plan_key : 'free'} busyPlan={busyPlan} />)}</div><p className="subscription-disclaimer"><ShieldCheck size={15} /> Plan access, verification eligibility, and boost credits remain active while the subscription is active. Verification is subject to review and approval. Boosts increase visibility but do not guarantee sales or buyers. Paystack verifies the payment reference, amount, and currency before access is granted.</p></div>;
}

const publicInfoPages = {
  terms: { eyebrow: 'LEGAL', title: 'Terms of Service', icon: ShieldCheck, intro: 'The rules that keep Bese26 fair, useful, and safe for buyers and sellers.', sections: [['Use Bese26 lawfully', 'Provide accurate account, listing, pricing, and business information. Do not use the marketplace for fraud, harassment, impersonation, or prohibited transactions.'], ['Respect other members', 'Keep conversations respectful and use Bese26 messaging when discussing a listing. Do not request passwords, secret keys, or unnecessary identity documents from other members.'], ['Listings and moderation', 'Listings may be reviewed before publication. Bese26 may pause, reject, or remove content that violates marketplace rules or creates a safety risk.'], ['Plans and payments', 'Paid plans and boosts become active only after the payment provider confirms the payment reference, amount, and currency.'] ] },
  privacy: { eyebrow: 'LEGAL', title: 'Privacy Policy', icon: ShieldCheck, intro: 'How Bese26 uses account and marketplace information to provide its services.', sections: [['Information we use', 'Bese26 uses account details, profile information, listing data, messages, and business details to operate the marketplace and provide seller tools.'], ['Private documents', 'Verification documents are kept in private storage and are not displayed on public profiles, listings, storefronts, or search pages.'], ['Safety and moderation', 'Information may be used to investigate reports, protect members, review listings, and prevent abuse. Access is limited to authorized workflows.'], ['Your choices', 'You can update profile and business details, manage communication preferences, and contact support about an account or privacy concern.'] ] },
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
function SponsoredBanner({ campaigns = [], placement, className = '' }) {
  const campaign = campaigns.find((item) => item.placement === placement && item.image_url);
  if (!campaign) return null;
  const linked = Boolean(campaign.cta_target?.trim());
  const open = () => linked && window.location.assign(campaign.cta_target);
  const image = <img src={getOptimizedPublicImageUrl(campaign.image_url, { width: 960 })} alt={campaign.title || 'Sponsored promotion'} loading="lazy" decoding="async" />;
  return <section className={`sponsored-placement ${className}`} aria-label="Sponsored promotion"><div className="sponsored-placement-label"><span>SPONSORED</span><small>Advertisement</small></div>{linked ? <button type="button" className="sponsored-placement-art linked" onClick={open} aria-label={campaign.title || 'Open sponsored promotion'}>{image}</button> : <div className="sponsored-placement-art" aria-label="Sponsored promotion">{image}</div>}</section>;
}

function HomeView({ user, marketListings, marketLoading = false, adCampaigns = [], userPlace = '', locationBusy = false, onUseLocation, onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
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
  const advertisingSlides = adCampaigns.filter((campaign) => campaign.placement === 'home_banner').map((campaign) => ({ type: 'ad', image_only: Boolean(campaign.image_only), creative_width: 1600, creative_height: 500, eyebrow: 'SPONSORED', title: campaign.title, body: campaign.body, action: campaign.cta_label || 'Learn more', image_url: getOptimizedPublicImageUrl(campaign.image_url, { width: 1024 }), onAction: () => { if (campaign.cta_target?.startsWith('http')) window.location.assign(campaign.cta_target); else onNavigate(campaign.cta_target === '/business' ? 'business' : campaign.cta_target === '/sell' ? 'sell' : 'profile'); } }));
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const promoSlides = [{ type: 'dashboard', key: 'dashboard' }, ...advertisingSlides];
  const [promoIndex, setPromoIndex] = useState(0);
  const [homeSearch, setHomeSearch] = useState('');
  useEffect(() => { setPromoIndex(0); }, [user?.id, adCampaigns.length]);
  useEffect(() => { if (promoSlides.length < 2) return undefined; const timer = window.setInterval(() => setPromoIndex((current) => (current + 1) % promoSlides.length), 6000); return () => window.clearInterval(timer); }, [promoSlides.length]);
  const promo = promoSlides[promoIndex];
  const featuredListings = useMemo(() => {
    const seen = new Set();
    return marketListings.filter((listing) => {
      const key = String(listing.title || listing.id || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 50);
  }, [marketListings]);
  return (
    <div className="page-stack home-page">
      {promo && <section className={`home-ad-banner ${promo.type === 'dashboard' ? 'home-ad-dashboard dashboard-welcome-card' : `home-ad-slide-${promoIndex}`}`} aria-label={promo.type === 'dashboard' ? 'Your Bese26 dashboard' : 'Sponsored promotion'}>
        {promo.type === 'dashboard' ? <><div className="dashboard-welcome-copy"><div className="eyebrow">{user ? 'YOUR BESE26 DASHBOARD' : 'WELCOME TO BESE26'}</div><h1>{user ? <>Good to see you, <span>{displayName}</span>.</> : <>Buy and sell with confidence.</>}</h1><p>{user ? 'Pick up where you left off and keep your marketplace moving.' : 'Browse trusted listings or start selling in a few simple steps.'}</p><div className="dashboard-actions"><button type="button" className="dashboard-primary-action" onClick={() => onNavigate(user ? 'sell' : 'search')}><Plus size={15} /> {user ? 'List an item' : 'Browse listings'}</button><button type="button" className="dashboard-secondary-action" onClick={() => onNavigate(user ? 'profile' : 'sell')}>{user ? 'View profile' : 'Start selling'} <ArrowRight size={15} /></button></div></div><div className="dashboard-orbit-art" aria-hidden="true"><span className="dashboard-orbit dashboard-orbit-one" /><span className="dashboard-orbit dashboard-orbit-two" /><img src="/images/bese26-logo-icon.webp" alt="" /></div></> : promo.image_only ? promo.cta_target?.trim() ? <button type="button" className="home-ad-image-only" onClick={promo.onAction} aria-label={promo.title}><img src={promo.image_url} alt={promo.title} /></button> : <div className="home-ad-image-only" aria-label={promo.title}><img src={promo.image_url} alt={promo.title} /></div> : <><div className="home-ad-copy"><div className="eyebrow light">{promo.eyebrow} <span className="home-ad-sponsored">Sponsored space</span></div><h2>{promo.title}</h2><p>{promo.body}</p><button type="button" className="home-ad-cta" onClick={promo.onAction}>{promo.action} <ArrowRight size={15} /></button></div><div className={`home-ad-art ${promo.type === 'ad' ? 'home-ad-art-clickable' : ''}`} aria-hidden={promo.type !== 'ad'} onClick={promo.type === 'ad' ? promo.onAction : undefined} role={promo.type === 'ad' ? 'link' : undefined} tabIndex={promo.type === 'ad' ? 0 : undefined} onKeyDown={promo.type === 'ad' ? (event) => { if (event.key === 'Enter' || event.key === ' ') promo.onAction(); } : undefined}><img src={promo.image_url || "/images/bese26-official-logo.png"} alt={promo.type === 'ad' ? `${promo.title} advertisement` : ''} /></div></>}
        <div className="home-ad-dots" aria-label="Promotion slides">{promoSlides.map((slide, index) => <button type="button" key={slide.key || `${slide.eyebrow}-${index}`} className={index === promoIndex ? 'active' : ''} onClick={() => setPromoIndex(index)} aria-label={`Show promotion ${index + 1}`} />)}</div>
      </section>}

      <section className="search-section">
        <div className="search-box home-search" role="search">
          <Search size={18} />
          <input aria-label="Search listings" value={homeSearch} onChange={(event) => setHomeSearch(event.target.value)} placeholder="Search for products, services and more" onKeyDown={(event) => event.key === 'Enter' && onSearch(homeSearch)} />
          <button className="search-submit" aria-label="Search" onClick={() => onSearch(homeSearch)}><Search size={20} /></button>
        </div>
        <button type="button" className="location-picker-trigger" onClick={() => setLocationPickerOpen((open) => !open)} aria-expanded={locationPickerOpen} aria-controls="home-location-picker"><MapPin size={14} /><span>{selectedLga || (userPlace ? `Near ${userPlace}` : 'Choose location')}</span><ChevronDown size={14} className={locationPickerOpen ? 'is-open' : ''} /></button>
        {locationPickerOpen && <div id="home-location-picker" className="home-location-picker" aria-label="Choose listing location">
          <label><span>Country</span><select value="NG" disabled><option value="NG">Nigeria</option></select></label>
          <label><span>State</span><select value={selectedState} onChange={(event) => { setSelectedState(event.target.value); setSelectedLga(''); }} disabled={!geo}><option value="">{geo ? 'Select state' : 'Loading states…'}</option>{states.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}</select></label>
          <label><span>Local government</span><select value={selectedLga} onChange={(event) => setSelectedLga(event.target.value)} disabled={!selectedState}><option value="">Select local government</option>{localGovernments.map((lga) => <option key={lga.name} value={lga.name}>{lga.name}</option>)}</select></label>
          <button type="button" className="home-location-search" onClick={findByLocation} disabled={!selectedState || !selectedLga}><Search size={16} /> Find listings</button>
        </div>}
      </section>
      <section className="popular-categories"><SectionHeading eyebrow="CHOOSE A CATEGORY" title="What are you looking for?" action="View all" onAction={() => onSearch('')} /><div className="popular-category-rail">{[['Phones', Smartphone, 'tone-lavender'], ['Cars', CarFront, 'tone-blue'], ['Property', Building2, 'tone-sand'], ['Fashion', Shirt, 'tone-pink'], ['Agriculture', Wheat, 'tone-green'], ['Services', BriefcaseBusiness, 'tone-peach'], ['Food', UtensilsCrossed, 'tone-gold'], ['Businesses', Store, 'tone-coral']].map(([label, Icon, tone]) => <button type="button" className={`popular-category ${tone}`} key={label} onClick={() => onSearch(label)} aria-label={`Browse ${label}`}><span><Icon size={20} strokeWidth={2.1} /></span><strong>{label}</strong></button>)}</div></section>

      <section className="home-featured-section">
        <div className="home-featured-heading"><div><div className="eyebrow">CURATED FOR YOU</div><h2>Featured listings</h2></div><span>{featuredListings.length ? `${featuredListings.length} fresh picks` : 'New picks appear here'}</span></div>
        {marketLoading && !marketListings.length ? <><div className="loading-section-note"><span className="loading-pulse-dot" /> Loading the newest listings…</div><ListingGridSkeleton count={6} /></> : featuredListings.length ? <><div className="product-grid home-featured-grid">{featuredListings.map((listing, index) => <ProductCard key={listing.id} listing={listing} featured={index < 4} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div><button type="button" className="home-view-all-button" onClick={() => onNavigate('search')}>View all listings <ArrowRight size={16} /></button></> : <div className="empty-state"><Package size={25} /><h3>No live listings yet</h3><p>Be one of the first sellers to add a product. New listings appear here after review.</p><div className="empty-state-actions"><button className="primary-button" onClick={() => onNavigate('sell')}><Plus size={15} /> List an item</button><button className="secondary-button" onClick={() => onNavigate('business')}><Store size={15} /> Explore businesses</button></div></div>}
      </section>

      <section className="trust-strip" aria-label="Why use Bese26">
        <div className="trust-strip-item"><span className="trust-strip-icon"><ShieldCheck size={16} /></span><span><strong>Verified sellers</strong><small>Check seller badges before you chat</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-blue"><MessageCircle size={16} /></span><span><strong>Chat to buy</strong><small>Ask questions before meeting</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-gold"><MapPin size={16} /></span><span><strong>Find nearby</strong><small>Discover listings by location</small></span></div>
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
    let result = marketListings.filter((listing) => !term || `${listing.title} ${listing.description || ''} ${listing.location} ${listing.category} ${listing.sellerDisplayName || listing.seller}`.toLowerCase().includes(term));
    if (activeCategory !== 'All') result = result.filter((listing) => listing.category === activeCategory);
    if (verifiedOnly) result = result.filter((listing) => listing.verified === true);
    if (sort === 'Recommended') result = [...result].sort((a, b) => Number(Boolean(b.promoted)) - Number(Boolean(a.promoted)));
    if (sort === 'Newest') result = [...result].sort((a, b) => new Date(b.raw?.created_at || b.created_at || 0) - new Date(a.raw?.created_at || a.created_at || 0));
    if (sort === 'Price low → high') result = [...result].sort((a, b) => a.numericPrice - b.numericPrice);
    if (sort === 'Price high → low') result = [...result].sort((a, b) => b.numericPrice - a.numericPrice);
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



function MessagesView({ user, liveListing, onDemoAction, onAuthRequired, onOpenListing, initialMessageId, initialNotificationTarget = null, initialDealPanel = '', initialText = '', onSelectConversation, onBackToInbox }) {
  const [conversations, setConversations] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [text, setText] = useState(initialText || '');
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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState({});
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const emojis = ['😀', '😂', '😍', '🥰', '👍', '❤️', '✅', '👏', '🔥', '😮', '🙏', '🎉'];
  const selectedConversation = conversations.find((conversation) => conversation.id === initialMessageId) || null;
  const liveMode = Boolean(isSupabaseConfigured && user && selectedConversation);
  const isSeller = Boolean(selectedConversation?.seller_id === user?.id);
  const conversationIdentity = (conversation) => { const profile = conversation?.buyer_id === user?.id ? conversation?.seller : conversation?.buyer; return { profile, ...getPublicIdentity(profile || {}) }; };

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
    fetchMessages(selectedConversation.id).then((items) => { if (mounted) setLiveMessages(items); }).catch((error) => onDemoAction(error.message || 'Could not load messages.')).finally(() => mounted && setLiveLoading(false));
    fetchConversationDeals(selectedConversation.id).then((items) => mounted && setDeals(items)).catch((error) => onDemoAction(error.message || 'Deal tools need the latest Bese26 database migration.'));
    const unsubscribe = subscribeToMessages(selectedConversation.id, (incoming) => setLiveMessages((items) => items.some((item) => item.id === incoming.id) ? items : [...items, incoming]));
    return () => { mounted = false; unsubscribe(); };
  }, [selectedConversation?.id, liveMode, onDemoAction]);
  useEffect(() => { setDealPanel(initialDealPanel || ''); }, [initialMessageId, initialDealPanel]);
  useEffect(() => { setText(initialText || ''); }, [initialMessageId, initialText]);
  useEffect(() => {
    if (!liveMode || liveLoading || !initialNotificationTarget) return undefined;
    let targetElement = null;
    if (initialNotificationTarget.kind === 'offer' && initialNotificationTarget.offerId) {
      targetElement = document.getElementById(`chat-offer-${initialNotificationTarget.offerId}`);
    } else if (initialNotificationTarget.kind === 'message' && initialNotificationTarget.messageId) {
      targetElement = document.getElementById(`chat-message-${initialNotificationTarget.messageId}`);
    } else if (initialNotificationTarget.kind === 'message' && liveMessages.length) {
      targetElement = document.querySelector('.chat-messages .message-bubble:last-child');
    }
    if (!targetElement) return undefined;
    const frame = window.requestAnimationFrame(() => targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => window.cancelAnimationFrame(frame);
  }, [liveMode, liveLoading, initialNotificationTarget?.kind, initialNotificationTarget?.offerId, initialNotificationTarget?.messageId, liveMessages.length, deals.offers.length]);

  const send = async (message = text, file = attachment) => {
    if ((!message.trim() && !file) || !liveMode || mediaBusy) return;
    setMediaBusy(Boolean(file));
    try {
      const uploaded = file ? await uploadChatMedia({ userId: user.id, conversationId: selectedConversation.id, file }) : null;
      const sent = await sendMessage({ conversationId: selectedConversation.id, senderId: user.id, body: message.trim() || null, attachmentPath: uploaded?.path || null });
      setLiveMessages((items) => [...items, { ...sent, attachment_url: uploaded?.url || '' }]);
      setText(''); setAttachment(null); setAttachmentPreview('');
    } catch (error) { onDemoAction(error.message || 'Could not send this message.'); }
    finally { setMediaBusy(false); }
  };
  const chooseAttachment = (event) => { const file = event.target.files?.[0]; if (!file) return; setAttachment(file); setAttachmentPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : ''); event.target.value = ''; };
  const addEmoji = (emoji) => { setText((value) => `${value}${emoji}`); setEmojiOpen(false); };
  const toggleReaction = (messageId, reaction) => setMessageReactions((current) => ({ ...current, [messageId]: current[messageId] === reaction ? '' : reaction }));
  const stopRecording = () => mediaRecorderRef.current?.stop();
  const startRecording = async () => {
    if (!liveMode || recording || !navigator.mediaDevices?.getUserMedia) { if (!navigator.mediaDevices?.getUserMedia) onDemoAction('Voice notes are not supported by this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = []; mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => event.data.size && recordedChunksRef.current.push(event.data);
      recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' }); setAttachment(new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type })); setAttachmentPreview(''); setRecording(false); mediaRecorderRef.current = null; };
      recorder.start(); setRecording(true);
    } catch (error) { onDemoAction(error.message || 'Microphone permission was not granted.'); }
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
  const callSeller = async () => { if (!liveMode) return; setBusy(true); try { const contact = await fetchListingContact(selectedConversation.listing_id || liveListing?.id); const phone = String(contact?.phone || '').trim(); if (!phone) { onDemoAction('The seller has not enabled phone calls for this listing.'); return; } window.location.href = `tel:${phone.replace(/[^+\\d]/g, '')}`; } catch (error) { onDemoAction(error.message || 'Could not load the seller phone number.'); } finally { setBusy(false); } };
  const viewListing = () => { setChatMenuOpen(false); if (liveListing) onOpenListing?.(liveListing); else onDemoAction?.('The listing details are no longer available.'); };
  const muteConversation = () => { if (!selectedConversation) return; window.localStorage.setItem(`bese26:muted-conversation:${selectedConversation.id}`, '1'); setChatMenuOpen(false); onDemoAction?.('Conversation muted on this device.'); };
  const reportConversation = async () => { if (!selectedConversation?.listing_id || !window.confirm('Report this conversation and its listing?')) return; setBusy(true); try { await reportListing({ listingId: selectedConversation.listing_id, reporterId: user.id, reason: 'harassment', details: 'Reported from a private conversation.' }); setChatMenuOpen(false); onDemoAction?.('Report submitted securely.'); } catch (error) { onDemoAction?.(error.message || 'Could not submit the report.'); } finally { setBusy(false); } };
  const blockConversation = async () => { if (!selectedConversation?.seller_id || !window.confirm('Block this seller?')) return; setBusy(true); try { await blockUser(user.id, selectedConversation.seller_id); setChatMenuOpen(false); onDemoAction?.('Seller blocked.'); } catch (error) { onDemoAction?.(error.message || 'Could not block this seller.'); } finally { setBusy(false); } };
  if (!user) return <div className="page-stack notifications-page messages-guest-page"><section className="notifications-empty"><ShieldCheck size={30} /><div className="eyebrow">PRIVATE CONVERSATIONS</div><h1>Sign in to use Messages</h1><p>Your chats, offers, meeting plans, and attachments stay private to you and the other participant.</p><button className="primary-button" onClick={() => onAuthRequired?.('Sign in to open your private messages.')}>Sign in to continue</button></section></div>;
  if (!selectedConversation) {
    const filteredConversations = conversations.filter((conversation) => {
      const other = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer;
      const identity = conversationIdentity(conversation);
      const { name } = identity;
      const title = conversation.listing?.title || 'Marketplace listing';
      const query = messageSearch.trim().toLowerCase();
      const matchesSearch = !query || `${name} ${title}`.toLowerCase().includes(query);
      const isUnanswered = conversation.seller_id === user?.id && !conversation.last_message_at;
      return matchesSearch && (messageFilter === 'All' || (messageFilter === 'Unanswered' && isUnanswered) || messageFilter === 'Unread');
    });
    return <div className="messages-inbox-page"><header className="messages-inbox-header"><div className="messages-inbox-title"><div className="eyebrow">YOUR CONVERSATIONS</div><h1>Messages</h1></div><span className="message-count">{conversations.length}</span></header><div className="messages-search"><Search size={18} /><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search in Messages" aria-label="Search messages" /></div><div className="message-filter-tabs" role="tablist">{['All', 'Unread', 'Unanswered'].map((filter) => <button type="button" role="tab" aria-selected={messageFilter === filter} className={messageFilter === filter ? 'active' : ''} key={filter} onClick={() => setMessageFilter(filter)}>{filter}</button>)}</div>{conversationLoading ? <BrandLoader message="Loading conversations…" compact /> : filteredConversations.length ? <div className="message-inbox-list">{filteredConversations.map((conversation) => { const identity = conversationIdentity(conversation); const { name } = identity; const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); return <button key={conversation.id} className="message-inbox-row" type="button" onClick={() => onSelectConversation?.(conversation)}><span className={`message-identity-avatar ${identity.hasBusinessLogo ? 'is-business-logo' : ''}`}>{identity.image ? <img src={identity.image} alt="" onLoad={identity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <Avatar initials={initials} tone="rose" size="lg" />}</span><span className="message-inbox-copy"><strong>{name}</strong><b>{conversation.listing?.title || 'Marketplace listing'}</b><small>{conversation.last_message_at ? 'Open your conversation' : 'New conversation'}</small></span><time>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'New'}</time><ChevronRight size={17} /></button>; })}</div> : <div className="message-inbox-empty"><MessageCircle size={30} /><strong>{messageSearch ? 'No matching conversations' : 'No conversations yet'}</strong><span>When you message a seller, the conversation will appear here.</span></div>}</div>;
  }
  const selectedIdentity = conversationIdentity(selectedConversation);
  const otherProfile = selectedIdentity.profile;
  const personName = liveMode ? selectedIdentity.name : 'Marketplace chat';
  const listingTitle = liveMode ? (selectedConversation.listing?.title || 'Listing no longer available') : 'No listing selected';
  const listingImage = liveMode ? liveListing?.image : null;
  const personInitials = liveMode ? (personName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) : 'BE';
  const personImage = liveMode ? selectedIdentity.image : '';
  return <div className={`page-stack messages-page ${liveMode ? 'messages-selected-page' : ''}`}><div className="page-title-row"><div><div className="eyebrow">KEEP IT MOVING</div><h1>Messages</h1></div><span className="messages-workspace-pill">Deal workspace</span></div><div className="message-layout"><div className="conversation-list">{conversationLoading ? <BrandLoader message="Loading conversations…" compact /> : conversations.length ? conversations.map((conversation) => { const identity = conversationIdentity(conversation); const { name } = identity; return <button key={conversation.id} className={`conversation-row ${conversation.id === initialMessageId ? 'active' : ''}`} type="button" onClick={() => onSelectConversation?.(conversation)}><span className={`message-identity-avatar ${identity.hasBusinessLogo ? 'is-business-logo' : ''}`}>{identity.image ? <img src={identity.image} alt="" onLoad={identity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} tone="rose" />}</span><div className="conversation-copy"><strong>{name}</strong><span>{conversation.listing?.title || 'Marketplace listing'}</span></div><div className="conversation-meta"><small>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'New'}</small></div></button>; }) : <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>No conversations yet</h3><p>When you chat with a seller, your messages will appear here.</p></div>}</div><div className="chat-panel"><div className="chat-header"><button type="button" className="chat-back-button" onClick={onBackToInbox} aria-label="Back to messages"><ArrowLeft size={25} /></button><div className="chat-person"><span className={`message-identity-avatar chat-person-avatar ${selectedIdentity.hasBusinessLogo ? 'is-business-logo' : ''}`}>{personImage ? <img src={personImage} alt="" onLoad={selectedIdentity.hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <Avatar initials={personInitials} tone="rose" />}</span><div><strong>{personName}{otherProfile?.is_verified && <BadgeCheck size={15} className="chat-verified" />}</strong><span>{liveMode ? 'last seen recently' : 'Marketplace chat'}</span></div></div><div className="chat-header-actions"><button type="button" className="chat-header-icon" aria-label="Call seller" disabled={!liveMode || busy} onClick={callSeller}><Phone size={22} /></button><button type="button" className="chat-header-icon" aria-label="More options" aria-expanded={chatMenuOpen} onClick={() => setChatMenuOpen((value) => !value)}><MoreVertical size={23} /></button></div></div>{chatMenuOpen && <div className="chat-action-menu" role="menu"><button type="button" onClick={viewListing}><Package size={15} /> View listing</button><button type="button" onClick={muteConversation}><BellOff size={15} /> Mute conversation</button><button type="button" onClick={reportConversation} disabled={busy}><Flag size={15} /> Report conversation</button><button type="button" onClick={blockConversation} disabled={busy}><ShieldAlert size={15} /> Block user</button></div>}<div className="chat-context">{listingImage ? <img src={listingImage} alt="" /> : <div className="chat-context-placeholder"><Package size={17} /></div>}<div><span>Item details</span><strong>{listingTitle}</strong>{liveListing?.price && <b className="chat-context-price">{liveListing.price}</b>}</div></div>{dealPanel === 'offer' && <form className="deal-form" onSubmit={submitOffer}><strong>Make an offer</strong><small>Keep the price and agreement inside Bese26 chat.</small><input type="number" min="1" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} placeholder="Offer amount in NGN" required /><input value={offerNote} onChange={(event) => setOfferNote(event.target.value)} placeholder="Optional note" maxLength={500} /><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send offer'}</button></div></form>}{dealPanel === 'meeting' && <form className="deal-form safe-meeting-form" onSubmit={submitMeeting}><strong>Plan a safe meeting</strong><small>Choose a public area. Do not share your home address or pay before inspecting the item.</small><label>Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required /></label><label>Time<input type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} required /></label><label>General public area<input value={meetingArea} onChange={(event) => setMeetingArea(event.target.value)} placeholder="e.g. mall, fuel station, or police-approved area" maxLength={120} required /></label><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send meeting plan'}</button></div></form>}{deals.offers.map((offer) => <div id={`chat-offer-${offer.id}`} className={`deal-status-card ${initialNotificationTarget?.offerId === offer.id ? 'is-notification-target' : ''}`} key={offer.id}><div><strong>Offer · ₦{Number(offer.amount).toLocaleString('en-NG')}</strong><span>{offer.status}</span></div>{isSeller && offer.status === 'pending' && <div><button type="button" onClick={() => updateOffer(offer, 'accepted')}>Accept</button><button type="button" onClick={() => updateOffer(offer, 'rejected')}>Decline</button></div>}{!isSeller && offer.status === 'pending' && <button type="button" onClick={() => updateOffer(offer, 'cancelled')}>Cancel</button>}</div>)}{deals.meetings.map((meeting) => { const proposedByMe = meeting.proposed_by === user.id; return <div className="deal-status-card meeting-status-card" key={meeting.id}><div><strong>Safe meeting · {meeting.meeting_date} at {String(meeting.meeting_time).slice(0, 5)}</strong><span>{meeting.area} · {meeting.status}</span></div><div>{!proposedByMe && meeting.status === 'proposed' && <><button type="button" onClick={() => updateMeeting(meeting, 'accepted')}>Accept</button><button type="button" onClick={() => updateMeeting(meeting, 'declined')}>Decline</button></>}{proposedByMe && ['proposed', 'accepted'].includes(meeting.status) && <button type="button" onClick={() => updateMeeting(meeting, 'cancelled')}>Cancel</button>}{meeting.status === 'accepted' && <button type="button" onClick={() => updateMeeting(meeting, 'completed')}>Mark complete</button>}</div></div>; })}
  <div className="chat-messages">{liveMode ? (liveLoading ? <div className="chat-loading-state" role="status"><span className="chat-loading-spinner" /> <span>Loading messages…</span></div> : liveMessages.length ? liveMessages.map((item) => <div id={`chat-message-${item.id}`} className={`message-bubble ${item.sender_id === user.id ? 'mine' : 'other'} ${initialNotificationTarget?.messageId === item.id ? 'is-notification-target' : ''}`} key={item.id}>{item.attachment_url && (item.attachment_path?.match(/\.(webm|ogg|mp3|m4a|wav)$/i) ? <audio controls src={item.attachment_url} className="message-audio" /> : item.attachment_path?.match(/\.pdf$/i) ? <a href={item.attachment_url} target="_blank" rel="noreferrer" className="message-file">PDF · Open file</a> : <a href={item.attachment_url} target="_blank" rel="noreferrer"><img src={item.attachment_url} alt="Chat attachment" className="message-image" /></a>)}{item.body && <span>{item.body}</span>}{!item.body && !item.attachment_url && 'Attachment'}<small>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.sender_id === user.id && <Check size={12} />}</small><button type="button" className={`message-reaction ${messageReactions[item.id] ? 'selected' : ''}`} onClick={() => toggleReaction(item.id, messageReactions[item.id] || '👍')} aria-label="React to message">{messageReactions[item.id] || '＋'}</button></div>) : <div className="chat-empty-note">Start the conversation with a clear question about the listing.</div>) : <div className="chat-empty-note">Select a listing to start a real conversation.</div>}</div>{liveMode && <div className="chat-bottom-tools"><div className="chat-safety-note"><ShieldCheck size={14} /><span>Stay safe: inspect before paying. Never share OTPs or PINs.</span></div><div className="chat-quick-actions"><button type="button" onClick={() => setText('Is this listing still available?')}>Available?</button><button type="button" onClick={() => setText('Please share the general location of this item.')}>Location</button><button type="button" onClick={() => setDealPanel('offer')} disabled={isSeller}>Offer</button><button type="button" onClick={() => setDealPanel('meeting')}>Meet safely</button></div></div>}{attachment && <div className="chat-attachment-preview">{attachmentPreview ? <img src={attachmentPreview} alt="Selected preview" /> : <Mic size={16} />}<span>{attachment.name} <small>{Math.ceil(attachment.size / 1024)} KB</small></span><button type="button" onClick={() => { setAttachment(null); setAttachmentPreview(''); }} aria-label="Remove attachment"><X size={15} /></button></div>}{emojiOpen && <div className="emoji-picker" role="dialog" aria-label="Choose an emoji"><div className="emoji-picker-header"><strong>Emojis</strong><button type="button" onClick={() => setEmojiOpen(false)} aria-label="Close emoji picker"><X size={14} /></button></div><div className="emoji-grid">{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => addEmoji(emoji)} aria-label={`Add ${emoji}`}>{emoji}</button>)}</div></div>}<div className="chat-composer"><input id="chat-file-input" className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/webm,audio/ogg,audio/mpeg" onChange={chooseAttachment} /><label htmlFor="chat-file-input" className="icon-button" aria-label="Attach image or file"><ImageIcon size={18} /></label><button type="button" className={`icon-button chat-record-button ${recording ? 'recording' : ''}`} aria-label={recording ? 'Stop recording' : 'Record voice note'} onClick={recording ? stopRecording : startRecording} disabled={!liveMode || mediaBusy}><Mic size={18} /></button><button type="button" className={`icon-button emoji-toggle ${emojiOpen ? 'active' : ''}`} aria-label="Open emoji picker" onClick={() => setEmojiOpen((value) => !value)} disabled={!liveMode}><span aria-hidden="true">☺</span></button><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={recording ? 'Recording voice note…' : 'Write a message...'} disabled={!liveMode || recording || mediaBusy} /><button className="send-button" onClick={() => send()} disabled={!liveMode || mediaBusy || (!text.trim() && !attachment)}>{mediaBusy ? '…' : <Send size={16} />}</button></div></div></div></div>;
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
    return <a className="public-follow-person" href={item.username ? `/@${item.username}` : '#'} key={item.id}><span className="public-follow-avatar">{item.avatar_path ? <img src={getAvatarUrl(item.avatar_path)} alt="" /> : identity.name.slice(0, 1).toUpperCase()}</span><span><strong>{identity.name}</strong><small>@{item.username || 'member'}</small></span>{item.is_verified && <BadgeCheck size={14} className="unified-verified-icon" />}</a>;
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
  const hasBusinessLogo = Boolean(business?.logo_path || isOfficialBese26Business(business));
  const description = business?.description || profile?.bio;
  const safeDescription = description && !/^admin$/i.test(String(description).trim()) ? description : '';
  const scrollToListings = () => document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const idVerified = Boolean(profile?.is_verified);
  const cacVerified = Boolean(business?.is_verified);
  const targetId = profile?.id;
  const [profileViews, setProfileViews] = useState(() => listings.reduce((total, item) => total + Number(item.views_count || 0), 0));
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
  useEffect(() => { let mounted = true; if (!targetId || !isSupabaseConfigured || !supabase) return undefined; fetchPublicSellerViews(targetId).then((views) => mounted && setProfileViews(Number(views || 0))).catch(() => {}); return () => { mounted = false; }; }, [targetId]);
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
  return <section className="miniweb-hero-v2 miniweb-dashboard-live"><div className="miniweb-hero-v2-top"><div className={`miniweb-hero-v2-logo ${hasBusinessLogo ? 'has-business-logo' : ''}`}>{avatarUrl ? <img src={avatarUrl} alt={`${name} profile`} onLoad={hasBusinessLogo ? handleBusinessLogoLoad : undefined} /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div><div className="miniweb-hero-v2-heading"><div className="miniweb-hero-v2-eyebrow">{isBusiness ? 'PUBLIC BUSINESS' : 'PUBLIC SELLER PROFILE'}</div><h1>{name}</h1><div className={`miniweb-hero-v2-verification ${idVerified || cacVerified ? 'is-verified' : ''}`}><BadgeCheck size={16} /><span><strong>{idVerified || cacVerified ? 'Verified profile' : 'Public profile'}</strong><small>{idVerified || cacVerified ? 'Verified by Bese26' : 'Public profile on Bese26'}</small><VerificationBadges idVerified={idVerified} cacVerified={cacVerified} compact /></span></div></div><button type="button" className="miniweb-hero-v2-share" onClick={share} aria-label="Share shop"><Share2 size={14} /> Share</button></div><div className="miniweb-hero-v2-meta"><span><MapPin size={13} /> {location || 'Nigeria'}</span>{(business?.category || business?.business_type) && <span className="miniweb-hero-v2-category">{business.category || business.business_type}</span>}</div>{safeDescription && <p className="miniweb-hero-v2-description">{safeDescription}</p>}<div className="miniweb-hero-v2-bottom"><div className="miniweb-hero-v2-stats"><span><strong>{listings.length}</strong><small>Listings</small></span><span><strong>{heroFollow.followers}</strong><small>Followers</small></span><span><strong>{heroFollow.following}</strong><small>Following</small></span><span><strong>{profileViews}</strong><small>Views</small></span><button type="button" className={`miniweb-hero-v2-follow ${heroFollow.isFollowing ? 'following' : ''}`} onClick={handleHeroFollow} disabled={heroFollow.busy || !targetId}><UserPlus size={13} /> <span>{heroFollow.isFollowing ? 'Following' : 'Follow'}</span></button></div><div className="miniweb-hero-v2-actions"><button type="button" className="miniweb-hero-v2-listings" onClick={scrollToListings}>View listings <ArrowRight size={14} /></button></div></div></section>;
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
  return <div className="public-business-shell"><header className="public-business-topbar"><a href="https://www.bese26.shop/" className="public-brand"><img className="public-brand-logo" src="/images/bese26-logo-icon.webp" alt="Bese26" /><strong>Bese26<span>.shop</span></strong></a><nav className="public-business-nav" aria-label="Public shop navigation"><a href="https://www.bese26.shop/">Marketplace</a><a href="#listings">Listings</a></nav></header><main className="public-business-main">{children}</main><footer className="public-business-footer"><strong>Bese26<span>.shop</span></strong><span>Trusted local buying and selling</span></footer></div>;
}
function PublicPersonalPage({ data }) {
  const { profile, listings } = data;
  const identity = getPublicIdentity(profile);
  const business = profile.business || null;
  const share = async () => { const url = `https://www.bese26.shop/@${profile.username}`; if (navigator.share) await navigator.share({ title: identity.name, text: business?.description || profile.bio || identity.name, url }); else await navigator.clipboard?.writeText(url); };
  return <PublicStorefrontLayout title={identity.name} share={share}><PublicProfileHeader profile={profile} business={business} listings={listings} share={share} /><PublicListingSection title={`Listings from ${identity.name}`} listings={listings} /></PublicStorefrontLayout>;
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

function PublicBusinessPage({ handle }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => { let mounted = true; fetchPublicBusiness(handle).then((data) => data || fetchPublicProfile(handle)).then((data) => mounted && setState({ loading: false, data, error: '' })).catch((error) => mounted && setState({ loading: false, data: null, error: error.message || 'Unable to load this public profile.' })); return () => { mounted = false; }; }, [handle]);
const seoData = state.data;
  const seoBusiness = seoData?.business || seoData?.profile?.business;
  const seoProfile = seoData?.profile || seoData?.ownerProfile;
  const seoListings = seoData?.listings || [];
  const seoName = seoBusiness?.business_name || seoProfile?.display_name || handle;
  const seoDescription = seoText(seoBusiness?.description || seoProfile?.bio, `${seoName} on Bese26 — discover listings, products and services in Nigeria.`);
  const seoCanonical = `${SEO_SITE_URL}/@${String(seoBusiness?.business_handle || seoProfile?.username || handle).toLowerCase()}`;
  const seoBusinessImage = getBusinessLogoDisplayUrl(seoBusiness, getAvatarUrl(seoBusiness?.logo_path)) || SEO_DEFAULT_IMAGE;
  usePublicSeo({ title: `${seoName} | Bese26 Miniweb`, description: seoDescription, canonical: seoCanonical, image: seoBusinessImage, schema: seoData ? { '@context': 'https://schema.org', '@type': seoBusiness ? 'Store' : 'Person', name: seoName, url: seoCanonical, description: seoDescription, image: seoBusinessImage, address: { '@type': 'PostalAddress', addressLocality: seoBusiness?.city || seoProfile?.city || '', addressRegion: seoBusiness?.state || seoProfile?.state || '', addressCountry: 'NG' }, hasOfferCatalog: { '@type': 'OfferCatalog', name: `Listings from ${seoName}`, itemListElement: seoListings.slice(0, 60).map((item, index) => ({ '@type': 'Offer', position: index + 1, url: `${SEO_SITE_URL}/listing/${encodeURIComponent(item.id)}`, itemOffered: { '@type': 'Product', name: seoText(item.title), image: item.image || SEO_DEFAULT_IMAGE, offers: { '@type': 'Offer', priceCurrency: 'NGN', availability: 'https://schema.org/InStock' } } })) } } : null });
  if (state.loading) return <MiniwebDashboardShell />;
  if (state.error || !state.data) return <div className="public-business-shell"><section className="public-business-not-found"><div className="brand-mark">B</div><div className="eyebrow">BESE26 SHOP</div><h1>Shop not found</h1><p>This public shop does not exist, is inactive, or has no public profile.</p><a className="primary-button" href="https://www.bese26.shop/">Back to Bese26 <ArrowRight size={16} /></a></section></div>;
  if (state.data.profile) { const { profile, listings } = state.data; return <PublicPersonalPage data={{ profile, listings }} />; }
  const { business, ownerProfile, listings } = state.data;
  const share = async () => { const url = `https://www.bese26.shop/@${business.business_handle}`; if (navigator.share) await navigator.share({ title: business.business_name, text: business.description || business.business_name, url }); else await navigator.clipboard?.writeText(url); };
  return <PublicStorefrontLayout title={business.business_name} share={share}><PublicProfileHeader business={business} profile={ownerProfile} listings={listings} share={share} /><PublicBusinessAbout business={business} /><PublicListingSection title={`Listings from ${business.business_name}`} listings={listings} /></PublicStorefrontLayout>;
}
function PublicListingRoute({ listingId }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState('');
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
  const requireAuth = (message = 'Sign in to join the listing discussion.') => { setAuthReason(message); setShowAuth(true); };
  return <>
    <ListingDetailsView listing={listing} user={sessionUser} onAuthRequired={requireAuth} onClose={() => window.location.assign('/')} onDemoAction={(message) => window.alert(message)} onStartChat={(_listing, intent = 'message', draft = '') => { const params = new URLSearchParams({ chat_listing: listing.id, chat_intent: intent }); if (draft) params.set('chat_draft', draft); window.location.assign(`/?${params.toString()}`); }} />
    {showAuth && <AuthPanel reason={authReason} onClose={() => setShowAuth(false)} onAuthenticated={(nextUser) => { setSessionUser(nextUser); setShowAuth(false); setAuthReason(''); }} />}
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
    {error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}
    <section className="directory-results" aria-labelledby="directory-results-title">
      <div className="directory-results-heading">
        <div><span className="directory-section-kicker">CURATED FOR YOU</span><h2 id="directory-results-title">Miniwebs to explore</h2><p>Meet businesses and stores from around your community.</p></div>
        {!loading && <span className="directory-results-count"><strong>{businesses.length}</strong> {businesses.length === 1 ? 'business' : 'businesses'}</span>}
      </div>
      {loading ? <BrandLoader message="Loading public miniwebs…" compact /> : businesses.length ? <div className="directory-business-grid">{businesses.map((business) => {
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
  const { t } = useI18n();
  const publicHandle = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1] || window.location.pathname.match(/^\/?(?:business|store|miniweb)\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1] || new URLSearchParams(window.location.search).get('business'))?.toLowerCase() : null;
  const publicListingId = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/?listing\/([^/]+)\/?$/i)?.[1] || new URLSearchParams(window.location.search).get('listing') || new URLSearchParams(window.location.search).get('listing_id')) : null;
  if (publicListingId) return <PublicListingRoute listingId={publicListingId} />;
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
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [userPlace, setUserPlace] = useState('');
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [businessOwnerProfile, setBusinessOwnerProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState('');
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
  const canAccessAdmin = Boolean(isAdmin || sessionUser?.email?.toLowerCase() === ownerAdminEmail);
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
  const requireAuth = useCallback((message = 'Sign in to continue with your marketplace account.') => { setAuthReason(message); setShowAuth(true); }, []);  useEffect(() => {
    let mounted = true;
    if (!sessionUser) { setUnreadNotifications(0); setBusinessOwnerProfile(null); return undefined; }
    fetchNotifications(sessionUser.id).then((rows) => mounted && setUnreadNotifications((rows || []).filter((item) => !item.read_at).length)).catch(() => {});
    const unsubscribeNotifications = subscribeToNotifications(sessionUser.id, (payload) => { if (mounted && payload?.new && !payload.new.read_at) setUnreadNotifications((count) => count + 1); });
    if (isSupabaseConfigured) getBusinessProfile(sessionUser.id).then((profile) => mounted && setBusinessOwnerProfile(profile)).catch(() => mounted && setBusinessOwnerProfile(null));
    const unsubscribe = subscribeToNotifications(sessionUser.id, (payload) => {
      if (!mounted || !payload?.new) return;
      setUnreadNotifications((count) => count + 1);
      const title = payload.new.title || 'New Bese26 notification';
      showToast(title);
    });
    const badgeTimer = window.setInterval(() => { fetchNotifications(sessionUser.id).then((rows) => mounted && setUnreadNotifications((rows || []).filter((item) => !item.read_at).length)).catch(() => {}); }, 20000);
    return () => { mounted = false; window.clearInterval(badgeTimer); unsubscribe?.(); };
  }, [sessionUser, showToast]);
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
        const [remoteListings, remoteCategories] = await Promise.all([fetchActiveListings(), fetchCategories()]);
        if (mounted) {
          setMarketListings(remoteListings || []);
          setMarketCategories(remoteCategories || []);
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
          const [remoteSaved, admin] = await Promise.all([fetchSavedIds(session.user.id), isAdminUser(session.user.id)]);
          if (mounted) { setSavedIds(remoteSaved || []); setIsAdmin(Boolean(admin)); }
        } catch (error) {
          if (mounted) { setSavedIds([]); setIsAdmin(false); }
        }
      } else if (mounted) {
        setSavedIds([]);
        setIsAdmin(false);
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
      if (event === 'SIGNED_IN' && session?.user) {
        loadBackend();
        fetchSavedIds(session.user.id).then(setSavedIds).catch(() => {});
        isAdminUser(session.user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
      }
      if (event === 'SIGNED_OUT') { setSavedIds([]); setIsAdmin(false); setSelectedListing(null); setChatListing(null); setChatTargetId(null); setChatDealPanel(''); setChatNotificationTarget(null); setChatDraft(''); setEditingListing(null); setSearch(''); setActiveNav('home'); loadBackend(); }
    });
    return () => { mounted = false; window.clearTimeout(startupTimeout); window.clearInterval(refreshTimer); document.removeEventListener('visibilitychange', refreshWhenVisible); window.removeEventListener('focus', refreshWhenFocused); subscription.unsubscribe(); };
  }, []);
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
    if (isSupabaseConfigured && !sessionUser) { requireAuth('Sign in before posting a listing.'); return; }
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
    if (isSupabaseConfigured && !sessionUser) { setSelectedListing(null); requireAuth('Sign in to chat with this seller.'); return; }
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
    if (isSupabaseConfigured && !sessionUser) { requireAuth('Sign in to message this business.'); return; }
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
    if (activeNav === 'home') return <HomeView user={sessionUser} marketLoading={marketLoading} adCampaigns={adCampaigns} marketListings={nearbyListings} userPlace={userPlace} locationBusy={locationBusy} onUseLocation={useMyLocation} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} />;
    if (activeNav === 'search') return <SearchView adCampaigns={adCampaigns} marketLoading={marketLoading} marketListings={marketListings} categories={marketCategories} search={search} setSearch={setSearch} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={goBack} />;
    if (activeNav === 'notifications') return <NotificationsView user={sessionUser} onAuthRequired={() => requireAuth('Login to view notifications.')} onBack={goBack} onNotice={showToast} onNavigate={navigate} onOpenListing={openListing} onOpenConversation={openNotificationConversation} onOpenPublicProfile={openNotificationPublicProfile} onOpenProfilePage={openNotificationProfilePage} />;
    if (activeNav === 'saved') return <SavedView marketListings={marketListings} savedIds={savedIds} onOpenListing={openListing} onToggleSave={toggleSave} />;
    if (activeNav === 'wallet') return <UnavailableView icon={WalletCards} eyebrow="WALLET" title="Wallet is coming soon" description="Wallet, payments, and transactions are not connected yet. No balance or transaction data is shown until the real service is ready." onBack={goBack} />;
    if (activeNav === 'subscription') return <SubscriptionView user={sessionUser} onBack={goBack} onAuthRequired={() => requireAuth('Sign in to view your seller plan.')} onDemoAction={showToast} />;
    if (activeNav === 'business') return <BusinessDirectoryView adCampaigns={adCampaigns} onBack={goBack} />;
    if (activeNav === 'sell') return <SellView key={`sell-${editingListing?.id || editingDraft?.id || copySourceListing?.id || 'new'}`} user={sessionUser} isAdmin={canAccessAdmin} initialListing={editingListing} initialDraft={editingDraft} copySource={copySourceListing} onAuthRequired={() => requireAuth('Sign in before posting a listing.')} onDemoAction={showToast} onNavigate={navigate} onOpenSubscription={() => navigate('subscription')} />;
    if (activeNav === 'messages') return <MessagesView user={sessionUser} liveListing={chatListing} onOpenListing={openListing} onDemoAction={showToast} onAuthRequired={(message) => requireAuth(message)} initialMessageId={chatTargetId} initialNotificationTarget={chatNotificationTarget} initialDealPanel={chatDealPanel} initialText={chatDraft} onSelectConversation={(conversation) => { setChatTargetId(conversation.id); setChatListing(null); setChatDealPanel(''); setChatNotificationTarget(null); }} onBackToInbox={() => { setChatTargetId(null); setChatDealPanel(''); setChatNotificationTarget(null); }} />;
    if (activeNav === 'admin') return canAccessAdmin ? <AdminView user={sessionUser} onBack={goBack} onNotice={showToast} onCreateListing={() => { setEditingDraft(null); setEditingListing(null); setCopySourceListing(null); navigate('sell'); }} /> : <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={openSell} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={false} onOpenAdmin={() => {}} onOpenSubscription={() => navigate('subscription')} />;
    return <ProfileView key={profileReset} user={sessionUser} initialPage={profilePageTarget} onInitialPageConsumed={consumeProfilePageTarget} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={openSell} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={canAccessAdmin} onOpenAdmin={() => navigate('admin')} onOpenSubscription={() => navigate('subscription')} />;
  };

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`} data-release="comments-v2">
    <main className="main-container"><AppErrorBoundary key={activeNav}><Suspense fallback={<BrandLoader message="Loading page…" compact />}>{renderView()}</Suspense></AppErrorBoundary></main>
    <footer className="site-footer"><div><strong>Bese26<span>.shop</span></strong><p>Nigerian online marketplace for personal and business transactions.</p></div><nav aria-label="Public information"><a href="/#terms" onClick={(event) => { event.preventDefault(); goPublicSection('terms'); }} title="Read Terms of Service">Terms</a><a href="/#privacy" onClick={(event) => { event.preventDefault(); goPublicSection('privacy'); }} title="Read Privacy Policy">Privacy</a><a href="/#refund-policy" onClick={(event) => { event.preventDefault(); goPublicSection('refund-policy'); }} title="Read Refund Policy">Refunds</a><a href="/#safety" onClick={(event) => { event.preventDefault(); goPublicSection('safety'); }} title="Read Marketplace Safety">Safety</a><a href="mailto:info@bese26.shop?subject=Bese26%20Support" title="Email Bese26 support">info@bese26.shop</a></nav></footer>
    <nav className="bottom-nav" aria-label="Primary navigation">{mobileNavItems.map(({ key, label, icon: Icon }) => <button key={key} aria-current={activeNav === key ? 'page' : undefined} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => key === 'sell' ? openSell() : navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} />{key === 'notifications' && unreadNotifications > 0 && <b className="bottom-nav-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</b>}</span><span>{t(label)}</span></button>)}</nav>

    {showAuth && <AuthPanel reason={authReason} onClose={() => setShowAuth(false)} onAuthenticated={(user) => { setSessionUser(user); setAuthReason(''); showToast('Signed in to bese26.'); }} />}
    {selectedListing && <Suspense fallback={<BrandLoader message="Loading listing…" compact />}><ListingDetailsView listing={selectedListing} user={sessionUser} activeBusiness={businessOwnerProfile} focusSection={listingFocusTarget?.section || null} focusCommentId={listingFocusTarget?.commentId || null} onClose={() => { setListingFocusTarget(null); window.history.back(); }} onAuthRequired={requireAuth} isSaved={savedIds.includes(selectedListing.id)} savedIds={savedIds} onToggleSave={toggleSave} onDemoAction={showToast} onStartChat={openChat} onOpenListing={openListing} onEditListing={(item) => { setSelectedListing(null); setCopySourceListing(null); setEditingListing(item); navigate('sell'); }} onCopyListing={openSell} /></Suspense>}
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    {paymentVerifying && <div className="payment-verifying-overlay"><BrandLoader message="Verifying your Bese26 payment…" /></div>}
    <InstallPrompt />
  </div>;
}


export default function App() {
  return <I18nProvider><AppErrorBoundary><ConnectionScreen><AppContent /></ConnectionScreen></AppErrorBoundary></I18nProvider>;
}
