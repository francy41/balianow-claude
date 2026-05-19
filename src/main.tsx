import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ── MIGRATION: Clear old localStorage keys ─────────────────────────────────
if (typeof window !== 'undefined') {
  const oldKeys = [
    'ritmolatino-site-config',
    'ritmolatino-auth',
    'bailanow-site-config-v1', // previous version
  ];
  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ Clearing old localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// Trigger redeploy
// Netlify rebuild trigger Tue May 19 01:16:18     2026
