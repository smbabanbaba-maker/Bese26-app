import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Video,
  WalletCards,
  X,
} from 'lucide-react';

const categoryGroups = {
  Vehicles: ['Cars', 'Motorcycles', 'Tricycles', 'Trucks', 'Buses', 'Heavy equipment', 'Agricultural machinery', 'Spare parts', 'Vehicle accessories'],
  Electronics: ['Phones', 'Tablets', 'Computers', 'Laptops', 'TVs', 'Cameras', 'Audio', 'Gaming', 'Accessories', 'Networking equipment', 'Smart devices'],
  Property: ['Houses', 'Apartments', 'Land', 'Shops', 'Offices', 'Warehouses', 'Farms', 'Short-let', 'Commercial property'],
  Fashion: ['Men', 'Women', 'Children', 'Shoes', 'Bags', 'Watches', 'Jewelry', 'Accessories'],
  Agriculture: ['Crops', 'Seeds', 'Fertilizer', 'Agrochemicals', 'Farm equipment', 'Irrigation equipment', 'Livestock', 'Poultry', 'Animal feed', 'Greenhouses', 'Agricultural services'],
  'Home & Garden': ['Furniture', 'Kitchen', 'Appliances', 'Home décor', 'Garden equipment', 'Tools'],
  'Jobs & Services': ['Technology', 'Construction', 'Engineering', 'Design', 'Marketing', 'Education', 'Repair', 'Cleaning', 'Transport', 'Consulting', 'Freelance services', 'Other services'],
  'Business & Industrial': ['Machinery', 'Manufacturing equipment', 'Office equipment', 'Restaurant equipment', 'Wholesale goods', 'Industrial supplies'],
  'Food & Beverages': ['Food', 'Grains', 'Fresh produce', 'Processed food', 'Bakery', 'Catering'],
  'Babies & Kids': ['Baby clothing', 'Toys', 'Strollers', 'School items'],
  'Health & Beauty': ['Skincare', 'Haircare', 'Makeup', 'Health products'],
  'Sports & Fitness': ['Gym equipment', 'Sportswear', 'Outdoor gear'],
  'Books & Education': ['Books', 'Courses', 'School supplies'],
  'Pets & Animals': ['Pets', 'Pet supplies', 'Animal care'],
  'Hobbies & Collectibles': ['Collectibles', 'Musical instruments', 'Arts & crafts'],
  Other: ['Other products', 'Other services'],
};

