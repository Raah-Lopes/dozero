import React, { useEffect, useState } from 'react';
import { state } from '../../store';
import { Tokens } from '../../store/modules/tokenModule';
import { Shield, Zap, Skull, Settings, Unlock, Lock, Heart, Plus, Minus } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';

export function TokenContextHUD() {
  const { setShowActors } = useWindowManager();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tokenData, setTokenData] = useState<any | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      const ids = Tokens.getSelectedIds();
      setSelectedIds(ids);
      if (ids.length === 1) {
        setTokenData(state.tokens.get(ids[0]));
      } else {
        setTokenData(null);
      }
    };
    
    // Listen for selection changes
    window.addEventListener('token-selection-updated', handleSelection);
    
    // Subscribe to specific token changes if selected
    const tokenObserver = (event: any) => {
      const ids = Tokens.getSelectedIds();
      if (ids.length === 1 && event.keysChanged.has(ids[0])) {
        setTokenData(state.tokens.get(ids[0]));
      }
    };
    state.tokens.observe(tokenObserver);

    // Initial check
    handleSelection();

    return () => {
      window.removeEventListener('token-selection-updated', handleSelection);
      state.tokens.unobserve(tokenObserver);
    };
  }, []);

  if (!tokenData || selectedIds.length !== 1) return null;

  const updateStat = (field: string, delta: number) => {
    const current = Number(tokenData[field]) || 0;
    const max = Number(tokenData[`max${field.charAt(0).toUpperCase() + field.slice(1)}`]);
    let next = current + delta;
    if (!isNaN(max) && next > max && field !== 'hp') next = max;
    if (next < 0) next = 0;
    Tokens.update(tokenData.id, { [field]: next });
  };

  const toggleLock = () => {
    Tokens.update(tokenData.id, { locked: !tokenData.locked });
  };

  return (
    <div 
      className="token-context-hud"
      style={{
        position: 'absolute',
        bottom: '5.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.15)',
      padding: '0.75rem 1.5rem',
      borderRadius: '24px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      zIndex: 100,
      animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      {/* Avatar & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        {tokenData.imageUrl && (
          <img src={tokenData.imageUrl} alt={tokenData.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tokenData.name}</span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{tokenData.status || 'NPC'}</span>
        </div>
      </div>

      {/* HP Control */}
      <StatControl 
        icon={<Heart size={16} color="#ef4444" />} 
        value={tokenData.hp ?? 0} 
        max={tokenData.maxHp ?? 1} 
        color="#ef4444"
        onMinus={() => updateStat('hp', -1)}
        onPlus={() => updateStat('hp', 1)}
      />

      {/* MP Control */}
      <StatControl 
        icon={<Zap size={16} color="#3b82f6" />} 
        value={tokenData.mana ?? 0} 
        max={tokenData.maxMana ?? 0} 
        color="#3b82f6"
        onMinus={() => updateStat('mana', -1)}
        onPlus={() => updateStat('mana', 1)}
      />

      {/* Def/Armor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 0.5rem' }}>
        <div title="Defesa" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold' }}>
          <Shield size={16} /> {tokenData.defesa || 0}
        </div>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />

      {/* Actions */}
      <button onClick={toggleLock} title={tokenData.locked ? "Destravar" : "Travar"} style={actionButtonStyle}>
        {tokenData.locked ? <Lock size={18} color="#f59e0b" /> : <Unlock size={18} color="rgba(255,255,255,0.7)" />}
      </button>

      <button onClick={() => setShowActors(true)} title="Abrir Biblioteca de Atores" style={actionButtonStyle}>
        <Settings size={18} color="rgba(255,255,255,0.7)" />
      </button>

      <button onClick={() => { Tokens.delete(tokenData.id); }} title="Excluir Token" style={{ ...actionButtonStyle, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)' }}>
        <Skull size={18} color="#ef4444" />
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}} />
    </div>
  );
}

const actionButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

function StatControl({ icon, value, max, color, onMinus, onPlus }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
      {icon}
      <button onClick={onMinus} style={miniBtnStyle}><Minus size={12} /></button>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color, minWidth: '36px', textAlign: 'center' }}>
        {value}/{max}
      </span>
      <button onClick={onPlus} style={miniBtnStyle}><Plus size={12} /></button>
    </div>
  );
}

const miniBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: '6px',
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  cursor: 'pointer',
};
