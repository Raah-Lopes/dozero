// src/components/Theater/EnemyBoard.tsx
import React, { useState } from 'react';
import { Skull, Plus, X, ChevronDown, Edit2 } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import {
  addTheaterEnemy,
  updateTheaterEnemy,
  removeTheaterEnemy,
  
  type NarrativeStatus,
  type TheaterEnemy,
} from '../../store';

const STATUS_CONFIG: Record<NarrativeStatus, { label: string; color: string; barPct: number; glow: boolean }> = {
  intact:   { label: 'Intacto',  color: '#10b981', barPct: 100, glow: false },
  hurt:     { label: 'Ferido',   color: '#f59e0b', barPct: 60,  glow: false },
  wounded:  { label: 'Grave',    color: '#f97316', barPct: 30,  glow: false },
  critical: { label: 'Crítico',  color: '#ef4444', barPct: 10,  glow: true  },
  dead:     { label: 'Morto',    color: '#4b5563', barPct: 0,   glow: false },
};

const CONDITIONS = [
  { id: 'burning',    label: '🔥', title: 'Queimando',  color: '#f97316' },
  { id: 'poisoned',  label: '☠',  title: 'Envenenado', color: '#22c55e' },
  { id: 'frozen',    label: '❄',  title: 'Congelado',  color: '#38bdf8' },
  { id: 'stunned',   label: '😵', title: 'Atordoado',  color: '#a855f7' },
  { id: 'bleeding',  label: '🩸', title: 'Sangrando',  color: '#ef4444' },
  { id: 'shielded',  label: '🛡', title: 'Protegido',  color: '#3b82f6' },
];