const dynamicFields = {
  Vehicles: [
    ['make', 'Make', 'e.g. Toyota'], ['model', 'Model', 'e.g. Corolla'], ['year', 'Year', '2017'], ['mileage', 'Mileage', 'e.g. 85,000 km'], ['fuel', 'Fuel type', 'Select fuel type', ['Petrol', 'Diesel', 'Hybrid', 'Electric']], ['transmission', 'Transmission', 'Select transmission', ['Automatic', 'Manual']], ['engine', 'Engine size', 'e.g. 1.8L'], ['body', 'Body type', 'Select body type', ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van']], ['owners', 'Number of owners', 'e.g. 2'], ['registration', 'Registration status', 'Select status', ['Registered', 'Unregistered', 'Foreign used']],
  ],
  Electronics: [
    ['brand', 'Brand', 'e.g. Apple'], ['model', 'Model', 'e.g. iPhone 15 Pro'], ['storage', 'Storage', 'e.g. 256GB'], ['ram', 'RAM', 'e.g. 8GB'], ['network', 'Network', 'Select network', ['Unlocked', 'MTN', 'Airtel', 'Glo', '9mobile']], ['sim', 'SIM type', 'Select SIM type', ['Single SIM', 'Dual SIM', 'eSIM']], ['color', 'Color', 'e.g. Natural Titanium'], ['battery', 'Battery health', 'e.g. 94%'], ['warranty', 'Warranty', 'Select warranty', ['None', 'Seller warranty', 'Manufacturer warranty']],
  ],
  Property: [
    ['propertyType', 'Property type', 'Select type', ['House', 'Apartment', 'Land', 'Shop', 'Office', 'Warehouse', 'Farm']], ['listingType', 'Listing type', 'Select listing type', ['For sale', 'For rent', 'Short-let']], ['bedrooms', 'Bedrooms', 'e.g. 3'], ['bathrooms', 'Bathrooms', 'e.g. 3'], ['toilets', 'Toilets', 'e.g. 4'], ['size', 'Size', 'e.g. 500 sqm'], ['furnishing', 'Furnishing', 'Select furnishing', ['Furnished', 'Semi-furnished', 'Unfurnished']], ['parking', 'Parking', 'Select parking', ['Available', 'Not available']], ['power', 'Power supply', 'e.g. Prepaid meter, generator'], ['water', 'Water supply', 'e.g. Borehole'], ['security', 'Security', 'e.g. Estate security'], ['titleStatus', 'Title/document status', 'Select status', ['Verified documents', 'Documents available', 'Pending verification']],
  ],
  Agriculture: [
    ['productType', 'Product type', 'Select type', ['Crop', 'Livestock', 'Equipment', 'Farm service']], ['variety', 'Variety / species', 'e.g. Maize, broiler'], ['quantity', 'Quantity available', 'e.g. 100'], ['unit', 'Unit', 'Select unit', ['Item', 'Kg', 'Bag', 'Crate', 'Ton', 'Litre']], ['grade', 'Grade / quality', 'e.g. Grade A'], ['harvestDate', 'Harvest date', 'e.g. August 2026'], ['availability', 'Availability', 'Select availability', ['Available now', 'Pre-order', 'Seasonal']], ['minimumOrder', 'Minimum order quantity', 'e.g. 10'], ['wholesale', 'Wholesale / retail', 'Select option', ['Retail', 'Wholesale', 'Both']],
  ],
  'Jobs & Services': [
    ['serviceCategory', 'Service category', 'Select category', ['Technology', 'Construction', 'Design', 'Education', 'Repair', 'Cleaning', 'Transport', 'Consulting']], ['experience', 'Experience', 'e.g. 5 years'], ['serviceArea', 'Service area', 'e.g. Kano and nearby cities'], ['availability', 'Availability', 'Select availability', ['Available now', 'Weekdays', 'Weekends', 'By appointment']], ['pricingModel', 'Pricing model', 'Select model', ['Starting from', 'Per hour', 'Per day', 'Per project', 'Contact seller']], ['deliveryMethod', 'Delivery method', 'Select method', ['At buyer location', 'At seller location', 'Online service', 'Digital delivery']],
  ],
};

const initialForm = {
  category: 'Electronics', subcategory: 'Phones', title: '', description: '', condition: 'Used — Excellent',
  priceMode: 'Fixed price', currency: '₦ NGN', price: '', negotiable: true, quantity: '1', unit: 'item', minimumOrder: '1',
  state: 'Kano', city: 'Kano Municipal', area: 'Hotoro', approximate: true, delivery: 'Buyer pickup', deliveryFee: 'Free',
  contactChat: true, contactPhone: false, contactWhatsApp: false, sellerName: 'Sayyeed Muhd Baba', sellerHandle: '@sayyeed', sellerLocation: 'Kano, Nigeria',
};

const starterMedia = [
  { id: 'iphone-cover', src: '/images/iphone-13-pro.jpg', name: 'iphone-13-pro.jpg', type: 'image', cover: true },
  { id: 'macbook-detail', src: '/images/macbook-air.jpg', name: 'macbook-air.jpg', type: 'image', cover: false },
];

function Field({ label, value, onChange, placeholder, options, type = 'text', wide = false }) {
  return <label className={wide ? 'sell-field wide' : 'sell-field'}><span>{label}</span>{options ? <select value={value || options[0]} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : type === 'textarea' ? <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}</label>;
}

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`sell-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-label={`Toggle ${label}`}><span /></button>;
}

export default function SellView({ onDemoAction }) {
  const [form, setForm] = useState(() => { try { return { ...initialForm, ...JSON.parse(window.localStorage.getItem('bese26-sell-draft') || '{}') }; } catch { return initialForm; } });
  const [media, setMedia] = useState(starterMedia);
  const [draftSaved, setDraftSaved] = useState(false);
  const [errors, setErrors] = useState([]);
  const [publishState, setPublishState] = useState('idle');
  const mediaInput = useRef(null);
  const cameraInput = useRef(null);

  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors([]); setDraftSaved(false); };
  const subcategories = categoryGroups[form.category] || categoryGroups.Other;
  const fields = dynamicFields[form.category] || [];
  const priceLabel = form.priceMode === 'Starting from' ? 'Starting price' : form.priceMode === 'Contact seller' || form.priceMode === 'Price on request' || form.priceMode === 'Free' ? 'Price note' : 'Price';
  const priceDisplay = form.priceMode === 'Free' ? 'Free' : form.priceMode === 'Contact seller' || form.priceMode === 'Price on request' ? 'Contact seller' : form.price ? `${form.currency} ${Number(form.price).toLocaleString()}` : `${form.currency} 0`;
  const categoryNeedsCondition = !['Property', 'Jobs & Services'].includes(form.category);

  useEffect(() => {
    const timeout = window.setTimeout(() => { window.localStorage.setItem('bese26-sell-draft', JSON.stringify(form)); setDraftSaved(true); }, 700);
    return () => window.clearTimeout(timeout);
  }, [form]);

  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    const photoCount = media.filter((item) => item.type === 'image').length;
    const videoCount = media.filter((item) => item.type === 'video').length;
    let nextPhotoCount = photoCount;
    let nextVideoCount = videoCount;
    const accepted = [];
    incoming.forEach((file, index) => {
      const isVideo = file.type.startsWith('video/');
      if (isVideo && nextVideoCount >= 1) return;
      if (!isVideo && nextPhotoCount >= 12) return;
      if (isVideo) nextVideoCount += 1; else nextPhotoCount += 1;
      accepted.push({ id: `${file.name}-${file.lastModified}-${index}`, src: URL.createObjectURL(file), name: file.name, type: isVideo ? 'video' : 'image', cover: media.length === 0 && accepted.length === 0 });
    });
    if (accepted.length) setMedia((current) => [...current, ...accepted]);
    event.target.value = '';
  };

  const removeMedia = (id) => setMedia((current) => current.filter((item) => item.id !== id).map((item, index) => ({ ...item, cover: index === 0 ? true : item.cover })));
  const setCover = (id) => setMedia((current) => current.map((item) => ({ ...item, cover: item.id === id })));
  const moveMedia = (id, direction) => setMedia((current) => { const index = current.findIndex((item) => item.id === id); const target = index + direction; if (target < 0 || target >= current.length) return current; const copy = [...current]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; });
  const saveDraft = () => { window.localStorage.setItem('bese26-sell-draft', JSON.stringify(form)); setDraftSaved(true); onDemoAction('Draft saved on this device.'); };
  const validate = () => {
    const nextErrors = [];
    if (media.length < 1) nextErrors.push('Add at least one clear photo before publishing.');
    if (!form.title.trim()) nextErrors.push('Add a short, searchable title.');
    if (!form.category) nextErrors.push('Choose a category.');
    if (!form.description.trim()) nextErrors.push('Add a description so buyers understand the listing.');
    if (['Fixed price', 'Starting from', 'Per unit', 'Per hour', 'Per day', 'Per week', 'Per month'].includes(form.priceMode) && (!form.price || Number(form.price) <= 0)) nextErrors.push('Enter a valid price greater than zero.');
    if (!form.state || !form.city) nextErrors.push('Choose a state and city for the listing.');
    setErrors(nextErrors);
    return nextErrors;
  };
  const generateWithAI = () => { update('title', form.category === 'Vehicles' ? 'Well-kept Toyota Corolla 2017' : form.category === 'Property' ? 'Modern 3 Bedroom Home in Kano' : form.category === 'Agriculture' ? 'Quality maize grain available in Kano' : form.category === 'Jobs & Services' ? 'Professional creative design service' : 'Clean iPhone 13 Pro 256GB'); update('description', 'Add your real product details here. Review every suggestion and edit anything that is not accurate before publishing.'); onDemoAction('AI draft ready — review every detail before publishing.'); };
  const publish = () => { if (validate().length) { document.querySelector('.sell-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } setPublishState('success'); window.localStorage.removeItem('bese26-sell-draft'); onDemoAction('Your listing is ready to publish.'); };
  const reset = () => { setForm(initialForm); setMedia(starterMedia); setPublishState('idle'); setErrors([]); window.localStorage.removeItem('bese26-sell-draft'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const renderMedia = () => <section id="sell-media" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon coral"><Camera size={19} /></span><div><div className="eyebrow">PHOTOS & VIDEO</div><h2>Add at least 1 photo</h2><p>Up to 12 photos + 1 video. The first photo becomes the cover.</p></div><span className="media-count">{media.filter((item) => item.type === 'image').length}/12</span></div><div className="sell-upload-grid"><button type="button" className="sell-upload-tile" onClick={() => mediaInput.current?.click()}><span><Plus size={23} /></span><strong>Gallery upload</strong><small>JPG, PNG, HEIC or WEBP</small></button><button type="button" className="sell-upload-tile camera-tile" onClick={() => cameraInput.current?.click()}><span><Camera size={21} /></span><strong>Use camera</strong><small>Take a clear cover photo</small></button>{media.map((item) => <div className={`sell-media-thumb ${item.cover ? 'is-cover' : ''}`} key={item.id}>{item.type === 'video' ? <div className="sell-video-thumb"><Video size={25} /><small>Video</small></div> : <img src={item.src} alt={item.name} />}<div className="media-overlay"><button type="button" onClick={() => setCover(item.id)} aria-label={`Set ${item.name} as cover`}><Check size={13} /></button><button type="button" onClick={() => moveMedia(item.id, -1)} aria-label="Move photo left"><ArrowLeft size={13} /></button><button type="button" onClick={() => moveMedia(item.id, 1)} aria-label="Move photo right"><ArrowRight size={13} /></button><button type="button" onClick={() => removeMedia(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={13} /></button></div>{item.cover && <span className="cover-label">Cover photo</span>}</div>)}</div><input ref={mediaInput} className="hidden-file-input" type="file" accept="image/*,video/*" multiple onChange={handleFiles} /><input ref={cameraInput} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={handleFiles} /><div className="sell-helper"><ShieldCheck size={14} /><span>First picture becomes the title picture. Drag-style controls let you reorder the preview.</span></div></section>;
  const renderDetails = () => <section id="sell-details" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon lavender"><Package size={19} /></span><div><div className="eyebrow">ITEM DETAILS</div><h2>Tell buyers about it</h2><p>Choose a category and only the relevant details will appear below.</p></div><button type="button" className="sell-ai-button" onClick={generateWithAI}><Sparkles size={15} /> Generate with AI</button></div><div className="sell-form-grid"><Field label="Title*" value={form.title} onChange={(value) => update('title', value)} placeholder="e.g. iPhone 15 Pro Max 256GB" wide /><div className="sell-field"><span>Category*</span><select value={form.category} onChange={(event) => { const category = event.target.value; update('category', category); update('subcategory', categoryGroups[category][0]); }}>{Object.keys(categoryGroups).map((category) => <option key={category}>{category}</option>)}</select></div><div className="sell-field"><span>Subcategory</span><select value={form.subcategory} onChange={(event) => update('subcategory', event.target.value)}>{subcategories.map((item) => <option key={item}>{item}</option>)}</select></div>{categoryNeedsCondition && <div className="sell-field"><span>Condition*</span><select value={form.condition} onChange={(event) => update('condition', event.target.value)}>{['New', 'Like New', 'Used — Excellent', 'Used — Good', 'Used — Fair', 'Refurbished', 'For Parts / Repair', 'Not Applicable'].map((item) => <option key={item}>{item}</option>)}</select></div>}{fields.map(([key, label, placeholder, options]) => <Field key={key} label={label} value={form[key]} onChange={(value) => update(key, value)} placeholder={placeholder} options={options} />)}<Field label="Description*" value={form.description} onChange={(value) => update('description', value)} placeholder="Please provide a detailed description of your item or service..." type="textarea" wide /></div><div className="sell-ai-note"><Sparkles size={15} /><span>AI suggestions are optional. Verify every generated detail before you publish.</span></div></section>;
  const renderPricing = () => <section id="sell-pricing" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon gold"><WalletCards size={19} /></span><div><div className="eyebrow">PRICE & QUANTITY</div><h2>Set your price</h2><p>Use the option that matches what you are offering.</p></div></div><div className="price-mode-grid">{['Fixed price', 'Negotiable', 'Contact seller', 'Price on request', 'Free', 'Starting from', 'Per unit', 'Per hour', 'Per day', 'Per week', 'Per month'].map((mode) => <button type="button" key={mode} className={form.priceMode === mode ? 'selected' : ''} onClick={() => update('priceMode', mode)}><Tag size={14} />{mode}</button>)}</div><div className="sell-form-grid pricing-fields"><Field label={priceLabel} value={form.price} onChange={(value) => update('price', value)} placeholder={form.priceMode === 'Free' ? 'No price needed' : 'e.g. 485000'} type="number" /><Field label="Currency" value={form.currency} onChange={(value) => update('currency', value)} options={['₦ NGN', '$ USD', '£ GBP', '€ EUR']} /><Field label="Quantity available" value={form.quantity} onChange={(value) => update('quantity', value)} placeholder="1" type="number" /><Field label="Unit" value={form.unit} onChange={(value) => update('unit', value)} options={['item', 'kg', 'bag', 'crate', 'ton', 'hour', 'day', 'project']} /><Field label="Minimum order" value={form.minimumOrder} onChange={(value) => update('minimumOrder', value)} placeholder="1" type="number" /><div className="sell-inline-setting"><div><strong>Negotiable</strong><small>Let buyers make a reasonable offer</small></div><Toggle label="Negotiable" checked={form.negotiable} onChange={(value) => update('negotiable', value)} /></div></div></section>;
  const renderLocation = () => <section id="sell-location" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon mint"><MapPin size={19} /></span><div><div className="eyebrow">LOCATION & DELIVERY</div><h2>Where is it located?</h2><p>Your profile location is already filled in. Change it only if this listing is elsewhere.</p></div></div><div className="profile-location-card"><div className="profile-location-icon"><MapPin size={18} /></div><div><strong>{form.sellerLocation}</strong><span>From your seller profile</span></div><button type="button" onClick={() => onDemoAction('Profile location editor opened.')}><RotateCcw size={14} /> Use another location</button></div><div className="sell-form-grid location-fields"><Field label="State*" value={form.state} onChange={(value) => update('state', value)} options={['Kano', 'Kaduna', 'Abuja (FCT)', 'Lagos', 'Plateau', 'Other']} /><Field label="City*" value={form.city} onChange={(value) => update('city', value)} options={['Kano Municipal', 'Nassarawa', 'Fagge', 'Gwale', 'Tarauni', 'Other']} /><Field label="Area" value={form.area} onChange={(value) => update('area', value)} placeholder="e.g. Hotoro" /></div><div className="privacy-location-row"><div><strong>Show approximate location publicly</strong><small>Your exact address stays private unless you choose to share it.</small></div><Toggle label="Approximate location" checked={form.approximate} onChange={(value) => update('approximate', value)} /></div><div className="sell-subheading"><MapPin size={15} /> Delivery & collection</div><div className="choice-pill-grid">{['Buyer pickup', 'Seller delivery', 'Third-party delivery', 'Shipping', 'Digital delivery', 'Service at buyer location', 'Online service'].map((item) => <button type="button" key={item} className={form.delivery === item ? 'selected' : ''} onClick={() => update('delivery', item)}>{item}</button>)}</div><div className="delivery-fee-row"><strong>Delivery fee</strong><select value={form.deliveryFee} onChange={(event) => update('deliveryFee', event.target.value)}><option>Free</option><option>Fixed fee</option><option>Calculated separately</option><option>Negotiable</option></select></div><div className="sell-subheading"><MessageCircle size={15} /> Contact preferences</div><div className="contact-preferences"><label><input type="checkbox" checked={form.contactChat} onChange={(event) => update('contactChat', event.target.checked)} /> <MessageCircle size={14} /> Bese26 Chat</label><label><input type="checkbox" checked={form.contactPhone} onChange={(event) => update('contactPhone', event.target.checked)} /> <Phone size={14} /> Phone</label><label><input type="checkbox" checked={form.contactWhatsApp} onChange={(event) => update('contactWhatsApp', event.target.checked)} /> WhatsApp</label></div></section>;
  const renderPublish = () => publishState === 'success' ? <section className="publish-success-card"><span className="publish-success-icon"><CheckCircle2 size={35} /></span><div className="eyebrow">READY FOR THE MARKETPLACE</div><h2>Your listing is ready</h2><p>Your listing details passed the checks. In the connected marketplace, it will now be sent to moderation before going live.</p><div className="publish-success-actions"><button type="button" className="primary-button" onClick={() => onDemoAction('Listing preview opened.')}>View listing <ArrowRight size={16} /></button><button type="button" className="secondary-button" onClick={() => onDemoAction('Share listing options opened.')}>Share listing</button><button type="button" className="text-action" onClick={reset}>Post another item</button></div></section> : <section id="sell-publish" className="sell-work-card publish-step-card"><div className="sell-work-heading"><span className="sell-step-icon coral"><CheckCircle2 size={19} /></span><div><div className="eyebrow">PUBLISH</div><h2>Ready to post?</h2><p>Check your details above, then publish your listing.</p></div></div><div className="publish-safety"><ShieldCheck size={19} /><div><strong>Safety check</strong><p>Never include passwords, suspicious links, or private exact-address details in a public listing.</p></div></div><button type="button" className="publish-button large-publish" onClick={publish}><CheckCircle2 size={17} /> Publish listing <ArrowRight size={17} /></button><p className="publish-disclaimer">By publishing, you confirm that your information is accurate and that you have the right to sell or offer this item/service.</p></section>;

  return <div className="page-stack sell-page intelligent-sell-page vertical-sell-page"><div className="sell-mobile-header"><button type="button" aria-label="Back to marketplace" onClick={() => onDemoAction('Back to marketplace opened.')}><ArrowLeft size={22} /></button><strong>Post new ad</strong><button type="button" className="clear-sell-button" onClick={reset}><X size={18} /> Clear</button></div><section className="sell-hero intelligent-sell-hero vertical-sell-hero"><div className="sell-hero-copy"><div className="eyebrow">SELL ON BESE26</div><h1>Turn what you have<br /><span>into extra value.</span></h1><p>Reach buyers near you with a listing that looks as good as the item itself.</p></div><div className="sell-hero-badge"><ShieldCheck size={17} /><span>Seller center</span></div></section>{draftSaved && <div className="draft-status"><CheckCircle2 size={14} /> Draft saved on this device</div>}{errors.length > 0 && <div className="sell-error"><X size={15} /><div>{errors.map((error) => <span key={error}>{error}</span>)}</div></div>}{publishState === 'success' ? renderPublish() : <><div className="vertical-sell-sections">{renderMedia()}{renderDetails()}{renderPricing()}{renderLocation()}{renderPublish()}</div><div className="sell-vertical-actions"><button type="button" className="secondary-button" onClick={saveDraft}><Check size={15} /> Save draft</button><span>All fields are on one page. Scroll up or down to edit.</span></div></>}</div>;
}
