import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state, restAtStronghold } from '../../../store';
import { Castle, Coins, Utensils, Droplets, Bed, Sparkles, Plus } from 'lucide-react';
import { toast } from '../../UI/Toast';

const UPGRADES_DB = [
  { id: 'cozinha', name: 'Cozinha Industrial', desc: 'Sacia completamente a Fome ao descansar.', cost: 100, icon: Utensils, color: '#eab308' },
  { id: 'poco', name: 'Poço Artesiano', desc: 'Mata completamente a Sede ao descansar.', cost: 80, icon: Droplets, color: '#3b82f6' },
  { id: 'camas', name: 'Alojamentos de Luxo', desc: 'Restaura a Vida e Mana a 100% ao descansar.', cost: 250, icon: Bed, color: '#ec4899' },
  { id: 'altar', name: 'Altar de Meditação', desc: 'Restaura a Sanidade a 100% ao descansar.', cost: 300, icon: Sparkles, color: '#a855f7' }
];

export const StrongholdWidget: React.FC<{ onClose?: () => void; embedded?: boolean }> = ({ onClose, embedded }) => {
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
      toast.warn("Ouro insuficiente na Tesouraria da Party.");
    }
  };

  const handleAddGold = () => {
    const amount = parseInt(prompt('Adicionar Ouro na Tesouraria:', '100') || '0', 10);
    if (!isNaN(amount) && amount > 0) {
      state.stronghold.set('data', { ...data, treasury: data.treasury + amount });
    }
  };

  const bodyContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.2rem', color: 'var(--text-primary)', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Castle size={24} color="var(--accent-primary)" />
          <input 
            type="text" 
            value={data.name} 
            onChange={(e) => state.stronghold.set('data', { ...data, name: e.target.value })}
            placeholder="Nome da Base (Ex: Forte da Colina)"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1rem', width: '200px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Coins size={18} color="#eab308" />
          <span style={{ fontWeight: 'bold', color: '#eab308' }}>{data.treasury} GP</span>
          <button onClick={handleAddGold} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }} title="Adicionar Ouro">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Ação de Descanso */}
      <button 
        onClick={() => restAtStronghold()}
        style={{
          padding: '0.75rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px',
          color: 'var(--text-primary)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
        }}
      >
        <Bed size={18} /> Descansar no Esconderijo (Recuperar Party)
      </button>

      {/* Lista de Upgrades */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Melhorias Disponíveis</span>
        
        {UPGRADES_DB.map(upg => {
          const isOwned = data.upgrades?.includes(upg.id);
          const canAfford = data.treasury >= upg.cost;
          const Icon = upg.icon;

          return (
            <div key={upg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '4px', background: `${upg.color}22`, color: upg.color }}>
                  <Icon size={16} />
                </div>
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
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow id="stronghold" widgetKey="stronghold" title="Fortaleza da Party" initialX={window.innerWidth / 2 - 200} initialY={100} width={420} height={400} onClose={onClose}>
      {bodyContent}
    </DraggableWindow>
  );
};
