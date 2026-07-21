import React, { useState } from 'react';
import { X, Send, Image as ImageIcon } from 'lucide-react';

interface ImagePreviewModalProps {
  base64: string;
  onConfirm: (caption: string) => void;
  onCancel: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ base64, onConfirm, onCancel }) => {
  const [caption, setCaption] = useState('');

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(10,15,30,0.96)', backdropFilter: 'blur(12px)',
      zIndex: 550, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
      borderTop: '1px solid var(--chat-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--chat-border)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, color: 'var(--chat-accent)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
          <ImageIcon size={18} /> Pré-visualizar Imagem
        </h4>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--chat-text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: '10px' }}>
        <img 
          src={base64} 
          alt="Preview" 
          style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--chat-border)' }} 
        />
        <input 
          type="text" 
          value={caption} 
          onChange={e => setCaption(e.target.value)}
          placeholder="Adicionar legenda (opcional)..."
          style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--chat-border)', color: 'var(--chat-text-primary)', borderRadius: '4px', fontSize: '0.85rem' }}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--chat-border)' }}>
        <button 
          onClick={onCancel}
          style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--chat-border)', borderRadius: '4px', color: 'var(--chat-text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Cancelar
        </button>
        <button 
          onClick={() => onConfirm(caption)}
          style={{ padding: '8px 16px', background: 'var(--chat-accent)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Send size={14} /> Enviar Imagem
        </button>
      </div>
    </div>
  );
};
