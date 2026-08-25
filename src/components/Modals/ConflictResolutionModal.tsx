import React, { useState, useEffect } from 'react';
import { AlertTriangle, HardDrive, Cloud, GitMerge, Check, X } from 'lucide-react';
import { 
  getSyncState, 
  resolveConflict, 
  subscribeSyncState, 
  type SyncConflictData 
} from '../../services/offlineSyncService';

export const ConflictResolutionModal: React.FC = () => {
  const [conflict, setConflict] = useState<SyncConflictData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeSyncState((state) => {
      if (state.conflict) {
        setConflict(state.conflict);
        setIsOpen(true);
      }
    });

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setConflict(detail);
        setIsOpen(true);
      }
    };
    window.addEventListener('open-conflict-modal', handler);

    return () => {
      unsub();
      window.removeEventListener('open-conflict-modal', handler);
    };
  }, []);

  if (!isOpen || !conflict) return null;

  const handleResolve = async (strategy: 'use_local' | 'use_remote' | 'merge') => {
    await resolveConflict(strategy);
    setIsOpen(false);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(10px)',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '540px',
        backgroundColor: '#0f172a',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Conflito de Versão da Mesa</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              A sala <strong>{conflict.roomCode}</strong> foi alterada na nuvem enquanto você estava offline.
            </span>
          </div>
        </div>

        {/* COMPARATIVO */}
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* VERSÃO LOCAL */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#c084fc' }}>
              <HardDrive size={14} /> Sua Versão Local
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Salva em:</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{formatTime(conflict.localTimestamp)}</span>
          </div>

          {/* VERSÃO NUVEM */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>
              <Cloud size={14} /> Versão da Nuvem
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Salva em:</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{formatTime(conflict.remoteTimestamp)}</span>
          </div>
        </div>

        {/* INSTRUÇÃO */}
        <div style={{ padding: '0 16px', fontSize: '0.8rem', color: '#94a3b8' }}>
          Escolha como deseja prosseguir para restabelecer a sincronização contínua:
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => handleResolve('use_local')}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Manter Minha Versão Local</span>
            <Check size={16} />
          </button>

          <button
            onClick={() => handleResolve('use_remote')}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Restaurar Versão da Nuvem</span>
            <Cloud size={16} />
          </button>

          <button
            onClick={() => handleResolve('merge')}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Mesclar Automaticamente</span>
            <GitMerge size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
