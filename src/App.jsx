import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
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
const AdminView = lazyWithRetry(() => import('./components/AdminView'), 'admin');
const SellView = lazyWithRetry(() => import('./components/SellView'), 'sell');
import AuthPanel from './components/AuthPanel';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { createChatMeeting, createChatOffer, deleteListing, fetchActiveListings, fetchBusinessDirectory, fetchCategories, fetchConversationDeals, fetchPublicBusiness, fetchPublicProfile, fetchSavedIds, fetchConversations, fetchMessages, fetchListingDetails, fetchListingReviews, fetchSellerEntitlement, fetchSimilarListings, getFollowState, getOrCreateConversation, isAdminUser, recordListingView, recordRecentlyViewed, requestListingCallback, reportListing, sendMessage, setListingStatus, signOut, startPaystackCheckout, subscribeToMessages, toggleFavorite, toggleFollow, updateChatMeeting, updateChatOffer, updateListing, verifyPaystackPayment } from './lib/marketplace';

class AppErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Bese26 UI error', error, info); }
  retry = () => this.setState({ hasError: false, error: null });
  render() {
    if (!this.state.hasError) return this.props.children;
    const message = this.state.error?.message || 'Unknown UI error'; return <div className="route-error-card"><AlertCircle size={24} /><h2>Something went wrong loading this page</h2><p>Your account session is safe. Try the page again or reload Bese26 if your connection changed.</p><div className="route-error-detail" role="alert"><strong>Technical detail</strong><code>{message}</code></div><div className="route-error-actions"><button type="button" className="secondary-button" onClick={this.retry}>Try again</button><button type="button" className="primary-button" onClick={() => window.location.reload()}>Reload Bese26</button></div></div>;
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
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'sell', label: 'Sell', icon: Plus },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'business', label: 'Business', icon: Store },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

function formatNaira(value) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
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

const subscriptionPlans = [
  { key: 'free', name: 'Free', price: 0, cadence: 'forever', summary: 'Start selling with no payment.', highlight: '3 active listings included', features: ['3 active marketplace listings', 'Basic profile and marketplace access', 'Bese26 chat with buyers', 'Saved items and seller following'], tone: 'free' },
  { key: 'basic', name: 'Basic', price: 2999, cadence: 'month', summary: 'For a growing local seller.', highlight: '15 active listings', features: ['15 active listings', 'Basic seller analytics', 'Listing management tools', 'Saved searches and standard support'], tone: 'basic' },
  { key: 'premium', name: 'Premium', price: 9999, cadence: 'month', summary: 'For sellers with regular stock.', highlight: '50 active listings', features: ['50 active listings', 'Advanced seller analytics', 'Verification access and premium tools', 'Priority support and better visibility'], tone: 'premium', popular: true },
  { key: 'business', name: 'Business', price: 14999, cadence: 'month', summary: 'For professional businesses.', highlight: '250 active listings', features: ['250 active listings', 'Business profile and branding', 'Business verification access', 'Priority support and promotional tools'], tone: 'business' },
];



