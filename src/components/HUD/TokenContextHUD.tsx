import React, { useEffect, useState } from 'react';
import { state, toggleTarget, localState, pushChatMessage } from '../../store';
import { Tokens } from '../../store/modules/tokenModule';
import { Shield, Zap, Skull, Settings, Unlock, Lock, Heart, Plus, Minus, Crosshair, Coins } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useWiki } from '../../hooks/useWiki';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { toast } from '../UI/Toast';

export function TokenContextHUD() {
  const { setShowActors } = useWindowManager();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tokenData, setTokenData] = useState<any | null>(null);
  const [isTargeted, setIsTargeted] = useState(false);
  const { index } = useWiki();

  useEffect(() => {
    const handleSelection = () => {
      const ids = Tokens.getSelectedIds();
      setSelectedIds(ids);
      if (ids.length === 1) {
        setTokenData(state.tokens.get(ids[0]));
        setIsTargeted(localState.targets.has(ids[0]));
      } else {
        setTokenData(null);
        setIsTargeted(false);
      }
    };
    
    const handleTargetUpdate = () => {
      const ids = Tokens.getSelectedIds();
      if (ids.length === 1) setIsTargeted(localState.targets.has(ids[0]));
    };
    
    // Listen for selection changes
    window.addEventListener('token-selection-updated', handleSelection);
    window.addEventListener('targets-updated', handleTargetUpdate);
    
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
      window.removeEventListener('targets-updated', handleTargetUpdate);
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

  const entry = index.find(e => {
    if (tokenData?.wikiPath && e.path === tokenData.wikiPath) return true;
    if (tokenData?.wikiSlug && e.slug === tokenData.wikiSlug) return true;
    if (tokenData?.name && (e.slug === tokenData.name || e.metadata?.nome === tokenData.name || e.metadata?.titulo === tokenData.name)) return true;
    return false;
  });
  const meta = entry?.metadata || {};
  const tokenType = tokenData?.tipo || meta.tipo || tokenData?.status || meta.status || 'npc';
  const tokenPo = Number(tokenData?.po ?? tokenData?.ouro ?? meta.po ?? meta.PO ?? meta.ouro ?? meta.Ouro) || 0;
  const tokenHp = Number(tokenData?.hp ?? meta.hp ?? meta.pv ?? meta.HP) || 0;
  const isSaqueado = tokenData?.saqueado || meta.saqueado;

  const parseNum = (val: any, fallback: number): number => {
    if (val === undefined || val === null || val === '') return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  };

  const handleLoot = async () => {
    const goldToDistribute = tokenPo;
    if (goldToDistribute <= 0) {
      toast.warn("Não há ouro para saquear.");
      return;
    }

    const players = index.filter(e => {
      const status = e.metadata?.status;
      const tipo = e.metadata?.tipo;
      const isChar = status === 'jogador' || tipo === 'pc' || tipo === 'Personagem' || (e.metadata?.tags && e.metadata.tags.includes('personagem'));
      const isAlive = parseNum(e.metadata?.hp ?? e.metadata?.pv ?? e.metadata?.HP, 10) > 0;
      const isAtivo = e.metadata?.ativo !== false;
      return isChar && isAlive && isAtivo;
    });

    if (players.length === 0) {
      pushChatMessage(`Nenhum jogador ativo para receber o saque!`, false, true);
      return;
    }

    const perPlayer = Math.floor(goldToDistribute / players.length);

    let successCount = 0;
    for (const player of players) {
      const currentGold = parseNum(player.metadata?.po ?? player.metadata?.PO ?? player.metadata?.ouro ?? player.metadata?.Ouro, 0);
      const newGold = currentGold + perPlayer;
      
      const success = await syncTokenFieldToWiki(player.path, 'po', newGold);
      if (success) successCount++;
    }

    if (successCount > 0) {
      pushChatMessage(`**Saque de ${tokenData.name}**: ${goldToDistribute} PO divididos entre ${players.length} jogadores. (${perPlayer} PO para cada)`, false, true);
      Tokens.update(tokenData.id, { po: 0, saqueado: true });
      if (tokenData.wikiPath) {
        await syncTokenFieldToWiki(tokenData.wikiPath, 'po', 0);
        await syncTokenFieldToWiki(tokenData.wikiPath, 'saqueado', true);
      }
      
      window.dispatchEvent(new CustomEvent('theater-cutscene', {
        detail: {
          title: `💰 SAQUE: ${tokenData.name} 💰`,
          subtitle: `${goldToDistribute} PO divididos entre a party! (+${perPlayer} para cada)`,
          imageUrl: tokenData.imageUrl || '',
          durationMs: 4000
        }
      }));

      toast.success("Saque distribuído com sucesso!");
    } else {
      toast.error("Erro ao distribuir saque.");
    }
  };

  const toggleLock = () => {
    Tokens.update(tokenData.id, { locked: !tokenData.locked });
  };

  return (
    <div 
      className="token-context-hud"
      style={{
        position: 'absolute',
        bottom: window.innerWidth <= 768 ? '10rem' : '7.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: window.innerWidth <= 768 ? '0.5rem' : '1rem',
        background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.15)',
      padding: window.innerWidth <= 768 ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
      borderRadius: '24px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      zIndex: 100,
      maxWidth: '95vw',
      overflowX: 'auto',
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
      {tokenPo > 0 && tokenHp <= 0 && !isSaqueado && (
        <button onClick={handleLoot} title="Saquear e distribuir para a Party" style={{ ...actionButtonStyle, background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.5)' }}>
          <Coins size={18} color="#fde047" />
        </button>
      )}

      <button onClick={() => toggleTarget(tokenData.id)} title={isTargeted ? "Remover Alvo" : "Colocar como Alvo"} style={{ ...actionButtonStyle, background: isTargeted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', border: isTargeted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)' }}>
        <Crosshair size={18} color={isTargeted ? "#ef4444" : "rgba(255,255,255,0.7)"} />
      </button>

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
