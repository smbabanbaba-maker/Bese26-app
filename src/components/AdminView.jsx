import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Clock3, MapPin, Package, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { fetchModerationHistory, fetchPendingListings, moderateListing, fetchVerificationQueue, fetchIdentityVerificationQueue, reviewBusinessVerification, reviewIdentityVerification, reviewVerificationApplication } from '../lib/marketplace';

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
    <div className="admin-status-tabs" role="tablist" aria-label="Moderation status"><button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')} role="tab" aria-selected={activeTab === 'pending'}><Clock3 size={15} /> Pending <b>{counts.pending}</b></button><button className={activeTab === 'approved' ? 'active' : ''} onClick={() => setActiveTab('approved')} role="tab" aria-selected={activeTab === 'approved'}><CheckCircle2 size={15} /> Approved <b>{counts.approved}</b></button><button className={activeTab === 'rejected' ? 'active' : ''} onClick={() => setActiveTab('rejected')} role="tab" aria-selected={activeTab === 'rejected'}><X size={15} /> Rejected <b>{counts.rejected}</b></button></div>
    {error && <div className="auth-status error">{error}</div>}
    {loading ? <div className="empty-state compact-empty"><Package size={24} /><h3>Loading moderation</h3><p>Getting listing statuses from Supabase.</p></div> : activeTab === 'pending' ? items.length ? <div className="admin-queue">{items.map((listing) => <article className="admin-listing-card" key={listing.id}>{listing.image ? <img src={listing.image} alt={listing.title} /> : <div className="admin-listing-placeholder"><Package size={24} /></div>}<div className="admin-listing-body"><div className="admin-listing-meta"><span className="status-pill pending"><Clock3 size={12} /> Pending review</span><span>{formatDate(listing.raw?.created_at)}</span></div><h2>{listing.title}</h2><strong className="admin-price">{listing.price}</strong><span className="admin-location"><MapPin size={13} /> {listing.location}</span><p>{listing.description || 'No description supplied.'}</p><div className="admin-details"><span>{listing.category}{listing.subcategory ? ` · ${listing.subcategory}` : ''}</span><span>{listing.gallery?.length || 0} photo(s)</span><span>{listing.seller || 'bese26 seller'}</span></div>{rejectingId === listing.id && <textarea className="admin-rejection-input" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Reason for rejection" maxLength={500} />}</div><div className="admin-listing-actions">{rejectingId === listing.id ? <><button className="danger-button" onClick={() => review(listing.id, 'reject', listing)} disabled={busyId === listing.id}><X size={15} /> {busyId === listing.id ? 'Rejecting…' : 'Confirm reject'}</button><button className="text-action" onClick={() => { setRejectingId(''); setRejectReason(''); }}>Cancel</button></> : <><button className="primary-button" onClick={() => review(listing.id, 'approve', listing)} disabled={busyId === listing.id}><Check size={15} /> {busyId === listing.id ? 'Approving…' : 'Approve listing'}</button><button className="danger-outline-button" onClick={() => { setRejectingId(listing.id); setError(''); }} disabled={busyId === listing.id}><X size={15} /> Reject</button></>}</div></article>)}</div> : <div className="empty-state"><Check size={28} /><h3>No pending listings</h3><p>New seller submissions will appear here for review.</p></div> : reviewedItems.length ? <div className="admin-history-list">{reviewedItems.map((event) => <article className="admin-history-card" key={event.id}><div className={`admin-history-icon ${event.action}`}><CheckCircle2 size={19} /></div><div className="admin-history-content"><div className="admin-listing-meta"><span className={`status-pill ${event.action === 'approve' ? 'approved' : 'rejected'}`}>{statusLabel(event.action)}</span><span>{formatDate(event.created_at)}</span></div><h2>{event.listing?.title || 'Listing'}</h2><strong className="admin-price">{formatHistoryPrice(event.listing)}</strong><span className="admin-location"><MapPin size={13} /> {[event.listing?.city, event.listing?.state].filter(Boolean).join(', ') || 'Location not set'}</span>{event.rejection_reason && <p className="admin-review-reason"><b>Reason:</b> {event.rejection_reason}</p>}</div></article>)}</div> : <div className="empty-state"><Package size={28} /><h3>No {activeTab} listings yet</h3><p>Reviewed listings will appear here with their moderation status.</p></div>}
  </div>;
}
