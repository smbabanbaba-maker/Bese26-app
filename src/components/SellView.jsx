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
  ShieldCheck,
  Tag,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { createListing, deleteListingMedia, fetchCategories, fetchSellerEntitlement, getBusinessProfile, getProfile, reviseRejectedListing, saveListingDraft, updateListing, updateListingMediaOrder, uploadListingMedia } from '../lib/marketplace';
import nigeriaLocations from '../data/nigeriaLocations.json';

const nigeriaStates = Object.keys(nigeriaLocations).sort((a, b) => a.localeCompare(b));

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
    ['make', 'Make', 'e.g. Toyota'], ['model', 'Model', 'e.g. Corolla'], ['year', 'Year', 'e.g. 2017'], ['mileage', 'Mileage', 'e.g. 85,000 km'], ['fuel', 'Fuel type', 'Select fuel type', ['Petrol', 'Diesel', 'Hybrid', 'Electric']], ['transmission', 'Transmission', 'Select transmission', ['Automatic', 'Manual']],
  ],
  Electronics: [
    ['brand', 'Brand', 'e.g. Apple'], ['model', 'Model', 'e.g. iPhone 15 Pro'], ['storage', 'Storage', 'e.g. 256GB'], ['network', 'Network', 'Select network', ['Unlocked', 'MTN', 'Airtel', 'Glo', '9mobile']],
  ],
  Property: [
    ['propertyType', 'Property type', 'Select type', ['House', 'Apartment', 'Land', 'Shop', 'Office', 'Warehouse', 'Farm']], ['listingType', 'Listing type', 'Select listing type', ['For sale', 'For rent', 'Short-let']], ['bedrooms', 'Bedrooms', 'e.g. 3'], ['bathrooms', 'Bathrooms', 'e.g. 2'], ['size', 'Size', 'e.g. 500 sqm'],
  ],
  Agriculture: [
    ['productType', 'Product type', 'Select type', ['Crop', 'Livestock', 'Equipment', 'Farm service']], ['variety', 'Variety / species', 'e.g. Maize, broiler'], ['quantity', 'Quantity available', 'e.g. 100'], ['unit', 'Unit', 'Select unit', ['Item', 'Kg', 'Bag', 'Crate', 'Ton', 'Litre']], ['availability', 'Availability', 'Select availability', ['Available now', 'Pre-order', 'Seasonal']],
  ],
  'Jobs & Services': [
    ['experience', 'Experience', 'e.g. 5 years'], ['serviceArea', 'Service area', 'e.g. Kano and nearby cities'], ['availability', 'Availability', 'Select availability', ['Available now', 'Weekdays', 'Weekends', 'By appointment']], ['pricingModel', 'Pricing model', 'Select model', ['Starting from', 'Per hour', 'Per day', 'Per project', 'Contact seller']],
  ],
};

const initialForm = {
  category: 'Electronics', subcategory: 'Phones', title: '', description: '', condition: 'Used — Excellent',
  priceMode: 'Fixed price', currency: '₦ NGN', price: '', negotiable: true, quantity: '1', unit: 'item', minimumOrder: '1',
  state: 'Kano', city: 'Kano Municipal', area: '', approximate: true, delivery: 'Buyer pickup', deliveryFee: 'Free',
  contactChat: true, contactPhone: false, contactWhatsApp: false, sellerName: '', sellerHandle: '', sellerLocation: 'Nigeria',
};

