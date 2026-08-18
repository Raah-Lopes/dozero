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

import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    wikiLocalApi(), 
    youtubeLocalApi(), 
    pollinationsProxy(), 
    yjsWebsocketServer(),
    visualizer({ open: false, filename: 'stats.html' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Dozero RPG Virtual Tabletop',
        short_name: 'Dozero',
        description: 'Plataforma colaborativa para RPG de mesa com IA',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        vtt: 'vtt.html'
      },
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
    setupFiles: ['./vitest.setup.ts']
  }
})
// Ponytail: Forçando restart do servidor Vite para limpar o cache de import-analysis de qrcode.react
