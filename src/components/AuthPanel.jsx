import { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, LoaderCircle, Mail, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { requestPasswordReset, resendSignupConfirmation, signIn, signUp, updatePassword } from '../lib/marketplace';


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
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [visiblePasswords, setVisiblePasswords] = useState({ login: false, register: false, confirm: false });
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const switchMode = (nextMode) => { setMode(nextMode); setStatus({ type: '', message: '' }); setRegistrationSent(false); setPasswordUpdated(false); };
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
