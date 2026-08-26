import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Cog,
  Dumbbell,
  Flag,
  Heart,
  House,
  Image as ImageIcon,
  Laptop,
  MapPin,
  MessageCircle,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Tag,
  UserRound,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import { categories, demoAiReplies, listings, messages, notifications, sellers, transactions } from './data';
import ProfileView from './components/ProfileView';
import SellView from './components/SellView';

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
        <img src={listing.image} alt={listing.title} className="product-image" />
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

function HomeView({ onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
  return (
    <div className="page-stack home-page">
      <section className="discovery-banner">
        <div className="discovery-copy">
          <div className="eyebrow light">GOOD AFTERNOON, MUSA · KANO</div>
          <h1>Shop smarter.<br /><span>Sell with confidence.</span></h1>
          <p>Discover everyday essentials from people and businesses near you.</p>
        </div>
        <div className="discovery-actions">
          <div className="discovery-stat"><strong>4.9</strong><span><Star size={12} fill="currentColor" /> trusted sellers</span></div>
          <button className="discovery-cta" onClick={() => onSearch('')}>Explore listings <ArrowRight size={16} /></button>
        </div>
        <div className="discovery-accent"><Sparkles size={18} /></div>
      </section>

      <section className="search-section">
        <div className="search-box home-search">
          <Search size={18} />
          <input aria-label="Search listings" placeholder="Search for products, services and more" onKeyDown={(event) => event.key === 'Enter' && onSearch(event.currentTarget.value)} />
          <button className="camera-button" aria-label="Add a photo to search" onClick={() => onSearch('')}><Camera size={21} /></button>
          <button className="search-submit" aria-label="Search" onClick={() => onSearch('')}><Search size={20} /></button>
        </div>
        <div className="location-row"><MapPin size={14} /><span>Showing listings around</span><strong>Kano, Nigeria</strong><ChevronDown size={14} /></div>
      </section>

      <section>
        <SectionHeading eyebrow="CURATED FOR YOU" title="Featured listings" action="View all" onAction={() => onNavigate('search')} />
        <div className="product-grid">
          {listings.slice(0, 4).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-strip-item"><span className="trust-strip-icon"><ShieldCheck size={16} /></span><span><strong>Verified sellers</strong><small>Trade with more confidence</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-blue"><MessageCircle size={16} /></span><span><strong>Safe conversations</strong><small>Chat before you meet</small></span></div>
        <div className="trust-strip-item"><span className="trust-strip-icon trust-strip-gold"><MapPin size={16} /></span><span><strong>Near you</strong><small>Discover locally</small></span></div>
      </section>

      <section className="recent-section">
        <SectionHeading eyebrow="PICK UP WHERE YOU LEFT OFF" title="Recently viewed" action="See history" onAction={() => onNavigate('search')} />
        <div className="mini-list recent-list">
          {listings.slice(1, 4).map((listing) => <ProductCard key={listing.id} listing={listing} compact onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}
        </div>
      </section>

    </div>
  );
}

function SearchView({ search, setSearch, onOpenListing, savedIds, onToggleSave, onBack }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState('Recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = listings.filter((listing) => !term || `${listing.title} ${listing.location} ${listing.category}`.toLowerCase().includes(term));
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
      <div className="filter-toolbar"><div className="filter-scroll"><button className={activeCategory === 'All' ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory('All')}>All listings</button>{categories.slice(0, 6).map((category) => <button key={category.name} className={activeCategory === category.name ? 'filter-chip active' : 'filter-chip'} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}</div><button className="filter-button" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersIcon /> Filters</button></div>
      {filtersOpen && <div className="filter-drawer"><div><span>Location</span><button>Kano <ChevronDown size={14} /></button></div><div><span>Condition</span><button>Any condition <ChevronDown size={14} /></button></div><div><span>Sort by</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Newest</option><option>Price low → high</option><option>Price high → low</option></select></div></div>}
      <div className="search-result-head"><span>Recommended for you</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Newest</option><option>Price low → high</option><option>Price high → low</option></select></div>
      {filtered.length ? <div className="product-grid search-grid">{filtered.map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}</div> : <div className="empty-state"><Search size={25} /><h3>No listings found</h3><p>Try a different search term or browse all categories.</p><button className="primary-button" onClick={() => { setSearch(''); setActiveCategory('All'); }}>Clear search</button></div>}
    </div>
  );
}

function WalletView({ onDemoAction }) {
  return <div className="page-stack">
    <div className="page-title-row"><div><div className="eyebrow">YOUR MONEY, YOUR PACE</div><h1>Wallet</h1></div><button className="icon-button"><MoreHorizontal size={19} /></button></div>
    <section className="wallet-card"><div className="wallet-top"><span>Available balance</span><span className="balance-label">AVAILABLE BALANCE</span></div><div className="wallet-balance">₦125,000<span>.00</span></div><div className="wallet-bottom"><span>Ready when you are.</span><div className="wallet-dots"><i /><i /><i /></div></div></section>
    <div className="wallet-actions"><button onClick={() => onDemoAction('Add money will be available with your marketplace balance.')}><Plus size={18} /> Add money</button><button onClick={() => onDemoAction('Withdraw will be available with your marketplace balance.')}><ArrowRight size={18} /> Withdraw</button></div>
    <section><SectionHeading eyebrow="RECENT ACTIVITY" title="Transactions" action="See all" /><div className="transaction-list">{transactions.map((item) => <div className="transaction-row" key={item.label}><div className={`transaction-icon ${item.type}`}><WalletCards size={16} /></div><div className="transaction-copy"><strong>{item.label}</strong><span>{item.date}</span></div><strong className={item.type === 'in' ? 'amount-in' : ''}>{item.amount}</strong></div>)}</div></section>
    <section className="wallet-promo"><div className="wallet-promo-icon"><Sparkles size={20} /></div><div><div className="eyebrow">SELL MORE, SMARTER</div><h3>Boost your best listing.</h3><p>Reach more people around Kano with a promotion.</p></div><button className="icon-button" onClick={() => onDemoAction('Promotion preview opened.')}><ChevronRight size={18} /></button></section>
  </div>;
}

function SavedView({ savedIds, onOpenListing, onToggleSave, onDemoAction }) {
  const saved = listings.filter((listing) => savedIds.includes(listing.id));
  return <div className="page-stack"><div className="page-title-row"><div><div className="eyebrow">KEEP AN EYE ON IT</div><h1>Saved</h1></div><span className="count-bubble">{saved.length}</span></div>
    <section><SectionHeading title="Saved listings" action="Browse more" onAction={() => onDemoAction('Browse more from Home.')} />{saved.length ? <div className="saved-list">{saved.map((listing) => <div className="saved-row" key={listing.id}><img src={listing.image} alt="" onClick={() => onOpenListing(listing)} /><div className="saved-row-copy" onClick={() => onOpenListing(listing)}><strong>{listing.title}</strong><span>{listing.location}</span><b>{listing.price}</b></div><button className="save-button saved" onClick={() => onToggleSave(listing.id)}><Heart size={17} fill="currentColor" /></button></div>)}</div> : <div className="empty-state compact-empty"><Bookmark size={24} /><h3>Your shortlist is empty</h3><p>Tap the heart on any listing to save it for later.</p></div>}</section>
    <section className="saved-search-card"><div className="saved-search-top"><div className="saved-search-icon"><Search size={17} /></div><div><div className="eyebrow">SAVED SEARCH</div><h3>Phones under ₦300,000</h3></div><button className="toggle on"><span /></button></div><p>Notify me when matching listings appear</p><div className="saved-search-bottom"><span>Updated 12 min ago</span><button onClick={() => onDemoAction('Saved search settings opened.')}>Manage <ChevronRight size={14} /></button></div></section>
    <section><SectionHeading eyebrow="SELLERS YOU LIKE" title="Saved sellers" /><div className="saved-sellers">{sellers.slice(0, 2).map((seller) => <div className="saved-seller-row" key={seller.name}><Avatar initials={seller.initials} tone={seller.tone} /><div><strong>{seller.name}</strong><span>{seller.listings} active listings</span></div><Heart size={16} fill="currentColor" className="saved-heart" /></div>)}</div></section>
  </div>;
}



function MessagesView({ onDemoAction }) {
  const [activeMessage, setActiveMessage] = useState(messages[0]);
  const [text, setText] = useState('');
  const [sent, setSent] = useState([]);
  const send = () => { if (!text.trim()) return; setSent((items) => [...items, text.trim()]); setText(''); };
  return <div className="page-stack messages-page"><div className="page-title-row"><div><div className="eyebrow">KEEP IT MOVING</div><h1>Messages</h1></div><span className="unread-pill">2 unread</span></div><div className="message-layout"><div className="conversation-list">{messages.map((message) => <button key={message.id} className={`conversation-row ${activeMessage.id === message.id ? 'active' : ''}`} onClick={() => setActiveMessage(message)}><Avatar initials={message.initials} tone={message.tone} /><div className="conversation-copy"><strong>{message.name}</strong><span>{message.preview}</span></div><div className="conversation-meta"><small>{message.time}</small>{message.unread > 0 && <b>{message.unread}</b>}</div></button>)}</div><div className="chat-panel"><div className="chat-header"><div className="chat-person"><Avatar initials={activeMessage.initials} tone={activeMessage.tone} /><div><strong>{activeMessage.name}</strong><span><span className="online-dot" /> Usually replies quickly</span></div></div><button className="icon-button" onClick={() => onDemoAction('Chat options opened.')}><MoreHorizontal size={18} /></button></div><div className="chat-context"><img src={activeMessage.image} alt="" /><div><span>About this listing</span><strong>{activeMessage.listing}</strong></div><ChevronRight size={15} /></div><div className="chat-messages"><div className="message-bubble other">Hi, I’m interested in this listing. Is it still available?<small>09:36</small></div><div className="message-bubble mine">Yes, it is available for inspection today.<small>09:39 <Check size={12} /></small></div><div className="message-bubble other">{activeMessage.preview}<small>09:42</small></div>{sent.map((item, i) => <div className="message-bubble mine" key={`${item}-${i}`}>{item}<small>now <Check size={12} /></small></div>)}</div><div className="chat-composer"><button className="icon-button"><ImageIcon size={18} /></button><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Write a message..." /><button className="send-button" onClick={send}><Send size={16} /></button></div></div></div></div>;
}

function AiView({ onNavigate }) {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const ask = (value = input) => { if (!value.trim()) return; setInput(value); setLoading(true); window.setTimeout(() => { const key = value.toLowerCase().includes('phone') ? 'phones' : value.toLowerCase().includes('sell') ? 'sell' : 'default'; setReply(demoAiReplies[key]); setLoading(false); }, 650); };
  return <div className="page-stack ai-page premium-ai-page"><section className="ai-hero"><div className="ai-hero-top"><div className="ai-brand-mark"><Sparkles size={20} /></div><strong>bese26 AI</strong><span className="ai-live-pill">SMART SEARCH</span></div><div className="ai-hero-body"><div className="eyebrow">YOUR MARKETPLACE COMPANION</div><h1>Find it faster.<br /><span>Buy with confidence.</span></h1><p>Tell bese26 what you need. Compare products, discover trusted sellers, and make your next move with clarity.</p></div><div className="ai-hero-footer"><span><ShieldCheck size={14} /> Built for better decisions</span><span>Ask about products, sellers, or selling</span></div></section><section className="ai-workspace"><div className="ai-section-heading"><div><div className="eyebrow">START WITH A PROMPT</div><h2>How can bese26 help?</h2></div><span>Always ready</span></div><div className="ai-suggestions"><button onClick={() => ask('Find phones under ₦300,000')}><Search size={15} /> Find phones under ₦300,000 <ArrowRight size={14} /></button><button onClick={() => ask('Help me sell my product')}><Sparkles size={15} /> Help me sell my product <ArrowRight size={14} /></button><button onClick={() => ask('Find cars around Kano')}><MapPin size={15} /> Find cars around Kano <ArrowRight size={14} /></button></div>{reply && <div className="ai-reply"><div className="ai-reply-avatar"><Sparkles size={15} /></div><div><span>bese26 AI</span><p>{reply}</p>{reply.includes('phones') && <button className="inline-link" onClick={() => onNavigate('search')}>Show matching listings <ArrowRight size={14} /></button>}</div></div>}{loading && <div className="ai-reply loading-reply"><div className="ai-reply-avatar"><Sparkles size={15} /></div><div><span>bese26 AI</span><div className="typing"><i /><i /><i /></div></div></div>}<div className="ai-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about products, prices, or selling..." /><div className="ai-composer-footer"><span><Sparkles size={14} /> bese26 marketplace assistant</span><button className="send-button" onClick={() => ask()}><ArrowRight size={17} /></button></div></div></section><section className="ai-confidence-strip"><div><span className="confidence-icon"><ShieldCheck size={16} /></span><span><strong>Seller-aware</strong><small>Use context before you buy</small></span></div><div><span className="confidence-icon purple"><MessageCircle size={16} /></span><span><strong>Conversation-ready</strong><small>Move from answer to chat</small></span></div><div><span className="confidence-icon gold"><Sparkles size={16} /></span><span><strong>Market-smart</strong><small>Make better decisions</small></span></div></section></div>;
}



function ListingModal({ listing, onClose, isSaved, onToggleSave, onDemoAction }) {
  if (!listing) return null;
  return <div className="modal-backdrop" onClick={onClose}><div className="listing-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close icon-button" onClick={onClose}><X size={18} /></button><div className="modal-image-wrap"><img src={listing.image} alt={listing.title} /><div className="modal-image-count">1 / 4</div></div><div className="modal-content"><div className="modal-topline"><span className="eyebrow">{listing.category}</span><button className={`save-button ${isSaved ? 'saved' : ''}`} onClick={() => onToggleSave(listing.id)}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} /></button></div><h1>{listing.title}</h1><div className="modal-price">{listing.price}</div><div className="detail-pills"><span>{listing.condition}</span><span><MapPin size={13} /> {listing.location}</span><span><Clock3 size={13} /> {listing.posted}</span></div><p className="listing-description">{listing.description}</p><div className="seller-detail"><Avatar initials="AB" tone="rose" /><div><span>Listed by</span><strong>{listing.seller} <BadgeCheck size={15} /></strong><small><Star size={12} fill="currentColor" /> 4.9 · 42 listings</small></div><ChevronRight size={16} /></div><div className="modal-actions"><button className="primary-button" onClick={() => onDemoAction('Chat opened successfully.')}>Chat with seller <MessageCircle size={16} /></button><button className="secondary-button" onClick={() => onDemoAction('Call request opened.')}> <Phone size={16} /> Call</button></div><div className="secondary-links"><button onClick={() => onDemoAction('Share sheet opened.') }><Share2 size={15} /> Share</button><button onClick={() => onDemoAction('Report flow opened.') }><Flag size={15} /> Report</button></div></div></div></div>;
}

function NotificationPanel({ onClose }) {
  return <div className="notification-panel"><div className="panel-header"><div><div className="eyebrow">STAY IN THE LOOP</div><h2>Notifications</h2></div><button className="icon-button" onClick={onClose}><X size={17} /></button></div><div className="notification-list">{notifications.map((item) => <div className={`notification-row ${item.unread ? 'unread' : ''}`} key={item.title}><div className="notification-icon"><Bell size={16} /></div><div><strong>{item.title}</strong><p>{item.detail}</p><span>{item.time}</span></div></div>)}</div><button className="panel-footer-button" onClick={onClose}>Mark all as read</button></div>;
}

function SlidersIcon() { return <span className="sliders-icon"><span /><span /><span /></span>; }

export default function App() {
  const [activeNav, setActiveNav] = useState('home');
  const [savedIds, setSavedIds] = useState([2, 4]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [search, setSearch] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState('');
  const [profileReset, setProfileReset] = useState(0);

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const toggleSave = (id) => { setSavedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); showToast(savedIds.includes(id) ? 'Removed from saved' : 'Saved for later'); };
  const navigate = (page) => { if (page === 'profile' && activeNav === 'profile') setProfileReset((value) => value + 1); setActiveNav(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goSearch = (value) => { setSearch(value); navigate('search'); };

  const renderView = () => {
    if (activeNav === 'home') return <HomeView onOpenListing={setSelectedListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} onShowNotifications={() => setShowNotifications(true)} />;
    if (activeNav === 'search') return <SearchView search={search} setSearch={setSearch} onOpenListing={setSelectedListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={() => navigate('home')} />;
    if (activeNav === 'wallet') return <WalletView onDemoAction={showToast} />;
    if (activeNav === 'saved') return <SavedView savedIds={savedIds} onOpenListing={setSelectedListing} onToggleSave={toggleSave} onDemoAction={showToast} />;
    if (activeNav === 'sell') return <SellView onDemoAction={showToast} />;
    if (activeNav === 'messages') return <MessagesView onDemoAction={showToast} />;
    if (activeNav === 'ai') return <AiView onNavigate={navigate} />;
    return <ProfileView key={profileReset} onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} onNavigate={navigate} isActive={activeNav === 'profile'} />;
  };

  return <div className={`app-shell ${isDark ? 'theme-dark' : ''}`}>
    <header className="topbar"><div className="topbar-inner"><button className="mobile-menu icon-button"><Menu size={20} /></button><Logo /><div className="desktop-location"><MapPin size={15} /><span>Delivering around</span><strong>Kano</strong><ChevronDown size={14} /></div><div className="topbar-actions"><button className="topbar-search" onClick={() => navigate('search')}><Search size={17} /><span>Search listings</span><kbd>⌘ K</kbd></button><button className="notification-button icon-button" aria-label="Notifications" onClick={() => setShowNotifications(true)}><Bell size={19} /><span className="notification-dot" /></button><Avatar initials="MA" tone="navy" /></div></div></header>
    <main className="main-container">{renderView()}</main>
    <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map(({ key, label, icon: Icon }) => <button key={key} className={`${activeNav === key ? 'active' : ''} ${key === 'sell' ? 'sell-nav' : ''}`} onClick={() => navigate(key)}><span className="nav-icon"><Icon size={26} strokeWidth={activeNav === key ? 2.35 : 1.95} /></span><span>{label}</span></button>)}</nav>
    {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
    <ListingModal listing={selectedListing} onClose={() => setSelectedListing(null)} isSaved={selectedListing ? savedIds.includes(selectedListing.id) : false} onToggleSave={toggleSave} onDemoAction={showToast} />
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}
