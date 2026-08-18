import { useState, useEffect } from 'react';
import { state } from '../../../store';
import { useAuthStore } from '../../../store/authStore';

export function useChatIdentity() {
  const { user } = useAuthStore();
  const authName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : null);
  const authAvatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || null;

  const [playerName, setPlayerName] = useState(() => authName || localStorage.getItem('playerName') || 'Jogador');
  const [playerColor, setPlayerColor] = useState(() => localStorage.getItem('playerColor') || '#a855f7');
  
  const [clientId] = useState(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });

  // Atualiza nome do jogador quando logar ou trocar de perfil
  useEffect(() => {
    if (authName) {
      setPlayerName(authName);
    }
  }, [authName]);

  // Push local identity changes to state.players
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
