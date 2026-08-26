import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
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
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react';
import { listings } from '../data';

function Avatar({ initials, tone = 'navy', size = 'md' }) {
  return <div className={`avatar avatar-${tone} avatar-${size}`}>{initials}</div>;
}

function VerifiedBadge({ text = 'Verified Seller' }) {
  return <span className="verified-badge"><BadgeCheck size={13} strokeWidth={2.6} /> {text}</span>;
}

const statItems = [
  { label: 'Listings', value: '125', page: 'listings' },
  { label: 'Sold', value: '48', page: 'sold' },
  { label: 'Saved', value: '32', page: 'saved' },
  { label: 'Reviews', value: '24', page: 'reviews' },
];

const marketplaceItems = [
  { label: 'My Listings', description: 'Manage your active products', icon: Package, page: 'listings', tone: 'coral' },
  { label: 'Saved Items', description: 'Products you want to revisit', icon: Heart, page: 'saved', tone: 'lavender' },
  { label: 'Sold Items', description: 'Your completed marketplace sales', icon: Tag, page: 'sold', tone: 'gold' },
  { label: 'My Reviews', description: 'Feedback from your buyers', icon: Star, page: 'reviews', tone: 'mint' },
];

const sellerItems = [
  { label: 'Seller Profile', description: 'Preview your public storefront', icon: Store, page: 'seller-profile', tone: 'navy' },
  { label: 'Seller Analytics', description: 'See how your listings perform', icon: BarChart3, page: 'analytics', tone: 'lavender' },
  { label: 'Promote Listings', description: 'Reach more nearby buyers', icon: Sparkles, page: 'promote', tone: 'gold' },
  { label: 'My Promotions', description: 'Review current and past boosts', icon: MegaphoneIcon, page: 'promotions', tone: 'coral' },
];

function MegaphoneIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 11 16-5v12L3 14v-3Z" /><path d="M11 15.5 12.5 20" /><path d="M19 10a3 3 0 0 1 0 4" /></svg>;
}