function SubscriptionPlanCard({ plan, expanded, onToggle, onChoose, currentPlan, busyPlan }) {
  const isCurrent = currentPlan === plan.key;
  return <article className={`subscription-plan-card ${plan.tone} ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}><div className="subscription-plan-top"><span className="subscription-plan-badge">{plan.popular ? 'MOST POPULAR' : plan.key === 'free' ? 'START HERE' : plan.name.toUpperCase()}</span>{isCurrent && <span className="current-plan-pill">Your plan</span>}</div><h3>{plan.name}</h3><p className="subscription-plan-summary">{plan.summary}</p><div className="subscription-plan-price">{plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : formatNaira(plan.price)}<small>{plan.price === null ? ' pricing' : ` / ${plan.cadence}`}</small></div><strong className="subscription-plan-highlight"><Check size={15} /> {plan.highlight}</strong><div className="subscription-plan-actions"><button type="button" className={plan.key === 'free' ? 'secondary-button' : 'primary-button'} onClick={() => onChoose(plan)} disabled={isCurrent || busyPlan === plan.key}>{isCurrent ? 'Current plan' : busyPlan === plan.key ? 'Opening…' : plan.key === 'free' ? 'Use Free plan' : plan.price === null ? 'Contact for plan' : 'Choose plan'} {busyPlan === plan.key ? null : <ArrowRight size={15} />}</button><button type="button" className="subscription-more-button" aria-expanded={expanded} onClick={() => onToggle(plan.key)}>More <ChevronDown size={15} className={expanded ? 'rotate-180' : ''} /></button></div>{expanded && <div className="subscription-features"><div className="eyebrow">WHAT YOU GET</div><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}</ul></div>}</article>;
}

function SubscriptionView({ user, onBack, onAuthRequired, onDemoAction }) {
  const [expanded, setExpanded] = useState('free');
  const [entitlement, setEntitlement] = useState(null);
  const [busyPlan, setBusyPlan] = useState('');
  useEffect(() => { let mounted = true; if (!user) { setEntitlement(null); return undefined; } fetchSellerEntitlement().then((data) => mounted && setEntitlement(data)).catch(() => {}); return () => { mounted = false; }; }, [user]);
  const choose = async (plan) => { if (plan.key === 'free') { onDemoAction('The Free plan includes 3 active listings.'); return; } if (plan.price === null) { onDemoAction('Enterprise Lux needs a custom business quote.'); return; } if (!user) { onAuthRequired?.(); return; } setBusyPlan(plan.key); try { const checkout = await startPaystackCheckout(plan.key); if (!checkout.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(checkout.authorization_url); } catch (error) { onDemoAction(error.message || 'Could not start Paystack checkout.'); setBusyPlan(''); } };
  return <div className="page-stack subscription-page"><div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Payments & services</span></div><section className="subscription-hero"><div><div className="eyebrow light">BESE26 SELLER PLANS</div><h1>Grow when your business is ready.</h1><p>Start free with 3 active listings, then upgrade when you need more capacity or visibility.</p></div><span className="subscription-hero-mark"><Sparkles size={22} /></span></section>{user && entitlement && <section className="subscription-usage"><div><div className="eyebrow">YOUR CURRENT ACCESS</div><strong>{entitlement.is_paid ? `${entitlement.plan_key} plan` : 'Free plan'}</strong><span>{`${entitlement.free_posts_used || 0} of ${entitlement.listing_limit} active listings used · ${Math.max((entitlement.listing_limit || 3) - (entitlement.free_posts_used || 0), 0)} remaining`}</span></div><div className="subscription-usage-track"><span style={{ width: `${entitlement.is_paid ? 100 : Math.max(0, (entitlement.free_posts_remaining / entitlement.free_posts_limit) * 100)}%` }} /></div></section>}<div className="subscription-section-heading"><div><div className="eyebrow">SIMPLE START</div><h2>Choose the right level</h2></div><span>Monthly · no hidden balance</span></div><div className="subscription-plan-grid">{subscriptionPlans.map((plan) => <SubscriptionPlanCard plan={plan} key={plan.key} expanded={expanded === plan.key} onToggle={setExpanded} onChoose={choose} currentPlan={entitlement?.is_paid ? entitlement.plan_key : 'free'} busyPlan={busyPlan} />)}</div><p className="subscription-disclaimer"><ShieldCheck size={15} /> Paystack checkout opens securely after server configuration. Plan access is granted only after the server verifies the payment reference, amount, and currency.</p></div>;
}

function HomeView({ marketListings, onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
  const [showStartGuide, setShowStartGuide] = useState(() => {
    try { return window.localStorage.getItem('bese26:first-visit-guide-dismissed') !== '1'; } catch { return true; }
  });
  const dismissStartGuide = () => { setShowStartGuide(false); try { window.localStorage.setItem('bese26:first-visit-guide-dismissed', '1'); } catch {} };
  return (
    <div className="page-stack home-page">
      <section className="discovery-banner">
        <div className="discovery-copy"><div className="eyebrow light">WELCOME TO BESE26</div><h1>Shop smarter.<br /><span>Sell with confidence.</span></h1><p>Discover everyday essentials from people and businesses near you.</p></div>
        <div className="discovery-actions"><div className="discovery-stat"><strong>{marketListings.length}</strong><span><Package size={12} /> live listings</span></div><button className="discovery-cta" onClick={() => onSearch('')}>Explore listings <ArrowRight size={16} /></button></div>
      </section>
      {showStartGuide && <section className="start-guide" aria-label="Get started with Bese26"><div><div className="eyebrow">NEW HERE?</div><h2>What would you like to do?</h2><p>You can browse freely, or sign in when you are ready to sell and chat safely.</p></div><div className="start-guide-actions"><button type="button" className="primary-button" onClick={() => { dismissStartGuide(); onSearch(''); }}><Search size={15} /> Buy something</button><button type="button" className="secondary-button" onClick={() => { dismissStartGuide(); onNavigate('sell'); }}><Plus size={15} /> Sell something</button><button type="button" className="icon-button" aria-label="Dismiss getting started guide" onClick={dismissStartGuide}><X size={17} /></button></div></section>}
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
        {marketListings.length ? <div className="product-grid">{marketListings.slice(0, 4).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div> : <div className="empty-state"><Package size={25} /><h3>No live listings yet</h3><p>Be one of the first sellers to add a product. New listings appear here after review.</p><div className="empty-state-actions"><button className="primary-button" onClick={() => onNavigate('sell')}><Plus size={15} /> List an item</button><button className="secondary-button" onClick={() => onNavigate('business')}><Store size={15} /> Explore businesses</button></div></div>}
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

    </div>
  );
}

function SearchView({ marketListings, categories, search, setSearch, onOpenListing, savedIds, onToggleSave, onBack }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState('Recommended');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = marketListings.filter((listing) => !term || `${listing.title} ${listing.location} ${listing.category} ${listing.sellerDisplayName || listing.seller}`.toLowerCase().includes(term));
    if (activeCategory !== 'All') result = result.filter((listing) => listing.category === activeCategory);
    if (verifiedOnly) result = result.filter((listing) => listing.verified === true);
    if (sort === 'Price low → high') result = [...result].sort((a, b) => a.numericPrice - b.numericPrice);
    if (sort === 'Price high → low') result = [...result].sort((a, b) => b.numericPrice - a.numericPrice);
    return result;
  }, [marketListings, search, activeCategory, sort, verifiedOnly]);

  return (
    <div className="page-stack search-page">
      <div className="back-row"><button className="icon-button" onClick={onBack}><ArrowLeft size={18} /></button><span>Discover listings</span></div>
      <div className="page-title-row"><div><div className="eyebrow">SEARCH & DISCOVER</div><h1>Find something great.</h1></div><div className="results-count">{filtered.length} results</div></div>
      <div className="search-box large-search"><Search size={19} /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Try “phones in Kano”" /><button className="search-clear" onClick={() => setSearch('')}><X size={16} /></button></div>
      <div className="filter-toolbar"><div className="filter-scroll"><button className={activeCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory('All')}>All listings</button>{categories.filter((category) => !category.parent_id).slice(0, 6).map((category) => <button key={category.name} className={activeCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}<button type="button" className={`filter-chip verified-filter-chip ${verifiedOnly ? 'active' : ''}`} aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((value) => !value)}><ShieldCheck size={14} /> Verified sellers only</button></div></div>

      <div className="search-result-head"><span>Recommended for you</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Newest</option><option>Price low → high</option><option>Price high → low</option></select></div>
      {filtered.length ? <div className="product-grid search-grid">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div> : <div className="empty-state"><Search size={25} /><h3>{verifiedOnly ? 'No verified sellers found' : 'No listings found'}</h3><p>{verifiedOnly ? 'Try turning off the verified-only filter or search another category.' : 'Try a different search term or browse all categories.'}</p><button className="primary-button" onClick={() => { setSearch(''); setActiveCategory('All'); setVerifiedOnly(false); }}>Clear filters</button></div>}
    </div>
  );
}



function SavedView({ marketListings, savedIds, onOpenListing, onToggleSave }) {
  const saved = marketListings.filter((listing) => savedIds.includes(listing.id));
  return <div className="page-stack"><div className="page-title-row"><div><div className="eyebrow">KEEP AN EYE ON IT</div><h1>Saved</h1></div><span className="count-bubble">{saved.length}</span></div>
    <section><SectionHeading title="Saved listings" />{saved.length ? <div className="saved-list">{saved.map((listing) => <div className="saved-row" key={listing.id}><div className="saved-row-media" onClick={() => onOpenListing(listing)}>{listing.image ? <img src={listing.image} alt={listing.title} loading="lazy" decoding="async" /> : <Package size={20} />}</div><div className="saved-row-copy" onClick={() => onOpenListing(listing)}><strong>{listing.title}</strong><span>{listing.location}</span><b>{listing.price}</b></div><button className="save-button saved" aria-label={`Remove ${listing.title} from saved`} onClick={() => onToggleSave(listing.id)}><Heart size={17} fill="currentColor" /></button></div>)}</div> : <div className="empty-state compact-empty"><Bookmark size={24} /><h3>Your shortlist is empty</h3><p>Approved listings you save will appear here.</p></div>}</section>
  </div>;
}



function MessagesView({ user, liveListing, onDemoAction, initialMessageId, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [text, setText] = useState('');
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [deals, setDeals] = useState({ offers: [], meetings: [] });
  const [dealPanel, setDealPanel] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingArea, setMeetingArea] = useState('');
  const [busy, setBusy] = useState(false);
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

  const send = async (message = text) => {
    if (!message.trim() || !liveMode) return;
    try { await sendMessage({ conversationId: selectedConversation.id, senderId: user.id, body: message.trim() }); setText(''); }
    catch (error) { onDemoAction(error.message || 'Could not send this message.'); }
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
  const otherProfile = selectedConversation && (selectedConversation.buyer_id === user?.id ? selectedConversation.seller : selectedConversation.buyer);
  const personName = liveMode ? (otherProfile?.display_name || 'bese26 member') : 'Marketplace chat';
  const listingTitle = liveMode ? (selectedConversation.listing?.title || 'Listing no longer available') : 'No listing selected';
  const listingImage = liveMode ? liveListing?.image : null;
  const personInitials = liveMode ? ((otherProfile?.display_name || 'BE').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) : 'BE';
  return <div className="page-stack messages-page"><div className="page-title-row"><div><div className="eyebrow">KEEP IT MOVING</div><h1>Messages</h1></div><span className="unread-pill">{liveMode ? 'Deal workspace' : 'Secure chat'}</span></div><div className="message-layout"><div className="conversation-list">{conversationLoading ? <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>Loading conversations</h3><p>Getting your secure conversations.</p></div> : conversations.length ? conversations.map((conversation) => { const other = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer; const name = other?.display_name || 'bese26 member'; return <button key={conversation.id} className={`conversation-row ${conversation.id === initialMessageId ? 'active' : ''}`} type="button" onClick={() => onSelectConversation?.(conversation)}><Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} tone="rose" /><div className="conversation-copy"><strong>{name}</strong><span>{conversation.listing?.title || 'Marketplace listing'}</span></div><div className="conversation-meta"><small>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'New'}</small></div></button>; }) : <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>No conversations yet</h3><p>When you chat with a seller, your messages will appear here.</p></div>}</div><div className="chat-panel"><div className="chat-header"><div className="chat-person"><Avatar initials={personInitials} tone="rose" /><div><strong>{personName}</strong><span><span className="online-dot" /> {liveMode ? 'Protected conversation' : 'Start a conversation from a listing'}</span></div></div></div><div className="chat-context">{listingImage ? <img src={listingImage} alt="" /> : <div className="chat-context-placeholder"><Package size={17} /></div>}<div><span>About this listing</span><strong>{listingTitle}</strong></div></div>{liveMode && <><div className="chat-safety-note"><ShieldCheck size={15} /><span>Never share OTPs, passwords, or private bank details. Inspect the item before paying.</span></div><div className="chat-quick-actions"><button type="button" onClick={() => send('I am interested in this listing. Is it still available?')}>I’m interested</button><button type="button" onClick={() => setDealPanel('offer')} disabled={isSeller}>Make an offer</button><button type="button" onClick={() => setDealPanel('meeting')}>Plan a meeting</button></div>{dealPanel === 'offer' && <form className="deal-form" onSubmit={submitOffer}><strong>Make an offer</strong><input type="number" min="1" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} placeholder="Offer amount in NGN" required /><input value={offerNote} onChange={(event) => setOfferNote(event.target.value)} placeholder="Optional note" /><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send offer'}</button></div></form>}{dealPanel === 'meeting' && <form className="deal-form" onSubmit={submitMeeting}><strong>Suggest a safe meeting</strong><div className="deal-form-row"><input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required /><input type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} required /></div><input value={meetingArea} onChange={(event) => setMeetingArea(event.target.value)} placeholder="General public area, not an exact address" required /><div><button type="button" className="secondary-button" onClick={() => setDealPanel('')}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send proposal'}</button></div></form>}{deals.offers.map((offer) => <div className="deal-status-card" key={offer.id}><div><strong>Offer · ₦{Number(offer.amount).toLocaleString('en-NG')}</strong><span>{offer.status}</span></div>{isSeller && offer.status === 'pending' && <div><button type="button" onClick={() => updateOffer(offer, 'accepted')}>Accept</button><button type="button" onClick={() => updateOffer(offer, 'rejected')}>Decline</button></div>}</div>)}{deals.meetings.map((meeting) => <div className="deal-status-card" key={meeting.id}><div><strong>Meeting · {meeting.meeting_date} at {meeting.meeting_time}</strong><span>{meeting.area} · {meeting.status}</span></div>{meeting.status === 'proposed' && meeting.proposed_by !== user.id && <div><button type="button" onClick={() => updateMeeting(meeting, 'accepted')}>Accept</button><button type="button" onClick={() => updateMeeting(meeting, 'declined')}>Decline</button></div>}</div>)}</>}
  <div className="chat-messages">{liveMode ? (liveLoading ? <div className="chat-empty-note">Loading messages…</div> : liveMessages.length ? liveMessages.map((item) => <div className={`message-bubble ${item.sender_id === user.id ? 'mine' : 'other'}`} key={item.id}>{item.body || 'Attachment'}<small>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.sender_id === user.id && <Check size={12} />}</small></div>) : <div className="chat-empty-note">Start the conversation with a clear question about the listing.</div>) : <div className="chat-empty-note">Select a listing to start a real conversation.</div>}</div><div className="chat-composer"><button className="icon-button" aria-label="Attach image" disabled><ImageIcon size={18} /></button><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Write a message..." disabled={!liveMode} /><button className="send-button" onClick={() => send()} disabled={!liveMode}><Send size={16} /></button></div></div></div></div>;
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
  const gallery = listing?.gallery?.length ? listing.gallery : listing?.image ? [listing.image] : [];
  const owner = Boolean(user?.id && listing?.sellerId === user.id);
  const raw = listing?.raw || {};
  const description = listing?.description || '';
  const sellerPhone = raw.seller_phone || raw.profiles?.phone || raw.business_profile?.phone || '';
  const whatsapp = raw.seller_whatsapp || raw.profiles?.whatsapp || raw.business_profile?.whatsapp || '';
  const priceType = raw.pricing_type === 'negotiable' ? 'Negotiable' : raw.pricing_type === 'contact' || raw.price == null ? 'Contact for price' : raw.pricing_type === 'on_request' ? 'Price on request' : 'Fixed price';
  const specs = Object.entries(listing?.attributes || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '').map(([key, value]) => ({ key: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), value: Array.isArray(value) ? value.join(', ') : value }));
  const delivery = Array.isArray(listing?.deliveryOptions) ? listing.deliveryOptions.filter(Boolean) : [];
  useEffect(() => { if (!listing) return undefined; setActiveImage(0); setZoomed(false); setExpandedDescription(false); setReportOpen(false); setLoadingDetails(true); Promise.allSettled([fetchListingReviews(listing.id), fetchSimilarListings(listing)]).then(([reviewResult, similarResult]) => { if (reviewResult.status === 'fulfilled') setReviews(reviewResult.value || []); if (similarResult.status === 'fulfilled') setSimilar(similarResult.value || []); }).finally(() => setLoadingDetails(false)); recordListingView(listing.id).catch(() => {}); return undefined; }, [listing?.id]);
  useEffect(() => { if (!zoomed) return undefined; const onKey = (event) => event.key === 'Escape' && setZoomed(false); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [zoomed]);
  if (!listing) return null;
  const nextImage = () => setActiveImage((current) => gallery.length ? (current + 1) % gallery.length : 0);
  const previousImage = () => setActiveImage((current) => gallery.length ? (current - 1 + gallery.length) % gallery.length : 0);
  const share = async () => { const url = `${window.location.origin}/listing/${listing.id}`; try { if (navigator.share) await navigator.share({ title: `${listing.title} | Bese26`, text: `${listing.title} · ${listing.price}`, url }); else { await navigator.clipboard?.writeText(url); onDemoAction?.('Listing link copied.'); } } catch (error) { if (error.name !== 'AbortError') onDemoAction?.('Could not share this listing.'); } };
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
  return <div className="listing-modal-backdrop" role="dialog" aria-modal="true" aria-label="Listing details" onClick={(event) => event.target === event.currentTarget && onClose?.()}><div className="listing-modal listing-details-premium"><div className="listing-modal-header"><span className="eyebrow">LISTING DETAILS</span><div className="listing-modal-header-actions"><button className="icon-button" onClick={() => onToggleSave?.(listing.id)} aria-label={isSaved ? 'Remove from saved' : 'Save listing'}><Heart size={19} fill={isSaved ? 'currentColor' : 'none'} /></button><button className="icon-button" onClick={onClose} aria-label="Close listing details"><X size={19} /></button></div></div><div className="listing-details-layout"><section className="listing-gallery-panel"><div className="listing-gallery-frame" onTouchStart={(event) => setTouchStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => { if (touchStart == null) return; const delta = event.changedTouches[0].clientX - touchStart; if (Math.abs(delta) > 45) delta < 0 ? nextImage() : previousImage(); setTouchStart(null); }}><button className="gallery-main-button" onClick={() => gallery.length && setZoomed(true)} aria-label="Open fullscreen gallery">{gallery.length ? <img src={gallery[activeImage]} alt={`${listing.title} image ${activeImage + 1}`} /> : <div className="listing-gallery-placeholder"><ImageIcon size={38} /><span>No photos available</span></div>}</button>{gallery.length > 1 && <><button className="gallery-control gallery-control-prev" onClick={previousImage} aria-label="Previous listing photo"><ArrowLeft size={18} /></button><button className="gallery-control gallery-control-next" onClick={nextImage} aria-label="Next listing photo"><ArrowRight size={18} /></button></>}<span className="modal-image-count">{gallery.length ? `${activeImage + 1} / ${gallery.length}` : 'No image'}</span><button className="image-zoom-button" onClick={() => gallery.length && setZoomed(true)} aria-label="View fullscreen"><ZoomIn size={17} /></button></div>{gallery.length > 1 && <div className="modal-gallery-thumbs">{gallery.map((image, index) => <button key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`View listing photo ${index + 1}`}><img loading={index > 2 ? 'lazy' : undefined} src={image} alt="" /></button>)}</div>}</section><section className="listing-detail-body"><div className="listing-location-line"><MapPin size={16} /> {listing.location}{listing.posted && <><span>·</span>{listing.posted}</>}{raw.updated_at && <span>· Updated {new Date(raw.updated_at).toLocaleDateString('en-NG')}</span>}</div><h1>{listing.title}</h1><div className="listing-price-row"><div className="listing-detail-price">{listing.price}</div><span className="listing-pricing-type">{priceType}</span></div><div className="listing-detail-meta"><span>{listing.condition}</span>{titleParts && <span>{titleParts}</span>}<span>{Number(raw.views_count || 0)} views</span></div><section className="trust-summary-card"><div className="trust-summary-heading"><div className="trust-summary-icon"><ShieldCheck size={19} /></div><div><strong>{trustLabel}</strong><span>{trustNote}</span></div></div><div className="trust-summary-grid"><span><b>{listing.sellerRating > 0 ? `${listing.sellerRating.toFixed(1)}/5` : "New"}</b> seller rating</span><span><b>{listing.location || "Local"}</b> meeting area</span><span><b>{Number(raw.views_count || 0)}</b> real views</span></div></section><div className="listing-primary-actions"><button className="primary-contact-button" onClick={callSeller} disabled={!sellerPhone}><Phone size={18} /> Call</button><button className="secondary-contact-button" onClick={openWhatsApp} disabled={!whatsapp}><MessageCircle size={18} /> WhatsApp</button><button className="secondary-contact-button" onClick={() => onStartChat?.(listing)}><MessageCircle size={18} /> Message Seller</button><button className="secondary-contact-button" onClick={() => onStartChat?.(listing)}><Tag size={18} /> Make an offer</button></div><section className="listing-question-card"><div><div className="eyebrow">NOT SURE WHAT TO ASK?</div><h2>Start with a simple question</h2><p>Open a protected Bese26 conversation and ask the seller directly.</p></div><div className="listing-question-pills">{buyerQuestions.map((question) => <button type="button" key={question} onClick={() => onStartChat?.(listing)}>{question}</button>)}</div></section><section className="safe-deal-card"><div><ShieldCheck size={18} /><div><strong>Safe Deal checklist</strong><p>Keep payment and questions in Bese26 chat. Meet in a busy public place and inspect the item before paying.</p></div></div><button type="button" onClick={() => onStartChat?.(listing)}>Start a safe deal <ArrowRight size={16} /></button></section><section className="listing-info-card"><div className="listing-section-heading"><h2>Listing details</h2><span>{loadingDetails ? 'Loading…' : `${specs.length} details`}</span></div>{specs.length ? <div className="listing-spec-grid">{specs.map((item) => <div key={item.key}><span>{item.key}</span><strong>{String(item.value)}</strong></div>)}</div> : <p>No additional category attributes were provided.</p>}</section><section className="listing-info-card"><h2>Description</h2><p className={`listing-description listing-description-card ${!expandedDescription && description.length > 500 ? 'is-collapsed' : ''}`}>{description || 'The seller has not added a description yet.'}</p>{description.length > 500 && <button className="text-action" onClick={() => setExpandedDescription((value) => !value)}>{expandedDescription ? 'Show less' : 'Read more'}</button>}</section>{delivery.length > 0 && <section className="listing-info-card"><h2>Delivery</h2><div className="listing-delivery-list">{delivery.map((item) => <span key={String(item)}>{String(item).replaceAll('_', ' ')}</span>)}</div></section>}<section className="seller-profile-card"><div className="seller-profile-heading"><img className="seller-card-avatar" src={listing.sellerAvatar} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /><div><strong>{listing.sellerDisplayName || listing.seller}</strong><span>{listing.sellerBusinessName ? <><Store size={14} /> {listing.sellerBusinessName} · Business</> : 'Personal seller'} {listing.verified && <span className="verified-badge"><BadgeCheck size={12} /> Verified</span>}</span><small>{listing.sellerRating > 0 ? `${listing.sellerRating.toFixed(1)} rating` : 'No rating yet'} · Member since {raw.profiles?.created_at ? new Date(raw.profiles.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : 'Bese26 member'}</small></div></div><div className="listing-detail-actions"><button onClick={() => listing.sellerBusinessHandle ? window.location.assign(`/@${listing.sellerBusinessHandle}`) : listing.sellerId ? window.location.assign(`/${raw.profiles?.username || listing.sellerId}`) : onDemoAction?.('Seller profile is not public yet.')}>View profile <ChevronRight size={17} /></button>{listing.sellerBusinessHandle && <button onClick={() => window.location.assign(`/@${listing.sellerBusinessHandle}`)}><Store size={16} /> View store</button>}<button onClick={share}><Share2 size={16} /> Share</button><button className="report-action" onClick={() => setReportOpen(true)}>Report</button></div></section><section className="listing-info-card"><div className="listing-section-heading"><h2>Feedback about seller</h2><span>{reviews.length} review{reviews.length === 1 ? '' : 's'}</span></div>{reviews.length ? reviews.map((review) => <div className="review-row" key={review.id}><strong>{review.reviewer?.display_name || 'Buyer'}</strong><span>{'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))} · {new Date(review.created_at).toLocaleDateString('en-NG')}</span><p>{review.body || 'No written review.'}</p></div>) : <p>No published reviews yet.</p>}</section>{similar.length > 0 && <section className="listing-info-card"><h2>Similar listings</h2><div className="listing-similar-grid">{similar.map((item) => <button key={item.id} onClick={() => onOpenListing?.(item)}><strong>{item.title}</strong><span>{item.price} · {item.location}</span></button>)}</div></section>}{owner && <section className="listing-owner-controls"><div><strong>Manage your listing</strong><span>{Number(raw.views_count || 0)} real views · status: {raw.status || 'active'}</span></div><div><button onClick={() => onEditListing?.(listing)}>Edit listing</button><button disabled={actionBusy} onClick={() => manage(raw.status === 'paused' ? 'active' : 'paused')}>{raw.status === 'paused' ? 'Resume' : 'Pause'}</button><button disabled={actionBusy} onClick={() => manage('sold')}>Mark sold</button><button disabled={actionBusy} onClick={remove}>Delete</button></div></section>}</section></div></div>{zoomed && <div className="listing-gallery-lightbox" role="dialog" aria-label="Fullscreen listing gallery" onClick={() => setZoomed(false)}><button className="icon-button lightbox-close" onClick={() => setZoomed(false)} aria-label="Close fullscreen"><X size={20} /></button>{gallery.length > 1 && <button className="gallery-control gallery-control-prev" onClick={(event) => { event.stopPropagation(); previousImage(); }} aria-label="Previous photo"><ArrowLeft size={20} /></button>}<img src={gallery[activeImage]} alt={`${listing.title} fullscreen image ${activeImage + 1}`} onClick={(event) => event.stopPropagation()} />{gallery.length > 1 && <button className="gallery-control gallery-control-next" onClick={(event) => { event.stopPropagation(); nextImage(); }} aria-label="Next photo"><ArrowRight size={20} /></button>}</div>}{reportOpen && <div className="listing-report-overlay" role="dialog" aria-label="Report listing" onClick={(event) => event.target === event.currentTarget && setReportOpen(false)}><form className="listing-report-card" onSubmit={submitReport}><button type="button" className="icon-button" onClick={() => setReportOpen(false)} aria-label="Close report"><X size={18} /></button><h2>Report listing</h2><label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>{['scam', 'fake_product', 'counterfeit', 'prohibited_item', 'wrong_information', 'fake_identity', 'harassment', 'suspicious_activity', 'other'].map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label><label>Details<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1500} placeholder="Tell Bese26 moderation what happened" /></label><button className="primary-button" disabled={actionBusy}>{actionBusy ? 'Submitting…' : 'Submit report'}</button></form></div>}</div>;
}

function PublicPersonalPage({ data }) {
  const { profile, listings } = data;
  const [viewer, setViewer] = useState(null);
  const [followState, setFollowState] = useState({ following: false, followers: 0 });
  const [followBusy, setFollowBusy] = useState(false);
  const location = [profile.city, profile.state, profile.country].filter(Boolean).join(', ');
  useEffect(() => { let mounted = true; if (!supabase) return undefined; supabase.auth.getSession().then(({ data: sessionData }) => { const current = sessionData?.session?.user || null; if (!mounted) return; setViewer(current); if (current && current.id !== profile.id) getFollowState(current.id, profile.id).then((state) => mounted && setFollowState(state)).catch(() => {}); }); return () => { mounted = false; }; }, [profile.id]);
  const toggleSellerFollow = async () => { if (!viewer) { window.location.assign('/?signin=1'); return; } if (viewer.id === profile.id) return; setFollowBusy(true); try { await toggleFollow(viewer.id, profile.id, !followState.following); setFollowState((current) => ({ ...current, following: !current.following, followers: current.followers + (current.following ? -1 : 1) })); } catch { } finally { setFollowBusy(false); } };
  const share = async () => { const url = `https://www.bese26.shop/${profile.username}`; if (navigator.share) await navigator.share({ title: profile.display_name, text: profile.bio || profile.display_name, url }); else await navigator.clipboard?.writeText(url); };
  return <div className="public-business-shell"><header className="public-business-topbar"><a href={`/listing/${listing.id}`} className="public-brand"><img className="brand-mark-image" src="/images/bese26-logo-icon.png" alt="Bese26" /><strong>Bese26<span>.shop</span></strong></a><button type="button" className="secondary-button" onClick={share}>Share profile</button></header><main className="public-business-main"><section className="public-business-hero"><div className="public-business-logo">{profile.avatar_path ? <img src={getAvatarUrl(profile.avatar_path)} alt={`${profile.display_name} profile`} /> : <span>{profile.display_name.slice(0, 1).toUpperCase()}</span>}</div><div className="public-business-identity"><div className="eyebrow">PUBLIC PERSONAL PROFILE</div><h1>{profile.display_name}</h1><strong className="public-business-handle">@{profile.username}</strong>{profile.is_verified && <span className="verified-badge"><BadgeCheck size={13} /> Verified seller</span>}<p>{profile.bio || 'This Bese26 member has not added a public bio yet.'}</p><span className="public-business-location"><MapPin size={14} /> {location || 'Nigeria'}</span><div className="public-business-actions"><button type="button" className="primary-button" onClick={() => window.location.href = 'https://www.bese26.shop/'}>Open Bese26 <ArrowRight size={15} /></button><button type="button" className="secondary-button" onClick={toggleSellerFollow} disabled={followBusy || viewer?.id === profile.id}>{followState.following ? 'Following' : 'Follow seller'}</button><button type="button" className="secondary-button" onClick={share}>Share</button></div></div></section><section className="public-business-stats"><div><strong>{listings.length}</strong><span>Active listings</span></div><div><strong>{followState.followers}</strong><span>Followers</span></div><div><strong>{profile.seller_rating ? `${Number(profile.seller_rating).toFixed(1)}/5` : '—'}</strong><span>{profile.seller_rating_count || 0} reviews</span></div></section><section className="public-seller-trust-card"><div><ShieldCheck size={18} /><div><strong>Seller trust overview</strong><p>{profile.is_verified ? 'This seller has a verified Bese26 profile.' : 'Review the seller details and keep payment discussions inside Bese26.'} {profile.seller_rating_count ? `${profile.seller_rating_count} published review${profile.seller_rating_count === 1 ? '' : 's'}.` : 'No published reviews yet.'}</p></div></div><span><b>{profile.is_verified ? 'Verified seller' : 'New seller'}</b><small>{location || 'Nigeria'} · Public profile</small></span></section><section className="public-business-listings"><div className="section-heading"><div><div className="eyebrow">AVAILABLE NOW</div><h2>Listings by {profile.display_name}</h2></div><span>{listings.length} listing{listings.length === 1 ? '' : 's'}</span></div>{listings.length ? <div className="product-grid">{listings.map((listing) => <a className="product-card" key={listing.id} href={`/listing/${listing.id}`}><div className="product-image-wrap">{listing.image ? <img src={listing.image} alt={listing.title} className="product-image" /> : <div className="product-image-placeholder"><Package size={26} /></div>}</div><div className="product-info"><div className="product-price">{listing.price}</div><h3>{listing.title}</h3><div className="product-meta"><MapPin size={13} /> {listing.location}</div><div className="product-foot"><span>{listing.condition}</span><span>{listing.posted}</span></div></div></a>)}</div> : <div className="empty-state"><Package size={26} /><h3>No active listings</h3><p>This member has not published any approved listings yet.</p></div>}</section></main><footer className="public-business-footer">Powered by Bese26.shop · Marketplace by Bese26</footer></div>;
}

function PublicBusinessPage({ handle }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => { let mounted = true; fetchPublicBusiness(handle).then((data) => data || fetchPublicProfile(handle)).then((data) => mounted && setState({ loading: false, data, error: '' })).catch((error) => mounted && setState({ loading: false, data: null, error: error.message || 'Unable to load this public profile.' })); return () => { mounted = false; }; }, [handle]);
  useEffect(() => { const business = state.data?.business; if (!business) return; const title = `${business.business_name} ${business.business_handle ? `(@${business.business_handle})` : ''} | Bese26`; const description = (business.description || `${business.business_name} on Bese26 Shop.`).slice(0, 160); document.title = title; const tags = { description, 'og:title': title, 'og:description': description, 'og:type': 'profile', 'og:url': `https://www.bese26.shop/${business.business_handle}`, 'twitter:card': 'summary' }; Object.entries(tags).forEach(([name, content]) => { const selector = name.startsWith('og:') ? `meta[property="${name}"]` : `meta[name="${name}"]`; let tag = document.head.querySelector(selector); if (!tag) { tag = document.createElement('meta'); tag.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(tag); } tag.setAttribute('content', content); }); const canonical = document.head.querySelector('link[rel="canonical"]') || document.head.appendChild(document.createElement('link')); canonical.rel = 'canonical'; canonical.href = `https://www.bese26.shop/${business.business_handle}`; return () => { document.title = 'bese26 — Buy and sell with confidence'; }; }, [state.data]);
  if (state.loading) return <div className="public-business-shell"><div className="route-loading">Loading business profile…</div></div>;
  if (state.error || !state.data) return <div className="public-business-shell"><section className="public-business-not-found"><img className="brand-mark-image" src="/images/bese26-logo-icon.png" alt="Bese26" /><div className="eyebrow">BESE26 SHOP</div><h1>Public profile not found</h1><p>This store does not exist or is not currently active.</p><a className="primary-button" href="https://www.bese26.shop/">Back to Bese26 <ArrowRight size={16} /></a></section></div>;
  if (state.data.profile) return <PublicPersonalPage data={state.data} />;
  const { business, ownerProfile, listings } = state.data; const location = [business.city, business.state, business.country].filter(Boolean).join(', '); const share = async () => { const url = `https://www.bese26.shop/${business.business_handle}`; if (navigator.share) await navigator.share({ title: business.business_name, text: business.description || business.business_name, url }); else { await navigator.clipboard?.writeText(url); } };
  return <div className="public-business-shell"><header className="public-business-topbar"><a href="https://www.bese26.shop/" className="public-brand"><img className="brand-mark-image" src="/images/bese26-logo-icon.png" alt="Bese26" /><strong>Bese26<span>.shop</span></strong></a><button type="button" className="secondary-button" onClick={share}>Share profile</button></header><main className="public-business-main"><section className="public-business-hero"><div className="public-business-logo">{business.logo_path ? <img src={getAvatarUrl(business.logo_path)} alt={`${business.business_name} logo`} /> : <span>{business.business_name.slice(0, 1).toUpperCase()}</span>}</div><div className="public-business-identity"><div className="eyebrow">PUBLIC BUSINESS PROFILE</div><h1>{business.business_name}</h1><strong className="public-business-handle">@{business.business_handle}</strong>{business.is_verified && <span className="verified-badge"><BadgeCheck size={13} /> {business.verification_kind === 'unregistered' ? 'Verified Seller' : 'Verified Business'}</span>}<p>{business.description || 'This business has not added a public description yet.'}</p><span className="public-business-location"><MapPin size={14} /> {location || 'Nigeria'}</span><div className="public-business-actions">{business.public_contact && business.phone && <a className="primary-button" href={`tel:${business.phone}`}><Phone size={15} /> Call</a>}{listings[0] && <a className="secondary-button" href={`/?chat_listing=${listings[0].id}`}><MessageCircle size={15} /> Message</a>}<button type="button" className="secondary-button" onClick={share}>Share</button></div></div></section><section className="public-business-owner"><div className="eyebrow">PERSONAL PROFILE LINKED TO THIS BUSINESS</div><div className="public-owner-row">{ownerProfile?.avatar_path ? <img src={getAvatarUrl(ownerProfile.avatar_path)} alt={ownerProfile.display_name || 'Owner'} /> : <div className="public-owner-avatar">{(ownerProfile?.display_name || 'B').slice(0, 1).toUpperCase()}</div>}<div><strong>{ownerProfile?.display_name || 'Bese26 member'}</strong><span>{ownerProfile?.username ? `@${ownerProfile.username}` : 'Personal profile'}</span><p>{ownerProfile?.bio || 'This business is managed through the owner’s Bese26 personal profile.'}</p></div><a className="secondary-button" href={ownerProfile?.username ? `https://www.bese26.shop/${ownerProfile.username}` : 'https://www.bese26.shop/'}>View personal profile</a></div></section><section className="public-business-stats"><div><strong>{listings.length}</strong><span>Listings</span></div><div><strong>{business.category || '—'}</strong><span>Category</span></div><div><strong>{business.business_type || 'Business'}</strong><span>Type</span></div></section><section className="public-business-listings"><div className="section-heading"><div><div className="eyebrow">AVAILABLE NOW</div><h2>Listings from {business.business_name}</h2></div><span>{listings.length} listing{listings.length === 1 ? '' : 's'}</span></div>{listings.length ? <div className="product-grid">{listings.map((listing) => <a className="product-card" key={listing.id} href={`/listing/${listing.id}`}><div className="product-image-wrap">{listing.image ? <img src={listing.image} alt={listing.title} className="product-image" /> : <div className="product-image-placeholder"><Package size={26} /></div>}</div><div className="product-info"><div className="product-price">{listing.price}</div><h3>{listing.title}</h3><div className="product-meta"><MapPin size={13} /> {listing.location}</div><div className="product-foot"><span>{listing.condition}</span><span>{listing.posted}</span></div><div className="business-listing-actions">{business.public_contact && business.phone && <a className="secondary-button" href={`tel:${business.phone}`}><Phone size={15} /> Call</a>}<a className="primary-button business-listing-message" href={`https://www.bese26.shop/?chat_listing=${listing.id}`}><MessageCircle size={15} /> Message</a></div></div></a>)}</div> : <div className="empty-state"><Package size={26} /><h3>No listings yet.</h3><p>This business has not published any approved listings.</p></div>}</section></main><footer className="public-business-footer">Powered by Bese26.shop · Marketplace by Bese26</footer></div>;
}

