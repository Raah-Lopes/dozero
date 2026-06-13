import React, { useState } from 'react';
import { X, Mic, MicOff, Volume2, VideoOff } from 'lucide-react';

interface PlayersLobbyProps {
  onClose: () => void;
}

export const PlayersLobby: React.FC<PlayersLobbyProps> = ({ onClose }) => {
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);

  // Mock participants to show the UI if we aren't connected to a real LiveKit Cloud server
  const displayParticipants = [
    { identity: 'Mestre Preguiçoso', isSpeaking: false, hasAudio: true },
    { identity: 'Goblin Slayer', isSpeaking: true, hasAudio: true },
    { identity: 'Mago Implacável', isSpeaking: false, hasAudio: false } // muted
  ];

  const handleToggleMic = () => {
    setIsMicrophoneEnabled(!isMicrophoneEnabled);
    console.log('Mock: Microfone alternado');
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '350px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Lobby de Voz</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        {displayParticipants.map((p, index) => {
          const hasAudio = p.hasAudio;
          return (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: p.isSpeaking ? '1px solid var(--success)' : '1px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: p.isSpeaking ? 'var(--success)' : 'inherit' }}>
                  {p.identity.charAt(0)}
                </div>
                <span>{p.identity}</span>
              </div>
              <div style={{ color: hasAudio ? 'var(--text-primary)' : 'var(--danger)' }}>
                {hasAudio ? (p.isSpeaking ? <Volume2 size={16} /> : <Mic size={16} />) : <MicOff size={16} />}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={handleToggleMic}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            border: 'none', 
            background: isMicrophoneEnabled ? 'var(--bg-tertiary)' : 'var(--danger)', 
            color: 'white', 
            cursor: 'pointer',
            flex: 1,
            justifyContent: 'center'
          }}
        >
          {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          {isMicrophoneEnabled ? 'Mutar Microfone' : 'Desmutar'}
        </button>
        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '0.75rem', cursor: 'pointer' }}>
          <VideoOff size={18} />
        </button>
      </div>
    </div>
  );
};
