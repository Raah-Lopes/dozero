// src/components/Theater/NpcPortrait.tsx
import React from 'react';
import { X } from 'lucide-react';

interface Props {
  name: string;
  imageUrl?: string;
  onClose: () => void;
}

export const NpcPortrait: React.FC<Props> = ({ name, imageUrl, onClose }) => (
  <div className="theater-npc-portrait">
    <button
      onClick={onClose}
      style={{
        position: 'absolute', top: -10, right: -10, zIndex: 10,
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)',
        color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <X size={11} />
    </button>

    {imageUrl ? (
      <img src={imageUrl} alt={name} className="theater-npc-portrait-img" />
    ) : (
      <div className="theater-npc-portrait-img-placeholder">🧙</div>
    )}

    <div className="theater-npc-portrait-name">{name}</div>
  </div>
);
