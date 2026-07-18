import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupWikiInterceptor } from './services/wiki/wikiInterceptor';

// No Vercel, intercepta as chamadas locais da API para ler os arquivos .md bundlados
setupWikiInterceptor();

createRoot(document.getElementById('root')!).render(
  <App />
)
