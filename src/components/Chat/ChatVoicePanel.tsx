import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Monitor, MonitorOff, PhoneCall, PhoneOff, 
  Users, Maximize2, Headphones, Settings2, Sliders, Volume2, VolumeX, Radio,
  ShieldCheck, Copy, Check, Sparkles, PictureInPicture2
} from 'lucide-react';
import { useVoiceStore } from '../../store/voiceStore';
import { useAuthStore } from '../../store/authStore';
import { InputMode } from '../../services/webrtcVoiceManager';
import { toast } from '../UI/Toast';

interface Props {
  roomCode: string;
}

export const ChatVoicePanel: React.FC<Props> = ({ roomCode }) => {
  const { user } = useAuthStore();
  const {
    manager,
    inCall,
    isMuted,
    isDeafened,
    isSharingScreen,
    localScreenStream,
    peers,
    localSpeaking,
    inputMode,
    pttKey,
    vadSensitivity,
    isPTTPressed,
    joinCall,
    leaveCall,
    toggleMute,
    toggleDeafen,
    toggleScreenShare,
    setInputMode,
    setPttKey,
    setVadSensitivity,
    setPeerVolume,
    togglePeerMute,
    setPTTPressed,
    setAudioInputDevice
  } = useVoiceStore();

  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [copiedRoom, setCopiedRoom] = useState(false);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Aventureiro');
  const userAvatar = user?.user_metadata?.custom_avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const refreshDevices = useCallback(async () => {
    try {
      if (manager) {
        const devs = await manager.getAudioInputDevices();
        setDevices(devs);
      } else if (navigator.mediaDevices?.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices(devs.filter(d => d.kind === 'audioinput'));
      }
    } catch {}
  }, [manager]);

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    await setAudioInputDevice(deviceId);
  };

  const handleCopyRoomCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopiedRoom(true);
      toast.success('Código da sala copiado!');
      setTimeout(() => setCopiedRoom(false), 2000);
    }
  };

  const screenPeer = peers.find(p => p.isScreenShare);
  const activeScreenStream = isSharingScreen ? localScreenStream : (screenPeer ? screenPeer.stream : null);
  const activeStreamerName = isSharingScreen ? 'Você (Sua Tela)' : (screenPeer ? screenPeer.userName : null);

  useEffect(() => {
    if (activeScreenStream && screenVideoRef.current) {
      screenVideoRef.current.srcObject = activeScreenStream;
    }
  }, [activeScreenStream]);

  const handleToggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.warn('Erro ao abrir tela cheia:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTogglePiP = async () => {
    if (!screenVideoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await screenVideoRef.current.requestPictureInPicture();
      } else {
        toast.warn('Picture-in-Picture não suportado neste navegador.');
      }
    } catch (e) {
      console.warn('Erro ao alternar Picture-in-Picture:', e);
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
      padding: '12px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      gap: '12px'
    }}>
      {/* BANNER PRINCIPAL DE STATUS DA SALA DE VOZ */}
      <div style={{
        background: inCall 
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.16), rgba(20, 14, 10, 0.95))'
          : 'linear-gradient(135deg, rgba(217, 164, 65, 0.12), rgba(20, 14, 10, 0.95))',
        border: `1px solid ${inCall ? 'rgba(34, 197, 94, 0.5)' : 'rgba(217, 164, 65, 0.35)'}`,
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: inCall ? '0 8px 24px rgba(34, 197, 94, 0.12)' : '0 4px 16px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: inCall ? (localSpeaking.isSpeaking ? '#22c55e' : '#15803d') : '#71717a',
              boxShadow: inCall && localSpeaking.isSpeaking ? '0 0 12px #22c55e' : 'none',
              transition: 'all 0.15s ease'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#fdfaf5', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {inCall ? 'SALA DE VOZ AO VIVO' : 'CANAL DE VOZ DA MESA'}
                {inCall && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#22c55e', color: '#052e16', fontWeight: 900 }}>AO VIVO</span>}
              </span>
              <span style={{ fontSize: '0.68rem', color: inCall ? '#86efac' : '#a1a1aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} color={inCall ? '#4ade80' : '#a1a1aa'} />
                P2P WebRTC Criptografado &bull; Sala: <strong style={{ color: '#d9a441' }}>{roomCode}</strong>
                <button 
                  onClick={handleCopyRoomCode} 
                  title="Copiar código da sala" 
                  style={{ background: 'none', border: 'none', color: '#d9a441', cursor: 'pointer', padding: '0 2px' }}
                >
                  {copiedRoom ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                void refreshDevices();
              }}
              title="Configurações de Áudio & Microfone"
              style={{
                background: showSettings ? 'rgba(217, 164, 65, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${showSettings ? '#d9a441' : 'rgba(90, 66, 52, 0.6)'}`,
                borderRadius: '6px',
                padding: '4px 8px',
                color: showSettings ? '#d9a441' : '#fdfaf5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <Settings2 size={13} />
              Ajustes
            </button>

            <span style={{
              fontSize: '0.7rem',
              padding: '3px 8px',
              borderRadius: '12px',
              background: inCall ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.06)',
              color: inCall ? '#4ade80' : '#a1a1aa',
              fontWeight: 700,
              border: `1px solid ${inCall ? 'rgba(34, 197, 94, 0.4)' : 'transparent'}`
            }}>
              {inCall ? `${peers.length + 1} na chamada` : '0 online'}
            </span>
          </div>
        </div>

        {/* BOTÕES PRINCIPAIS DE CONTROLE DA CHAMADA */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {!inCall ? (
            <button
              onClick={() => void joinCall(roomCode, userName)}
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
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)'
              }}
            >
              <PhoneCall size={16} /> Conectar ao Áudio da Mesa
            </button>
          ) : (
            <>
              {/* MUTAR MICROFONE */}
              <button
                onClick={toggleMute}
                title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.18)',
                  border: `1px solid ${isMuted ? '#ef4444' : '#22c55e'}`,
                  borderRadius: '8px',
                  color: isMuted ? '#f87171' : '#4ade80',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                {isMuted ? 'Microfone Mudo' : 'Microfone Aberto'}
              </button>

              {/* ENSURDECER (DEAFEN) */}
              <button
                onClick={toggleDeafen}
                title={isDeafened ? 'Reativar Áudio Geral' : 'Ensurdecer (Mutar Áudio e Mic)'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px 10px',
                  background: isDeafened ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${isDeafened ? '#ef4444' : '#5a4234'}`,
                  borderRadius: '8px',
                  color: isDeafened ? '#f87171' : '#fdfaf5',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <Headphones size={14} />
                {isDeafened ? 'Ensurdecido' : 'Ouvir'}
              </button>

              {/* COMPARTILHAR TELA */}
              <button
                onClick={() => void toggleScreenShare()}
                title="Transmitir Tela de Vídeo"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px 10px',
                  background: isSharingScreen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${isSharingScreen ? '#38bdf8' : '#5a4234'}`,
                  borderRadius: '8px',
                  color: isSharingScreen ? '#38bdf8' : '#fdfaf5',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {isSharingScreen ? <MonitorOff size={14} /> : <Monitor size={14} />}
                {isSharingScreen ? 'Parar Tela' : 'Tela'}
              </button>

              {/* DESCONECTAR */}
              <button
                onClick={leaveCall}
                title="Desconectar da Chamada de Voz"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 10px',
                  background: 'rgba(239, 68, 68, 0.15)',
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

        {/* BOTÃO TÁTIL PTT */}
        {inCall && inputMode === 'ptt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onMouseDown={() => setPTTPressed(true)}
              onMouseUp={() => setPTTPressed(false)}
              onTouchStart={() => setPTTPressed(true)}
              onTouchEnd={() => setPTTPressed(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: isPTTPressed ? '2px solid #22c55e' : '1px dashed rgba(217, 164, 65, 0.7)',
                background: isPTTPressed ? 'rgba(34, 197, 94, 0.35)' : 'rgba(217, 164, 65, 0.1)',
                color: isPTTPressed ? '#4ade80' : '#d9a441',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                userSelect: 'none',
                touchAction: 'manipulation',
                boxShadow: isPTTPressed ? '0 0 12px rgba(34, 197, 94, 0.4)' : 'none',
                transition: 'all 0.08s ease'
              }}
            >
              <Radio size={15} />
              {isPTTPressed ? 'TRANSMITINDO (Solte para calar)' : `Segure para Falar [${pttKey === 'Space' ? 'Espaço' : pttKey}]`}
            </button>
          </div>
        )}
      </div>

      {/* PAINEL COLAPSÁVEL DE CONFIGURAÇÕES DE ÁUDIO */}
      {showSettings && (
        <div style={{
          background: 'rgba(20, 14, 10, 0.96)',
          border: '1px solid rgba(217, 164, 65, 0.4)',
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '0.78rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ fontWeight: 800, color: '#d9a441', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} /> Preferências de Entrada & Áudio
            </span>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Fechar
            </button>
          </div>

          {/* MODO DE TRANSMISSÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 700, color: '#e8dcc4', fontSize: '0.72rem' }}>Modo de Transmissão:</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setInputMode('vad')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: inputMode === 'vad' ? 'rgba(34, 197, 94, 0.22)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${inputMode === 'vad' ? '#22c55e' : 'rgba(90, 66, 52, 0.6)'}`,
                  color: inputMode === 'vad' ? '#4ade80' : '#d4c4a4',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                🎙️ Detecção por Voz (VAD)
              </button>
              <button
                onClick={() => setInputMode('ptt')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: inputMode === 'ptt' ? 'rgba(217, 164, 65, 0.22)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${inputMode === 'ptt' ? '#d9a441' : 'rgba(90, 66, 52, 0.6)'}`,
                  color: inputMode === 'ptt' ? '#d9a441' : '#d4c4a4',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                📻 Push-to-Talk (PTT)
              </button>
            </div>
          </div>

          {/* TECLA PTT */}
          {inputMode === 'ptt' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontWeight: 700, color: '#e8dcc4', fontSize: '0.72rem' }}>Tecla do PTT:</label>
              <select
                value={pttKey}
                onChange={(e) => setPttKey(e.target.value)}
                style={{
                  background: '#271b12',
                  border: '1px solid #5a4234',
                  color: '#fdfaf5',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                <option value="Space">Barra de Espaço</option>
                <option value="KeyV">Tecla V</option>
                <option value="KeyT">Tecla T</option>
                <option value="ControlLeft">Control Esquerdo</option>
                <option value="ShiftLeft">Shift Esquerdo</option>
                <option value="CapsLock">Caps Lock</option>
              </select>
            </div>
          )}

          {/* SENSIBILIDADE DO MICROFONE / VU METER */}
          {inputMode === 'vad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: '#e8dcc4', fontWeight: 700 }}>Sensibilidade (Noise Gate):</span>
                <span style={{ color: '#d9a441', fontWeight: 700 }}>{vadSensitivity}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                value={vadSensitivity}
                onChange={(e) => setVadSensitivity(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                <div style={{
                  height: '8px',
                  width: '100%',
                  background: '#271b12',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid #3b2518'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${localSpeaking.audioLevel}%`,
                    background: localSpeaking.audioLevel >= vadSensitivity ? '#22c55e' : '#d9a441',
                    transition: 'width 0.05s ease'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${vadSensitivity}%`,
                    width: '2px',
                    backgroundColor: '#ef4444'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#a1a1aa' }}>
                  <span>Silêncio</span>
                  <span>Limiar de Corte</span>
                  <span>Voz Alta</span>
                </div>
              </div>
            </div>
          )}

          {/* SELETOR DE MICROFONE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 700, color: '#e8dcc4', fontSize: '0.72rem' }}>Dispositivo de Microfone:</label>
            <select
              value={selectedDevice}
              onChange={(e) => void handleDeviceChange(e.target.value)}
              style={{
                background: '#271b12',
                border: '1px solid #5a4234',
                color: '#fdfaf5',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.72rem',
                width: '100%'
              }}
            >
              <option value="">Microfone Padrão do Sistema</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfone (${d.deviceId.slice(0, 6)}...)`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* FEED DE VÍDEO / COMPARTILHAMENTO DE TELA (LOCAL OU REMOTO) */}
      {activeScreenStream && (
        <div 
          ref={videoContainerRef}
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#05070d',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(56, 189, 248, 0.25), inset 0 0 20px rgba(56, 189, 248, 0.08)'
          }}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted={isSharingScreen}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />

          {/* HEADER DA TRANSMISSÃO */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(5, 7, 13, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.72rem',
              color: '#38bdf8',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'auto'
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 8px #ef4444'
              }} />
              <span>AO VIVO</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>&bull;</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{activeStreamerName}</span>
            </div>

            {/* BOTÕES DE CONTROLE DO PLAYER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto' }}>
              {isSharingScreen && (
                <button
                  onClick={() => void toggleScreenShare()}
                  title="Encerrar Transmissão"
                  style={{
                    background: 'rgba(239, 68, 68, 0.85)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MonitorOff size={12} />
                  Parar
                </button>
              )}

              <button
                onClick={handleTogglePiP}
                title="Modo Picture-in-Picture (Flutuante)"
                style={{
                  background: 'rgba(5, 7, 13, 0.85)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  padding: '6px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <PictureInPicture2 size={13} />
              </button>

              <button
                onClick={handleToggleFullscreen}
                title="Tela Cheia"
                style={{
                  background: 'rgba(5, 7, 13, 0.85)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  padding: '6px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÁUDIO REMOTO AUTOMÁTICO */}
      {peers.map(peer => (
        <audio
          key={peer.peerId}
          autoPlay
          ref={audio => {
            if (audio) {
              if (audio.srcObject !== peer.stream) audio.srcObject = peer.stream;
              audio.volume = isDeafened || peer.isLocallyMuted ? 0 : Math.min(1.0, peer.volume);
            }
          }}
        />
      ))}

      {/* LISTA DE JOGADORES NA SALA DE VOZ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#d4c4a4', fontSize: '0.78rem', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} />
            <span>PARTICIPANTES NA MESA ({inCall ? peers.length + 1 : 0})</span>
          </div>
          {inCall && (
            <span style={{ fontSize: '0.68rem', color: '#a1a1aa' }}>
              Ajuste o volume individual de cada jogador
            </span>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(90, 66, 52, 0.4)',
          borderRadius: '10px',
          padding: '8px'
        }}>
          {/* VOCÊ */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px 10px',
            borderRadius: '8px',
            background: inCall ? 'rgba(34, 197, 94, 0.07)' : 'rgba(255,255,255,0.02)',
            border: inCall 
              ? (localSpeaking.isSpeaking ? '1px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.25)') 
              : '1px solid transparent',
            transition: 'all 0.12s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: '#3b2518',
                  border: inCall && localSpeaking.isSpeaking 
                    ? '2px solid #22c55e' 
                    : (inCall && !isMuted ? '2px solid #16a34a' : '2px solid #5a4234'),
                  boxShadow: inCall && localSpeaking.isSpeaking ? '0 0 12px rgba(34, 197, 94, 0.85)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  transition: 'all 0.1s ease'
                }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userName[0]?.toUpperCase() || 'J'
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fdfaf5' }}>
                    {userName} <span style={{ fontSize: '0.7rem', color: '#d9a441', fontWeight: 800 }}>(Você)</span>
                  </span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 600,
                    color: inCall 
                      ? (isDeafened ? '#a1a1aa' : (isMuted ? '#f87171' : (localSpeaking.isSpeaking ? '#4ade80' : '#86efac'))) 
                      : '#71717a' 
                  }}>
                    {inCall 
                      ? (isDeafened ? 'Ensurdecido' : (isMuted ? 'Microfone Mutado' : (localSpeaking.isSpeaking ? 'Falando...' : 'Conectado'))) 
                      : 'Fora da chamada'}
                  </span>
                </div>
              </div>

              {inCall && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isDeafened && (
                    <span style={{ color: '#f87171' }} title="Ensurdecido">
                      <Headphones size={15} />
                    </span>
                  )}
                  <div style={{ color: isMuted ? '#f87171' : (localSpeaking.isSpeaking ? '#22c55e' : '#4ade80') }}>
                    {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                  </div>
                </div>
              )}
            </div>

            {/* VU METER DO SEU MICROFONE */}
            {inCall && !isMuted && !isDeafened && (
              <div style={{
                height: '4px',
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${localSpeaking.audioLevel}%`,
                  backgroundColor: localSpeaking.isSpeaking ? '#22c55e' : '#d9a441',
                  transition: 'width 0.05s ease'
                }} />
              </div>
            )}
          </div>

          {/* OUTROS JOGADORES NA CHAMADA */}
          {peers.map((peer) => (
            <div
              key={peer.peerId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: peer.isSpeaking ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: peer.isSpeaking ? '1px solid #22c55e' : '1px solid rgba(90, 66, 52, 0.35)',
                transition: 'all 0.12s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    position: 'relative',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#271b12',
                    border: peer.isSpeaking 
                      ? '2px solid #22c55e' 
                      : (peer.isLocallyMuted ? '2px solid #ef4444' : '2px solid #5a4234'),
                    boxShadow: peer.isSpeaking ? '0 0 12px rgba(34, 197, 94, 0.85)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#e8dcc4',
                    transition: 'all 0.1s ease'
                  }}>
                    {peer.userName[0]?.toUpperCase() || 'P'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fdfaf5' }}>
                      {peer.userName}
                    </span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 600,
                      color: peer.isLocallyMuted ? '#f87171' : (peer.isSpeaking ? '#4ade80' : '#a1a1aa') 
                    }}>
                      {peer.isLocallyMuted ? 'Silenciado para você' : (peer.isSpeaking ? 'Falando...' : 'Ouvindo')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {peer.isScreenShare && (
                    <span style={{ color: '#38bdf8' }} title="Transmitindo Tela">
                      <Monitor size={15} />
                    </span>
                  )}
                  <button
                    onClick={() => togglePeerMute(peer.peerId)}
                    title={peer.isLocallyMuted ? 'Desmutar este jogador' : 'Silenciar este jogador para você'}
                    style={{
                      background: peer.isLocallyMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${peer.isLocallyMuted ? '#ef4444' : 'rgba(90, 66, 52, 0.5)'}`,
                      borderRadius: '6px',
                      color: peer.isLocallyMuted ? '#f87171' : '#a1a1aa',
                      cursor: 'pointer',
                      padding: '5px 7px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem'
                    }}
                  >
                    {peer.isLocallyMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {peer.isLocallyMuted ? 'Mudo' : 'Ouvindo'}
                  </button>
                </div>
              </div>

              {/* VU METER DO JOGADOR REMOTO */}
              {peer.isSpeaking && (
                <div style={{
                  height: '3px',
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${peer.audioLevel}%`,
                    backgroundColor: '#22c55e',
                    transition: 'width 0.05s ease'
                  }} />
                </div>
              )}

              {/* SLIDER DE VOLUME INDIVIDUAL COM ATALHOS */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255,255,255,0.04)'
              }}>
                <Volume2 size={12} style={{ color: '#d9a441' }} />
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={peer.isLocallyMuted ? 0 : peer.volume}
                  onChange={(e) => setPeerVolume(peer.peerId, Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#d9a441', cursor: 'pointer', height: '4px' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#d9a441', fontWeight: 800, width: '38px', textAlign: 'right' }}>
                  {Math.round(peer.volume * 100)}%
                </span>
                <button
                  onClick={() => setPeerVolume(peer.peerId, 1.0)}
                  title="Restaurar Volume para 100%"
                  style={{
                    background: 'none',
                    border: '1px solid rgba(217, 164, 65, 0.3)',
                    borderRadius: '4px',
                    color: '#d4c4a4',
                    fontSize: '0.62rem',
                    padding: '1px 4px',
                    cursor: 'pointer'
                  }}
                >
                  100%
                </button>
              </div>
            </div>
          ))}

          {inCall && peers.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '16px 10px',
              color: '#a1a1aa',
              fontSize: '0.75rem',
              fontStyle: 'italic',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={16} color="#d9a441" />
              <span>Você está conectado ao canal de áudio da mesa.</span>
              <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Aguardando os outros aventureiros entrarem na voz...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
