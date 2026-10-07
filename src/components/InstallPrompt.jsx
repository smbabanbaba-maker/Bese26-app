import { useEffect, useState } from 'react';
import { Download, MoreVertical, Share, X } from 'lucide-react';

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
    let mounted = true;
    const iosDevice = isIos();
    setIos(iosDevice);
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      if (!mounted) return;
      setDeferredPrompt(event);
      setShow(true);
    };
    const handleAppInstalled = () => {
      if (!mounted) return;
      setShow(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    // Keep the install invitation visible for every browser visitor. Some browsers
    // do not expose beforeinstallprompt, so they receive manual install guidance.
    const timer = window.setTimeout(() => mounted && setShow(true), 1200);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const close = () => setShow(false);
  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };
  if (!show || isStandalone()) return null;
  return (
    <aside className="install-prompt" role="dialog" aria-live="polite" aria-label="Install Bese26">
      <button type="button" className="install-prompt-close" onClick={close} aria-label="Close install message"><X size={17} /></button>
      <div className="install-prompt-icon"><Download size={20} /></div>
      <div className="install-prompt-copy">
        <strong>Install Bese26 on your phone</strong>
        {ios ? <p>Tap <Share size={14} /> Share, then choose <b>Add to Home Screen</b>.</p> : deferredPrompt ? <p>Install the app for faster access, alerts and a clean phone experience.</p> : <p>Tap <MoreVertical size={14} /> in your browser, then choose <b>Install app</b> or <b>Add to Home screen</b>.</p>}
      </div>
      {!ios && deferredPrompt && <button type="button" className="primary-button install-prompt-action" onClick={install}>Install now</button>}
    </aside>
  );
}

export function registerBese26ServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update().catch(() => {}))
        .catch(() => {});
    }, { once: true });
  }
}
