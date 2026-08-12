import React, { useEffect, useState } from 'react';
import { localState, state, updateMapTextProps, removeMapText, setEditingTextId, MapTextData } from '../../store';
import { Trash2, Eye, EyeOff, Type, Maximize2, Check } from 'lucide-react';
import { Tooltip } from './Tooltip';

export const TextContextBar: React.FC = () => {
  const [editingId, setEditingId] = useState<string | null>(localState.editingTextId);
  const [textData, setTextData] = useState<MapTextData | null>(null);

  useEffect(() => {
    const handleIdChange = () => {
      const id = localState.editingTextId;
      setEditingId(id);
      
      if (id) {
        const data = state.mapTexts.get(id) as MapTextData | undefined;
        if (data) {
          setTextData(data);
        } else {
          setEditingTextId(null);
        }
      } else {
        setTextData(null);
      }
    };

    // Also observe mapTexts for real-time remote changes (e.g. if someone else edits it or if we edit it via Pixi)
    const observer = () => {
      if (localState.editingTextId) {
        const data = state.mapTexts.get(localState.editingTextId) as MapTextData | undefined;
        if (data) setTextData(data);
        else setEditingTextId(null);
      }
    };

    window.addEventListener('editing-text-changed', handleIdChange);
    state.mapTexts.observe(observer);

    return () => {
      window.removeEventListener('editing-text-changed', handleIdChange);
      state.mapTexts.unobserve(observer);
    };
  }, []);

  if (!editingId || !textData) return null;

  return (
    <div
      id="text-context-bar"
      style={{
        position: 'absolute',
        top: '-1000px', // PIXI vai mover isso
        left: '-1000px',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.2rem',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '30px', // Pill shape
        padding: '0.25rem 0.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      
      {/* Font Size */}
      <Tooltip label="Tamanho da Letra">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Type size={14} color="var(--text-secondary)" />
          <input
            type="number"
            value={textData.fontSize}
            onChange={e => updateMapTextProps(editingId, { fontSize: Number(e.target.value) })}
            style={{ width: '40px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'center' }}
            min="12"
            max="200"
          />
        </div>
      </Tooltip>

      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 0.1rem' }} />

      {/* Box Width */}
      <Tooltip label="Largura Máxima da Caixa">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Maximize2 size={14} color="var(--text-secondary)" />
          <input
            type="number"
            value={textData.wordWrapWidth || 300}
            onChange={e => updateMapTextProps(editingId, { wordWrapWidth: Number(e.target.value) })}
            style={{ width: '45px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'center' }}
            min="50"
            max="2000"
          />
        </div>
      </Tooltip>

      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 0.1rem' }} />

      {/* Text Color */}
      <Tooltip label="Cor do Texto">
        <input
          type="color"
          value={textData.color}
          onChange={e => updateMapTextProps(editingId, { color: e.target.value })}
          style={{ width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
        />
      </Tooltip>

      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 0.1rem' }} />

      {/* Background Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
        <Tooltip label="Cor de Fundo">
          <input
            type="color"
            value={textData.backgroundColor === 'transparent' ? '#000000' : textData.backgroundColor || '#000000'}
            onChange={e => updateMapTextProps(editingId, { backgroundColor: e.target.value })}
            disabled={!textData.backgroundColor || textData.backgroundColor === 'transparent'}
            style={{ 
              width: '20px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
              opacity: (!textData.backgroundColor || textData.backgroundColor === 'transparent') ? 0.3 : 1
            }}
          />
        </Tooltip>
        <Tooltip label={(!textData.backgroundColor || textData.backgroundColor === 'transparent') ? 'Ativar Fundo' : 'Remover Fundo'}>
          <button
            onClick={() => updateMapTextProps(editingId, { backgroundColor: (!textData.backgroundColor || textData.backgroundColor === 'transparent') ? '#000000' : 'transparent' })}
            className="btn-icon"
            style={{ padding: '0.2rem' }}
          >
            {(!textData.backgroundColor || textData.backgroundColor === 'transparent') ? <EyeOff size={14} color="var(--text-secondary)" /> : <Eye size={14} color="var(--accent-primary)" />}
          </button>
        </Tooltip>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 0.1rem' }} />

      {/* Visibility */}
      <Tooltip label={textData.hidden ? 'Mostrar aos Jogadores' : 'Ocultar dos Jogadores'}>
        <button 
          onClick={() => updateMapTextProps(editingId, { hidden: !textData.hidden })} 
          className="btn-icon" 
          style={{ padding: '0.2rem' }}
        >
          {textData.hidden ? <EyeOff size={14} color="var(--text-secondary)" /> : <Eye size={14} />}
        </button>
      </Tooltip>

      {/* Delete */}
      <Tooltip label="Excluir Texto">
        <button 
          onClick={() => { removeMapText(editingId); setEditingTextId(null); }} 
          className="btn-icon" 
          style={{ color: 'var(--danger)', padding: '0.2rem' }}
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>

      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 0.1rem' }} />

      {/* Close button */}
      <Tooltip label="Concluir Edição">
        <button 
          onClick={() => setEditingTextId(null)} 
          className="btn-icon" 
          style={{ padding: '0.2rem', color: '#10b981' }}
        >
          <Check size={16} />
        </button>
      </Tooltip>

    </div>
  );
};
