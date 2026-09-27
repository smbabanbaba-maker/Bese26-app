import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerBese26ServiceWorker } from './components/InstallPrompt';
import './styles.css';
import './ui-enhancements.css';

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

const appStyles = document.querySelector('link[data-bese26-app-css]');
if (appStyles && appStyles.media !== 'all') {
  let mounted = false;
  const mountWhenReady = () => {
    if (mounted) return;
    mounted = true;
    window.clearTimeout(styleFallback);
    mountApp();
  };
  const styleFallback = window.setTimeout(mountWhenReady, 5000);
  document.addEventListener('bese26:styles-ready', mountWhenReady, { once: true });
} else {
  mountApp();
}

registerBese26ServiceWorker();
