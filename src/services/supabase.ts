import { createClient, SupportedStorage } from '@supabase/supabase-js';
import { get, set, del } from 'idb-keyval';

// Limpeza de emergência de snapshots legados do LocalStorage para liberar espaço
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('dozero_room_snapshot_') || key.startsWith('dozero_snapshot_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[LocalStorage] Aviso ao limpar chaves legadas:', e);
  }
}

// Custom storage adapter usando IndexedDB para NUNCA estourar a cota de 5MB do LocalStorage
const indexedDBStorage: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await get(key);
      return (typeof val === 'string') ? val : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await set(key, value);
    } catch (e) {
      console.warn('[SupabaseAuth] Erro ao persistir sessão no IndexedDB:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await del(key);
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
    storage: typeof window !== 'undefined' ? indexedDBStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
