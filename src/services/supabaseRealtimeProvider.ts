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
  private isDestroyed = false;

  constructor(roomName: string, doc: Y.Doc) {
    this.roomName = roomName;
    this.doc = doc;
    this.init();
  }

  private init() {
    if (!isSupabaseConfigured || typeof window === 'undefined') {
      return;
    }

    const channelName = `yjs:${this.roomName}`;
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false }
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
    this.channel.on('broadcast', { event: 'yjs-sync-req' }, () => {
      if (this.isDestroyed) return;
      // Se este cliente tiver dados na sala, envia o estado completo para quem acabou de entrar
      const hasContent = (this.doc.getMap('tokens').size > 0) || (this.doc.getMap('backgrounds').size > 0);
      if (hasContent) {
        try {
          const stateUpdate = Y.encodeStateAsUpdate(this.doc);
          this.channel?.send({
            type: 'broadcast',
            event: 'yjs-sync-res',
            payload: { update: uint8ToBase64(stateUpdate) }
          });
        } catch (e) {}
      }
    });

    // 3. Recebe o estado completo de sincronização inicial
    this.channel.on('broadcast', { event: 'yjs-sync-res' }, ({ payload }) => {
      if (this.isDestroyed || !payload?.update) return;
      try {
        const update = base64ToUint8(payload.update);
        Y.applyUpdate(this.doc, update, 'supabase-realtime');
        console.log('[SupabaseRealtime] Estado da sala sincronizado em tempo real com os pares!');
      } catch (err) {
        console.warn('[SupabaseRealtime] Falha ao aplicar sync-res:', err);
      }
    });

    // 4. Inscreve no canal e solicita sincronização
    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[SupabaseRealtime] Conectado à sala '${this.roomName}' em tempo real!`);
        // Pede o estado atual para qualquer jogador que já esteja online na sala
        this.channel?.send({
          type: 'broadcast',
          event: 'yjs-sync-req',
          payload: {}
        });
      }
    });

    // 5. Transmite alterações locais do documento para os outros jogadores
    this.doc.on('update', (update, origin) => {
      if (this.isDestroyed || origin === 'supabase-realtime') return;
      try {
        this.channel?.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: { update: uint8ToBase64(update) }
        });
      } catch (err) {
        console.warn('[SupabaseRealtime] Falha ao transmitir update:', err);
      }
    });
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.channel) {
      this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
