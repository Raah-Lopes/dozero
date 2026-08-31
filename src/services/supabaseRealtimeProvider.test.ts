import * as Y from 'yjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const realtime = vi.hoisted(() => {
  const handlers = new Map<string, (message: any) => void>();
  const channel: any = {
    joinedOnce: false,
    on: vi.fn((_type, filter, handler) => {
      handlers.set(filter.event, handler);
      return channel;
    }),
    subscribe: vi.fn((callback) => {
      void callback('SUBSCRIBED');
      return channel;
    }),
    send: vi.fn().mockResolvedValue('ok'),
    track: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn(),
    presenceState: vi.fn(() => ({})),
  };

  return { channel, handlers };
});

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: vi.fn(() => realtime.channel),
    removeChannel: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import { SupabaseRealtimeProvider } from './supabaseRealtimeProvider';

function toBase64(bytes: Uint8Array) {
  return window.btoa(String.fromCharCode(...bytes));
}

function fromBase64(base64: string) {
  return Uint8Array.from(window.atob(base64), char => char.charCodeAt(0));
}

async function waitForRequest() {
  await vi.waitFor(() => {
    expect(realtime.channel.send).toHaveBeenCalledWith(expect.objectContaining({ event: 'yjs-sync-req' }));
  });
  return realtime.channel.send.mock.calls.find(([message]: any[]) => message.event === 'yjs-sync-req')![0];
}

describe('SupabaseRealtimeProvider', () => {
  beforeEach(() => {
    realtime.handlers.clear();
    realtime.channel.on.mockClear();
    realtime.channel.send.mockClear();
    realtime.channel.track.mockClear();
    realtime.channel.unsubscribe.mockClear();
  });

  it('ignores initial sync responses addressed to another client', async () => {
    const doc = new Y.Doc();
    const provider = new SupabaseRealtimeProvider('mesa-teste', doc);
    const request = await waitForRequest();
    const updateDoc = new Y.Doc();
    updateDoc.getMap('tokens').set('hero', { name: 'Kael' });
    const update = toBase64(Y.encodeStateAsUpdate(updateDoc));
    const handleResponse = realtime.handlers.get('yjs-sync-res')!;

    handleResponse({ payload: { update, recipientId: 'another-client' } });
    expect(doc.getMap('tokens').has('hero')).toBe(false);

    handleResponse({ payload: { update, recipientId: request.payload.requesterId } });
    expect(doc.getMap('tokens').get('hero')).toEqual({ name: 'Kael' });
    expect(realtime.channel.send.mock.calls.some(([message]: any[]) => message.event === 'yjs-update')).toBe(false);
    provider.destroy();
  });

  it('sends only updates missing from the requester state vector', async () => {
    const doc = new Y.Doc();
    doc.getMap('tokens').set('old', { note: 'a'.repeat(1_024) });
    const initialUpdate = Y.encodeStateAsUpdate(doc);
    const stateVector = toBase64(Y.encodeStateVector(doc));
    const provider = new SupabaseRealtimeProvider('mesa-teste', doc);
    await waitForRequest();
    doc.getMap('tokens').set('new', { name: 'Lyra' });

    realtime.handlers.get('yjs-sync-req')!({
      payload: { requesterId: 'joining-client', stateVector },
    });
    await vi.waitFor(() => {
      expect(realtime.channel.send).toHaveBeenCalledWith(expect.objectContaining({ event: 'yjs-sync-res' }));
    });

    const response = realtime.channel.send.mock.calls.find(([message]: any[]) => message.event === 'yjs-sync-res')![0];
    const delta = fromBase64(response.payload.update);
    const joiningDoc = new Y.Doc();
    Y.applyUpdate(joiningDoc, initialUpdate);
    Y.applyUpdate(joiningDoc, delta);

    expect(response.payload.recipientId).toBe('joining-client');
    expect(delta.byteLength).toBeLessThan(Y.encodeStateAsUpdate(doc).byteLength);
    expect(joiningDoc.getMap('tokens').get('new')).toEqual({ name: 'Lyra' });
    provider.destroy();
  });
});
