import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

reportWebVitals();
