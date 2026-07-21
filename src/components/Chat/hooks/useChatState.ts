import { useState, useEffect, useRef } from 'react';
import { state } from '../../../store';

export function useChatState(clientId: string, playerName: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatSound, setChatSound] = useState(() => localStorage.getItem('chatSound') !== 'false');
  const [typingPlayers, setTypingPlayers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Solocitar permissão de Notificação do Navegador
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Observers para as Mensagens do Chat
  useEffect(() => {
    const observer = (event: any) => {
      setMessages(state.chat.toArray());
      if (event && event.changes && event.changes.added && event.changes.added.size > 0) {
        const arr = state.chat.toArray();
        const lastMsg = arr[arr.length - 1] as any;
        if (lastMsg && lastMsg.autor !== playerName && lastMsg.tipo !== 'sistema') {
          // Notificação sonora
          if (chatSound) {
            try {
              // Verifica se o usuário já interagiu com a página para permitir o áudio
              const hasInteracted = (navigator as any).userActivation ? (navigator as any).userActivation.hasBeenActive : true;
              if (hasInteracted) {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
              }
            } catch (e) {}
          }

          // Notificação Push do Navegador se a janela estiver minimizada/em segundo plano
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
            try {
              new Notification(`DOZERO: ${lastMsg.autor || 'Chat'}`, {
                body: lastMsg.text?.replace(/<[^>]*>?/gm, '') || 'Nova mensagem recebida',
                icon: '/vite.svg'
              });
            } catch (e) {}
          }
        }
      }
    };
    state.chat.observe(observer);
    setMessages(state.chat.toArray());
    return () => state.chat.unobserve(observer);
  }, [chatSound, playerName]);

  // Observers para o Typing Indicator
  useEffect(() => {
    const observer = () => {
      const typers: string[] = [];
      const now = Date.now();
      Array.from(state.players.entries() as Iterable<[string, any]>).forEach(([id, p]) => {
        if (id !== clientId && p.isTyping && now - (p.typingTime || 0) < 4000) {
          typers.push(p.name || 'Jogador');
        }
      });
      setTypingPlayers(typers);
    };

    state.players.observe(observer);
    observer();
    const interval = setInterval(observer, 2000);
    return () => {
      state.players.unobserve(observer);
      clearInterval(interval);
    };
  }, [clientId]);

  // Notificar quando usuário digita
  const setTypingStatus = (isTyping: boolean) => {
    const current = state.players.get(clientId) as any || {};
    if (isTyping) {
      state.players.set(clientId, { ...current, isTyping: true, typingTime: Date.now() });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        const p = state.players.get(clientId) as any;
        if (p) state.players.set(clientId, { ...p, isTyping: false });
      }, 3000);
    } else {
      state.players.set(clientId, { ...current, isTyping: false });
    }
  };

  return {
    messages,
    chatSound,
    setChatSound,
    typingPlayers,
    setTypingStatus
  };
}
