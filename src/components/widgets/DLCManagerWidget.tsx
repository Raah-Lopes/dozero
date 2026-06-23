import React, { useState, useEffect, useMemo } from 'react';
import { DraggableWindow } from '../HUD/DraggableWindow';
import { state } from '../../store';
import {
  ToyBrick, Check, Search, Zap, Swords, Skull, Anchor, Beaker,
  Clock, Volume2, BookMarked, Sparkles, Tag
} from 'lucide-react';

// --- ADDON REGISTRY ---
type AddonCategory = 'cenario' | 'mecanica' | 'utilidade';

interface AddonEntry {
  id: string;
  name: string;
  category: AddonCategory;
  description: string;
  version: string;
  author: string;
  icon: React.ElementType;
  iconColor: string;
  tags: string[];
  affects: string[];
  isNew?: boolean;
}

const ADDON_REGISTRY: AddonEntry[] = [
  {
    id: 'dlc_cyberpunk', name: 'Neon & Chrome', category: 'cenario',
    description: 'Substitui tabelas de fantasia medieval por cenário futurista cyberpunk com implantes, corporações e redes neurais.',
    version: '1.0', author: 'DOZERO Core', icon: Zap, iconColor: '#06b6d4',
    tags: ['Sci-Fi', 'Futuro'], affects: ['Oráculo', 'Lore Machine', 'Forja de NPCs'],
  },
  {
    id: 'dlc_horror', name: 'Névoa Carmesim', category: 'cenario',
    description: 'Atmosfera de horror gótico — mecânicas de sanidade, insanidade progressiva, entidades cósmicas e tabelas de pavor.',
    version: '1.0', author: 'DOZERO Core', icon: Skull, iconColor: '#ef4444',
    tags: ['Horror', 'Lovecraft'], affects: ['Oráculo', 'Lore Machine', 'Chronos'],
    isNew: true,
  },
  {
    id: 'dlc_pirates', name: 'Maré Negra', category: 'cenario',
    description: 'Regras náuticas completas: combate naval, tripulação, ilhas inexploradas, mapas marítimos e tesouro pirata.',
    version: '1.0', author: 'DOZERO Core', icon: Anchor, iconColor: '#3b82f6',
    tags: ['Piratas', 'Naval'], affects: ['Oráculo', 'Forja de Encontros', 'Motor de Mundo'],
    isNew: true,
  },
  {
    id: 'dlc_advanced_combat', name: 'Combate Tático+', category: 'mecanica',
    description: 'Flanqueamento, cobertura parcial, terreno difícil, reações de oportunidade e zonas de controle no grid.',
    version: '1.0', author: 'DOZERO Core', icon: Swords, iconColor: '#f59e0b',
    tags: ['Tático', 'Grid'], affects: ['Dados Automáticos', 'Iniciativa'],
  },
  {
    id: 'dlc_crafting', name: 'Forja & Alquimia', category: 'mecanica',
    description: 'Sistema de crafting com receitas, ingredientes coletáveis, bancadas de trabalho e poções alquímicas.',
    version: '1.0', author: 'DOZERO Core', icon: Beaker, iconColor: '#a855f7',
    tags: ['Crafting', 'Itens'], affects: ['Forja de Entidades', 'Fortaleza'],
    isNew: true,
  },
  {
    id: 'dlc_downtime', name: 'Tempos de Calma', category: 'mecanica',
    description: 'Atividades de downtime entre aventuras: treino de habilidades, negócios, pesquisa arcana, relações sociais.',
    version: '1.0', author: 'DOZERO Core', icon: Clock, iconColor: '#10b981',
    tags: ['Downtime', 'Social'], affects: ['Chronos', 'Gestor de Campanhas'],
  },
  {
    id: 'dlc_soundboard', name: 'Paisagem Sonora', category: 'utilidade',
    description: 'Banco de ambientes sonoros para imersão: taverna, floresta, masmorras, batalhas e chuva noturna.',
    version: '0.9', author: 'DOZERO Core', icon: Volume2, iconColor: '#64748b',
    tags: ['Áudio', 'Imersão'], affects: ['Interface Principal'],
  },
  {
    id: 'dlc_journal', name: 'Diário do Aventureiro', category: 'utilidade',
    description: 'Notas de sessão automáticas com timeline cronológica, marcação de momentos-chave e exportação em Markdown.',
    version: '0.9', author: 'DOZERO Core', icon: BookMarked, iconColor: '#ec4899',
    tags: ['Notas', 'Sessão'], affects: ['Gestor de Campanhas', 'Wiki'],
    isNew: true,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  todos: 'Todos',
  cenario: 'Cenário',
  mecanica: 'Mecânica',
  utilidade: 'Utilidade',
};

const CATEGORY_COLORS: Record<string, string> = {
  cenario: '#3b82f6',
  mecanica: '#f59e0b',
  utilidade: '#64748b',
};

export const DLCManagerWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeDLCs, setActiveDLCs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todos');

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

  const filtered = useMemo(() => {
    return ADDON_REGISTRY.filter(a => {
      if (activeCategory !== 'todos' && a.category !== activeCategory) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return a.name.toLowerCase().includes(s) || a.description.toLowerCase().includes(s) || a.tags.some(t => t.toLowerCase().includes(s));
      }
      return true;
    });
  }, [activeCategory, searchTerm]);

  const activeCount = activeDLCs.length;

  return (
    <DraggableWindow
      id="dlc-manager"
      title="Gerenciador de Complementos"
      initialX={window.innerWidth / 2 - 280}
      initialY={80}
      onClose={onClose}
      width={560}
      height={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <ToyBrick size={22} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', flex: 1 }}>Complementos</h3>
            <div style={{
              background: activeCount > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeCount > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '16px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
              color: activeCount > 0 ? '#6ee7b7' : '#64748b',
            }}>
              {activeCount} ativo{activeCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar complementos..."
              style={{
                width: '100%', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', padding: '7px 10px 7px 30px', color: '#f1f5f9', fontSize: '12px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                style={{
                  background: activeCategory === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: activeCategory === key ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                  borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                  color: activeCategory === key ? '#f1f5f9' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Addon Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignContent: 'start' }}>
          {filtered.map(addon => {
            const isActive = activeDLCs.includes(addon.id);
            const IconComp = addon.icon;
            const catColor = CATEGORY_COLORS[addon.category] || '#64748b';

            return (
              <div
                key={addon.id}
                style={{
                  background: isActive ? 'rgba(16,185,129,0.06)' : 'rgba(0,0,0,0.3)',
                  border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                }}
              >
                {/* New badge */}
                {addon.isNew && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)',
                    borderRadius: '10px', padding: '1px 7px', fontSize: '9px', fontWeight: 700, color: '#fcd34d',
                    letterSpacing: '0.5px',
                  }}>
                    NOVO
                  </div>
                )}

                {/* Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                    background: `${addon.iconColor}15`, border: `1px solid ${addon.iconColor}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconComp size={17} color={addon.iconColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: isActive ? '#6ee7b7' : '#f1f5f9', lineHeight: 1.3 }}>
                      {addon.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      v{addon.version} · {addon.author}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.45, flex: 1 }}>
                  {addon.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  <span style={{
                    background: `${catColor}20`, border: `1px solid ${catColor}44`, borderRadius: '10px',
                    padding: '1px 7px', fontSize: '9px', fontWeight: 600, color: catColor,
                  }}>
                    {CATEGORY_LABELS[addon.category]}
                  </span>
                  {addon.tags.map(tag => (
                    <span key={tag} style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '1px 6px', fontSize: '9px', color: '#64748b',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Affects */}
                <div style={{ fontSize: '10px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <Sparkles size={10} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>Afeta:</span>
                  {addon.affects.map((a, i) => (
                    <span key={a}>{a}{i < addon.affects.length - 1 ? ',' : ''}</span>
                  ))}
                </div>

                {/* Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: isActive ? '#6ee7b7' : '#475569' }}>
                    {isActive ? '● Ativo' : '○ Inativo'}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleDLC(addon.id)}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      width: '36px', height: '20px',
                      background: isActive ? '#10b981' : 'rgba(255,255,255,0.08)',
                      borderRadius: '10px', position: 'relative', transition: 'background 0.25s',
                      boxShadow: isActive ? '0 0 10px rgba(16,185,129,0.3)' : 'none',
                    }}>
                      <div style={{
                        width: '16px', height: '16px', background: 'white', borderRadius: '50%',
                        position: 'absolute', top: '2px', left: isActive ? '18px' : '2px',
                        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      }} />
                    </div>
                  </label>
                </div>

                {/* Active injection indicator */}
                {isActive && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    color: '#6ee7b7', fontSize: '10px', fontWeight: 600,
                    background: 'rgba(16,185,129,0.08)', borderRadius: '6px', padding: '3px 8px',
                  }}>
                    <Check size={11} /> Dados injetados no Engine
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#475569', fontSize: '13px' }}>
              <Search size={28} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <div>Nenhum complemento encontrado.</div>
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
