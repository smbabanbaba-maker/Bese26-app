import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  FileText,
  Globe2,
  Heart,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Package,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { fetchMyListings, fetchSellerStats, getProfile, getProfileContacts, updateProfile, updateProfileContacts } from '../lib/marketplace';

function Avatar({ initials, tone = 'navy', size = 'md' }) {
  return <div className={`avatar avatar-${tone} avatar-${size}`}>{initials}</div>;
}

function VerifiedBadge({ text = 'Verified Seller' }) {
  return <span className="verified-badge"><BadgeCheck size={13} strokeWidth={2.6} /> {text}</span>;
}

const marketplaceItems = [
  { label: 'My Listings', description: 'Manage your real marketplace listings', icon: Package, page: 'listings', tone: 'coral' },
  { label: 'Saved Items', description: 'Listings you saved from the marketplace', icon: Heart, page: 'saved', tone: 'lavender' },
  { label: 'Sold Items', description: 'Listings marked as sold', icon: Tag, page: 'sold', tone: 'gold' },
];

function ProfileMenuCard({ item, onOpen }) {
  const Icon = item.icon;
  return <button className="profile-menu-card" onClick={() => onOpen(item.page)}><span className={`profile-menu-card-icon ${item.tone}`}><Icon size={17} /></span><span className="profile-menu-card-copy"><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={16} /></button>;
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return <div className="profile-toggle-row"><span className="profile-toggle-icon"><Icon size={16} /></span><span className="profile-toggle-copy"><strong>{label}</strong><small>{description}</small></span><button className={`profile-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-label={`Toggle ${label}`}><span /></button></div>;
}

function SubpageHeader({ title, eyebrow, onBack }) {
  return <div className="profile-subpage-header"><button className="icon-button" onClick={onBack} aria-label={`Back from ${title}`}><ArrowLeft size={18} /></button><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div></div>;
}

function ListingManager({ user, onBack, tab, setTab, onDemoAction, onCreateListing }) {
  const tabs = ['Active', 'Pending', 'Sold', 'Expired'];
  const statusByTab = { Active: 'active', Pending: 'pending', Sold: 'sold', Expired: 'archived' };
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    fetchMyListings({ sellerId: user.id, status: statusByTab[tab] }).then((rows) => mounted && setItems(rows)).catch((requestError) => mounted && setError(requestError.message || 'Could not load your listings.')).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [tab, user.id]);
  return <div className="profile-subpage"><SubpageHeader title="My Listings" eyebrow="SELLER CENTER" onBack={onBack} /><div className="profile-tabs">{tabs.map((name) => <button className={tab === name ? 'active' : ''} key={name} onClick={() => setTab(name)}>{name}{tab === name && !loading && <b>{items.length}</b>}</button>)}</div>{error && <div className="auth-status error">{error}</div>}{loading ? <div className="empty-state compact-empty"><Package size={24} /><h3>Loading your listings</h3><p>Getting the latest listings from your account.</p></div> : items.length ? <div className="managed-listings">{items.map((listing) => <div className="managed-listing" key={listing.id}>{listing.image ? <img src={listing.image} alt="" /> : <div className="managed-listing-placeholder"><Package size={20} /></div>}<div className="managed-listing-copy"><div className="managed-listing-top"><span className={`status-pill ${tab.toLowerCase()}`}>{listing.raw?.status || tab.toLowerCase()}</span><span className="managed-listing-category">{listing.category}</span></div><strong>{listing.title}</strong><b>{listing.price}</b><span><MapPin size={12} /> {listing.location}</span><div className="managed-meta"><span><Eye size={12} /> {Number(listing.raw?.views_count || 0).toLocaleString()} views</span><span>{listing.subcategory || listing.condition || 'Marketplace listing'}</span></div></div></div>)}</div> : <div className="empty-state compact-empty"><Package size={24} /><h3>No {tab.toLowerCase()} listings yet</h3><p>When you post a listing, it will appear here with its current status.</p></div>}<button className="primary-button full-width" onClick={onCreateListing}><Plus size={16} /> Create new listing</button></div>;
}

function SimpleInfoPage({ page, onBack, onDemoAction, isDark, onToggleTheme, user, onAuthRequired, onSignOut }) {
  const [toggles, setToggles] = useState({ messages: true, listing: true, saved: true, promotions: false, recommendations: true, announcements: false, visibility: true, showLocation: true, online: true, contact: true, personalization: true });
  const [language, setLanguage] = useState('English');
  const [location, setLocation] = useState('Kano, Nigeria');
  const [faqOpen, setFaqOpen] = useState(null);
  const [profileForm, setProfileForm] = useState({ displayName: user?.user_metadata?.display_name || '', username: user?.user_metadata?.username || '', phone: '', whatsapp: '', city: 'Kano', state: 'Kano', bio: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (!user || page.key !== 'personal') return undefined;
    Promise.all([getProfile(user.id), getProfileContacts(user.id)]).then(([profile, contacts]) => mounted && setProfileForm({ displayName: profile?.display_name || user.user_metadata?.display_name || '', username: profile?.username || user.user_metadata?.username || '', phone: contacts?.phone || '', whatsapp: contacts?.whatsapp || '', city: profile?.city || '', state: profile?.state || '', bio: profile?.bio || '' })).catch((error) => mounted && onDemoAction(error.message || 'Could not load your profile.'));
    return () => { mounted = false; };
  }, [page.key, user, onDemoAction]);
  const flip = (key) => setToggles((old) => ({ ...old, [key]: !old[key] }));
  const updateProfileField = (key, value) => setProfileForm((old) => ({ ...old, [key]: value }));
  const saveProfile = async () => {
    if (!user) { onAuthRequired?.(); return; }
    setProfileSaving(true);
    try {
      await updateProfile(user.id, { display_name: profileForm.displayName.trim() || 'bese26 user', username: profileForm.username.trim().replace(/^@/, '') || null, city: profileForm.city.trim() || null, state: profileForm.state.trim() || null, bio: profileForm.bio.trim() || null });
      await updateProfileContacts(user.id, { phone: profileForm.phone.trim() || null, whatsapp: profileForm.whatsapp.trim() || null });
      onDemoAction('Personal information saved.');
    } catch (error) { onDemoAction(error.message || 'Could not save your profile.'); }
    finally { setProfileSaving(false); }
  };
  const back = <SubpageHeader title={page.title} eyebrow={page.eyebrow} onBack={onBack} />;
  if (page.key === 'personal') return <div className="profile-subpage">{back}<div className="personal-photo"><Avatar initials={(profileForm.displayName || 'BE').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()} tone="navy" size="xl" /></div><div className="personal-fields"><label>Full name<input value={profileForm.displayName} onChange={(event) => updateProfileField('displayName', event.target.value)} /></label><label>Username<input value={profileForm.username ? `@${profileForm.username.replace(/^@/, '')}` : ''} onChange={(event) => updateProfileField('username', event.target.value.replace(/^@/, ''))} /></label><label>Phone number<input value={profileForm.phone} onChange={(event) => updateProfileField('phone', event.target.value)} placeholder="e.g. +234 800 000 0000" /></label><label>WhatsApp number<input value={profileForm.whatsapp} onChange={(event) => updateProfileField('whatsapp', event.target.value)} placeholder="Optional" /></label><label>State<input value={profileForm.state} onChange={(event) => updateProfileField('state', event.target.value)} placeholder="e.g. Kano" /></label><label>City<input value={profileForm.city} onChange={(event) => updateProfileField('city', event.target.value)} placeholder="e.g. Kano Municipal" /></label><label>Bio<textarea value={profileForm.bio} onChange={(event) => updateProfileField('bio', event.target.value)} placeholder="Tell buyers a little about you" /></label><label>Email<input value={user?.email || ''} readOnly /></label></div><button className="primary-button full-width" disabled={profileSaving} onClick={saveProfile}>{profileSaving ? 'Saving…' : 'Save changes'} <Check size={16} /></button></div>;
  if (page.key === 'language') return <div className="profile-subpage">{back}<div className="language-list">{['English', 'Hausa', 'Yoruba', 'Igbo', 'Kanuri'].map((item) => <button key={item} className={language === item ? 'selected' : ''} onClick={() => { setLanguage(item); onDemoAction(`${item} selected.`); }}><span><Globe2 size={16} />{item}</span>{language === item && <Check size={17} />}</button>)}</div><p className="profile-help-note">Your language preference is ready for the marketplace experience.</p></div>;
  if (page.key === 'location') return <div className="profile-subpage">{back}<div className="location-choice-list">{['Kano, Nigeria', 'Abuja, Nigeria', 'Kaduna, Nigeria', 'Katsina, Nigeria', 'Lagos, Nigeria', 'Other Nigerian locations'].map((item) => <button key={item} className={location === item ? 'selected' : ''} onClick={() => { setLocation(item); onDemoAction(`${item} selected.`); }}><span><MapPin size={16} />{item}</span>{location === item && <Check size={17} />}</button>)}</div></div>;
  if (page.key === 'appearance') return <div className="profile-subpage">{back}<div className="appearance-options">{[['Light', SunIcon], ['Dark', Moon], ['System', MonitorIcon]].map(([name, Icon]) => <button key={name} className={name === (isDark ? 'Dark' : 'Light') ? 'selected' : ''} onClick={() => { if (name === 'Dark' && !isDark) onToggleTheme(); if (name === 'Light' && isDark) onToggleTheme(); if (name === 'System') onDemoAction('System appearance selected.'); }}><span><Icon size={17} />{name}</span>{name === (isDark ? 'Dark' : 'Light') && <Check size={17} />}</button>)}</div></div>;
  if (page.key === 'privacy') return <div className="profile-subpage">{back}<div className="settings-card">{[['visibility','Profile visibility','Allow people to discover your seller profile',Eye],['showLocation','Show location','Display your city on listings',MapPin],['online','Show online status','Let buyers know when you are active',Users],['contact','Allow seller contact','Allow buyers to start a conversation',MessageCircle],['personalization','Personalized recommendations','Use activity to improve suggestions',Sparkles]].map(([key, label, description, Icon]) => <ToggleRow key={key} icon={Icon} label={label} description={description} checked={toggles[key]} onChange={() => flip(key)} />)}</div><p className="profile-help-note">Your privacy preferences are saved on this device.</p></div>;
  if (page.key === 'security') return <div className="profile-subpage">{back}<div className="future-card"><LockKeyhole size={22} /><div><strong>Email and password sign-in is enabled.</strong><p>Keep your password private and use the sign-out action on shared devices.</p></div></div></div>;
  if (page.key === 'help') { const faqs = [['How do I find products?', 'Use the search bar or browse approved listings on Home and Search.'], ['How do I post a listing?', 'Open Sell, add your photos and details, then submit the listing for moderation.'], ['How do I save a listing?', 'Open a listing and tap the heart icon. Saved listings require an account.'], ['How do I contact a seller?', 'Open an approved listing and tap Chat with seller to start a real conversation.']]; return <div className="profile-subpage">{back}<div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${faqOpen === index ? 'open' : ''}`} key={question}><button onClick={() => setFaqOpen(faqOpen === index ? null : index)}><span><CircleHelp size={16} />{question}</span><ChevronDownIcon open={faqOpen === index} /></button>{faqOpen === index && <p>{answer}</p>}</div>)}</div></div>; }
  if (page.key === 'safety') return <div className="profile-subpage">{back}<div className="safety-hero"><ShieldCheck size={22} /><div><h2>Protect yourself</h2><p>Good habits make every exchange more comfortable.</p></div></div><div className="safety-list">{['Avoid suspicious offers or pressure to pay quickly.', 'Meet in safe, public places and tell someone where you are going.', 'Inspect products before paying or sharing sensitive details.', 'Keep communication inside bese26 when possible.'].map((tip) => <div key={tip}><Check size={16} />{tip}</div>)}</div><p className="profile-help-note">Always use your judgment when buying or selling.</p></div>;
  if (page.key === 'terms' || page.key === 'privacy-policy') return <div className="profile-subpage">{back}<article className="legal-card"><div className="legal-updated">Marketplace policy · Last updated Aug 2026</div><h2>{page.key === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}</h2><p>This is structured marketplace policy content for bese26. It can be reviewed and updated as the marketplace grows.</p>{(page.key === 'terms' ? ['Using the marketplace', 'Listings and exchanges', 'Safety and reporting'] : ['Information we collect', 'Listings and messages', 'Location and analytics', 'AI features and privacy']).map((heading) => <section key={heading}><h3>{heading}</h3><p>Users should provide accurate information, use the marketplace responsibly, and respect other people. Final policy language, retention periods, and legal obligations will be added before the production release.</p></section>)}</article></div>;
  if (page.key === 'logout') return <div className="profile-subpage">{back}<div className="future-card"><LogOut size={22} /><div><strong>{user ? 'Sign out of bese26?' : 'Sign in to manage your account.'}</strong><p>{user ? 'You can sign back in at any time with your email and password.' : 'Create listings, save items, and chat with sellers after signing in.'}</p></div></div><button className="primary-button full-width" onClick={() => user ? onSignOut?.() : onAuthRequired?.()}>{user ? 'Sign out' : 'Sign in'} <ArrowRight size={16} /></button></div>;
}

function SunIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function MonitorIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>; }
function ChevronDownIcon({ open }) { return <ChevronRight size={16} className={open ? 'rotate-90' : ''} />; }
function SectionLabel({ eyebrow, title }) { return <div className="profile-section-label"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>; }

const subpages = {
  listings: { title: 'My Listings', eyebrow: 'SELLER CENTER' },
  sold: { title: 'Sold Items', eyebrow: 'MY MARKETPLACE', key: 'listings' },
  saved: { title: 'Saved Items', eyebrow: 'MY MARKETPLACE', key: 'saved' },
  reviews: { title: 'My Reviews', eyebrow: 'MY MARKETPLACE', key: 'reviews' },
  'seller-profile': { title: 'Seller Profile', eyebrow: 'PUBLIC STORE' },
  analytics: { title: 'Seller Analytics', eyebrow: 'SELLER CENTER' },
  promote: { title: 'Promote Listings', eyebrow: 'GET NOTICED' },
  personal: { title: 'Personal Information', eyebrow: 'ACCOUNT' },
  language: { title: 'Language', eyebrow: 'ACCOUNT' },
  location: { title: 'Location', eyebrow: 'ACCOUNT' },
  appearance: { title: 'Appearance', eyebrow: 'PREFERENCES' },
  privacy: { title: 'Privacy', eyebrow: 'PREFERENCES' },
  security: { title: 'Security', eyebrow: 'PREFERENCES' },
  help: { title: 'Help Center', eyebrow: 'HELP & SAFETY' },
  safety: { title: 'Safety Center', eyebrow: 'HELP & SAFETY' },
  terms: { title: 'Terms & Conditions', eyebrow: 'LEGAL' },
  'privacy-policy': { title: 'Privacy Policy', eyebrow: 'LEGAL' },
  logout: { title: 'Logout', eyebrow: 'ACCOUNT' },
};

