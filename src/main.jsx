import { SITE_URL } from './lib/site';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import BusinessLogoPreview from './components/BusinessLogoPreview';
import { registerBese26ServiceWorker } from './components/InstallPrompt';
import './styles.css';
import './ui-enhancements.css';

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

const isVercelHost = typeof window !== 'undefined' && /(^|\.)vercel\.app$/i.test(window.location.hostname);
if (isVercelHost) {
  const destination = `${SITE_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(destination);
} else {
  mountApp();
}

registerBese26ServiceWorker();
