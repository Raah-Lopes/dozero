const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const SUPABASE_URL = runtimeEnv?.SUPABASE_URL || runtimeEnv?.VITE_SUPABASE_URL || 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'HEAD']);
const FORWARDED_HEADERS = ['accept', 'apikey', 'authorization', 'content-type', 'cache-control', 'x-client-info', 'x-upsert'];
const ALLOWED_ORIGINS = new Set(['https://dozero-vert.vercel.app', 'https://dozero-dozerorpg.vercel.app']);

function corsHeaders(request: Request) {
  const headers = new Headers({ vary: 'origin' });
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-methods', 'GET,POST,PUT,DELETE,HEAD,OPTIONS');
    headers.set('access-control-allow-headers', 'authorization,apikey,content-type,cache-control,x-client-info,x-upsert');
    headers.set('access-control-max-age', '86400');
  }
  return headers;
}

/** Same-origin gateway for Storage; the caller JWT keeps Storage RLS intact. */
export default {
  async fetch(request: Request) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!METHODS.has(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });
    const incoming = new URL(request.url);
    const resource = incoming.searchParams.get('path');
    if (!resource || !resource.startsWith('object/') || resource.includes('..') || !/^[a-zA-Z0-9_./-]+$/.test(resource)) {
      return Response.json({ error: 'Invalid storage resource' }, { status: 400, headers: cors });
    }
    const upstream = new URL(`/storage/v1/${resource}`, SUPABASE_URL);
    incoming.searchParams.forEach((value, key) => { if (key !== 'path') upstream.searchParams.append(key, value); });
    const headers = new Headers();
    FORWARDED_HEADERS.forEach(name => { const value = request.headers.get(name); if (value) headers.set(name, value); });
    headers.set('x-client-info', 'dozero-storage-gateway');
    try {
      const response = await fetch(upstream, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body, duplex: 'half' } as RequestInit);
      const responseHeaders = new Headers();
      ['content-type', 'content-length', 'etag', 'last-modified', 'cache-control'].forEach(name => { const value = response.headers.get(name); if (value) responseHeaders.set(name, value); });
      cors.forEach((value, key) => responseHeaders.set(key, value));
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return Response.json({ error: 'Storage service temporarily unavailable' }, { status: 503, headers: cors });
    }
  },
};
