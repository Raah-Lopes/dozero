/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { wikiLocalApi } from './vite-plugins/wiki-api'
import { youtubeLocalApi } from './vite-plugins/youtube-api'
import { pollinationsProxy } from './vite-plugins/pollinations-proxy'
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
  base: process.env.BASE_PATH || './',
  plugins: [
    tailwindcss(),
    react(), 
    wikiLocalApi(), 
    youtubeLocalApi(), 
    pollinationsProxy(),
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
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'lucide-react',
      'zustand',
      'yjs',
      'idb-keyval',
      'qrcode.react',
      '@dice-roller/rpg-dice-roller'
    ]
  },
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
            if (id.includes('@mdxeditor') || id.includes('lexical')) return 'vendor-editor';
            if (id.includes('mermaid')) return 'vendor-mermaid';
            if (id.includes('d3') || id.includes('@xyflow')) return 'vendor-graph';
            if (id.includes('yjs') || id.includes('y-websocket') || id.includes('y-indexeddb') || id.includes('y-partykit') || id.includes('y-webrtc')) return 'vendor-sync';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@dice-roller')) return 'vendor-dice';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            return 'vendor-core'; // remaining light utilities
          }
        }
      }
    }
  },
  server: {
    host: true, // Always expose to network
    port: 5174,
    strictPort: true, // Force it to use 5174, so we bypass any old Service Workers on 5173
    watch: {
      ignored: [
        '**/wikidozero/**',
        '**/template_wiki/**',
        '**/ANEXOS/**',
        '**/MapasMentais/**',
        '**/*.md',
        '**/stats.html',
        '**/.agents/**',
        '**/.archive/**',
        '**/dist/**',
        '**/*.bat',
        '**/docs/**',
        '**/signaling-server/**',
      ],
    },
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
