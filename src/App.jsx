import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
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
  UserRound,
  WalletCards,
  Wrench,
  Share2,
  ZoomIn,
  X,
  MoreVertical,
} from 'lucide-react';

function lazyWithRetry(importer, chunkName) {
  return lazy(() => importer().then((module) => {
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
import AuthPanel from './components/AuthPanel';
import { initAnalytics, trackEvent, trackPageView } from './lib/analytics';
import { getAvatarUrl, isSupabaseConfigured, supabase } from './lib/supabase';
import { formatPublicBusinessLocation } from './lib/publicBusiness';
import { saveListingChatDraft, takeListingChatDraft } from './lib/chatDrafts';
import { withActiveListingUsage } from './lib/sellerEntitlement';
import { createChatMeeting, createChatOffer, deleteListing, fetchActiveListings, fetchActiveAdCampaigns, fetchNotifications, markNotificationRead, fetchBusinessDirectory, fetchCategories, fetchConversationDeals, fetchPublicBusiness, fetchPublicProfile, fetchSavedIds, fetchConversations, fetchMessages, fetchListingDetails, fetchListingReviews, fetchSellerEntitlement, fetchMyListings, fetchMyBoosts, fetchSimilarListings, getBusinessProfile, getFollowState, getOrCreateConversation, isAdminUser, recordListingView, recordRecentlyViewed, requestListingCallback, reportListing, sendMessage, setListingStatus, signOut, startPaystackCheckout, subscribeToMessages, toggleFavorite, toggleFollow, updateChatMeeting, updateChatOffer, updateListing, uploadChatMedia, verifyPaystackPayment } from './lib/marketplace';

function BrandLoader({ message = 'Loading Bese26…', offline = false, compact = false }) {
  return <div className={`brand-loader ${compact ? 'brand-loader-compact' : ''}`} role="status" aria-live="polite">
    <div className="brand-loader-orbit" aria-hidden="true"><span className="brand-loader-ring" /><img src="/images/bese26-logo-icon.png" alt="" /></div>
    <strong>{offline ? 'Checking your connection…' : message}</strong>
    <small>{offline ? 'Please wait while Bese26 reconnects.' : 'Your marketplace is getting ready.'}</small>
  </div>;
}

function SplashScreen() {
  return <div className="splash-screen" role="status" aria-label="Bese26 is loading">
    <div className="splash-brand-lockup">
      <img className="splash-bese26-logo" src="/images/bese26-logo-icon.png" alt="Bese26" />
      <span className="splash-brand-name">Bese26<span>.shop</span></span>
    </div>
    <div className="splash-credit" aria-label="From SYLUTION">
      <span className="splash-credit-label">From</span>
      <img className="splash-sylution-logo" src="/branding-sylution-logo.png" alt="SYLUTION" />
      <span className="splash-credit-name">SYLUTION</span>
    </div>
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

const navItems = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'sell', label: 'Sell', icon: Plus },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'business', label: 'Business', icon: Store },
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

function ProductCard({ listing, onOpen, isSaved, onToggleSave, compact = false }) {
  return (
    <article className={`product-card ${compact ? 'product-card-compact' : ''}`} role="button" tabIndex={0} aria-label={`Open listing: ${listing.title}`} onClick={() => onOpen(listing)} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); onOpen(listing); } }}>
      <div className="product-image-wrap">
        {listing.image ? <img src={listing.image} alt={listing.title} className="product-image" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} /> : null}<div className="product-image-placeholder" hidden={Boolean(listing.image)}><Package size={26} /></div>
        {listing.promoted && <span className="promoted-pill"><Sparkles size={12} /> Promoted</span>}
        <button className={`save-button ${isSaved ? 'saved' : ''}`} aria-label={isSaved ? 'Remove from saved' : 'Save listing'} onClick={(event) => { event.stopPropagation(); onToggleSave(listing.id); }}>
          <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-price">{listing.price}</div>
        <h3>{listing.title}</h3>
        <div className="product-meta"><MapPin size={13} /> {listing.location}</div>
        <div className="listing-seller-line"><span className="listing-seller-avatar">{listing.sellerInitials || 'BE'}</span><span className="listing-seller-name">{listing.sellerDisplayName || listing.seller}</span>{listing.verified && <BadgeCheck size={13} className="listing-seller-verified" aria-label="Verified account" />}</div>
        <div className="product-foot">
          <span>{listing.condition}</span>
          <span>{listing.posted}</span>
        </div>
        {listing.verified && <VerifiedBadge text="Verified account" />}
      </div>
    </article>
  );
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

