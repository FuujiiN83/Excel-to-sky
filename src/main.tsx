import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { injectAdsense } from './lib/adsense'
import { SettingsProvider } from './lib/SettingsContext'
import './index.css'

injectAdsense()

// Register the offline-shell service worker (#178). Only in production so dev
// HMR doesn't fight the cache. Best-effort — failures here never block the UI.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
)
