import React from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { ChatVoicePanel } from '../../Chat/ChatVoicePanel';
import { useVoiceStore } from '../../../store/voiceStore';

interface Props {
  onClose: () => void;
}

export const VoiceRoomWidget: React.FC<Props> = ({ onClose }) => {
  const { roomCode, inCall, peers } = useVoiceStore();

  const activeRoom = roomCode || (typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('room') || 'default-room')
    : 'default-room');

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const initialX = screenW > 900 ? Math.max(20, screenW - 420) : 20;
  const initialY = 70;

  const title = inCall 
    ? `🎙️ Sala de Voz (${peers.length + 1} online)` 
    : '🎙️ Sala de Voz & Comunicação';

  return (
    <DraggableWindow
      id="voice-room"
      widgetKey="voiceRoom"
      title={title}
      initialX={initialX}
      initialY={initialY}
      width={380}
      height={560}
      variant="glass"
      onClose={onClose}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#120d0a',
        color: '#fdfaf5'
      }}>
        <ChatVoicePanel roomCode={activeRoom} />
      </div>
    </DraggableWindow>
  );
};
