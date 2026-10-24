import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupPWA } from './pwa'
import { watchSafeBottom } from './lib/safeArea'

setupPWA()
watchSafeBottom()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