function Field({ label, value, onChange, placeholder, options, type = 'text', wide = false, error = '' }) {
  return <label className={`${wide ? 'sell-field wide' : 'sell-field'} ${error ? 'has-error' : ''}`}><span>{label}</span>{options ? <select value={value || options[0]} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : type === 'textarea' ? <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}{error && <small className="field-error">{error}</small>}</label>;
}

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`sell-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} aria-label={`Toggle ${label}`}><span /></button>;
}

export default function SellView({ user, onAuthRequired, onDemoAction, onOpenSubscription, initialListing = null, initialDraft = null }) {
  const [form, setForm] = useState(initialForm);
  const [media, setMedia] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [errors, setErrors] = useState([]);
  const [publishState, setPublishState] = useState('idle');
  const [entitlement, setEntitlement] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [publishAs, setPublishAs] = useState('personal');
  const [editMode, setEditMode] = useState(Boolean(initialListing));
  const mediaInput = useRef(null);
  const cameraInput = useRef(null);

  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors([]); setDraftSaved(false); };
  const subcategories = categoryGroups[form.category] || categoryGroups.Other;
  const fields = dynamicFields[form.category] || [];
  const fieldError = (needle) => errors.find((error) => error.toLowerCase().includes(needle)) || '';
  const localGovernments = nigeriaLocations[form.state] || [];
  const priceDisplay = form.price ? `${form.currency} ${Number(form.price).toLocaleString()}` : `${form.currency} 0`;
  const categoryNeedsCondition = !['Property', 'Jobs & Services'].includes(form.category);

  useEffect(() => {
    if (!initialListing) return;
    const raw = initialListing.raw || {};
    setEditMode(true);
    setForm((current) => ({
      ...current,
      ...(raw.attributes || {}),
      category: initialListing.category || current.category,
      subcategory: initialListing.subcategory || current.subcategory,
      title: raw.title || initialListing.title || '',
      description: raw.description || initialListing.description || '',
      condition: raw.condition || current.condition,
      price: raw.price == null ? '' : String(raw.price),
      currency: '₦ NGN',
      negotiable: raw.pricing_type === 'negotiable',
      quantity: raw.quantity == null ? current.quantity : String(raw.quantity),
      unit: raw.unit || current.unit,
      state: raw.state || current.state,
      city: raw.city || current.city,
      delivery: raw.delivery_options?.[0] || current.delivery,
      deliveryFee: raw.delivery_options?.[1] || current.deliveryFee,
      attributes: raw.attributes || current.attributes,
      sellerName: initialListing.seller || current.sellerName,
    }));
    const existingMedia = (raw.listing_media || []).map((item, index) => ({
      id: item.id || `${initialListing.id}-media-${index}`,
      src: item.signed_url || '',
      name: `Listing photo ${index + 1}`,
      type: item.media_type?.startsWith('video') ? 'video' : 'image',
      cover: index === 0,
      file: null,
    })).filter((item) => item.src);
    setMedia(existingMedia);
  }, [initialListing]);

  useEffect(() => {
    if (!initialDraft?.payload) return;
    const payload = initialDraft.payload.form || initialDraft.payload;
    setDraftId(initialDraft.id);
    setEditMode(false);
    setForm((current) => ({ ...current, ...payload, title: payload.title || initialDraft.title || '', price: payload.price == null ? '' : String(payload.price), attributes: payload.attributes || current.attributes }));
    if (Array.isArray(initialDraft.payload.media)) setMedia(initialDraft.payload.media.map((item) => ({ ...item, file: null, src: item.src || '' })));
  }, [initialDraft]);

  useEffect(() => {
    if (user && !form.sellerName) {
      update('sellerName', user.user_metadata?.display_name || user.email?.split('@')[0] || 'bese26 seller');
      update('sellerHandle', user.user_metadata?.username ? `@${user.user_metadata.username}` : '');
    }
  }, [user, form.sellerName]);

  useEffect(() => {
    let mounted = true;
    if (!user || editMode) return undefined;
    getProfile(user.id).then((profile) => {
      if (!mounted || !profile) return;
      setForm((current) => ({
        ...current,
        sellerName: profile.display_name || current.sellerName,
        sellerHandle: profile.username ? `@${profile.username}` : current.sellerHandle,
        state: profile.state || current.state,
        city: profile.city || current.city,
        sellerLocation: profile.country || current.sellerLocation,
      }));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user, editMode]);

  useEffect(() => {
    let mounted = true;
    if (!user || !isSupabaseConfigured || editMode) { setEntitlement(null); return undefined; }
    fetchSellerEntitlement().then((data) => mounted && setEntitlement(data)).catch(() => {});
    return () => { mounted = false; };
  }, [user, editMode]);

  useEffect(() => {
    let mounted = true;
    if (!user || !isSupabaseConfigured || editMode) { setBusinessProfile(null); setPublishAs('personal'); return undefined; }
    getBusinessProfile(user.id).then((business) => mounted && setBusinessProfile(business)).catch(() => mounted && setBusinessProfile(null));
    return () => { mounted = false; };
  }, [user, editMode]);

  useEffect(() => {
    if (publishAs !== 'business' || !businessProfile) return;
    setForm((current) => ({ ...current, sellerName: businessProfile.business_name || current.sellerName, state: businessProfile.state || current.state, city: businessProfile.city || current.city }));
  }, [publishAs, businessProfile]);

  useEffect(() => {
    if (editMode) return undefined;
    const timeout = window.setTimeout(async () => {
      if (isSupabaseConfigured && user) {
        try {
          const row = await saveListingDraft({ id: draftId, sellerId: user.id, title: form.title, payload: { form, media: media.map(({ id, name, type, cover }) => ({ id, name, type, cover })) } });
          setDraftId(row.id);
          setDraftSaved(true);
        } catch {
          setDraftSaved(false);
        }
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [form, media, user, draftId, editMode]);

  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    const photoCount = media.filter((item) => item.type === 'image').length;
    let nextPhotoCount = photoCount;
    const accepted = [];
    incoming.forEach((file, index) => {
      if (!file.type.startsWith('image/') || nextPhotoCount >= 6) return;
      nextPhotoCount += 1;
      accepted.push({ id: `${file.name}-${file.lastModified}-${index}`, src: URL.createObjectURL(file), file, name: file.name, type: 'image', cover: media.length === 0 && accepted.length === 0 });
    });
    if (accepted.length) setMedia((current) => [...current, ...accepted]);
    event.target.value = '';
  };

  const removeMedia = (id) => setMedia((current) => current.filter((item) => item.id !== id).map((item, index) => ({ ...item, cover: index === 0 ? true : item.cover })));
  const setCover = (id) => setMedia((current) => current.map((item) => ({ ...item, cover: item.id === id })));
  const saveDraft = async () => {
    if (!isSupabaseConfigured) { onDemoAction('Draft saving is unavailable until the marketplace connection is configured.'); return; }
    if (!user) { onAuthRequired?.(); return; }
    try {
      const row = await saveListingDraft({ id: draftId, sellerId: user.id, title: form.title, payload: { form, media: media.map(({ id, name, type, cover }) => ({ id, name, type, cover })) } });
      setDraftId(row.id);
      setDraftSaved(true);
      onDemoAction('Draft saved to your Bese26 account.');
    } catch (error) { onDemoAction(error.message || 'Could not save the draft.'); }
  };
  const validate = () => {
    const nextErrors = [];
    if (media.length < 1) nextErrors.push('Add at least one clear photo before publishing.');
    if (!form.title.trim()) nextErrors.push('Add a short, searchable title.');
    if (!form.category) nextErrors.push('Choose a category.');
    if (!form.description.trim()) nextErrors.push('Add a description so buyers understand the listing.');
    if (!form.price || Number(form.price) <= 0) nextErrors.push('Enter a valid price greater than zero.');
    if (!form.state || !form.city) nextErrors.push('Choose a state and city for the listing.');
    setErrors(nextErrors);
    return nextErrors;
  };
  const publish = async () => {
    if (validate().length) { document.querySelector('.sell-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (isSupabaseConfigured && !user) { onAuthRequired?.(); return; }
    if (isSupabaseConfigured && !editMode && !media.some((item) => item.file)) { setErrors(['Choose at least one photo from your device before publishing.']); document.querySelector('.sell-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (!isSupabaseConfigured) { setErrors(['Marketplace connection is not configured. Publishing is unavailable until Supabase is connected.']); return; }
    setPublishState('publishing');
    try {
      const categoryRows = await fetchCategories();
      const categoryRow = categoryRows.find((item) => item.parent_id == null && item.name === form.category);
      const subcategoryRow = categoryRows.find((item) => item.parent_id === categoryRow?.id && item.name === form.subcategory);
      if (!categoryRow) throw new Error('This category is not available yet. Please choose another category.');
      const attributes = Object.fromEntries((dynamicFields[form.category] || []).map(([key]) => [key, form[key] || null]).filter(([, value]) => value !== null && value !== ''));
      const listingValues = { category_id: categoryRow.id, subcategory_id: subcategoryRow?.id || null, title: form.title.trim(), description: form.description.trim(), price: Number(form.price), currency: 'NGN', pricing_type: form.negotiable ? 'negotiable' : 'fixed', condition: categoryNeedsCondition ? form.condition : null, quantity: form.quantity ? Number(form.quantity) : null, unit: form.unit || null, city: form.city, state: form.state, country: 'Nigeria', delivery_options: [form.delivery, form.deliveryFee].filter(Boolean), contact_preference: form.contactPhone && form.contactWhatsApp ? 'chat_call' : form.contactPhone ? 'call' : form.contactWhatsApp ? 'whatsapp' : 'chat', attributes, business_profile_id: publishAs === 'business' ? businessProfile?.profile_id : null, published_as_type: publishAs };
      const revisionValues = { category_id: listingValues.category_id, subcategory_id: listingValues.subcategory_id, title: listingValues.title, description: listingValues.description, price: listingValues.price, currency: listingValues.currency, pricing_type: listingValues.pricing_type, condition: listingValues.condition, quantity: listingValues.quantity, unit: listingValues.unit, city: listingValues.city, state: listingValues.state, country: listingValues.country, delivery_options: listingValues.delivery_options, contact_preference: listingValues.contact_preference, attributes: listingValues.attributes, status: 'pending', moderation_status: 'pending', rejection_reason: null, published_at: null, updated_at: new Date().toISOString() };
      const listing = editMode ? (initialListing.raw?.status === 'rejected' ? await reviseRejectedListing({ listingId: initialListing.id, values: { categoryId: listingValues.category_id, subcategoryId: listingValues.subcategory_id, title: listingValues.title, description: listingValues.description, price: listingValues.price, currency: listingValues.currency, pricingType: listingValues.pricing_type, condition: listingValues.condition, quantity: listingValues.quantity, unit: listingValues.unit, city: listingValues.city, state: listingValues.state, country: listingValues.country, deliveryOptions: listingValues.delivery_options, contactPreference: listingValues.contact_preference, attributes: listingValues.attributes } }) : await updateListing(initialListing.id, user.id, revisionValues)) : await createListing({ sellerId: user.id, values: listingValues });
      if (editMode) {
        const persistedMedia = initialListing.raw?.listing_media || [];
        const currentIds = new Set(media.map((item) => item.id));
        await Promise.all(persistedMedia.filter((item) => !currentIds.has(item.id)).map((item) => deleteListingMedia({ listingId: listing.id, mediaId: item.id, storagePath: item.storage_path })));
        const orderedExisting = media.filter((item) => !item.file);
        await Promise.all(orderedExisting.map((item) => updateListingMediaOrder({ listingId: listing.id, mediaId: item.id, sortOrder: media.indexOf(item) })));
      }
      const uploadableMedia = media.filter((item) => item.file);
      await Promise.all(uploadableMedia.map((item) => uploadListingMedia({ userId: user.id, listingId: listing.id, file: item.file, sortOrder: media.indexOf(item) })));
      setPublishState('success');
      setDraftSaved(false);
      if (!editMode) fetchSellerEntitlement().then(setEntitlement).catch(() => {});
      onDemoAction(editMode ? 'Listing changes submitted for bese26 moderation.' : 'Listing submitted for bese26 moderation.');
    } catch (error) {
      setPublishState('idle');
      setErrors([error.message || 'Could not publish this listing. Please try again.']);
      document.querySelector('.sell-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const reset = () => { setEditMode(false); setForm(initialForm); setMedia([]); setDraftId(null); setPublishState('idle'); setDraftSaved(false); setErrors([]); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const renderMedia = () => <section id="sell-media" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon coral"><Camera size={19} /></span><div><div className="eyebrow">PHOTOS</div><h2>Add at least 1 photo</h2><p>Add up to 6 clear photos. The first photo becomes the cover.</p></div><span className="media-count">{media.filter((item) => item.type === 'image').length}/6</span></div><div className="sell-upload-grid"><button type="button" className="sell-upload-tile" onClick={() => mediaInput.current?.click()}><span><Plus size={23} /></span><strong>Choose photos</strong><small>JPG, PNG, HEIC or WEBP</small></button><button type="button" className="sell-upload-tile camera-tile" onClick={() => cameraInput.current?.click()}><span><Camera size={21} /></span><strong>Use camera</strong><small>Take a clear cover photo</small></button>{media.map((item) => <div className={`sell-media-thumb ${item.cover ? 'is-cover' : ''}`} key={item.id}><img src={item.src} alt={item.name} /><div className="media-overlay"><button type="button" onClick={() => setCover(item.id)} aria-label={`Set ${item.name} as cover`}><Check size={13} /></button><button type="button" onClick={() => removeMedia(item.id)} aria-label={`Remove ${item.name}`}><Trash2 size={13} /></button></div>{item.cover && <span className="cover-label">Cover photo</span>}</div>)}</div><input ref={mediaInput} className="hidden-file-input" type="file" accept="image/*" multiple onChange={handleFiles} /><input ref={cameraInput} className="hidden-file-input" type="file" accept="image/*" capture="environment" onChange={handleFiles} /><div className="sell-helper"><ShieldCheck size={14} /><span>Only photos are accepted. The first photo is the cover.</span></div></section>;
  const renderPublishAs = () => businessProfile ? <section className="sell-work-card publish-as-card"><div className="sell-work-heading"><span className="sell-step-icon gold"><Tag size={19} /></span><div><div className="eyebrow">SELLER IDENTITY</div><h2>Publish as</h2><p>Choose which verified profile buyers will see on this listing.</p></div></div><label className="sell-field"><span>Public seller</span><select value={publishAs} onChange={(event) => setPublishAs(event.target.value)}><option value="personal">Personal — {user?.user_metadata?.display_name || form.sellerName || 'Your account'}</option><option value="business">Business — {businessProfile.business_name}</option></select><small>Ownership and permissions remain tied to your personal account.</small></label></section> : null;
  const renderDetails = () => <section id="sell-details" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon lavender"><Package size={19} /></span><div><div className="eyebrow">ITEM DETAILS</div><h2>Tell buyers about it</h2><p>Choose a category and only the relevant details will appear below.</p></div></div><div className="sell-form-grid"><Field label="Title*" value={form.title} onChange={(value) => update('title', value)} placeholder="e.g. iPhone 15 Pro Max 256GB" wide /><div className="sell-field"><span>Category*</span><select value={form.category} onChange={(event) => { const category = event.target.value; update('category', category); update('subcategory', categoryGroups[category][0]); }}>{Object.keys(categoryGroups).map((category) => <option key={category}>{category}</option>)}</select></div><div className="sell-field"><span>Subcategory</span><select value={form.subcategory} onChange={(event) => update('subcategory', event.target.value)}>{subcategories.map((item) => <option key={item}>{item}</option>)}</select></div>{categoryNeedsCondition && <div className="sell-field"><span>Condition*</span><select value={form.condition} onChange={(event) => update('condition', event.target.value)}>{['New', 'Like New', 'Used — Excellent', 'Used — Good', 'Used — Fair', 'Refurbished', 'For Parts / Repair', 'Not Applicable'].map((item) => <option key={item}>{item}</option>)}</select></div>}{fields.map(([key, label, placeholder, options]) => <Field key={key} label={label} value={form[key]} onChange={(value) => update(key, value)} placeholder={placeholder} options={options} />)}<Field label="Description*" value={form.description} onChange={(value) => update('description', value)} placeholder="Please provide a detailed description of your item or service..." type="textarea" wide /></div></section>;
  const renderPricing = () => <section id="sell-pricing" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon gold"><WalletCards size={19} /></span><div><div className="eyebrow">PRICE</div><h2>Set your price</h2><p>Enter one clear price in Nigerian naira.</p></div></div><div className="sell-form-grid pricing-fields"><Field label="Price*" value={form.price} onChange={(value) => update('price', value)} placeholder="e.g. 485000" type="number" /><div className="sell-inline-setting"><div><strong>Open to negotiation?</strong><small>Let buyers make a reasonable offer.</small></div><Toggle label="Negotiable" checked={form.negotiable} onChange={(value) => update('negotiable', value)} /></div></div></section>;
  const renderLocation = () => {
    const serviceListing = form.category === 'Jobs & Services';
    const deliveryOptions = serviceListing ? ['At buyer location', 'At seller location', 'Online service'] : ['Buyer pickup', 'Seller delivery', 'Shipping'];
    return <section id="sell-location" className="sell-work-card"><div className="sell-work-heading"><span className="sell-step-icon mint"><MapPin size={19} /></span><div><div className="eyebrow">LOCATION & DELIVERY</div><h2>Where is it?</h2><p>Choose your state and Local Government Area so buyers can find you easily.</p></div></div><div className="sell-form-grid location-fields"><Field label="State*" value={form.state} onChange={(value) => { update('state', value); update('city', nigeriaLocations[value]?.[0] || ''); }} options={nigeriaStates} /><Field label="Local Government Area*" value={form.city} onChange={(value) => update('city', value)} options={localGovernments.length ? localGovernments : ['Select a state first']} /></div><div className="sell-subheading"><MapPin size={15} /> {serviceListing ? 'How will you provide it?' : 'Delivery'}</div><div className="choice-pill-grid">{deliveryOptions.map((item) => <button type="button" key={item} className={form.delivery === item ? 'selected' : ''} onClick={() => update('delivery', item)}>{item}</button>)}</div><div className="sell-subheading"><MessageCircle size={15} /> Contact</div><div className="contact-preferences"><label><input type="checkbox" checked={form.contactChat} onChange={(event) => update('contactChat', event.target.checked)} /> <MessageCircle size={14} /> Bese26 Chat</label><label><input type="checkbox" checked={form.contactWhatsApp} onChange={(event) => update('contactWhatsApp', event.target.checked)} /> WhatsApp</label></div></section>;
  };
  const planUsageNote = !editMode && entitlement ? <div className={`sell-plan-usage ${entitlement.free_posts_remaining === 0 ? 'exhausted' : ''}`}><div><strong>{entitlement.is_paid ? `${entitlement.plan_key} plan · ${entitlement.free_posts_used} of ${entitlement.listing_limit} active listings used` : `${entitlement.free_posts_used} of ${entitlement.listing_limit} active listings used`}</strong><small>{entitlement.is_paid ? `${Math.max(entitlement.listing_limit - entitlement.free_posts_used, 0)} active listings remaining` : entitlement.free_posts_remaining ? `${entitlement.free_posts_remaining} active listing slot${entitlement.free_posts_remaining === 1 ? '' : 's'} remaining` : 'Your Free plan has reached its active listing limit.'}</small></div>{entitlement.free_posts_remaining === 0 && !entitlement.is_paid && <button type="button" className="text-action" onClick={onOpenSubscription}>View plans <ArrowRight size={14} /></button>}</div> : null;
  const renderPublish = () => publishState === 'success' ? <section className="publish-success-card"><span className="publish-success-icon"><CheckCircle2 size={35} /></span><div className="eyebrow">SUBMITTED FOR REVIEW</div><h2>{editMode ? 'Your revised listing was submitted' : 'Your listing was submitted'}</h2><p>Your listing is saved in My Listings as pending. It will appear on Home after marketplace approval.</p><div className="publish-success-actions"><button type="button" className="text-action" onClick={reset}>Post another item</button></div></section> : <section id="sell-publish" className="sell-work-card publish-step-card"><div className="sell-work-heading"><span className="sell-step-icon coral"><CheckCircle2 size={19} /></span><div><div className="eyebrow">PUBLISH</div><h2>{editMode ? 'Ready to resubmit?' : 'Ready to post?'}</h2><p>Check your details above, then {editMode ? 'send your corrections back for review.' : 'publish your listing.'}</p></div></div>{planUsageNote}<div className="publish-safety"><ShieldCheck size={19} /><div><strong>Safety check</strong><p>Never include passwords, suspicious links, or private exact-address details in a public listing.</p></div></div><button type="button" className="publish-button large-publish" onClick={publish} disabled={publishState === 'publishing'}><CheckCircle2 size={17} /> {publishState === 'publishing' ? 'Submitting…' : editMode ? 'Resubmit for review' : 'Publish listing'} <ArrowRight size={17} /></button><p className="publish-disclaimer">By publishing, you confirm that your information is accurate and that you have the right to sell or offer this item/service.</p></section>;

  return <div className="page-stack sell-page intelligent-sell-page vertical-sell-page"><div className="sell-mobile-header"><button type="button" aria-label="Back to marketplace" onClick={() => window.history.back()}><ArrowLeft size={22} /></button><strong>{editMode ? 'Edit listing' : 'Post new ad'}</strong><button type="button" className="clear-sell-button" onClick={reset}><X size={18} /> Clear</button></div>{editMode && initialListing?.raw?.rejection_reason && <div className="sell-rejection-note"><ShieldCheck size={18} /><div><strong>Review feedback</strong><p>{initialListing.raw.rejection_reason}</p><small>Update the details below, then resubmit this listing for another review.</small></div></div>}{draftSaved && <div className="draft-status"><CheckCircle2 size={14} /> Draft saved to your Bese26 account</div>}{errors.length > 0 && <div className="sell-error"><X size={15} /><div>{errors.map((error) => <span key={error}>{error}</span>)}</div></div>}{publishState === 'success' ? renderPublish() : <><div className="vertical-sell-sections">{renderMedia()}{renderPublishAs()}{renderDetails()}{renderPricing()}{renderLocation()}{renderPublish()}</div></>}</div>;
}
