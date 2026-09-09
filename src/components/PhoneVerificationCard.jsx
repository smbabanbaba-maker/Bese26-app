import { useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, Clock3, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (raw.startsWith('0')) return `+234${raw.slice(1)}`;
  if (/^234\d{10}$/.test(raw)) return `+${raw}`;
  return raw;
}

export default function PhoneVerificationCard({ user, onNotice }) {
  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('idle');
  const [verified, setVerified] = useState(Boolean(user?.phone_confirmed_at));
  const [verifiedPhone, setVerifiedPhone] = useState(user?.phone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPhone(user?.phone || '');
    setVerified(Boolean(user?.phone_confirmed_at));
    setVerifiedPhone(user?.phone || '');
  }, [user?.phone, user?.phone_confirmed_at]);

  const sendCode = async (event) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(normalized)) { setError('Enter a valid phone number, for example +2348012345678.'); return; }
    setBusy(true); setError('');
    try {
      const { error: requestError } = await supabase.auth.updateUser({ phone: normalized });
      if (requestError) throw requestError;
      setPhone(normalized); setStep('code');
      onNotice?.('Verification code sent. Check your phone.');
    } catch (requestError) { setError(requestError.message || 'Could not send the verification code.'); }
    finally { setBusy(false); }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit verification code.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'phone_change' });
      if (verifyError) throw verifyError;
      const confirmedPhone = data?.user?.phone || phone;
      setVerified(true); setVerifiedPhone(confirmedPhone); setStep('verified'); setCode('');
      onNotice?.('Phone number verified successfully. You will not need to verify it again unless you change it.');
    } catch (verifyError) { setError(verifyError.message || 'That code is invalid or expired.'); }
    finally { setBusy(false); }
  };

  return <section className="phone-verification-card"><div className="phone-verification-heading"><span className="phone-verification-icon"><Phone size={18} /></span><div><strong>Phone Verification</strong><small>One-time verification for your account</small></div><span className={`phone-verification-status ${verified ? 'verified' : ''}`}>{verified ? <><BadgeCheck size={13} /> Verified</> : 'Not verified'}</span></div>{verified ? <div className="phone-verified-note"><CheckCircle2 size={16} /><span><b>{verifiedPhone}</b><small>Verified once. It stays verified unless you change this number.</small></span></div> : step === 'code' ? <form className="phone-verification-form" onSubmit={verifyCode}><label>6-digit code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label><div className="phone-verification-actions"><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Checking…' : 'Verify number'} <ShieldCheck size={15} /></button><button type="button" className="secondary-button" disabled={busy} onClick={() => { setStep('idle'); setError(''); }}>Change number</button></div><p className="phone-verification-help"><Clock3 size={13} /> Code expires shortly. Request another only if needed.</p></form> : <form className="phone-verification-form" onSubmit={sendCode}><label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234 801 234 5678" /></label><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Sending code…' : 'Send verification code'} <ShieldCheck size={15} /></button><p className="phone-verification-help">You will verify this number once. It will remain verified on future logins.</p></form>}{error && <p className="phone-verification-error" role="alert">{error}</p>}</section>;
}

export { normalizePhone };
