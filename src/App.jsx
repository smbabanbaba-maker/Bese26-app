import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
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
  UserRound,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';

const ProfileView = lazy(() => import('./components/ProfileView'));
const AdminView = lazy(() => import('./components/AdminView'));
const SellView = lazy(() => import('./components/SellView'));
import AuthPanel from './components/AuthPanel';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { fetchActiveListings, fetchCategories, fetchSavedIds, fetchConversations, fetchMessages, fetchListingDetails, fetchSellerEntitlement, getOrCreateConversation, isAdminUser, sendMessage, signOut, startPaystackCheckout, subscribeToMessages, toggleFavorite, verifyPaystackPayment } from './lib/marketplace';

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
  { key: 'wallet', label: 'Wallet', icon: WalletCards },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'sell', label: 'Sell', icon: Plus },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'ai', label: 'AI', icon: Sparkles },
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
        {listing.image ? <img src={listing.image} alt={listing.title} className="product-image" loading="lazy" decoding="async" /> : <div className="product-image-placeholder"><Package size={26} /></div>}
        {listing.promoted && <span className="promoted-pill"><Sparkles size={12} /> Promoted</span>}
        <button className={`save-button ${isSaved ? 'saved' : ''}`} aria-label={isSaved ? 'Remove from saved' : 'Save listing'} onClick={(event) => { event.stopPropagation(); onToggleSave(listing.id); }}>
          <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-price">{listing.price}</div>
        <h3>{listing.title}</h3>
        <div className="product-meta"><MapPin size={13} /> {listing.location}</div>
        <div className="product-foot">
          <span>{listing.condition}</span>
          <span>{listing.posted}</span>
        </div>
        {listing.verified && <VerifiedBadge text="Verified seller" />}
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
  { key: 'free', name: 'Free', price: 0, cadence: 'forever', summary: 'Start selling with no payment.', highlight: '3 free posts for every new user', features: ['3 lifetime marketplace posts', 'Standard listing review', 'Bese26 chat with buyers', 'Saved items and seller profile'], tone: 'free' },
  { key: 'basic', name: 'Basic', price: 4999, cadence: 'month', summary: 'For a growing local seller.', highlight: '20 active listings', features: ['20 active listings', '1 promotion boost each week', 'Basic views and inquiries analytics', 'Seller profile and standard support'], tone: 'basic' },
  { key: 'premium', name: 'Premium', price: 9999, cadence: 'month', summary: 'For sellers with regular stock.', highlight: '60 active listings', features: ['60 active listings', '4 promotion boosts each month', 'Search placement for selected listings', 'Detailed views and inquiries analytics'], tone: 'premium', popular: true },
  { key: 'business', name: 'Business', price: 29999, cadence: 'month', summary: 'For professional businesses.', highlight: '250 active listings', features: ['250 active listings', '15 promotion boosts each month', 'Business profile tools', 'Monthly performance report and priority support'], tone: 'business' },
];

const advancedSubscriptionPlans = [
  { key: 'vip', name: 'VIP', price: 19999, cadence: 'month', summary: 'For high-volume sellers.', highlight: '120 active listings', features: ['120 active listings', '8 promotion boosts each month', 'Featured seller placement', 'Business contact options'], tone: 'vip' },
  { key: 'vip_gold', name: 'VIP Gold', price: 29999, cadence: 'month', summary: 'For established dealers.', highlight: '250 active listings', features: ['250 active listings', '15 promotion boosts each month', 'Social link on business profile', 'Monthly performance report'], tone: 'vip' },
  { key: 'diamond_gold', name: 'Diamond Gold', price: 49999, cadence: 'month', summary: 'For large catalogues.', highlight: '500 active listings', features: ['500 active listings', '30 promotion boosts each month', 'Advanced seller analytics', 'Priority support'], tone: 'diamond' },
  { key: 'diamond_elite', name: 'Diamond Elite', price: 79999, cadence: 'month', summary: 'For very high-volume sellers.', highlight: '1,000 active listings', features: ['1,000 active listings', '50 promotion boosts each month', 'Team/business tools when available', 'Dedicated support'], tone: 'diamond' },
  { key: 'enterprise_gold', name: 'Enterprise Gold', price: 129999, cadence: 'month', summary: 'For large organizations.', highlight: '2,000 active listings', features: ['2,000 active listings', 'Bulk promotion tools when available', 'Business reporting', 'Priority account support'], tone: 'enterprise' },
  { key: 'enterprise_elite', name: 'Enterprise Elite', price: 249999, cadence: 'month', summary: 'For complex operations.', highlight: '5,000 active listings', features: ['5,000 active listings', 'Custom account support', 'Bulk tools when available', 'Dedicated relationship support'], tone: 'enterprise' },
  { key: 'enterprise_lux', name: 'Enterprise Lux', price: null, cadence: 'custom', summary: 'Tailored for strategic partners.', highlight: 'Custom limits and services', features: ['Custom listing capacity', 'Custom promotion package', 'Dedicated account plan', 'Terms agreed with the business'], tone: 'enterprise' },
];

