import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LandingPage } from './components/LandingPage/LandingPage'
import App from './App'
import './index.css'
import './transitions.css'
import { setupWikiInterceptor } from './services/wiki/wikiInterceptor'

// Detecta se a rota atual é para jogar no VTT ou para ver a Landing Page
const params = new URLSearchParams(window.location.search);
const isVttRoute = 
  window.location.pathname.includes('vtt') || 
  params.has('room') || 
  params.has('join') || 
  params.has('widget');

if (isVttRoute) {
  setupWikiInterceptor();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LandingPage />
    </StrictMode>
  );
}
