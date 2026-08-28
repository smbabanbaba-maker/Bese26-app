import { useState } from 'react';
import { CheckCircle2, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { signIn, signInWithGoogle, signUp } from '../lib/marketplace';

export default function AuthPanel({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', username: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    if (form.password.length < 8) {
      setStatus({ type: 'error', message: 'Use a password with at least 8 characters.' });
      return;
    }
    setLoading(true);
    try {
      const data = mode === 'signin'
        ? await signIn({ email: form.email, password: form.password })
        : await signUp({ email: form.email, password: form.password, displayName: form.displayName, username: form.username });
      if (mode === 'signup' && !data.session) {
        setStatus({ type: 'success', message: 'Account created. Check your email to confirm your account, then sign in.' });
        setMode('signin');
      } else {
        onAuthenticated?.(data.user);
        onClose?.();
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Authentication failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  const continueWithGoogle = async () => {
    setStatus({ type: '', message: '' });
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Google sign-in is unavailable. Check that Google is enabled in Supabase Auth.' });
      setLoading(false);
    }
  };

  return <div className="auth-backdrop" onClick={onClose}>
    <section className="auth-panel" onClick={(event) => event.stopPropagation()} aria-labelledby="auth-title">
      <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close authentication"><X size={18} /></button>
      <div className="auth-panel-mark"><LockKeyhole size={18} /></div>
      <div className="eyebrow">SAFE MARKETPLACE ACCESS</div>
      <h2 id="auth-title">{mode === 'signin' ? 'Welcome back.' : 'Create your bese26 account.'}</h2>
      <p className="auth-panel-copy">{mode === 'signin' ? 'Sign in to save listings, post items, and chat with sellers.' : 'Use your email to create a secure marketplace account.'}</p>
      {status.message && <div className={`auth-status ${status.type}`}><CheckCircle2 size={15} /> <span>{status.message}</span></div>}
      {mode === 'signin' && isSupabaseConfigured && <>
        <button type="button" className="google-auth-button" onClick={continueWithGoogle} disabled={loading}><strong>G</strong> Continue with Google</button>
        <div className="auth-divider"><span>or use email</span></div>
      </>}
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && <>
          <label><span><UserRound size={14} /> Display name</span><input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Your name" autoComplete="name" required /></label>
          <label><span><UserRound size={14} /> Username</span><input value={form.username} onChange={(event) => update('username', event.target.value.replace(/\s+/g, '').toLowerCase())} placeholder="e.g. sayyeed" autoComplete="username" /></label>
        </>}
        <label><span><Mail size={14} /> Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
        <label><span><LockKeyhole size={14} /> Password</span><input type="password" minLength={8} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /></label>
        <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setStatus({ type: '', message: '' }); }}>{mode === 'signin' ? 'New to bese26? Create an account' : 'Already have an account? Sign in'}</button>
    </section>
  </div>;
}
