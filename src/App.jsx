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

function HomeView({ onOpenListing, savedIds, onToggleSave, onSearch, onNavigate, onShowNotifications }) {
  return (
    <div className="page-stack home-page">
      <section className="discovery-banner">
        <div className="discovery-copy">
          <div className="eyebrow light">WELCOME TO BESE26</div>
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

      <section className="browse-section">
        <div className="browse-heading"><div><div className="eyebrow">BROWSE BY NEED</div><h2>What are you looking for?</h2></div><button className="text-button" onClick={() => onNavigate('search')}>See all <ArrowRight size={15} /></button></div>
        <div className="category-strip">
          {['All', 'Phones', 'Electronics', 'Vehicles', 'Property', 'Fashion', 'Services', 'Home & Garden', 'Agriculture', 'Food & Groceries', 'Beauty', 'Sports & Leisure', 'Jobs', 'Machinery', 'Spare Parts', 'Baby & Kids', 'Health & Wellness', 'Books & Media', 'Business & Industry', 'Other'].map((label, index) => <button key={label} className={`category-filter ${index === 0 ? 'active' : ''}`} onClick={() => onSearch(label === 'All' ? '' : label)}>{label}</button>)}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="CURATED FOR YOU" title="Featured listings" action="View all" onAction={() => onNavigate('search')} />
        <div className="product-grid">
          {listings.slice(0, 4).map((listing) => <ProductCard key={listing.id} listing={listing} onOpen={onOpenListing} isSaved={savedIds.includes(listing.id)} onToggleSave={onToggleSave} />)}
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
    <section className="wallet-card"><div className="wallet-top"><span>Available balance</span><span className="demo-label">DEMO BALANCE</span></div><div className="wallet-balance">₦125,000<span>.00</span></div><div className="wallet-bottom"><span>Ready when you are.</span><div className="wallet-dots"><i /><i /><i /></div></div></section>
    <div className="wallet-actions"><button onClick={() => onDemoAction('Add money is a prototype action for now.')}><Plus size={18} /> Add money</button><button onClick={() => onDemoAction('Withdraw is a prototype action for now.')}><ArrowRight size={18} /> Withdraw</button></div>
    <section><SectionHeading eyebrow="RECENT ACTIVITY" title="Transactions" action="See all" /><div className="transaction-list">{transactions.map((item) => <div className="transaction-row" key={item.label}><div className={`transaction-icon ${item.type}`}><WalletCards size={16} /></div><div className="transaction-copy"><strong>{item.label}</strong><span>{item.date}</span></div><strong className={item.type === 'in' ? 'amount-in' : ''}>{item.amount}</strong></div>)}</div></section>
    <section className="wallet-promo"><div className="wallet-promo-icon"><Sparkles size={20} /></div><div><div className="eyebrow">SELL MORE, SMARTER</div><h3>Boost your best listing.</h3><p>Reach more people around Kano with a demo promotion.</p></div><button className="icon-button" onClick={() => onDemoAction('Promotion preview opened.')}><ChevronRight size={18} /></button></section>
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

function SellView({ onDemoAction }) {
  const [form, setForm] = useState({ title: '', price: '', description: '', category: 'Phones & Tablets' });
  const [generated, setGenerated] = useState(false);
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const generate = () => { setGenerated(false); window.setTimeout(() => { setForm({ title: 'Clean iPhone 13 Pro 256GB', price: '485000', description: 'Carefully used iPhone 13 Pro with strong battery health, original box and cable. Available for inspection in Kano.', category: 'Phones & Tablets' }); setGenerated(true); }, 700); };
  const publish = () => { onDemoAction('Listing Published Successfully — your demo listing is ready.'); setForm({ title: '', price: '', description: '', category: 'Phones & Tablets' }); setGenerated(false); };
  return <div className="page-stack sell-page"><div className="page-title-row"><div><div className="eyebrow">TURN CLUTTER INTO VALUE</div><h1>Sell something.</h1></div><span className="prototype-chip">Prototype</span></div>
    <section className="sell-intro"><div className="sell-intro-icon"><Camera size={23} /></div><div><h3>Start with a great photo.</h3><p>Good listings get noticed faster. You can use our demo gallery for now.</p></div><button className="icon-button"><ChevronRight size={18} /></button></section>
    <div className="form-section"><div className="form-section-title"><span className="step-number">01</span><div><div className="eyebrow">MAKE IT LOOK GOOD</div><h2>Add photos</h2></div></div><div className="photo-upload-row"><button className="upload-tile"><Plus size={23} /><span>Add photos</span></button><img src="/images/iphone-13-pro.jpg" alt="Demo listing" /><img src="/images/macbook-air.jpg" alt="Demo listing" /></div></div>
    <div className="form-section"><div className="form-section-title"><span className="step-number">02</span><div><div className="eyebrow">THE DETAILS</div><h2>Tell buyers about it</h2></div><button className="ai-assist-button" onClick={generate}><Sparkles size={16} /> Generate with AI</button></div>{generated && <div className="ai-generated"><CheckCircle2 size={17} /><span>Draft generated. Feel free to edit it.</span></div>}<div className="form-grid"><label>Title<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. iPhone 13 Pro 256GB" /></label><label>Category<select value={form.category} onChange={(e) => update('category', e.target.value)}>{categories.slice(0, 8).map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Price<input value={form.price} onChange={(e) => update('price', e.target.value)} placeholder="e.g. 485000" /></label><label>Condition<select><option>Used — Excellent</option><option>Used — Good</option><option>New</option></select></label><label className="full-field">Description<textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe what makes this listing special..." /></label></div></div>
    <div className="form-section"><div className="form-section-title"><span className="step-number">03</span><div><div className="eyebrow">MEET LOCALLY</div><h2>Set your location</h2></div></div><div className="location-input"><MapPin size={17} /><span>Kano</span><ChevronDown size={15} /></div></div>
    <section className="listing-preview"><div className="preview-label"><span>PREVIEW</span><span>Your listing</span></div><div className="preview-inner"><img src="/images/iphone-13-pro.jpg" alt="Preview" /><div><div className="product-price">{form.price ? formatNaira(form.price) : '₦0'}</div><h3>{form.title || 'Your product title'}</h3><div className="product-meta"><MapPin size={13} /> Kano, Nigeria</div><span className="preview-condition">Used • Excellent</span></div></div></section>
    <button className="publish-button" onClick={publish}>Publish demo listing <ArrowRight size={17} /></button><p className="prototype-note">This is a prototype. No real listing or transaction will be created.</p>
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
  return <div className="page-stack ai-page"><div className="ai-hero"><div className="ai-sparkle"><Sparkles size={26} /></div><div className="eyebrow">YOUR MARKETPLACE COMPANION</div><h1>Ask Bese.</h1><p>Search naturally, compare options, or get help creating a listing.</p></div><div className="ai-suggestions"><span>Try asking</span><button onClick={() => ask('Find phones under ₦300,000')}>Find phones under ₦300,000 <ArrowRight size={14} /></button><button onClick={() => ask('Help me sell my product')}>Help me sell my product <ArrowRight size={14} /></button><button onClick={() => ask('Find cars around Kano')}>Find cars around Kano <ArrowRight size={14} /></button></div>{reply && <div className="ai-reply"><div className="ai-reply-avatar"><Sparkles size={15} /></div><div><span>Bese AI</span><p>{reply}</p>{reply.includes('phones') && <button className="inline-link" onClick={() => onNavigate('search')}>Show matching listings <ArrowRight size={14} /></button>}</div></div>}{loading && <div className="ai-reply loading-reply"><div className="ai-reply-avatar"><Sparkles size={15} /></div><div><span>Bese AI</span><div className="typing"><i /><i /><i /></div></div></div>}<div className="ai-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="What are you looking for today?" /><div className="ai-composer-footer"><span><Sparkles size={14} /> Demo assistant — no live AI connected</span><button className="send-button" onClick={() => ask()}><ArrowRight size={17} /></button></div></div><div className="ai-note"><ShieldCheck size={16} /><span>Your conversations are only demo data in this prototype.</span></div></div>;
}

function ProfileView({ onDemoAction, isDark, onToggleTheme }) {
  return <div className="page-stack profile-page"><div className="profile-cover"><div className="profile-cover-shape" /><button className="cover-menu icon-button"><MoreHorizontal size={19} /></button><div className="profile-heading"><Avatar initials="MA" tone="navy" size="xl" /><div><div className="profile-name-row"><h1>Musa Abdullahi</h1><VerifiedBadge /></div><div className="product-meta"><MapPin size={13} /> Kano, Nigeria <span>•</span> Member since 2024</div><div className="seller-stats"><Star size={13} fill="currentColor" /> 4.9 rating <span>•</span> 24 reviews</div></div><button className="outline-button" onClick={() => onDemoAction('Edit profile is available in the next prototype phase.')}>Edit profile</button></div></div>
    <div className="profile-stats"><div><strong>12</strong><span>Active listings</span></div><div><strong>38</strong><span>Sold</span></div><div><strong>26</strong><span>Saved</span></div><div><strong>24</strong><span>Reviews</span></div></div>
    <section className="profile-menu-section"><SectionHeading eyebrow="YOUR SPACE" title="My marketplace" /><div className="profile-menu-grid">{['My listings', 'Active listings', 'Sold items', 'Saved', 'Reviews', 'Seller analytics'].map((item, i) => <button key={item} onClick={() => onDemoAction(`${item} opened.`)}><span className={`menu-icon menu-icon-${i}`}><Package size={17} /></span><span>{item}</span><ChevronRight size={15} /></button>)}</div></section>
    <section className="settings-section"><SectionHeading eyebrow="MAKE IT YOURS" title="Settings" /><div className="settings-list"><button onClick={onToggleTheme}><span><span className="setting-icon"><Moon size={17} /></span>Appearance</span><small>{isDark ? 'Dark mode' : 'Light mode'}</small><ChevronRight size={15} /></button><button onClick={() => onDemoAction('Notifications settings opened.')}><span><span className="setting-icon"><Bell size={17} /></span>Notifications</span><small>On</small><ChevronRight size={15} /></button><button onClick={() => onDemoAction('Language selection opened.')}><span><span className="setting-icon"><Sparkles size={17} /></span>Language</span><small>English</small><ChevronRight size={15} /></button></div></section>
    <section className="profile-footer-card"><ShieldCheck size={20} /><div><strong>Built for confident exchanges.</strong><span>Read our Safety Center before meeting someone.</span></div><ChevronRight size={16} /></section>
  </div>;
}

function ListingModal({ listing, onClose, isSaved, onToggleSave, onDemoAction }) {
  if (!listing) return null;
  return <div className="modal-backdrop" onClick={onClose}><div className="listing-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close icon-button" onClick={onClose}><X size={18} /></button><div className="modal-image-wrap"><img src={listing.image} alt={listing.title} /><div className="modal-image-count">1 / 4</div></div><div className="modal-content"><div className="modal-topline"><span className="eyebrow">{listing.category}</span><button className={`save-button ${isSaved ? 'saved' : ''}`} onClick={() => onToggleSave(listing.id)}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} /></button></div><h1>{listing.title}</h1><div className="modal-price">{listing.price}</div><div className="detail-pills"><span>{listing.condition}</span><span><MapPin size={13} /> {listing.location}</span><span><Clock3 size={13} /> {listing.posted}</span></div><p className="listing-description">{listing.description}</p><div className="seller-detail"><Avatar initials="AB" tone="rose" /><div><span>Listed by</span><strong>{listing.seller} <BadgeCheck size={15} /></strong><small><Star size={12} fill="currentColor" /> 4.9 · 42 listings</small></div><ChevronRight size={16} /></div><div className="modal-actions"><button className="primary-button" onClick={() => onDemoAction('Demo chat opened — no real message was sent.')}>Chat with seller <MessageCircle size={16} /></button><button className="secondary-button" onClick={() => onDemoAction('Call seller is a demo action.')}> <Phone size={16} /> Call</button></div><div className="secondary-links"><button onClick={() => onDemoAction('Share sheet opened.') }><Share2 size={15} /> Share</button><button onClick={() => onDemoAction('Report flow opened.') }><Flag size={15} /> Report</button></div></div></div></div>;
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

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const toggleSave = (id) => { setSavedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); showToast(savedIds.includes(id) ? 'Removed from saved' : 'Saved for later'); };
  const navigate = (page) => { setActiveNav(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goSearch = (value) => { setSearch(value); navigate('search'); };

  const renderView = () => {
    if (activeNav === 'home') return <HomeView onOpenListing={setSelectedListing} savedIds={savedIds} onToggleSave={toggleSave} onSearch={goSearch} onNavigate={navigate} onShowNotifications={() => setShowNotifications(true)} />;
    if (activeNav === 'search') return <SearchView search={search} setSearch={setSearch} onOpenListing={setSelectedListing} savedIds={savedIds} onToggleSave={toggleSave} onBack={() => navigate('home')} />;
    if (activeNav === 'wallet') return <WalletView onDemoAction={showToast} />;
    if (activeNav === 'saved') return <SavedView savedIds={savedIds} onOpenListing={setSelectedListing} onToggleSave={toggleSave} onDemoAction={showToast} />;
    if (activeNav === 'sell') return <SellView onDemoAction={showToast} />;
    if (activeNav === 'messages') return <MessagesView onDemoAction={showToast} />;
    if (activeNav === 'ai') return <AiView onNavigate={navigate} />;
    return <ProfileView onDemoAction={showToast} isDark={isDark} onToggleTheme={() => { setIsDark(!isDark); showToast(isDark ? 'Light mode enabled' : 'Dark mode enabled'); }} />;
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
