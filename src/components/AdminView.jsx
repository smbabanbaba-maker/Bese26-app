import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Clock3, MapPin, Megaphone, Package, Pause, Play, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { createAdminAdCampaign, deleteAdminAdCampaign, fetchAdminAdCampaigns, fetchModerationHistory, fetchPendingListings, moderateListing, fetchVerificationQueue, fetchIdentityVerificationQueue, reviewBusinessVerification, reviewIdentityVerification, reviewVerificationApplication, updateAdminAdCampaign } from '../lib/marketplace';

function formatDate(value) {
  if (!value) return 'Recently submitted';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatHistoryPrice(listing) {
  if (!listing?.price) return 'Price not set';
  return `${listing.currency === 'NGN' || !listing.currency ? '₦' : `${listing.currency} `}${Number(listing.price).toLocaleString('en-NG')}`;
}

function statusLabel(action) {
  return action === 'approve' ? 'Approved' : 'Rejected';
}

function AdCampaignManager({ user, onNotice }) {
  const emptyForm = { title: '', body: '', image_url: '', cta_label: 'Learn more', cta_target: '/business', placement: 'home_banner', status: 'draft', priority: 50, max_impressions: '', starts_at: '', ends_at: '' };
  const [campaigns, setCampaigns] = useState([]); const [form, setForm] = useState(emptyForm); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const load = async () => { setLoading(true); try { setCampaigns(await fetchAdminAdCampaigns()); } catch (reason) { setError(reason.message || 'Could not load campaigns.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const create = async (event) => { event.preventDefault(); if (!form.title.trim() || !form.body.trim()) { setError('Add a title and short message for the campaign.'); return; } setBusy('create'); setError(''); try { const row = await createAdminAdCampaign(user.id, { ...form, starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined, ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null }); setCampaigns((current) => [row, ...current]); setForm(emptyForm); onNotice?.('Campaign created.'); } catch (reason) { setError(reason.message || 'Could not create campaign.'); } finally { setBusy(''); } };
  const toggle = async (campaign) => { setBusy(campaign.id); try { const row = await updateAdminAdCampaign(campaign.id, { status: campaign.status === 'active' ? 'paused' : 'active' }); setCampaigns((current) => current.map((item) => item.id === row.id ? row : item)); onNotice?.(row.status === 'active' ? 'Campaign activated.' : 'Campaign paused.'); } catch (reason) { setError(reason.message || 'Could not update campaign.'); } finally { setBusy(''); } };
  const remove = async (campaign) => { setBusy(campaign.id); try { await deleteAdminAdCampaign(campaign.id); setCampaigns((current) => current.filter((item) => item.id !== campaign.id)); onNotice?.('Campaign deleted.'); } catch (reason) { setError(reason.message || 'Could not delete campaign.'); } finally { setBusy(''); } };
  return <section className="admin-ad-manager"><div className="admin-intro"><div><strong><Megaphone size={16} /> Advertising Control</strong><p>Create and control Home banner campaigns. Public campaigns are clearly labelled as sponsored.</p></div><button type="button" className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh ads</button></div>{error && <div className="auth-status error">{error}</div>}<form className="admin-ad-form" onSubmit={create}><div className="admin-ad-form-heading"><div><div className="eyebrow">NEW CAMPAIGN</div><h2>Place a new advert</h2></div><span className="status-pill pending">Unlimited campaigns</span></div><div className="admin-ad-form-grid"><label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Put your business in front of more buyers" maxLength={120} required /></label><label>CTA label<input value={form.cta_label} onChange={(event) => update('cta_label', event.target.value)} placeholder="Learn more" maxLength={40} /></label><label className="admin-ad-form-wide">Message<textarea value={form.body} onChange={(event) => update('body', event.target.value)} placeholder="Short message for the banner" maxLength={240} required /></label><label>Placement<select value={form.placement} onChange={(event) => update('placement', event.target.value)}><option value="home_banner">Home animated banner</option><option value="homepage">Home sponsored section</option><option value="search">Search results</option><option value="business_directory">Business directory</option></select></label><label>Button target<input value={form.cta_target} onChange={(event) => update('cta_target', event.target.value)} placeholder="/business or https://..." /></label><label>Image URL (optional)<input value={form.image_url} onChange={(event) => update('image_url', event.target.value)} placeholder="https://.../banner.png" /></label><label>Priority<input type="number" min="0" max="1000" value={form.priority} onChange={(event) => update('priority', event.target.value)} /></label><label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="draft">Draft</option><option value="active">Active now</option><option value="paused">Paused</option></select></label><label>End date (optional)<input type="datetime-local" value={form.ends_at} onChange={(event) => update('ends_at', event.target.value)} /></label></div><button type="submit" className="primary-button" disabled={busy === 'create'}><Plus size={15} /> {busy === 'create' ? 'Creating…' : 'Create campaign'}</button></form>{loading ? <div className="empty-state compact-empty">Loading campaigns…</div> : campaigns.length ? <div className="admin-ad-list">{campaigns.map((campaign) => <article className="admin-ad-card" key={campaign.id}><div className="admin-ad-card-copy"><div className="admin-listing-meta"><span className={`status-pill ${campaign.status === 'active' ? 'approved' : campaign.status === 'paused' ? 'pending' : 'rejected'}`}>{campaign.status}</span><span>{campaign.placement.replaceAll('_', ' ')}</span><span>Priority {campaign.priority}</span></div><h3>{campaign.title}</h3><p>{campaign.body}</p><small>{campaign.ends_at ? `Ends ${formatDate(campaign.ends_at)}` : 'No end date'} · {campaign.cta_label}</small></div><div className="admin-listing-actions"><button type="button" className="secondary-button" onClick={() => toggle(campaign)} disabled={busy === campaign.id}>{campaign.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}</button><button type="button" className="danger-outline-button" onClick={() => remove(campaign)} disabled={busy === campaign.id}><Trash2 size={14} /> Delete</button></div></article>)}</div> : <div className="empty-state compact-empty"><Megaphone size={25} /><h3>No campaigns yet</h3><p>Create the first campaign and activate it when you are ready.</p></div>}</section>;
}

export default function AdminView({ user, onBack, onNotice }) {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [verificationItems, setVerificationItems] = useState([]);
  const [identityItems, setIdentityItems] = useState([]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRows, historyRows, verificationRows, identityRows] = await Promise.all([fetchPendingListings(), fetchModerationHistory(), fetchVerificationQueue(), fetchIdentityVerificationQueue().catch(() => [])]);
      setItems(pendingRows);
      setHistory(historyRows);
      setVerificationItems(verificationRows);
      setIdentityItems(identityRows);
    } catch (requestError) {
      setError(requestError.message || 'Could not load moderation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchPendingListings(), fetchModerationHistory(), fetchVerificationQueue(), fetchIdentityVerificationQueue().catch(() => [])])
      .then(([pendingRows, historyRows, verificationRows, identityRows]) => {
        if (!mounted) return;
        setItems(pendingRows);
        setHistory(historyRows);
        setVerificationItems(verificationRows);
        setIdentityItems(identityRows);
      })
      .catch((requestError) => mounted && setError(requestError.message || 'Could not load moderation data.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const counts = useMemo(() => ({
    pending: items.length,
    approved: history.filter((event) => event.action === 'approve').length,
    rejected: history.filter((event) => event.action === 'reject').length,
  }), [items, history]);

  const reviewedItems = useMemo(() => {
    if (activeTab === 'pending') return [];
    const action = activeTab === 'approved' ? 'approve' : 'reject';
    return history.filter((event) => event.action === action);
  }, [activeTab, history]);

  const review = async (listingId, action, listing) => {
    if (action === 'reject' && !rejectReason.trim()) {
      setError('Add a short reason before rejecting this listing.');
      return;
    }
    setBusyId(listingId);
    setError('');
    try {
      await moderateListing({ listingId, action, rejectionReason: action === 'reject' ? rejectReason.trim() : null });
      setItems((current) => current.filter((item) => item.id !== listingId));
      setHistory((current) => [{ id: `${listingId}-${Date.now()}`, action, rejection_reason: action === 'reject' ? rejectReason.trim() : null, created_at: new Date().toISOString(), listing: { id: listingId, title: listing?.title, price: listing?.raw?.price, currency: listing?.raw?.currency, city: listing?.raw?.city, state: listing?.raw?.state, status: action === 'approve' ? 'active' : 'rejected', moderation_status: action === 'approve' ? 'approved' : 'rejected' } }, ...current]);
      setRejectingId(''); setRejectReason(''); setActiveTab(action === 'approve' ? 'approved' : 'rejected'); onNotice?.(action === 'approve' ? 'Listing approved and now live.' : 'Listing rejected with a review reason.');
    } catch (reviewError) { setError(reviewError.message || 'Could not update this listing.'); } finally { setBusyId(''); }
  };
  const reviewVerification = async (item, status) => {
    try {
      if (item.verification_type === 'business') {
        const secureStatus = status === 'approved' ? 'verified' : status === 'action_required' ? 'requires_more_information' : status;
        await reviewBusinessVerification({ id: item.id, status: secureStatus, reviewerNote: secureStatus === 'verified' ? 'Approved after authorized business review.' : 'Please provide clearer business information or an acceptable document and submit again.' });
      } else {
        await reviewVerificationApplication({ id: item.id, userId: item.user_id, status, verificationType: item.verification_type, durationMonths: item.duration_months || 1, reviewerNote: status === 'approved' ? 'Approved after moderation review.' : 'Please provide clearer information or an acceptable document and submit again.' });
      }
      setVerificationItems((current) => current.filter((row) => row.id !== item.id)); onNotice?.(`Verification application ${status.replace('_', ' ')}.`);
    } catch (reviewError) { setError(reviewError.message || 'Could not update verification application.'); }
  };
  const reviewIdentity = async (item, status) => { try { await reviewIdentityVerification({ id: item.id, status, reviewerNote: status === 'verified' ? 'Identity verified after authorized review.' : status === 'rejected' ? 'Please provide clearer information and resubmit.' : 'More information is required before a decision can be made.' }); setIdentityItems((current) => current.filter((row) => row.id !== item.id)); onNotice?.(`Identity verification marked ${status.replaceAll('_', ' ')}.`); } catch (reviewError) { setError(reviewError.message || 'Could not update identity verification.'); } };

  if (!user) return <div className="page-stack admin-page"><div className="profile-subpage-header"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><div><div className="eyebrow">ADMIN CENTER</div><h1>Sign in required</h1></div></div><div className="empty-state"><ShieldCheck size={28} /><h3>Admin access required</h3><p>Sign in with the authorized Bese26 admin account to review listings.</p></div></div>;

  return <div className="page-stack admin-page">
    <div className="profile-subpage-header"><button className="icon-button" onClick={onBack} aria-label="Back from moderation"><ArrowLeft size={18} /></button><div><div className="eyebrow">ADMIN CENTER</div><h1>Moderation</h1></div><span className="admin-access-badge"><ShieldCheck size={14} /> Moderator access</span></div>
    <div className="admin-intro"><div><strong>Review seller listings</strong><p>Keep every approved listing accurate, safe, and ready for buyers.</p></div><button className="secondary-button" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button></div>
    {verificationItems.length > 0 && <section className="admin-verification-queue"><div className="admin-intro"><div><strong>Verification applications</strong><p>Business reviews use a secure backend decision and audit trail.</p></div><span className="status-pill pending">{verificationItems.length} pending</span></div>{verificationItems.map((item) => <article className="admin-verification-card" key={item.id}><div><span className="status-pill pending">{item.verification_type}</span><h2>{item.full_name}</h2><p>{item.business_name ? `${item.business_name} · ` : ''}{item.phone || 'Phone not provided'}</p><small>{item.notes || 'No additional notes.'}</small><small>{item.verification_type === 'business' ? `${item.business_registration_type || 'Business'} · ${item.document_path ? 'private document uploaded' : 'document missing'}` : `${item.duration_months || 1} month${(item.duration_months || 1) === 1 ? '' : 's'}`}</small></div><div className="admin-listing-actions"><button className="primary-button" onClick={() => reviewVerification(item, 'approved')}>Approve</button><button className="danger-outline-button" onClick={() => reviewVerification(item, 'action_required')}>Request changes</button><button className="danger-button" onClick={() => reviewVerification(item, 'rejected')}>Reject</button></div></article>)}</section>}
    {identityItems.length > 0 && <section className="admin-verification-queue"><div className="admin-intro"><div><strong>Identity verification queue</strong><p>Review sensitive identity requests privately. Government ID values and documents are never shown in public listing data.</p></div><span className="status-pill pending">{identityItems.length} requests</span></div>{identityItems.map((item) => <article className="admin-verification-card" key={item.id}><div><span className="status-pill pending">{item.status.replaceAll('_', ' ')}</span><h2>{item.profile?.display_name || item.full_name || 'Bese26 member'}</h2><p>{[item.legal_first_name, item.legal_middle_name, item.legal_last_name].filter(Boolean).join(' ') || 'Legal name supplied'} · {item.document_type?.replaceAll('_', ' ') || 'ID type not supplied'}</p><small>{item.country || 'Country not supplied'} · Submitted {formatDate(item.submitted_at || item.created_at)}</small><small>Front document: {item.document_front_path ? 'uploaded privately' : 'missing'} · Liveness: {item.liveness_status || 'not configured'}</small></div><div className="admin-listing-actions"><button className="primary-button" onClick={() => reviewIdentity(item, 'verified')}>Approve identity</button><button className="danger-outline-button" onClick={() => reviewIdentity(item, 'requires_more_information')}>Request information</button><button className="danger-button" onClick={() => reviewIdentity(item, 'rejected')}>Reject</button></div></article>)}</section>}
    <AdCampaignManager user={user} onNotice={onNotice} />
    <div className="admin-status-tabs" role="tablist" aria-label="Moderation status"><button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')} role="tab" aria-selected={activeTab === 'pending'}><Clock3 size={15} /> Pending <b>{counts.pending}</b></button><button className={activeTab === 'approved' ? 'active' : ''} onClick={() => setActiveTab('approved')} role="tab" aria-selected={activeTab === 'approved'}><CheckCircle2 size={15} /> Approved <b>{counts.approved}</b></button><button className={activeTab === 'rejected' ? 'active' : ''} onClick={() => setActiveTab('rejected')} role="tab" aria-selected={activeTab === 'rejected'}><X size={15} /> Rejected <b>{counts.rejected}</b></button></div>
    {error && <div className="auth-status error">{error}</div>}
    {loading ? <div className="empty-state compact-empty"><Package size={24} /><h3>Loading moderation</h3><p>Getting listing statuses from Supabase.</p></div> : activeTab === 'pending' ? items.length ? <div className="admin-queue">{items.map((listing) => <article className="admin-listing-card" key={listing.id}>{listing.image ? <img src={listing.image} alt={listing.title} /> : <div className="admin-listing-placeholder"><Package size={24} /></div>}<div className="admin-listing-body"><div className="admin-listing-meta"><span className="status-pill pending"><Clock3 size={12} /> Pending review</span><span>{formatDate(listing.raw?.created_at)}</span></div><h2>{listing.title}</h2><strong className="admin-price">{listing.price}</strong><span className="admin-location"><MapPin size={13} /> {listing.location}</span><p>{listing.description || 'No description supplied.'}</p><div className="admin-details"><span>{listing.category}{listing.subcategory ? ` · ${listing.subcategory}` : ''}</span><span>{listing.gallery?.length || 0} photo(s)</span><span>{listing.seller || 'bese26 seller'}</span></div>{rejectingId === listing.id && <textarea className="admin-rejection-input" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Reason for rejection" maxLength={500} />}</div><div className="admin-listing-actions">{rejectingId === listing.id ? <><button className="danger-button" onClick={() => review(listing.id, 'reject', listing)} disabled={busyId === listing.id}><X size={15} /> {busyId === listing.id ? 'Rejecting…' : 'Confirm reject'}</button><button className="text-action" onClick={() => { setRejectingId(''); setRejectReason(''); }}>Cancel</button></> : <><button className="primary-button" onClick={() => review(listing.id, 'approve', listing)} disabled={busyId === listing.id}><Check size={15} /> {busyId === listing.id ? 'Approving…' : 'Approve listing'}</button><button className="danger-outline-button" onClick={() => { setRejectingId(listing.id); setError(''); }} disabled={busyId === listing.id}><X size={15} /> Reject</button></>}</div></article>)}</div> : <div className="empty-state"><Check size={28} /><h3>No pending listings</h3><p>New seller submissions will appear here for review.</p></div> : reviewedItems.length ? <div className="admin-history-list">{reviewedItems.map((event) => <article className="admin-history-card" key={event.id}><div className={`admin-history-icon ${event.action}`}><CheckCircle2 size={19} /></div><div className="admin-history-content"><div className="admin-listing-meta"><span className={`status-pill ${event.action === 'approve' ? 'approved' : 'rejected'}`}>{statusLabel(event.action)}</span><span>{formatDate(event.created_at)}</span></div><h2>{event.listing?.title || 'Listing'}</h2><strong className="admin-price">{formatHistoryPrice(event.listing)}</strong><span className="admin-location"><MapPin size={13} /> {[event.listing?.city, event.listing?.state].filter(Boolean).join(', ') || 'Location not set'}</span>{event.rejection_reason && <p className="admin-review-reason"><b>Reason:</b> {event.rejection_reason}</p>}</div></article>)}</div> : <div className="empty-state"><Package size={28} /><h3>No {activeTab} listings yet</h3><p>Reviewed listings will appear here with their moderation status.</p></div>}
  </div>;
}
