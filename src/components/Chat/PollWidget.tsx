import React, { useEffect, useState } from 'react';
import { state } from '../../store';
import { castVote, PollData } from '../../store/chat';

interface PollWidgetProps {
  pollId: string;
  playerName: string;
}

export const PollWidget: React.FC<PollWidgetProps> = ({ pollId, playerName }) => {
  const [poll, setPoll] = useState<PollData | null>(null);

  useEffect(() => {
    const updatePoll = () => {
      const p = state.polls.get(pollId);
      if (p) setPoll(p as PollData);
    };

    updatePoll();
    const observer = (event: any) => {
      if (event.keysChanged.has(pollId)) {
        updatePoll();
      }
    };

    state.polls.observe(observer);
    return () => state.polls.unobserve(observer);
  }, [pollId]);

  if (!poll) return <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Carregando enquete...</div>;

  const totalVotes = Object.keys(poll.votes).length;
  const myVote = poll.votes[playerName];

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.75rem',
      marginTop: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        📊 {poll.question}
      </div>
      
      {poll.options.map((opt, idx) => {
        const optionVotes = Object.entries(poll.votes).filter(([_, v]) => v === idx);
        const count = optionVotes.length;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isMyVote = myVote === idx;
        const votersList = poll.isAnonymous ? '' : optionVotes.map(([name]) => name).join(', ');

        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <button
              onClick={() => castVote(pollId, playerName, idx)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem',
                background: isMyVote ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                border: isMyVote ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Progress Bar Background */}
              <div style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0,
                width: `${percentage}%`,
                background: isMyVote ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,255,255,0.1)',
                transition: 'width 0.3s ease',
                zIndex: 0
              }} />
              
              <span style={{ position: 'relative', zIndex: 1, fontSize: '0.85rem' }}>{opt}</span>
              <span style={{ position: 'relative', zIndex: 1, fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>
                {count} ({percentage}%)
              </span>
            </button>
            {votersList && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', paddingLeft: '0.2rem' }}>
                {votersList}
              </span>
            )}
          </div>
        );
      })}
      
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '0.25rem' }}>
        {totalVotes} voto(s) total • {poll.isAnonymous ? 'Votação Anônima' : 'Votação Aberta'}
      </div>
    </div>
  );
};