function BusinessDirectoryView({ onBack }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let mounted = true; setLoading(true); setError(''); fetchBusinessDirectory(search).then((rows) => mounted && setItems(rows)).catch((reason) => mounted && setError(reason.message || 'Could not load businesses.')).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [search]);
  return <div className="page-stack business-directory-page"><div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Business directory</span></div><section className="business-directory-hero"><div className="eyebrow light">BESE26 BUSINESS</div><h1>Discover local businesses on Bese26.</h1><p>Find local companies, explore what they sell, and contact them directly through their public profile.</p></section><div className="search-box business-directory-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, category, or city" aria-label="Search businesses" /></div>{error && <div className="auth-status error">{error}</div>}{loading ? <div className="route-loading">Loading businesses…</div> : items.length ? <div className="business-directory-grid">{items.map((business) => { const location = [business.city, business.state].filter(Boolean).join(', '); return <article className="business-directory-card" key={business.profile_id}><div className="business-directory-logo">{business.logo_path ? <img src={getAvatarUrl(business.logo_path)} alt={`${business.business_name} logo`} /> : <Store size={26} />}</div><div className="business-directory-copy"><span className="eyebrow">{business.category || business.business_type || 'BUSINESS'}</span><h2>{business.business_name} {business.is_verified && <BadgeCheck size={17} className="business-verified-icon" aria-label={business.verification_kind === 'unregistered' ? 'Verified seller' : 'Verified business'} />}</h2><strong>@{business.business_handle}</strong><p>{business.description || 'Explore this company’s public profile and available listings.'}</p><small>{location || 'Nigeria'}{business.delivery_available ? ' · Delivery' : ''}{business.pickup_available ? ' · Pickup' : ''}</small></div><a className="primary-button" href={`/${business.business_handle}`}>View company <ArrowRight size={15} /></a></article>; })}</div> : <div className="empty-state"><Store size={26} /><h3>No businesses found</h3><p>{search ? 'Try another company name, category, or city.' : 'Every active business profile created on Bese26 can appear here. Search by company, category, or city.'}</p></div>}</div>;
}

