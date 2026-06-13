import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [livekitUrl, setLivekitUrl] = useState(localStorage.getItem('livekitUrl') || '');
  const [livekitToken, setLivekitToken] = useState(localStorage.getItem('livekitToken') || '');
  const [rulesEngine, setRulesEngine] = useState(localStorage.getItem('rulesEngine') || 'wod_v5');

  const handleSave = () => {
    localStorage.setItem('livekitUrl', livekitUrl);
    localStorage.setItem('livekitToken', livekitToken);
    localStorage.setItem('rulesEngine', rulesEngine);
    // In a real implementation, we'd trigger a reload or context update here
    alert('Configurações salvas!');
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Configurações do Ecossistema</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Rules Engine Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Motor de Regras (Agnóstico)</label>
          <select 
            value={rulesEngine} 
            onChange={e => setRulesEngine(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }}
          >
            <option value="wod_v5">Vampiro A Máscara (WoD V5)</option>
            <option value="fate_condensed">Fate Condensed</option>
            <option value="dnd_5e">Dungeons & Dragons 5E</option>
          </select>
        </div>

        {/* LiveKit Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>LiveKit WebSocket URL (SFU)</label>
          <input 
            type="text" 
            placeholder="wss://seu-projeto.livekit.cloud" 
            value={livekitUrl}
            onChange={e => setLivekitUrl(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>LiveKit Access Token</label>
          <input 
            type="password" 
            placeholder="eyJh..." 
            value={livekitToken}
            onChange={e => setLivekitToken(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }} 
          />
        </div>
      </div>

      <button 
        onClick={handleSave}
        style={{ 
          width: '100%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '0.5rem', 
          padding: '0.75rem', 
          borderRadius: '8px', 
          border: 'none', 
          background: 'var(--accent-primary)', 
          color: 'white', 
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        <Save size={18} /> Salvar e Aplicar
      </button>
    </div>
  );
};
