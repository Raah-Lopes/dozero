import { useState, useEffect, useCallback } from 'react';
import { state } from '../../../store';
import { useAuthStore } from '../../../store/authStore';
import { supabase, isSupabaseConfigured } from '../../../services/supabase';

export function useChatIdentity() {
  const { user } = useAuthStore();
  
  const getInitialName = () => {
    const authName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : null);
    const savedName = localStorage.getItem('dozero_player_name') || localStorage.getItem('playerName');
    return authName || savedName || 'Jogador';
  };

  const authAvatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || null;

  const [playerName, setPlayerNameState] = useState<string>(getInitialName);
  const [playerColor, setPlayerColor] = useState<string>(() => localStorage.getItem('playerColor') || '#a855f7');
  
  const [clientId] = useState<string>(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });

  // Atualiza nome do jogador quando logar ou carregar o perfil no Supabase
  useEffect(() => {
    const authName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : null);
    if (authName) {
      setPlayerNameState(authName);
      localStorage.setItem('playerName', authName);
      localStorage.setItem('dozero_player_name', authName);
    }
  }, [user?.id, user?.user_metadata?.full_name, user?.email]);

  const setPlayerName = useCallback((newName: string) => {
    if (!newName || !newName.trim()) return;
    const trimmed = newName.trim();
    setPlayerNameState(trimmed);
    localStorage.setItem('playerName', trimmed);
    localStorage.setItem('dozero_player_name', trimmed);

    // Se estiver logado no Supabase, salva no perfil permanentemente
    if (isSupabaseConfigured && user) {
      supabase.auth.updateUser({
        data: { full_name: trimmed }
      }).catch(err => console.warn('Aviso: Erro ao persistir nome no perfil Supabase:', err));
    }
  }, [user]);

  // Sincroniza a identidade do jogador no mapa multiplayer Yjs (state.players)
  useEffect(() => {
    const current = state.players.get(clientId) as any;
    if (
      !current || 
      current.name !== playerName || 
      current.color !== playerColor || 
      current.avatar !== authAvatar ||
      current.userId !== user?.id
    ) {
      state.players.set(clientId, { 
        name: playerName, 
        color: playerColor, 
        avatar: authAvatar, 
        userId: user?.id, 
        isOnline: true 
      });
    }
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('dozero_player_name', playerName);
    localStorage.setItem('playerColor', playerColor);
  }, [playerName, playerColor, clientId, authAvatar, user?.id]);

  return {
    playerName,
    setPlayerName,
    playerColor,
    setPlayerColor,
    clientId,
    user
  };
}
