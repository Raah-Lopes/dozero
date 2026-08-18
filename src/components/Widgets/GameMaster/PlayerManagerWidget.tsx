import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state } from '../../../services/yjs';
import { Tokens } from '../../../store/modules/tokenModule';
import { toast } from '../../UI/Toast';
import { 
  Users, 
  Shield, 
  Activity, 
  Edit2, 
  Trash2, 
  Compass, 
  Dices, 
  Lock, 
  Unlock, 
  Heart, 
  Flame, 
  Check, 
  X, 
  UserCheck, 
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';

interface PlayerData {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
  userId?: string;
  isOnline?: boolean;
}

interface TokenBrief {
  id: string;
  name: string;
  hp?: number;
  maxHp?: number;
  mana?: number;
  maxMana?: number;
  locked?: boolean;
  status_efeitos?: string[];
  imageUrl?: string;
  ownerId?: string;
  ownerName?: string;
  wikiPath?: string;
}

import { useIsGM } from '../../../store/user';

export const PlayerManagerWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const isGM = useIsGM();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [tokens, setTokens] = useState<TokenBrief[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Modal de Solicitação de Teste Rápido
  const [requestRollTarget, setRequestRollTarget] = useState<PlayerData | null>(null);
  const [rollLabel, setRollLabel] = useState('Percepção');
  const [rollFormula, setRollFormula] = useState('1d20');

  if (!isGM) {
    return (
      <DraggableWindow 
        id="player_manager" 
        widgetKey="playerManager" 
        title="👑 Acesso Restrito" 
        onClose={onClose} 
        initialX={150} 
        initialY={150} 
        width={360} 
        height={180}
      >
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Shield size={36} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)' }}>Apenas o Mestre tem acesso a este painel administrativo.</p>
        </div>
      </DraggableWindow>
    );
  }

  useEffect(() => {
    const updatePlayers = () => {
      const pList: PlayerData[] = [];
      state.players.forEach((val, key) => {
        pList.push({ id: key, ...(val as any) });
      });
      setPlayers(pList);
    };

    const updateTokens = () => {
      const tList: TokenBrief[] = [];
      state.tokens.forEach((val: any, key: string) => {
        tList.push({
          id: key,
          name: val.name || 'Token sem nome',
          hp: val.hp ?? val.pv ?? 100,
          maxHp: val.maxHp ?? val.pvMax ?? val.hp ?? 100,
          mana: val.mana ?? val.pm ?? 50,
          maxMana: val.maxMana ?? val.pmMax ?? val.mana ?? 50,
          locked: !!val.locked,
          status_efeitos: Array.isArray(val.status_efeitos) ? val.status_efeitos : [],
          imageUrl: val.imageUrl,
          ownerId: val.ownerId,
          ownerName: val.ownerName,
          wikiPath: val.wikiPath || val.caminhoArquivo
        });
      });
      setTokens(tList);
    };

    state.players.observe(updatePlayers);
    state.tokens.observe(updateTokens);
    updatePlayers();
    updateTokens();

    return () => {
      state.players.unobserve(updatePlayers);
      state.tokens.unobserve(updateTokens);
    };
  }, []);

  const handleSaveIdentity = (id: string) => {
    const current = state.players.get(id) as any;
    if (current) {
      state.players.set(id, { ...current, name: editName, color: editColor });
      toast.success(`Identidade de ${editName} atualizada.`);
    }
    setEditingId(null);
  };

  // Atribuir Token ao Jogador
  const handleAssignToken = (player: PlayerData, tokenId: string) => {
    if (!tokenId) {
      // Desvincular todos os tokens atribuídos a este jogador
      tokens.filter(t => t.ownerId === player.userId || t.ownerName === player.name).forEach(t => {
        Tokens.update(t.id, { ownerId: undefined, ownerName: undefined });
      });
      toast.info(`Desvinculado token de ${player.name}.`);
      return;
    }

    // Vincula o token selecionado
    Tokens.update(tokenId, {
      ownerId: player.userId || undefined,
      ownerName: player.name
    });
    toast.success(`Token vinculado a ${player.name}!`);
  };

  // Puxar câmera / Focar visão do jogador no seu token ou no mapa
  const handleSummonCamera = (player: PlayerData, token?: TokenBrief) => {
    if (token) {
      state.roomSettings.set('last_gm_action', {
        type: 'summon_camera',
        tokenId: token.id,
        timestamp: Date.now()
      });
      toast.success(`Câmera de todos focada no token de ${player.name}!`);
    } else {
      // Foca no centro geral
      state.roomSettings.set('last_gm_action', {
        type: 'summon_camera',
        x: 0,
        y: 0,
        scale: 1,
        timestamp: Date.now()
      });
      toast.info('Visão do mapa resetada para todos.');
    }
  };

  // Travar / Destravar Token do Jogador
  const handleToggleLockToken = (token: TokenBrief) => {
    const newLocked = !token.locked;
    Tokens.update(token.id, { locked: newLocked });
    toast.info(`Token ${token.name} ${newLocked ? 'bloqueado 🔒' : 'desbloqueado 🔓'}.`);
  };

  // Enviar Solicitação de Rolagem
  const handleSendRollRequest = () => {
    if (!rollFormula) return;
    state.roomSettings.set('last_gm_action', {
      type: 'request_roll',
      targetPlayerName: requestRollTarget ? requestRollTarget.name : undefined,
      targetUserId: requestRollTarget?.userId,
      label: rollLabel,
      formula: rollFormula,
      timestamp: Date.now()
    });
    toast.success(`Solicitação de ${rollLabel} (${rollFormula}) enviada para ${requestRollTarget ? requestRollTarget.name : 'Todos'}!`);
    setRequestRollTarget(null);
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (p.userId && p.userId.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <DraggableWindow 
      id="player_manager" 
      widgetKey="playerManager" 
      title="👑 Central de Jogadores & Supervisão (Mestre)" 
      onClose={onClose} 
      initialX={120} 
      initialY={80} 
      width={560} 
      height={520}
    >
      <div style={{ padding: '14px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
        
        {/* Header & Ações Globais */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Buscar jogador por nome ou ID..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px 6px 28px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={() => {
              setRequestRollTarget(null);
              setRollLabel('Iniciativa');
              setRollFormula('1d20');
            }}
            title="Pedir Teste Geral para Todos os Jogadores"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(79, 70, 229, 0.4))',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '6px',
              color: '#e9d5ff',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Dices size={14} /> Pedir Rolagem Geral
          </button>
        </div>

        {/* Modal Inline: Solicitar Teste */}
        {requestRollTarget !== null && (
          <div style={{
            background: 'rgba(20, 20, 35, 0.95)',
            border: '1px solid var(--accent-primary)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Dices size={16} /> Solicitar Rolagem para: <span style={{ color: 'white' }}>{requestRollTarget.name}</span>
              </span>
              <button onClick={() => setRequestRollTarget(null)} style={{ background: 'none', border: 'none', color: 'gray', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Nome do Teste / Perícia</label>
                <input
                  value={rollLabel}
                  onChange={e => setRollLabel(e.target.value)}
                  placeholder="Ex: Percepção, Sanidade, Ataque"
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: 'white', fontSize: '0.75rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ width: '120px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Fórmula</label>
                <input
                  value={rollFormula}
                  onChange={e => setRollFormula(e.target.value)}
                  placeholder="1d20+2"
                  style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: '#a855f7', fontWeight: 'bold', fontSize: '0.75rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Presets Rápidos */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['1d20 (D20)', '1d100 (D100)', '1d20+Vantagem', '1d6', '1d10'].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    const f = p.split(' ')[0];
                    setRollFormula(f);
                  }}
                  style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              <button 
                onClick={() => setRequestRollTarget(null)}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendRollRequest}
                style={{ padding: '4px 14px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Enviar Requisição
              </button>
            </div>
          </div>
        )}

        {/* Lista de Jogadores */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {filteredPlayers.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem', fontSize: '0.85rem' }}>
              <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              Nenhum jogador encontrado ou conectado no momento.
            </div>
          )}

          {filteredPlayers.map(player => {
            // Encontra o token vinculado a este jogador
            const assignedToken = tokens.find(t => 
              (player.userId && t.ownerId === player.userId) || 
              (t.ownerName && t.ownerName.toLowerCase() === player.name.toLowerCase())
            );

            const hpPercent = assignedToken && assignedToken.maxHp ? Math.min(100, Math.max(0, ((assignedToken.hp || 0) / assignedToken.maxHp) * 100)) : 0;
            const manaPercent = assignedToken && assignedToken.maxMana ? Math.min(100, Math.max(0, ((assignedToken.mana || 0) / assignedToken.maxMana) * 100)) : 0;

            return (
              <div 
                key={player.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${assignedToken ? 'rgba(168, 85, 247, 0.25)' : 'var(--glass-border)'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'background 0.2s, border 0.2s'
                }}
              >
                {/* Linha Superior: Avatar, Nome, Status e Botões de Ação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  
                  {/* Avatar com badge online */}
                  <div style={{ position: 'relative' }}>
                    {player.avatar ? (
                      <img 
                        src={player.avatar} 
                        alt={player.name} 
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${player.color || '#a855f7'}` }} 
                      />
                    ) : (
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: player.color || '#a855f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        boxShadow: `0 0 10px ${player.color || '#a855f7'}40`
                      }}>
                        {player.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '-1px',
                        right: '-1px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: player.isOnline !== false ? '#22c55e' : '#ef4444',
                        border: '2px solid #0f172a',
                        boxShadow: `0 0 6px ${player.isOnline !== false ? '#22c55e' : '#ef4444'}`
                      }}
                      title={player.isOnline !== false ? 'Online e Conectado' : 'Desconectado'}
                    />
                  </div>

                  {/* Nome e Edição */}
                  {editingId === player.id ? (
                    <div style={{ flex: 1, display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        style={{ width: '26px', height: '26px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      />
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--accent-primary)', background: 'rgba(0,0,0,0.6)', color: editColor || 'white', fontWeight: 'bold', fontSize: '0.85rem' }}
                        autoFocus
                      />
                      <button 
                        onClick={() => handleSaveIdentity(player.id)}
                        style={{ padding: '4px 8px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: player.color || 'white', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {player.name}
                        </span>
                        {player.userId && (
                          <span style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            Auth
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        Sessão: {player.id.substring(0, 8)}...
                      </div>
                    </div>
                  )}

                  {/* Botões de Ações do Mestre */}
                  {editingId !== player.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      
                      {/* Puxar Câmera */}
                      <button
                        onClick={() => handleSummonCamera(player, assignedToken)}
                        title={assignedToken ? `Focar Câmera no Token de ${player.name}` : "Centralizar Câmera do Mapa"}
                        style={{ padding: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#60a5fa', cursor: 'pointer' }}
                      >
                        <Compass size={14} />
                      </button>

                      {/* Pedir Teste / Rolagem */}
                      <button
                        onClick={() => {
                          setRequestRollTarget(player);
                          setRollLabel('Percepção');
                          setRollFormula('1d20');
                        }}
                        title={`Solicitar Teste/Rolagem para ${player.name}`}
                        style={{ padding: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#c084fc', cursor: 'pointer' }}
                      >
                        <Dices size={14} />
                      </button>

                      {/* Travar / Destravar Token */}
                      {assignedToken && (
                        <button
                          onClick={() => handleToggleLockToken(assignedToken)}
                          title={assignedToken.locked ? "Destravar Token" : "Travar Movimentação do Token"}
                          style={{
                            padding: '5px',
                            background: assignedToken.locked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${assignedToken.locked ? 'rgba(239, 68, 68, 0.4)' : 'var(--glass-border)'}`,
                            borderRadius: '4px',
                            color: assignedToken.locked ? '#f87171' : '#94a3b8',
                            cursor: 'pointer'
                          }}
                        >
                          {assignedToken.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      )}

                      {/* Editar Nome/Cor */}
                      <button
                        onClick={() => {
                          setEditingId(player.id);
                          setEditName(player.name);
                          setEditColor(player.color || '#a855f7');
                        }}
                        title="Forçar Nome e Cor"
                        style={{ padding: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Excluir da sessão */}
                      <button
                        onClick={() => {
                          if (confirm(`Remover ${player.name} da lista de jogadores?`)) {
                            state.players.delete(player.id);
                          }
                        }}
                        title="Desconectar / Remover Jogador"
                        style={{ padding: '5px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Linha Inferior: Vínculo de Token & Mini Vitalidade */}
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={12} color="#a855f7" /> Personagem Atribuído:
                    </span>

                    <select
                      value={assignedToken ? assignedToken.id : ''}
                      onChange={e => handleAssignToken(player, e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '4px',
                        color: assignedToken ? '#f1f5f9' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        outline: 'none',
                        cursor: 'pointer',
                        maxWidth: '220px'
                      }}
                    >
                      <option value="">(Nenhum / Desvinculado)</option>
                      {tokens.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.ownerName && t.ownerName !== player.name ? `(de ${t.ownerName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barras de HP / Mana se houver token vinculado */}
                  {assignedToken && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem' }}>
                        
                        {/* HP Bar */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Heart size={11} color="#ef4444" />
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${hpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontFamily: 'monospace', color: '#fca5a5', minWidth: '45px', textAlign: 'right' }}>
                            {assignedToken.hp}/{assignedToken.maxHp}
                          </span>
                        </div>

                        {/* Mana / PM Bar */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Flame size={11} color="#3b82f6" />
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${manaPercent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontFamily: 'monospace', color: '#93c5fd', minWidth: '45px', textAlign: 'right' }}>
                            {assignedToken.mana}/{assignedToken.maxMana}
                          </span>
                        </div>
                      </div>

                      {/* Tags de Condições Ativas */}
                      {assignedToken.status_efeitos && assignedToken.status_efeitos.length > 0 && (
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {assignedToken.status_efeitos.map((cond, idx) => (
                            <span 
                              key={idx}
                              style={{
                                fontSize: '0.6rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: cond === 'Morto' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.2)',
                                color: cond === 'Morto' ? '#fca5a5' : '#fcd34d',
                                border: `1px solid ${cond === 'Morto' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`
                              }}
                            >
                              {cond}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </DraggableWindow>
  );
};
