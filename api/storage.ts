const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const SUPABASE_URL = runtimeEnv?.SUPABASE_URL || runtimeEnv?.VITE_SUPABASE_URL || 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'HEAD']);
const FORWARDED_HEADERS = ['accept', 'apikey', 'authorization', 'content-type', 'cache-control', 'x-client-info', 'x-upsert'];

/** Same-origin gateway for Storage; the caller JWT keeps Storage RLS intact. */
export default {
  async fetch(request: Request) {
    if (!METHODS.has(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const incoming = new URL(request.url);
    const resource = incoming.searchParams.get('path');
    if (!resource || !resource.startsWith('object/') || resource.includes('..') || !/^[a-zA-Z0-9_./-]+$/.test(resource)) {
      return Response.json({ error: 'Invalid storage resource' }, { status: 400 });
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
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return Response.json({ error: 'Storage service temporarily unavailable' }, { status: 503 });
    }
  },
};
