import React, { useState, useEffect, useMemo } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { pushChatMessage } from '../../store';
import { OracleParserV2, type OracleCategory, type OracleTable } from '../../services/oracle/OracleParserV2';
// @ts-ignore - auto fix
import { Search, Star, ChevronDown, ChevronRight, Dices, Sparkles } from 'lucide-react';

export function OracleWidgetV2({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<OracleCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [lastResult, setLastResult] = useState<{table: string, result: string, timestamp: number} | null>(null);

  useEffect(() => {
    OracleParserV2.loadCategories().then(cats => {
      setCategories(cats);
    });
    
    try {
      const savedFavs = localStorage.getItem('oracle_favorites');
      if (savedFavs) {
        setFavorites(JSON.parse(savedFavs));
      }
    } catch (e) {}
  }, []);

  const toggleFavorite = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation(); // prevent roll
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
    let total = 1;
    try {
      const roll = new DiceRoll(table.dice);
      total = roll.total;
    } catch (e) {
      console.warn(`Erro no dado ${table.dice}. Usando 1d100.`);
      total = new DiceRoll('1d100').total;
    }
    
    const row = table.rows.find(r => total >= r.min && total <= r.max);
    const result = row ? row.result : `Resultado: ${total}`;

    setLastResult({ table: table.name, result, timestamp: Date.now() });

    pushChatMessage(`
      <div style="color: var(--accent-primary); display:flex; align-items:center; gap: 4px;">
        <Sparkles size={14} /> <b>Oráculo Divino</b>
      </div>
      Consultou: <b>${table.name}</b><br/>${result}
    `);
  };

  // Filtragem e Agrupamento
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    
    return categories.map(cat => {
      // Se o nome da categoria bate, retorna todas as tabelas
      if (cat.name.toLowerCase().includes(query)) return cat;
      
      // Senão filtra as tabelas
      const matchingTables = cat.tables.filter(t => t.name.toLowerCase().includes(query));
      if (matchingTables.length > 0) {
        return { ...cat, tables: matchingTables };
      }
      return null;
    }).filter(Boolean) as OracleCategory[];
  }, [categories, searchQuery]);

  // Construir array de tabelas favoritas completas
  const favoriteTables = useMemo(() => {
    const favs: OracleTable[] = [];
    categories.forEach(cat => {
      cat.tables.forEach(t => {
        if (favorites.includes(t.id)) favs.push(t);
      });
    });
    return favs;
  }, [categories, favorites]);

  // Quando pesquisa, abrir todas as categorias filtradas automaticamente
  useEffect(() => {
    if (searchQuery.trim() && filteredData.length > 0) {
      const newOpen: Record<string, boolean> = {};
      filteredData.forEach(c => { newOpen[c.id] = true; });
      setOpenCategories(newOpen);
    }
  }, [searchQuery, filteredData]);

  return (
    <DraggableWindow 
      id="mega-oracle-v2"
      title="Mega Oráculo" 
      onClose={onClose} 
      width={380}
      height={550}
      initialX={window.innerWidth / 2 - 190} 
      initialY={100}
      dragAnywhere={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Header / Barra de Pesquisa */}
        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input 
              type="text"
              placeholder="Pesquisar categoria ou tabela..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Último Resultado Fixado no Topo */}
        {lastResult && (
          <div key={lastResult.timestamp} style={{
            margin: '12px 16px 0 16px',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(255, 122, 0, 0.15), rgba(255, 122, 0, 0.05))',
            border: '1px solid rgba(255, 122, 0, 0.3)',
            borderRadius: '8px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
              Último: {lastResult.table}
            </div>
            <div style={{ fontSize: '14px', color: 'white', lineHeight: '1.4' }}>
              {lastResult.result}
            </div>
          </div>
        )}

        {/* Lista de Acordeões (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          <style>
            {`
              .table-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: rgba(255,255,255,0.02);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid transparent;
              }
              .table-row:hover {
                background: rgba(255,255,255,0.08);
                border-color: var(--glass-border);
              }
              .table-row:active {
                transform: scale(0.98);
                border-color: var(--accent-primary);
              }
              .fav-btn {
                color: var(--text-secondary);
                transition: all 0.2s;
                padding: 4px;
                display: flex;
              }
              .fav-btn:hover {
                color: #fbbf24;
                transform: scale(1.2);
              }
              .fav-btn.active {
                color: #fbbf24;
                fill: #fbbf24;
              }
            `}
          </style>

          {/* Favoritos (Aparece apenas se não estiver pesquisando e tiver favoritos) */}
          {!searchQuery && favoriteTables.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div 
                onClick={() => toggleCategory('favs')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.2)', color: '#fbbf24', fontWeight: 'bold' }}
              >
                {openCategories['favs'] !== false ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <Star size={16} fill="#fbbf24" />
                <span>Favoritos ({favoriteTables.length})</span>
              </div>
              
              {openCategories['favs'] !== false && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid rgba(251, 191, 36, 0.2)' }}>
                  {favoriteTables.map(t => (
                    <div key={`fav-${t.id}`} className="table-row" onClick={() => rollTable(t)}>
                      <span style={{ fontSize: '13px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}><Dices size={14} color="var(--accent-primary)"/> {t.name}</span>
                      <div className="fav-btn active" onClick={(e) => toggleFavorite(e, t.id)}>
                        <Star size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de Categorias Normais */}
          {filteredData.map(cat => {
            const isOpen = openCategories[cat.id] || false;
            return (
              <div key={cat.id}>
                <div 
                  onClick={() => toggleCategory(cat.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontWeight: 600 }}
                >
                  {isOpen ? <ChevronDown size={18} color="var(--text-secondary)"/> : <ChevronRight size={18} color="var(--text-secondary)"/>}
                  <span>{cat.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '10px' }}>
                    {cat.tables.length}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                    {cat.tables.map(t => {
                      const isFav = favorites.includes(t.id);
                      return (
                        <div key={t.id} className="table-row" onClick={() => rollTable(t)}>
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Dices size={14} color="var(--text-secondary)"/> {t.name}
                          </span>
                          <div className={`fav-btn ${isFav ? 'active' : ''}`} onClick={(e) => toggleFavorite(e, t.id)}>
                            <Star size={16} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredData.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '32px' }}>
              Nenhuma tabela encontrada para "{searchQuery}"
            </div>
          )}

        </div>
      </div>
    </DraggableWindow>
  );
}
