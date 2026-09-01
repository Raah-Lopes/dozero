import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('cloudHealth', () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:00:00Z'));
  });

  it('persiste a pausa de rede durante a sessão do navegador', async () => {
    const firstLoad = await import('./cloudHealth');
    firstLoad.noteCloudFailure(new Error('connection reset'));

    vi.resetModules();
    const afterReload = await import('./cloudHealth');
    expect(afterReload.isCloudCoolingDown()).toBe(true);
  });

  it('remove a pausa quando a nuvem volta a responder', async () => {
    const health = await import('./cloudHealth');
    health.noteCloudFailure(new Error('network closed'));
    health.noteCloudSuccess();

    expect(health.isCloudCoolingDown()).toBe(false);
    expect(sessionStorage.getItem('dozero_cloud_cooldown_until')).toBeNull();
  });
});