export default function ProfileView({ user, onAuthRequired, onSignOut, onDemoAction, isDark, onToggleTheme, onNavigate, onCreateListing, isActive = true }) {
  const [subPage, setSubPage] = useState('main');
  const [listingTab, setListingTab] = useState('Active');
  const [stats, setStats] = useState(null);
  const [profileRecord, setProfileRecord] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  useEffect(() => { if (isActive) setSubPage('main'); }, [isActive]);
  useEffect(() => {
    let mounted = true;
    if (!user) { setStats(null); setProfileRecord(null); return undefined; }
    setStatsLoading(true);
    Promise.all([fetchSellerStats(user.id), getProfile(user.id)]).then(([nextStats, nextProfile]) => { if (mounted) { setStats(nextStats); setProfileRecord(nextProfile); } }).catch((error) => mounted && onDemoAction(error.message || 'Could not load your profile.')).finally(() => mounted && setStatsLoading(false));
    return () => { mounted = false; };
  }, [user, onDemoAction]);
  const displayName = profileRecord?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Your bese26 profile';
  const username = profileRecord?.username ? `@${profileRecord.username}` : user?.user_metadata?.username ? `@${user.user_metadata.username}` : user?.email || 'Sign in to personalize your profile';
  const profileLocation = [profileRecord?.city, profileRecord?.state].filter(Boolean).join(', ') || 'Location not set';
  const profileInitials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BE';
  const requiresAccount = ['listings', 'sold', 'personal'];
  const open = (page) => { if (!user && requiresAccount.includes(page)) { onAuthRequired?.(); return; } if (page === 'saved' && onNavigate) { onNavigate('saved'); return; } setSubPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  if (subPage === 'listings' || subPage === 'sold') return <ListingManager user={user} onBack={() => setSubPage('main')} tab={subPage === 'sold' ? 'Sold' : listingTab} setTab={setListingTab} onDemoAction={onDemoAction} onCreateListing={onCreateListing} />;
  if (subPage !== 'main') return <SimpleInfoPage page={{ ...subpages[subPage], key: subPage }} onBack={() => setSubPage('main')} onDemoAction={onDemoAction} isDark={isDark} onToggleTheme={onToggleTheme} user={user} onAuthRequired={onAuthRequired} onSignOut={onSignOut} />;
  const profileStats = [
    { label: 'Listings', value: statsLoading ? '…' : stats?.listings ?? 0, page: 'listings' },
    { label: 'Sold', value: statsLoading ? '…' : stats?.sold ?? 0, page: 'sold' },
    { label: 'Saved', value: statsLoading ? '…' : stats?.saved ?? 0, page: 'saved' },
  ];
  return <div className="page-stack profile-page premium-profile"><section className="profile-cover"><div className="profile-heading"><Avatar initials={profileInitials} tone="navy" size="xl" /><div className="profile-identity"><div className="profile-name-row"><h1>{displayName}</h1>{user && <VerifiedBadge text="Account" />}</div><span className="profile-username">{username}</span><div className="product-meta"><MapPin size={13} /> {profileLocation}</div><div className="seller-stats"><Star size={13} fill="currentColor" /> {stats?.rating ? stats.rating.toFixed(1) : 'New'} <span>•</span> {stats?.reviews || 0} reviews</div></div><button className="outline-button" onClick={() => user ? open('personal') : onAuthRequired?.()}><Pencil size={14} /> {user ? 'Edit profile' : 'Sign in'}</button></div></section><div className="profile-stats">{profileStats.map((stat) => <button key={stat.label} onClick={() => open(stat.page)}><strong>{stat.value}</strong><span>{stat.label}</span></button>)}</div><section><SectionLabel eyebrow="YOUR ACTIVITY" title="My Marketplace" /><div className="profile-menu-grid">{marketplaceItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="YOUR DETAILS" title="Account" /><div className="profile-list-card">{[['personal','Personal Information',displayName,UserRound],['language','Language','English',Globe2]].map(([page, label, detail, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div></section><section><SectionLabel eyebrow="PREFERENCES" title="Make it yours" /><div className="profile-list-card">{[['appearance','Appearance',isDark ? 'Dark mode' : 'Light mode',Moon],['privacy','Privacy','Profile and recommendations',Eye]].map(([page, label, detail, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div></section><section><SectionLabel eyebrow="HELP & SAFETY" title="Need help?" /><div className="profile-list-card">{[['help','Help Center','Find answers and guidance',CircleHelp],['safety','Safety Center','Trade with more confidence',ShieldCheck]].map(([page, label, detail, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div></section><section><SectionLabel eyebrow="LEGAL" title="Before you use bese26" /><div className="profile-list-card">{[['terms','Terms & Conditions',FileText],['privacy-policy','Privacy Policy',BookOpen]].map(([page, label, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>Marketplace policy</small></span><ChevronRight size={15} /></button>)}</div></section><section className="profile-account-actions"><button onClick={() => open('logout')}><LogOut size={16} /> Logout</button></section></div>;
}
