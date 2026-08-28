import React, { useEffect, useState } from 'react';
import { 
  Mic, MicOff, Headphones, PhoneOff, 
  ChevronUp, ChevronDown, Radio, Users, Maximize2
} from 'lucide-react';
import { useVoiceStore } from '../../store/voiceStore';
import { useAuthStore } from '../../store/authStore';
import { useWindowManager } from '../../hooks/useWindowManager';

export const FloatingVoiceHUD: React.FC = () => {
  const { user } = useAuthStore();
  const openWindow = useWindowManager((state) => state.openWindow);
  const {
    inCall,
    isMuted,
    isDeafened,
    peers,
    localSpeaking,
    inputMode,
    pttKey,
    isPTTPressed,
    toggleMute,
    toggleDeafen,
    setPTTPressed,
    leaveCall
  } = useVoiceStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Aventureiro');
  const userAvatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  // Listener global de PTT (funciona no Canvas, Fichas, Códice, etc.)
  useEffect(() => {
    if (!inCall || inputMode !== 'ptt') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.code === pttKey || e.key === pttKey || (pttKey === 'Space' && e.code === 'Space')) {
        if (!isPTTPressed) {
          setPTTPressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === pttKey || e.key === pttKey || (pttKey === 'Space' && e.code === 'Space')) {
        setPTTPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inCall, inputMode, pttKey, isPTTPressed, setPTTPressed]);

  if (!inCall) return null;

  const speakingPeersCount = peers.filter(p => p.isSpeaking).length + (localSpeaking.isSpeaking ? 1 : 0);

  return (
    <div style={{
      position: 'fixed',
      bottom: '18px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9990,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      pointerEvents: 'auto',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* PAINEL FLUTUANTE EXPANDIDO */}
      {isExpanded && (
        <div style={{
          background: 'rgba(18, 13, 10, 0.94)',
          border: '1px solid rgba(217, 164, 65, 0.45)',
          borderRadius: '12px',
          padding: '10px 14px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '240px',
          maxWidth: '320px',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
            <span style={{ color: '#d9a441', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} /> Sala de Voz ({peers.length + 1})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: speakingPeersCount > 0 ? '#4ade80' : '#a1a1aa', fontSize: '0.7rem', fontWeight: 600 }}>
                {speakingPeersCount > 0 ? `${speakingPeersCount} falando` : 'Em silêncio'}
              </span>
              <button
                onClick={() => openWindow('voiceRoom')}
                title="Abrir Painel Completo de Voz"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d9a441',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Maximize2 size={12} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
            {/* VOCÊ */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              borderRadius: '6px',
              background: localSpeaking.isSpeaking ? 'rgba(34, 197, 94, 0.12)' : 'transparent'
            }}>
              <span style={{ color: '#fdfaf5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: localSpeaking.isSpeaking ? '#22c55e' : (isMuted ? '#ef4444' : '#15803d'),
                  boxShadow: localSpeaking.isSpeaking ? '0 0 8px #22c55e' : 'none'
                }} />
                {userName} (Você)
              </span>
              <span style={{ fontSize: '0.68rem', color: isMuted ? '#f87171' : (localSpeaking.isSpeaking ? '#4ade80' : '#a1a1aa') }}>
                {isMuted ? 'Mudo' : (localSpeaking.isSpeaking ? 'Falando...' : 'Ouvindo')}
              </span>
            </div>

            {/* PEERS */}
            {peers.map(peer => (
              <div
                key={peer.peerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  background: peer.isSpeaking ? 'rgba(34, 197, 94, 0.12)' : 'transparent'
                }}
              >
                <span style={{ color: '#fdfaf5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: peer.isSpeaking ? '#22c55e' : (peer.isLocallyMuted ? '#ef4444' : '#5a4234'),
                    boxShadow: peer.isSpeaking ? '0 0 8px #22c55e' : 'none'
                  }} />
                  {peer.userName}
                </span>
                <span style={{ fontSize: '0.68rem', color: peer.isLocallyMuted ? '#f87171' : (peer.isSpeaking ? '#4ade80' : '#a1a1aa') }}>
                  {peer.isLocallyMuted ? 'Silenciado' : (peer.isSpeaking ? 'Falando...' : 'Ouvindo')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MINI BARRA FLUTUANTE COMPACTA */}
      <div style={{
        background: 'rgba(18, 13, 10, 0.88)',
        border: '1px solid rgba(217, 164, 65, 0.5)',
        borderRadius: '24px',
        padding: '5px 12px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.65), 0 0 16px rgba(217, 164, 65, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {/* AVATAR BUBBLES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* SEU AVATAR */}
          <div
            title={`${userName} (Você) - ${isMuted ? 'Mutado' : (localSpeaking.isSpeaking ? 'Falando' : 'Conectado')}`}
            style={{
              position: 'relative',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#3b2518',
              border: localSpeaking.isSpeaking 
                ? '2px solid #22c55e' 
                : (isMuted ? '2px solid #ef4444' : '2px solid #5a4234'),
              boxShadow: localSpeaking.isSpeaking ? '0 0 10px rgba(34, 197, 94, 0.85)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#fdfaf5',
              transition: 'all 0.12s ease'
            }}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName[0]?.toUpperCase() || 'J'
            )}
          </div>

          {/* AVATARES DOS COLEGAS */}
          {peers.slice(0, 4).map(peer => (
            <div
              key={peer.peerId}
              title={`${peer.userName} - ${peer.isSpeaking ? 'Falando' : 'Ouvindo'}`}
              style={{
                position: 'relative',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#271b12',
                border: peer.isSpeaking 
                  ? '2px solid #22c55e' 
                  : (peer.isLocallyMuted ? '2px solid #ef4444' : '2px solid #5a4234'),
                boxShadow: peer.isSpeaking ? '0 0 10px rgba(34, 197, 94, 0.85)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#e8dcc4',
                transition: 'all 0.12s ease'
              }}
            >
              {peer.userName[0]?.toUpperCase() || 'P'}
            </div>
          ))}

          {peers.length > 4 && (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#d9a441'
            }}>
              +{peers.length - 4}
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

        {/* BOTÕES DE CONTROLE RÁPIDO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* MUTE */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
            style={{
              background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${isMuted ? '#ef4444' : 'rgba(90, 66, 52, 0.6)'}`,
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMuted ? '#f87171' : '#4ade80',
              cursor: 'pointer'
            }}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          {/* DEAFEN */}
          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Reativar Áudio Geral' : 'Ensurdecer'}
            style={{
              background: isDeafened ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${isDeafened ? '#ef4444' : 'rgba(90, 66, 52, 0.6)'}`,
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDeafened ? '#f87171' : '#fdfaf5',
              cursor: 'pointer'
            }}
          >
            <Headphones size={14} />
          </button>

          {/* PTT HOLD (SE PTT) */}
          {inputMode === 'ptt' && (
            <button
              onMouseDown={() => setPTTPressed(true)}
              onMouseUp={() => setPTTPressed(false)}
              onTouchStart={() => setPTTPressed(true)}
              onTouchEnd={() => setPTTPressed(false)}
              title="Segure para falar"
              style={{
                background: isPTTPressed ? 'rgba(34, 197, 94, 0.35)' : 'rgba(217, 164, 65, 0.15)',
                border: `1px solid ${isPTTPressed ? '#22c55e' : '#d9a441'}`,
                borderRadius: '16px',
                padding: '0 10px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: isPTTPressed ? '#4ade80' : '#d9a441',
                fontWeight: 700,
                fontSize: '0.72rem',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <Radio size={13} />
              {isPTTPressed ? 'Transmitindo' : 'PTT'}
            </button>
          )}

          {/* EXPANDIR LISTA */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Recolher Participantes' : 'Ver Participantes'}
            style={{
              background: 'none',
              border: 'none',
              color: '#d4c4a4',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>

          {/* DESCONECTAR */}
          <button
            onClick={leaveCall}
            title="Desconectar da Voz"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              cursor: 'pointer'
            }}
          >
            <PhoneOff size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
