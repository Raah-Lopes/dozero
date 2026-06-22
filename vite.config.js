import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wikiLocalApi } from './vite-plugins/wiki-api';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), wikiLocalApi()],
    server: {
        port: 5174,
        strictPort: true, // Force it to use 5174, so we bypass any old Service Workers on 5173
    }
});
