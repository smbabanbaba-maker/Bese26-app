import { useEffect, useState } from 'react';
import { Archive, FileClock, PauseCircle, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { adminSetMaintenance, adminSoftDeleteBusiness, fetchAdminAuditLogs, fetchAdminDirectoryControls, fetchAdminPlatformSettings } from '../lib/marketplace';

export default function AdminPlatformControls({ onNotice }) {
  const [settings, setSettings] = useState({ maintenance_mode: false, maintenance_message: '' });
  const [businesses, setBusinesses] = useState([]);
  const [audit, setAudit] = useState([]);
  const [message, setMessage] = useState('Bese26 is temporarily unavailable while we make improvements.');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showPublicMiniwebs, setShowPublicMiniwebs] = useState(false);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextSettings, directory, logs] = await Promise.all([fetchAdminPlatformSettings(), fetchAdminDirectoryControls(), fetchAdminAuditLogs(60)]);
      setSettings(nextSettings); setMessage(nextSettings.maintenance_message || message); setBusinesses(directory.businesses || []); setAudit(logs || []);
    } catch (reason) { setError(reason.message || 'Could not load platform controls.'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const toggleMaintenance = async () => {
    const enabled = !settings.maintenance_mode;
    if (enabled && !window.confirm('Pause public marketplace access for maintenance? Owner admin access will remain available.')) return;
    setBusy('maintenance'); setError('');
    try { const next = await adminSetMaintenance(enabled, message); setSettings(next); onNotice?.(enabled ? 'Marketplace maintenance mode enabled.' : 'Marketplace maintenance mode disabled.'); await load(); } catch (reason) { setError(reason.message || 'Could not update maintenance mode.'); } finally { setBusy(''); }
  };
  const removeBusiness = async (business) => {
    const reason = window.prompt(`Why should ${business.business_name || 'this miniweb'} be removed from the directory?`);
    if (!reason?.trim()) return;
    setBusy(business.profile_id); setError('');
    try { await adminSoftDeleteBusiness(business.profile_id, reason); setBusinesses((current) => current.filter((item) => item.profile_id !== business.profile_id)); onNotice?.('Miniweb removed from public directory and logged.'); await load(); } catch (requestError) { setError(requestError.message || 'Could not remove miniweb.'); } finally { setBusy(''); }
  };
  return <section className="admin-operation-card admin-platform-controls"><div className="admin-section-title"><div><strong><ShieldCheck size={16} /> Owner Platform Control</strong><p>Pause the marketplace, review every owner action, and remove a miniweb from public access. Changes are reversible where possible and auditable.</p></div><span className="status-pill approved">Owner only</span></div>{error && <div className="auth-status error">{error}</div>}{loading ? <div className="empty-state compact-empty">Loading platform controls…</div> : <><div className="admin-platform-control-grid"><div className={`admin-platform-state ${settings.maintenance_mode ? 'is-paused' : ''}`}><div>{settings.maintenance_mode ? <PauseCircle size={22} /> : <PlayCircle size={22} />}<div><strong>{settings.maintenance_mode ? 'Maintenance mode is ON' : 'Marketplace is live'}</strong><small>{settings.maintenance_mode ? 'Public users see a maintenance message.' : 'Buyers and sellers can use the marketplace normally.'}</small></div></div><button type="button" className={settings.maintenance_mode ? 'primary-button' : 'danger-outline-button'} onClick={toggleMaintenance} disabled={busy === 'maintenance'}>{busy === 'maintenance' ? 'Updating…' : settings.maintenance_mode ? 'Resume marketplace' : 'Pause marketplace'}</button></div><label className="admin-maintenance-message">Maintenance message<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={240} rows="2" /></label></div><div className="admin-platform-subsections"><div className={`admin-public-miniwebs ${showPublicMiniwebs ? 'is-expanded' : ''}`}><div className="admin-section-title"><div><strong><Archive size={15} /> Public miniwebs</strong><p>Soft-delete hides a miniweb without destroying its records.</p></div><div className="admin-user-access-summary"><span className="admin-section-count">{businesses.filter((item) => item.is_active).length} active</span><button type="button" className="admin-directory-more" onClick={() => setShowPublicMiniwebs((value) => !value)}>{showPublicMiniwebs ? 'Hide miniweb list' : 'View all miniwebs'}</button></div></div>{showPublicMiniwebs ? <>{businesses.filter((item) => item.is_active).map((business) => <div className="admin-operation-row" key={business.profile_id}><div><strong>{business.business_name || 'Business miniweb'}</strong><small>@{business.business_handle || 'no-handle'} · {business.owner_name || 'Owner'}</small></div><button type="button" className="danger-outline-button" disabled={busy === business.profile_id} onClick={() => removeBusiness(business)}>{busy === business.profile_id ? 'Removing…' : 'Remove miniweb'}</button></div>)}{!businesses.filter((item) => item.is_active).length && <div className="empty-state compact-empty">No active miniwebs.</div>}</> : <div className="admin-user-collapsed"><Archive size={20} /><span>Miniweb list is hidden to keep this panel compact.</span><small>Click “View all miniwebs” to manage them.</small></div>}</div><div><div className="admin-section-title"><div><strong><FileClock size={15} /> Owner audit log</strong><p>Review maintenance, miniweb, and future owner actions.</p></div><button type="button" className="secondary-button" onClick={load}><RefreshCw size={14} /> Refresh</button></div>{audit.slice(0, 10).map((item) => <div className="admin-operation-row" key={item.id}><div><strong>{item.action.replaceAll('_', ' ')}</strong><small>{item.target_type || 'platform'} · {item.note || 'No note'}</small></div><time>{new Date(item.created_at).toLocaleDateString('en-NG')}</time></div>)}{!audit.length && <div className="empty-state compact-empty">No owner actions recorded yet.</div>}</div></div></>}</section>;
}
