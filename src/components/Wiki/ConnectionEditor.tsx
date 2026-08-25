import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { WIKI_CONNECTION_TYPES, type WikiConnectionDraft } from '../../utils/wikiConnections';

interface ConnectionEditorProps {
  sourceName: string;
  targetName: string;
  initial?: WikiConnectionDraft;
  onCancel: () => void;
  onSave: (draft: WikiConnectionDraft) => void;
}

export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({ sourceName, targetName, initial, onCancel, onSave }) => {
  const initialIsCustom = Boolean(initial?.type && !WIKI_CONNECTION_TYPES.includes(initial.type as typeof WIKI_CONNECTION_TYPES[number]));
  const [type, setType] = useState(initialIsCustom ? 'custom' : initial?.type || WIKI_CONNECTION_TYPES[0]);
  const [customType, setCustomType] = useState(initialIsCustom ? initial?.type || '' : '');
  const [description, setDescription] = useState(initial?.description || '');

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  const finalType = type === 'custom' ? customType.trim() : type;

  return <div role="dialog" aria-modal="true" aria-labelledby="connection-editor-title" onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 10000000, display: 'grid', placeItems: 'center', background: 'rgba(2,6,23,.78)', backdropFilter: 'blur(6px)', padding: '16px' }}>
    <form onSubmit={event => { event.preventDefault(); if (finalType) onSave({ type: finalType, description }); }} onClick={event => event.stopPropagation()} style={{ width: 'min(460px, 100%)', padding: '20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: '0 24px 70px rgba(0,0,0,.6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div><h3 id="connection-editor-title" style={{ margin: 0 }}>Conexão semântica</h3><small style={{ color: 'var(--text-secondary)' }}>{sourceName} → {targetName}</small></div>
        <button type="button" onClick={onCancel} aria-label="Fechar" style={{ border: 0, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
      </div>
      <label style={{ display: 'grid', gap: '6px', marginBottom: '12px', fontSize: '.85rem' }}>Tipo de relacionamento
        <select value={type} onChange={event => setType(event.target.value)} autoFocus style={{ padding: '9px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)' }}>
          {WIKI_CONNECTION_TYPES.map(option => <option key={option}>{option}</option>)}
          <option value="custom">Personalizado…</option>
        </select>
      </label>
      {type === 'custom' && <label style={{ display: 'grid', gap: '6px', marginBottom: '12px', fontSize: '.85rem' }}>Nome do relacionamento
        <input value={customType} onChange={event => setCustomType(event.target.value)} required maxLength={80} placeholder="Ex.: Jurou proteger" style={{ padding: '9px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
      </label>}
      <label style={{ display: 'grid', gap: '6px', marginBottom: '18px', fontSize: '.85rem' }}>Contexto opcional
        <textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={300} rows={3} placeholder="Ex.: Inimigos desde o Torneio de Harrenhal" style={{ padding: '9px', resize: 'vertical', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)' }} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancelar</button>
        <button type="submit" disabled={!finalType} style={{ padding: '8px 14px', borderRadius: '6px', border: 0, background: 'var(--accent-primary)', color: '#04130d', fontWeight: 700, cursor: finalType ? 'pointer' : 'not-allowed' }}>Salvar conexão</button>
      </div>
    </form>
  </div>;
};
