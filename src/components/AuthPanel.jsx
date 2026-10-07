import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, LoaderCircle, Mail, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { sendEmailOtp, sendPasswordResetOtp, signIn, signUp, updatePassword, verifyEmailOtp } from '../lib/marketplace';

function BrandHeader() {
  return <div className="auth-reference-brand"><div className="auth-reference-logo"><img src="/images/bese26-logo-icon.webp" alt="Bese26" /></div></div>;
}
function Field({ icon: Icon, children, className = '' }) { return <div className={`auth-reference-field ${className}`}><span className="auth-reference-field-icon"><Icon size={18} /></span>{children}</div>; }
function PasswordField({ id, value, onChange, placeholder, visible, onToggle, validationState = '' }) {
  return <Field icon={LockKeyhole} className={validationState ? `auth-reference-field-${validationState}` : ''}><input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={id === 'loginPassword' ? 'current-password' : 'new-password'} required />{validationState && <span className="auth-reference-password-status" aria-label={validationState === 'valid' ? 'Password is valid' : 'Passwords do not match'}>{validationState === 'valid' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}</span>}<button type="button" className={`auth-reference-eye ${visible ? 'is-visible' : ''}`} onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></Field>;
}
function AuthLoading({ label }) { return <div className="auth-loading-overlay" role="status" aria-live="polite"><div className="auth-loading-orbit"><span /><span /><span /><img src="/images/bese26-logo-icon.webp" alt="" /></div><strong>{label}</strong><small>Keeping your account secure</small><LoaderCircle size={16} className="auth-loading-spinner" /></div>; }
function normalizeNigerianPhone(value) {
  const digits = String(value || '').replace(/[\s()-]/g, '');
  if (digits.startsWith('+234')) return `+234${digits.slice(4)}`;
  if (digits.startsWith('234')) return `+${digits}`;
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`;
  return digits;
}
function isNigerianPhone(value) { return /^\+234[789]\d{9}$/.test(normalizeNigerianPhone(value)); }
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim()); }
function friendlyAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('already') || message.includes('registered') || message.includes('user already')) return 'This email already has an account. Please sign in or use Forgot password.';
  if (message.includes('invalid login') || message.includes('invalid credentials') || message.includes('email or password')) return 'Email or password is not correct. Please try again.';
  if (message.includes('phone_already_registered')) return 'This phone number is already linked to a Bese26 account. Please sign in with it or use another number.';
  if (message.includes('new password should be different') || message.includes('same password') || message.includes('password should be different')) return 'Sabon password ɗin dole ya bambanta da tsohon password. Zaɓi wani password daban.';
  if (message.includes('rate limit') || message.includes('too many')) return 'Too many attempts. Please wait a little and try again.';
  if (message.includes('confirm')) return 'Please confirm your email before signing in.';
  return error?.message || 'Authentication failed. Please try again.';
}
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
  const [mode, setMode] = useState(['signup', 'recovery'].includes(initialMode) ? initialMode : 'signin');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', displayName: '', username: '', phone: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Signing you in…');
  const [resetting, setResetting] = useState(false);
  const [registrationSent, setRegistrationSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [visiblePasswords, setVisiblePasswords] = useState({ login: false, register: false, confirm: false });
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpVerifying, setResetOtpVerifying] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const switchMode = (nextMode) => { setMode(nextMode); setStatus({ type: '', message: '' }); setRegistrationSent(false); setPasswordUpdated(false); setResetOtpSent(false); setResetOtp(''); };
  const passwordValidation = form.password ? (form.password.length >= 6 ? 'valid' : 'invalid') : '';
  const confirmPasswordValidation = form.confirmPassword ? (form.confirmPassword === form.password && form.password.length >= 6 ? 'valid' : 'invalid') : '';
  const submit = async (event) => {
    event.preventDefault(); setStatus({ type: '', message: '' });
    if (mode === 'reset') return;
    if (mode === 'recovery') {
      if (form.password.length < 6) { setStatus({ type: 'error', message: 'Use a password with at least 6 characters.' }); return; }
      if (form.password !== form.confirmPassword) { setStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
      setLoading(true); setLoadingLabel('Updating your password…');
      try { await updatePassword(form.password); setPasswordUpdated(true); setStatus({ type: 'success', message: 'Your password has been updated securely.' }); setForm((current) => ({ ...current, password: '', confirmPassword: '' })); }
      catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (message.includes('new password should be different') || message.includes('same password') || message.includes('password should be different')) {
          setPasswordUpdated(true);
          setStatus({ type: 'success', message: 'Wannan shi ne password ɗinka na yanzu. Za ka iya ci gaba da shiga da shi.' });
        } else setStatus({ type: 'error', message: friendlyAuthError(error) });
      }
      finally { setLoading(false); }
      return;
    }
    if (mode === 'signin' && lockedUntil > Date.now()) { setStatus({ type: 'error', message: 'Too many attempts. Please wait 30 seconds and try again.' }); return; }
    if (mode === 'signin' && !isEmail(form.email) && !isNigerianPhone(form.email)) { setStatus({ type: 'error', message: 'Enter a valid email address or Nigerian phone number.' }); return; }
    if (mode !== 'signin' && !isEmail(form.email)) { setStatus({ type: 'error', message: 'Enter a valid email address.' }); return; }
    if (form.password.length < 6) { setStatus({ type: 'error', message: 'Use a password with at least 6 characters.' }); return; }
    if (mode === 'signup' && !isNigerianPhone(form.phone)) { setStatus({ type: 'error', message: 'Enter a valid Nigerian phone number, for example 08012345678.' }); return; }
    if (mode === 'signup' && form.password !== form.confirmPassword) { setStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
    if (mode === 'signup' && !termsAccepted) { setStatus({ type: 'error', message: 'Please agree to the Terms of Service and Privacy Policy.' }); return; }
    setLoading(true); setLoadingLabel(mode === 'signin' ? 'Signing you in…' : 'Creating your account…');
    try {
      const data = mode === 'signin' ? await signIn({ identifier: form.email.trim(), password: form.password }) : await signUp({ email: form.email.trim().toLowerCase(), password: form.password, displayName: form.displayName, username: form.username, phone: normalizeNigerianPhone(form.phone) });
      if (mode === 'signup') { await sendEmailOtp(form.email.trim().toLowerCase()); setRegistrationSent(true); setStatus({ type: 'success', message: 'Mun aika lambar tabbatarwa mai digits 6 zuwa email ɗinka.' }); } else { setLoginAttempts(0); onAuthenticated?.(data.user); onClose?.(); }
    } catch (error) { if (mode === 'signin') { const nextAttempts = loginAttempts + 1; setLoginAttempts(nextAttempts); if (nextAttempts >= 5) setLockedUntil(Date.now() + 30000); } setStatus({ type: 'error', message: friendlyAuthError(error) }); } finally { setLoading(false); }
  };
  const resetPassword = async (event) => { event?.preventDefault(); setStatus({ type: '', message: '' }); if (!isEmail(form.email)) { setStatus({ type: 'error', message: 'Enter a valid email address.' }); return; } setResetting(true); try { await sendPasswordResetOtp(form.email); setResetOtpSent(true); setResetOtp(''); setStatus({ type: 'success', message: 'Mun aika OTP mai digits 6 zuwa email ɗinka.' }); } catch (error) { setStatus({ type: 'error', message: friendlyAuthError(error) }); } finally { setResetting(false); } };
  const verifyResetOtp = async (event) => { event?.preventDefault(); setStatus({ type: '', message: '' }); const code = resetOtp.replace(/\D/g, ''); if (!/^\d{6}$/.test(code)) { setStatus({ type: 'error', message: 'Shigar da lambar OTP mai digits 6.' }); return; } setResetOtpVerifying(true); try { await verifyEmailOtp({ email: form.email, token: code, type: 'email' }); setMode('recovery'); setStatus({ type: 'success', message: 'An tabbatar da OTP. Yanzu saka sabon password.' }); } catch (error) { setStatus({ type: 'error', message: friendlyAuthError(error) }); } finally { setResetOtpVerifying(false); } };
  const resendConfirmation = async () => { setStatus({ type: '', message: '' }); setResendingConfirmation(true); try { await sendEmailOtp(form.email); setStatus({ type: 'success', message: 'Sabuwar lambar OTP ta tafi zuwa email ɗinka.' }); } catch (error) { setStatus({ type: 'error', message: error.message || 'Could not resend the OTP.' }); } finally { setResendingConfirmation(false); } };
  const confirmSignupOtp = async (event) => { event.preventDefault(); setStatus({ type: '', message: '' }); if (!/^\d{6}$/.test(otp.trim())) { setStatus({ type: 'error', message: 'Shigar da lambar OTP mai digits 6.' }); return; } setLoading(true); setLoadingLabel('Confirming your email…'); try { const data = await verifyEmailOtp({ email: form.email, token: otp }); setStatus({ type: 'success', message: 'An tabbatar da email ɗinka. Barka da zuwa Bese26.' }); onAuthenticated?.(data.user); onClose?.(); } catch (error) { setStatus({ type: 'error', message: friendlyAuthError(error) }); } finally { setLoading(false); } };
  const title = mode === 'signin' ? <>Welcome <em>back</em></> : mode === 'signup' ? <>Create your <em>account</em></> : mode === 'recovery' ? <>Choose a new <em>password</em></> : <>Reset your <em>password</em></>;
  return <div className="auth-reference-backdrop" onClick={onClose}><section className={`auth-reference-app auth-reference-${mode}`} onClick={(event) => event.stopPropagation()} aria-labelledby="auth-title">
    <button type="button" className="auth-reference-close" onClick={onClose} aria-label="Close authentication"><X size={20} /></button>
    {mode !== 'signin' && <button type="button" className="auth-reference-back" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signin')} aria-label="Back to sign in"><ArrowLeft size={23} /></button>}
    {loading && <AuthLoading label={loadingLabel} />}
    <main className="auth-reference-screen">
      <BrandHeader />
      <section className="auth-reference-heading"><h1 id="auth-title">{title}</h1><p>{mode === 'signin' ? 'Sign in to continue to Bese26.' : mode === 'signup' ? <>Join Bese26 and start buying, selling<br />and connecting across Nigeria.</> : mode === 'recovery' ? 'Create a new password for your Bese26 account.' : <>Enter your email to receive a secure<br />password reset link.</>}</p></section>
      {status.message && <div className={`auth-reference-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}><span>{status.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}</span>{status.message}</div>}
      {mode === 'signin' && <>
        <form className="auth-reference-form" onSubmit={submit}>
          <Field icon={UserRound}><input type="text" inputMode="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Phone number or Email" autoComplete="username" required /></Field>
          <PasswordField id="loginPassword" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" visible={visiblePasswords.login} onToggle={() => setVisiblePasswords((v) => ({ ...v, login: !v.login }))} />
          <button type="button" className="auth-reference-forgot" onClick={() => switchMode('reset')}>Forgot password?</button>
          <button type="submit" className="auth-reference-primary" disabled={loading}><span>{loading ? 'Signing in…' : 'Sign In'}</span><ArrowRight size={23} /></button>
        </form>
        <div className="auth-reference-switch">New to Bese26? <button type="button" onClick={() => switchMode('signup')}>Create Account</button></div><div className="auth-reference-trust"><ShieldCheck size={14} /> Secure authentication for your Bese26 account</div>
        <MarketArt />
      </>}
      {mode === 'signup' && <>
        {registrationSent ? <div className="auth-reference-confirm"><div className="auth-reference-confirm-icon"><Mail size={25} /></div><h2>Confirm your email</h2><p>Mun aika OTP mai digits 6 zuwa <strong>{form.email}</strong>.</p><form className="auth-otp-form" onSubmit={confirmSignupOtp}><Field icon={ShieldCheck}><input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter 6-digit OTP" maxLength={6} required /></Field><button type="submit" className="auth-reference-primary" disabled={loading}><span>{loading ? 'Confirming…' : 'Confirm email'}</span><ArrowRight size={23} /></button></form><button type="button" className="auth-reference-forgot" onClick={resendConfirmation} disabled={resendingConfirmation}>{resendingConfirmation ? 'Sending again…' : 'Resend OTP'}</button></div> : <form className="auth-reference-form auth-reference-signup-form" onSubmit={submit}>
          <Field icon={UserRound}><input type="text" value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Full Name" autoComplete="name" required /></Field>
          <Field icon={Phone}><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Phone Number" autoComplete="tel" required /><span className="auth-reference-prefix">🇳🇬 +234</span></Field>
          <Field icon={Mail}><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Email Address" autoComplete="email" required /></Field>
          <PasswordField id="registerPassword" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" visible={visiblePasswords.register} validationState={passwordValidation} onToggle={() => setVisiblePasswords((v) => ({ ...v, register: !v.register }))} />
          <PasswordField id="confirmPassword" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Confirm Password" visible={visiblePasswords.confirm} validationState={confirmPasswordValidation} onToggle={() => setVisiblePasswords((v) => ({ ...v, confirm: !v.confirm }))} />
          <label className="auth-reference-terms"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy.</b></span></label>
          <button type="submit" className="auth-reference-primary" disabled={loading}><span>{loading ? 'Please wait…' : 'Create Account'}</span><ArrowRight size={23} /></button>
        </form>}
        <div className="auth-reference-switch">Already have an account? <button type="button" onClick={() => switchMode('signin')}>Sign In</button></div><div className="auth-reference-trust"><ShieldCheck size={14} /> Your information is protected with secure authentication</div><MarketArt register />
      </>}
      {mode === 'reset' && <>
        <div className="auth-reference-reset-art"><LockKeyhole size={53} /><span>••••</span></div>
        {!resetOtpSent ? <form className="auth-reference-form" onSubmit={resetPassword}><Field icon={UserRound}><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Email address" autoComplete="email" required /></Field><button type="submit" className="auth-reference-primary" disabled={resetting}><span>{resetting ? 'Sending OTP…' : 'Send OTP'}</span><ArrowRight size={23} /></button></form> : <div className="auth-reference-confirm"><div className="auth-reference-confirm-icon"><Mail size={25} /></div><h2>Enter your reset code</h2><p>Mun aika OTP mai digits 6 zuwa <strong>{form.email}</strong>.</p><form className="auth-otp-form" onSubmit={verifyResetOtp}><Field icon={ShieldCheck}><input value={resetOtp} onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="Enter 6-digit OTP" maxLength={6} required /></Field><button type="submit" className="auth-reference-primary" disabled={resetOtpVerifying}><span>{resetOtpVerifying ? 'Verifying…' : 'Verify OTP'}</span><ArrowRight size={23} /></button></form><button type="button" className="auth-reference-forgot" onClick={resetPassword} disabled={resetting}>{resetting ? 'Sending again…' : 'Resend OTP'}</button></div>}
        <div className="auth-reference-security"><ShieldCheck size={22} /><div><strong>Secure password recovery</strong><p>We will send a 6-digit OTP. No reset link or external page is required.</p></div></div><div className="auth-reference-switch">Remember your password? <button type="button" onClick={() => switchMode('signin')}>Sign In</button></div>
      </>}
      {mode === 'recovery' && <>
        {passwordUpdated ? <div className="auth-reference-confirm"><div className="auth-reference-confirm-icon"><CheckCircle2 size={25} /></div><h2>Password ready</h2><p>{status.message || 'Your password is ready. You can continue to Bese26.'}</p><button type="button" className="auth-reference-primary" onClick={onClose}><span>Continue to Bese26</span><ArrowRight size={23} /></button></div> : <form className="auth-reference-form" onSubmit={submit}><PasswordField id="recoveryPassword" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="New password" visible={visiblePasswords.register} validationState={passwordValidation} onToggle={() => setVisiblePasswords((v) => ({ ...v, register: !v.register }))} /><PasswordField id="recoveryConfirmPassword" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} placeholder="Confirm new password" visible={visiblePasswords.confirm} validationState={confirmPasswordValidation} onToggle={() => setVisiblePasswords((v) => ({ ...v, confirm: !v.confirm }))} /><button type="submit" className="auth-reference-primary" disabled={loading}><span>{loading ? 'Updating…' : 'Update password'}</span><ArrowRight size={23} /></button></form>}
        <div className="auth-reference-security"><ShieldCheck size={22} /><div><strong>Secure password recovery</strong><p>Use at least 6 characters and do not share your password.</p></div></div>
      </>}
    </main>
  </section></div>;
}
