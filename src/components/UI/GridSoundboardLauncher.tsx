import React from 'react';
import { Headphones, Radio } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useVoiceStore } from '../../store/voiceStore';
import '../Widgets/System/soundboard.css';

export const GridSoundboardLauncher: React.FC = () => {
  const openWindow = useWindowManager((state) => state.openWindow);
  const closeWindow = useWindowManager((state) => state.closeWindow);
  const toggleWindow = useWindowManager((state) => state.toggleWindow);
  const isSoundOpen = useWindowManager((state) => Boolean(state.openWindows.audioDirector || state.openWindows.audioDirectorCompact));
  const isVoiceOpen = useWindowManager((state) => Boolean(state.openWindows.voiceRoom));

  const { inCall, peers, localSpeaking } = useVoiceStore();
  const isSomeoneSpeaking = inCall && (localSpeaking.isSpeaking || peers.some(p => p.isSpeaking));
  const participantsCount = inCall ? peers.length + 1 : 0;

  return (
    <div className="dozero-grid-soundboard-header" role="group" aria-label="Controles de Áudio e Voz da Mesa">
      {/* BOTÃO DA SALA DE VOZ */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleWindow('voiceRoom');
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`${isVoiceOpen ? 'is-open' : ''} ${inCall ? 'is-in-call' : ''}`}
        aria-label="Abrir sala de voz e comunicação"
        aria-pressed={isVoiceOpen}
        title={inCall ? `Sala de Voz (${participantsCount} conectados)` : 'Abrir Sala de Voz P2P'}
        style={{
          position: 'relative',
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
          borderColor: isVoiceOpen ? 'var(--accent-primary)' : (inCall ? '#22c55e' : undefined),
          color: isVoiceOpen ? 'var(--accent-hover)' : (inCall ? '#4ade80' : undefined),
          boxShadow: isSomeoneSpeaking ? '0 0 12px rgba(34, 197, 94, 0.6)' : (inCall ? '0 0 8px rgba(34, 197, 94, 0.25)' : undefined)
        }}
      >
        <Radio size={17} />
        {inCall && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isSomeoneSpeaking ? '#22c55e' : '#16a34a',
              boxShadow: isSomeoneSpeaking ? '0 0 8px #22c55e' : 'none'
            }}
          />
        )}
      </button>

      {/* BOTÃO DO SOUNDBOARD COMPACTO */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isSoundOpen) {
            closeWindow('audioDirector');
            closeWindow('audioDirectorCompact');
          } else {
            openWindow('audioDirectorCompact');
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={isSoundOpen ? 'is-open' : ''}
        aria-label="Abrir soundboard compacto"
        aria-pressed={isSoundOpen}
        title="Abrir soundboard e efeitos sonoros"
        style={{
          cursor: 'pointer',
          pointerEvents: 'auto',
          touchAction: 'manipulation'
        }}
      >
        <Headphones size={18} />
      </button>
    </div>
  );
};
