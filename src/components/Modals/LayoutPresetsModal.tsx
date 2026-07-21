import React, { useState, useEffect } from 'react';
import { X, Save, Monitor, Trash2, RotateCcw, Check, Sparkles, Layout } from 'lucide-react';
import { toast } from '../UI/Toast';
import { useWindowManager } from '../../hooks/useWindowManager';

export interface LayoutPreset {
  id: string;
  name: string;
  windows: Record<string, { x: number; y: number; width: number; height: number; pinned: boolean }>;
  createdAt: number;
}

interface PopoutItem {
  id: string;
  title: string;
  screen: { availLeft: number; availTop: number; width: number; height: number };
  timestamp: number;
}

interface LayoutPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayoutPresetsModal: React.FC<LayoutPresetsModalProps> = ({ isOpen, onClose }) => {
  const { openWindows, toggleWindow } = useWindowManager();
  const [presets, setPresets] = useState<LayoutPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [popouts, setPopouts] = useState<PopoutItem[]>([]);

  const loadSavedData = () => {
    // Load Presets
    try {
      const saved = localStorage.getItem('dozero_layout_presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch(e) {}

    // Load Popouts
    const activePopouts: PopoutItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('popout_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          activePopouts.push({
            id: key.replace('popout_', ''),
            title: data.title || key.replace('popout_', ''),
            screen: data.screen || { availLeft: 0, availTop: 0, width: 1920, height: 1080 },
            timestamp: data.timestamp || Date.now()
          });
        } catch(e) {}
      }
    }
    setPopouts(activePopouts);
  };

  useEffect(() => {
    if (isOpen) loadSavedData();
  }, [isOpen]);

  if (!isOpen) return null;

  const saveCurrentLayout = () => {
    const layout: Record<string, any> = {};
    Object.entries(openWindows).forEach(([id, win]) => {
      if (win.isOpen) {
        const savedPrefs = localStorage.getItem(`window_prefs_${id}`);
        if (savedPrefs) {
          try { layout[id] = JSON.parse(savedPrefs); } catch(e) {}
        }
      }
    });

    const newPreset: LayoutPreset = {
      id: Date.now().toString(),
      name: presetName.trim() || `Layout ${presets.length + 1}`,
      windows: layout,
      createdAt: Date.now()
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('dozero_layout_presets', JSON.stringify(updated));
    setPresetName('');
    toast.success(`Preset "${newPreset.name}" salvo com sucesso!`);
  };

  const loadPreset = (preset: LayoutPreset) => {
    Object.entries(preset.windows).forEach(([id, config]) => {
      localStorage.setItem(`window_prefs_${id}`, JSON.stringify(config));
      toggleWindow(id, true); // Abrir janela se não estiver aberta
      window.dispatchEvent(new CustomEvent('bring-window-to-front', { detail: id }));
    });
    toast.success(`Layout "${preset.name}" carregado!`);
  };

  const deletePreset = (presetId: string) => {
    const updated = presets.filter(p => p.id !== presetId);
    setPresets(updated);
    localStorage.setItem('dozero_layout_presets', JSON.stringify(updated));
    toast.info('Preset removido.');
  };

  const recallPopout = (popoutId: string) => {
    localStorage.removeItem(`popout_${popoutId}`);
    window.dispatchEvent(new CustomEvent('recall-popout', { detail: { id: popoutId } }));
    toggleWindow(popoutId, true);
    loadSavedData();
    toast.success('Janela resgatada de volta para esta tela!');
  };

  const recallAllPopouts = () => {
    popouts.forEach(p => {
      localStorage.removeItem(`popout_${p.id}`);
      toggleWindow(p.id, true);
    });
    setPopouts([]);
    toast.success('Todas as janelas foram resgatadas!');
  };

  const applySuggestedPreset = (type: 'gm' | 'player' | 'narrative') => {
    if (type === 'gm') {
      toggleWindow('combatTracker', true);
      toggleWindow('gmNotes', true);
      toggleWindow('audioDirector', true);
      toast.success('Layout "Mestre Focado" aplicado!');
    } else if (type === 'player') {
      toggleWindow('chatWindow', true);
      toggleWindow('diceRoller', true);
      toggleWindow('playerQuickBar', true);
      toast.success('Layout "Visão do Jogador" aplicado!');
    } else if (type === 'narrative') {
      toggleWindow('conspiracyBoard', true);
      toggleWindow('oracle', true);
      toast.success('Layout "Modo Narrativo" aplicado!');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)', padding: '20px', width: '100%', maxWidth: '520px',
        maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px',
        boxShadow: 'var(--glass-shadow)', color: 'var(--text-primary)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }} className="text-gold">
            <Layout size={20} /> Layouts & Multi-Monitor
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Salvar Layout Atual */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>💾 Salvar Configuração Atual de Janelas</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Ex: Setup Combate 2 Monitores..."
              style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <button
              onClick={saveCurrentLayout}
              style={{ padding: '8px 14px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={14} /> Salvar
            </button>
          </div>
        </div>

        {/* Dashboard de Widgets em Outras Telas (Popouts) */}
        {popouts.length > 0 && (
          <div style={{ background: 'rgba(99,102,241,0.08)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={16} /> Widgets Destacados ({popouts.length})
              </span>
              <button
                onClick={recallAllPopouts}
                style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '4px', color: '#fca5a5', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                Trazer Todos de Volta
              </button>
            </div>
            {popouts.map(p => (
              <div key={p.id} className="popout-item">
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{p.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Monitor {p.screen.availLeft > 0 ? 'Secundário' : 'Principal'} ({p.screen.width}x{p.screen.height})
                  </div>
                </div>
                <button
                  onClick={() => recallPopout(p.id)}
                  style={{ padding: '4px 10px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={12} /> Trazer de Volta
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Presets Salvos do Usuário */}
        {presets.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Seus Presets Salvos:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {presets.map(p => (
                <div key={p.id} className="preset-item">
                  <div>
                    <strong style={{ fontSize: '0.85rem' }}>{p.name}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                      ({Object.keys(p.windows).length} janelas)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => loadPreset(p)}
                      style={{ padding: '4px 10px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', color: '#f0abfc', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Carregar
                    </button>
                    <button
                      onClick={() => deletePreset(p.id)}
                      style={{ padding: '4px 6px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sugestões Rápidas */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} /> Layouts Recomendados:
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <button
              onClick={() => applySuggestedPreset('gm')}
              style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
            >
              🎯 <strong>Mestre Focado</strong><br/><span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Combate + Notas + Áudio</span>
            </button>
            <button
              onClick={() => applySuggestedPreset('player')}
              style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
            >
              👤 <strong>Visão Jogador</strong><br/><span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Chat + Dados + QuickBar</span>
            </button>
            <button
              onClick={() => applySuggestedPreset('narrative')}
              style={{ padding: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center' }}
            >
              📖 <strong>Modo Narrativo</strong><br/><span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Conspiração + Oráculo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
