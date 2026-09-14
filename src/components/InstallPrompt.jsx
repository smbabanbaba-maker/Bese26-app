import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'bese26:install-prompt-dismissed';

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(DISMISS_KEY) === 'true'; } catch {}
    if (dismissed) return undefined;

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShow(true);
    };
    const handleAppInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIos()) {
      setIos(true);
      setShow(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { window.localStorage.setItem(DISMISS_KEY, 'true'); } catch {}
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;
  return (
    <aside className="install-prompt" role="dialog" aria-label="Install Bese26">
      <button type="button" className="install-prompt-close" onClick={dismiss} aria-label="Close install message"><X size={17} /></button>
      <div className="install-prompt-icon"><Download size={20} /></div>
      <div className="install-prompt-copy">
        <strong>Install Bese26</strong>
        {ios ? <p>Tap <Share size={14} /> Share, then choose <b>Add to Home Screen</b>.</p> : <p>Get faster access from your phone home screen.</p>}
      </div>
      {!ios && deferredPrompt && <button type="button" className="primary-button install-prompt-action" onClick={install}>Install</button>}
    </aside>
  );
}

export function registerBese26ServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true });
  }
}
