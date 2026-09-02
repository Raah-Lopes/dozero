import type { Plugin } from 'vite';

const SUPABASE_URL = 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const HEADER_NAMES = ['accept', 'accept-profile', 'apikey', 'authorization', 'content-type', 'prefer', 'range', 'range-unit', 'x-client-info'];
const STORAGE_HEADER_NAMES = ['accept', 'apikey', 'authorization', 'content-type', 'cache-control', 'x-client-info', 'x-upsert'];

export function supabaseRestProxy(): Plugin {
  return {
    name: 'supabase-rest-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        if (requestUrl.pathname !== '/data-api') return next();
        if (requestUrl.searchParams.get('health') === 'true') {
          res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
          res.end(JSON.stringify({ status: 'ok', service: 'dozero-data-api', version: 1, configured: true }));
          return;
        }
        const resource = requestUrl.searchParams.get('path');
        if (!resource || !/^[a-z_]+(?:\/[a-z_]+)?$/i.test(resource)) { res.writeHead(400); res.end('Invalid API resource'); return; }
        const target = new URL(`/rest/v1/${resource}`, SUPABASE_URL);
        requestUrl.searchParams.forEach((value, key) => { if (key !== 'path') target.searchParams.append(key, value); });
        const headers = new Headers();
        HEADER_NAMES.forEach(name => { const value = req.headers[name]; if (typeof value === 'string') headers.set(name, value); });
        let body: Buffer | undefined;
        if (!['GET', 'HEAD'].includes(req.method || 'GET')) { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); body = Buffer.concat(chunks); }
        try {
          const response = await fetch(target, { method: req.method, headers, body });
          res.writeHead(response.status, Object.fromEntries(['content-type', 'content-range', 'range-unit', 'preference-applied'].flatMap(name => { const value = response.headers.get(name); return value ? [[name, value]] : []; })));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch { res.writeHead(503); res.end('Data service temporarily unavailable'); }
      });
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');
        if (requestUrl.pathname !== '/storage-api') return next();
        const resource = requestUrl.searchParams.get('path');
        if (!resource || !resource.startsWith('object/') || resource.includes('..') || !/^[a-zA-Z0-9_./-]+$/.test(resource)) { res.writeHead(400); res.end('Invalid storage resource'); return; }
        const target = new URL(`/storage/v1/${resource}`, SUPABASE_URL);
        requestUrl.searchParams.forEach((value, key) => { if (key !== 'path') target.searchParams.append(key, value); });
        const headers = new Headers();
        STORAGE_HEADER_NAMES.forEach(name => { const value = req.headers[name]; if (typeof value === 'string') headers.set(name, value); });
        let body: Buffer | undefined;
        if (!['GET', 'HEAD'].includes(req.method || 'GET')) { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); body = Buffer.concat(chunks); }
        try {
          const response = await fetch(target, { method: req.method, headers, body });
          res.writeHead(response.status, Object.fromEntries(['content-type', 'content-length', 'etag', 'last-modified', 'cache-control'].flatMap(name => { const value = response.headers.get(name); return value ? [[name, value]] : []; })));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch { res.writeHead(503); res.end('Storage service temporarily unavailable'); }
      });
    },
  };
}
