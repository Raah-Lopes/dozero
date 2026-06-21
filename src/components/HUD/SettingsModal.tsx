import React, { useState, useEffect } from 'react';
import { X, Save, Globe } from 'lucide-react';
// @ts-ignore - auto fix
import { getWikiConfig, updateWikiConfig, state } from '../../store';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [livekitUrl, setLivekitUrl] = useState(localStorage.getItem('livekitUrl') || '');
  const [livekitToken, setLivekitToken] = useState(localStorage.getItem('livekitToken') || '');
  const [rulesEngine, setRulesEngine] = useState(localStorage.getItem('rulesEngine') || 'wod_v5');
  const [isGM, setIsGM] = useState(localStorage.getItem('isGM') === 'true');
  const [wikiRepo, setWikiRepo] = useState('');
  const [wikiBranch, setWikiBranch] = useState('main');
  const [wikiToken, setWikiToken] = useState('');

  useEffect(() => {
    const config = getWikiConfig();
    setWikiRepo(config.repoUrl || '');
    setWikiBranch(config.branch || 'main');
    setWikiToken(config.token || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('livekitUrl', livekitUrl);
    localStorage.setItem('livekitToken', livekitToken);
    localStorage.setItem('rulesEngine', rulesEngine);
    localStorage.setItem('isGM', isGM ? 'true' : 'false');
    
    // Save Wiki Config to Global Yjs State
    updateWikiConfig({
      repoUrl: wikiRepo,
      branch: wikiBranch,
      token: wikiToken
    });

    // Forçar recarregamento para aplicar o isGM globalmente
    window.location.reload();
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
        
        {/* GM Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px' }}>
          <input 
            type="checkbox" 
            id="isGM_toggle"
            checked={isGM}
            onChange={(e) => setIsGM(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="isGM_toggle" style={{ fontSize: '0.9rem', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}>
            Habilitar Modo Mestre (GM)
          </label>
        </div>

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

        <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>LiveKit Access Token</label>
          <input 
            type="password" 
            autoComplete="new-password"
            placeholder="eyJh..." 
            value={livekitToken}
            onChange={e => setLivekitToken(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }} 
          />
        </form>
        
        <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%', margin: '0.5rem 0' }} />

        {/* Wiki GitHub Configuration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '-0.5rem' }}>
          <Globe size={18} color="var(--text-secondary)" />
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Wiki Descentralizada (Git)</h4>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Repositório (Autor/Repo)</label>
          <input 
            type="text" 
            placeholder="Ex: Raah-Lopes/rpg-obsidian-mestre-guiado" 
            value={wikiRepo}
            onChange={e => setWikiRepo(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Branch</label>
            <input 
              type="text" 
              placeholder="main" 
              value={wikiBranch}
              onChange={e => setWikiBranch(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }} 
            />
          </div>
          <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 2 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Token de Acesso (Privado)</label>
            <input 
              type="password" 
              autoComplete="new-password"
              placeholder="github_pat_..." 
              value={wikiToken}
              onChange={e => setWikiToken(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'white' }} 
            />
          </form>
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
