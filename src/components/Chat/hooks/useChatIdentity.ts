import { useState, useEffect } from 'react';
import { state } from '../../../store';

export function useChatIdentity() {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || 'Jogador');
  const [playerColor, setPlayerColor] = useState(() => localStorage.getItem('playerColor') || '#a855f7');
  
  const [clientId] = useState(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });

  // Push local identity changes to state.players
  useEffect(() => {
    const current = state.players.get(clientId) as any;
    if (!current || current.name !== playerName || current.color !== playerColor) {
      state.players.set(clientId, { name: playerName, color: playerColor, isOnline: true });
    }
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('playerColor', playerColor);
  }, [playerName, playerColor, clientId]);

  return {
    playerName,
    setPlayerName,
    playerColor,
    setPlayerColor,
    clientId
  };
}
