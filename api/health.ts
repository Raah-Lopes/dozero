const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;

/** Lightweight readiness endpoint for the DOZERO data gateway. */
export default {
  fetch() {
    return Response.json({
      status: 'ok',
      service: 'dozero-data-api',
      version: 1,
      configured: Boolean(runtimeEnv?.SUPABASE_URL || runtimeEnv?.VITE_SUPABASE_URL || 'https://pgyvtcgpaqzqqwwawixf.supabase.co'),
    }, {
      headers: { 'cache-control': 'no-store' },
    });
  },
};
