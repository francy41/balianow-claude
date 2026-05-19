import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Clear only legacy config keys. Never wipe the current auth store on boot.
if (typeof window !== 'undefined') {
  const oldKeys = [
    'ritmolatino-site-config',
    'bailanow-site-config-v1',
  ];

  oldKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      console.log(`Clearing old localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
