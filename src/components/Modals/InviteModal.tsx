import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, Copy, Check, QrCode, Globe, RefreshCw, 
  ExternalLink, Link as LinkIcon, Wifi, 
  Lock, Unlock, Dices, Compass, Folder, Save, X, Eye, EyeOff
} from 'lucide-react';
import { state } from '../../services/yjs';
import { Tokens } from '../../store/modules/tokenModule';
import { useIsGM } from '../../store/user';
import { useAuthStore } from '../../store/authStore';
import { useWindowManager } from '../../hooks/useWindowManager';
import { getWikiConfig, updateWikiConfig } from '../../store/wiki';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { createOrUpdateCampaign, getCampaigns } from '../../services/campaignCloudService';
import { getVercelRoomUrl, getRoomUrl, getCurrentRoomCode, navigateToRoom } from '../../utils/roomUrl';
import { toast } from '../UI/Toast';

interface InviteModalProps {
  onClose: () => void;
}

type TabType = 'invite' | 'players' | 'rooms';

export const InviteModal: React.FC<InviteModalProps> = ({ onClose }) => {
  const isGM = useIsGM();
  const { user } = useAuthStore();
  const { setActiveModal } = useWindowManager();

  const [activeTab, setActiveTab] = useState<TabType>('invite');
  const [copiedVercel, setCopiedVercel] = useState(false);
  const [copiedLan, setCopiedLan] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Yjs Live Players State
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [searchPlayer, setSearchPlayer] = useState('');

  // Room / Campaign State
  const currentRoom = getCurrentRoomCode();
  const [roomNameTitle, setRoomNameTitle] = useState('');
  const [wikiPath, setWikiPath] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [newRoom, setNewRoom] = useState('');

  // Sincronizacao e escuta de players e tokens
  useEffect(() => {
    const updateLocalLists = () => {
      try {
        const pArr = Array.from(state.players.values());
        setPlayersList(pArr);
        const tArr = Tokens.getAll();
        setTokensList(tArr);
      } catch (err) {
        console.error('Erro ao sincronizar lista de jogadores Yjs:', err);
      }
    };

    updateLocalLists();

    const handleYjsChange = () => {
      updateLocalLists();
    };

    state.players.observe(handleYjsChange);
    state.tokens.observe(handleYjsChange);
    window.addEventListener('tokens-updated', handleYjsChange);

    return () => {
      state.players.unobserve(handleYjsChange);
      state.tokens.unobserve(handleYjsChange);
      window.removeEventListener('tokens-updated', handleYjsChange);
    };
  }, []);

  // Carregar dados da sala atual
  useEffect(() => {
    const wConfig = getWikiConfig();
    if (wConfig?.basePath) {
      setWikiPath(wConfig.basePath);
    }

    const loadCampaignData = async () => {
      try {
        const campaigns = await getCampaigns(user?.id);
        const currentCamp = campaigns.find(c => c.id === currentRoom || c.name === currentRoom);
        if (currentCamp) {
          setRoomNameTitle(currentCamp.name || currentRoom);
          setIsPublic(currentCamp.is_public ?? true);
          setIsClosed(currentCamp.is_closed ?? false);
          if (currentCamp.wiki_path) {
            setWikiPath(currentCamp.wiki_path);
          }
        } else {
          setRoomNameTitle(currentRoom);
        }
      } catch (e) {
        setRoomNameTitle(currentRoom);
      }
    };

    loadCampaignData();
  }, [currentRoom, user]);

  // URLs de convite
  const vercelLink = getVercelRoomUrl(currentRoom);
  const inviteLanLink = getRoomUrl(currentRoom);

  const handleCopyVercel = () => {
    navigator.clipboard.writeText(vercelLink);
    setCopiedVercel(true);
    toast.success('Link da Vercel copiado para a area de transferencia!');
    setTimeout(() => setCopiedVercel(false), 2500);
  };

  const handleCopyLan = () => {
    navigator.clipboard.writeText(inviteLanLink);
    setCopiedLan(true);
    toast.success('Link de Rede Local copiado!');
    setTimeout(() => setCopiedLan(false), 2500);
  };

  // Acoes de GM para jogadores
  const handleAssignToken = (playerId: string, tokenId: string) => {
    if (!isGM) return;
    const player = playersList.find(p => p.id === playerId);
    if (!player) return;

    if (tokenId === '') {
      const currentAssigned = tokensList.find(t => t.ownerId === playerId);
      if (currentAssigned) {
        Tokens.update(currentAssigned.id, { ownerId: undefined, ownerName: undefined });
      }
      toast.info(`Ficha desvinculada de ${player.name}`);
      return;
    }

    Tokens.update(tokenId, {
      ownerId: playerId,
      ownerName: player.name || 'Jogador'
    });
    toast.success(`Ficha vinculada ao jogador ${player.name}!`);
  };

  const handleFocusPlayer = (playerId: string) => {
    const assignedToken = tokensList.find(t => t.ownerId === playerId);
    if (assignedToken) {
      state.roomSettings.set('last_gm_action', {
        type: 'summon_camera',
        x: assignedToken.x,
        y: assignedToken.y,
        timestamp: Date.now()
      });
      toast.info(`Camera focada no token de ${assignedToken.name}`);
    } else {
      toast.warning('Este jogador nao possui token vinculado no mapa.');
    }
  };

  const handleRequestRoll = (playerId?: string) => {
    if (!isGM) return;
    state.roomSettings.set('last_gm_action', {
      type: 'request_roll',
      targetPlayerId: playerId || 'all',
      rollType: 'd20',
      reason: 'Solicitacao do Mestre',
      timestamp: Date.now()
    });
    toast.success(playerId ? 'Solicitacao de rolagem enviada ao jogador!' : 'Solicitacao de rolagem geral enviada a todos!');
  };

  const handleToggleLockMovement = (playerId: string) => {
    const assignedToken = tokensList.find(t => t.ownerId === playerId);
    if (assignedToken) {
      const isLocked = !!assignedToken.movementLocked;
      Tokens.update(assignedToken.id, { movementLocked: !isLocked });
      toast.info(isLocked ? `Movimentacao de ${assignedToken.name} liberada.` : `Movimentacao de ${assignedToken.name} travada.`);
    }
  };

  const handleSaveRoomSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wikiPath) {
      updateWikiConfig({ basePath: wikiPath.trim() });
      WikiIndexer.clearCache();
    }

    try {
      await createOrUpdateCampaign({
        id: currentRoom,
        name: roomNameTitle.trim() || currentRoom,
        is_public: isPublic,
        is_closed: isClosed,
        wiki_path: wikiPath.trim(),
        user_id: user?.id
      });
      toast.success('Configuracoes da mesa salvas com sucesso!');
    } catch (err: any) {
      toast.warning('Configuracoes aplicadas localmente na sessao.');
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    const cleanRoom = newRoom.trim().toLowerCase().replace(/\s+/g, '-');
    navigateToRoom(cleanRoom);
    onClose();
  };

  const handleRandomRoom = () => {
    const adjectives = ['antigo', 'sombrio', 'arcano', 'mistico', 'perdido', 'eterno', 'dourado', 'esquecido'];
    const nouns = ['dragao', 'grimorio', 'castelo', 'labirinto', 'vale', 'abismo', 'templo', 'portal'];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}-${Math.floor(10 + Math.random() * 90)}`;
    setNewRoom(randomName);
  };

  const filteredPlayers = playersList.filter(p => 
    (p.name || 'Jogador').toLowerCase().includes(searchPlayer.toLowerCase()) ||
    (p.id || '').toLowerCase().includes(searchPlayer.toLowerCase())
  );

  return (
    <div 
      className="modal-backdrop pointer-events-auto"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(26, 17, 11, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid #c49a6c',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 25px rgba(196, 154, 108, 0.2)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
          background: 'rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(196, 154, 108, 0.15)',
              border: '1px solid #c49a6c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} color="#c49a6c" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Central da Mesa & Jogadores
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Sessao atual: <strong style={{ color: '#c49a6c' }}>{currentRoom}</strong> • {playersList.length} conectados
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          padding: '8px 16px 0',
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid var(--glass-border)',
          gap: '6px'
        }}>
          <button
            onClick={() => setActiveTab('invite')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: activeTab === 'invite' ? 'rgba(196, 154, 108, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'invite' ? '2px solid #c49a6c' : '2px solid transparent',
              color: activeTab === 'invite' ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'invite' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              transition: 'all 0.15s'
            }}
          >
            <LinkIcon size={14} /> Convidar & Acesso
          </button>

          <button
            onClick={() => setActiveTab('players')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: activeTab === 'players' ? 'rgba(196, 154, 108, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'players' ? '2px solid #c49a6c' : '2px solid transparent',
              color: activeTab === 'players' ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'players' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              transition: 'all 0.15s'
            }}
          >
            <Users size={14} /> Jogadores na Mesa ({playersList.length})
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: activeTab === 'rooms' ? 'rgba(196, 154, 108, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'rooms' ? '2px solid #c49a6c' : '2px solid transparent',
              color: activeTab === 'rooms' ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'rooms' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              transition: 'all 0.15s'
            }}
          >
            <Globe size={14} /> Campanhas & Salas
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ABA 1: CONVIDAR & LINKS DE ACESSO */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'invite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Vercel Official Link Section */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(164,104,48,0.15) 0%, rgba(20,20,30,0.3) 100%)',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid #c49a6c',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} color="#c49a6c" />
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 800 }}>
                        Link da Nuvem (Vercel / Online)
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Envie este link para jogadores remotos em qualquer lugar do mundo.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowQR(!showQR)}
                    style={{
                      background: showQR ? '#c49a6c' : 'rgba(255,255,255,0.06)',
                      border: '1px solid #c49a6c',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: showQR ? '#000' : 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    <QrCode size={14} /> {showQR ? 'Ocultar QR' : 'Exibir QR Code'}
                  </button>
                </div>

                {showQR && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    margin: '6px auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}>
                    <QRCodeSVG value={vercelLink} size={150} />
                    <span style={{ color: '#000', fontSize: '0.72rem', fontWeight: 700, marginTop: '8px' }}>
                      Aponte a camera do celular para entrar na mesa
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    readOnly
                    value={vercelLink}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={handleCopyVercel}
                    style={{
                      padding: '9px 16px',
                      background: copiedVercel ? 'var(--success)' : 'var(--accent-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copiedVercel ? <Check size={16} /> : <Copy size={16} />}
                    {copiedVercel ? 'Copiado!' : 'Copiar Link'}
                  </button>
                </div>
              </div>

              {/* Local Network (Wi-Fi) Section */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wifi size={16} color="var(--accent-secondary)" />
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>
                      Presencial (Mesmo Wi-Fi / Rede Local)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Para quem esta conectado no mesmo roteador na mesma casa.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    readOnly
                    value={inviteLanLink}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '0.8rem'
                    }}
                  />
                  <button
                    onClick={handleCopyLan}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--accent-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}
                  >
                    {copiedLan ? <Check size={15} /> : <Copy size={15} />}
                    {copiedLan ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ABA 2: JOGADORES NA MESA */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'players' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Buscar participante por nome ou ID..."
                  value={searchPlayer}
                  onChange={e => setSearchPlayer(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />

                {isGM && (
                  <button
                    onClick={() => handleRequestRoll()}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--accent-glow)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Dices size={14} /> Pedir Rolagem Geral
                  </button>
                )}
              </div>

              {/* Lista de Jogadores */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                {filteredPlayers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Nenhum jogador conectado no momento. Compartilhe o link de convite!
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const assignedToken = tokensList.find(t => t.ownerId === player.id);
                    const isMovementLocked = assignedToken?.movementLocked;

                    return (
                      <div
                        key={player.id}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: player.color || 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#fff',
                            fontSize: '0.85rem'
                          }}>
                            {(player.name || 'J').charAt(0).toUpperCase()}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {player.name || 'Jogador Anonimo'}
                              </span>
                              {player.isGM && (
                                <span style={{ fontSize: '0.62rem', background: 'rgba(234,179,8,0.2)', color: 'var(--warning)', border: '1px solid var(--warning)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  MESTRE
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                Ficha: <strong style={{ color: assignedToken ? 'var(--success)' : 'var(--text-secondary)' }}>{assignedToken ? assignedToken.name : 'Nenhuma'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Acoes do Mestre */}
                        {isGM && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <select
                              value={assignedToken?.id || ''}
                              onChange={(e) => handleAssignToken(player.id, e.target.value)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                fontSize: '0.72rem'
                              }}
                            >
                              <option value="">-- Vincular Ficha --</option>
                              {tokensList.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleFocusPlayer(player.id)}
                              title="Focar Camera no Token"
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            >
                              <Compass size={13} />
                            </button>

                            <button
                              onClick={() => handleRequestRoll(player.id)}
                              title="Pedir Rolagem de Dado"
                              style={{ padding: '6px', borderRadius: '6px', background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', cursor: 'pointer' }}
                            >
                              <Dices size={13} />
                            </button>

                            {assignedToken && (
                              <button
                                onClick={() => handleToggleLockMovement(player.id)}
                                title={isMovementLocked ? 'Destravar Movimentacao' : 'Travar Movimentacao'}
                                style={{ padding: '6px', borderRadius: '6px', background: isMovementLocked ? 'rgba(239,68,68,0.2)' : 'var(--bg-secondary)', border: `1px solid ${isMovementLocked ? 'var(--danger)' : 'var(--glass-border)'}`, color: isMovementLocked ? 'var(--danger)' : 'var(--text-primary)', cursor: 'pointer' }}
                              >
                                {isMovementLocked ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* ABA 3: CAMPANHAS & GESTAO DA SALA */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'rooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Form Configuracoes da Mesa Atual */}
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Folder size={16} color="var(--accent-primary)" /> Configuracoes da Mesa Atual ({currentRoom})
                  </h4>
                  <span style={{ fontSize: '0.65rem', color: user ? 'var(--success)' : 'var(--warning)', background: user ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${user ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                    {user ? 'Nuvem Supabase' : 'Armazenamento Local'}
                  </span>
                </div>

                <form onSubmit={handleSaveRoomSettings} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: 600 }}>
                        Nome da Mesa / Aventura:
                      </label>
                      <input
                        type="text"
                        value={roomNameTitle}
                        onChange={e => setRoomNameTitle(e.target.value)}
                        placeholder="Ex: A Maldicao de Strahd"
                        style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '0.78rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '3px', fontWeight: 700 }}>
                        Pasta Local da Wiki:
                      </label>
                      <input
                        type="text"
                        value={wikiPath}
                        onChange={e => setWikiPath(e.target.value)}
                        placeholder="Ex: D:/DOZERO/wikidozero"
                        style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      style={{ padding: '7px', borderRadius: '6px', background: isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${isPublic ? 'var(--success)' : 'var(--danger)'}`, color: isPublic ? 'var(--success)' : 'var(--danger)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      {isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                      {isPublic ? 'Publica no Mural' : 'Oculta'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsClosed(!isClosed)}
                      style={{ padding: '7px', borderRadius: '6px', background: isClosed ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', border: `1px solid ${isClosed ? 'var(--danger)' : 'var(--accent-primary)'}`, color: isClosed ? 'var(--danger)' : 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      {isClosed ? <Lock size={12} /> : <Unlock size={12} />}
                      {isClosed ? 'Trancada' : 'Aberta'}
                    </button>

                    <button
                      type="submit"
                      style={{ padding: '7px 14px', background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                    >
                      <Save size={13} /> Salvar Mesa
                    </button>
                  </div>
                </form>
              </div>

              {/* Mural de Campanhas & Troca de Salas */}
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Globe size={16} color="var(--accent-secondary)" /> Mural de Campanhas & Trocar de Mesa
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      setActiveModal('lobby');
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Mural em Tela Cheia <ExternalLink size={12} />
                  </button>
                </div>

                {/* Troca Rapida de Sala */}
                <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={e => setNewRoom(e.target.value)}
                    placeholder="Nome da sala para entrar ou criar (ex: caverna-goblins)"
                    style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '6px', fontSize: '0.78rem' }}
                  />
                  <button type="button" onClick={handleRandomRoom} className="btn-icon theme-blue" title="Gerar nome aleatorio" style={{ padding: '7px' }}>
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="submit"
                    disabled={!newRoom.trim()}
                    style={{ padding: '7px 14px', background: newRoom.trim() ? 'var(--accent-primary)' : 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: newRoom.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                  >
                    Entrar na Sala
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
