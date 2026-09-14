import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerBese26ServiceWorker } from './components/InstallPrompt';
import './styles.css';
import './ui-enhancements.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
registerBese26ServiceWorker();
