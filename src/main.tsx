import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LiveKitWrapper } from './services/livekit/LiveKitWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveKitWrapper>
      <App />
    </LiveKitWrapper>
  </StrictMode>,
)
