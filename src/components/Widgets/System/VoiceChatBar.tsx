import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Monitor, MonitorOff, PhoneCall, PhoneOff, Users, Volume2 } from 'lucide-react';
import { WebRTCVoiceManager, PeerStreamState } from '../../../services/webrtcVoiceManager';
import { useAuthStore } from '../../../store/authStore';
import { toast } from '../../UI/Toast';

interface Props {
  roomCode: string;
}

export const VoiceChatBar: React.FC<Props> = ({ roomCode }) => {
  const { user } = useAuthStore();
  const [manager, setManager] = useState<WebRTCVoiceManager | null>(null);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [peers, setPeers] = useState<PeerStreamState[]>([]);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Jogador';

  const handleJoinCall = async () => {
    const mgr = new WebRTCVoiceManager(roomCode, userName);
    const stream = await mgr.startVoice();
    if (stream) {
      mgr.subscribe((updatedPeers) => {
        setPeers(updatedPeers);
      });
      setManager(mgr);
      setInCall(true);
      toast.success('Conectado à sala de voz P2P!');
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
    if (!manager) return;
    if (isSharingScreen) {
      manager.stopScreenShare();
      setIsSharingScreen(false);
      toast.info('Compartilhamento de tela encerrado.');
    } else {
      const screenStream = await manager.startScreenShare();
      if (screenStream) {
        setIsSharingScreen(true);
        toast.success('Compartilhando sua tela com a mesa!');
      }
    }
  };

  // Identifica se algum colega está compartilhando tela para exibir preview
  const screenPeer = peers.find(p => p.isScreenShare);

  useEffect(() => {
    if (screenPeer && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenPeer.stream;
    }
  }, [screenPeer]);

  return (
    <>
      {/* Barra de controle de Voz & Transmissão Flutuante */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '80px',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(20, 14, 10, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #5a4234',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
      }}>
        {!inCall ? (
          <button
            onClick={handleJoinCall}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              borderRadius: '10px',
              color: '#4ade80',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <PhoneCall size={14} /> Entrar na Voz
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: '0.72rem', color: '#fdfaf5', fontWeight: 600 }}>
                {peers.length + 1} em chamada
              </span>
            </div>

            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Desmutar' : 'Mutar'}
              style={{
                padding: '6px 10px',
                background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isMuted ? '#ef4444' : '#5a4234'}`,
                borderRadius: '8px',
                color: isMuted ? '#f87171' : '#fdfaf5',
                cursor: 'pointer'
              }}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            <button
              onClick={handleToggleScreen}
              title={isSharingScreen ? 'Parar Compartilhamento' : 'Compartilhar Tela'}
              style={{
                padding: '6px 10px',
                background: isSharingScreen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isSharingScreen ? '#38bdf8' : '#5a4234'}`,
                borderRadius: '8px',
                color: isSharingScreen ? '#38bdf8' : '#fdfaf5',
                cursor: 'pointer'
              }}
            >
              {isSharingScreen ? <MonitorOff size={14} /> : <Monitor size={14} />}
            </button>

            <button
              onClick={handleLeaveCall}
              title="Sair da Chamada"
              style={{
                padding: '6px 10px',
                background: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#f87171',
                cursor: 'pointer'
              }}
            >
              <PhoneOff size={14} />
            </button>
          </>
        )}
      </div>

      {/* Janela Picture-in-Picture de Transmissão de Tela de colega */}
      {screenPeer && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 8500,
          width: '340px',
          background: '#0a0a0c',
          border: '1px solid #38bdf8',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)'
        }}>
          <div style={{ padding: '6px 10px', background: '#12142f', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #38bdf8' }}>
            <span style={{ fontSize: '0.72rem', color: '#7dd3fc', fontWeight: 700 }}>
              📺 Transmissão de {screenPeer.userName}
            </span>
          </div>
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: 'auto', display: 'block', background: '#000' }}
          />
        </div>
      )}

      {/* Elementos de Áudio Ocultos dos Pares */}
      {peers.map(peer => (
        <audio
          key={peer.peerId}
          autoPlay
          ref={audio => {
            if (audio && peer.stream) {
              audio.srcObject = peer.stream;
            }
          }}
        />
      ))}
    </>
  );
};
