import { createClient, SupportedStorage } from '@supabase/supabase-js';

// Memória em cache para fallback infalível
const memoryStore: Record<string, string> = {};

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
      console.warn('[LocalStorage] Cota 100% cheia detectada. Executando purga total de cache...');
      localStorage.clear();
      console.log('[LocalStorage] Purga de emergência concluída. Espaço 100% liberado!');
    } else {
      // Limpeza de chaves antigas pesadas que ocupam espaço desnecessário
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-')) {
          const valLen = localStorage.getItem(key)?.length || 0;
          if (
            valLen > 10000 ||
            key.startsWith('dozero_theater_state_') || 
            key.startsWith('dozero_room_snapshot_') || 
            key.startsWith('dozero_snapshot_') ||
            key.startsWith('story_dice_history')
          ) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    try { localStorage.clear(); } catch {}
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
      console.warn('[SafeStorage] LocalStorage cheio ao gravar auth. Purgando cache do navegador...');
      try {
        localStorage.clear();
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
