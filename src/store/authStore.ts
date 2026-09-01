import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { convertImageToWebPBlob } from '../utils/imageUtils';
import { isCloudCoolingDown, noteCloudFailure, noteCloudSuccess } from '../services/cloudHealth';

interface AuthState {
  user: User | null;
  session: Session | null;
  preferences: Record<string, any>;
  loading: boolean;
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  isResetPasswordModalOpen: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  setResetPasswordModalOpen: (open: boolean) => void;
  initialize: () => Promise<void>;
  updateUserProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (newPrefs: Record<string, any>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  signOut: () => Promise<void>;
}

let isAuthInitialized = false;

let inflightLoadPreferences: Promise<void> | null = null;
let lastLoadedUserId: string | null = null;
let lastLoadPreferencesTimestamp = 0;
const PREFERENCES_BACKGROUND_REFRESH_MS = 5 * 60 * 1000;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  preferences: {},
  loading: true,
  isAuthModalOpen: false,
  isProfileModalOpen: false,
  isResetPasswordModalOpen: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  setResetPasswordModalOpen: (open) => set({ isResetPasswordModalOpen: open }),
  initialize: async () => {
    if (isAuthInitialized) return;
    isAuthInitialized = true;

    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }

    try {
      // 1. Escuta mudanças de auth em tempo real (já emite INITIAL_SESSION)
      supabase.auth.onAuthStateChange((event, session) => {
        set({ session, user: session?.user ?? null, loading: false });
        if (session?.user?.id) {
          get().loadPreferences();
        }
        if (event === 'PASSWORD_RECOVERY') {
          set({ isResetPasswordModalOpen: true });
        }
      });
    } catch (err) {
      console.error('Erro ao inicializar Supabase Auth:', err);
      set({ loading: false });
    }
  },
  loadPreferences: async () => {
    const currentUser = get().user;
    if (!currentUser?.id) return;
    const cacheKey = `dozero_user_prefs_${currentUser.id}`;
    const cacheRefreshKey = `${cacheKey}_refresh_after`;
    let hasCachedPreferences = false;

    // 1. Carregamento instantâneo do cache local (0ms de latência)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        set({ preferences: JSON.parse(cached) });
        hasCachedPreferences = true;
      }
    } catch {}

    // Uma abertura de mesa nunca precisa aguardar uma preferência que já está
    // disponível localmente. A atualização remota ocorre em segundo plano, no
    // máximo uma vez a cada cinco minutos.
    if (hasCachedPreferences) {
      try {
        const refreshAfter = Number(localStorage.getItem(cacheRefreshKey));
        if (!Number.isFinite(refreshAfter) || Date.now() < refreshAfter) {
          if (!Number.isFinite(refreshAfter)) {
            localStorage.setItem(cacheRefreshKey, String(Date.now() + PREFERENCES_BACKGROUND_REFRESH_MS));
          }
          return;
        }
      } catch {
        return;
      }
    }

    if (!isSupabaseConfigured || isCloudCoolingDown()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const now = Date.now();
    if (now - lastLoadPreferencesTimestamp < 30000 && currentUser.id === lastLoadedUserId) return;
    if (inflightLoadPreferences) return inflightLoadPreferences;

    inflightLoadPreferences = (async () => {
      lastLoadPreferencesTimestamp = Date.now();
      lastLoadedUserId = currentUser.id;
      try {
        const queryPromise = supabase
          .from('profiles')
          .select('preferences')
          .eq('id', currentUser.id)
          .maybeSingle();

        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao buscar preferências')), 3500)
        );

        const res = await Promise.race([queryPromise, timeoutPromise]) as any;
        const { data, error } = res || {};

        if (!error) {
          noteCloudSuccess();
        }
        if (!error && data?.preferences) {
          set({ preferences: data.preferences });
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data.preferences));
            localStorage.setItem(cacheRefreshKey, String(Date.now() + PREFERENCES_BACKGROUND_REFRESH_MS));
          } catch {}
        } else if (error) {
          noteCloudFailure(error);
          // Se houver erro de rede / RLS, aguarda 60s antes de tentar novamente
          lastLoadPreferencesTimestamp = Date.now() + 60000;
        }
      } catch (e) {
        noteCloudFailure(e);
        // Cooldown de 60s em caso de conexão fechada/timeout/ERR_CONNECTION_RESET
        lastLoadPreferencesTimestamp = Date.now() + 60000;
      } finally {
        inflightLoadPreferences = null;
      }
    })();

    return inflightLoadPreferences;
  },
  updatePreferences: async (newPrefs) => {
    const currentUser = get().user;
    const merged = { ...get().preferences, ...newPrefs };
    set({ preferences: merged });

    if (currentUser?.id) {
      try {
        const cacheKey = `dozero_user_prefs_${currentUser.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(merged));
        localStorage.setItem(`${cacheKey}_refresh_after`, String(Date.now() + PREFERENCES_BACKGROUND_REFRESH_MS));
      } catch {}
    }

    if (!isSupabaseConfigured || !currentUser?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ preferences: merged })
        .eq('id', currentUser.id);
    } catch {}
  },
  updateUserProfile: async (data) => {
    if (!isSupabaseConfigured) return;
    const { data: updated, error } = await supabase.auth.updateUser({
      data: {
        ...get().user?.user_metadata,
        ...data,
        // Salva explicitamente custom_avatar para não ser sobrescrito pelo Google no relogin
        custom_avatar: data.avatar_url ?? get().user?.user_metadata?.custom_avatar,
      },
    });
    if (error) throw error;
    if (updated.user) {
      set({ user: updated.user });
    }
  },
  uploadAvatar: async (file: File) => {
    if (!isSupabaseConfigured) throw new Error('Supabase não configurado');
    const currentUser = get().user;
    if (!currentUser) throw new Error('Usuário não autenticado');

    // 1. Converte e comprime para WebP (máximo 256x256 e qualidade 0.8)
    const webpBlob = await convertImageToWebPBlob(file, 0.8, 256);
    const fileName = `${currentUser.id}/avatar_${Date.now()}.webp`;

    // 2. Upload para o bucket 'avatars' no Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, webpBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 3. Obtém a URL pública do avatar gerado com cache-buster
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // 4. Salva no perfil do usuário persistente
    await get().updateUserProfile({ 
      avatar_url: publicUrl,
    });

    return publicUrl;
  },
  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ user: null, session: null, isProfileModalOpen: false });
  },
}));
