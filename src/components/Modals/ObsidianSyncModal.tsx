// src/components/Modals/ObsidianSyncModal.tsx
// Modal Arcanum Dark Fantasy para controle e diagnostico da sincronizacao em tempo real com o Obsidian

import React, { useState, useEffect } from 'react';
import { 
  FileText, Activity, RefreshCw, FolderOpen, Play, Pause, 
  CheckCircle2, AlertCircle, Clock, Bell, Zap, X, Shield, Layers
} from 'lucide-react';
import { 
  obsidianWatcherService, 
  ObsidianWatcherState 
} from '../../services/wiki/obsidianWatcherService';
import { openLocalFolder } from '../../utils/githubApi';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { toast } from '../UI/Toast';

interface ObsidianSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ObsidianSyncModal: React.FC<ObsidianSyncModalProps> = ({ isOpen, onClose }) => {
  const [watcherState, setWatcherState] = useState<ObsidianWatcherState>(() => obsidianWatcherService.getState());
  const [serverStatus, setServerStatus] = useState<{ connected: boolean; fileCount: number; lastModified: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = obsidianWatcherService.subscribe(setWatcherState);
    loadStatus();

    return () => { unsubscribe(); };
  }, [isOpen]);

  const loadStatus = async () => {
    const status = await obsidianWatcherService.fetchServerStatus();
    setServerStatus(status);
  };

  if (!isOpen) return null;

  const handleToggleWatcher = () => {
    if (watcherState.status === 'connected' || watcherState.status === 'connecting') {
      obsidianWatcherService.stopWatching();
      toast.info('Sincronizador com Obsidian pausado.');
    } else {
      obsidianWatcherService.startWatching();
      toast.success('Iniciando sincronizador com Obsidian...');
    }
  };

  const handleForceReindex = async () => {
    setIsRefreshing(true);
    try {
      WikiIndexer.clearCache();
      await WikiIndexer.buildIndex();
      window.dispatchEvent(new CustomEvent('wiki-updated'));
      await loadStatus();
      toast.success('Wiki e Códice reindexados com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao reindexar wiki: ' + (err?.message || err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openLocalFolder('');
      toast.info('Abrindo pasta do cofre no Explorador...');
    } catch {
      toast.error('Nao foi possivel abrir a pasta local.');
    }
  };

  const isConnected = watcherState.status === 'connected';
  const isReconnecting = watcherState.status === 'reconnecting' || watcherState.status === 'connecting';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #18110c 0%, #0d0906 100%)',
        border: '1px solid #785a3c',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(168,85,247,0.15)',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f4ece1',
        fontFamily: 'inherit'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(120,90,60,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30,20,12,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(168,85,247,0.4)'
            }}>
              <Activity size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#fef3c7', letterSpacing: '0.5px' }}>
                Sincronizador Obsidian (Tempo Real)
              </h2>
              <p style={{ fontSize: '0.7rem', margin: 0, color: '#a89a8c' }}>
                Watcher bidirecional de notas, fichas e tokens do cofre local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a89a8c', cursor: 'pointer', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card de Status da Conexao */}
          <div style={{
            padding: '14px',
            background: isConnected ? 'rgba(34,197,94,0.08)' : isReconnecting ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${isConnected ? 'rgba(34,197,94,0.3)' : isReconnecting ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : isReconnecting ? '#eab308' : '#ef4444',
                boxShadow: `0 0 10px ${isConnected ? '#22c55e' : isReconnecting ? '#eab308' : '#ef4444'}`
              }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fef3c7' }}>
                  {isConnected ? '🟢 Conectado ao Cofre Local' : isReconnecting ? '🟡 Conectando / Reconectando...' : '⚪ Sincronizador Pausado'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#a89a8c', marginTop: '2px' }}>
                  {watcherState.repoPath}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleWatcher}
              style={{
                padding: '6px 12px',
                background: isConnected ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                border: `1px solid ${isConnected ? '#ef4444' : '#22c55e'}`,
                borderRadius: '6px',
                color: isConnected ? '#f87171' : '#4ade80',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isConnected ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Conectar</>}
            </button>
          </div>

          {/* Estatisticas do Cofre */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ padding: '8px', background: 'rgba(30,20,12,0.6)', border: '1px solid #4a3424', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#c084fc' }}>
                {serverStatus?.fileCount ?? '--'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#a89a8c' }}>Notas Markdown</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(30,20,12,0.6)', border: '1px solid #4a3424', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#60a5fa' }}>
                {watcherState.totalSyncedEvents}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#a89a8c' }}>Eventos Sincronizados</div>
            </div>
            <div style={{ padding: '8px', background: 'rgba(30,20,12,0.6)', border: '1px solid #4a3424', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399' }}>
                {watcherState.lastSyncAt ? new Date(watcherState.lastSyncAt).toLocaleTimeString() : 'Nenhum'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#a89a8c' }}>Ultimo Sync</div>
            </div>
          </div>

          {/* Opcoes de Sincronizacao */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(20,14,8,0.5)', border: '1px solid #4a3424', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Preferencias de Sincronizacao
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', cursor: 'pointer', color: '#e2d9cd' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#fbbf24" /> Sincronizar Tokens no Mapa (HP, PM, Ouro)
              </span>
              <input
                type="checkbox"
                checked={watcherState.autoSyncTokens}
                onChange={(e) => obsidianWatcherService.setOptions({ autoSyncTokens: e.target.checked })}
                style={{ accentColor: '#f59e0b', width: '15px', height: '15px' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', cursor: 'pointer', color: '#e2d9cd' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={14} color="#60a5fa" /> Notificacoes Toast ao alterar arquivos
              </span>
              <input
                type="checkbox"
                checked={watcherState.notifyOnSync}
                onChange={(e) => obsidianWatcherService.setOptions({ notifyOnSync: e.target.checked })}
                style={{ accentColor: '#f59e0b', width: '15px', height: '15px' }}
              />
            </label>
          </div>

          {/* Feed de Eventos Recentes */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Alteracoes Recentes do Obsidian
            </div>

            <div style={{
              maxHeight: '180px',
              overflowY: 'auto',
              background: '#100b07',
              border: '1px solid #4a3424',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {watcherState.history.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.72rem', color: '#786858' }}>
                  Nenhuma alteracao detectada na sessao atual. Edite uma nota no Obsidian para testar!
                </div>
              ) : (
                watcherState.history.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: '6px 10px',
                      background: 'rgba(30,20,12,0.4)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: ev.type === 'change' ? 'rgba(59,130,246,0.2)' : ev.type === 'create' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                        color: ev.type === 'change' ? '#60a5fa' : ev.type === 'create' ? '#4ade80' : '#f87171',
                        textTransform: 'uppercase'
                      }}>
                        {ev.type}
                      </span>
                      <span style={{ color: '#fef3c7', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {ev.path || 'Evento de conexao'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: '#786858', flexShrink: 0, marginLeft: '8px' }}>
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(120,90,60,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(20,14,8,0.8)'
        }}>
          <button
            onClick={handleOpenFolder}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #5a422e',
              borderRadius: '6px',
              color: '#d7c9b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <FolderOpen size={13} /> Abrir no Windows
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleForceReindex}
              disabled={isRefreshing}
              style={{
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                border: '1px solid #c084fc',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
              {isRefreshing ? 'Reindexando...' : 'Reindexar Wiki'}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                background: '#3a271c',
                border: '1px solid #5a422e',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
