import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfflineSyncBadge } from './OfflineSyncBadge';

vi.mock('../../services/offlineSyncService', () => ({
  subscribeSyncState: (listener: (state: object) => void) => {
    listener({
      status: 'synced',
      isOnline: true,
      pendingCount: 6,
      lastSyncedAt: null,
      conflict: null,
      errorMessage: null
    });
    return vi.fn();
  },
  getSyncQueue: () => [],
  processSyncQueue: vi.fn(),
  clearSyncQueue: vi.fn()
}));

describe('OfflineSyncBadge', () => {
  it('opens the synchronization panel above the bottom-right badge', () => {
    render(<OfflineSyncBadge />);

    fireEvent.click(screen.getByRole('button', { name: 'Fila (6)' }));

    const panel = screen.getByRole('dialog', { name: 'Status de sincronização' });
    expect(panel).toHaveStyle({
      bottom: 'calc(100% + 8px)',
      right: '0px',
      maxHeight: 'calc(100vh - 56px)',
      overflowY: 'auto'
    });
  });
});
