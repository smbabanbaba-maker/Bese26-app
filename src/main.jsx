import { SITE_URL } from './lib/site';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import BusinessLogoPreview from './components/BusinessLogoPreview';
import { registerBese26ServiceWorker } from './components/InstallPrompt';
import { supabase } from './lib/supabase';
import './styles.css';
import './ui-enhancements.css';
import './public-storefront.css';

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <>
        <App />
        <BusinessLogoPreview />
      </>
    </React.StrictMode>,
  );
}

function mountConfirmationPage() {
  const root = document.getElementById('root');
  root.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff;color:#111;font-family:Arial,sans-serif;text-align:center"><section><img src="/images/bese26-logo-icon.webp" alt="Bese26" width="64" height="64" style="border-radius:16px"><h1 style="margin:20px 0 8px">Confirming your email…</h1><p id="confirmation-status" style="color:#666">Please wait while we activate your Bese26 account.</p></section></main>';
  const status = document.getElementById('confirmation-status');
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const code = params.get('code');
  const type = params.get('type') || 'signup';
  if (!supabase || (!tokenHash && !code)) {
    status.textContent = 'This confirmation link is missing or invalid. Please request a new email.';
    return;
  }
  const confirmation = code
    ? supabase.auth.exchangeCodeForSession(code)
    : supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  confirmation.then(({ error }) => {
    if (error) throw error;
    status.textContent = 'Email confirmed. Opening Bese26…';
    window.history.replaceState({}, '', '/');
    window.setTimeout(mountApp, 350);
  }).catch(() => {
    status.textContent = 'This confirmation link has expired or was already used. Please request a new email.';
  });
}

const isVercelHost = typeof window !== 'undefined' && /(^|\.)vercel\.app$/i.test(window.location.hostname);
if (isVercelHost) {
  const destination = SITE_URL + window.location.pathname + window.location.search + window.location.hash;
  window.location.replace(destination);
} else {
  if (window.location.pathname === '/auth/confirm') mountConfirmationPage();
  else mountApp();
}

registerBese26ServiceWorker();
