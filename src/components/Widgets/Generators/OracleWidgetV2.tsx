import React, { useState, useEffect, useMemo } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { pushChatMessage } from '../../../store';
import { 
  OracleParserV2, 
  DEFAULT_ORACLE_CATEGORIES, 
  type OracleCategory, 
  type OracleTable 
} from '../../../services/oracle/OracleParserV2';
import { 
  Search, Star, ChevronDown, ChevronRight, Dices, Sparkles, 
  Send, Copy, Zap, Flame, ShieldAlert, CloudSun, UserCheck, RefreshCw, X
} from 'lucide-react';
import { toast } from '../../UI/Toast';

// Avaliador de dados nativo ultra-rápido e à prova de falhas
function rollDiceNative(diceStr: string = '1d100'): { total: number; detail: string } {
  try {
    const clean = diceStr.trim().toLowerCase();
    const match = clean.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (match) {
      const count = parseInt(match[1]) || 1;
      const sides = parseInt(match[2]) || 100;
      const mod = match[3] ? parseInt(match[3]) : 0;
      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += Math.floor(Math.random() * sides) + 1;
      }
      const total = Math.max(1, sum + mod);
      return { total, detail: `${diceStr}: ${total}` };
    }
  } catch (e) {}

  const fallback = Math.floor(Math.random() * 100) + 1;
  return { total: fallback, detail: `1d100: ${fallback}` };
}

interface ActiveRollInspection {
  table: OracleTable;
  rollValue: number;
  result: string;
  dice: string;
  timestamp: number;
}

