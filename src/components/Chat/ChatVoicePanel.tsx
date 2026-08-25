import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Monitor, MonitorOff, PhoneCall, PhoneOff, 
  Users, Volume2, Shield, Maximize2, Radio, Sparkles, AlertCircle
} from 'lucide-react';
import { WebRTCVoiceManager, PeerStreamState } from '../../services/webrtcVoiceManager';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../UI/Toast';

interface Props {
  roomCode: string;
}

export const ChatVoicePanel: React.FC<Props> = ({ roomCode }) => {
  const { user } = useAuthStore();
  const [manager, setManager] = useState<WebRTCVoiceManager | null>(null);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [peers, setPeers] = useState<PeerStreamState[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Aventureiro');
  const userAvatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const handleJoinCall = async () => {
    const mgr = new WebRTCVoiceManager(roomCode, userName);
    const stream = await mgr.startVoice();
    if (stream) {
      mgr.subscribe((updatedPeers) => {
        setPeers(updatedPeers);
      });
      setManager(mgr);
      setInCall(true);
      toast.success('Conectado à sala de voz da mesa!');
    } else {
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const handleLeaveCall = () => {
    if (manager) {
      manager.leave();
      setManager(null);
    }
    setInCall(false);
    setIsSharingScreen(false);
    setPeers([]);
    toast.info('Você saiu da chamada de voz.');
  };

  const handleToggleMute = () => {
    if (manager) {
      const muted = manager.toggleMute();
      setIsMuted(muted);
      toast.info(muted ? 'Microfone Mutado' : 'Microfone Aberto');
    }
  };

  const handleToggleScreen = async () => {
    if (!manager) {
      toast.info('Entre na chamada de voz para compartilhar a tela.');
      return;
    }
    if (isSharingScreen) {
      manager.stopScreenShare();
      setIsSharingScreen(false);
      toast.info('Compartilhamento de tela finalizado.');
    } else {
      const screenStream = await manager.startScreenShare();
      if (screenStream) {
        setIsSharingScreen(true);
        toast.success('Compartilhando sua tela com a mesa!');
      }
    }
  };

  const screenPeer = peers.find(p => p.isScreenShare);

  useEffect(() => {
    if (screenPeer && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenPeer.stream;
    }
  }, [screenPeer]);

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.warn('Erro ao abrir tela cheia:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: '#120d0a',
      color: '#fdfaf5',
      padding: '14px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      gap: '14px'
    }}>
      {/* CARD PRINCIPAL DE STATUS */}
      <div style={{
        background: inCall 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(20, 14, 10, 0.8))'
          : 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(20, 14, 10, 0.8))',
        border: `1px solid ${inCall ? 'rgba(34, 197, 94, 0.35)' : 'rgba(90, 66, 52, 0.6)'}`,
        borderRadius: '12px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: inCall ? '#22c55e' : '#71717a',
              boxShadow: inCall ? '0 0 10px #22c55e' : 'none'
            }} />
            <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.5px' }}>
              {inCall ? 'SALA DE VOZ CONECTADA' : 'CANAL DE VOZ DISPONÍVEL'}
            </span>
          </div>

          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            color: inCall ? '#4ade80' : '#a1a1aa',
            fontWeight: 600
          }}>
            {inCall ? `${peers.length + 1} Conectados` : 'Desconectado'}
          </span>
        </div>

        {/* BOTÕES PRINCIPAIS DE CONTROLE */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!inCall ? (
            <button
              onClick={handleJoinCall}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                color: '#ffffff',
                border: '1px solid #22c55e',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
              }}
            >
              <PhoneCall size={16} /> Entrar na Voz P2P
            </button>
          ) : (
            <>
              {/* MUTAR MICROFONE */}
              <button
                onClick={handleToggleMute}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                  border: `1px solid ${isMuted ? '#ef4444' : '#22c55e'}`,
                  borderRadius: '8px',
                  color: isMuted ? '#f87171' : '#4ade80',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                {isMuted ? 'Microfone Mudo' : 'Microfone Aberto'}
              </button>

              {/* COMPARTILHAR TELA */}
              <button
                onClick={handleToggleScreen}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  background: isSharingScreen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${isSharingScreen ? '#38bdf8' : '#5a4234'}`,
                  borderRadius: '8px',
                  color: isSharingScreen ? '#38bdf8' : '#fdfaf5',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {isSharingScreen ? <MonitorOff size={15} /> : <Monitor size={15} />}
                {isSharingScreen ? 'Parar Tela' : 'Compartilhar'}
              </button>

              {/* DESCONECTAR */}
              <button
                onClick={handleLeaveCall}
                title="Desconectar da Voz"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
              >
                <PhoneOff size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEED DE VÍDEO / COMPARTILHAMENTO DE TELA */}
      {screenPeer && (
        <div 
          ref={videoContainerRef}
          style={{
            position: 'relative',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#000',
            border: '1px solid #38bdf8',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            color: '#38bdf8',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Monitor size={13} />
            Transmitindo: {screenPeer.userName}
          </div>

          <button
            onClick={handleToggleFullscreen}
            title="Alternar Tela Cheia"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.7)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      )}

      {/* LISTA DE JOGADORES NA CHAMADA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4c4a4', fontSize: '0.8rem', fontWeight: 700 }}>
          <Users size={14} />
          <span>PARTICIPANTES DA MESA ({inCall ? peers.length + 1 : 0})</span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(90, 66, 52, 0.4)',
          borderRadius: '10px',
          padding: '8px'
        }}>
          {/* VOCÊ */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px',
            borderRadius: '8px',
            background: inCall ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
            border: inCall ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#3b2518',
                border: inCall && !isMuted ? '2px solid #22c55e' : '2px solid #5a4234',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userName[0]?.toUpperCase() || 'J'
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fdfaf5' }}>
                  {userName} <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>(Você)</span>
                </span>
                <span style={{ fontSize: '0.7rem', color: inCall ? (isMuted ? '#f87171' : '#4ade80') : '#71717a' }}>
                  {inCall ? (isMuted ? 'Microfone Desativado' : 'Conectado e Transmitindo') : 'Fora da chamada'}
                </span>
              </div>
            </div>

            {inCall && (
              <div style={{ color: isMuted ? '#f87171' : '#4ade80' }}>
                {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
              </div>
            )}
          </div>

          {/* OUTROS JOGADORES NA CHAMADA */}
          {peers.map((peer) => (
            <div
              key={peer.peerId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#271b12',
                  border: peer.isMuted ? '2px solid #5a4234' : '2px solid #22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#e8dcc4'
                }}>
                  {peer.userName[0]?.toUpperCase() || 'P'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fdfaf5' }}>
                    {peer.userName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: peer.isMuted ? '#f87171' : '#4ade80' }}>
                    {peer.isMuted ? 'Silenciado' : 'Falando'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {peer.isScreenShare && (
                  <span style={{ color: '#38bdf8' }} title="Transmitindo Tela">
                    <Monitor size={14} />
                  </span>
                )}
                <span style={{ color: peer.isMuted ? '#f87171' : '#4ade80' }}>
                  {peer.isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                </span>
              </div>
            </div>
          ))}

          {inCall && peers.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '12px 8px',
              color: '#a1a1aa',
              fontSize: '0.75rem',
              fontStyle: 'italic'
            }}>
              Aguardando outros jogadores entrarem na sala de voz...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
