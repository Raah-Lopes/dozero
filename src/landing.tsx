import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LandingPage } from './components/LandingPage/LandingPage'
import './components/LandingPage/landing-tailwind.css'

// Redirect to VTT if there are invite parameters
const params = new URLSearchParams(window.location.search);
if (params.has('room') || params.has('join') || params.has('widget')) {
    window.location.replace('/vtt.html' + window.location.search);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>
)
