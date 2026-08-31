import * as Y from 'yjs';
import { supabase, isSupabaseConfigured } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export class SupabaseRealtimeProvider {
  private channel: RealtimeChannel | null = null;
  private roomName: string;
  private doc: Y.Doc;
  private clientId: string;
  private isDestroyed = false;
  private handleDocUpdate: ((update: Uint8Array, origin: unknown) => void) | null = null;

  constructor(roomName: string, doc: Y.Doc) {
    this.roomName = roomName;
    this.doc = doc;
    this.clientId = `yjs-${doc.clientID.toString(36)}`;
    this.init();
  }

  private async broadcast(event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.channel || this.isDestroyed) return;
    const result = await this.channel.send({ type: 'broadcast', event, payload });
    if (result !== 'ok') {
      throw new Error(`Realtime não confirmou '${event}': ${result}`);
    }
  }

  private init() {
    if (!isSupabaseConfigured || typeof window === 'undefined') {
      return;
    }

    const channelName = `yjs:${this.roomName}`;
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: true }
      }
    });

    // 1. Escuta atualizações incrementais em tempo real
    this.channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
      if (this.isDestroyed || !payload?.update) return;
      try {
        const update = base64ToUint8(payload.update);
        Y.applyUpdate(this.doc, update, 'supabase-realtime');
      } catch (err) {
        console.warn('[SupabaseRealtime] Falha ao aplicar update:', err);
      }
    });

    // 2. Escuta requisição de sincronização inicial de novos jogadores
    this.channel.on('broadcast', { event: 'yjs-sync-req' }, ({ payload }) => {
      if (this.isDestroyed) return;
      try {
        const requesterId = typeof payload?.requesterId === 'string' ? payload.requesterId : undefined;
        const stateVector = typeof payload?.stateVector === 'string' ? base64ToUint8(payload.stateVector) : undefined;
        const stateUpdate = Y.encodeStateAsUpdate(this.doc, stateVector);
        if (stateUpdate.byteLength <= 2) return;
        void this.broadcast('yjs-sync-res', {
          update: uint8ToBase64(stateUpdate),
          ...(requesterId ? { recipientId: requesterId } : {})
        }).catch(error => console.warn('[SupabaseRealtime] Falha ao responder sync:', error));
      } catch (error) {
        console.warn('[SupabaseRealtime] Falha ao preparar sync:', error);
      }
    });

    // 3. Recebe o estado completo de sincronização inicial
    this.channel.on('broadcast', { event: 'yjs-sync-res' }, ({ payload }) => {
      if (this.isDestroyed || !payload?.update || (payload.recipientId && payload.recipientId !== this.clientId)) return;
      try {
        const update = base64ToUint8(payload.update);
        Y.applyUpdate(this.doc, update, 'supabase-realtime');
        console.log('[SupabaseRealtime] Estado da sala sincronizado em tempo real com os pares!');
      } catch (err) {
        console.warn('[SupabaseRealtime] Falha ao aplicar sync-res:', err);
      }
    });

    // 4. Rastreamento de Presença Real de Jogadores
    // O cliente pode reutilizar um canal já inscrito durante HMR. Nesse caso
    // a inscrição de presença anterior continua válida, mas o Supabase não
    // permite registrar outro callback de presence depois do subscribe.
    if (!this.channel.joinedOnce) {
      this.channel.on('presence', { event: 'sync' }, () => {
        if (this.isDestroyed || !this.channel) return;
        const state = this.channel.presenceState();
        const onlineCount = Object.keys(state).length;
        window.dispatchEvent(new CustomEvent('room-presence-sync', {
          detail: { room: this.roomName, count: onlineCount, presenceState: state }
        }));
      });
    }

    let isSubscribed = false;

    // 5. Inscreve no canal e registra presença
    this.channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') {
        isSubscribed = false;
        return;
      }
      isSubscribed = true;
      console.log(`[SupabaseRealtime] Conectado à sala '${this.roomName}' em tempo real!`);
        
        // Registra presença do usuário atual na sala (usando sessão local para evitar requisição de rede)
      try {
        const authUser = (await supabase.auth.getSession()).data.session?.user;
        await this.channel?.track({
          user_id: authUser?.id || `anon_${Date.now()}`,
          user_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Aventureiro',
          room_code: this.roomName,
          joined_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[SupabaseRealtime] Erro ao registrar presença:', e);
      }

        // Pede o estado atual para qualquer jogador que já esteja online na sala
      try {
        await this.broadcast('yjs-sync-req', {
          requesterId: this.clientId,
          stateVector: uint8ToBase64(Y.encodeStateVector(this.doc))
        });
      } catch (error) {
        console.warn('[SupabaseRealtime] Falha ao solicitar sync inicial:', error);
      }
    });

    // 6. Transmite alterações locais do documento para os outros jogadores
    this.handleDocUpdate = (update, origin) => {
      if (this.isDestroyed || origin === 'supabase-realtime' || origin === 'room-auto-hydration' || !isSubscribed) return;
      void this.broadcast('yjs-update', { update: uint8ToBase64(update) })
        .catch(error => console.warn('[SupabaseRealtime] Falha ao transmitir update:', error));
    };
    this.doc.on('update', this.handleDocUpdate);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.handleDocUpdate) {
      this.doc.off('update', this.handleDocUpdate);
      this.handleDocUpdate = null;
    }
    if (this.channel) {
      this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
