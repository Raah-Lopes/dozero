import React, { useState } from 'react';
import { Skull, Plus, X, Copy, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import {
  addTheaterEnemy,
  updateTheaterEnemy,
  removeTheaterEnemy,
  type NarrativeStatus,
  type TheaterEnemy,
} from '../../store';
import { GlassAccordion } from '../UI/GlassAccordion';

const STATUS_ORDER: NarrativeStatus[] = ['intact', 'hurt', 'wounded', 'critical', 'dead'];

const STATUS_CONFIG: Record<NarrativeStatus, { label: string; color: string; glow: boolean }> = {
  intact:   { label: 'Intacto',  color: '#10b981', glow: false },
  hurt:     { label: 'Ferido',   color: '#f59e0b', glow: false },
  wounded:  { label: 'Grave',    color: '#f97316', glow: false },
  critical: { label: 'Crítico',  color: '#ef4444', glow: true  },
  dead:     { label: 'Morto',    color: '#4b5563', glow: false },
};

const CONDITIONS = [
  { id: 'burning',    label: '🔥', title: 'Queimando',  color: '#f97316' },
  { id: 'poisoned',  label: '☠',  title: 'Envenenado', color: '#22c55e' },
  { id: 'frozen',    label: '❄',  title: 'Congelado',  color: '#38bdf8' },
  { id: 'stunned',   label: '😵', title: 'Atordoado',  color: '#a855f7' },
  { id: 'bleeding',  label: '🩸', title: 'Sangrando',  color: '#ef4444' },
  { id: 'shielded',  label: '🛡', title: 'Protegido',  color: '#3b82f6' },
];

function EnemyCompactCard({ enemy }: { enemy: TheaterEnemy }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(enemy.name);
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[enemy.status];
  const isDead = enemy.status === 'dead';

  const handleSave = () => {
    setIsEditingName(false);
    if (editNameValue.trim() && editNameValue.trim() !== enemy.name) {
      updateTheaterEnemy(enemy.id, { name: editNameValue.trim() });
    }
  };

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    let newName = enemy.name;
    const match = newName.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      newName = newName.replace(/\d+$/, (num + 1).toString());
    } else {
      newName = `${newName} 2`;
    }
    addTheaterEnemy({
      name: newName,
      status: enemy.status,
      conditions: [...enemy.conditions],
      isElite: enemy.isElite,
      isBoss: enemy.isBoss,
      notes: enemy.notes
    });
  };

  const toggleCondition = (cId: string) => {
    if (enemy.conditions.includes(cId)) {
      updateTheaterEnemy(enemy.id, { conditions: enemy.conditions.filter(x => x !== cId) });
    } else {
      updateTheaterEnemy(enemy.id, { conditions: [...enemy.conditions, cId] });
    }
  };

  return (
    <div
      style={{
        background: isDead ? 'rgba(0,0,0,0.1)' : enemy.isBoss ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)',
        border: enemy.isBoss
          ? `1px solid rgba(239,68,68,${expanded ? '0.5' : '0.2'})`
          : `1px solid rgba(255,255,255,${isDead ? '0.03' : expanded ? '0.1' : '0.05'})`,
        borderRadius: '8px',
        opacity: isDead ? 0.6 : 1,
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header Compacto */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
          cursor: 'pointer', background: expanded ? 'rgba(255,255,255,0.03)' : 'transparent'
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDead ? '#374151' : cfg.color, boxShadow: cfg.glow ? `0 0 8px ${cfg.color}` : 'none' }} />
        </div>
        
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {isEditingName ? (
            <input
              autoFocus
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '0.8rem'
              }}
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditingName(true); setEditNameValue(enemy.name); }}
              style={{
                fontSize: '0.82rem', fontWeight: enemy.isBoss ? 700 : 600, color: isDead ? '#374151' : (enemy.isBoss ? '#fca5a5' : '#f1f5f9'),
                textDecoration: isDead ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}
            >
              {enemy.name}
            </span>
          )}
        </div>

        {/* Action icons right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: expanded ? 1 : 0.4 }}>
          {expanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
        </div>
      </div>

      {/* Área Expansível */}
      {expanded && (
        <div style={{ padding: '8px 10px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Barra de Status */}
          <div style={{ display: 'flex', width: '100%', height: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            {STATUS_ORDER.map((s) => {
              const sCfg = STATUS_CONFIG[s];
              const isActive = enemy.status === s;
              const isPassed = STATUS_ORDER.indexOf(s) <= STATUS_ORDER.indexOf(enemy.status);
              return (
                <div
                  key={s}
                  onClick={(e) => { e.stopPropagation(); updateTheaterEnemy(enemy.id, { status: s }); }}
                  title={sCfg.label}
                  style={{
                    flex: 1, borderRight: '1px solid rgba(0,0,0,0.3)',
                    background: isActive ? sCfg.color : (isPassed ? sCfg.color + '40' : 'transparent'),
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isActive && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white' }} />}
                </div>
              );
            })}
          </div>

          {/* Botões de Condições e Ações */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
              {CONDITIONS.map(c => {
                const active = enemy.conditions.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={(e) => { e.stopPropagation(); toggleCondition(c.id); }}
                    title={c.title}
                    style={{
                      padding: '2px 4px', borderRadius: '4px',
                      background: active ? `${c.color}20` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? c.color : 'rgba(255,255,255,0.05)'}`,
                      color: active ? c.color : '#64748b', fontSize: '0.7rem',
                      cursor: 'pointer', opacity: active ? 1 : 0.5,
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleClone} title="Clonar Ameaça" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                <Copy size={13} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeTheaterEnemy(enemy.id); }} title="Remover" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const EnemyArsenal: React.FC = () => {
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

  const bosses = enemies.filter(e => e.isBoss);
  const elites = enemies.filter(e => e.isElite && !e.isBoss);
  const minions = enemies.filter(e => !e.isBoss && !e.isElite);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Skull size={15} color="#fca5a5" /> Arsenal de Ameaças
        </span>
        <button onClick={() => setAddingMode(!addingMode)} style={{ background: 'transparent', border: 'none', color: addingMode ? '#ef4444' : '#475569', cursor: 'pointer' }}>
          {addingMode ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {/* Add enemy form */}
      {addingMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              autoFocus
              value={addingName}
              onChange={e => setAddingName(e.target.value)}
              placeholder="Nome (ex: Goblin 1)"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingMode(false); }}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.2)', color: 'white', fontSize: '0.82rem', width: '100%' }}
            />
            <button onClick={handleAdd} style={{ padding: '0 10px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer' }}>
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingLeft: '2px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={isElite} onChange={e => setIsElite(e.target.checked)} style={{ cursor: 'pointer' }} /> Elite
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={isBoss} onChange={e => setIsBoss(e.target.checked)} style={{ cursor: 'pointer' }} /> Boss
            </label>
          </div>
        </div>
      )}

      {/* Area de scroll nativo sem afetar o layout pai */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
        
        {enemies.length === 0 && !addingMode && (
          <div style={{ color: '#475569', textAlign: 'center', padding: '24px 16px', fontSize: '0.8rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
            O campo de batalha está limpo.
          </div>
        )}

        {bosses.length > 0 && (
          <GlassAccordion title={<><span style={{ color: '#fca5a5' }}>👑</span> Chefes ({bosses.length})</>} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {bosses.map(e => <EnemyCompactCard key={e.id} enemy={e} />)}
            </div>
          </GlassAccordion>
        )}

        {elites.length > 0 && (
          <GlassAccordion title={<><span style={{ color: '#f59e0b' }}>⚔️</span> Elites ({elites.length})</>} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {elites.map(e => <EnemyCompactCard key={e.id} enemy={e} />)}
            </div>
          </GlassAccordion>
        )}

        {minions.length > 0 && (
          <GlassAccordion title={<><span style={{ color: '#94a3b8' }}>🗡️</span> Lacaios ({minions.length})</>} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {minions.map(e => <EnemyCompactCard key={e.id} enemy={e} />)}
            </div>
          </GlassAccordion>
        )}

      </div>
    </div>
  );
};
