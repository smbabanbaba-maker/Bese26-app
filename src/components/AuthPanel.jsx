import { useState } from 'react';
import { CheckCircle2, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { signIn, signInWithGoogle, signUp } from '../lib/marketplace';

function WelcomeSide({ isSignin }) {
  return <div className="auth-welcome-panel">
    <div className="auth-welcome-shape auth-welcome-shape-one" />
    <div className="auth-welcome-shape auth-welcome-shape-two" />
    <div className="auth-welcome-content">
      <span className="auth-welcome-kicker">BESE26 MARKETPLACE</span>
      <span className="auth-welcome-mark"><img src="/images/bese26-logo-icon.png" alt="Bese26" /></span>
      <h2>{isSignin ? 'WELCOME\nBACK!' : 'JOIN THE\nMARKETPLACE'}</h2>
      <p>{isSignin ? 'Save listings, post items, and chat with sellers securely.' : 'Create your profile and start buying or selling with confidence.'}</p>
    </div>
  </div>;
}

export default function AuthPanel({ onClose, onAuthenticated, reason = '' }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', username: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStatus({ type: '', message: '' });
  };
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    if (form.password.length < 6) {
      setStatus({ type: 'error', message: 'Use a password with at least 6 characters.' });
      return;
    }
    setLoading(true);
    try {
      const data = mode === 'signin'
        ? await signIn({ email: form.email, password: form.password })
        : await signUp({ email: form.email, password: form.password, displayName: form.displayName, username: form.username });
      if (mode === 'signup' && !data.session) {
        setStatus({ type: 'success', message: 'Account created. Check your email to confirm your account, then sign in.' });
        switchMode('signin');
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

  const isSignin = mode === 'signin';
  const renderSignin = () => <div className="auth-form-panel auth-form-face-content">
    <div className="auth-panel-mark"><img src="/images/bese26-logo-icon.png" alt="Bese26" /></div>
    <div className="eyebrow">SAFE MARKETPLACE ACCESS</div>
    <h2 id="auth-title">Login</h2>
    <p className="auth-panel-copy">{reason || 'Welcome back to your marketplace.'}</p>
    {status.message && <div className={`auth-status ${status.type}`}><CheckCircle2 size={15} /> <span>{status.message}</span></div>}
    {isSupabaseConfigured && <>
      <button type="button" className="google-auth-button" onClick={continueWithGoogle} disabled={loading}><span className="google-logo" aria-hidden="true"><i>G</i></span> Continue with Google</button>
      <div className="auth-divider"><span>or use email</span></div>
    </>}
    <form onSubmit={submit} className="auth-form">
      <label><span><Mail size={14} /> Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      <label><span><LockKeyhole size={14} /> Password</span><input type="password" minLength={6} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 6 characters" autoComplete="current-password" required /></label>
      <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait…' : 'Login'}</button>
    </form>
    <button type="button" className="auth-switch" onClick={() => switchMode('signup')}>Don’t have an account? <strong>Sign up</strong></button>
  </div>;
  const renderSignup = () => <div className="auth-form-panel auth-form-face-content">
    <div className="auth-panel-mark"><img src="/images/bese26-logo-icon.png" alt="Bese26" /></div>
    <div className="eyebrow">JOIN BESE26</div>
    <h2 id="auth-title">Create account</h2>
    <p className="auth-panel-copy">{reason || 'Set up your secure marketplace account.'}</p>
    {status.message && <div className={`auth-status ${status.type}`}><CheckCircle2 size={15} /> <span>{status.message}</span></div>}
    {isSupabaseConfigured && <>
      <button type="button" className="google-auth-button" onClick={continueWithGoogle} disabled={loading}><span className="google-logo" aria-hidden="true"><i>G</i></span> Continue with Google</button>
      <div className="auth-divider"><span>or use email</span></div>
    </>}
    <form onSubmit={submit} className="auth-form auth-signup-form">
      <div className="auth-field-row"><label><span><UserRound size={14} /> Display name</span><input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Your name" autoComplete="name" required /></label>
      <label><span><UserRound size={14} /> Username</span><input value={form.username} onChange={(event) => update('username', event.target.value.replace(/\s+/g, '').toLowerCase())} placeholder="e.g. sayyeed" autoComplete="username" /></label></div>
      <div className="auth-field-row"><label><span><Mail size={14} /> Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      <label><span><LockKeyhole size={14} /> Password</span><input type="password" minLength={6} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required /></label></div>
      <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait…' : 'Create account'}</button>
    </form>
    <button type="button" className="auth-switch" onClick={() => switchMode('signin')}>Already have an account? <strong>Login</strong></button>
  </div>;
  return <div className="auth-backdrop" onClick={onClose}>
    <section className="auth-panel" onClick={(event) => event.stopPropagation()} aria-labelledby="auth-title">
      <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close authentication"><X size={18} /></button>
      <div className={`auth-form-flip-shell ${isSignin ? '' : 'is-flipped'}`}>
        <div className="auth-form-flip-card">
          <div className="auth-form-face auth-form-front">
            {renderSignin()}
            <WelcomeSide isSignin />
          </div>
          <div className="auth-form-face auth-form-back">
            {renderSignup()}
            <WelcomeSide isSignin={false} />
          </div>
        </div>
      </div>
    </section>
  </div>;
}
