import { createClient, SupportedStorage } from '@supabase/supabase-js';

// Memória em cache para fallback infalível caso o Storage do navegador falhe
const memoryStore: Record<string, string> = {};

// SafeStorage: resolve 100% dos erros de QuotaExceededError
const safeStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {}
    return memoryStore[key] ?? null;
  },

  setItem: (key: string, value: string): void => {
    memoryStore[key] = value;
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(key, value);
    } catch (err: any) {
      // Se estourou a cota (QuotaExceededError), limpa chaves pesadas de lixo e tenta de novo
      console.warn('[SafeStorage] Cota do LocalStorage excedida! Executando auto-limpeza de emergência...');
      try {
        const keysToEvict: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          // Não apaga chaves de autenticação do Supabase
          if (k && !k.startsWith('sb-')) {
            keysToEvict.push(k);
          }
        }
        keysToEvict.forEach(k => localStorage.removeItem(k));
        // Tenta salvar o token de auth novamente agora que o espaço foi liberado
        localStorage.setItem(key, value);
        console.log('[SafeStorage] LocalStorage limpo e token de auth salvo com sucesso!');
      } catch (retryErr) {
        console.warn('[SafeStorage] LocalStorage bloqueado. Mantendo sessão em memória.');
      }
    }
  },

  removeItem: (key: string): void => {
    delete memoryStore[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch {}
  }
};

// Executa limpeza preventiva imediata de chaves pesadas (>50KB) ao carregar
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-')) {
        const val = localStorage.getItem(key) || '';
        // Remove itens gigantes que entopem os 5MB do navegador
        if (val.length > 50000 || key.includes('snapshot') || key.includes('backup')) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`[SafeStorage] ${keysToRemove.length} chaves pesadas legadas foram removidas para liberar espaço.`);
    }
  } catch (e) {}
}

// Fallback com as credenciais públicas padrão (Anon JWT Key) caso não venham do .env
const defaultUrl = 'https://pgyvtcgpaqzqqwwawixf.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXZ0Y2dwYXF6cXF3d2F3aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDUyNzQsImV4cCI6MjEwMjU4MTI3NH0.yp_srt5UOBUt2HM6NU-BqYM4zqIoeZqS6XSN26qmrMo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
