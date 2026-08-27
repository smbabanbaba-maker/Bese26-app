import { useEffect, useMemo, useState } from 'react';
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
  Menu,
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
  Wrench,
  X,
} from 'lucide-react';

import ProfileView from './components/ProfileView';
import AdminView from './components/AdminView';
import SellView from './components/SellView';
import AuthPanel from './components/AuthPanel';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { fetchActiveListings, fetchCategories, fetchSavedIds, fetchConversations, fetchMessages, getOrCreateConversation, isAdminUser, sendMessage, signOut, subscribeToMessages, toggleFavorite } from './lib/marketplace';

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
  { key: 'profile', label: 'Profile', icon: UserRound },
];

function formatNaira(value) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function Logo() {
  return (
    <div className="brand-lockup" aria-label="bese26 home">
      <div className="brand-mark">B</div>
      <div>
        <div className="brand-name">bese26</div>
        <div className="brand-tagline">marketplace</div>
      </div>
    </div>
  );
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
    <article className={`product-card ${compact ? 'product-card-compact' : ''}`} onClick={() => onOpen(listing)}>
      <div className="product-image-wrap">
        {listing.image ? <img src={listing.image} alt={listing.title} className="product-image" /> : <div className="product-image-placeholder"><Package size={26} /></div>}
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

function HomeView({ marketListings, onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
  return (
    <div className="page-stack home-page">
      <section className="discovery-banner">
        <div className="discovery-copy">
          <div className="eyebrow light">WELCOME TO BESE26</div>
          <h1>Shop smarter.<br /><span>Sell with confidence.</span></h1>
          <p>Discover everyday essentials from people and businesses near you.</p>
        </div>
        <div className="discovery-actions">
          <div className="discovery-stat"><strong>{marketListings.length}</strong><span><Package size={12} /> live listings</span></div>
          <button className="discovery-cta" onClick={() => onSearch('')}>Explore listings <ArrowRight size={16} /></button>
        </div>
        <div className="discovery-accent"><Sparkles size={18} /></div>
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
    <section><SectionHeading title="Saved listings" />{saved.length ? <div className="saved-list">{saved.map((listing) => <div className="saved-row" key={listing.id}><div className="saved-row-media" onClick={() => onOpenListing(listing)}>{listing.image ? <img src={listing.image} alt={listing.title} /> : <Package size={20} />}</div><div className="saved-row-copy" onClick={() => onOpenListing(listing)}><strong>{listing.title}</strong><span>{listing.location}</span><b>{listing.price}</b></div><button className="save-button saved" aria-label={`Remove ${listing.title} from saved`} onClick={() => onToggleSave(listing.id)}><Heart size={17} fill="currentColor" /></button></div>)}</div> : <div className="empty-state compact-empty"><Bookmark size={24} /><h3>Your shortlist is empty</h3><p>Approved listings you save will appear here.</p></div>}</section>
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSessionUser(session?.user || null);
      if (event === 'SIGNED_IN' && session?.user) {
        fetchSavedIds(session.user.id).then(setSavedIds).catch(() => {});
        isAdminUser(session.user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
      }
      if (event === 'SIGNED_OUT') { setSavedIds([]); setIsAdmin(false); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);
  const navigate = (page) => { if (page === 'profile' && activeNav === 'profile') setProfileReset((value) => value + 1); setActiveNav(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goSearch = (value) => { setSearch(value); navigate('search'); };
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
    if (activeNav === 'home') return <HomeView marketListings={marketListings} onOpenListing={setSelectedListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} />;
    if (activeNav === 'search') return <SearchView marketListings={marketListings} categories={marketCategories} search={search} setSearch={setSearch} onOpenListing={setSelectedListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={() => navigate('home')} />;
    if (activeNav === 'saved') return <SavedView marketListings={marketListings} savedIds={savedIds} onOpenListing={setSelectedListing} onToggleSave={toggleSave} />;
    if (activeNav === 'sell') return <SellView user={sessionUser} onAuthRequired={() => requireAuth('Sign in before posting a listing.')} onDemoAction={showToast} />;
    if (activeNav === 'messages') return <MessagesView user={sessionUser} liveListing={chatListing} onDemoAction={showToast} initialMessageId={chatTargetId} onSelectConversation={(conversation) => { setChatTargetId(conversation.id); setChatListing(null); }} />;
    if (activeNav === 'admin') return isAdmin ? <AdminView user={sessionUser} onBack={() => navigate('profile')} onNotice={showToast} /> : <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => navigate('sell')} isActive={activeNav === 'profile'} isAdmin={false} onOpenAdmin={() => {}} />;
    return <ProfileView key={profileReset} user={sessionUser} onAuthRequired={() => requireAuth('Sign in to manage your profile.')} onSignOut={async () => { try { await signOut(); showToast('Signed out of bese26.'); } catch (error) { showToast(error.message || 'Could not sign out.'); } }} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} onCreateListing={() => navigate('sell')} isActive={activeNav === 'profile'} isAdmin={isAdmin} onOpenAdmin={() => navigate('admin')} />;
  };

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`}>
    <header className="topbar"><div className="topbar-inner"><button className="mobile-menu icon-button"><Menu size={20} /></button><Logo /><div className="desktop-location"><MapPin size={15} /><span>Marketplace</span><strong>Nigeria</strong><ChevronDown size={14} /></div><div className="topbar-actions"><button className="topbar-search" onClick={() => navigate('search')}><Search size={17} /><span>Search listings</span><kbd>⌘ K</kbd></button><button type="button" className="topbar-avatar-button" onClick={() => sessionUser ? navigate('profile') : setShowAuth(true)} aria-label={sessionUser ? 'Open profile' : 'Sign in'}><Avatar initials={sessionUser ? (sessionUser.user_metadata?.display_name || sessionUser.email || 'BE').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'MA'} tone="navy" /></button></div></div></header>
    <main className="main-container">{renderView()}</main>
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ key, label, icon: Icon }) => <button key={key} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} /></span><span>{label}</span></button>)}</nav>

    {showAuth && <AuthPanel onClose={() => setShowAuth(false)} onAuthenticated={(user) => { setSessionUser(user); showToast('Signed in to bese26.'); }} />}
    <ListingModal listing={selectedListing} onClose={() => setSelectedListing(null)} isSaved={selectedListing ? savedIds.includes(selectedListing.id) : false} onToggleSave={toggleSave} onDemoAction={showToast} onStartChat={openChat} />
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}
