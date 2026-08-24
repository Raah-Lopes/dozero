import React, { useState, useEffect } from 'react';
import { GameCanvas } from '../../engine/GameCanvas';
import { DiceOverlay } from '../UI/DiceOverlay';
import { CutsceneOverlay } from '../Theater/CutsceneOverlay';
import { ClimaxOverlay } from '../UI/ClimaxOverlay';
import { PPROverlay } from '../UI/PPROverlay';
import { GlobalAudioSync } from '../Audio/GlobalAudioSync';
import { ErrorBoundary } from '../UI/ErrorBoundary';
import { state } from '../../services/yjs';
import { Radio, MessageSquare } from 'lucide-react';

interface StreamOverlayProps {
  roomCode: string;
}

export const StreamOverlay: React.FC<StreamOverlayProps> = ({ roomCode }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    const handleChatUpdate = () => {
      const chatArr = Array.from(state.chat.values() as Iterable<any>);
      setMessages(chatArr.slice(-6)); // Últimas 6 mensagens
    };

    state.chat.observe(handleChatUpdate);
    handleChatUpdate();

    return () => {
      state.chat.unobserve(handleChatUpdate);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {/* 1. Canvas do Mapa e Tokens em Tempo Real */}
      <ErrorBoundary componentName="Stream Canvas">
        <GameCanvas />
      </ErrorBoundary>

      {/* 2. Overlays de Efeitos, Rolagens de Dados 3D e Som */}
      <DiceOverlay />
      <ClimaxOverlay />
      <PPROverlay />
      <GlobalAudioSync />

      {/* 3. Badge Discreto de Stream no Canto Superior Esquerdo */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '20px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#f87171',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        letterSpacing: '0.05em',
        pointerEvents: 'auto',
        zIndex: 9999
      }}>
        <Radio size={14} className="animate-pulse" color="#ef4444" />
        <span>LIVE • MESA {roomCode}</span>
        <button
          onClick={() => setShowChat(!showChat)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            marginLeft: '6px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Alternar Chat do Stream"
        >
          <MessageSquare size={13} color={showChat ? '#60a5fa' : '#64748b'} />
        </button>
      </div>

      {/* 4. Chat Transparente Flutuante para Stream (Canto Inferior Esquerdo) */}
      {showChat && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          width: '320px',
          maxHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          pointerEvents: 'none',
          zIndex: 9999
        }}>
          {messages.map((msg, idx) => (
            <div
              key={msg.id || idx}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#f1f5f9',
                fontSize: '0.8rem',
                lineHeight: '1.3',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.3s ease-out'
              }}
              dangerouslySetInnerHTML={{ __html: msg.content || msg.text || '' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
