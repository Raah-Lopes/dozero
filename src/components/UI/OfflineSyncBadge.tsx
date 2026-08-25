import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2, 
  Trash2, ArrowUpRight, Wifi, WifiOff 
} from 'lucide-react';
import { 
  subscribeSyncState, 
  getSyncQueue, 
  processSyncQueue, 
  clearSyncQueue, 
  type SyncState, 
  type OfflineOperation 
} from '../../services/offlineSyncService';
import { Tooltip } from './Tooltip';

export const OfflineSyncBadge: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    isOnline: true,
    pendingCount: 0,
    lastSyncedAt: null,
    conflict: null,
    errorMessage: null
  });
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<OfflineOperation[]>([]);

  useEffect(() => {
    const unsub = subscribeSyncState((state) => {
      setSyncState(state);
      setQueue(getSyncQueue());
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    await processSyncQueue();
    setQueue(getSyncQueue());
  };

  const handleClear = async () => {
    if (confirm('Deseja descartar as alterações offline pendentes?')) {
      await clearSyncQueue();
      setQueue([]);
      setIsOpen(false);
    }
  };

  // Cores e Ícones conforme o estado
  let badgeColor = '#10b981'; // green
  let badgeBg = 'rgba(16, 185, 129, 0.15)';
  let badgeBorder = 'rgba(16, 185, 129, 0.3)';
  let label = 'Sincronizado';
  let Icon = CheckCircle2;

  if (syncState.status === 'conflict') {
    badgeColor = '#ef4444';
    badgeBg = 'rgba(239, 68, 68, 0.2)';
    badgeBorder = 'rgba(239, 68, 68, 0.4)';
    label = 'Conflito de Versão';
    Icon = AlertTriangle;
  } else if (!syncState.isOnline || syncState.status === 'offline') {
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.2)';
    badgeBorder = 'rgba(245, 158, 11, 0.4)';
    label = syncState.pendingCount > 0 ? `Offline (${syncState.pendingCount})` : 'Offline';
    Icon = CloudOff;
  } else if (syncState.status === 'syncing') {
    badgeColor = '#3b82f6';
    badgeBg = 'rgba(59, 130, 246, 0.2)';
    badgeBorder = 'rgba(59, 130, 246, 0.4)';
    label = 'Sincronizando...';
    Icon = RefreshCw;
  } else if (syncState.pendingCount > 0) {
    badgeColor = '#8b5cf6';
    badgeBg = 'rgba(139, 92, 246, 0.2)';
    badgeBorder = 'rgba(139, 92, 246, 0.4)';
    label = `Fila (${syncState.pendingCount})`;
    Icon = Cloud;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Tooltip label={label} description="Clique para ver o status da rede e fila de sincronização">
        <button
          onClick={() => {
            setQueue(getSyncQueue());
            setIsOpen(!isOpen);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            color: badgeColor,
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
            backdropFilter: 'blur(8px)'
          }}
        >
          <Icon size={12} className={syncState.status === 'syncing' ? 'spin' : ''} />
          <span>{label}</span>
        </button>
      </Tooltip>

      {/* POPOVER DA FILA */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            padding: '12px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backdropFilter: 'blur(16px)',
            color: 'var(--text-primary)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
              {syncState.isOnline ? <Wifi size={14} color="#10b981" /> : <WifiOff size={14} color="#f59e0b" />}
              <span>{syncState.isOnline ? 'Conectado à Internet' : 'Sem Conexão (Modo Offline)'}</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {syncState.lastSyncedAt ? (
              <span>Última sincronização: {new Date(syncState.lastSyncedAt).toLocaleTimeString('pt-BR')}</span>
            ) : (
              <span>Nenhum envio recente registrado.</span>
            )}
          </div>

          {/* LISTA DE PENDÊNCIAS */}
          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {queue.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0', fontStyle: 'italic' }}>
                Todas as alterações locais estão salvas e sincronizadas na nuvem.
              </div>
            ) : (
              queue.map((op, idx) => (
                <div 
                  key={op.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{op.type}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{new Date(op.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {op.retries > 0 && (
                    <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                      {op.retries} retries
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* AÇÕES */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              onClick={handleManualSync}
              disabled={!syncState.isOnline || syncState.status === 'syncing' || queue.length === 0}
              style={{
                flex: 1,
                background: syncState.isOnline && queue.length > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: syncState.isOnline && queue.length > 0 ? '#60a5fa' : 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: syncState.isOnline && queue.length > 0 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} className={syncState.status === 'syncing' ? 'spin' : ''} />
              Sincronizar Agora
            </button>

            {queue.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '6px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                title="Descartar Fila"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
