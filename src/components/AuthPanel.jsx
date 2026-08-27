import { useState } from 'react';
import { CheckCircle2, KeyRound, Mail, UserRound, X } from 'lucide-react';
import { requestEmailOtp, verifyEmailOtp } from '../lib/marketplace';

const initialForm = { email: '', displayName: '', username: '', token: '' };

export default function AuthPanel({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('signin');
  const [step, setStep] = useState('email');
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const requestCode = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    if (!form.email.trim()) {
      setStatus({ type: 'error', message: 'Enter your email address.' });
      return;
    }
    if (mode === 'signup' && !form.displayName.trim()) {
      setStatus({ type: 'error', message: 'Enter your display name.' });
      return;
    }
    setLoading(true);
    try {
      await requestEmailOtp({
        email: form.email.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        username: form.username.trim().toLowerCase(),
      });
      setStep('token');
      setStatus({ type: 'success', message: 'We sent a one-time code to your email. Check your inbox and spam folder.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Could not send the code. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    const token = form.token.replace(/\D/g, '');
    if (token.length < 6) {
      setStatus({ type: 'error', message: 'Enter the 6-digit code from your email.' });
      return;
    }
    setLoading(true);
    try {
      const data = await verifyEmailOtp({ email: form.email.trim().toLowerCase(), token });
      onAuthenticated?.(data.user);
      onClose?.();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'That code is invalid or expired. Request a new one.' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((current) => current === 'signin' ? 'signup' : 'signin');
    setStep('email');
    setForm(initialForm);
    setStatus({ type: '', message: '' });
  };

  const changeEmail = () => {
    setStep('email');
    setForm((current) => ({ ...current, token: '' }));
    setStatus({ type: '', message: '' });
  };

  return <div className="auth-backdrop" onClick={onClose}>
    <section className="auth-panel" onClick={(event) => event.stopPropagation()} aria-labelledby="auth-title">
      <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close authentication"><X size={18} /></button>
      <div className="auth-panel-mark"><KeyRound size={18} /></div>
      <div className="eyebrow">SAFE MARKETPLACE ACCESS</div>
      <h2 id="auth-title">{mode === 'signin' ? 'Welcome back.' : 'Create your bese26 account.'}</h2>
      <p className="auth-panel-copy">{step === 'email' ? 'Use your email to receive a secure one-time code.' : `Enter the code we sent to ${form.email}.`}</p>
      {status.message && <div className={`auth-status ${status.type}`}><CheckCircle2 size={15} /> <span>{status.message}</span></div>}
      {step === 'email' ? <form onSubmit={requestCode} className="auth-form">
        {mode === 'signup' && <>
          <label><span><UserRound size={14} /> Display name</span><input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Your name" autoComplete="name" required /></label>
          <label><span><UserRound size={14} /> Username</span><input value={form.username} onChange={(event) => update('username', event.target.value.replace(/\s+/g, '').toLowerCase())} placeholder="e.g. sayyeed" autoComplete="username" /></label>
        </>}
        <label><span><Mail size={14} /> Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
        <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Sending code…' : mode === 'signin' ? 'Send sign-in code' : 'Send verification code'}</button>
      </form> : <form onSubmit={verifyCode} className="auth-form">
        <label><span><KeyRound size={14} /> One-time code</span><input value={form.token} onChange={(event) => update('token', event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
        <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify and continue'}</button>
        <div className="auth-inline-actions"><button type="button" className="auth-link-button" onClick={changeEmail}>Change email</button><button type="button" className="auth-link-button" onClick={requestCode} disabled={loading}>Resend code</button></div>
      </form>}
      <button type="button" className="auth-switch" onClick={switchMode}>{mode === 'signin' ? 'New to bese26? Create an account' : 'Already have an account? Sign in'}</button>
    </section>
  </div>;
}
