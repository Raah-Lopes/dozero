import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { convertImageToWebPBlob } from '../utils/imageUtils';

interface AuthState {
  user: User | null;
  session: Session | null;
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
  uploadAvatar: (file: File) => Promise<string>;
  signOut: () => Promise<void>;
}

let isAuthInitialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
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
      // 1. Escuta mudanças de auth em tempo real
      supabase.auth.onAuthStateChange((event, session) => {
        set({ session, user: session?.user ?? null, loading: false });
        if (event === 'PASSWORD_RECOVERY') {
          set({ isResetPasswordModalOpen: true });
        }
      });

      // 2. Obtém a sessão inicial
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ session, user: session.user ?? null, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.error('Erro ao inicializar Supabase Auth:', err);
      set({ loading: false });
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
