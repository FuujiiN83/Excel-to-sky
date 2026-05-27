import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { injectAdsense } from './lib/adsense'
import { SettingsProvider } from './lib/SettingsContext'
import './index.css'

injectAdsense()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
)
