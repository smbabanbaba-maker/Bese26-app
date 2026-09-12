import { useState } from 'react';
import { CheckCircle2, LockKeyhole, LoaderCircle, Mail, UserRound, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { requestPasswordReset, sendEmailOtp, signIn, signInWithGoogle, signUp, verifyEmailOtp } from '../lib/marketplace';

function WelcomeSide({ isSignin }) {
  return <div className="auth-welcome-panel">
    <div className="auth-welcome-shape auth-welcome-shape-one" />
    <div className="auth-welcome-shape auth-welcome-shape-two" />
    <div className="auth-welcome-content">
      <span className="auth-welcome-kicker">BESE26 MARKETPLACE</span>
      <span className="auth-welcome-mark"><img src="/images/bese26-official-logo.png" alt="Bese26" /></span>
      <h2>{isSignin ? 'WELCOME\nBACK!' : 'JOIN THE\nMARKETPLACE'}</h2>
      <p>{isSignin ? 'Save listings, post items, and chat with sellers securely.' : 'Create your profile and start buying or selling with confidence.'}</p>
      <span className="auth-welcome-note"><span /> Secure access for every device</span>
    </div>
  </div>;
}

function AuthLoading({ label }) {
  return <div className="auth-loading-overlay" role="status" aria-live="polite"><div className="auth-loading-orbit"><span /><span /><span /><img src="/images/bese26-logo-icon.png" alt="" /></div><strong>{label}</strong><small>Keeping your account secure</small><LoaderCircle size={16} className="auth-loading-spinner" /></div>;
}

function GoogleButton({ onClick, disabled }) {
  return <button type="button" className="google-auth-button" onClick={onClick} disabled={disabled}>
    <img className="google-logo" src="/images/google-logo.jpg" alt="Google" />
    <span>Continue with Google</span>
    <span className="google-button-arrow" aria-hidden="true">↗</span>
  </button>;
}

export default function AuthPanel({ onClose, onAuthenticated, reason = '' }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', username: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Signing you in…');
  const [resetting, setResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const switchMode = (nextMode) => { setMode(nextMode); setStatus({ type: '', message: '' }); setOtpSent(false); setOtp(''); };
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    if (form.password.length < 6) { setStatus({ type: 'error', message: 'Use a password with at least 6 characters.' }); return; }
    setLoading(true);
    setLoadingLabel(mode === 'signin' ? 'Signing you in…' : 'Creating your account…');
    try {
      const data = mode === 'signin'
        ? await signIn({ email: form.email, password: form.password })
        : await signUp({ email: form.email, password: form.password, displayName: form.displayName, username: form.username });
      if (mode === 'signup' && !data.session) { setStatus({ type: 'success', message: 'Account created. Check your email to confirm your account, then sign in.' }); switchMode('signin'); }
      else { onAuthenticated?.(data.user); onClose?.(); }
    } catch (error) { setStatus({ type: 'error', message: error.message || 'Authentication failed. Please try again.' }); }
    finally { setLoading(false); }
  };
  const sendOtp = async () => {
    setStatus({ type: '', message: '' });
    if (!form.email.trim()) { setStatus({ type: 'error', message: 'Enter your email first.' }); return; }
    setLoading(true); setLoadingLabel('Sending your login code…');
    try { await sendEmailOtp(form.email); setOtpSent(true); setStatus({ type: 'success', message: 'We sent a 6-digit code to your email. Check your inbox and spam folder.' }); }
    catch (error) { setStatus({ type: 'error', message: error.message || 'Could not send the email code.' }); }
    finally { setLoading(false); }
  };
  const verifyOtp = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    if (!/^\d{6}$/.test(otp.trim())) { setStatus({ type: 'error', message: 'Enter the 6-digit code from your email.' }); return; }
    setLoading(true); setLoadingLabel('Verifying your code…');
    try { const data = await verifyEmailOtp({ email: form.email, token: otp }); onAuthenticated?.(data.user); onClose?.(); }
    catch (error) { setStatus({ type: 'error', message: error.message || 'That code is invalid or has expired.' }); }
    finally { setLoading(false); }
  };
  const resetPassword = async () => {
    setStatus({ type: '', message: '' });
    if (!form.email.trim()) { setStatus({ type: 'error', message: 'Enter your email, then tap Forgot password.' }); return; }
    setResetting(true);
    try { await requestPasswordReset(form.email); setStatus({ type: 'success', message: 'Password reset instructions sent. Check your email.' }); }
    catch (error) { setStatus({ type: 'error', message: error.message || 'Could not send reset instructions.' }); }
    finally { setResetting(false); }
  };
  const continueWithGoogle = async () => {
    setStatus({ type: '', message: '' });
    setLoading(true); setLoadingLabel('Connecting to Google…');
    try { await signInWithGoogle(); }
    catch (error) { setStatus({ type: 'error', message: error.message || 'Google sign-in is unavailable. Check that Google is enabled in Supabase Auth.' }); setLoading(false); }
  };

  const isSignin = mode === 'signin';
  const renderSignin = () => <div className="auth-form-panel auth-form-face-content">
    <div className="auth-panel-mark"><img src="/images/bese26-official-logo.png" alt="Bese26" /></div>
    <div className="eyebrow">SAFE MARKETPLACE ACCESS</div><h2 id="auth-title">Login</h2>
    <p className="auth-panel-copy">{reason || 'Welcome back to your marketplace.'}</p>
    {status.message && <div className={`auth-status ${status.type}`}><CheckCircle2 size={15} /><span>{status.message}</span></div>}
    {isSupabaseConfigured && <><GoogleButton onClick={continueWithGoogle} disabled={loading} /><div className="auth-divider"><span>or use email</span></div></>}
    <form onSubmit={submit} className="auth-form">
      <label><span><Mail size={14} /> Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
      <label><span><LockKeyhole size={14} /> Password</span><input type="password" minLength={6} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 6 characters" autoComplete="current-password" required /></label>
      <button type="submit" className="primary-button auth-submit" disabled={loading || resetting}>{loading ? 'Signing in…' : 'Login'}</button><button type="button" className="auth-forgot" onClick={resetPassword} disabled={loading || resetting}>{resetting ? 'Sending reset link…' : 'Forgot password?'}</button>
    </form>
    {isSupabaseConfigured && <div className="auth-otp-box"><div className="auth-divider"><span>or use email code</span></div>{otpSent ? <form className="auth-otp-form" onSubmit={verifyOtp}><label><span><Mail size={14} /> 6-digit code</span><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" autoComplete="one-time-code" required /></label><button type="submit" className="secondary-button auth-submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify code'}</button><button type="button" className="auth-forgot" onClick={sendOtp} disabled={loading}>Send code again</button></form> : <button type="button" className="secondary-button auth-submit" onClick={sendOtp} disabled={loading || resetting}>{loading ? 'Sending code…' : 'Email me a login code'}</button>}</div>}
    <button type="button" className="auth-switch" onClick={() => switchMode('signup')}>Don’t have an account? <strong>Sign up</strong></button>
  </div>;
  const renderSignup = () => <div className="auth-form-panel auth-form-face-content">
    <div className="auth-panel-mark"><img src="/images/bese26-official-logo.png" alt="Bese26" /></div>
    <div className="eyebrow">JOIN BESE26</div><h2 id="auth-title">Create account</h2>
    <p className="auth-panel-copy">{reason || 'Set up your secure marketplace account.'}</p>
    {status.message && <div className={`auth-status ${status.type}`}><CheckCircle2 size={15} /><span>{status.message}</span></div>}
    {isSupabaseConfigured && <><GoogleButton onClick={continueWithGoogle} disabled={loading} /><div className="auth-divider"><span>or use email</span></div></>}
    <form onSubmit={submit} className="auth-form auth-signup-form">
      <div className="auth-field-row"><label><span><UserRound size={14} /> Display name</span><input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Your name" autoComplete="name" required /></label><label><span><UserRound size={14} /> Username</span><input value={form.username} onChange={(event) => update('username', event.target.value.replace(/\s+/g, '').toLowerCase())} placeholder="e.g. sayyeed" autoComplete="username" /></label></div>
      <div className="auth-field-row"><label><span><Mail size={14} /> Email</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label><span><LockKeyhole size={14} /> Password</span><input type="password" minLength={6} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required /></label></div>
      <button type="submit" className="primary-button auth-submit" disabled={loading}>{loading ? 'Please wait…' : 'Create account'}</button>
    </form>
    <button type="button" className="auth-switch" onClick={() => switchMode('signin')}>Already have an account? <strong>Login</strong></button>
  </div>;
  return <div className="auth-backdrop" onClick={onClose}><section className="auth-panel" onClick={(event) => event.stopPropagation()} aria-labelledby="auth-title">
    <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close authentication"><X size={18} /></button>
    {loading && <AuthLoading label={loadingLabel} />}
    <div className={`auth-form-flip-shell ${isSignin ? '' : 'is-flipped'}`}><div className="auth-form-flip-card">
      <div className="auth-form-face auth-form-front">{renderSignin()}<WelcomeSide isSignin /></div>
      <div className="auth-form-face auth-form-back">{renderSignup()}<WelcomeSide isSignin={false} /></div>
    </div></div>
  </section></div>;
}