function EnemyCard({ enemy }: { enemy: TheaterEnemy }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(enemy.name);
  const cfg = STATUS_CONFIG[enemy.status];
  const isDead = enemy.status === 'dead';

  const handleSave = () => {
    setIsEditingName(false);
    if (editNameValue.trim() && editNameValue.trim() !== enemy.name) {
      updateTheaterEnemy(enemy.id, { name: editNameValue.trim() });
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        background: isDead ? 'rgba(0,0,0,0.1)' : enemy.isBoss ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)',
        border: enemy.isBoss
          ? `1px solid rgba(239,68,68,0.3)`
          : `1px solid rgba(255,255,255,${isDead ? '0.03' : '0.06'})`,
        borderRadius: '10px',
        padding: '10px 12px',
        opacity: isDead ? 0.5 : 1,
        transition: 'all 0.3s',
        boxShadow: (enemy.isBoss && !isDead) ? '0 0 20px rgba(239,68,68,0.15), inset 0 0 30px rgba(239,68,68,0.03)' : cfg.glow ? '0 0 12px rgba(239,68,68,0.15)' : 'none',
        animation: (enemy.isBoss && !isDead && enemy.status === 'critical') ? 'bossGlow 1.5s ease-in-out infinite alternate' : 'none',
      }}
    >
      <style>{`@keyframes bossGlow { from { box-shadow: 0 0 10px rgba(239,68,68,0.15); } to { box-shadow: 0 0 30px rgba(239,68,68,0.4); } }`}</style>

      {/* Boss badge */}
      {enemy.isBoss && !isDead && (
        <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.9)', color: 'white', fontSize: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          BOSS
        </div>
      )}
      {enemy.isElite && !enemy.isBoss && (
        <div style={{ position: 'absolute', top: '-8px', left: '12px', background: 'rgba(245,158,11,0.8)', color: 'white', fontSize: '0.55rem', fontWeight: 700, fontFamily: 'var(--font-display)', padding: '1px 6px', borderRadius: '8px' }}>
          ELITE
        </div>
      )}

      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Skull size={13} color={isDead ? '#374151' : cfg.color} />
        {isEditingName ? (
          <input
            autoFocus
            value={editNameValue}
            onChange={(e) => setEditNameValue(e.target.value)}
            onBlur={() => handleSave()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                setIsEditingName(false);
              }
            }}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '4px',
              color: 'white',
              padding: '2px 6px',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-body)',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflow: 'hidden' }}>
            <span
              onDoubleClick={() => {
                setIsEditingName(true);
                setEditNameValue(enemy.name);
              }}
              style={{
                flex: 1,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isDead ? '#374151' : '#f1f5f9',
                textDecoration: isDead ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'text'
              }}
              title="Duplo clique para renomear"
            >
              {enemy.name}
            </span>
            <button
              onClick={() => {
                setIsEditingName(true);
                setEditNameValue(enemy.name);
              }}
              style={{ background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              title="Editar nome"
            >
              <Edit2 size={11} />
            </button>
          </div>
        )}
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{ background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer', padding: '2px' }}
        >
          <ChevronDown size={13} style={{ transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        <button
          onClick={() => removeTheaterEnemy(enemy.id)}
          style={{ background: 'transparent', border: 'none', color: '#1f2937', cursor: 'pointer', padding: '2px' }}
          onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
          onMouseOut={e => e.currentTarget.style.color = '#1f2937'}
        >
          <X size={12} />
        </button>
      </div>

      {/* Status bar */}
      <div style={{ height: '5px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{
          width: `${cfg.barPct}%`, height: '100%',
          background: cfg.glow ? `linear-gradient(to right, ${cfg.color}88, ${cfg.color})` : cfg.color,
          borderRadius: '3px',
          transition: 'width 0.4s ease, background 0.4s ease',
          boxShadow: cfg.glow ? `0 0 8px ${cfg.color}` : 'none',
          animation: cfg.glow ? 'critPulse 0.6s ease-in-out infinite alternate' : 'none',
        }} />
        <style>{`@keyframes critPulse { from { opacity: 0.7; } to { opacity: 1; } }`}</style>
      </div>

      {/* Active conditions */}
      {enemy.conditions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
          {enemy.conditions.map(cId => {
            const c = CONDITIONS.find(x => x.id === cId);
            return c ? (
              <button key={cId} onClick={() => updateTheaterEnemy(enemy.id, { conditions: enemy.conditions.filter(x => x !== cId) })} title={`${c.title} — clique para remover`} style={{ padding: '1px 5px', borderRadius: '4px', background: `${c.color}15`, border: `1px solid ${c.color}30`, color: c.color, fontSize: '0.7rem', cursor: 'pointer' }}>
                {c.label}
              </button>
            ) : null;
          })}
        </div>
      )}

      {/* Expanded menu */}
      {showMenu && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
          {/* Status change */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {(Object.keys(STATUS_CONFIG) as NarrativeStatus[]).map(s => (
              <button key={s} onClick={() => { updateTheaterEnemy(enemy.id, { status: s }); setShowMenu(false); }} style={{ padding: '3px 8px', borderRadius: '5px', background: enemy.status === s ? `${STATUS_CONFIG[s].color}25` : 'rgba(255,255,255,0.04)', border: `1px solid ${enemy.status === s ? STATUS_CONFIG[s].color + '50' : 'rgba(255,255,255,0.06)'}`, color: enemy.status === s ? STATUS_CONFIG[s].color : '#64748b', fontSize: '0.7rem', cursor: 'pointer' }}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          {/* Add condition */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {CONDITIONS.filter(c => !enemy.conditions.includes(c.id)).map(c => (
              <button key={c.id} onClick={() => updateTheaterEnemy(enemy.id, { conditions: [...enemy.conditions, c.id] })} title={c.title} style={{ padding: '2px 7px', borderRadius: '5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b', fontSize: '0.72rem', cursor: 'pointer' }}>
                {c.label} {c.title}
              </button>
            ))}
          </div>
          {/* Notes */}
          <textarea
            value={enemy.notes}
            onChange={e => updateTheaterEnemy(enemy.id, { notes: e.target.value })}
            placeholder="Notas do mestre..."
            rows={2}
            style={{ width: '100%', marginTop: '8px', padding: '5px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.75rem', resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>
      )}
    </div>
  );
}

export const EnemyBoard: React.FC = () => {
  const { enemies } = useSceneState();
  const [addingName, setAddingName] = useState('');
  const [addingMode, setAddingMode] = useState(false);
  const [isBoss, setIsBoss] = useState(false);
  const [isElite, setIsElite] = useState(false);

  const handleAdd = () => {
    if (!addingName.trim()) return;
    addTheaterEnemy({ name: addingName.trim(), status: 'intact', conditions: [], isElite, isBoss, notes: '' });
    setAddingName('');
    setAddingMode(false);
    setIsBoss(false);
    setIsElite(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Skull size={15} color="#fca5a5" /> Ameaças
        </span>
        <button onClick={() => setAddingMode(!addingMode)} style={{ background: 'transparent', border: 'none', color: addingMode ? '#ef4444' : '#475569', cursor: 'pointer' }}>
          {addingMode ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {/* Add enemy form */}
      {addingMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            autoFocus
            value={addingName}
            onChange={e => setAddingName(e.target.value)}
            placeholder="Nome do inimigo..."
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingMode(false); }}
            style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.2)', color: 'white', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={isElite} onChange={e => setIsElite(e.target.checked)} style={{ cursor: 'pointer' }} /> Elite
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={isBoss} onChange={e => setIsBoss(e.target.checked)} style={{ cursor: 'pointer' }} /> Boss
            </label>
            <button onClick={handleAdd} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Enemy list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {enemies.length === 0 && !addingMode && (
          <div style={{ color: '#374151', textAlign: 'center', padding: '16px', fontSize: '0.8rem', fontStyle: 'italic' }}>
            Nenhuma ameaça em campo
          </div>
        )}
        {/* Boss first */}
        {enemies.filter(e => e.isBoss).map(e => <EnemyCard key={e.id} enemy={e} />)}
        {/* Elite */}
        {enemies.filter(e => e.isElite && !e.isBoss).map(e => <EnemyCard key={e.id} enemy={e} />)}
        {/* Regular */}
        {enemies.filter(e => !e.isBoss && !e.isElite).map(e => <EnemyCard key={e.id} enemy={e} />)}
      </div>
    </div>
  );
};
