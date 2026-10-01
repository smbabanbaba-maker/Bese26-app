import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, LoaderCircle, Mail, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { requestPasswordReset, resendSignupConfirmation, signIn, signUp } from '../lib/marketplace';

function BrandHeader() {
  return <div className="auth-reference-brand"><div className="auth-reference-logo"><img src="/images/bese26-logo-icon.png" alt="Bese26" /></div><div className="auth-reference-name">Bese<span>26</span></div><div className="auth-reference-tagline">BUY · SELL · CONNECT</div></div>;
}
function Field({ icon: Icon, children, className = '' }) { return <div className={`auth-reference-field ${className}`}><span className="auth-reference-field-icon"><Icon size={18} /></span>{children}</div>; }
function PasswordField({ id, value, onChange, placeholder, visible, onToggle, validationState = '' }) {
  return <Field icon={LockKeyhole} className={validationState ? `auth-reference-field-${validationState}` : ''}><input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={id === 'loginPassword' ? 'current-password' : 'new-password'} required />{validationState && <span className="auth-reference-password-status" aria-label={validationState === 'valid' ? 'Password is valid' : 'Passwords do not match'}>{validationState === 'valid' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}</span>}<button type="button" className="auth-reference-eye" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></Field>;
}
function AuthLoading({ label }) { return <div className="auth-loading-overlay" role="status" aria-live="polite"><div className="auth-loading-orbit"><span /><span /><span /><img src="/images/bese26-logo-icon.png" alt="" /></div><strong>{label}</strong><small>Keeping your account secure</small><LoaderCircle size={16} className="auth-loading-spinner" /></div>; }
function MarketArt({ register = false }) {
  return <div className={`auth-market-art ${register ? 'auth-market-art-register' : ''}`} aria-hidden="true">
    {!register && <div className="auth-market-copy"><h2>Buy. Sell. <em>Connect.</em></h2><p>Real people. Real businesses.<br />Bigger opportunities across Nigeria.</p></div>}
    <div className="auth-market-red" />
    <div className="auth-market-car"><i /><i /></div><div className="auth-market-house"><i /><b /></div><div className="auth-market-bag" />
    <div className="auth-market-phone"><span className="auth-phone-notch" /><img className="auth-dashboard-screen" src="/images/auth-dashboard-home.png" alt="Bese26 dashboard" /></div>
    {register && <div className="auth-register-skyline"><i /><i /><i /><i /><i /><i /><i /></div>}
    {register && <div className="auth-register-wave" />}
  </div>;
}

