const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const SUPABASE_URL = runtimeEnv?.SUPABASE_URL || runtimeEnv?.VITE_SUPABASE_URL || 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD']);
const FORWARDED_HEADERS = ['accept', 'accept-profile', 'apikey', 'authorization', 'content-type', 'prefer', 'range', 'range-unit', 'x-client-info'];

/**
 * Same-origin gateway for PostgREST. It forwards the caller's JWT unchanged,
 * so Supabase RLS remains the authorization boundary; no service-role key is
 * used here.
 */
export default {
  async fetch(request: Request) {
    if (!METHODS.has(request.method)) return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const incoming = new URL(request.url);
    const resource = incoming.searchParams.get('path');
    if (!resource || !/^[a-z_]+(?:\/[a-z_]+)?$/i.test(resource)) {
      return Response.json({ error: 'Invalid API resource' }, { status: 400 });
    }

    const upstream = new URL(`/rest/v1/${resource}`, SUPABASE_URL);
    incoming.searchParams.forEach((value, key) => { if (key !== 'path') upstream.searchParams.append(key, value); });
    const headers = new Headers();
    FORWARDED_HEADERS.forEach(name => { const value = request.headers.get(name); if (value) headers.set(name, value); });
    headers.set('x-client-info', 'dozero-api-gateway');

    try {
      const response = await fetch(upstream, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        // Node's server-side fetch uses a separate connection from the browser.
        duplex: 'half',
      } as RequestInit);
      const responseHeaders = new Headers();
      ['content-type', 'content-range', 'range-unit', 'preference-applied'].forEach(name => {
        const value = response.headers.get(name); if (value) responseHeaders.set(name, value);
      });
      responseHeaders.set('cache-control', 'no-store');
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return Response.json({ error: 'Data service temporarily unavailable' }, { status: 503 });
    }
  },
};
