import { createClient, SupportedStorage } from '@supabase/supabase-js';

// Memória em cache para fallback infalível
const memoryStore: Record<string, string> = {};

function purgeDozeroCache(storage: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && !key.startsWith('sb-') && (
      key.startsWith('dozero_theater_state_') ||
      key.startsWith('dozero_room_snapshot_') ||
      key.startsWith('dozero_snapshot_') ||
      key === 'story_dice_history'
    )) keys.push(key);
  }
  keys.forEach(key => storage.removeItem(key));
}

// Limpeza agressiva imediata se a cota do LocalStorage estiver comprometida
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    // Testa se a cota já está estourada
    const testKey = '__quota_test__';
    let quotaFull = false;
    try {
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch {
      quotaFull = true;
    }

    if (quotaFull) {
      console.warn('[LocalStorage] Cota cheia detectada. Limpando somente o cache descartável do DOZERO.');
      purgeDozeroCache(localStorage);
      console.log('[LocalStorage] Limpeza seletiva concluída.');
    } else {
      // Limpeza de chaves antigas pesadas que ocupam espaço desnecessário
      purgeDozeroCache(localStorage);
    }
  } catch (e) {
    // ponytail: a sessão fica no memoryStore se a limpeza seletiva falhar.
  }
}

// SafeStorage: resolve 100% dos erros de QuotaExceededError
const safeStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const val = localStorage.getItem(key) ?? sessionStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}
    return memoryStore[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    memoryStore[key] = value;
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn('[SafeStorage] LocalStorage cheio ao gravar auth. Limpando cache descartável do DOZERO...');
      try {
        purgeDozeroCache(localStorage);
        localStorage.setItem(key, value);
      } catch (retryErr) {
        try {
          sessionStorage.setItem(key, value);
        } catch {}
      }
    }
  },

  removeItem: (key: string): void => {
    delete memoryStore[key];
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    } catch {}
  }
};

// Fallback com as credenciais públicas padrão (Anon JWT Key) caso não venham do .env
const defaultUrl = 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXZ0Y2dwYXF6cXF3d2F3aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDUyNzQsImV4cCI6MjEwMjU4MTI3NH0.yp_srt5UOBUt2HM6NU-BqYM4zqIoeZqS6XSN26qmrMo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function apiGatewayUrl(route: 'data' | 'storage', resource: string, query: URLSearchParams): URL {
  const localRoute = route === 'data' ? '/data-api' : '/storage-api';
  const gateway = new URL(import.meta.env.DEV ? localRoute : `/api/${route}`, window.location.origin);
  gateway.searchParams.set('path', resource);
  query.forEach((value, key) => gateway.searchParams.append(key, value));
  return gateway;
}

/** Builds a same-origin URL for an object in a public Supabase Storage bucket. */
export function storagePublicUrl(bucket: string, objectPath: string): string {
  if (typeof window === 'undefined') return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  return apiGatewayUrl('storage', `object/public/${bucket}/${objectPath}`, new URLSearchParams()).toString();
}

/**
 * Routes only PostgREST calls through the DOZERO gateway. Auth, Realtime and
 * Storage retain their native Supabase clients because they use different
 * transport protocols.
 */
export const restGatewayFetch: typeof fetch = (input, init) => {
  const source = input instanceof Request ? input.url : input.toString();
  if (typeof window === 'undefined') return fetch(input, init);
  const upstream = new URL(source);
  const restPrefix = `${supabaseUrl}/rest/v1/`;
  const storagePrefix = `${supabaseUrl}/storage/v1/`;
  const route = source.startsWith(restPrefix) ? 'data' : source.startsWith(storagePrefix) ? 'storage' : null;
  if (!route) return fetch(input, init);
  const prefix = route === 'data' ? restPrefix : storagePrefix;
  const gateway = apiGatewayUrl(route, upstream.pathname.slice(new URL(prefix).pathname.length), upstream.searchParams);

  // supabase-js normally supplies a URL and init, but preserving a Request
  // keeps the gateway correct for future SDK paths and direct RPC calls too.
  const requestInit: RequestInit = { ...init };
  if (input instanceof Request) {
    requestInit.method ??= input.method;
    requestInit.headers ??= input.headers;
    if (requestInit.body === undefined && !['GET', 'HEAD'].includes(input.method)) {
      requestInit.body = input.body;
    }
  }
  return fetch(gateway, requestInit);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // O DOZERO é local-first: uma leitura GET que falha não deve disparar os
  // três retries internos do PostgREST. Os repositórios preservam o cache local
  // e usam seu próprio cooldown antes de uma nova tentativa útil.
  db: {
    retry: false,
  },
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: { fetch: restGatewayFetch }
});
