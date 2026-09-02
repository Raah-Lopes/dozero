import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './transitions.css'
import App from './App.tsx'
import { setupWikiInterceptor } from './services/wiki/wikiInterceptor';
import * as Sentry from "@sentry/react";
import { reportWebVitals } from './services/analytics';

import { ErrorBoundary } from './components/UI/ErrorBoundary';

async function recoverDozeroClientState() {
  try {
    sessionStorage.removeItem('dozero_cloud_cooldown_until');
    sessionStorage.removeItem('dozero_admin_redirect');

    // Mantém sb-* (sessão Supabase) e preferências do usuário; remove apenas
    // snapshots/cache transitório que pode sobreviver a uma publicação.
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && (
        key.startsWith('dozero_room_snapshot_') ||
        key.startsWith('dozero_snapshot_') ||
        key.startsWith('dozero_theater_state_') ||
        key === 'story_dice_history'
      )) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
  } catch {
    // A recuperação é best-effort: a mesa continua utilizável mesmo se uma
    // camada de armazenamento estiver indisponível.
  }
}

const currentUrl = new URL(window.location.href);
if (currentUrl.searchParams.get('recover') === '1') {
  void recoverDozeroClientState().finally(() => {
    currentUrl.searchParams.delete('recover');
    window.location.replace(currentUrl.toString());
  });
}

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });

  // Remove o worker legado das versões que eram PWA. A produção passa a
  // buscar os assets da implantação atual, evitando mismatch de preload.
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then(registrations =>
      Promise.all(registrations.map(registration => registration.unregister()))
    );
  }
}

// No Vercel, intercepta as chamadas locais da API para ler os arquivos .md bundlados
setupWikiInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary componentName="Aplicação Principal">
      <App />
    </ErrorBoundary>
  </StrictMode>
)

reportWebVitals();
