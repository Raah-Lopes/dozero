/**
 * Toast system — zero deps, uses Zustand (already installed).
 * Usage: import { toast } from './Toast'
 *        toast.success('Salvo!')
 *        toast.error('Erro ao salvar')
 *        toast.info('Carregando...')
 *        toast.warn('Atenção')
 */
import React, { useEffect } from 'react';
import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warn';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, variant: ToastVariant) => void;
  remove: (id: string) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, variant) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ─── Public API ──────────────────────────────────────────────────────────────

export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error:   (msg: string) => useToastStore.getState().add(msg, 'error'),
  info:    (msg: string) => useToastStore.getState().add(msg, 'info'),
  warn:    (msg: string) => useToastStore.getState().add(msg, 'warn'),
};

// ─── Styles per variant ───────────────────────────────────────────────────────

const STYLES: Record<ToastVariant, { border: string; icon: string; color: string }> = {
  success: { border: 'rgba(16,185,129,0.5)',  icon: '✅', color: '#10b981' },
  error:   { border: 'rgba(239,68,68,0.5)',   icon: '❌', color: '#ef4444' },
  warn:    { border: 'rgba(245,158,11,0.5)',  icon: '⚠️', color: '#f59e0b' },
  info:    { border: 'rgba(99,102,241,0.5)',  icon: 'ℹ️', color: '#6366f1' },
};

// ─── Toaster component (mount once in App.tsx) ────────────────────────────────

export const Toaster: React.FC = () => {
  const { toasts, remove } = useToastStore();

  return (
    <div style={{
      position: 'fixed',
      bottom: '84px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: '8px',
      zIndex: 99999,
      pointerEvents: 'none',
      alignItems: 'center',
    }}>
      {toasts.map((t) => {
        const s = STYLES[t.variant];
        return (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              background: 'rgba(10,15,30,0.95)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${s.border}`,
              borderRadius: '10px',
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${s.border}`,
              color: '#e2e8f0',
              fontSize: '0.85rem',
              maxWidth: '420px',
              cursor: 'pointer',
              animation: 'toast-in 0.25s cubic-bezier(0.4,0,0.2,1)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        );
      })}

      {/* CSS animation */}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

// ─── Inline Confirm Dialog ────────────────────────────────────────────────────
// Replaces window.confirm() — non-blocking, styled.

interface ConfirmState {
  open: boolean;
  message: string;
  resolve: ((ok: boolean) => void) | null;
}

const useConfirmStore = create<ConfirmState & {
  ask: (message: string) => Promise<boolean>;
  answer: (ok: boolean) => void;
}>((set, get) => ({
  open: false,
  message: '',
  resolve: null,
  ask: (message) => new Promise<boolean>((resolve) => {
    set({ open: true, message, resolve });
  }),
  answer: (ok) => {
    get().resolve?.(ok);
    set({ open: false, resolve: null });
  },
}));

/** Call this instead of window.confirm() */
export const confirmDialog = (message: string) => useConfirmStore.getState().ask(message);

/** Mount inside <Toaster> */
export const ConfirmDialog: React.FC = () => {
  const { open, message, answer } = useConfirmStore();
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(10,15,30,0.97)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
        padding: '24px', maxWidth: '380px', width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        animation: 'toast-in 0.2s ease',
      }}>
        <p style={{ margin: '0 0 20px', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => answer(false)}
            style={{
              padding: '8px 18px', borderRadius: '6px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: '0.85rem',
            }}
          >Cancelar</button>
          <button
            onClick={() => answer(true)}
            style={{
              padding: '8px 18px', borderRadius: '6px', cursor: 'pointer',
              background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5', fontSize: '0.85rem', fontWeight: 'bold',
            }}
          >Confirmar</button>
        </div>
      </div>
    </div>
  );
};