export default function AuthPanel({ onClose, onAuthenticated, reason = '', initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'signin');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', displayName: '', username: '', phone: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Signing you in…');
  const [resetting, setResetting] = useState(false);
  const [registrationSent, setRegistrationSent] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({ login: false, register: false, confirm: false });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const switchMode = (nextMode) => { setMode(nextMode); setStatus({ type: '', message: '' }); setRegistrationSent(false); };
  const passwordValidation = form.password ? (form.password.length >= 6 ? 'valid' : 'invalid') : '';
  const confirmPasswordValidation = form.confirmPassword ? (form.confirmPassword === form.password && form.password.length >= 6 ? 'valid' : 'invalid') : '';
  const submit = async (event) => {
    event.preventDefault(); setStatus({ type: '', message: '' });
    if (mode === 'reset') return;
    if (form.password.length < 6) { setStatus({ type: 'error', message: 'Use a password with at least 6 characters.' }); return; }
    if (mode === 'signup' && form.password !== form.confirmPassword) { setStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
    if (mode === 'signup' && !termsAccepted) { setStatus({ type: 'error', message: 'Please agree to the Terms of Service and Privacy Policy.' }); return; }
    setLoading(true); setLoadingLabel(mode === 'signin' ? 'Signing you in…' : 'Creating your account…');
    try {
      const data = mode === 'signin' ? await signIn({ email: form.email, password: form.password }) : await signUp({ email: form.email, password: form.password, displayName: form.displayName, username: form.username, phone: form.phone });
      if (mode === 'signup') { setRegistrationSent(true); setStatus({ type: 'success', message: 'Registration complete. We sent a confirmation email to your inbox.' }); } else { onAuthenticated?.(data.user); onClose?.(); }
    } catch (error) { setStatus({ type: 'error', message: error.message || 'Authentication failed. Please try again.' }); } finally { setLoading(false); }
  };
  const resetPassword = async (event) => { event?.preventDefault(); setStatus({ type: '', message: '' }); if (!form.email.trim()) { setStatus({ type: 'error', message: 'Enter your email first.' }); return; } setResetting(true); try { await requestPasswordReset(form.email); setStatus({ type: 'success', message: 'Password reset instructions sent. Check your email.' }); } catch (error) { setStatus({ type: 'error', message: error.message || 'Could not send reset instructions.' }); } finally { setResetting(false); } };
  const resendConfirmation = async () => { setStatus({ type: '', message: '' }); setResendingConfirmation(true); try { await resendSignupConfirmation(form.email); setStatus({ type: 'success', message: 'Confirmation email sent again. Check your inbox.' }); } catch (error) { setStatus({ type: 'error', message: error.message || 'Could not resend the confirmation email.' }); } finally { setResendingConfirmation(false); } };
  const title = mode === 'signin' ? <>Welcome <em>back</em></> : mode === 'signup' ? <>Create your <em>account</em></> : <>Reset your <em>password</em></>;
  return <div className="auth-reference-backdrop" onClick={onClose}><section className={`auth-reference-app auth-reference-${mode}`} onClick={(event) => event.stopPropagation()} aria-labelledby="auth-title">
    <button type="button" className="auth-reference-close" onClick={onClose} aria-label="Close authentication"><X size={20} /></button>
    {mode !== 'signin' && <button type="button" className="auth-reference-back" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signin')} aria-label="Back to sign in"><ArrowLeft size={23} /></button>}
    {loading && <AuthLoading label={loadingLabel} />}
    <main className="auth-reference-screen">
      <BrandHeader />
      <section className="auth-reference-heading"><h1 id="auth-title">{title}</h1><p>{mode === 'signin' ? 'Sign in to continue to Bese26.' : mode === 'signup' ? <>Join Bese26 and start buying, selling<br />and connecting across Nigeria.</> : <>Enter your email to receive a secure<br />password reset link.</>}</p></section>
      {status.message && <div className={`auth-reference-status ${status.type}`}><span>{status.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}</span>{status.message}</div>}
      {mode === 'signin' && <>
        <form className="auth-reference-form" onSubmit={submit}>
          <Field icon={UserRound}><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Phone number or Email" autoComplete="email" required /></Field>
          <PasswordField id="loginPassword" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" visible={visiblePasswords.login} onToggle={() => setVisiblePasswords((v) => ({ ...v, login: !v.login }))} />
          <button type="button" className="auth-reference-forgot" onClick={() => switchMode('reset')}>Forgot password?</button>
          <button type="submit" className="auth-reference-primary" disabled={loading}><span>{loading ? 'Signing in…' : 'Sign In'}</span><ArrowRight size={23} /></button>
        </form>
        <div className="auth-reference-switch">New to Bese26? <button type="button" onClick={() => switchMode('signup')}>Create Account</button></div>
        <MarketArt />
      </>}
      {mode === 'signup' && <>
        {registrationSent ? <div className="auth-reference-confirm"><div className="auth-reference-confirm-icon"><Mail size={25} /></div><h2>Check your email</h2><p>We sent a confirmation link to <strong>{form.email}</strong>.</p><button type="button" className="auth-reference-primary" onClick={() => { window.location.href = 'mailto:'; }}><span>Go to email</span><ArrowRight size={23} /></button><button type="button" className="auth-reference-forgot" onClick={resendConfirmation} disabled={resendingConfirmation}>{resendingConfirmation ? 'Sending again…' : 'Resend email'}</button></div> : <form className="auth-reference-form auth-reference-signup-form" onSubmit={submit}>
          <Field icon={UserRound}><input type="text" value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Full Name" autoComplete="name" required /></Field>
          <Field icon={Phone}><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Phone Number" autoComplete="tel" required /><span className="auth-reference-prefix">🇳🇬 +234</span></Field>
          <Field icon={Mail}><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Email Address" autoComplete="email" required /></Field>
          <PasswordField id="registerPassword" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" visible={visiblePasswords.register} validationState={passwordValidation} onToggle={() => setVisiblePasswords((v) => ({ ...v, register: !v.register }))} />
          <PasswordField id="confirmPassword" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Confirm Password" visible={visiblePasswords.confirm} validationState={confirmPasswordValidation} onToggle={() => setVisiblePasswords((v) => ({ ...v, confirm: !v.confirm }))} />
          <label className="auth-reference-terms"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy.</b></span></label>
          <button type="submit" className="auth-reference-primary" disabled={loading}><span>{loading ? 'Please wait…' : 'Create Account'}</span><ArrowRight size={23} /></button>
        </form>}
        <div className="auth-reference-switch">Already have an account? <button type="button" onClick={() => switchMode('signin')}>Sign In</button></div><MarketArt register />
      </>}
      {mode === 'reset' && <>
        <div className="auth-reference-reset-art"><LockKeyhole size={53} /><span>••••</span></div>
        <form className="auth-reference-form" onSubmit={resetPassword}><Field icon={UserRound}><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Phone number or Email" autoComplete="email" required /></Field><button type="submit" className="auth-reference-primary" disabled={resetting}><span>{resetting ? 'Sending…' : 'Send Reset Link'}</span><ArrowRight size={23} /></button></form>
        <div className="auth-reference-security"><ShieldCheck size={22} /><div><strong>Secure password recovery</strong><p>We'll send a secure link to reset your password.</p></div></div><div className="auth-reference-switch">Remember your password? <button type="button" onClick={() => switchMode('signin')}>Sign In</button></div>
      </>}
    </main>
  </section></div>;
}
