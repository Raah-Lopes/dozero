import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const isCloudCoolingDown = vi.fn(() => false);
const noteCloudFailure = vi.fn();
const noteCloudSuccess = vi.fn();

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { getSession }, from },
}));

vi.mock('./cloudHealth', () => ({
  isCloudCoolingDown,
  noteCloudFailure,
  noteCloudSuccess,
}));

describe('chatCloudService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCloudCoolingDown.mockReturnValue(false);
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
    insert.mockResolvedValue({ error: null });
  });

  it('usa a sessão local sem solicitar o usuário remoto', async () => {
    const { saveChatMessageToCloud } = await import('./chatCloudService');

    await saveChatMessageToCloud('room-1', { text: 'Iniciativa rolada', tipo: 'sistema' });

    expect(getSession).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      campaign_id: 'room-1',
      user_id: 'user-1',
      content: 'Iniciativa rolada',
    }));
    expect(noteCloudSuccess).toHaveBeenCalledOnce();
  });

  it('não tenta sincronizar enquanto a nuvem está em pausa', async () => {
    isCloudCoolingDown.mockReturnValue(true);
    const { saveChatMessageToCloud } = await import('./chatCloudService');

    await saveChatMessageToCloud('room-1', { text: 'Token criado' });

    expect(getSession).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('registra falhas retornadas pelo Supabase para iniciar a pausa', async () => {
    insert.mockResolvedValue({ error: new Error('connection reset') });
    const { saveChatMessageToCloud } = await import('./chatCloudService');

    await saveChatMessageToCloud('room-1', { text: 'Token criado' });

    expect(noteCloudFailure).toHaveBeenCalledOnce();
    expect(noteCloudSuccess).not.toHaveBeenCalled();
  });
});
