import React, { useState, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { state } from '../../store';
import { ToyBrick, Check, Download, AlertCircle } from 'lucide-react';

export const DLCManagerWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // In a real app we would read the dir contents via an API or vite-plugin,
  // but for now we hardcode the available DLCs since we can't `fs.readdir` in the browser.
  const [availableDLCs, setAvailableDLCs] = useState<any[]>([
    { id: 'dlc_cyberpunk', name: 'Neon & Chrome (Cyberpunk)', description: 'Transforma a fantasia em um cenário futurista cyberpunk.', version: '1.0' }
  ]);
  const [activeDLCs, setActiveDLCs] = useState<string[]>([]);

  useEffect(() => {
    const observer = () => {
      const currentDlcs = state.dlcs.get('active') as string[] || [];
      setActiveDLCs(currentDlcs);
    };
    state.dlcs.observe(observer);
    observer();
    return () => state.dlcs.unobserve(observer);
  }, []);

  const toggleDLC = (dlcId: string) => {
    const current = state.dlcs.get('active') as string[] || [];
    if (current.includes(dlcId)) {
      state.dlcs.set('active', current.filter(id => id !== dlcId));
    } else {
      state.dlcs.set('active', [...current, dlcId]);
    }
  };

  return (
    <DraggableWindow id="dlc-manager" title="Mod Manager (DLCs)" initialX={window.innerWidth / 2 - 200} initialY={100} onClose={onClose} width={400} height={350}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', color: 'var(--text-primary)', height: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          <ToyBrick size={24} color="var(--accent-primary)" />
          <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase' }}>Gerenciador de Módulos</h3>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          Ative expansões para injetar novas tabelas de loot, nomes e rumores dinâmicos no VTT, substituindo as lógicas do cenário original.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, overflowY: 'auto' }}>
          {availableDLCs.map(dlc => {
            const isActive = activeDLCs.includes(dlc.id);
            return (
              <div key={dlc.id} style={{ 
                background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.4)', 
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)',
                borderRadius: '8px', padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', color: isActive ? '#6ee7b7' : 'white', fontSize: '0.9rem' }}>{dlc.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>v{dlc.version}</span>
                  </div>
                  
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={() => toggleDLC(dlc.id)}
                      style={{ display: 'none' }}
                    />
                    <div style={{ 
                      width: '40px', height: '22px', background: isActive ? '#10b981' : 'rgba(255,255,255,0.1)', 
                      borderRadius: '11px', position: 'relative', transition: 'background 0.3s' 
                    }}>
                      <div style={{ 
                        width: '18px', height: '18px', background: 'white', borderRadius: '50%', 
                        position: 'absolute', top: '2px', left: isActive ? '20px' : '2px', transition: 'left 0.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </label>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {dlc.description}
                </p>
                
                {isActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6ee7b7', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    <Check size={12} /> <span style={{ fontWeight: 'bold' }}>Arquivos Injetados no Engine</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button 
          style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--text-secondary)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}
        >
          <Download size={16} /> Instalar DLC via ZIP (Em breve)
        </button>

      </div>
    </DraggableWindow>
  );
};
