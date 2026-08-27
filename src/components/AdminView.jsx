import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock3, MapPin, Package, ShieldCheck, X } from 'lucide-react';
import { fetchPendingListings, moderateListing } from '../lib/marketplace';

function formatDate(value) {
  if (!value) return 'Recently submitted';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminView({ user, onBack, onNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await fetchPendingListings());
    } catch (requestError) {
      setError(requestError.message || 'Could not load pending listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchPendingListings().then((rows) => mounted && setItems(rows)).catch((requestError) => mounted && setError(requestError.message || 'Could not load pending listings.')).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const review = async (listingId, action) => {
    if (action === 'reject' && !rejectReason.trim()) {
      setError('Add a short reason before rejecting this listing.');
      return;
    }
    setBusyId(listingId);
    setError('');
    try {
      await moderateListing({ listingId, action, rejectionReason: action === 'reject' ? rejectReason.trim() : null });
      setItems((current) => current.filter((item) => item.id !== listingId));
      setRejectingId('');
      setRejectReason('');
      onNotice?.(action === 'approve' ? 'Listing approved and now live.' : 'Listing rejected with a review reason.');
    } catch (reviewError) {
      setError(reviewError.message || 'Could not update this listing.');
    } finally {
      setBusyId('');
    }
  };

  if (!user) return <div className="page-stack admin-page"><div className="profile-subpage-header"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><div><div className="eyebrow">ADMIN CENTER</div><h1>Sign in required</h1></div></div><div className="empty-state"><ShieldCheck size={28} /><h3>Admin access required</h3><p>Sign in with the authorized Bese26 admin account to review listings.</p></div></div>;

  return <div className="page-stack admin-page">
    <div className="profile-subpage-header"><button className="icon-button" onClick={onBack} aria-label="Back from moderation"><ArrowLeft size={18} /></button><div><div className="eyebrow">ADMIN CENTER</div><h1>Moderation</h1></div><span className="admin-access-badge"><ShieldCheck size={14} /> Admin</span></div>
    <div className="admin-intro"><div><strong>Review pending listings</strong><p>Approve only accurate, safe listings. Approved items become visible on Home.</p></div><button className="secondary-button" onClick={load} disabled={loading}>Refresh</button></div>
    {error && <div className="auth-status error">{error}</div>}
    {loading ? <div className="empty-state compact-empty"><Package size={24} /><h3>Loading review queue</h3><p>Getting pending listings from Supabase.</p></div> : items.length ? <div className="admin-queue">{items.map((listing) => <article className="admin-listing-card" key={listing.id}>
      {listing.image ? <img src={listing.image} alt={listing.title} /> : <div className="admin-listing-placeholder"><Package size={24} /></div>}
      <div className="admin-listing-body"><div className="admin-listing-meta"><span className="status-pill pending"><Clock3 size={12} /> Pending</span><span>{formatDate(listing.raw?.created_at)}</span></div><h2>{listing.title}</h2><strong className="admin-price">{listing.price}</strong><span className="admin-location"><MapPin size={13} /> {listing.location}</span><p>{listing.description || 'No description supplied.'}</p><div className="admin-details"><span>{listing.category}{listing.subcategory ? ` · ${listing.subcategory}` : ''}</span><span>{listing.gallery?.length || 0} photo(s)</span><span>{listing.seller || 'bese26 seller'}</span></div>{rejectingId === listing.id && <textarea className="admin-rejection-input" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Reason for rejection" maxLength={500} />}</div>
      <div className="admin-listing-actions">{rejectingId === listing.id ? <><button className="danger-button" onClick={() => review(listing.id, 'reject')} disabled={busyId === listing.id}><X size={15} /> {busyId === listing.id ? 'Rejecting…' : 'Confirm reject'}</button><button className="text-action" onClick={() => { setRejectingId(''); setRejectReason(''); }}>Cancel</button></> : <><button className="primary-button" onClick={() => review(listing.id, 'approve')} disabled={busyId === listing.id}><Check size={15} /> {busyId === listing.id ? 'Approving…' : 'Approve listing'}</button><button className="danger-outline-button" onClick={() => { setRejectingId(listing.id); setError(''); }} disabled={busyId === listing.id}><X size={15} /> Reject</button></>}</div>
    </article>)}</div> : <div className="empty-state"><Check size={28} /><h3>No pending listings</h3><p>New seller submissions will appear here for review.</p></div>}
  </div>;
}
