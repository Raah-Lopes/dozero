import React, { useEffect, useState } from 'react';
import { state, toggleTarget, localState, pushChatMessage } from '../../store';
import { Tokens } from '../../store/modules/tokenModule';
import { Shield, Zap, Skull, Settings, Unlock, Lock, Heart, Plus, Minus, Crosshair, Coins, BookOpen, FileText, ScrollText, GitFork } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useWiki } from '../../hooks/useWiki';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { toast } from '../UI/Toast';
import { Tooltip } from '../UI/Tooltip';
import { saveCharacter } from '../../services/characterRepository';
import { integrateCharacter } from '../../services/characterIntegration';
import { DEFAULT_CHARACTER } from '../Sheets/Arcanum/lib';
import { ARCANUM_SHEET_KIND } from '../Sheets/arcanumSheetAdapter';

export function TokenContextHUD() {
  const { setShowActors, setActiveModal, setEditingTokenId, setActiveCharacterId, setSheetScope, setViewMode, openWindow } = useWindowManager();
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

  const openCharacterTools = async () => {
    if (tokenData.characterId) {
      setActiveCharacterId(tokenData.characterId); setSheetScope('campaign'); setViewMode('sheets'); return;
    }
    const character = structuredClone(DEFAULT_CHARACTER);
    character.name = tokenData.name || 'Personagem sem nome'; character.avatar = tokenData.imageUrl || '';
    character.vitals[0] = { ...character.vitals[0], value: Number(tokenData.hp) || 0, max: Number(tokenData.maxHp) || Number(tokenData.hp) || 0 };
    character.vitals[1] = { ...character.vitals[1], value: Number(tokenData.mana) || 0, max: Number(tokenData.maxMana) || Number(tokenData.mana) || 0 };
    try {
      const saved = await saveCharacter({ name: character.name, type: tokenType === 'enemy' || tokenType === 'monster' ? 'monster' : tokenType === 'player' ? 'pc' : 'npc', campaign_id: null, avatar_url: character.avatar, notes_markdown: '', data: { sheetKind: ARCANUM_SHEET_KIND, sheetVersion: 1, wikiPath: tokenData.wikiPath || '', character } });
      integrateCharacter(saved); state.sheets.set(saved.id, saved); Tokens.update(tokenData.id, { characterId: saved.id, wikiPath: String(saved.data.wikiPath || tokenData.wikiPath || '') });
      setActiveCharacterId(saved.id); setSheetScope('campaign'); setViewMode('sheets'); toast.success('Token convertido em ficha Arcanum e vinculado ao Códice.');
    } catch { toast.error('Não foi possível converter este token em ficha.'); }
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
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        padding: window.innerWidth <= 768 ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
        borderRadius: '24px',
        boxShadow: 'var(--glass-shadow)',
        zIndex: 100,
        maxWidth: '95vw',
        overflowX: 'auto',
        animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {/* Avatar & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)' }}>
          {tokenData.imageUrl && (
            <img src={tokenData.imageUrl} alt={tokenData.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tokenData.name}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{tokenData.status || 'NPC'}</span>
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
        <Tooltip label="Defesa" position="top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold' }}>
            <Shield size={16} /> {tokenData.defesa || 0}
          </div>
        </Tooltip>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />

      {/* Actions */}
      {tokenPo > 0 && tokenHp <= 0 && !isSaqueado && (
        <Tooltip label="Saquear e distribuir para a Party" position="top">
          <button onClick={handleLoot} style={{ ...actionButtonStyle, background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.5)' }}>
            <Coins size={18} color="#fde047" />
          </button>
        </Tooltip>
      )}

      <Tooltip label={isTargeted ? "Remover Alvo" : "Colocar como Alvo"} position="top">
        <button onClick={() => toggleTarget(tokenData.id)} style={{ ...actionButtonStyle, background: isTargeted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', border: isTargeted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)' }}>
          <Crosshair size={18} color={isTargeted ? "#ef4444" : "rgba(255,255,255,0.7)"} />
        </button>
      </Tooltip>

      <Tooltip label={tokenData.locked ? "Destravar" : "Travar"} position="top">
        <button onClick={toggleLock} style={actionButtonStyle}>
          {tokenData.locked ? <Lock size={18} color="#f59e0b" /> : <Unlock size={18} color="rgba(255,255,255,0.7)" />}
        </button>
      </Tooltip>

      <Tooltip label="Ficha Flutuante" position="top">
        <button 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-token-sheet', { detail: { tokenId: tokenData.id } }));
          }} 
          style={{ ...actionButtonStyle, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)' }}
        >
          <FileText size={18} color="#60a5fa" />
        </button>
      </Tooltip>

      <Tooltip label={tokenData.characterId ? "Abrir ficha, macros e auditoria" : "Converter token em ficha Arcanum"} position="top">
          <button 
            onClick={() => { void openCharacterTools(); }}
            style={{ ...actionButtonStyle, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)' }}
          >
            <ScrollText size={18} color="#f59e0b" />
          </button>
        </Tooltip>

      {(tokenData.wikiPath || entry?.path) && (
        <Tooltip label="Abrir Artigo na Wiki / Códice" position="top">
          <button 
            onClick={() => {
              const targetPath = tokenData.wikiPath || entry?.path;
              if (targetPath) {
                window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: targetPath } }));
              }
            }} 
            style={{ ...actionButtonStyle, background: 'rgba(216, 180, 90, 0.2)', border: '1px solid rgba(216, 180, 90, 0.5)' }}
          >
            <BookOpen size={18} color="#d8b45a" />
          </button>
        </Tooltip>
      )}

      <Tooltip label="Abrir família e relações do personagem" position="top">
        <button onClick={() => openWindow('lineage')} style={{ ...actionButtonStyle, background: 'rgba(251,146,60,.16)', border: '1px solid rgba(251,146,60,.45)' }}><GitFork size={18} color="#fb923c" /></button>
      </Tooltip>

      <Tooltip label="Configurações do Token" position="top">
        <button 
          onClick={() => {
            setEditingTokenId(tokenData.id);
            setActiveModal('tokenConfig');
          }} 
          style={{ ...actionButtonStyle, background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)' }}
        >
          <Settings size={18} color="#c084fc" />
        </button>
      </Tooltip>

      <Tooltip label="Excluir Token" position="top">
        <button onClick={() => { Tokens.delete(tokenData.id); }} style={{ ...actionButtonStyle, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)' }}>
          <Skull size={18} color="#ef4444" />
        </button>
      </Tooltip>

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
  background: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
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
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--glass-border)',
  borderRadius: '6px',
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};
