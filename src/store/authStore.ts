import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { convertImageToWebPBlob } from '../utils/imageUtils';

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
    if (!isSupabaseConfigured) return;
    const currentUser = get().user;
    if (!currentUser?.id) return;
    if (inflightLoadPreferences) return inflightLoadPreferences;
    if (currentUser.id === lastLoadedUserId) return;

    inflightLoadPreferences = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', currentUser.id)
          .maybeSingle();

        lastLoadedUserId = currentUser.id;
        if (!error && data?.preferences) {
          set({ preferences: data.preferences });
        }
      } catch (e) {
        lastLoadedUserId = currentUser.id;
        console.warn('Erro ao carregar preferências de perfil:', e);
      } finally {
        inflightLoadPreferences = null;
      }
    })();

    return inflightLoadPreferences;
  },
  updatePreferences: async (newPrefs) => {
    const merged = { ...get().preferences, ...newPrefs };
    set({ preferences: merged });

    if (!isSupabaseConfigured) return;
    const currentUser = get().user;
    if (!currentUser?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ preferences: merged })
        .eq('id', currentUser.id);
    } catch (e) {
      console.warn('Erro ao salvar preferências no Supabase:', e);
    }
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
