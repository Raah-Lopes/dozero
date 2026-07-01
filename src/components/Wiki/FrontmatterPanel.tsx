import React, { useState, useEffect } from 'react';
import { Database, ChevronDown, ChevronRight, Plus, Trash2, Wand2 } from 'lucide-react';

interface FrontmatterPanelProps {
  rawYaml: string;
  onChange: (newYaml: string) => void;
}

export const FrontmatterPanel: React.FC<FrontmatterPanelProps> = ({ rawYaml, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fields, setFields] = useState<{key: string, value: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAvatar = (index: number) => {
    const nomeField = fields.find(f => f.key.toLowerCase() === 'nome' || f.key.toLowerCase() === 'name');
    const nome = nomeField ? nomeField.value : 'Aventureiro Misterioso';
    
    setIsGenerating(true);
    const promptText = `Epic RPG character portrait, ${nome}, detailed face, fantasy art concept, masterpiece, 4k`;
    const encodedPrompt = encodeURIComponent(promptText);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    
    setTimeout(() => {
      updateField(index, fields[index].key, url);
      setIsGenerating(false);
    }, 1500);
  };

  // Parse very simple flat YAML
  useEffect(() => {
    const lines = rawYaml.split('\n').filter(l => l.trim().length > 0);
    const parsed = lines.map(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return { key: line.trim(), value: '' };
      return { 
        key: line.slice(0, idx).trim(), 
        value: line.slice(idx + 1).trim() 
      };
    });
    setFields(parsed);
  }, [rawYaml]);

  const serializeAndSave = (newFields: {key: string, value: string}[]) => {
    const newYaml = newFields.map(f => `${f.key}: ${f.value}`).join('\n');
    onChange(newYaml);
  };

  const updateField = (index: number, key: string, value: string) => {
    const newFields = [...fields];
    newFields[index] = { key, value };
    setFields(newFields);
    serializeAndSave(newFields);
  };

  const addField = () => {
    const newFields = [...fields, { key: 'nova_propriedade', value: 'valor' }];
    setFields(newFields);
    serializeAndSave(newFields);
    setIsExpanded(true);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    serializeAndSave(newFields);
  };

  if (!rawYaml && fields.length === 0 && !isExpanded) {
    return (
      <div style={{ padding: '0.5rem 0', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
        <button 
          onClick={() => { setIsExpanded(true); addField(); }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px' }}
          className="hover-glow"
        >
          <Plus size={14} /> Adicionar Propriedades
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.5rem 0', userSelect: 'none' }}
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Database size={15} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Propriedades</span>
        {!isExpanded && (
          <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '0.5rem' }}>
            ({fields.length} campos)
          </span>
        )}
      </div>

      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          {fields.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                value={f.key}
                onChange={(e) => updateField(i, e.target.value, f.value)}
                style={{ width: '120px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                placeholder="Chave"
              />
              <input
                value={f.value}
                onChange={(e) => updateField(i, f.key, e.target.value)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                placeholder="Valor"
              />
              {(f.key.toLowerCase() === 'avatar' || f.key.toLowerCase() === 'imagem' || f.key.toLowerCase() === 'image') && (
                <button
                  onClick={() => handleGenerateAvatar(i)}
                  disabled={isGenerating}
                  style={{
                    background: 'linear-gradient(to right, rgba(59,130,246,0.2), rgba(168,85,247,0.2))',
                    border: '1px solid rgba(168,85,247,0.4)',
                    color: '#e2e8f0',
                    cursor: isGenerating ? 'wait' : 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    opacity: isGenerating ? 0.6 : 1
                  }}
                  title="Gerar imagem de avatar com IA Mágica"
                >
                  <Wand2 size={13} color="#fcd34d" />
                </button>
              )}
              <button 
                onClick={() => removeField(i)}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                title="Remover Propriedade"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button 
            onClick={addField}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '4px 0', marginTop: '0.3rem' }}
          >
            <Plus size={14} /> Adicionar Propriedade
          </button>
        </div>
      )}
    </div>
  );
};
