import React from 'react';
import { X, Swords, Timer, Dice3, FileText } from 'lucide-react';

interface Props {
  onClose: () => void;
  onOpenTracker: () => void;
  onOpenClockConfig: () => void;
}

export const WidgetHubModal: React.FC<Props> = ({ onClose, onOpenTracker, onOpenClockConfig }) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '380px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Hub de Widgets
        </h3>
        <button 
          onClick={onClose} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }} 
          onMouseOver={e => e.currentTarget.style.color = 'white'} 
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', justifyItems: 'center' }}>
        <style>
          {`
            .widget-btn {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid var(--glass-border);
              color: white;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .widget-btn:hover {
              transform: scale(1.1);
            }
            .widget-btn.disabled {
              opacity: 0.3;
              cursor: not-allowed;
            }
            .widget-btn.disabled:hover {
              transform: none;
            }
            
            .btn-initiative:hover {
              background: rgba(225, 29, 72, 0.2);
              border-color: #e11d48;
              box-shadow: 0 0 15px rgba(225, 29, 72, 0.5);
              color: #fda4af;
            }
            
            .btn-clock:hover {
              background: rgba(245, 158, 11, 0.2);
              border-color: #f59e0b;
              box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
              color: #fcd34d;
            }
            
            .btn-dice:hover {
              background: rgba(79, 70, 229, 0.2);
              border-color: #4f46e5;
              box-shadow: 0 0 15px rgba(79, 70, 229, 0.5);
            }
            
            .btn-notes:hover {
              background: rgba(16, 185, 129, 0.2);
              border-color: #10b981;
              box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
            }
          `}
        </style>
        {/* Iniciativa */}
        <button 
          onClick={onOpenTracker}
          title="Iniciativa"
          className="widget-btn btn-initiative"
        >
          <Swords size={32} />
        </button>

        {/* Relógio de Tensão */}
        <button 
          onClick={onOpenClockConfig}
          title="Relógio de Tensão"
          className="widget-btn btn-clock"
        >
          <Timer size={32} />
        </button>

        {/* Placeholder: Dados 3D */}
        <button 
          title="Dados 3D (Em breve)"
          className="widget-btn btn-dice disabled"
        >
          <Dice3 size={32} />
        </button>

        {/* Placeholder: Notas */}
        <button 
          title="Anotações (Em breve)"
          className="widget-btn btn-notes disabled"
        >
          <FileText size={32} />
        </button>
      </div>
    </div>
  );
};
