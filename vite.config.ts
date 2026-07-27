/// <reference types="vitest" />
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pixi.js') || id.includes('@pixi')) return 'vendor-canvas';
            if (id.includes('@google/generative-ai')) return 'vendor-ai';
            if (id.includes('@mdxeditor')) return 'vendor-editor';
            if (id.includes('mermaid') || id.includes('d3')) return 'vendor-charts';
            if (id.includes('yjs')) return 'vendor-sync';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            return 'vendor-core'; // everything else in node_modules goes here
          }
        }
      }
    }
  },
  server: {
    host: true, // Always expose to network
    port: 5174,
    strictPort: true, // Force it to use 5174, so we bypass any old Service Workers on 5173
    allowedHosts: true, // true desativa o bloqueio de Host no Vite (permite qualquer túnel)
  },
  define: {
    'import.meta.env.VITE_LOCAL_IP': JSON.stringify(getLocalIP())
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts']
  }
})
// Ponytail: Forçando restart do servidor Vite para limpar o cache de import-analysis de qrcode.react
