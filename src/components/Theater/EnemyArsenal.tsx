import React, { useState } from 'react';
import { Skull, Plus, X, Copy, Zap } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import {
  addTheaterEnemy,
  updateTheaterEnemy,
  removeTheaterEnemy,
  type NarrativeStatus,
  type TheaterEnemy,
} from '../../store';

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

function EnemyCard({ enemy }: { enemy: TheaterEnemy }) {
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

  const handleClone = () => {
    // Tenta encontrar um número no final do nome, ex: "Goblin 1" -> "Goblin 2"
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
        position: 'relative',
        background: isDead ? 'rgba(0,0,0,0.1)' : enemy.isBoss ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)',
        border: enemy.isBoss
          ? `1px solid rgba(239,68,68,0.3)`
          : `1px solid rgba(255,255,255,${isDead ? '0.03' : '0.06'})`,
        borderRadius: '10px',
        padding: '10px',
        opacity: isDead ? 0.5 : 1,
        transition: 'all 0.3s',
        boxShadow: (enemy.isBoss && !isDead) ? '0 0 20px rgba(239,68,68,0.15), inset 0 0 30px rgba(239,68,68,0.03)' : cfg.glow ? '0 0 12px rgba(239,68,68,0.15)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {/* Name and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skull size={14} color={isDead ? '#374151' : cfg.color} />
          {enemy.isBoss && <div style={{ position: 'absolute', top: -10, left: -6, fontSize: '0.6rem' }}>👑</div>}
        </div>
        
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
            style={{
              flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '0.8rem'
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { setIsEditingName(true); setEditNameValue(enemy.name); }}
            style={{
              flex: 1, fontSize: '0.85rem', fontWeight: 600, color: isDead ? '#374151' : '#f1f5f9',
              textDecoration: isDead ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text'
            }}
          >
            {enemy.name} {enemy.isElite && !enemy.isBoss && <span style={{ color: '#f59e0b', fontSize: '0.65rem', verticalAlign: 'top', marginLeft: '4px' }}>[Elite]</span>}
          </span>
        )}

        <button onClick={handleClone} title="Clonar Ameaça" style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>
          <Copy size={13} />
        </button>
        <button onClick={() => removeTheaterEnemy(enemy.id)} title="Remover" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
          <X size={14} />
        </button>
      </div>

      {/* Clickable Status Bar */}
      <div style={{ display: 'flex', width: '100%', height: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        {STATUS_ORDER.map((s) => {
          const sCfg = STATUS_CONFIG[s];
          const isActive = enemy.status === s;
          const isPassed = STATUS_ORDER.indexOf(s) <= STATUS_ORDER.indexOf(enemy.status);
          
          return (
            <div
              key={s}
              onClick={() => updateTheaterEnemy(enemy.id, { status: s })}
              title={sCfg.label}
              style={{
                flex: 1,
                borderRight: '1px solid rgba(0,0,0,0.3)',
                background: isActive ? sCfg.color : (isPassed ? sCfg.color + '40' : 'transparent'),
                cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = sCfg.color + '80'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = isActive ? sCfg.color : (isPassed ? sCfg.color + '40' : 'transparent'); }}
            >
              {isActive && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white' }} />}
            </div>
          );
        })}
      </div>

      {/* Conditions Toggle Bar */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {CONDITIONS.map(c => {
          const active = enemy.conditions.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCondition(c.id)}
              title={c.title}
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                background: active ? `${c.color}20` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? c.color : 'rgba(255,255,255,0.05)'}`,
                color: active ? c.color : '#64748b',
                fontSize: '0.75rem',
                cursor: 'pointer',
                opacity: active ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
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

  const handleMagicGenerate = async () => {
    if (!addingName.trim()) {
      alert('Digite um conceito para gerar (ex: "Lobo Gigante")');
      return;
    }
    const promptBase = encodeURIComponent(`Crie uma ficha super curta de RPG para o monstro "${addingName.trim()}". Retorne apenas o nome gerado (mais imponente).`);
    try {
      const res = await fetch(`https://text.pollinations.ai/${promptBase}`);
      const text = await res.text();
      addTheaterEnemy({ name: text.substring(0, 40).trim() || addingName, status: 'intact', conditions: [], isElite, isBoss, notes: '' });
      setAddingName('');
      setAddingMode(false);
    } catch (err) {
      console.error(err);
      handleAdd();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Skull size={15} color="#fca5a5" /> Arsenal de Ameaças
        </span>
        <button onClick={() => setAddingMode(!addingMode)} style={{ background: 'transparent', border: 'none', color: addingMode ? '#ef4444' : '#475569', cursor: 'pointer' }}>
          {addingMode ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>

      {/* Add enemy form */}
      {addingMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              autoFocus
              value={addingName}
              onChange={e => setAddingName(e.target.value)}
              placeholder="Nome (ex: Goblin 1)"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingMode(false); }}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.2)', color: 'white', fontSize: '0.82rem', width: '100%' }}
            />
            <button onClick={handleMagicGenerate} title="Gerar com IA Mágica" style={{ padding: '0 10px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '6px', color: '#c084fc', cursor: 'pointer' }}>
              <Zap size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={isElite} onChange={e => setIsElite(e.target.checked)} style={{ cursor: 'pointer' }} /> Elite
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={isBoss} onChange={e => setIsBoss(e.target.checked)} style={{ cursor: 'pointer' }} /> Boss
            </label>
            <button onClick={handleAdd} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Enemy list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
        {enemies.length === 0 && !addingMode && (
          <div style={{ color: '#374151', textAlign: 'center', padding: '16px', fontSize: '0.8rem', fontStyle: 'italic' }}>
            Nenhuma ameaça no arsenal
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
