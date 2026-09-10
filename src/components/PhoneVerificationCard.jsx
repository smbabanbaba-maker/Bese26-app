import { useEffect, useState } from 'react';
import { CheckCircle2, Phone } from 'lucide-react';
import { updateProfileContacts } from '../lib/marketplace';

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0')) return `+234${raw.slice(1)}`;
  if (/^234\d{10}$/.test(raw)) return `+${raw}`;
  return raw;
}

export default function PhoneVerificationCard({ user, onNotice }) {
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = user?.phone || user?.profile_contacts?.phone || '';
    setPhone(existing);
    setSavedPhone(existing);
  }, [user?.phone, user?.profile_contacts?.phone]);

  const addPhone = async (event) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(normalized)) { setError('Enter a valid phone number, for example +2348012345678.'); return; }
    if (!user?.id) { setError('Sign in before adding a phone number.'); return; }
    setBusy(true); setError('');
    try {
      await updateProfileContacts(user.id, { phone: normalized });
      setPhone(normalized); setSavedPhone(normalized); setSaved(true);
      onNotice?.('Phone number added successfully.');
    } catch (requestError) { setError(requestError.message || 'Could not save the phone number.'); }
    finally { setBusy(false); }
  };

  return <section className="phone-verification-card"><div className="phone-verification-heading"><span className="phone-verification-icon"><Phone size={18} /></span><div><strong>Phone Number</strong><small>Add your number for listing contact options</small></div><span className={`phone-verification-status ${savedPhone ? 'verified' : ''}`}>{savedPhone ? <><CheckCircle2 size={13} /> Added</> : 'Not added'}</span></div><form className="phone-verification-form" onSubmit={addPhone}><label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false); }} placeholder="+234 801 234 5678" /></label><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : saved ? 'Add successful' : savedPhone ? 'Update phone number' : 'Add phone number'}</button><p className="phone-verification-help">Your number is saved to your Bese26 profile. Phone ownership is not verified until SMS verification is enabled.</p></form>{error && <p className="phone-verification-error" role="alert">{error}</p>}</section>;
}

export { normalizePhone };
