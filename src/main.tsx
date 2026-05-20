import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ── Production log suppression ──────────────────────────────────────────────
// In production we strip console.log / warn to avoid leaking internal info.
// console.error is kept so runtime crashes surface in Sentry / error trackers.
if (!import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log = () => {};
  // eslint-disable-next-line no-console
  console.warn = () => {};
  // console.error intentionally NOT silenced — needed by Stripe, PayPal SDKs
  //   and error-reporting tools (Sentry, etc.)
}

// ── Clear legacy localStorage keys ─────────────────────────────────────────
if (typeof window !== 'undefined') {
  const oldKeys = [
    'ritmolatino-site-config',
    'bailanow-site-config-v1',
  ];
  oldKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
