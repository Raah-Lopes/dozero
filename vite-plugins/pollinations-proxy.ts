import type { Plugin } from 'vite';

/**
 * Plugin Vite dedicado para servir como proxy para a API do Pollinations AI.
 * Resolve o bloqueio de CORS que impede chamadas diretas do navegador.
 */
export function pollinationsProxy(): Plugin {
  return {
    name: 'pollinations-proxy',
    configureServer(server) {
      console.log('[pollinationsProxy] Proxy do Pollinations AI montado!');

      // Use returned function so middleware runs BEFORE Vite's built-in middleware
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/pollinations')) return next();

          console.log(`[pollinationsProxy] ${req.method} ${req.url}`);

          // Handle CORS preflight
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'OPTIONS, POST',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          // Read request body
          let bodyStr = '';
          for await (const chunk of req) {
            bodyStr += chunk;
          }

          try {
            const targetUrl = 'https://text.pollinations.ai/openai';
            const fetchRes = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              },
              body: bodyStr,
            });

            const responseData = await fetchRes.text();
            console.log(`[pollinationsProxy] Resposta: ${fetchRes.status}`);

            res.writeHead(fetchRes.status, {
              'Content-Type': fetchRes.headers.get('content-type') || 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(responseData);
          } catch (e: any) {
            console.error('[pollinationsProxy] Erro:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to proxy: ' + e.message }));
          }
        });
      };
    },
  };
}