function ProfileMenuCard({ item, onOpen }) {
  const Icon = item.icon;
  return <button className="profile-menu-card" onClick={() => onOpen(item.page)}><span className={`profile-menu-card-icon ${item.tone}`}><Icon size={17} /></span><span className="profile-menu-card-copy"><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={16} /></button>;
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return <div className="profile-toggle-row"><span className="profile-toggle-icon"><Icon size={16} /></span><span className="profile-toggle-copy"><strong>{label}</strong><small>{description}</small></span><button className={`profile-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-label={`Toggle ${label}`}><span /></button></div>;
}

function SubpageHeader({ title, eyebrow, onBack }) {
  return <div className="profile-subpage-header"><button className="icon-button" onClick={onBack}><ArrowLeft size={18} /></button><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div></div>;
}

function ListingManager({ onBack, tab, setTab, onDemoAction }) {
  const tabs = ['Active', 'Pending', 'Sold', 'Expired'];
  const tabListings = listings.slice(0, tab === 'Sold' ? 2 : 3);
  return <div className="profile-subpage"><SubpageHeader title="My Listings" eyebrow="SELLER CENTER" onBack={onBack} /><div className="profile-tabs">{tabs.map((name) => <button className={tab === name ? 'active' : ''} key={name} onClick={() => setTab(name)}>{name}{name === 'Active' && <b>12</b>}</button>)}</div><div className="managed-listings">{tabListings.map((listing, index) => <div className="managed-listing" key={listing.id}><img src={listing.image} alt="" /><div className="managed-listing-copy"><div className="managed-listing-top"><span className={`status-pill ${tab.toLowerCase()}`}>{tab}</span><button className="icon-button"><MoreHorizontal size={16} /></button></div><strong>{index === 0 && tab === 'Active' ? 'Toyota Corolla 2017' : listing.title}</strong><b>{index === 0 && tab === 'Active' ? '₦8,500,000' : listing.price}</b><span><MapPin size={12} /> {tab === 'Active' ? 'Kano' : listing.location}</span><div className="managed-meta"><span><Eye size={12} /> {index === 0 ? '1,240' : '682'} views</span><span><Heart size={12} /> {index === 0 ? '86' : '32'} saves</span></div></div><button className="managed-edit" onClick={() => onDemoAction('Listing editor opened.') }><Pencil size={14} /> Edit</button></div>)}</div><button className="primary-button full-width" onClick={() => onDemoAction('Create listing opened.') }><Plus size={16} /> Create new listing</button></div>;
}

function AnalyticsPage({ onBack }) {
  const bars = [42, 65, 54, 78, 61, 88, 73];
  return <div className="profile-subpage"><SubpageHeader title="Seller Analytics" eyebrow="SELLER CENTER" onBack={onBack} /><div className="analytics-range"><span>Last 30 days</span><ChevronRight size={14} /></div><div className="analytics-stats"><div><Eye size={15} /><strong>12.4k</strong><span>Listing views</span><small>+18.4%</small></div><div><Heart size={15} /><strong>684</strong><span>Saves</span><small>+9.2%</small></div><div><MessageCircle size={15} /><strong>246</strong><span>Messages</span><small>+22.1%</small></div><div><Users size={15} /><strong>1.8k</strong><span>Profile visits</span><small>+14.8%</small></div></div><section className="analytics-card"><div className="analytics-card-head"><div><div className="eyebrow">LISTING PERFORMANCE</div><h2>Views this week</h2></div><span className="analytics-total">3,840</span></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-column" key={height + index}><div className="bar" style={{ height: `${height}%` }} /><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}</div></section><section className="performance-list"><div className="performance-head"><div className="eyebrow">TOP PERFORMERS</div><span>Views</span></div>{listings.slice(0, 3).map((listing, index) => <div className="performance-row" key={listing.id}><img src={listing.image} alt="" /><span><strong>{listing.title}</strong><small>{index === 0 ? '1,240' : index === 1 ? '682' : '491'} views</small></span><b>{index === 0 ? '↑ 24%' : index === 1 ? '↑ 17%' : '↑ 9%'}</b></div>)}</section></div>;
}

function PromotePage({ onBack, onDemoAction }) {
  const options = [{ title: 'Boost Listing', price: '₦1,500', detail: 'Reach buyers near you', icon: ArrowRight }, { title: 'Featured Listing', price: '₦3,000', detail: 'Stand out in search results', icon: Sparkles }, { title: 'Top Placement', price: '₦5,500', detail: 'Get the best position for 7 days', icon: Store }];
  return <div className="profile-subpage"><SubpageHeader title="Promote Listings" eyebrow="GET NOTICED" onBack={onBack} /><div className="promote-intro"><div className="promote-intro-icon"><Sparkles size={22} /></div><div><h2>Put your best listing in front.</h2><p>Choose a promotion package to grow your listing reach.</p></div></div><div className="promotion-options">{options.map(({ title, price, detail, icon: Icon }) => <button className="promotion-option" key={title} onClick={() => onDemoAction(`${title} selected — confirmation shown.`)}><span className="promotion-option-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{detail}</small></span><b>{price}</b><ChevronRight size={15} /></button>)}</div><div className="marketplace-note">More buyers can discover your listings with a promotion.</div></div>;
}

function SimpleInfoPage({ page, onBack, onDemoAction, isDark, onToggleTheme }) {
  const [toggles, setToggles] = useState({ messages: true, listing: true, saved: true, promotions: false, recommendations: true, announcements: false, visibility: true, showLocation: true, online: true, contact: true, personalization: true });
  const [language, setLanguage] = useState('English');
  const [location, setLocation] = useState('Kano, Nigeria');
  const [faqOpen, setFaqOpen] = useState(null);
  const flip = (key) => setToggles((old) => ({ ...old, [key]: !old[key] }));
  const back = <SubpageHeader title={page.title} eyebrow={page.eyebrow} onBack={onBack} />;
  if (page.key === 'reviews') return <div className="profile-subpage">{back}<div className="review-summary"><div><strong>4.9</strong><span><Star size={14} fill="currentColor" /> average rating</span></div><div className="review-bars"><span>5 <i><b style={{ width: '92%' }} /></i></span><span>4 <i><b style={{ width: '48%' }} /></i></span><span>3 <i><b style={{ width: '18%' }} /></i></span></div></div><div className="review-list">{[['Aisha Bello','Great communication and exactly as described.','2 days ago'],['Musa Ibrahim','Smooth exchange. The product was in excellent condition.','1 week ago'],['Hauwa Sani','Very responsive seller, would buy again.','2 weeks ago']].map(([name, text, date], index) => <div className="review-card" key={name}><Avatar initials={name.split(' ').map((word) => word[0]).join('')} tone={index === 1 ? 'gold' : 'rose'} /><div><strong>{name}</strong><span><Star size={12} fill="currentColor" /> 5.0 · {date}</span><p>{text}</p></div></div>)}</div></div>;
  if (page.key === 'seller-profile') return <div className="profile-subpage">{back}<div className="public-seller-card"><Avatar initials="MA" tone="navy" size="xl" /><h2>Sayyeed Muhd Baba</h2><span>@sayyeed</span><VerifiedBadge /><div className="product-meta"><MapPin size={13} /> Kano, Nigeria</div><div className="seller-stats"><Star size={13} fill="currentColor" /> 4.9 · 24 reviews <span>•</span> 125 listings</div><button className="primary-button" onClick={() => onDemoAction('Public seller preview opened.')}>Preview storefront <ArrowRight size={15} /></button></div><SectionLabel title="Seller's products" eyebrow="PUBLIC LISTINGS" /><div className="product-grid profile-product-grid">{listings.slice(0, 2).map((listing) => <MiniProduct key={listing.id} listing={listing} />)}</div></div>;
  if (page.key === 'promotions') return <div className="profile-subpage">{back}<section className="promo-summary"><div className="eyebrow">CURRENTLY PROMOTED</div><h2>iPhone 13 Pro 256GB</h2><div className="promo-progress"><span style={{ width: '68%' }} /></div><div className="promo-summary-foot"><span>4 days remaining</span><b>1,820 views</b></div></section><SectionLabel title="Promotion history" eyebrow="PAST CAMPAIGNS" /><div className="history-list"><div><span className="status-pill active">Completed</span><strong>Featured Listing</strong><small>iPhone 12 · Aug 12, 2026</small><b>₦3,000</b></div><div><span className="status-pill expired">Expired</span><strong>Boost Listing</strong><small>MacBook Air M1 · Jul 30, 2026</small><b>₦1,500</b></div></div></div>;
  if (page.key === 'personal') return <div className="profile-subpage">{back}<div className="personal-photo"><Avatar initials="MA" tone="navy" size="xl" /><button className="icon-button"><Pencil size={16} /></button></div><div className="personal-fields"><label>Full name<input defaultValue="Sayyeed Muhd Baba" /></label><label>Username<input defaultValue="@sayyeed" /></label><label>Phone number<input defaultValue="+234 803 000 0000" /></label><label>Email<input defaultValue="sayyeed@example.com" /></label><label>Location<input defaultValue="Kano, Nigeria" /></label></div><button className="primary-button full-width" onClick={() => onDemoAction('Personal information saved successfully.')}>Save changes <Check size={16} /></button></div>;
  if (page.key === 'notifications') return <div className="profile-subpage">{back}<div className="settings-card">{[['messages','Messages','New chat and seller replies',MessageCircle],['listing','Listing updates','Changes to your listings',Package],['saved','Saved search alerts','New matches for saved searches',Heart],['promotions','Promotions','Boosts and campaign updates',Sparkles],['recommendations','Recommendations','Personalized picks for you',Star],['announcements','Marketplace announcements','News from bese26',Bell]].map(([key, label, description, Icon]) => <ToggleRow key={key} icon={Icon} label={label} description={description} checked={toggles[key]} onChange={() => flip(key)} />)}</div></div>;
  if (page.key === 'language') return <div className="profile-subpage">{back}<div className="language-list">{['English', 'Hausa', 'Yoruba', 'Igbo', 'Kanuri'].map((item) => <button key={item} className={language === item ? 'selected' : ''} onClick={() => { setLanguage(item); onDemoAction(`${item} selected.`); }}><span><Globe2 size={16} />{item}</span>{language === item && <Check size={17} />}</button>)}</div><p className="profile-help-note">Your language preference is ready for the marketplace experience.</p></div>;
  if (page.key === 'location') return <div className="profile-subpage">{back}<div className="location-choice-list">{['Kano, Nigeria', 'Abuja, Nigeria', 'Kaduna, Nigeria', 'Katsina, Nigeria', 'Lagos, Nigeria', 'Other Nigerian locations'].map((item) => <button key={item} className={location === item ? 'selected' : ''} onClick={() => { setLocation(item); onDemoAction(`${item} selected.`); }}><span><MapPin size={16} />{item}</span>{location === item && <Check size={17} />}</button>)}</div></div>;
  if (page.key === 'appearance') return <div className="profile-subpage">{back}<div className="appearance-options">{[['Light', SunIcon], ['Dark', Moon], ['System', MonitorIcon]].map(([name, Icon]) => <button key={name} className={name === (isDark ? 'Dark' : 'Light') ? 'selected' : ''} onClick={() => { if (name === 'Dark' && !isDark) onToggleTheme(); if (name === 'Light' && isDark) onToggleTheme(); if (name === 'System') onDemoAction('System appearance selected.'); }}><span><Icon size={17} />{name}</span>{name === (isDark ? 'Dark' : 'Light') && <Check size={17} />}</button>)}</div></div>;
  if (page.key === 'privacy') return <div className="profile-subpage">{back}<div className="settings-card">{[['visibility','Profile visibility','Allow people to discover your seller profile',Eye],['showLocation','Show location','Display your city on listings',MapPin],['online','Show online status','Let buyers know when you are active',Users],['contact','Allow seller contact','Allow buyers to start a conversation',MessageCircle],['personalization','Personalized recommendations','Use activity to improve suggestions',Sparkles]].map(([key, label, description, Icon]) => <ToggleRow key={key} icon={Icon} label={label} description={description} checked={toggles[key]} onChange={() => flip(key)} />)}</div><p className="profile-help-note">Your privacy preferences are saved on this device.</p></div>;
  if (page.key === 'security') return <div className="profile-subpage">{back}<div className="future-card"><LockKeyhole size={22} /><div><strong>Account security is coming.</strong><p>Authentication and account protection will be connected in the production version.</p></div></div><div className="settings-card security-list">{['Login & Password','Phone Verification','Email Verification','Two-Factor Authentication'].map((item) => <button key={item} onClick={() => onDemoAction(`${item} will be available in production.`)}><span><LockKeyhole size={16} />{item}</span><span className="future-pill">Future feature</span><ChevronRight size={15} /></button>)}</div></div>;
  if (page.key === 'help') { const faqs = [['How do I find products?', 'Use the search bar or browse the categories on Home to find listings near you.'], ['How do I post a listing?', 'Open Sell, add your photos and details, then preview before publishing your listing.'], ['How do I promote a listing?', 'Open Seller Center from Profile and choose Promote Listings to compare packages.'], ['How do I contact a seller?', 'Open any listing and tap Chat with seller to start a conversation.']]; return <div className="profile-subpage">{back}<div className="faq-list">{faqs.map(([question, answer], index) => <div className={`faq-item ${faqOpen === index ? 'open' : ''}`} key={question}><button onClick={() => setFaqOpen(faqOpen === index ? null : index)}><span><CircleHelp size={16} />{question}</span><ChevronDownIcon open={faqOpen === index} /></button>{faqOpen === index && <p>{answer}</p>}</div>)}</div></div>; }
  if (page.key === 'safety') return <div className="profile-subpage">{back}<div className="safety-hero"><ShieldCheck size={22} /><div><h2>Protect yourself</h2><p>Good habits make every exchange more comfortable.</p></div></div><div className="safety-list">{['Avoid suspicious offers or pressure to pay quickly.', 'Meet in safe, public places and tell someone where you are going.', 'Inspect products before paying or sharing sensitive details.', 'Report suspicious users, listings, or messages to the Bese team.'].map((tip) => <div key={tip}><Check size={16} />{tip}</div>)}</div><div className="safety-actions"><button onClick={() => onDemoAction('Report user flow opened.')}>Report a User <ArrowRight size={15} /></button><button onClick={() => onDemoAction('Report listing flow opened.')}>Report a Listing <ArrowRight size={15} /></button></div><p className="profile-help-note">Always use your judgment and report anything that feels unsafe.</p></div>;
  if (page.key === 'report') return <div className="profile-subpage">{back}<div className="report-form"><label>What happened?<select defaultValue="Bug"><option>Bug</option><option>Incorrect listing</option><option>Suspicious seller</option><option>Harassment</option><option>Spam</option><option>Technical issue</option><option>Other</option></select></label><label>Describe the problem<textarea placeholder="Tell us what happened..." /></label><button className="primary-button full-width" onClick={() => onDemoAction('Report submitted successfully.')}>Submit report <ArrowRight size={16} /></button></div></div>;
  if (page.key === 'terms' || page.key === 'privacy-policy') return <div className="profile-subpage">{back}<article className="legal-card"><div className="legal-updated">Marketplace policy · Last updated Aug 2026</div><h2>{page.key === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}</h2><p>This is structured marketplace policy content for bese26. It can be reviewed and updated as the marketplace grows.</p>{(page.key === 'terms' ? ['Using the marketplace', 'Listings and exchanges', 'Safety and reporting'] : ['Information we collect', 'Listings and messages', 'Location and analytics', 'AI features and privacy']).map((heading) => <section key={heading}><h3>{heading}</h3><p>Users should provide accurate information, use the marketplace responsibly, and respect other people. Final policy language, retention periods, and legal obligations will be added before the production release.</p></section>)}</article></div>;
  return <div className="profile-subpage">{back}<div className="future-card"><LogOut size={22} /><div><strong>Authentication will be available in the production version.</strong><p>You can manage account access and deletion when account security is enabled.</p></div></div><button className="primary-button full-width" onClick={() => onDemoAction('Authentication will be available in the production version.')}>Got it</button></div>;
}

function SunIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }
function MonitorIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>; }
function ChevronDownIcon({ open }) { return <ChevronRight size={16} className={open ? 'rotate-90' : ''} />; }
function SectionLabel({ eyebrow, title }) { return <div className="profile-section-label"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>; }
function MiniProduct({ listing }) { return <div className="mini-product"><img src={listing.image} alt={listing.title} /><strong>{listing.title}</strong><b>{listing.price}</b></div>; }

const subpages = {
  listings: { title: 'My Listings', eyebrow: 'SELLER CENTER' },
  sold: { title: 'Sold Items', eyebrow: 'MY MARKETPLACE', key: 'listings' },
  saved: { title: 'Saved Items', eyebrow: 'MY MARKETPLACE', key: 'saved' },
  reviews: { title: 'My Reviews', eyebrow: 'MY MARKETPLACE', key: 'reviews' },
  'seller-profile': { title: 'Seller Profile', eyebrow: 'PUBLIC STORE' },
  analytics: { title: 'Seller Analytics', eyebrow: 'SELLER CENTER' },
  promote: { title: 'Promote Listings', eyebrow: 'GET NOTICED' },
  promotions: { title: 'My Promotions', eyebrow: 'SELLER CENTER' },
  personal: { title: 'Personal Information', eyebrow: 'ACCOUNT' },
  notifications: { title: 'Notifications', eyebrow: 'ACCOUNT' },
  language: { title: 'Language', eyebrow: 'ACCOUNT' },
  location: { title: 'Location', eyebrow: 'ACCOUNT' },
  appearance: { title: 'Appearance', eyebrow: 'PREFERENCES' },
  privacy: { title: 'Privacy', eyebrow: 'PREFERENCES' },
  security: { title: 'Security', eyebrow: 'PREFERENCES' },
  help: { title: 'Help Center', eyebrow: 'HELP & SAFETY' },
  safety: { title: 'Safety Center', eyebrow: 'HELP & SAFETY' },
  report: { title: 'Report a Problem', eyebrow: 'HELP & SAFETY' },
  terms: { title: 'Terms & Conditions', eyebrow: 'LEGAL' },
  'privacy-policy': { title: 'Privacy Policy', eyebrow: 'LEGAL' },
  logout: { title: 'Logout', eyebrow: 'ACCOUNT' },
};

export default function ProfileView({ onDemoAction, isDark, onToggleTheme, onNavigate, isActive = true }) {
  const [subPage, setSubPage] = useState('main');
  useEffect(() => { if (isActive) setSubPage('main'); }, [isActive]);
  const [listingTab, setListingTab] = useState('Active');
  const open = (page) => { if (page === 'saved' && onNavigate) { onNavigate('saved'); return; } setSubPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  if (subPage === 'listings' || subPage === 'sold') return <ListingManager onBack={() => setSubPage('main')} tab={subPage === 'sold' ? 'Sold' : listingTab} setTab={setListingTab} onDemoAction={onDemoAction} />;
  if (subPage === 'analytics') return <AnalyticsPage onBack={() => setSubPage('main')} />;
  if (subPage === 'promote') return <PromotePage onBack={() => setSubPage('main')} onDemoAction={onDemoAction} />;
  if (subPage !== 'main') return <SimpleInfoPage page={subpages[subPage]} onBack={() => setSubPage('main')} onDemoAction={onDemoAction} isDark={isDark} onToggleTheme={onToggleTheme} />;
  return <div className="page-stack profile-page premium-profile"><section className="profile-cover"><button className="cover-menu icon-button"><MoreHorizontal size={19} /></button><div className="profile-heading"><Avatar initials="SM" tone="navy" size="xl" /><div className="profile-identity"><div className="profile-name-row"><h1>Sayyeed Muhd Baba</h1><VerifiedBadge /></div><span className="profile-username">@sayyeed</span><div className="product-meta"><MapPin size={13} /> Kano, Nigeria</div><div className="seller-stats"><Star size={13} fill="currentColor" /> 4.9 <span>•</span> 24 reviews</div></div><button className="outline-button" onClick={() => open('personal')}><Pencil size={14} /> Edit profile</button></div></section><div className="profile-stats">{statItems.map((stat) => <button key={stat.label} onClick={() => open(stat.page)}><strong>{stat.value}</strong><span>{stat.label}</span></button>)}</div><section><SectionLabel eyebrow="YOUR ACTIVITY" title="My Marketplace" /><div className="profile-menu-grid">{marketplaceItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="GROW YOUR PRESENCE" title="Seller Center" /><div className="profile-menu-grid">{sellerItems.map((item) => <ProfileMenuCard item={item} onOpen={open} key={item.label} />)}</div></section><section><SectionLabel eyebrow="YOUR DETAILS" title="Account" /><div className="profile-list-card">{[['personal','Personal Information','Sayyeed Muhd Baba',UserRound],['notifications','Notifications','Messages and alerts are on',Bell],['language','Language','English',Globe2],['location','Location','Kano, Nigeria',MapPin]].map(([page, label, detail, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div></section><section><SectionLabel eyebrow="MAKE IT YOURS" title="Preferences" /><div className="profile-list-card">{[['appearance','Appearance',isDark ? 'Dark mode' : 'Light mode',Moon],['privacy','Privacy','Profile and recommendations',Eye],['security','Security','Future account features',LockKeyhole]].map(([page, label, detail, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={15} /></button>)}</div></section><section><SectionLabel eyebrow="WE ARE HERE TO HELP" title="Help & Safety" /><div className="profile-menu-grid profile-menu-grid-three">{[['help','Help Center',CircleHelp],['safety','Safety Center',ShieldCheck],['report','Report a Problem',TriangleAlert]].map(([page, label, Icon]) => <button className="profile-menu-card" key={page} onClick={() => open(page)}><span className="profile-menu-card-icon coral"><Icon size={17} /></span><span className="profile-menu-card-copy"><strong>{label}</strong><small>Learn more</small></span><ChevronRight size={16} /></button>)}</div></section><section><SectionLabel eyebrow="READ BEFORE YOU USE BESE26" title="Legal" /><div className="profile-list-card">{[['terms','Terms & Conditions',FileText],['privacy-policy','Privacy Policy',BookOpen]].map(([page, label, Icon]) => <button key={page} onClick={() => open(page)}><span className="profile-list-icon"><Icon size={16} /></span><span><strong>{label}</strong><small>Marketplace policy</small></span><ChevronRight size={15} /></button>)}</div></section><section className="profile-account-actions"><button onClick={() => open('logout')}><LogOut size={16} /> Logout</button><button onClick={() => onDemoAction('Account deletion will be connected when authentication is implemented.') }><Trash2 size={16} /> Delete Account</button></section><section className="profile-footer-card"><ShieldCheck size={20} /><div><strong>bese26 marketplace</strong><span>Version 1.0 · About · Contact Support</span></div><ChevronRight size={16} /></section></div>;
}