function SubscriptionPlanCard({ plan, expanded, onToggle, onChoose, currentPlan, busyPlan }) {
  const isCurrent = currentPlan === plan.key;
  return <article className={`subscription-plan-card ${plan.tone} ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}><div className="subscription-plan-top"><span className="subscription-plan-badge">{plan.popular ? 'MOST POPULAR' : plan.key === 'free' ? 'START HERE' : plan.name.toUpperCase()}</span>{isCurrent && <span className="current-plan-pill">Your plan</span>}</div><h3>{plan.name}</h3><p className="subscription-plan-summary">{plan.summary}</p><div className="subscription-plan-price">{plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : formatNaira(plan.price)}<small>{plan.price === null ? ' pricing' : ` / ${plan.cadence}`}</small></div><strong className="subscription-plan-highlight"><Check size={15} /> {plan.highlight}</strong><div className="subscription-plan-actions"><button type="button" className={plan.key === 'free' ? 'secondary-button' : 'primary-button'} onClick={() => onChoose(plan)} disabled={busyPlan === plan.key}>{busyPlan === plan.key ? 'Opening…' : plan.key === 'free' ? 'Use Free plan' : plan.price === null ? 'Contact for plan' : 'Choose plan'} {busyPlan === plan.key ? null : <ArrowRight size={15} />}</button><button type="button" className="subscription-more-button" aria-expanded={expanded} onClick={() => onToggle(plan.key)}>More <ChevronDown size={15} className={expanded ? 'rotate-180' : ''} /></button></div>{expanded && <div className="subscription-features"><div className="eyebrow">WHAT YOU GET</div><ul>{plan.features.map((feature) => <li key={feature}><CheckCircle2 size={14} /> {feature}</li>)}</ul></div>}</article>;
}

function SubscriptionView({ user, onBack, onAuthRequired, onDemoAction }) {
  const [expanded, setExpanded] = useState('free');
  const [entitlement, setEntitlement] = useState(null);
  const [busyPlan, setBusyPlan] = useState('');
  useEffect(() => { let mounted = true; if (!user) { setEntitlement(null); return undefined; } fetchSellerEntitlement().then((data) => mounted && setEntitlement(data)).catch(() => {}); return () => { mounted = false; }; }, [user]);
  const choose = async (plan) => { if (plan.key === 'free') { onDemoAction('The Free plan includes 3 posts for every new user.'); return; } if (plan.price === null) { onDemoAction('Enterprise Lux needs a custom business quote.'); return; } if (!user) { onAuthRequired?.(); return; } setBusyPlan(plan.key); try { const checkout = await startPaystackCheckout(plan.key); if (!checkout.authorization_url) throw new Error('Paystack did not return a checkout link.'); window.location.assign(checkout.authorization_url); } catch (error) { onDemoAction(error.message || 'Could not start Paystack checkout.'); setBusyPlan(''); } };
  return <div className="page-stack subscription-page"><div className="back-row"><button className="icon-button" onClick={onBack} aria-label="Back to home"><ArrowLeft size={18} /></button><span>Payments & services</span></div><section className="subscription-hero"><div><div className="eyebrow light">BESE26 SELLER PLANS</div><h1>Grow when your business is ready.</h1><p>Start free, post your first 3 listings, and upgrade only when you need more capacity or visibility.</p></div><span className="subscription-hero-mark"><Sparkles size={22} /></span></section>{user && entitlement && <section className="subscription-usage"><div><div className="eyebrow">YOUR CURRENT ACCESS</div><strong>{entitlement.is_paid ? `${entitlement.plan_key} plan` : 'Free plan'}</strong><span>{entitlement.is_paid ? `${entitlement.listing_limit} active listing capacity` : `${entitlement.free_posts_remaining} of ${entitlement.free_posts_limit} free posts remaining`}</span></div><div className="subscription-usage-track"><span style={{ width: `${entitlement.is_paid ? 100 : Math.max(0, (entitlement.free_posts_remaining / entitlement.free_posts_limit) * 100)}%` }} /></div></section>}<div className="subscription-section-heading"><div><div className="eyebrow">SIMPLE START</div><h2>Choose the right level</h2></div><span>Monthly · no hidden balance</span></div><div className="subscription-plan-grid">{subscriptionPlans.map((plan) => <SubscriptionPlanCard plan={plan} key={plan.key} expanded={expanded === plan.key} onToggle={setExpanded} onChoose={choose} currentPlan={entitlement?.is_paid ? entitlement.plan_key : 'free'} busyPlan={busyPlan} />)}</div><details className="advanced-plans"><summary><span><div className="eyebrow">FOR LARGER BUSINESSES</div><strong>View VIP & Enterprise plans</strong></span><ChevronDown size={18} /></summary><div className="subscription-plan-grid advanced">{advancedSubscriptionPlans.map((plan) => <SubscriptionPlanCard plan={plan} key={plan.key} expanded={expanded === plan.key} onToggle={setExpanded} onChoose={choose} currentPlan={entitlement?.is_paid ? entitlement.plan_key : 'free'} busyPlan={busyPlan} />)}</div></details><p className="subscription-disclaimer"><ShieldCheck size={15} /> Paystack checkout opens securely after server configuration. Plan access is granted only after the server verifies the payment reference, amount, and currency.</p></div>;
}

function HomeView({ marketListings, onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
  return (
    <div className="page-stack home-page">
      <section className="discovery-banner">
        <div className="discovery-copy"><div className="eyebrow light">WELCOME TO BESE26</div><h1>Shop smarter.<br /><span>Sell with confidence.</span></h1><p>Discover everyday essentials from people and businesses near you.</p></div>
        <div className="discovery-actions"><div className="discovery-stat"><strong>{marketListings.length}</strong><span><Package size={12} /> live listings</span></div><button className="discovery-cta" onClick={() => onSearch('')}>Explore listings <ArrowRight size={16} /></button></div>
      </section>
      <section className="search-section">
        <div className="search-box home-search">
          <Search size={18} />
          <input aria-label="Search listings" placeholder="Search for products, services and more" onKeyDown={(event) => event.key === 'Enter' && onSearch(event.currentTarget.value)} />
          <button className="search-submit" aria-label="Search" onClick={() => onSearch('')}><Search size={20} /></button>
        </div>
        <div className="location-row"><MapPin size={14} /><span>Showing</span><strong>approved listings</strong><ChevronDown size={14} /></div>
      </section>

      <section>
        <SectionHeading eyebrow="CURATED FOR YOU" title="Featured listings" action={marketListings.length ? 'View all' : null} onAction={() => onNavigate('search')} />
        {marketListings.length ? <div className="product-grid">{marketListings.slice(0, 4).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div> : <div className="empty-state"><Package size={25} /><h3>No live listings yet</h3><p>Approved listings from sellers will appear here.</p><button className="primary-button" onClick={() => onNavigate('sell')}>List an item</button></div>}
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
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = marketListings.filter((listing) => !term || `${listing.title} ${listing.location} ${listing.category}`.toLowerCase().includes(term));
    if (activeCategory !== 'All') result = result.filter((listing) => listing.category === activeCategory);
    if (sort === 'Price low → high') result = [...result].sort((a, b) => a.numericPrice - b.numericPrice);
    if (sort === 'Price high → low') result = [...result].sort((a, b) => b.numericPrice - a.numericPrice);
    return result;
  }, [search, activeCategory, sort]);

  return (
    <div className="page-stack search-page">
      <div className="back-row"><button className="icon-button" onClick={onBack}><ArrowLeft size={18} /></button><span>Discover listings</span></div>
      <div className="page-title-row"><div><div className="eyebrow">SEARCH & DISCOVER</div><h1>Find something great.</h1></div><div className="results-count">{filtered.length} results</div></div>
      <div className="search-box large-search"><Search size={19} /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Try “phones in Kano”" /><button className="search-clear" onClick={() => setSearch('')}><X size={16} /></button></div>
      <div className="filter-toolbar"><div className="filter-scroll"><button className={activeCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory('All')}>All listings</button>{categories.filter((category) => !category.parent_id).slice(0, 6).map((category) => <button key={category.name} className={activeCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div></div>

      <div className="search-result-head"><span>Recommended for you</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Newest</option><option>Price low → high</option><option>Price high → low</option></select></div>
      {filtered.length ? <div className="product-grid search-grid">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div> : <div className="empty-state"><Search size={25} /><h3>No listings found</h3><p>Try a different search term or browse all categories.</p><button className="primary-button" onClick={() => { setSearch(''); setActiveCategory('All'); }}>Clear search</button></div>}
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
  const selectedConversation = conversations.find((conversation) => conversation.id === initialMessageId) || null;
  const liveMode = Boolean(isSupabaseConfigured && user && selectedConversation);

  useEffect(() => {
    let mounted = true;
    if (!user) { setConversations([]); return undefined; }
    setConversationLoading(true);
    fetchConversations(user.id).then((items) => { if (mounted) setConversations(items); }).catch((error) => onDemoAction(error.message || 'Could not load conversations.')).finally(() => mounted && setConversationLoading(false));
    return () => { mounted = false; };
  }, [user, onDemoAction]);

  useEffect(() => {
    if (!liveMode) { setLiveMessages([]); return undefined; }
    let mounted = true;
    setLiveLoading(true);
    fetchMessages(selectedConversation.id).then((items) => { if (mounted) setLiveMessages(items); }).catch((error) => onDemoAction(error.message || 'Could not load messages.')).finally(() => mounted && setLiveLoading(false));
    const unsubscribe = subscribeToMessages(selectedConversation.id, (incoming) => setLiveMessages((items) => items.some((item) => item.id === incoming.id) ? items : [...items, incoming]));
    return () => { mounted = false; unsubscribe(); };
  }, [selectedConversation?.id, liveMode, onDemoAction]);

  const send = async () => {
    if (!text.trim() || !liveMode) return;
    try { await sendMessage({ conversationId: selectedConversation.id, senderId: user.id, body: text.trim() }); setText(''); }
    catch (error) { onDemoAction(error.message || 'Could not send this message.'); }
  };
  const otherProfile = selectedConversation && (selectedConversation.buyer_id === user?.id ? selectedConversation.seller : selectedConversation.buyer);
  const personName = liveMode ? (otherProfile?.display_name || 'bese26 member') : 'Marketplace chat';
  const listingTitle = liveMode ? (selectedConversation.listing?.title || 'Listing no longer available') : 'No listing selected';
  const listingImage = liveMode ? liveListing?.image : null;
  const personInitials = liveMode ? ((otherProfile?.display_name || 'BE').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()) : 'BE';
  return <div className="page-stack messages-page"><div className="page-title-row"><div><div className="eyebrow">KEEP IT MOVING</div><h1>Messages</h1></div><span className="unread-pill">{liveMode ? 'Live chat' : 'Secure chat'}</span></div><div className="message-layout"><div className="conversation-list">{conversationLoading ? <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>Loading conversations</h3><p>Getting your secure conversations.</p></div> : conversations.length ? conversations.map((conversation) => { const other = conversation.buyer_id === user?.id ? conversation.seller : conversation.buyer; const name = other?.display_name || 'bese26 member'; return <button key={conversation.id} className={`conversation-row ${conversation.id === initialMessageId ? 'active' : ''}`} type="button" onClick={() => onSelectConversation?.(conversation)}><Avatar initials={name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} tone="rose" /><div className="conversation-copy"><strong>{name}</strong><span>{conversation.listing?.title || 'Marketplace listing'}</span></div><div className="conversation-meta"><small>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleDateString() : 'New'}</small></div></button>; }) : <div className="empty-state compact-empty"><MessageCircle size={24} /><h3>No conversations yet</h3><p>When you chat with a seller, your messages will appear here.</p></div>}</div><div className="chat-panel"><div className="chat-header"><div className="chat-person"><Avatar initials={personInitials} tone="rose" /><div><strong>{personName}</strong><span><span className="online-dot" /> {liveMode ? 'Messages are protected by your account' : 'Start a conversation from a listing'}</span></div></div></div><div className="chat-context">{listingImage ? <img src={listingImage} alt="" /> : <div className="chat-context-placeholder"><Package size={17} /></div>}<div><span>About this listing</span><strong>{listingTitle}</strong></div></div><div className="chat-messages">{liveMode ? (liveLoading ? <div className="chat-empty-note">Loading messages…</div> : liveMessages.length ? liveMessages.map((item) => <div className={`message-bubble ${item.sender_id === user.id ? 'mine' : 'other'}`} key={item.id}>{item.body || 'Attachment'}<small>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.sender_id === user.id && <Check size={12} />}</small></div>) : <div className="chat-empty-note">Start the conversation with a clear question about the listing.</div>) : <div className="chat-empty-note">Select a listing to start a real conversation.</div>}</div><div className="chat-composer"><button className="icon-button" aria-label="Attach image" disabled><ImageIcon size={18} /></button><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Write a message..." disabled={!liveMode} /><button className="send-button" onClick={send} disabled={!liveMode}><Send size={16} /></button></div></div></div></div>;
}





function ListingModal({ listing, onClose, isSaved, onToggleSave, onDemoAction, onStartChat }) {
  const [activeImage, setActiveImage] = useState(0);
  if (!listing) return null;
  const gallery = listing.gallery?.length ? listing.gallery : [listing.image];
  const specs = Object.entries(listing.attributes || {}).filter(([, value]) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)).slice(0, 6).map(([key, value]) => `${key.replace(/[_-]+/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`);
  if (!specs.length) specs.push(listing.condition, listing.subcategory || listing.category).filter(Boolean);
  const nextImage = () => setActiveImage((index) => (index + 1) % gallery.length);
  const previousImage = () => setActiveImage((index) => (index - 1 + gallery.length) % gallery.length);
  return <div className="modal-backdrop" onClick={onClose}><div className="listing-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close icon-button" onClick={onClose} aria-label="Close listing"><X size={18} /></button><div className="modal-image-wrap"><img src={gallery[activeImage]} alt={`${listing.title} image ${activeImage + 1}`} /><div className="modal-image-count">{activeImage + 1} / {gallery.length}</div>{gallery.length > 1 && <><button className="gallery-control gallery-control-prev" onClick={previousImage} aria-label="Previous listing photo"><ArrowLeft size={18} /></button><button className="gallery-control gallery-control-next" onClick={nextImage} aria-label="Next listing photo"><ArrowRight size={18} /></button></>}</div>{gallery.length > 1 && <div className="modal-gallery-thumbs">{gallery.map((image, index) => <button key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`View listing photo ${index + 1}`}><img src={image} alt="" /></button>)}</div>}<div className="modal-content"><div className="modal-topline"><span className="eyebrow">{listing.category}</span><button className={`save-button ${isSaved ? 'saved' : ''}`} aria-label={isSaved ? 'Remove from saved' : 'Save listing'} onClick={() => onToggleSave(listing.id)}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} /></button></div><h1>{listing.title}</h1><div className="modal-price">{listing.price}</div><div className="detail-pills"><span>{listing.condition}</span><span><MapPin size={13} /> {listing.location}</span><span><Clock3 size={13} /> {listing.posted}</span></div><p className="listing-description">{listing.description}</p><div className="modal-specs"><div className="modal-section-label">Key details</div><div className="modal-spec-chip-list">{specs.map((spec) => <span key={spec}>{spec}</span>)}</div></div><div className="seller-detail"><Avatar initials={listing.sellerInitials || 'BE'} tone="rose" /><div><span>Listed by</span><strong>{listing.seller} {listing.verified && <BadgeCheck size={15} />}</strong><small>{listing.sellerRating ? <><Star size={12} fill="currentColor" /> {listing.sellerRating.toFixed(1)} seller rating</> : 'Seller rating not available yet'}</small></div><ChevronRight size={16} /></div>{listing.deliveryOptions?.length > 0 && <div className="modal-delivery-note"><Package size={17} /><span><strong>Delivery options</strong><small>{listing.deliveryOptions.join(' · ')}</small></span></div>}<div className="modal-actions"><button className="primary-button modal-chat-button" onClick={() => onStartChat(listing)}>Chat with seller <MessageCircle size={17} /></button></div></div></div></div>;
}




export default function App() {
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
  const [chatListing, setChatListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const requireAuth = (message = 'Sign in to continue with your marketplace account.') => { setShowAuth(true); showToast(message); };
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const [remoteListings, remoteCategories] = await Promise.all([fetchActiveListings(), fetchCategories()]);
        if (mounted) {
          setMarketListings(remoteListings);
          setMarketCategories(remoteCategories);
        }
        if (session?.user) {
          const [remoteSaved, admin] = await Promise.all([fetchSavedIds(session.user.id), isAdminUser(session.user.id)]);
          if (mounted) { setSavedIds(remoteSaved); setIsAdmin(admin); }
        } else if (mounted) {
          setIsAdmin(false);
        }
        if (mounted) setSessionUser(session?.user || null);
      } catch (error) {
        if (mounted) showToast(error.message || 'Could not load live marketplace data.');
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

  const renderView = () => {
    if (activeNav === 'home') return <HomeView marketListings={marketListings} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} />;
    if (activeNav === 'search') return <SearchView marketListings={marketListings} categories={marketCategories} search={search} setSearch={setSearch} onOpenListing={openListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={() => navigate('home')} />;
    if (activeNav === 'saved') return <SavedView marketListings={marketListings} savedIds={savedIds} onOpenListing={openListing} onToggleSave={toggleSave} />;
    if (activeNav === 'wallet') return <UnavailableView icon={WalletCards} eyebrow="WALLET" title="Wallet is coming soon" description="Wallet, payments, and transactions are not connected yet. No balance or transaction data is shown until the real service is ready." onBack={() => navigate('home')} />;
    if (activeNav === 'subscription') return <SubscriptionView user={sessionUser} onBack={() => navigate('profile')} onAuthRequired={() => requireAuth('Sign in to view your seller plan.')} onDemoAction={showToast} />;
    if (activeNav === 'ai') return <UnavailableView icon={Sparkles} eyebrow="AI TOOLS" title="AI tools are coming soon" description="The marketplace assistant is not connected yet. Bese26 will not show invented AI answers or recommendations." onBack={() => navigate('home')} />;
    if (activeNav === 'sell') return <SellView user={sessionUser} initialListing={editingListing} onAuthRequired={() => requireAuth('Sign in before posting a listing.')} onDemoAction={showToast} onOpenSubscription={() => navigate('subscription')} />;
    if (activeNav === 'messages') return <MessagesView user={sessionUser} liveListing={chatListing} onDemoAction={showToast} initialMessageId={chatTargetId} onSelectConversation={(conversation) => { setChatTargetId(conversation.id); setChatListing(null); }} />;
    if (activeNav === 'admin') return isAdmin ? <AdminView user={sessionUser} onBack={() => navigate('profile')} onNotice={showToast} /> : <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => navigate('sell')} onEditListing={(listing) => { setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={false} onOpenAdmin={() => {}} onOpenSubscription={() => navigate('subscription')} />;
    return <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => navigate('sell')} onEditListing={(listing) => { setEditingListing(listing); navigate('sell'); }} onOpenListing={openListing} onToggleSave={toggleSave} isActive={activeNav === 'profile'} isAdmin={isAdmin} onOpenAdmin={() => navigate('admin')} onOpenSubscription={() => navigate('subscription')} />;
  };

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`}>
    <main className="main-container"><Suspense fallback={<div className="route-loading" role="status">Loading bese26…</div>}>{renderView()}</Suspense></main>
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ key, label, icon: Icon }) => <button key={key} aria-current={activeNav === key ? 'page' : undefined} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} /></span><span>{label}</span></button>)}</nav>

    {showAuth && <AuthPanel onClose={() => setShowAuth(false)} onAuthenticated={(user) => { setSessionUser(user); showToast('Signed in to bese26.'); }} />}
    <ListingModal listing={selectedListing} onClose={() => setSelectedListing(null)} isSaved={selectedListing ? savedIds.includes(selectedListing.id) : false} onToggleSave={toggleSave} onDemoAction={showToast} onStartChat={openChat} />
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}
