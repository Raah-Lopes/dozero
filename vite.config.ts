import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { wikiLocalApi } from './vite-plugins/wiki-api'
import { youtubeLocalApi } from './vite-plugins/youtube-api'
import { pollinationsProxy } from './vite-plugins/pollinations-proxy'
import { yjsWebsocketServer } from './vite-plugins/yjs-server'
import os from 'os'

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wikiLocalApi(), youtubeLocalApi(), pollinationsProxy(), yjsWebsocketServer()],
  server: {
    host: true, // Always expose to network
    port: 5174,
    strictPort: true, // Force it to use 5174, so we bypass any old Service Workers on 5173
  },
  define: {
    'import.meta.env.VITE_LOCAL_IP': JSON.stringify(getLocalIP())
  }
})
