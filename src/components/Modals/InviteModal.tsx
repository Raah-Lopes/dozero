import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';

interface InviteModalProps {
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  
  // Use VITE_LOCAL_IP se existir, caso contrário o host atual (fallback)
  const localIp = import.meta.env.VITE_LOCAL_IP || window.location.hostname;
  const port = window.location.port || '5173';
  
  const inviteLink = `http://${localIp}:${port}/`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000,
      backdropFilter: 'blur(8px)',
      pointerEvents: 'auto'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        position: 'relative',
        width: '350px'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h2 style={{ margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>Convidar Jogadores</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Peça para seus jogadores locais apontarem a câmera do celular para o código abaixo:
        </p>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
          <QRCodeSVG value={inviteLink} size={200} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ou envie este link (Discord/WhatsApp):</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              readOnly 
              value={inviteLink} 
              style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <button 
              onClick={handleCopy}
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
