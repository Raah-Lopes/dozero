// src/components/Theater/NpcPortrait.tsx
import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, MoveHorizontal, Sparkles, MessageSquare, ShieldAlert } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

export interface NpcPresentationData {
  name: string;
  imageUrl?: string;
  subtitle?: string;
  quote?: string;
  type?: 'hero' | 'npc' | 'boss' | 'threat';
}

interface Props {
  name: string;
  imageUrl?: string;
  subtitle?: string;
  quote?: string;
  type?: 'hero' | 'npc' | 'boss' | 'threat';
  onClose: () => void;
}

export const NpcPortrait: React.FC<Props> = ({ 
  name, 
  imageUrl, 
  subtitle, 
  quote: initialQuote,
  type = 'npc', 
  onClose 
}) => {
  // Center stage by default as requested by user
  const [position, setPosition] = useState<'center' | 'side'>('center');
  const [scaleMode, setScaleMode] = useState<'normal' | 'large' | 'epic'>('large');
  const [dialogue, setDialogue] = useState<string>(initialQuote || '');
  const [isEditingDialogue, setIsEditingDialogue] = useState(false);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingDialogue) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingDialogue]);

  const isBoss = type === 'boss' || name.toLowerCase().includes('boss') || name.toLowerCase().includes('dragão') || name.toLowerCase().includes('implacável');
  const isHero = type === 'hero';

  const auraColor = isBoss ? '#ef4444' : isHero ? '#10b981' : '#a855f7';

  return (
    <div 
      className={`theater-npc-stage-wrapper ${position} ${scaleMode} ${isBoss ? 'boss-aura' : ''}`}
    >
      {/* Background Theatrical Glow Aura */}
      <div 
        className="theater-npc-stage-glow" 
        style={{
          background: `radial-gradient(circle, ${auraColor}35 0%, transparent 70%)`
        }} 
      />

      {/* Floating Control Toolbar */}
      <div className="theater-npc-stage-toolbar">
        <Tooltip label={position === 'center' ? 'Mover para o Canto (Lateral)' : 'Mover para o Centro da Cena'}>
          <button 
            className="theater-npc-tool-btn"
            onClick={() => setPosition(p => p === 'center' ? 'side' : 'center')}
          >
            <MoveHorizontal size={13} />
            <span>{position === 'center' ? 'Lateral' : 'Centro'}</span>
          </button>
        </Tooltip>

        <Tooltip label="Alternar Tamanho (Normal / Grande / Épico)">
          <button 
            className="theater-npc-tool-btn"
            onClick={() => setScaleMode(s => s === 'normal' ? 'large' : s === 'large' ? 'epic' : 'normal')}
          >
            {scaleMode === 'epic' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span style={{ textTransform: 'capitalize' }}>{scaleMode}</span>
          </button>
        </Tooltip>

        <Tooltip label="Fazer Personagem Falar (Diálogo)">
          <button 
            className={`theater-npc-tool-btn ${dialogue ? 'active' : ''}`}
            onClick={() => setIsEditingDialogue(e => !e)}
          >
            <MessageSquare size={13} />
            <span>{dialogue ? 'Fala Ativa' : 'Falar'}</span>
          </button>
        </Tooltip>

        <Tooltip label="Fechar Apresentação (ESC)">
          <button 
            className="theater-npc-tool-btn close"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Speech Bubble / Dialogue if active */}
      {(dialogue || isEditingDialogue) && (
        <div className="theater-npc-speech-bubble">
          {isEditingDialogue ? (
            <div className="theater-npc-dialogue-edit">
              <input 
                type="text" 
                placeholder="O que este personagem diz para a cena?..." 
                value={dialogue}
                onChange={e => setDialogue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setIsEditingDialogue(false); }}
                autoFocus
              />
              <button onClick={() => setIsEditingDialogue(false)}>OK</button>
            </div>
          ) : (
            <div 
              className="theater-npc-dialogue-text"
              onClick={() => setIsEditingDialogue(true)}
              title="Clique para editar a fala"
            >
              “{dialogue}”
            </div>
          )}
          <div className="theater-npc-speech-tail" />
        </div>
      )}

      {/* Main Character Body Frame */}
      <div 
        className="theater-npc-stage-card"
        style={{ borderColor: `${auraColor}50` }}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="theater-npc-stage-img"
          />
        ) : (
          <div className="theater-npc-stage-placeholder">
            🧙‍♂️
          </div>
        )}

        {/* Character Title Plate Banner */}
        <div className="theater-npc-stage-banner">
          {isBoss && (
            <div className="theater-npc-boss-tag">
              <ShieldAlert size={11} />
              <span>AMEAÇA MAIOR</span>
            </div>
          )}
          <h3 className="theater-npc-stage-name">{name}</h3>
          {subtitle && <span className="theater-npc-stage-sub">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};
