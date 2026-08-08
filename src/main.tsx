import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LandingPage } from './components/LandingPage/LandingPage'
import { setupWikiInterceptor } from './services/wiki/wikiInterceptor';
import * as Sentry from "@sentry/react";
import { reportWebVitals } from './services/analytics';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

// No Vercel, intercepta as chamadas locais da API para ler os arquivos .md bundlados
setupWikiInterceptor();

function RootRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    // Detect invite link parameters (like ?room=... or widget popouts)
    const params = new URLSearchParams(window.location.search);
    if (params.has('room') || params.has('join') || params.has('widget')) {
      navigate('/vtt' + window.location.search, { replace: true });
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/vtt" element={<App />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <RootRouter />
  </BrowserRouter>
)

reportWebVitals();
