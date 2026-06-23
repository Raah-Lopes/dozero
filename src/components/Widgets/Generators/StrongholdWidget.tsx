import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state, restAtStronghold } from '../../../store';
import { Castle, Coins, Utensils, Droplets, Bed, Sparkles, Plus } from 'lucide-react';

const UPGRADES_DB = [
  { id: 'cozinha', name: 'Cozinha Industrial', desc: 'Sacia completamente a Fome ao descansar.', cost: 100, icon: Utensils, color: '#eab308' },
  { id: 'poco', name: 'Poço Artesiano', desc: 'Mata completamente a Sede ao descansar.', cost: 80, icon: Droplets, color: '#3b82f6' },
  { id: 'camas', name: 'Alojamentos de Luxo', desc: 'Restaura a Vida e Mana a 100% ao descansar.', cost: 250, icon: Bed, color: '#ec4899' },
  { id: 'altar', name: 'Altar de Meditação', desc: 'Restaura a Sanidade a 100% ao descansar.', cost: 300, icon: Sparkles, color: '#a855f7' }
];

export const StrongholdWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [data, setData] = useState<any>({ name: '', treasury: 0, upgrades: [] });

  useEffect(() => {
    const observer = () => {
      setData(state.stronghold.get('data') as any || { name: '', treasury: 0, upgrades: [] });
    };
    state.stronghold.observe(observer);
    observer();
    return () => state.stronghold.unobserve(observer);
  }, []);

  const handleBuyUpgrade = (upgradeId: string, cost: number) => {
    if (data.treasury >= cost) {
      const newUpgrades = [...data.upgrades, upgradeId];
      state.stronghold.set('data', { ...data, treasury: data.treasury - cost, upgrades: newUpgrades });
    } else {
      alert("Ouro insuficiente na Tesouraria da Party.");
    }
  };

  const handleAddGold = () => {
    const amount = parseInt(prompt('Adicionar Ouro na Tesouraria:', '100') || '0', 10);
    if (!isNaN(amount) && amount > 0) {
      state.stronghold.set('data', { ...data, treasury: data.treasury + amount });
    }
  };

  const handleRest = () => {
    restAtStronghold();
  };

  return (
    <DraggableWindow id="stronghold" title="Fortaleza da Party" initialX={window.innerWidth / 2 - 200} initialY={100} width={400} height={480} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>
        
        {/* Cabeçalho */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <Castle size={40} color="var(--accent-primary)" />
          <h2 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{data.name || 'Sede da Party'}</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--warning)', fontWeight: 'bold' }}>
            <Coins size={18} />
            <span style={{ fontSize: '1.2rem' }}>{data.treasury} Ouro</span>
            <button onClick={handleAddGold} className="btn-icon" style={{ marginLeft: '0.5rem' }} title="Depositar Ouro"><Plus size={14}/></button>
          </div>
        </div>

        {/* Botão de Descanso */}
        <button 
          onClick={handleRest}
          style={{ 
            width: '100%', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          <Bed size={18} />
          DESCANSAR NA BASE (Avançar Tempo)
        </button>

        <div style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }} />

        {/* Lista de Upgrades */}
        <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Melhorias Disponíveis</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {UPGRADES_DB.map(upg => {
            const isOwned = data.upgrades.includes(upg.id);
            const canAfford = data.treasury >= upg.cost;
            const Icon = upg.icon;

            return (
              <div key={upg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: isOwned ? `rgba(255,255,255,0.05)` : 'rgba(0,0,0,0.3)', border: `1px solid ${isOwned ? upg.color : 'var(--glass-border)'}`, borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={20} color={isOwned ? upg.color : 'var(--text-secondary)'} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isOwned ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{upg.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{upg.desc}</span>
                  </div>
                </div>

                {isOwned ? (
                  <span style={{ color: upg.color, fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Instalado</span>
                ) : (
                  <button 
                    onClick={() => handleBuyUpgrade(upg.id, upg.cost)}
                    disabled={!canAfford}
                    style={{
                      padding: '0.25rem 0.5rem', background: canAfford ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                      color: canAfford ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '4px', cursor: canAfford ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold', fontSize: '0.8rem'
                    }}
                  >
                    {upg.cost}G
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </DraggableWindow>
  );
};
