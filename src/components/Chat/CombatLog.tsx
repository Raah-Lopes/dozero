import React, { useEffect, useState } from 'react';
import { state } from '../../store';

interface LogMessage {
  text: string;
  isCritical: boolean;
  isFailure: boolean;
  timestamp: number;
}

export const CombatLog: React.FC = () => {
  const [messages, setMessages] = useState<LogMessage[]>([]);

  useEffect(() => {
    // Initial load
    setMessages(state.chat.toArray() as LogMessage[]);

    // Subscribe to Yjs changes
    const observer = () => {
      setMessages(state.chat.toArray() as LogMessage[]);
    };

    state.chat.observe(observer);

    return () => {
      state.chat.unobserve(observer);
    };
  }, []);

  return (
    <div style={{ height: '100%', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>A batalha aguarda seu primeiro movimento.</p>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className="animate-fade-in"
              style={{ 
                padding: '0.75rem', 
                background: msg.isCritical ? 'rgba(34, 197, 94, 0.1)' : msg.isFailure ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderLeft: `3px solid ${msg.isCritical ? 'var(--success)' : msg.isFailure ? 'var(--danger)' : 'var(--accent-primary)'}`,
                border: '1px solid var(--glass-border)',
                borderLeftWidth: '3px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                boxShadow: msg.isCritical ? '0 0 10px rgba(34, 197, 94, 0.2)' : msg.isFailure ? '0 0 10px rgba(239, 68, 68, 0.2)' : 'none'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: msg.text }} style={{ color: 'var(--text-primary)' }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
