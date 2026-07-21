import React, { useState } from 'react';
import { X, Plus, BarChart2 } from 'lucide-react';
import { createPoll } from '../../store/chat';
import { toast } from '../UI/Toast';

interface PollComposerModalProps {
  onClose: () => void;
  playerName: string;
}

export const PollComposerModal: React.FC<PollComposerModalProps> = ({ onClose, playerName }) => {
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);

  const handleSubmit = () => {
    const validOpts = pollOptions.filter(o => o.trim() !== '');
    if (pollQuestion.trim() && validOpts.length >= 2) {
      createPoll(pollQuestion.trim(), validOpts, pollIsAnonymous, playerName);
      onClose();
    } else {
      toast.info('Preencha a pergunta e no mínimo 2 opções.');
    }
  };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(10,15,30,0.96)', backdropFilter: 'blur(12px)',
      zIndex: 500, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
      borderTop: '1px solid var(--chat-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--chat-border)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, color: 'var(--chat-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
          <BarChart2 size={18} style={{ color: 'var(--chat-accent)' }} /> Nova Enquete
        </h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
          placeholder="Sua pergunta..." autoFocus
          style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--chat-border)', color: 'var(--chat-text-primary)', borderRadius: '4px', fontSize: '0.85rem' }}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {pollOptions.map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '6px' }}>
              <input 
                value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }}
                placeholder={`Opção ${idx + 1}`}
                style={{ flex: 1, padding: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--chat-border)', color: 'var(--chat-text-primary)', borderRadius: '4px', fontSize: '0.8rem' }}
              />
              {pollOptions.length > 2 && (
                <button onClick={() => { const newOpts = [...pollOptions]; newOpts.splice(idx, 1); setPollOptions(newOpts); }} style={{ background: 'var(--chat-bg-secondary)', border: '1px solid transparent', color: 'var(--danger)', cursor: 'pointer', padding: '0 8px', borderRadius: '4px' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setPollOptions([...pollOptions, ''])} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid var(--chat-border)', color: 'var(--chat-text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <Plus size={12} /> Adicionar Opção
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--chat-border)' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--chat-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={pollIsAnonymous} onChange={e => setPollIsAnonymous(e.target.checked)} />
          Voto Anônimo
        </label>
        <button 
          onClick={handleSubmit} 
          style={{ padding: '8px 16px', background: 'var(--chat-accent)', border: 'none', borderRadius: '4px', color: 'var(--chat-text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
        >
          Enviar Enquete
        </button>
      </div>
    </div>
  );
};
