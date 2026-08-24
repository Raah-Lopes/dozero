import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Hook para rastreamento de presença de jogadores em tempo real na mesa via Supabase Realtime Presence.
 * Substitui contagens aleatórias/artificiais por contagem real e sincronizada.
 */
export function useRoomPresence(roomCode: string) {
  const { user } = useAuthStore();
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    if (!isSupabaseConfigured || !roomCode || roomCode === 'default-room') return;

    const presenceKey = user?.id || `anon_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase.channel(`presence_${roomCode}`, {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const count = Object.keys(presenceState).length;
        const total = Math.max(1, count);
        setOnlineCount(total);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user?.id || null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomCode, user?.id]);

  return { onlineCount };
}
