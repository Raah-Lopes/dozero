// src/components/Theater/CastPanel.tsx
import React, { useState } from 'react';
import { User, Skull, Cpu, Heart, Droplets, RefreshCw,  X, Edit2 } from 'lucide-react';
import { useCastData } from './hooks/useCastData';
import { useSceneState } from './hooks/useSceneState';
import { toggleCastCondition } from '../../store';
import { saveMarkdownContent, loadMarkdownFile } from '../../utils/githubApi';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';

const CONDITIONS = [
  { id: 'burning',    label: '🔥', title: 'Queimando',    color: '#f97316' },
  { id: 'poisoned',  label: '☠',  title: 'Envenenado',   color: '#22c55e' },
  { id: 'frozen',    label: '❄',  title: 'Congelado',    color: '#38bdf8' },
  { id: 'stunned',   label: '😵', title: 'Atordoado',    color: '#a855f7' },
  { id: 'frightened',label: '👁', title: 'Assustado',    color: '#eab308' },
  { id: 'bleeding',  label: '🩸', title: 'Sangrando',    color: '#ef4444' },
  { id: 'inspired',  label: '⭐', title: 'Inspirado',    color: '#fbbf24' },
  { id: 'invisible', label: '👻', title: 'Invisível',    color: '#94a3b8' },
  { id: 'shielded',  label: '🛡', title: 'Protegido',    color: '#3b82f6' },
  { id: 'weakened',  label: '💀', title: 'Enfraquecido', color: '#6b7280' },
];

function PVBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ height: '5px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease', boxShadow: pct < 30 ? `0 0 6px ${color}` : 'none' }} />
    </div>
  );
}

function ManaBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div style={{ height: '4px', background: 'rgba(0,0,0,0.4)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '2px', transition: 'width 0.4s ease' }} />
    </div>
  );
}