function PublicListingRoute({ listingId }) {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let mounted = true; fetchListingDetails(listingId).then((data) => mounted && setListing(data)).catch(() => mounted && setListing(null)).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [listingId]);
  useEffect(() => { if (!listing) return undefined; const previous = { title: document.title, description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '' }; document.title = `${listing.title} | Bese26`; let description = document.querySelector('meta[name="description"]'); if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.appendChild(description); } description.content = `${listing.title} — ${listing.price} in ${listing.location}. View details on Bese26.`; let canonical = document.querySelector('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); } canonical.href = `${window.location.origin}/listing/${listing.id}`; const tags = [['og:title', `${listing.title} | Bese26`], ['og:description', description.content], ['og:image', listing.image || `${window.location.origin}/images/bese26-logo-icon.png`], ['twitter:card', 'summary_large_image'], ['twitter:title', `${listing.title} | Bese26`], ['twitter:description', description.content]]; tags.forEach(([name, content]) => { const selector = name.startsWith('og:') ? `meta[property="${name}"]` : `meta[name="${name}"]`; let tag = document.querySelector(selector); if (!tag) { tag = document.createElement('meta'); tag.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(tag); } tag.content = content; }); return () => { document.title = previous.title; if (description) description.content = previous.description; }; }, [listing]);
  if (loading) return <div className="route-loading" role="status">Loading listing details…</div>;
  if (!listing) return <div className="empty-state listing-not-found"><Package size={30} /><h1>Listing not found</h1><p>This listing is no longer available or is not public.</p><a className="primary-button" href="/">Back to Bese26</a></div>;
  return <ListingModal listing={listing} onClose={() => window.location.assign('/')} onDemoAction={(message) => window.alert(message)} onStartChat={() => window.location.assign(`/?chat_listing=${listing.id}`)} />;
}

function AppContent() {
  const publicHandle = typeof window !== 'undefined' ? window.location.pathname.match(/^\/?(?:@)?([a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?)\/?$/i)?.[1]?.toLowerCase() : null;
  const publicListingId = typeof window !== 'undefined' ? window.location.pathname.match(/^\/?listing\/([^/]+)\/?$/i)?.[1] : null;
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
  const [sessionUser, setSessionUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState('');
  const [chatListing, setChatListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);

  // Always start the marketplace shell on Home; only explicit deep links may open another view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('chat_listing') && !params.has('reference') && !params.has('payment')) setActiveNav('home');
  }, []);

  const showToast = useCallback((message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); }, []);
  const requireAuth = useCallback((message = 'Sign in to continue with your marketplace account.') => { setAuthReason(message); setShowAuth(true); }, []);
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
      } catch (error) {
        if (mounted) showToast(error.message || 'Could not restore your session.');
      }
      try {
        const [remoteListings, remoteCategories] = await Promise.all([fetchActiveListings(), fetchCategories()]);
        if (mounted) {
          setMarketListings(remoteListings || []);
          setMarketCategories(remoteCategories || []);
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
  const navigate = (page) => { if (page !== 'sell') setEditingListing(null); if (page === 'profile' && activeNav === 'profile') setProfileReset((value) => value + 1); setActiveNav(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goSearch = (value) => { setSearch(value); navigate('search'); };
  const openListing = (listing) => {
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
      setChatListing(listing);
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

  const renderView = () => {
    if (activeNav === 'home') return <HomeView marketListings={marketListings} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} />;
    if (activeNav === 'search') return <SearchView marketListings={marketListings} categories={marketCategories} search={search} setSearch={setSearch} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={() => navigate('home')} />;
    if (activeNav === 'saved') return <SavedView marketListings={marketListings} savedIds={savedIds} onOpenListing={openListing} onToggleSave={toggleSave} />;
    if (activeNav === 'wallet') return <UnavailableView icon={WalletCards} eyebrow="WALLET" title="Wallet is coming soon" description="Wallet, payments, and transactions are not connected yet. No balance or transaction data is shown until the real service is ready." onBack={() => navigate('home')} />;
    if (activeNav === 'subscription') return <SubscriptionView user={sessionUser} onBack={() => navigate('profile')} onAuthRequired={() => requireAuth('Sign in to view your seller plan.')} onDemoAction={showToast} />;
    if (activeNav === 'business') return <BusinessDirectoryView onBack={() => navigate('home')} />;
    if (activeNav === 'sell') return <SellView user={sessionUser} initialListing={editingListing} initialDraft={editingDraft} onAuthRequired={() => requireAuth('Sign in before posting a listing.')} onDemoAction={showToast} onOpenSubscription={() => navigate('subscription')} />;
    if (activeNav === 'messages') return <MessagesView user={sessionUser} liveListing={chatListing} onDemoAction={showToast} initialMessageId={chatTargetId} onSelectConversation={(conversation) => { setChatTargetId(conversation.id); setChatListing(null); }} />;
    if (activeNav === 'admin') return isAdmin ? <AdminView user={sessionUser} onBack={() => navigate('profile')} onNotice={showToast} /> : <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => { setEditingDraft(null); navigate('sell'); }} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={false} onOpenAdmin={() => {}} onOpenSubscription={() => navigate('subscription')} />;
    return <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => { setEditingDraft(null); navigate('sell'); }} onContinueDraft={(draft) => { setEditingDraft(draft); setEditingListing(null); navigate('sell'); }} onEditListing={(listing) => { setEditingDraft(null); setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={isAdmin} onOpenAdmin={() => navigate('admin')} onOpenSubscription={() => navigate('subscription')} />;
  };

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`}>
    <main className="main-container"><AppErrorBoundary key={activeNav}><Suspense fallback={<div className="route-loading" role="status">Loading bese26…</div>}>{renderView()}</Suspense></AppErrorBoundary></main>
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ key, label, icon: Icon }) => <button key={key} aria-current={activeNav === key ? 'page' : undefined} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} /></span><span>{label}</span></button>)}</nav>

    {showAuth && <AuthPanel reason={authReason} onClose={() => setShowAuth(false)} onAuthenticated={(user) => { setSessionUser(user); setAuthReason(''); showToast('Signed in to bese26.'); }} />}
    <ListingModal listing={selectedListing} user={sessionUser} onClose={() => setSelectedListing(null)} onAuthRequired={requireAuth} isSaved={selectedListing ? savedIds.includes(selectedListing.id) : false} onToggleSave={toggleSave} onDemoAction={showToast} onStartChat={openChat} onOpenListing={openListing} onEditListing={(item) => { setSelectedListing(null); setEditingListing(item); navigate('sell'); }} />
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}


export default function App() {
  return <AppErrorBoundary><AppContent /></AppErrorBoundary>;
}
