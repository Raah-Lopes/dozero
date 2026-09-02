const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const SUPABASE_URL = runtimeEnv?.SUPABASE_URL || runtimeEnv?.VITE_SUPABASE_URL || 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD']);
const FORWARDED_HEADERS = ['accept', 'accept-profile', 'apikey', 'authorization', 'content-type', 'prefer', 'range', 'range-unit', 'x-client-info'];
const GATEWAY_CONTENT_TYPE = 'application/vnd.dozero.gateway+json';
const ALLOWED_ORIGINS = new Set(['https://dozero-vert.vercel.app', 'https://dozero-dozerorpg.vercel.app']);

function corsHeaders(request: Request) {
  const headers = new Headers({ vary: 'origin' });
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-methods', 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS');
    headers.set('access-control-allow-headers', 'accept-profile,authorization,apikey,content-type,prefer,range,range-unit,x-client-info');
    headers.set('access-control-max-age', '86400');
  }
  return headers;
}

/**
 * Same-origin gateway for PostgREST. It forwards the caller's JWT unchanged,
 * so Supabase RLS remains the authorization boundary; no service-role key is
 * used here.
 */
export default {
  async fetch(request: Request) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!METHODS.has(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });

    const incoming = new URL(request.url);
    const resource = incoming.searchParams.get('path');
    if (!resource || !/^[a-z_]+(?:\/[a-z_]+)?$/i.test(resource)) {
      return Response.json({ error: 'Invalid API resource' }, { status: 400, headers: cors });
    }

    const upstream = new URL(`/rest/v1/${resource}`, SUPABASE_URL);
    incoming.searchParams.forEach((value, key) => { if (key !== 'path') upstream.searchParams.append(key, value); });
    let method = request.method;
    let requestBody: BodyInit | undefined = ['GET', 'HEAD'].includes(method) ? undefined : request.body;
    let sourceHeaders = new Headers(request.headers);

    // O navegador envia credenciais longas no corpo para não ultrapassar o
    // limite de cabeçalho da borda da Vercel. A Function recoloca somente os
    // cabeçalhos permitidos na chamada server-to-server ao Supabase.
    if (request.headers.get('content-type')?.startsWith(GATEWAY_CONTENT_TYPE)) {
      try {
        const envelope = await request.json() as { method?: string; headers?: Record<string, string>; body?: string | null };
        if (!envelope.method || !METHODS.has(envelope.method)) {
          return Response.json({ error: 'Invalid gateway request' }, { status: 400, headers: cors });
        }
        method = envelope.method;
        sourceHeaders = new Headers();
        Object.entries(envelope.headers || {}).forEach(([name, value]) => {
          if (FORWARDED_HEADERS.includes(name.toLowerCase()) && typeof value === 'string') sourceHeaders.set(name, value);
        });
        requestBody = ['GET', 'HEAD'].includes(method) || envelope.body == null ? undefined : envelope.body;
      } catch {
        return Response.json({ error: 'Invalid gateway request' }, { status: 400, headers: cors });
      }
    }

    const headers = new Headers();
    FORWARDED_HEADERS.forEach(name => { const value = sourceHeaders.get(name); if (value) headers.set(name, value); });
    headers.set('x-client-info', 'dozero-api-gateway');

    try {
      const response = await fetch(upstream, {
        method,
        headers,
        body: requestBody,
        // Node's server-side fetch uses a separate connection from the browser.
        duplex: 'half',
      } as RequestInit);
      const responseHeaders = new Headers();
      ['content-type', 'content-range', 'range-unit', 'preference-applied'].forEach(name => {
        const value = response.headers.get(name); if (value) responseHeaders.set(name, value);
      });
      responseHeaders.set('cache-control', 'no-store');
      cors.forEach((value, key) => responseHeaders.set(key, value));
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return Response.json({ error: 'Data service temporarily unavailable' }, { status: 503, headers: cors });
    }
  },
};