export const CastPanel: React.FC = () => {
  const { members, players, npcs, loading, reload } = useCastData();
  const { castConditions } = useSceneState();
  const [showNPCs, setShowNPCs] = useState(false);
  const [activeCondMenu, setActiveCondMenu] = useState<string | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');

  const handleSaveName = async (path: string, newName: string) => {
    setEditingPath(null);
    if (!newName.trim()) return;
    const success = await syncTokenFieldToWiki(path, 'titulo', newName.trim());
    if (success) {
      reload();
    }
  };

  const statusIcon = (s: string) => {
    if (s === 'npc') return <Cpu size={13} color="#93c5fd" />;
    if (s === 'inimigo') return <Skull size={13} color="#fca5a5" />;
    return <User size={13} color="#6ee7b7" />;
  };

  const renderMember = (m: typeof members[0]) => {
    const conditions = castConditions[m.caminhoArquivo] || [];
    const activeConditions = CONDITIONS.filter(c => conditions.includes(c.id));
    const pvPct = m.pv_max > 0 ? (m.pv / m.pv_max) * 100 : 0;

    return (
      <div
        key={m.caminhoArquivo}
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: pvPct < 30 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '12px',
          position: 'relative',
          transition: 'all 0.2s',
          boxShadow: pvPct < 30 ? '0 0 12px rgba(239,68,68,0.1)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer', overflow: 'hidden' }}
            onClick={() => window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: m.caminhoArquivo }))}
            title="Abrir Ficha do Personagem"
          >
            {m.avatar ? (
              <img 
                src={m.avatar} 
                alt={m.nome} 
                style={{ width: '32px', height: '42px', borderRadius: '4px', objectFit: 'cover', border: m.status === 'jogador' ? '1px solid #10b981' : '1px solid #3b82f6' }} 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              statusIcon(m.status)
            )}
            {editingPath === m.caminhoArquivo ? (
              <input
                autoFocus
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={() => handleSaveName(m.caminhoArquivo, editNameValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveName(m.caminhoArquivo, editNameValue);
                  } else if (e.key === 'Escape') {
                    setEditingPath(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid #3b82f6',
                  borderRadius: '4px',
                  color: 'white',
                  padding: '2px 6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  width: '100%',
                }}
              />
            ) : (
              <span 
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingPath(m.caminhoArquivo);
                  setEditNameValue(m.nome);
                }}
                style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title="Duplo clique para renomear"
              >
                {m.nome}
              </span>
            )}
          </div>
          {editingPath !== m.caminhoArquivo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingPath(m.caminhoArquivo);
                setEditNameValue(m.nome);
              }}
              style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              title="Editar nome"
            >
              <Edit2 size={11} />
            </button>
          )}
          <span style={{ fontSize: '0.7rem', color: '#475569', background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px' }}>Nv.{m.nivel}</span>
          {/* Conditions button */}
          <button
            onClick={() => setActiveCondMenu(activeCondMenu === m.caminhoArquivo ? null : m.caminhoArquivo)}
            style={{ background: 'transparent', border: 'none', color: activeCondMenu === m.caminhoArquivo ? '#a855f7' : '#374151', cursor: 'pointer', padding: '2px', fontSize: '0.7rem' }}
            title="Gerenciar condições"
          >
            ＋
          </button>
        </div>

        {/* PV bar */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginBottom: '3px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Heart size={10} color={pvPct < 30 ? '#ef4444' : '#10b981'} /> PV</span>
            <span>{m.pv}/{m.pv_max}</span>
          </div>
          <PVBar current={m.pv} max={m.pv_max} />
        </div>

        {/* Mana bar */}
        {m.mana_max > 0 && (
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginBottom: '3px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Droplets size={10} color="#3b82f6" /> Mana</span>
              <span>{m.mana}/{m.mana_max}</span>
            </div>
            <ManaBar current={m.mana} max={m.mana_max} />
          </div>
        )}

        {/* Active conditions chips */}
        {activeConditions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
            {activeConditions.map(c => (
              <button
                key={c.id}
                onClick={() => toggleCastCondition(m.caminhoArquivo, c.id)}
                title={`${c.title} — clique para remover`}
                style={{ padding: '2px 6px', borderRadius: '4px', background: `${c.color}20`, border: `1px solid ${c.color}40`, color: c.color, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                {c.label} {c.title}
              </button>
            ))}
          </div>
        )}

        {/* Condition selector popup */}
        {activeCondMenu === m.caminhoArquivo && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-display)' }}>CONDIÇÕES</span>
              <button onClick={() => setActiveCondMenu(null)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={12} /></button>
            </div>
            {CONDITIONS.map(c => {
              const active = conditions.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleCastCondition(m.caminhoArquivo, c.id)} title={c.title} style={{ padding: '4px 8px', borderRadius: '6px', background: active ? `${c.color}25` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? c.color + '50' : 'rgba(255,255,255,0.06)'}`, color: active ? c.color : '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {c.label} {c.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={15} color="#6ee7b7" /> Elenco
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setShowNPCs(!showNPCs)} style={{ padding: '3px 8px', borderRadius: '6px', background: showNPCs ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showNPCs ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`, color: showNPCs ? '#93c5fd' : '#475569', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={11} /> NPCs
          </button>
          <button onClick={reload} disabled={loading} style={{ background: 'transparent', border: 'none', color: loading ? '#1f2937' : '#475569', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* Cast list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {loading && (
          <div style={{ color: '#374151', textAlign: 'center', padding: '20px', fontSize: '0.8rem' }}>Carregando...</div>
        )}
        {!loading && players.length === 0 && (
          <div style={{ color: '#374151', textAlign: 'center', padding: '12px', fontSize: '0.8rem', fontStyle: 'italic' }}>
            Crie fichas em <code style={{ fontSize: '0.75rem', color: '#475569' }}>Personagens/</code> na Wiki
          </div>
        )}
        {players.map(renderMember)}
        {showNPCs && npcs.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-display)', padding: '4px 0 0' }}>NPCs</div>
            {npcs.map(renderMember)}
          </>
        )}
      </div>
    </div>
  );
};
