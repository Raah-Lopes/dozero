import { describe, it, expect, beforeEach } from 'vitest';
import { 
  enqueueSyncOperation, 
  getSyncQueue, 
  clearSyncQueue, 
  processSyncQueue, 
  getSyncState, 
  reportSyncConflict, 
  resolveConflict 
} from './offlineSyncService';

describe('OfflineSyncService', () => {
  beforeEach(async () => {
    await clearSyncQueue();
  });

  it('deve enfileirar operações offline e atualizar o estado de pendências', async () => {
    expect(getSyncState().pendingCount).toBe(0);

    const op = await enqueueSyncOperation('snapshot_save', 'mesa-teste', { foo: 'bar' });
    expect(op.id).toBeDefined();
    expect(op.roomCode).toBe('mesa-teste');
    expect(getSyncQueue().length).toBe(1);
    expect(getSyncState().pendingCount).toBe(1);
  });

  it('deve processar a fila com executor customizado com sucesso', async () => {
    await enqueueSyncOperation('scene_update', 'mesa-teste', { sceneId: 'cena-1' });
    await enqueueSyncOperation('wiki_save', 'mesa-teste', { note: 'Dragao' });

    expect(getSyncQueue().length).toBe(2);

    const res = await processSyncQueue(async (_op) => true);
    expect(res.success).toBe(true);
    expect(res.processed).toBe(2);
    expect(getSyncQueue().length).toBe(0);
    expect(getSyncState().status).toBe('synced');
  });

  it('deve reter itens com falha para retry posterior', async () => {
    await enqueueSyncOperation('snapshot_save', 'mesa-teste', { data: 1 });

    const res = await processSyncQueue(async (_op) => {
      throw new Error('Falha de rede simulada');
    });

    expect(res.success).toBe(false);
    expect(res.processed).toBe(0);
    expect(getSyncQueue().length).toBe(1);
    expect(getSyncQueue()[0].retries).toBe(1);
    expect(getSyncQueue()[0].error).toBe('Falha de rede simulada');
  });

  it('deve registrar e resolver conflitos de versão', async () => {
    reportSyncConflict({
      roomCode: 'mesa-teste',
      localTimestamp: '2026-08-25T12:00:00Z',
      remoteTimestamp: '2026-08-25T12:05:00Z',
      localPayload: { version: 'local' },
      remotePayload: { version: 'remote' }
    });

    expect(getSyncState().status).toBe('conflict');
    expect(getSyncState().conflict?.remoteTimestamp).toBe('2026-08-25T12:05:00Z');

    await resolveConflict('use_local');
    expect(getSyncState().conflict).toBeNull();
  });
});