function NotificationsView({ user, onAuthRequired, onBack, onNotice, onNavigate }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(Boolean(user)); const [entitlement, setEntitlement] = useState(null); const [sellerListings, setSellerListings] = useState([]); const [boosts, setBoosts] = useState([]); const [dismissed, setDismissed] = useState(() => { try { return JSON.parse(localStorage.getItem('bese26:reminders') || '{}'); } catch { return {}; } });
  useEffect(() => { let mounted = true; if (!user) { setLoading(false); return undefined; } Promise.all([fetchNotifications(user.id), fetchSellerEntitlement(), fetchMyListings({ sellerId: user.id, status: 'active' }), fetchMyBoosts(user.id)]).then(([rows, access, listings, activeBoosts]) => { if (!mounted) return; setItems(rows || []); setEntitlement(access || null); setSellerListings(listings || []); setBoosts((activeBoosts || []).filter((boost) => ['active', 'pending', 'scheduled'].includes(boost.status))); }).catch((error) => mounted && onNotice?.(error.message || 'Could not load notifications.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user, onNotice]);
  const dismissReminder = (key) => { const next = { ...dismissed, [key]: new Date().toISOString().slice(0, 10) }; setDismissed(next); localStorage.setItem('bese26:reminders', JSON.stringify(next)); };
  const today = new Date().toISOString().slice(0, 10);
  const showSubscriptionReminder = Boolean(entitlement && !entitlement.is_paid && dismissed.subscription !== today);
  const showBoostReminder = Boolean(sellerListings.length && !boosts.length && dismissed.boost !== today);
  const open = async (item) => { if (!item.read_at) { try { await markNotificationRead(item.id, user.id); setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)); } catch {} } };
  if (!user) return <div className="page-stack notifications-page"><section className="notifications-empty"><Bell size={30} /><div className="eyebrow">YOUR NOTIFICATIONS</div><h1>Stay up to date</h1><p>Sign in to see listing updates, messages, offers, and safety alerts.</p><button className="primary-button" onClick={onAuthRequired}>Login to continue</button><button className="text-action" onClick={onBack}>Back to Home</button></section></div>;
  return <div className="page-stack notifications-page"><div className="notifications-heading"><div><div className="eyebrow">YOUR ACTIVITY</div><h1>Notifications</h1><p>Important updates from your Bese26 account.</p></div><Bell size={24} /></div>{(showSubscriptionReminder || showBoostReminder) && <section className="reminder-center"><div className="eyebrow">SELLER REMINDERS</div>{showSubscriptionReminder && <article className="reminder-card"><span className="reminder-card-icon"><Sparkles size={17} /></span><div><strong>Grow your Bese26 access</strong><p>You are currently on the free plan. Subscribe when you need more listing capacity and seller tools.</p><button type="button" onClick={() => onNavigate?.('subscription')}>View plans</button></div><button type="button" className="reminder-dismiss" onClick={() => dismissReminder('subscription')} aria-label="Dismiss subscription reminder"><X size={15} /></button></article>}{showBoostReminder && <article className="reminder-card"><span className="reminder-card-icon"><ArrowUpRight size={17} /></span><div><strong>Get more eyes on your listing</strong><p>You have active listings without a boost. Promote one when you want more visibility.</p><button type="button" onClick={() => { onNavigate?.('profile'); onNotice?.('Open Profile → Boosting to promote a listing.'); }}>Boost a listing</button></div><button type="button" className="reminder-dismiss" onClick={() => dismissReminder('boost')} aria-label="Dismiss boost reminder"><X size={15} /></button></article>}</section>}{loading ? <div className="empty-state">Loading notifications…</div> : items.length ? <div className="notification-list">{items.map((item) => <button type="button" className={`notification-item ${item.read_at ? '' : 'unread'}`} key={item.id} onClick={() => open(item)}><span className="notification-dot"><Bell size={15} /></span><span><strong>{item.title || 'Bese26 update'}</strong><small>{item.body || item.message || 'You have a new update.'}</small><em>{item.created_at ? new Date(item.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</em></span></button>)}</div> : <div className="notifications-empty compact"><Bell size={26} /><h2>You’re all caught up</h2><p>New messages, listing updates, and account alerts will appear here.</p></div>}</div>;
}

const subscriptionPlans = [
  { key: 'free', name: 'Free', price: 0, cadence: 'forever', summary: 'For anyone starting to sell.', highlight: '3 active listings included', features: ['3 active marketplace listings', 'Basic seller profile', 'Bese26 chat with buyers', 'Saved items and seller following', 'Listing review before publishing', 'Edit, pause, resume and mark as sold', 'Personal public profile link'], tone: 'free' },
  { key: 'basic', name: 'Basic', price: 2999, cadence: 'month', summary: 'For a growing local seller.', highlight: '15 active listings', features: ['Everything in Free', '15 active listings', 'Basic seller analytics', 'Listing management tools', 'Saved searches', 'Standard seller support', 'Personal or business publishing identity', 'Public seller or business link'], tone: 'basic' },
  { key: 'premium', name: 'Premium', price: 7000, cadence: 'month', summary: 'For sellers with regular stock.', highlight: '35 active listings · 5 boosts/month', features: ['Everything in Basic', '35 active listings', 'Advanced seller analytics', 'Detailed seller dashboard', 'Free verification request, subject to review', 'Verified badge after approval while active', '5 free boost credits every month', 'Business profile tools', 'Priority support', 'Advanced listing organization'], tone: 'premium', popular: true },
  { key: 'business', name: 'Business', price: 14999, cadence: 'month', summary: 'For professional businesses.', highlight: '60 active listings · 10 boosts/month', features: ['Everything in Premium', '60 active listings', 'Professional business storefront', 'Business name, logo and branding', 'Business handle and shareable link', 'Free business verification request, subject to review', 'Verified badge after approval while active', '10 free boost credits every month', 'Business profile management', 'Promotional tools and priority business support'], tone: 'business' },
];



function SubscriptionPlanCard({ plan, expanded, onToggle, onChoose, currentPlan, busyPlan }) {
  const isCurrent = currentPlan === plan.key;
  return <article className={`subscription-plan-card ${plan.tone} ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}><div className="subscription-plan-top"><span className="subscription-plan-badge">{plan.popular ? 'MOST POPULAR' : plan.key === 'free' ? 'START HERE' : plan.name.toUpperCase()}</span>{isCurrent && <span className="current-plan-pill">Your plan</span>}</div><h3>{plan.name}</h3><p className="subscription-plan-summary">{plan.summary}</p><div className="subscription-plan-price">{plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : formatNaira(plan.price)}<small>{plan.price === null ? ' pricing' : ` / ${plan.cadence}`}</small></div><strong className="subscription-plan-highlight"><Check size={15} /> {plan.highlight}</strong><div className="subscription-plan-actions"><button type="button" className={plan.key === 'free' ? 'secondary-button' : 'primary-button'} onClick={() => onChoose(plan)} disabled={isCurrent || busyPlan === plan.key}>{isCurrent ? 'Current plan' : busyPlan === plan.key ? 'Opening…' : plan.key === 'free' ? 'Use Free plan' : plan.price === null ? 'Contact for plan' : 'Choose plan'} {busyPlan === plan.key ? null : <ArrowRight size={15} />}</button></div><button type="button" className="subscription-more-button" aria-expanded={expanded} aria-controls={`plan-features-${plan.key}`} onClick={() => onToggle(plan.key)}><span>{expanded ? 'Less' : 'More'}</span><ChevronDown size={15} className={expanded ? 'rotate-180' : ''} /></button><div id={`plan-features-${plan.key}`} className={`subscription-features ${expanded ? 'is-expanded' : ''}`}><div className="eyebrow">WHAT YOU GET</div><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}</ul></div></article>;
}

function SubscriptionView({ user, onBack, onAuthRequired, onDemoAction }) {
  const [expanded, setExpanded] = useState(null);
  const [entitlement, setEntitlement] = useState(null);
  const [busyPlan, setBusyPlan] = useState('');
  useEffect(() => {
    let mounted = true;
    if (!user) { setEntitlement(null); return undefined; }
    Promise.all([fetchSellerEntitlement(), fetchMyListings({ sellerId: user.id, status: 'active' })])
      .then(([access, activeListings]) => {
        if (!mounted) return;
        setEntitlement(withActiveListingUsage(access, activeListings));
      })
      .catch(() => { if (mounted) onDemoAction?.('Could not load your current seller plan. Please try again.'); });
    return () => { mounted = false; };
  }, [user]);
  const choose = async (plan) => { if (plan.key === 'free') { onDemoAction('The Free plan includes 3 active listings.'); return; } if (plan.price === null) { onDemoAction('Enterprise Lux needs a custom business quote.'); return; } if (!user) { onAuthRequired?.(); return; } trackEvent('begin_checkout', { plan_name: plan.key, value: plan.price, currency: 'NGN' }); setBusyPlan(plan.key); try { const checkout = await startPaystackCheckout(plan.key); if (!checkout.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(checkout.authorization_url); } catch (error) { onDemoAction(error.message || 'Could not start Paystack checkout.'); setBusyPlan(''); } };
  return <div className="page-stack subscription-page"><div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Payments & services</span></div><section className="subscription-hero"><div><div className="eyebrow light">BESE26 SELLER PLANS</div><h1>Grow when your business is ready.</h1><p>Start free with 3 active listings, then upgrade when you need more capacity, tools, verification eligibility, or visibility credits.</p></div><span className="subscription-hero-mark"><Sparkles size={22} /></span></section>{user && entitlement && <section className="subscription-usage"><div><div className="eyebrow">YOUR CURRENT ACCESS</div><strong>{entitlement.is_paid ? `${entitlement.plan_key} plan` : 'Free plan'}</strong><span>{`${entitlement.free_posts_used || 0} of ${entitlement.listing_limit} active listings used · ${Math.max((entitlement.listing_limit || 3) - (entitlement.free_posts_used || 0), 0)} remaining`}</span></div><div className="subscription-usage-track"><span style={{ width: `${entitlement.is_paid ? 100 : Math.max(0, (entitlement.free_posts_remaining / entitlement.free_posts_limit) * 100)}%` }} /></div></section>}<div className="subscription-section-heading"><div><div className="eyebrow">SIMPLE START</div><h2>Choose the right level</h2></div><span>Monthly · no hidden balance</span></div><div className="subscription-plan-grid">{subscriptionPlans.map((plan) => <SubscriptionPlanCard plan={plan} key={plan.key} expanded={expanded === plan.key} onToggle={setExpanded} onChoose={choose} currentPlan={entitlement?.is_paid ? entitlement.plan_key : 'free'} busyPlan={busyPlan} />)}</div><p className="subscription-disclaimer"><ShieldCheck size={15} /> Plan access, verification eligibility, and boost credits remain active while the subscription is active. Verification is subject to review and approval. Boosts increase visibility but do not guarantee sales or buyers. Paystack verifies the payment reference, amount, and currency before access is granted.</p></div>;
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

function HomeView({ user, marketListings, adCampaigns = [], onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
  const fallbackPromos = [{ eyebrow: 'B26 FEATURED', title: 'Put your business in front of more buyers.', body: 'Create your public store and share one simple link with customers.', action: 'Set up Business', onAction: () => onNavigate('profile') }, { eyebrow: 'SELL WITH CONFIDENCE', title: 'Your next customer is already browsing.', body: 'List a product with clear photos and let buyers chat safely before they meet.', action: 'List an item', onAction: () => onNavigate('sell') }, { eyebrow: 'PROMOTE YOUR STORE', title: 'Be seen in the places buyers search.', body: 'Featured businesses and sponsored listings will appear here as the marketplace grows.', action: 'Explore businesses', onAction: () => onNavigate('business') }];
  const advertisingSlides = adCampaigns.length ? adCampaigns.map((campaign) => ({ type: 'ad', eyebrow: 'SPONSORED', title: campaign.title, body: campaign.body, action: campaign.cta_label || 'Learn more', image_url: campaign.image_url, onAction: () => { if (campaign.cta_target?.startsWith('http')) window.location.assign(campaign.cta_target); else onNavigate(campaign.cta_target === '/business' ? 'business' : campaign.cta_target === '/sell' ? 'sell' : 'profile'); } })) : fallbackPromos.map((promo) => ({ ...promo, type: 'ad' }));
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const promoSlides = user ? [{ type: 'dashboard', key: 'dashboard' }, ...advertisingSlides] : advertisingSlides;
  const [promoIndex, setPromoIndex] = useState(0);
  useEffect(() => { setPromoIndex(0); }, [user?.id, adCampaigns.length]);
  useEffect(() => { const timer = window.setInterval(() => setPromoIndex((current) => (current + 1) % promoSlides.length), 6000); return () => window.clearInterval(timer); }, [promoSlides.length]);
  const promo = promoSlides[promoIndex];
  return (
    <div className="page-stack home-page">
      <section className={`home-ad-banner ${promo.type === 'dashboard' ? 'home-ad-dashboard dashboard-welcome-card' : `home-ad-slide-${promoIndex}`}`} aria-label={promo.type === 'dashboard' ? 'Your Bese26 dashboard' : 'Featured promotion'}>
        {promo.type === 'dashboard' ? <><div className="dashboard-welcome-copy"><div className="eyebrow">YOUR BESE26 DASHBOARD</div><h1>Good to see you, <span>{displayName}</span>.</h1><p>Pick up where you left off and keep your marketplace moving.</p><div className="dashboard-actions"><button type="button" className="dashboard-primary-action" onClick={() => onNavigate('sell')}><Plus size={15} /> List an item</button><button type="button" className="dashboard-secondary-action" onClick={() => onNavigate('profile')}>View profile <ArrowRight size={15} /></button></div></div><div className="dashboard-orbit-art" aria-hidden="true"><span className="dashboard-orbit dashboard-orbit-one" /><span className="dashboard-orbit dashboard-orbit-two" /><img src="/images/bese26-logo-icon.png" alt="" /></div><div className="dashboard-metrics"><span><strong>{marketListings.length}</strong><small>live listings</small></span><span><strong>{savedIds.length}</strong><small>saved items</small></span><span><strong>100%</strong><small>secure access</small></span></div></> : <><div className="home-ad-copy"><div className="eyebrow light">{promo.eyebrow} <span className="home-ad-sponsored">Sponsored space</span></div><h2>{promo.title}</h2><p>{promo.body}</p><button type="button" className="home-ad-cta" onClick={promo.onAction}>{promo.action} <ArrowRight size={15} /></button></div><div className="home-ad-art" aria-hidden="true"><img src={promo.image_url || "/images/bese26-official-logo.png"} alt="" /></div></>}
        <div className="home-ad-dots" aria-label="Promotion slides">{promoSlides.map((slide, index) => <button type="button" key={slide.key || `${slide.eyebrow}-${index}`} className={index === promoIndex ? 'active' : ''} onClick={() => setPromoIndex(index)} aria-label={`Show promotion ${index + 1}`} />)}</div>
      </section>
      <section className="search-section">
        <div className="search-box home-search">
          <Search size={18} />
          <input aria-label="Search listings" placeholder="Search for products, services and more" onKeyDown={(event) => event.key === 'Enter' && onSearch(event.currentTarget.value)} />
          <button className="search-submit" aria-label="Search" onClick={() => onSearch('')}><Search size={20} /></button>
        </div>
        <div className="location-row"><MapPin size={14} /><span>Showing</span><strong>approved listings</strong><ChevronDown size={14} /></div>
      </section>
      <section className="popular-categories"><SectionHeading eyebrow="START BROWSING" title="Popular near you" action="All categories" onAction={() => onSearch('')} /><div className="popular-category-rail">{[['Phones', Smartphone, 'tone-lavender'], ['Cars', CarFront, 'tone-blue'], ['Property', House, 'tone-sand'], ['Fashion', Shirt, 'tone-pink'], ['Agriculture', Sprout, 'tone-green'], ['Services', Wrench, 'tone-peach'], ['Food', ShoppingBasket, 'tone-gold'], ['Businesses', Store, 'tone-coral']].map(([label, Icon, tone]) => <button type="button" className={`popular-category ${tone}`} key={label} onClick={() => onSearch(label)}><span><Icon size={19} /></span><strong>{label}</strong></button>)}</div></section>

      <section>
        <SectionHeading eyebrow="CURATED FOR YOU" title="Featured listings" action={marketListings.length ? 'View all' : null} onAction={() => onNavigate('search')} />
        {marketListings.length ? <><div className="product-grid">{marketListings.slice(0, 50).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div><button type="button" className="home-view-all-button" onClick={() => onNavigate('search')}>View all listings <ArrowRight size={16} /></button></> : <div className="empty-state"><Package size={25} /><h3>No live listings yet</h3><p>Be one of the first sellers to add a product. New listings appear here after review.</p><div className="empty-state-actions"><button className="primary-button" onClick={() => onNavigate('sell')}><Plus size={15} /> List an item</button><button className="secondary-button" onClick={() => onNavigate('business')}><Store size={15} /> Explore businesses</button></div></div>}
      </section>

      <section className="trust-strip">
        <div className="trust-strip-item"><span className="trust-strip-icon"><ShieldCheck size={16} /></span><span><strong>Verified sellers</strong><small>Trade with more confidence</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-blue"><MessageCircle size={16} /></span><span><strong>Safe conversations</strong><small>Chat before you meet</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-gold"><MapPin size={16} /></span><span><strong>Near you</strong><small>Discover locally</small></span></div>
      </section>

      {marketListings.length > 1 && <section className="recent-section">
        <SectionHeading eyebrow="RECENTLY VIEWED" title="Explore more listings" action="See all" onAction={() => onNavigate('search')} />
        <div className="mini-list recent-list">
          {marketListings.slice(1, 4).map((listing) => <ProductCard key={listing.id} listing={listing} compact onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}
        </div>
      </section>}

      <section className="public-trust-section" aria-label="About Bese26">
        <div className="public-trust-copy"><div className="eyebrow">ABOUT BESE26</div><h2>A trusted Nigerian marketplace for everyday trade.</h2><p>Bese26 connects buyers and sellers for personal and business transactions. Discover products, chat with sellers, and make informed decisions through a secure digital marketplace.</p></div>
        <div className="public-trust-grid"><article id="how-it-works"><strong>How it works</strong><span>Browse approved listings, open the details, and message a seller before you meet.</span></article><article id="safety"><strong>Marketplace safety</strong><span>Use verified profiles, keep conversations on Bese26, and report suspicious listings.</span></article><article id="refunds"><strong>Refunds & support</strong><span>For payment or marketplace concerns, contact our support team for help.</span></article></div>
      </section>
      <section className="public-policy-section" aria-label="Bese26 policies"><div id="terms"><strong>Terms of Service</strong><span>Use Bese26 lawfully, provide accurate information, and respect other marketplace members.</span></div><div id="privacy"><strong>Privacy</strong><span>We use account and listing information to provide marketplace, messaging, safety, and support features.</span></div><div id="refund-policy"><strong>Refund policy</strong><span>Payment concerns are reviewed case by case. Contact <a href="mailto:info@bese26.shop">info@bese26.shop</a> with your reference and details.</span></div></section>

    </div>
  );
}

function SearchView({ marketListings, categories, search, setSearch, onOpenListing, savedIds, onToggleSave, onBack }) {
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
      <div className="back-row"><button className="icon-button" onClick={onBack}><ArrowLeft size={18} /></button><span>Discover listings</span></div>
      <div className="page-title-row"><div><div className="eyebrow">SEARCH & DISCOVER</div><h1>Find something great.</h1></div><div className="results-count">{filtered.length} results</div></div>
      <div className="search-box large-search"><Search size={19} /><input type="search" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phones, cars, Kano…" /><button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search" disabled={!search}><X size={16} /></button></div>
      <div className="filter-toolbar"><div className="filter-toolbar-heading"><strong>Filter by category</strong>{hasFilters && <button type="button" className="clear-filter-button" onClick={clearFilters}>Clear all</button>}</div><div className="filter-scroll"><button type="button" className={activeCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory('All')}>All listings</button>{categories.filter((category) => !category.parent_id).map((category) => <button type="button" key={category.name} className={activeCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}<button type="button" className={`filter-chip verified-filter-chip ${verifiedOnly ? 'active' : ''}`} aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((value) => !value)}><ShieldCheck size={14} /> Verified only</button></div></div>

      <div className="search-result-head"><span>Recommended for you</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Newest</option><option>Price low → high</option><option>Price high → low</option></select></div>
      {filtered.length ? <div className="product-grid search-grid">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div> : <div className="empty-state"><Search size={25} /><h3>{verifiedOnly ? 'No verified sellers found' : 'No listings found'}</h3><p>{verifiedOnly ? 'Try turning off Verified only or choose another category.' : 'Try a different search word or clear the filters.'}</p><button className="primary-button" onClick={clearFilters}>Clear filters</button></div>}
    </div>
  );
}



function SavedView({ marketListings, savedIds, onOpenListing, onToggleSave }) {
  const saved = marketListings.filter((listing) => savedIds.includes(listing.id));
  return <div className="page-stack"><div className="page-title-row"><div><div className="eyebrow">KEEP AN EYE ON IT</div><h1>Saved</h1></div><span className="count-bubble">{saved.length}</span></div>
    <section><SectionHeading title="Saved listings" />{saved.length ? <div className="saved-list">{saved.map((listing) => <div className="saved-row" key={listing.id}><div className="saved-row-media" onClick={() => onOpenListing(listing)}>{listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" decoding="async" /> : <Package size={20} />}</div><div className="saved-row-copy" onClick={() => onOpenListing(listing)}><strong>{listing.title}</strong><span>{listing.location}</span><b>{listing.price}</b></div><button className="save-button saved" aria-label={`Remove ${listing.title} from saved`} onClick={() => onToggleSave(listing.id)}><Heart size={17} fill="currentColor" /></button></div>)}</div> : <div className="empty-state compact-empty"><Bookmark size={24} /><h3>Your shortlist is empty</h3><p>Approved listings you save will appear here.</p></div>}</section>
  </div>;
}



function MessagesView({ user, liveListing, onDemoAction, onAuthRequired, initialMessageId, onSelectConversation, onBackToInbox }) {
  const [conversations, setConversations] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [text, setText] = useState('');
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState('All');
  const [deals, setDeals] = useState({ offers: [], meetings: [] });
  const [dealPanel, setDealPanel] = useState('');
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
  const initialDraft = liveListing?.chatDraft || '';
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const emojis = ['😀', '😂', '😍', '🥰', '👍', '❤️', '✅', '👏', '🔥', '😮', '🙏', '🎉'];
  const selectedConversation = conversations.find((conversation) => conversation.id === initialMessageId) || null;
  const liveMode = Boolean(isSupabaseConfigured && user && selectedConversation);
  const isSeller = Boolean(selectedConversation?.seller_id === user?.id);

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

  useEffect(() => {
    if (selectedConversation && initialDraft) setText((current) => current || initialDraft);
  }, [initialDraft, selectedConversation?.id]);

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
  if (!user) return <div className="page-stack notifications-page messages-guest-page"><section className="notifications-empty"><ShieldCheck size={30} /><div className="eyebrow">PRIVATE CONVERSATIONS</div><h1>Sign in to use Messages</h1><p>Your chats, offers, meeting plans, and attachments stay private to you and the other participant.</p><button className="primary-button" onClick={() => onAuthRequired?.('Sign in to open your private messages.')}>Sign in to continue</button></section></div>;
  if (!selectedConversation) {
    const filteredConversations = conversations.filter((conversation) => {
      const other = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer;
      const name = other?.display_name || 'Bese26 member';
      const title = conversation.listing?.title || 'Marketplace listing';
      const query = messageSearch.trim().toLowerCase();
      const matchesSearch = !query || `${name} ${title}`.toLowerCase().includes(query);
      const isUnanswered = conversation.seller_id === user?.id && !conversation.last_message_at;
      return matchesSearch && (messageFilter === 'All' || (messageFilter === 'Unanswered' && isUnanswered) || messageFilter === 'Unread');
    });
    return <div className="messages-inbox-page"><header className="messages-inbox-header"><div className="messages-inbox-title"><div className="eyebrow">YOUR CONVERSATIONS</div><h1>Messages</h1></div><span className="message-count">{conversations.length}</span></header><div className="messages-search"><Search size={18} /><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search in Messages" aria-label="Search messages" /></div><div className="message-filter-tabs" role="tablist">{['All', 'Unread', 'Unanswered'].map((filter) => <button type="button" role="tab" aria-selected={messageFilter === filter} className={messageFilter === filter ? 'active' : ''} key={filter} onClick={() => setMessageFilter(filter)}>{filter}</button>)}</div>{conversationLoading ? <div className="message-inbox-empty"><MessageCircle size={30} /><strong>Loading conversations…</strong><span>Getting your secure conversations.</span></div> : filteredConversations.length ? <div className="message-inbox-list">{filteredConversations.map((conversation) => { const other = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer; const name = other?.display_name || 'Bese26 member'; const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); return <button key={conversation.id} className="message-inbox-row" type="button" onClick={() => onSelectConversation?.(conversation)}><Avatar initials={initials} tone="rose" size="lg" /><span className="message-inbox-copy"><strong>{name}</strong><b>{conversation.listing?.title || 'Marketplace listing'}</b><small>{conversation.last_message_at ? 'Open your conversation' : 'New conversation'}</small></span><time>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'New'}</time><ChevronRight size={17} /></button>; })}</div> : <div className="message-inbox-empty"><MessageCircle size={30} /><strong>{messageSearch ? 'No matching conversations' : 'No conversations yet'}</strong><span>When you message a seller, the conversation will appear here.</span></div>}</div>;
  }
  const otherProfile = selectedConversation && (selectedConversation.buyer_id === user?.id ? selectedConversation.seller : selectedConversation.buyer);
  const personName = liveMode ? (otherProfile?.display_name || 'bese26 member') : 'Marketplace chat';
  const listingTitle = liveMode ? (selectedConversation.listing?.title || 'Listing no longer available') : 'No listing selected';
  const listingImage = liveMode ? liveListing?.image : null;
  const personInitials = liveMode ? ((otherProfile?.display_name || 'BE').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) : 'BE';
  return <div className={`page-stack messages-page ${liveMode ? 'messages-selected-page' : ''}`}><div className="page-title-row"><div><div className="eyebrow">KEEP IT MOVING</div><h1>Messages</h1></div><span className="messages-workspace-pill">Deal workspace</span></div><div className="message-layout"><div className="conversation-list">{conversationLoading ? <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>Loading conversations</h3><p>Getting your secure conversations.</p></div> : conversations.length ? conversations.map((conversation) => { const other = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer; const name = other?.display_name || 'bese26 member'; return <button key={conversation.id} className={`conversation-row ${conversation.id === initialMessageId ? 'active' : ''}`} type="button" onClick={() => onSelectConversation?.(conversation)}><Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} tone="rose" /><div className="conversation-copy"><strong>{name}</strong><span>{conversation.listing?.title || 'Marketplace listing'}</span></div><div className="conversation-meta"><small>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'New'}</small></div></button>; }) : <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>No conversations yet</h3><p>When you chat with a seller, your messages will appear here.</p></div>}</div><div className="chat-panel"><div className="chat-header"><button type="button" className="chat-back-button" onClick={onBackToInbox} aria-label="Back to messages"><ArrowLeft size={25} /></button><div className="chat-person"><Avatar initials={personInitials} tone="rose" /><div><strong>{personName}{otherProfile?.is_verified && <BadgeCheck size={15} className="chat-verified" />}</strong><span>{liveMode ? 'last seen recently' : 'Marketplace chat'}</span></div></div><div className="chat-header-actions"><button type="button" className="chat-header-icon" aria-label="Call seller" disabled={!liveMode}><Phone size={22} /></button><button type="button" className="chat-header-icon" aria-label="More options" aria-expanded={chatMenuOpen} onClick={() => setChatMenuOpen((value) => !value)}><MoreVertical size={23} /></button></div></div>{chatMenuOpen && <div className="chat-action-menu" role="menu"><button type="button" onClick={() => { setChatMenuOpen(false); onDemoAction?.('Open the listing to view full details.'); }}><Package size={15} /> View listing</button><button type="button" onClick={() => setChatMenuOpen(false)}><BellOff size={15} /> Mute conversation</button><button type="button" onClick={() => { setChatMenuOpen(false); onDemoAction?.('Report tools are ready for this conversation.'); }}><Flag size={15} /> Report conversation</button><button type="button" onClick={() => { setChatMenuOpen(false); onDemoAction?.('Block controls are available from account safety settings.'); }}><ShieldAlert size={15} /> Block user</button></div>}<div className="chat-context">{listingImage ? <img src={listingImage} alt="" /> : <div className="chat-context-placeholder"><Package size={17} /></div>}<div><span>Item details</span><strong>{listingTitle}</strong>{liveListing?.price && <b className="chat-context-price">{liveListing.price}</b>}</div></div>{dealPanel === 'offer' && <form className="deal-form" onSubmit={submitOffer}><strong>Make an offer</strong><small>Keep the price and agreement inside Bese26 chat.</small><input type="number" min="1" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} placeholder="Offer amount in NGN" required /><input value={offerNote} onChange={(event) => setOfferNote(event.target.value)} placeholder="Optional note" maxLength={500} /><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send offer'}</button></div></form>}{dealPanel === 'meeting' && <form className="deal-form safe-meeting-form" onSubmit={submitMeeting}><strong>Plan a safe meeting</strong><small>Choose a public area. Do not share your home address or pay before inspecting the item.</small><label>Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required /></label><label>Time<input type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} required /></label><label>General public area<input value={meetingArea} onChange={(event) => setMeetingArea(event.target.value)} placeholder="e.g. mall, fuel station, or police-approved area" maxLength={120} required /></label><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send meeting plan'}</button></div></form>}{deals.offers.map((offer) => <div className="deal-status-card" key={offer.id}><div><strong>Offer · ₦{Number(offer.amount).toLocaleString('en-NG')}</strong><span>{offer.status}</span></div>{isSeller && offer.status === 'pending' && <div><button type="button" onClick={() => updateOffer(offer, 'accepted')}>Accept</button><button type="button" onClick={() => updateOffer(offer, 'rejected')}>Decline</button></div>}{!isSeller && offer.status === 'pending' && <button type="button" onClick={() => updateOffer(offer, 'cancelled')}>Cancel</button>}</div>)}{deals.meetings.map((meeting) => { const proposedByMe = meeting.proposed_by === user.id; return <div className="deal-status-card meeting-status-card" key={meeting.id}><div><strong>Safe meeting · {meeting.meeting_date} at {String(meeting.meeting_time).slice(0, 5)}</strong><span>{meeting.area} · {meeting.status}</span></div><div>{!proposedByMe && meeting.status === 'proposed' && <><button type="button" onClick={() => updateMeeting(meeting, 'accepted')}>Accept</button><button type="button" onClick={() => updateMeeting(meeting, 'declined')}>Decline</button></>}{proposedByMe && ['proposed', 'accepted'].includes(meeting.status) && <button type="button" onClick={() => updateMeeting(meeting, 'cancelled')}>Cancel</button>}{meeting.status === 'accepted' && <button type="button" onClick={() => updateMeeting(meeting, 'completed')}>Mark complete</button>}</div></div>; })}
  <div className="chat-messages">{liveMode ? (liveLoading ? <div className="chat-empty-note">Loading messages…</div> : liveMessages.length ? liveMessages.map((item) => <div className={`message-bubble ${item.sender_id === user.id ? 'mine' : 'other'}`} key={item.id}>{item.attachment_url && (item.attachment_path?.match(/\.(webm|ogg|mp3|m4a|wav)$/i) ? <audio controls src={item.attachment_url} className="message-audio" /> : item.attachment_path?.match(/\.pdf$/i) ? <a href={item.attachment_url} target="_blank" rel="noreferrer" className="message-file">PDF · Open file</a> : <a href={item.attachment_url} target="_blank" rel="noreferrer"><img src={item.attachment_url} alt="Chat attachment" className="message-image" /></a>)}{item.body && <span>{item.body}</span>}{!item.body && !item.attachment_url && 'Attachment'}<small>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.sender_id === user.id && <Check size={12} />}</small><button type="button" className={`message-reaction ${messageReactions[item.id] ? 'selected' : ''}`} onClick={() => toggleReaction(item.id, messageReactions[item.id] || '👍')} aria-label="React to message">{messageReactions[item.id] || '＋'}</button></div>) : <div className="chat-empty-note">Start the conversation with a clear question about the listing.</div>) : <div className="chat-empty-note">Select a listing to start a real conversation.</div>}</div>{liveMode && <div className="chat-bottom-tools"><div className="chat-safety-note"><ShieldCheck size={14} /><span>Stay safe: inspect before paying. Never share OTPs or PINs.</span></div><div className="chat-quick-actions"><button type="button" onClick={() => setText('Is this listing still available?')}>Available?</button><button type="button" onClick={() => setText('Please share the general location of this item.')}>Location</button><button type="button" onClick={() => setDealPanel('offer')} disabled={isSeller}>Offer</button><button type="button" onClick={() => setDealPanel('meeting')}>Meet safely</button></div></div>}{attachment && <div className="chat-attachment-preview">{attachmentPreview ? <img src={attachmentPreview} alt="Selected preview" /> : <Mic size={16} />}<span>{attachment.name} <small>{Math.ceil(attachment.size / 1024)} KB</small></span><button type="button" onClick={() => { setAttachment(null); setAttachmentPreview(''); }} aria-label="Remove attachment"><X size={15} /></button></div>}{emojiOpen && <div className="emoji-picker" role="dialog" aria-label="Choose an emoji"><div className="emoji-picker-header"><strong>Emojis</strong><button type="button" onClick={() => setEmojiOpen(false)} aria-label="Close emoji picker"><X size={14} /></button></div><div className="emoji-grid">{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => addEmoji(emoji)} aria-label={`Add ${emoji}`}>{emoji}</button>)}</div></div>}<div className="chat-composer"><input id="chat-file-input" className="chat-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/webm,audio/ogg,audio/mpeg" onChange={chooseAttachment} /><label htmlFor="chat-file-input" className="icon-button" aria-label="Attach image or file"><ImageIcon size={18} /></label><button type="button" className={`icon-button chat-record-button ${recording ? 'recording' : ''}`} aria-label={recording ? 'Stop recording' : 'Record voice note'} onClick={recording ? stopRecording : startRecording} disabled={!liveMode || mediaBusy}><Mic size={18} /></button><button type="button" className={`icon-button emoji-toggle ${emojiOpen ? 'active' : ''}`} aria-label="Open emoji picker" onClick={() => setEmojiOpen((value) => !value)} disabled={!liveMode}><span aria-hidden="true">☺</span></button><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={recording ? 'Recording voice note…' : 'Write a message...'} disabled={!liveMode || recording || mediaBusy} /><button className="send-button" onClick={() => send()} disabled={!liveMode || mediaBusy || (!text.trim() && !attachment)}>{mediaBusy ? '…' : <Send size={16} />}</button></div></div></div></div>;
}




function ListingModal({ listing, user, onClose, isSaved, onToggleSave, onDemoAction, onAuthRequired, onStartChat, onEditListing, onOpenListing }) {
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('scam');
  const [reportDetails, setReportDetails] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [quickMessage, setQuickMessage] = useState('');
  const gallery = listing?.gallery?.length ? listing.gallery : listing?.image ? [listing.image] : [];
  const owner = Boolean(user?.id && listing?.sellerId === user.id);
  const raw = listing?.raw || {};
  const description = listing?.description || '';
  const sellerPhone = raw.seller_phone || raw.profiles?.phone || raw.business_profile?.phone || '';
  const whatsapp = raw.seller_whatsapp || raw.profiles?.whatsapp || raw.business_profile?.whatsapp || '';
  const priceType = raw.pricing_type === 'negotiable' ? 'Negotiable' : raw.pricing_type === 'contact' || raw.price == null ? 'Contact for price' : raw.pricing_type === 'on_request' ? 'Price on request' : 'Fixed price';
  const specs = Object.entries(listing?.attributes || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '').map(([key, value]) => ({ key: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), value: Array.isArray(value) ? value.join(', ') : value }));
  const delivery = Array.isArray(listing?.deliveryOptions) ? listing.deliveryOptions.filter(Boolean) : [];
  useEffect(() => { if (!listing) return undefined; setActiveImage(0); setZoomed(false); setExpandedDescription(false); setReportOpen(false); setQuickMessage(''); setLoadingDetails(true); Promise.allSettled([fetchListingReviews(listing.id), fetchSimilarListings(listing)]).then(([reviewResult, similarResult]) => { if (reviewResult.status === 'fulfilled') setReviews(reviewResult.value || []); if (similarResult.status === 'fulfilled') setSimilar(similarResult.value || []); }).finally(() => setLoadingDetails(false)); recordListingView(listing.id).catch(() => {}); return undefined; }, [listing?.id]);
  useEffect(() => { saveListingChatDraft(listing?.id, quickMessage); }, [listing?.id, quickMessage]);
  useEffect(() => { if (!zoomed) return undefined; const onKey = (event) => event.key === 'Escape' && setZoomed(false); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [zoomed]);
  if (!listing) return null;
  const nextImage = () => setActiveImage((current) => gallery.length ? (current + 1) % gallery.length : 0);
  const previousImage = () => setActiveImage((current) => gallery.length ? (current - 1 + gallery.length) % gallery.length : 0);
  const share = async () => { const url = `https://www.bese26.shop/listing/${encodeURIComponent(listing.id)}`; try { if (navigator.share) await navigator.share({ title: `${listing.title} | Bese26`, text: `${listing.title} · ${listing.price}`, url }); else { await navigator.clipboard?.writeText(url); onDemoAction?.('Listing link copied.'); } } catch (error) { if (error.name !== 'AbortError') onDemoAction?.('Could not share this listing.'); } };
  const callSeller = () => { if (!sellerPhone) { onDemoAction?.('The seller has not made a phone number available.'); return; } window.location.href = `tel:${sellerPhone}`; };
  const openWhatsApp = () => { if (!whatsapp) { onDemoAction?.('WhatsApp is not configured for this seller.'); return; } window.open(`https://wa.me/${String(whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, I am interested in ${listing.title}.`)}`, '_blank', 'noopener,noreferrer'); };
  const requestCallback = async () => { if (!user) { onAuthRequired?.('Sign in to request a callback from the seller.'); return; } if (owner) { onDemoAction?.('You cannot request a callback from your own listing.'); return; } setActionBusy(true); try { await requestListingCallback({ listingId: listing.id, requesterId: user.id, sellerId: listing.sellerId, message: `Please call me about ${listing.title}.` }); onDemoAction?.('Callback request sent.'); } catch (error) { onDemoAction?.(error.message || 'Could not request a callback.'); } finally { setActionBusy(false); } };
  const submitReport = async (event) => { event.preventDefault(); if (!user) { onAuthRequired?.('Sign in to report a listing.'); return; } setActionBusy(true); try { await reportListing({ listingId: listing.id, reporterId: user.id, reason: reportReason, details: reportDetails }); setReportOpen(false); setReportDetails(''); onDemoAction?.('Report submitted to Bese26 moderation.'); } catch (error) { onDemoAction?.(error.message || 'Could not submit report.'); } finally { setActionBusy(false); } };
  const manage = async (status) => { if (!user) return; setActionBusy(true); try { await setListingStatus(listing.id, user.id, status); listing.raw.status = status; onDemoAction?.(`Listing ${status === 'active' ? 'resumed' : status}.`); } catch (error) { onDemoAction?.(error.message || 'Could not update listing status.'); } finally { setActionBusy(false); } };
  const remove = async () => { if (!user || !window.confirm('Delete this listing? This cannot be undone.')) return; setActionBusy(true); try { await deleteListing(listing.id, user.id); onClose?.(); onDemoAction?.('Listing deleted.'); } catch (error) { onDemoAction?.(error.message || 'Could not delete listing.'); } finally { setActionBusy(false); } };
  const titleParts = [listing.category, listing.subcategory].filter(Boolean).join(' · ');
  const trustLabel = listing.verified ? 'Verified seller' : 'Seller profile available';
  const trustNote = listing.verified ? 'Identity or business status has been reviewed by Bese26.' : 'Review the seller profile and keep the conversation inside Bese26.';
  const buyerQuestions = ['Is this still available?', 'What is your final price?', 'Can I pick it up today?', 'Do you offer delivery?'];
  return <div className="listing-modal-backdrop" role="dialog" aria-modal="true" aria-label="Listing details" onClick={(event) => event.target === event.currentTarget && onClose?.()}><div className="listing-modal listing-details-premium"><div className="listing-modal-header"><span className="eyebrow">LISTING DETAILS</span><div className="listing-modal-header-actions"><button className="icon-button" onClick={() => onToggleSave?.(listing.id)} aria-label={isSaved ? 'Remove from saved' : 'Save listing'}><Heart size={19} fill={isSaved ? 'currentColor' : 'none'} /></button><button className="icon-button" onClick={onClose} aria-label="Close listing details"><X size={19} /></button></div></div><div className="listing-details-layout"><section className="listing-gallery-panel"><div className="listing-gallery-frame" onTouchStart={(event) => setTouchStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => { if (touchStart == null) return; const delta = event.changedTouches[0].clientX - touchStart; if (Math.abs(delta) > 45) delta < 0 ? nextImage() : previousImage(); setTouchStart(null); }}><button className="gallery-main-button" onClick={() => gallery.length && setZoomed(true)} aria-label="Open fullscreen gallery">{gallery.length ? <img src={gallery[activeImage]} alt={`${listing.title} image ${activeImage + 1}`} /> : <div className="listing-gallery-placeholder"><ImageIcon size={38} /><span>No photos available</span></div>}</button>{gallery.length > 1 && <><button className="gallery-control gallery-control-prev" onClick={previousImage} aria-label="Previous listing photo"><ArrowLeft size={18} /></button><button className="gallery-control gallery-control-next" onClick={nextImage} aria-label="Next listing photo"><ArrowRight size={18} /></button></>}<span className="modal-image-count">{gallery.length ? `${activeImage + 1} / ${gallery.length}` : 'No image'}</span><button className="image-zoom-button" onClick={() => gallery.length && setZoomed(true)} aria-label="View fullscreen"><ZoomIn size={17} /></button></div>{gallery.length > 1 && <div className="modal-gallery-thumbs">{gallery.map((image, index) => <button key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`View listing photo ${index + 1}`}><img loading={index > 2 ? 'lazy' : undefined} src={image} alt="" /></button>)}</div>}</section><section className="listing-detail-body"><div className="listing-location-line"><MapPin size={16} /> {listing.location}{listing.posted && <><span>·</span>{listing.posted}</>}{raw.updated_at && <span>· Updated {new Date(raw.updated_at).toLocaleDateString('en-NG')}</span>}</div><h1>{listing.title}</h1><div className="listing-price-row"><div className="listing-detail-price">{listing.price}</div><span className="listing-pricing-type">{priceType}</span></div><div className="listing-detail-meta"><span>{listing.condition}</span>{titleParts && <span>{titleParts}</span>}<span>{Number(raw.views_count || 0)} views</span></div><section className="trust-summary-card"><div className="trust-summary-heading"><div className="trust-summary-icon"><ShieldCheck size={19} /></div><div><strong>{trustLabel}</strong><span>{trustNote}</span></div></div><div className="trust-summary-grid"><span><b>{listing.sellerRating > 0 ? `${listing.sellerRating.toFixed(1)}/5` : "New"}</b> seller rating</span><span><b>{listing.location || "Local"}</b> meeting area</span><span><b>{Number(raw.views_count || 0)}</b> real views</span></div></section><div className="listing-primary-actions"><button className="callback-contact-button" onClick={requestCallback} disabled={actionBusy}><Phone size={18} /> Request callback</button><button className="primary-contact-button" onClick={callSeller} disabled={!sellerPhone}><Phone size={18} /> Call</button><button className="secondary-contact-button" onClick={openWhatsApp} disabled={!whatsapp}><MessageCircle size={18} /> WhatsApp</button><button className="secondary-contact-button" onClick={() => onStartChat?.(listing)}><MessageCircle size={18} /> Message Seller</button><button className="secondary-contact-button" onClick={() => onStartChat?.(listing)}><Tag size={18} /> Make an offer</button></div><section className="listing-inline-chat"><div><div className="eyebrow">CHAT WITH THE SELLER</div><h2>Ask about this listing</h2></div><div className="listing-question-pills"><button type="button" onClick={() => setQuickMessage('Is this still available?')}>Is this available?</button><button type="button" onClick={() => setQuickMessage('What is your final price?')}>Last price</button><button type="button" onClick={() => setQuickMessage('Can I pick it up today?')}>Pickup today</button></div><textarea value={quickMessage} onChange={(event) => setQuickMessage(event.target.value)} placeholder="Write your message here" maxLength={500} /><button type="button" className="listing-start-chat" onClick={() => onStartChat?.(listing)}>Start chat <ArrowRight size={16} /></button></section><section className="listing-question-card"><div><div className="eyebrow">NOT SURE WHAT TO ASK?</div><h2>Start with a simple question</h2><p>Open a protected Bese26 conversation and ask the seller directly.</p></div><div className="listing-question-pills">{buyerQuestions.map((question) => <button type="button" key={question} onClick={() => onStartChat?.(listing)}>{question}</button>)}</div></section><section className="safe-deal-card"><div><ShieldCheck size={18} /><div><strong>Safe Deal checklist</strong><p>Keep payment and questions in Bese26 chat. Meet in a busy public place and inspect the item before paying.</p></div></div><button type="button" onClick={() => onStartChat?.(listing)}>Start a safe deal <ArrowRight size={16} /></button></section><section className="listing-info-card"><div className="listing-section-heading"><h2>Listing details</h2><span>{loadingDetails ? 'Loading…' : `${specs.length} details`}</span></div>{specs.length ? <div className="listing-spec-grid">{specs.map((item) => <div key={item.key}><span>{item.key}</span><strong>{String(item.value)}</strong></div>)}</div> : <p>No additional category attributes were provided.</p>}</section><section className="listing-info-card"><h2>Description</h2><p className={`listing-description listing-description-card ${!expandedDescription && description.length > 500 ? 'is-collapsed' : ''}`}>{description || 'The seller has not added a description yet.'}</p>{description.length > 500 && <button className="text-action" onClick={() => setExpandedDescription((value) => !value)}>{expandedDescription ? 'Show less' : 'Read more'}</button>}</section>{delivery.length > 0 && <section className="listing-info-card"><h2>Delivery</h2><div className="listing-delivery-list">{delivery.map((item) => <span key={String(item)}>{String(item).replaceAll('_', ' ')}</span>)}</div></section>}<section className="seller-profile-card"><div className="seller-profile-heading"><img className="seller-card-avatar" src={listing.sellerAvatar} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><div><strong>{listing.sellerDisplayName || listing.seller}</strong><span>{listing.sellerBusinessName ? <><Store size={14} /> {listing.sellerBusinessName} · Business</> : 'Personal seller'} {listing.verified && <span className="verified-badge"><BadgeCheck size={12} /> Verified</span>}</span><small>{listing.sellerRating > 0 ? `${listing.sellerRating.toFixed(1)} rating` : 'No rating yet'} · Member since {raw.profiles?.created_at ? new Date(raw.profiles.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : 'Bese26 member'}</small></div></div><div className="listing-detail-actions"><button onClick={() => listing.sellerBusinessHandle ? window.location.assign(`/@${listing.sellerBusinessHandle}`) : listing.sellerId ? window.location.assign(`/${raw.profiles?.username || listing.sellerId}`) : onDemoAction?.('Seller profile is not public yet.')}>View profile <ChevronRight size={17} /></button>{listing.sellerBusinessHandle && <button onClick={() => window.location.assign(`/@${listing.sellerBusinessHandle}`)}><Store size={16} /> View store</button>}<button onClick={share}><Share2 size={16} /> Share</button><button className="report-action" onClick={() => setReportOpen(true)}>Report</button></div></section><section className="listing-info-card"><div className="listing-section-heading"><h2>Feedback about seller</h2><span>{reviews.length} review{reviews.length === 1 ? '' : 's'}</span></div>{reviews.length ? reviews.map((review) => <div className="review-row" key={review.id}><strong>{review.reviewer?.display_name || 'Buyer'}</strong><span>{'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))} · {new Date(review.created_at).toLocaleDateString('en-NG')}</span><p>{review.body || 'No written review.'}</p></div>) : <p>No published reviews yet.</p>}</section>{similar.length > 0 && <section className="listing-info-card"><h2>Similar listings</h2><div className="listing-similar-grid">{similar.map((item) => <button key={item.id} onClick={() => onOpenListing?.(item)}><strong>{item.title}</strong><span>{item.price} · {item.location}</span></button>)}</div></section>}{owner && <section className="listing-owner-controls"><div><strong>Manage your listing</strong><span>{Number(raw.views_count || 0)} real views · status: {raw.status || 'active'}</span></div><div><button onClick={() => onEditListing?.(listing)}>Edit listing</button><button disabled={actionBusy} onClick={() => manage(raw.status === 'paused' ? 'active' : 'paused')}>{raw.status === 'paused' ? 'Resume' : 'Pause'}</button><button disabled={actionBusy} onClick={() => manage('sold')}>Mark sold</button><button disabled={actionBusy} onClick={remove}>Delete</button></div></section>}</section></div></div>{zoomed && <div className="listing-gallery-lightbox" role="dialog" aria-label="Fullscreen listing gallery" onClick={() => setZoomed(false)}><button className="icon-button lightbox-close" onClick={() => setZoomed(false)} aria-label="Close fullscreen"><X size={20} /></button>{gallery.length > 1 && <button className="gallery-control gallery-control-prev" onClick={(event) => { event.stopPropagation(); previousImage(); }} aria-label="Previous photo"><ArrowLeft size={20} /></button>}<img src={gallery[activeImage]} alt={`${listing.title} fullscreen image ${activeImage + 1}`} onClick={(event) => event.stopPropagation()} />{gallery.length > 1 && <button className="gallery-control gallery-control-next" onClick={(event) => { event.stopPropagation(); nextImage(); }} aria-label="Next photo"><ArrowRight size={20} /></button>}</div>}{reportOpen && <div className="listing-report-overlay" role="dialog" aria-label="Report listing" onClick={(event) => event.target === event.currentTarget && setReportOpen(false)}><form className="listing-report-card" onSubmit={submitReport}><button type="button" className="icon-button" onClick={() => setReportOpen(false)} aria-label="Close report"><X size={18} /></button><h2>Report listing</h2><label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>{['scam', 'fake_product', 'counterfeit', 'prohibited_item', 'wrong_information', 'fake_identity', 'harassment', 'suspicious_activity', 'other'].map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label><label>Details<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1500} placeholder="Tell Bese26 moderation what happened" /></label><button className="primary-button" disabled={actionBusy}>{actionBusy ? 'Submitting…' : 'Submit report'}</button></form></div>}</div>;
}

function PublicListingCard({ listing }) {
  return <a className="product-card public-listing-card" href={`/listing/${encodeURIComponent(listing.id)}`}><div className="product-image-wrap">{listing.image ? <img src={listing.image} alt={listing.title} className="product-image" loading="lazy" decoding="async" /> : <div className="product-image-placeholder"><Package size={26} /></div>}</div><div className="product-info"><div className="product-price">{listing.price}</div><h3>{listing.title}</h3><div className="product-meta"><MapPin size={13} /> {listing.location}</div><div className="product-foot"><span>{listing.condition}</span><span>{listing.posted}</span></div><span className="public-card-action">View listing <ArrowRight size={14} /></span></div></a>;
}
function PublicProfileHeader({ profile, business, listings, share }) {
  const isBusiness = Boolean(business);
  const name = business?.business_name || profile?.display_name || 'Bese26 seller';
  const handle = business?.business_handle || profile?.username;
  const location = business
    ? formatPublicBusinessLocation(business)
    : [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ');
  const avatar = business?.logo_path || profile?.avatar_path;
  const description = business?.description || profile?.bio;
  return <section className="public-business-hero storefront-hero-clean"><div className="public-business-logo">{avatar ? <img src={getAvatarUrl(avatar)} alt={`${name} profile`} /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div><div className="public-business-identity"><div className="eyebrow">{isBusiness ? 'PUBLIC BUSINESS' : 'PUBLIC SELLER PROFILE'}</div><h1>{name}</h1>{handle && <strong className="public-business-handle">@{handle}</strong>}{(business?.is_verified || profile?.is_verified) && <span className="verified-badge"><BadgeCheck size={13} /> {business?.is_verified ? 'Verified business' : 'Verified seller'}</span>}<p>{description || 'This seller has not added a description yet.'}</p><span className="public-business-location"><MapPin size={14} /> {location || 'Nigeria'}</span><div className="public-business-actions">{business?.phone && <a className="primary-button" href={`tel:${business.phone}`}><Phone size={15} /> Call</a>}{listings[0] && <a className="secondary-button" href={`/?chat_listing=${listings[0].id}`}><MessageCircle size={15} /> Message</a>}<button type="button" className="secondary-button" onClick={share}>Share</button></div></div></section>;
}
function PublicListingSection({ title, listings }) {
  return <section id="listings" className="public-business-listings storefront-listings-clean"><div className="section-heading"><div><div className="eyebrow">AVAILABLE NOW</div><h2>{title}</h2></div><span>{listings.length} listing{listings.length === 1 ? '' : 's'}</span></div>{listings.length ? <div className="product-grid">{listings.map((listing) => <PublicListingCard key={listing.id} listing={listing} />)}</div> : <div className="empty-state"><Package size={26} /><h3>No active listings yet</h3><p>Approved listings from this profile will appear here automatically.</p></div>}</section>;
}
function PublicBusinessAbout({ business }) {
  const hours = getBusinessHoursRows(business?.business_hours);
  const location = formatPublicBusinessLocation(business);
  const services = [business?.delivery_available && 'Delivery available', business?.pickup_available && 'Pickup available'].filter(Boolean);
  return <section className="public-business-about" aria-labelledby="about-store-title"><div className="public-about-heading"><div><div className="eyebrow">ABOUT THE STORE</div><h2 id="about-store-title">About this store</h2></div><Store size={20} /></div><p className="public-about-description">{business?.description || 'Not available'}</p><div className="public-about-grid"><div className="public-about-item"><MapPin size={16} /><span><b>Location</b>{location || 'Not available'}</span></div><div className="public-about-item"><Tag size={16} /><span><b>Category</b>{business?.category || business?.business_type || 'Not available'}</span></div><div className="public-about-item"><Package size={16} /><span><b>Services</b>{services.length ? services.join(' · ') : 'Not available'}</span></div>{hours.length > 0 && <div className="public-about-item public-about-hours"><Clock3 size={16} /><span><b>Opening hours</b>{hours.slice(0, 3).map((row) => <em key={row.key}>{row.label}: {row.value}</em>)}</span></div>}</div>{business?.website && <a className="public-about-link" href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noreferrer">Visit store website <ArrowUpRight size={14} /></a>}</section>;
}
function PublicStorefrontLayout({ title, share, children }) {
  useEffect(() => { document.title = `${title} | Bese26`; return () => { document.title = 'bese26 — Buy and sell with confidence'; }; }, [title]);
  return <div className="public-business-shell"><header className="public-business-topbar"><a href="https://www.bese26.shop/" className="public-brand"><img className="public-brand-logo" src="/images/bese26-logo-icon.png" alt="Bese26" /><strong>Bese26<span>.shop</span></strong></a><nav className="public-business-nav" aria-label="Public shop navigation"><a href="https://www.bese26.shop/">Marketplace</a><a href="#listings">Listings</a></nav><button type="button" className="secondary-button public-share-button" onClick={share}><Share2 size={15} /> Share shop</button></header><main className="public-business-main">{children}</main><footer className="public-business-footer"><strong>Bese26<span>.shop</span></strong><span>Trusted local buying and selling</span></footer></div>;
}
function PublicPersonalPage({ data }) {
  const { profile, listings } = data;
  const share = async () => { const url = `https://www.bese26.shop/@${profile.username}`; if (navigator.share) await navigator.share({ title: profile.display_name, text: profile.bio || profile.display_name, url }); else await navigator.clipboard?.writeText(url); };
  return <PublicStorefrontLayout title={profile.display_name} share={share}><PublicProfileHeader profile={profile} listings={listings} share={share} /><PublicListingSection title={`Listings by ${profile.display_name}`} listings={listings} /></PublicStorefrontLayout>;
}
function PublicBusinessPage({ handle }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => { let mounted = true; fetchPublicBusiness(handle).then((data) => data || fetchPublicProfile(handle)).then((data) => mounted && setState({ loading: false, data, error: '' })).catch((error) => mounted && setState({ loading: false, data: null, error: error.message || 'Unable to load this public profile.' })); return () => { mounted = false; }; }, [handle]);
  if (state.loading) return <div className="public-business-shell"><div className="route-loading">Loading public shop…</div></div>;
  if (state.error || !state.data) return <div className="public-business-shell"><section className="public-business-not-found"><div className="brand-mark">B</div><div className="eyebrow">BESE26 SHOP</div><h1>Shop not found</h1><p>This public shop does not exist, is inactive, or has no public profile.</p><a className="primary-button" href="https://www.bese26.shop/">Back to Bese26 <ArrowRight size={16} /></a></section></div>;
  if (state.data.profile) { const { profile, listings } = state.data; return <PublicPersonalPage data={{ profile, listings }} />; }
  const { business, ownerProfile, listings } = state.data;
  const share = async () => { const url = `https://www.bese26.shop/@${business.business_handle}`; if (navigator.share) await navigator.share({ title: business.business_name, text: business.description || business.business_name, url }); else await navigator.clipboard?.writeText(url); };
  return <PublicStorefrontLayout title={business.business_name} share={share}><PublicProfileHeader business={business} profile={ownerProfile} listings={listings} share={share} /><PublicBusinessAbout business={business} /><PublicListingSection title={`Listings from ${business.business_name}`} listings={listings} /></PublicStorefrontLayout>;
}
function PublicListingRoute({ listingId }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let mounted = true; fetchListingDetails(listingId).then((data) => mounted && setListing(data)).catch(() => mounted && setListing(null)).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [listingId]);
  useEffect(() => { if (!listing) return undefined; const previous = { title: document.title, description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '' }; document.title = `${listing.title} | Bese26`; let description = document.querySelector('meta[name="description"]'); if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.appendChild(description); } description.content = `${listing.title} — ${listing.price} in ${listing.location}. View details on Bese26.`; let canonical = document.querySelector('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); } canonical.href = `https://www.bese26.shop/listing/${encodeURIComponent(listing.id)}`; const tags = [['og:title', `${listing.title} | Bese26`], ['og:description', description.content], ['og:image', listing.image || `https://www.bese26.shop/images/bese26-official-logo.png`], ['og:url', canonical.href], ['twitter:card', 'summary_large_image'], ['twitter:title', `${listing.title} | Bese26`], ['twitter:description', description.content]]; tags.forEach(([name, content]) => { const selector = name.startsWith('og:') ? `meta[property="${name}"]` : `meta[name="${name}"]`; let tag = document.querySelector(selector); if (!tag) { tag = document.createElement('meta'); tag.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(tag); } tag.content = content; }); return () => { document.title = previous.title; if (description) description.content = previous.description; }; }, [listing]);
  if (loading) return <BrandLoader message="Loading listing…" compact />;
  if (!listing) return <div className="empty-state listing-not-found"><Package size={30} /><h1>Listing not found</h1><p>This listing is no longer available or is not public.</p><a className="primary-button" href="/">Back to Bese26</a></div>;
  return <ListingModal listing={listing} onClose={() => window.location.assign('/')} onDemoAction={(message) => window.alert(message)} onStartChat={() => window.location.assign(`/?chat_listing=${listing.id}`)} />;
}

function BusinessDirectoryView({ onBack }) {
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
  const clearSearch = () => { setQuery(''); loadBusinesses(); };
  return <div className="page-stack business-directory-page">
    <div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Business directory</span></div>
    <section className="business-directory-hero"><div><div className="eyebrow light">BESE26 MINIWEBS</div><h1>Find a business</h1><p>Browse public miniwebs created by Bese26 sellers and open the store you need.</p></div><Store size={28} /></section>
    <section className="business-directory-controls" aria-label="Business directory controls">
      <form className="business-directory-search" onSubmit={submitSearch}><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by business, category or city" aria-label="Search businesses" />{query && <button className="business-directory-clear" type="button" onClick={clearSearch} aria-label="Clear business search"><X size={16} /></button>}<button className="search-submit" type="submit">Search</button></form>
      {!loading && !error && <div className="business-directory-summary"><div><strong>{businesses.length}</strong><span>{businesses.length === 1 ? 'public business' : 'public businesses'}</span></div><small>Listed alphabetically</small></div>}
    </section>
    {error && <div className="auth-status error"><AlertCircle size={15} /> {error}</div>}
    {loading ? <BrandLoader message="Loading public miniwebs…" compact /> : businesses.length ? <div className="business-directory-grid">{businesses.map((business) => { const name = business.business_name || 'Bese26 business'; const handle = business.business_handle; const location = [business.city, business.state].filter(Boolean).join(', '); return <article className="business-directory-card" key={business.profile_id || handle}><div className="business-directory-logo">{business.logo_path ? <img src={getAvatarUrl(business.logo_path)} alt={`${name} logo`} loading="lazy" decoding="async" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div><div className="business-directory-copy"><div className="business-directory-title"><h2>{name}{business.is_verified && <BadgeCheck className="business-verified-icon" size={16} aria-label="Verified business" />}</h2><span className="business-directory-handle">@{handle}</span></div><div className="business-directory-meta">{business.category && <span><Tag size={13} aria-hidden="true" />{business.category}</span>}{location && <span><MapPin size={13} aria-hidden="true" />{location}</span>}</div><p>{business.description || 'Visit this Bese26 miniweb to see the business and its available listings.'}</p><div className="business-directory-services">{business.delivery_available && <span>Delivery available</span>}{business.pickup_available && <span>Pickup available</span>}</div></div><a className="primary-button business-directory-open" href={`/@${handle}`} aria-label={`Open ${name} miniweb`}>Open miniweb <ArrowUpRight size={15} aria-hidden="true" /></a></article>; })}</div> : <div className="empty-state"><Store size={28} /><h2>No public miniwebs found</h2><p>Try another business name, category or city.</p>{query && <button type="button" className="secondary-button" onClick={clearSearch}>Show all businesses</button>}</div>}
  </div>;
}

function AppContent() {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    const canonicalUrl = `https://www.bese26.shop${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(canonicalUrl);
    return <BrandLoader message="Opening Bese26…" compact />;
  }
  const publicHandle = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1] || window.location.pathname.match(/^\/?(?:business|store|miniweb)\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1] || new URLSearchParams(window.location.search).get('business'))?.toLowerCase() : null;
  const publicListingId = typeof window !== 'undefined' ? (window.location.pathname.match(/^\/?listing\/([^/]+)\/?$/i)?.[1] || new URLSearchParams(window.location.search).get('listing') || new URLSearchParams(window.location.search).get('listing_id')) : null;
  if (publicListingId) return <PublicListingRoute listingId={publicListingId} />;
  if (publicHandle) return <PublicBusinessPage handle={publicHandle} />;
  const [activeNav, setActiveNav] = useState('home');
  const [savedIds, setSavedIds] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState('');
  const [profileReset, setProfileReset] = useState(0);
  const [chatTargetId, setChatTargetId] = useState(null);
  const [marketListings, setMarketListings] = useState([]);
  const [marketCategories, setMarketCategories] = useState([]);
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [businessOwnerProfile, setBusinessOwnerProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [chatListing, setChatListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const ownerAdminEmail = 'smbabanbaba@gmail.com';
  const canAccessAdmin = Boolean(isAdmin || sessionUser?.email?.toLowerCase() === ownerAdminEmail);

  // Always start the marketplace shell on Home; only explicit deep links may open another view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('business_dashboard')) setActiveNav('business');
    else if (!params.has('chat_listing') && !params.has('reference') && !params.has('payment')) setActiveNav('home');
  }, []);

  const showToast = useCallback((message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); }, []);
  const requireAuth = useCallback((message = 'Sign in to continue with your marketplace account.') => { setAuthReason(message); setShowAuth(true); }, []);  useEffect(() => {
    let mounted = true;
    if (!sessionUser) { setUnreadNotifications(0); setBusinessOwnerProfile(null); return undefined; }
    fetchNotifications(sessionUser.id).then((rows) => mounted && setUnreadNotifications((rows || []).filter((item) => !item.read_at).length)).catch(() => {});
    if (isSupabaseConfigured) getBusinessProfile(sessionUser.id).then((profile) => mounted && setBusinessOwnerProfile(profile)).catch(() => mounted && setBusinessOwnerProfile(null));
    return () => { mounted = false; };
  }, [sessionUser]);

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
    const loadBackend = async () => {
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;
        // Establish auth UI state before loading optional marketplace data. A
        // listings/categories error must never make a successful login look
        // like it failed.
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
        if (mounted) showToast(error.message || 'Could not restore your session.');
      }
      try {
        const [remoteListings, remoteCategories, remoteAds] = await Promise.all([fetchActiveListings(), fetchCategories(), fetchActiveAdCampaigns()]);
        if (mounted) {
          setMarketListings(remoteListings || []);
          setMarketCategories(remoteCategories || []);
          setAdCampaigns(remoteAds || []);
        }
      } catch (error) {
        if (mounted) showToast(error.message || 'Could not load live marketplace data.');
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
    };
    loadBackend();
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
      if (event === 'SIGNED_OUT') { setSavedIds([]); setIsAdmin(false); setSelectedListing(null); setChatListing(null); setChatTargetId(null); setEditingListing(null); setSearch(''); setActiveNav('home'); loadBackend(); }
    });
    return () => { mounted = false; window.clearInterval(refreshTimer); document.removeEventListener('visibilitychange', refreshWhenVisible); window.removeEventListener('focus', refreshWhenFocused); subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!sessionUser || !isSupabaseConfigured) return undefined;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (!reference || window.sessionStorage.getItem(`bese26-verified:${reference}`)) return undefined;
    window.sessionStorage.setItem(`bese26-verified:${reference}`, 'pending');
    verifyPaystackPayment(reference).then((result) => {
      if (result.successful) showToast(`Your ${result.planKey} plan is active.`);
      else showToast(result.message || 'Payment is still being confirmed.');
      window.sessionStorage.setItem(`bese26-verified:${reference}`, result.successful ? 'complete' : 'pending');
    }).catch((error) => { window.sessionStorage.removeItem(`bese26-verified:${reference}`); showToast(error.message || 'Could not verify the payment yet.'); });
    params.delete('reference');
    params.delete('payment');
    const nextQuery = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
    return undefined;
  }, [sessionUser]);
  useEffect(() => { initAnalytics(); }, []);
  useEffect(() => { trackPageView(`${window.location.pathname}#${activeNav}`); }, [activeNav]);
  const navigate = (page) => { if (page !== 'sell') setEditingListing(null); if (page === 'sell') trackEvent('open_sell'); if (page === 'subscription') trackEvent('view_pricing'); if (page === 'profile' && activeNav === 'profile') setProfileReset((value) => value + 1); setActiveNav(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPublicSection = (section) => { trackEvent('view_public_policy', { policy: section }); setActiveNav(`public-${section}`); setEditingListing(null); window.scrollTo({ top: 0, behavior: 'smooth' }); window.history.replaceState({}, '', `/#${section}`); };
  const goSearch = (value) => { setSearch(value); trackEvent('search', { search_term: value }); navigate('search'); };
  const openListing = (listing) => {
    trackEvent('view_listing', { listing_id: listing?.id, listing_category: listing?.category });
    setSelectedListing(listing);
    if (sessionUser?.id) recordRecentlyViewed(sessionUser.id, listing.id).catch(() => {});
    fetchListingDetails(listing.id).then((details) => {
      if (details) setSelectedListing((current) => current?.id === listing.id ? details : current);
    }).catch(() => {});
  };
  const openChat = async (listing) => {
    if (isSupabaseConfigured && !sessionUser) { setSelectedListing(null); requireAuth('Sign in to chat with this seller.'); return; }
    if (!isSupabaseConfigured) { showToast('Chat is unavailable until the marketplace database is connected.'); return; }
    if (!listing.sellerId || listing.sellerId === sessionUser.id) { showToast('This listing is not available for a buyer conversation.'); return; }
    try {
      const conversation = await getOrCreateConversation({ listingId: listing.id, buyerId: sessionUser.id, sellerId: listing.sellerId });
      setSelectedListing(null);
      const chatDraft = takeListingChatDraft(listing.id);
      setChatListing({ ...listing, chatDraft });
      showToast(`Chat opened for ${listing.title}`);
      setChatTargetId(conversation.id);
      navigate('messages');
    } catch (error) { showToast(error.message || 'Could not open the seller chat.'); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('chat_listing');
    if (!listingId) return;
    if (isSupabaseConfigured && !sessionUser) { requireAuth('Sign in to message this business.'); return; }
    fetchListingDetails(listingId).then((listing) => {
      if (!listing) throw new Error('This listing is no longer available.');
      params.delete('chat_listing');
      const nextQuery = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`);
      return openChat(listing);
    }).catch((error) => showToast(error.message || 'Could not open the business message.'));
  }, [sessionUser]);

  const [showStartupLoader, setShowStartupLoader] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setShowStartupLoader(false), 2000); return () => window.clearTimeout(timer); }, []);
  if (showStartupLoader) return <SplashScreen />;

  const renderView = () => {
    if (activeNav.startsWith('public-')) return <PublicInfoPage page={activeNav.slice(7)} onBack={() => navigate('home')} />;
    if (activeNav === 'home') return <HomeView user={sessionUser} adCampaigns={adCampaigns} marketListings={marketListings} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} />;
    if (activeNav === 'search') return <SearchView marketListings={marketListings} categories={marketCategories} search={search} setSearch={setSearch} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={() => navigate('home')} />;
    if (activeNav === 'notifications') return <NotificationsView user={sessionUser} onAuthRequired={() => requireAuth('Login to view notifications.')} onBack={() => navigate('home')} onNotice={showToast} onNavigate={navigate} />;
    if (activeNav === 'saved') return <SavedView marketListings={marketListings} savedIds={savedIds} onOpenListing={openListing} onToggleSave={toggleSave} />;
    if (activeNav === 'wallet') return <UnavailableView icon={WalletCards} eyebrow="WALLET" title="Wallet is coming soon" description="Wallet, payments, and transactions are not connected yet. No balance or transaction data is shown until the real service is ready." onBack={() => navigate('home')} />;
    if (activeNav === 'subscription') return <SubscriptionView user={sessionUser} onBack={() => navigate('profile')} onAuthRequired={() => requireAuth('Sign in to view your seller plan.')} onDemoAction={showToast} />;
    if (activeNav === 'business') return <BusinessDirectoryView onBack={() => navigate('home')} />;
    if (activeNav === 'sell') return <SellView user={sessionUser} initialListing={editingListing} initialDraft={editingDraft} onAuthRequired={() => requireAuth('Sign in before posting a listing.')} onDemoAction={showToast} onNavigate={navigate} onOpenSubscription={() => navigate('subscription')} />;
    if (activeNav === 'messages') return <MessagesView user={sessionUser} liveListing={chatListing} onDemoAction={showToast} onAuthRequired={(message) => requireAuth(message)} initialMessageId={chatTargetId} onSelectConversation={(conversation) => { setChatTargetId(conversation.id); setChatListing(null); }} onBackToInbox={() => setChatTargetId(null)} />;
    if (activeNav === 'admin') return canAccessAdmin ? <AdminView user={sessionUser} onBack={() => navigate('profile')} onNotice={showToast} onCreateListing={() => { setEditingDraft(null); setEditingListing(null); navigate('sell'); }} /> : <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => { setEditingDraft(null); navigate('sell'); }} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={false} onOpenAdmin={() => {}} onOpenSubscription={() => navigate('subscription')} />;
    return <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => { setEditingDraft(null); navigate('sell'); }} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={canAccessAdmin} onOpenAdmin={() => navigate('admin')} onOpenSubscription={() => navigate('subscription')} />;
  };

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`}>
    <main className="main-container"><AppErrorBoundary key={activeNav}><Suspense fallback={<BrandLoader message="Loading page…" compact />}>{renderView()}</Suspense></AppErrorBoundary></main>
    <footer className="site-footer"><div><strong>Bese26<span>.shop</span></strong><p>Nigerian online marketplace for personal and business transactions.</p></div><nav aria-label="Public information"><a href="/#terms" onClick={(event) => { event.preventDefault(); goPublicSection('terms'); }} title="Read Terms of Service">Terms</a><a href="/#privacy" onClick={(event) => { event.preventDefault(); goPublicSection('privacy'); }} title="Read Privacy Policy">Privacy</a><a href="/#refund-policy" onClick={(event) => { event.preventDefault(); goPublicSection('refund-policy'); }} title="Read Refund Policy">Refunds</a><a href="/#safety" onClick={(event) => { event.preventDefault(); goPublicSection('safety'); }} title="Read Marketplace Safety">Safety</a><a href="mailto:info@bese26.shop?subject=Bese26%20Support" title="Email Bese26 support">info@bese26.shop</a></nav></footer>
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ key, label, icon: Icon }) => <button key={key} aria-current={activeNav === key ? 'page' : undefined} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} />{key === 'notifications' && unreadNotifications > 0 && <b className="nav-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</b>}</span><span>{label}</span></button>)}</nav>

    {showAuth && <AuthPanel reason={authReason} onClose={() => setShowAuth(false)} onAuthenticated={(user) => { setSessionUser(user); setAuthReason(''); showToast('Signed in to bese26.'); }} />}
    <ListingModal listing={selectedListing} user={sessionUser} onClose={() => setSelectedListing(null)} onAuthRequired={requireAuth} isSaved={selectedListing ? savedIds.includes(selectedListing.id) : false} onToggleSave={toggleSave} onDemoAction={showToast} onStartChat={openChat} onOpenListing={openListing} onEditListing={(item) => { setSelectedListing(null); setEditingListing(item); navigate('sell'); }} />
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}


export default function App() {
  return <AppErrorBoundary><AppContent /></AppErrorBoundary>;
}