export function OracleWidgetV2({ onClose, embedded }: { onClose?: () => void; embedded?: boolean }) {
  const [categories, setCategories] = useState<OracleCategory[]>(DEFAULT_ORACLE_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { favs: true };
    DEFAULT_ORACLE_CATEGORIES.forEach(c => { initial[c.id] = true; });
    return initial;
  });
  const [activeInspection, setActiveInspection] = useState<ActiveRollInspection | null>(null);

  useEffect(() => {
    OracleParserV2.loadCategories().then(cats => {
      if (cats && cats.length > 0) {
        setCategories(cats);
        setOpenCategories(prev => {
          const next = { ...prev };
          cats.forEach(c => {
            if (next[c.id] === undefined) next[c.id] = true;
          });
          return next;
        });
      }
    }).catch(err => {
      console.warn('Usando matrizes embutidas do oráculo:', err);
    });
    
    try {
      const savedFavs = localStorage.getItem('oracle_favorites');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
    } catch (e) {}
  }, []);

  const toggleFavorite = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId];
      localStorage.setItem('oracle_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const rollTable = (table: OracleTable) => {
    const diceStr = table.dice || '1d100';
    const { total } = rollDiceNative(diceStr);
    
    let result = `Resultado [${total}]`;
    if (table.rows && table.rows.length > 0) {
      const row = table.rows.find(r => Number(total) >= Number(r.min) && Number(total) <= Number(r.max));
      if (row) {
        result = row.result;
      } else {
        result = table.rows[Math.floor(Math.random() * table.rows.length)].result;
      }
    }

    const inspection: ActiveRollInspection = {
      table,
      rollValue: total,
      result,
      dice: diceStr,
      timestamp: Date.now()
    };

    setActiveInspection(inspection);

    pushChatMessage(`
      <div style="background: rgba(168, 85, 247, 0.12); border-left: 4px solid #a855f7; padding: 10px; border-radius: 6px; font-family: sans-serif;">
        <div style="color: #c084fc; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
          <span>🔮 Oráculo: <b>${table.name}</b></span>
          <span style="font-size: 0.8em; color: var(--text-secondary); background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">Dado: ${total} (${diceStr})</span>
        </div>
        <div style="margin-top: 6px; font-size: 1rem; color: #ffffff; font-weight: 500;">
          ${result}
        </div>
      </div>
    `);

    toast.info(`Oráculo [${table.name}]: ${result}`);
  };

  const rollQuick = (tableId: string) => {
    for (const cat of categories) {
      const found = cat.tables.find(t => t.id === tableId || t.id.includes(tableId));
      if (found) {
        rollTable(found);
        return;
      }
    }
  };

  const copyResult = () => {
    if (activeInspection) {
      navigator.clipboard.writeText(`${activeInspection.table.name}: ${activeInspection.result}`);
      toast.success('Resultado copiado para a área de transferência!');
    }
  };

  const shareInspectionToChat = () => {
    if (!activeInspection) return;
    pushChatMessage(`
      <div style="background: rgba(168, 85, 247, 0.12); border-left: 4px solid #a855f7; padding: 10px; border-radius: 6px; font-family: sans-serif;">
        <div style="color: #c084fc; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
          <span>🔮 Oráculo: <b>${activeInspection.table.name}</b></span>
          <span style="font-size: 0.8em; color: var(--text-secondary); background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">Dado: ${activeInspection.rollValue} (${activeInspection.dice})</span>
        </div>
        <div style="margin-top: 6px; font-size: 1rem; color: #ffffff; font-weight: 500;">
          ${activeInspection.result}
        </div>
      </div>
    `);
    toast.success('Enviado ao chat!');
  };

  // Filtragem
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    
    return categories.map(cat => {
      if (cat.name.toLowerCase().includes(query)) return cat;
      const matchingTables = cat.tables.filter(t => t.name.toLowerCase().includes(query));
      if (matchingTables.length > 0) {
        return { ...cat, tables: matchingTables };
      }
      return null;
    }).filter(Boolean) as OracleCategory[];
  }, [categories, searchQuery]);

  // Favoritos
  const favoriteTables = useMemo(() => {
    const favs: OracleTable[] = [];
    categories.forEach(cat => {
      cat.tables.forEach(t => {
        if (favorites.includes(t.id)) favs.push(t);
      });
    });
    return favs;
  }, [categories, favorites]);

  useEffect(() => {
    if (searchQuery.trim() && filteredData.length > 0) {
      const newOpen: Record<string, boolean> = {};
      filteredData.forEach(c => { newOpen[c.id] = true; });
      setOpenCategories(newOpen);
    }
  }, [searchQuery, filteredData]);

  const bodyContent = (
    <div 
      data-no-drag="true"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        width: '100%', 
        overflow: 'hidden', 
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      
      {/* Barra Superior de Acesso Rápido */}
      <div 
        data-no-drag="true"
        style={{
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.45)',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          flexShrink: 0
        }}
      >
        <button
          type="button"
          data-no-drag="true"
          onClick={() => rollQuick('sim-nao-5050')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', background: 'rgba(168, 85, 247, 0.25)', border: '1px solid rgba(168, 85, 247, 0.5)',
            borderRadius: '6px', color: '#e9d5ff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <Sparkles size={13} color="#c084fc" /> Sim / Não (50/50)
        </button>

        <button
          type="button"
          data-no-drag="true"
          onClick={() => rollQuick('acoes-temas')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '6px', color: '#bfdbfe', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <Zap size={13} color="#60a5fa" /> Ação Narrativa
        </button>

        <button
          type="button"
          data-no-drag="true"
          onClick={() => rollQuick('reviravolta-narrativa')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '6px', color: '#fecaca', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <Flame size={13} color="#f87171" /> Reviravolta
        </button>

        <button
          type="button"
          data-no-drag="true"
          onClick={() => rollQuick('complicacao-falha')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', background: 'rgba(249, 115, 22, 0.25)', border: '1px solid rgba(249, 115, 22, 0.5)',
            borderRadius: '6px', color: '#fed7aa', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <ShieldAlert size={13} color="#fb923c" /> Complicação
        </button>

        <button
          type="button"
          data-no-drag="true"
          onClick={() => rollQuick('clima-metereologia')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', background: 'rgba(6, 182, 212, 0.25)', border: '1px solid rgba(6, 182, 212, 0.5)',
            borderRadius: '6px', color: '#a5f3fc', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <CloudSun size={13} color="#22d3ee" /> Clima
        </button>

        <button
          type="button"
          data-no-drag="true"
          onClick={() => rollQuick('disposicao-npc')}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 10px', background: 'rgba(34, 197, 94, 0.25)', border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '6px', color: '#bbf7d0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
          }}
        >
          <UserCheck size={13} color="#4ade80" /> Disposição NPC
        </button>
      </div>

      {/* Header / Barra de Pesquisa */}
      <div 
        data-no-drag="true"
        style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}
      >
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text"
            data-no-drag="true"
            placeholder="Pesquisar tabelas de oráculo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.8rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Lista de Tabelas e Acordeões */}
      <div 
        data-no-drag="true"
        style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
      >
        
        {/* Favoritos */}
        {favoriteTables.length > 0 && (
          <div style={{ marginBottom: '6px' }} data-no-drag="true">
            <button 
              type="button"
              data-no-drag="true"
              onClick={() => toggleCategory('favs')}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                padding: '7px 10px', background: 'rgba(251, 191, 36, 0.15)', borderRadius: '6px',
                border: '1px solid rgba(251, 191, 36, 0.35)', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.82rem',
                textAlign: 'left'
              }}
            >
              {openCategories['favs'] !== false ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <Star size={14} fill="#fbbf24" />
              <span>Tabelas Favoritas ({favoriteTables.length})</span>
            </button>
            
            {openCategories['favs'] !== false && (
              <div data-no-drag="true" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid rgba(251, 191, 36, 0.3)' }}>
                {favoriteTables.map((t, idx) => (
                  <div
                    key={`fav-${t.id}-${idx}`}
                    data-no-drag="true"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '4px 6px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={() => rollTable(t)}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', color: '#fff',
                        fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', padding: '4px 6px',
                        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500
                      }}
                    >
                      <Dices size={14} color="#fbbf24" /> {t.name}
                    </button>

                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={(e) => toggleFavorite(e, t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#fbbf24' }}
                    >
                      <Star size={14} fill="#fbbf24" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categorias Normais */}
        {filteredData.map(cat => {
          const isOpen = openCategories[cat.id] !== false;
          return (
            <div key={cat.id} style={{ display: 'flex', flexDirection: 'column' }} data-no-drag="true">
              <button 
                type="button"
                data-no-drag="true"
                onClick={() => toggleCategory(cat.id)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  padding: '7px 10px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px',
                  border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem',
                  textAlign: 'left'
                }}
              >
                {isOpen ? <ChevronDown size={15} color="var(--text-secondary)"/> : <ChevronRight size={15} color="var(--text-secondary)"/>}
                <span>{cat.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '8px' }}>
                  {cat.tables.length}
                </span>
              </button>

              {isOpen && (
                <div data-no-drag="true" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px', paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
                  {cat.tables.map((t, idx) => {
                    const isFav = favorites.includes(t.id);
                    return (
                      <div
                        key={`${cat.id}-${t.id}-${idx}`}
                        data-no-drag="true"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '3px 6px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '5px',
                          border: '1px solid transparent'
                        }}
                      >
                        <button
                          type="button"
                          data-no-drag="true"
                          onClick={() => rollTable(t)}
                          style={{
                            flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
                            fontSize: '0.78rem', textAlign: 'left', cursor: 'pointer', padding: '4px 6px',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <Dices size={13} color="var(--accent-primary)"/> {t.name}
                        </button>

                        <button
                          type="button"
                          data-no-drag="true"
                          onClick={(e) => toggleFavorite(e, t.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            color: isFav ? '#fbbf24' : 'rgba(255,255,255,0.2)', transition: 'color 0.15s'
                          }}
                          title={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                        >
                          <Star size={13} fill={isFav ? '#fbbf24' : 'none'} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 16px', fontSize: '0.82rem' }}>
            Nenhuma tabela encontrada para "{searchQuery}".
          </div>
        )}

      </div>

      {/* Painel Flutuante de Inspeção e Detalhe da Rolagem (Modal / Inspector) */}
      {activeInspection && (
        <div 
          data-no-drag="true"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '65%',
            background: 'rgba(15, 10, 25, 0.95)',
            backdropFilter: 'blur(16px)',
            borderTop: '2px solid #a855f7',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Header do Inspector */}
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(168, 85, 247, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#c084fc" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3e8ff' }}>
                {activeInspection.table.name}
              </span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(0,0,0,0.4)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                Dado: {activeInspection.rollValue} ({activeInspection.dice})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => rollTable(activeInspection.table)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', background: '#a855f7', border: 'none',
                  borderRadius: '5px', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <RefreshCw size={11} /> Rolar de Novo
              </button>

              <button
                type="button"
                onClick={shareInspectionToChat}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)',
                  borderRadius: '5px', color: '#fff', fontSize: '0.72rem', cursor: 'pointer'
                }}
              >
                <Send size={11} /> Chat
              </button>

              <button
                type="button"
                onClick={copyResult}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)',
                  borderRadius: '5px', color: '#fff', fontSize: '0.72rem', cursor: 'pointer'
                }}
              >
                <Copy size={11} /> Copiar
              </button>

              <button
                type="button"
                onClick={() => setActiveInspection(null)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Resultado Principal em Grande Destaque */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(168, 85, 247, 0.05))',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '2px' }}>
              Resultado Obtido:
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: '1.4' }}>
              {activeInspection.result}
            </div>
          </div>

          {/* Lista de Linhas da Tabela com a Sorteada Marcada */}
          {activeInspection.table.rows && activeInspection.table.rows.length > 0 && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
                Todas as Opções da Matriz:
              </div>
              {activeInspection.table.rows.map((r, i) => {
                const isSelected = Number(activeInspection.rollValue) >= Number(r.min) && Number(activeInspection.rollValue) <= Number(r.max);
                return (
                  <div
                    key={`inspect-row-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: isSelected ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #a855f7' : '1px solid transparent',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 400
                    }}
                  >
                    <span style={{
                      width: '45px', flexShrink: 0, color: isSelected ? '#c084fc' : 'var(--text-secondary)',
                      fontFamily: 'monospace', fontSize: '0.72rem'
                    }}>
                      {r.min === r.max ? r.min : `${r.min}-${r.max}`}
                    </span>
                    <span style={{ flex: 1 }}>{r.result}</span>
                    {isSelected && <span style={{ color: '#c084fc', fontSize: '0.7rem', fontWeight: 700 }}>🎯 Sorteado</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow 
      id="mega-oracle-v2"
      title="🔮 Mega Oráculo V2" 
      onClose={onClose} 
      width={420}
      height={580}
      initialX={window.innerWidth / 2 - 210} 
      initialY={100}
      dragAnywhere={false}
    >
      {bodyContent}
    </DraggableWindow>
  );
}
