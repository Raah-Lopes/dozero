import React, { useState, useEffect } from 'react';
import * as yaml from 'js-yaml';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';
import './CharacterSheet.css';
import { 
  Heart, Zap, Shield, Crosshair, Plus, Trash2, 
  Sparkles, Package, Book, Sword, Dice5, History, ChevronRight 
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CharacterSheetProps {
  rawYaml: string;
  onChange: (newYaml: string) => void;
}

export interface SpellItem {
  id?: string;
  nome: string;
  circulo?: number | string;
  custo_pm?: number;
  alcance?: string;
  tempo?: string;
  dano?: string;
  descricao?: string;
}

export interface InventoryItem {
  id?: string;
  nome: string;
  quantidade?: number;
  peso?: number;
  preco?: string;
  dano?: string;
  descricao?: string;
  equipado?: boolean;
}

export interface QuickAction {
  id?: string;
  nome: string;
  ataqueBonus?: number;
  dano?: string;
  tipo?: string;
}

export interface SessionNote {
  id?: string;
  data: string;
  resumo: string;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ rawYaml, onChange }) => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'magias' | 'inventario' | 'biografia'>('geral');

  // Formulários inline de adição
  const [newSpell, setNewSpell] = useState<SpellItem>({ nome: '', circulo: 1, custo_pm: 1, dano: '', alcance: 'Curto', descricao: '' });
  const [showAddSpell, setShowAddSpell] = useState(false);

  const [newItem, setNewItem] = useState<InventoryItem>({ nome: '', quantidade: 1, peso: 1, preco: '', dano: '', descricao: '', equipado: false });
  const [showAddItem, setShowAddItem] = useState(false);

  const [newAction, setNewAction] = useState<QuickAction>({ nome: '', ataqueBonus: 0, dano: '1d6', tipo: 'Corpo a Corpo' });
  const [showAddAction, setShowAddAction] = useState(false);

  const [newSessionNote, setNewSessionNote] = useState({ resumo: '' });
  const [showAddNote, setShowAddNote] = useState(false);

  useEffect(() => {
    try {
      const parsed = yaml.load(rawYaml) as any;
      if (typeof parsed === 'object' && parsed !== null) {
        setData(parsed);
      } else {
        setData({});
      }
    } catch (e) {
      console.error("YAML Parse Error in CharacterSheet", e);
    }
  }, [rawYaml]);

  if (!data) return null;

  const updateField = (path: string[], value: any) => {
    try {
      const newData = JSON.parse(JSON.stringify(data));
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        if (current[path[i]] === undefined) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;

      const newYaml = yaml.dump(newData, { indent: 2, lineWidth: -1 });
      onChange(newYaml);
    } catch (e) {
      console.error("Error updating field", e);
    }
  };

  const getField = (path: string[], fallback: any = '') => {
    let current = data;
    for (const key of path) {
      if (current === undefined || current === null) return fallback;
      current = current[key];
    }
    return current !== undefined ? current : fallback;
  };

  const updateAttr = (id: string, val: number) => {
    if (data.ficha_personagem?.atributos && data.ficha_personagem.atributos[id] !== undefined) {
      updateField(['ficha_personagem', 'atributos', id], val);
    } else {
      updateField([id], val);
    }
  };

  const updateDefesa = (id: string, val: number) => {
    if (data.defesas && data.defesas[id] !== undefined) {
      updateField(['defesas', id], val);
    } else {
      updateField([id], val);
    }
  };

  const updatePericia = (id: string, val: number) => {
    if (data.pericias && data.pericias[id] !== undefined) {
      updateField(['pericias', id], val);
    } else {
      updateField([id], val);
    }
  };

  const updateHP = (val: number) => {
    if (data.pontos_vida?.atuais !== undefined) updateField(['pontos_vida', 'atuais'], val);
    else if (data.pv !== undefined) updateField(['pv'], val);
    else updateField(['HP'], val);
  };
  
  const updateMaxHP = (val: number) => {
    if (data.pontos_vida?.maximo !== undefined) updateField(['pontos_vida', 'maximo'], val);
    else if (data.pv_max !== undefined) updateField(['pv_max'], val);
    else updateField(['HP_max'], val);
  };

  const updateMana = (val: number) => {
    if (data.PM !== undefined) updateField(['PM'], val);
    else updateField(['mana'], val);
  };

  const updateMaxMana = (val: number) => {
    if (data.PM_max !== undefined) updateField(['PM_max'], val);
    else updateField(['mana_max'], val);
  };

  const updateAC = (val: number) => {
    if (data.defesas?.ca !== undefined) updateField(['defesas', 'ca'], val);
    else if (data.ca !== undefined) updateField(['ca'], val);
    else if (data.CA !== undefined) updateField(['CA'], val);
    else updateField(['armadura'], val);
  };

  const getHP = () => getField(['pontos_vida', 'atuais'], getField(['pv'], getField(['HP'], 0)));
  const getMaxHP = () => getField(['pontos_vida', 'maximo'], getField(['pv_max'], getField(['HP_max'], 0)));
  
  const getMana = () => getField(['mana'], getField(['PM'], 0));
  const getMaxMana = () => getField(['mana_max'], getField(['PM_max'], 0));

  const getAC = () => getField(['defesas', 'ca'], getField(['ca'], getField(['CA'], getField(['armadura'], 10))));

  const nome = getField(['nome'], getField(['nome_personagem'], getField(['titulo'], 'Desconhecido')));
  const nivel = getField(['ficha_personagem', 'cabecalho', 'nivel'], getField(['nivel'], 1));
  const raca = getField(['raca'], getField(['raça'], ''));
  const classe = getField(['classe'], '');

  let imgUrlRaw = getField(['imagem'], getField(['avatar'], getField(['imageUrl'], '')));
  let avatarUrl = 'https://via.placeholder.com/150/333333/FFFFFF?text=👤';
  if (imgUrlRaw) {
    const cleanUrl = String(imgUrlRaw).replace(/[\[\]!]/g, "").split("|")[0].trim();
    avatarUrl = resolveMediaUrl(cleanUrl);
  }

  const getAttr = (name: string) => {
    return getField(['ficha_personagem', 'atributos', name], getField([name], 10));
  };
  
  const attrFor = getAttr('for');
  const attrDes = getAttr('des');
  const attrCon = getAttr('con');
  const attrInt = getAttr('int');
  const attrSab = getAttr('sab');
  const attrCar = getAttr('car');

  const getOuro = () => getField(['Ouro'], getField(['ouro'], getField(['Ouro_recompensa'], 0)));
  const updateOuro = (val: number) => {
    if (data.tipo === 'Monstro' || data.Tipo === 'Monstro') updateField(['Ouro_recompensa'], val);
    else updateField(['Ouro'], val);
  };

  const calcMod = (score: number) => Math.floor((Number(score) - 10) / 2);
  const formatMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

  const sendRollToChat = (label: string, modifier: number) => {
    const cmd = `/roll 1d20${modifier >= 0 ? '+' : ''}${modifier} [${label}]`;
    window.dispatchEvent(new CustomEvent('send-chat-message', { detail: { message: cmd } }));
  };

  const sendCustomRollToChat = (formula: string, label: string) => {
    const cmd = `/roll ${formula} [${label}]`;
    window.dispatchEvent(new CustomEvent('send-chat-message', { detail: { message: cmd } }));
  };

  // Magias
  const rawSpells = getField(['magias'], getField(['habilidades_magicas'], []));
  const spells: SpellItem[] = Array.isArray(rawSpells) ? rawSpells : [];

  const handleAddSpell = () => {
    if (!newSpell.nome.trim()) return;
    const updated = [...spells, { ...newSpell }];
    updateField(['magias'], updated);
    setNewSpell({ nome: '', circulo: 1, custo_pm: 1, dano: '', alcance: 'Curto', descricao: '' });
    setShowAddSpell(false);
  };

  const handleRemoveSpell = (idx: number) => {
    const updated = spells.filter((_, i) => i !== idx);
    updateField(['magias'], updated);
  };

  const handleCastSpell = (spell: SpellItem) => {
    const cost = Number(spell.custo_pm || 0);
    const currentMana = Number(getMana());
    if (cost > 0 && currentMana >= cost) {
      updateMana(currentMana - cost);
    }
    if (spell.dano && spell.dano.trim()) {
      sendCustomRollToChat(spell.dano, `Conjurar ${spell.nome}`);
    } else {
      const msg = `✨ ${nome} conjurou **${spell.nome}**! ${spell.descricao || ''}`;
      window.dispatchEvent(new CustomEvent('send-chat-message', { detail: { message: msg } }));
    }
  };

  // Inventário
  const rawInventory = getField(['inventario'], getField(['equipamentos'], []));
  const inventory: InventoryItem[] = Array.isArray(rawInventory) ? rawInventory : [];

  const handleAddItem = () => {
    if (!newItem.nome.trim()) return;
    const updated = [...inventory, { ...newItem }];
    updateField(['inventario'], updated);
    setNewItem({ nome: '', quantidade: 1, peso: 1, preco: '', dano: '', descricao: '', equipado: false });
    setShowAddItem(false);
  };

  const handleUpdateItemQty = (idx: number, delta: number) => {
    const updated = [...inventory];
    const curr = Number(updated[idx].quantidade || 1);
    const next = Math.max(0, curr + delta);
    if (next === 0) {
      handleRemoveItem(idx);
    } else {
      updated[idx].quantidade = next;
      updateField(['inventario'], updated);
    }
  };

  const handleRemoveItem = (idx: number) => {
    const updated = inventory.filter((_, i) => i !== idx);
    updateField(['inventario'], updated);
  };

  // Ações Rápidas de Combate
  const rawActions = getField(['acoes_combate'], getField(['ataques'], []));
  const actions: QuickAction[] = Array.isArray(rawActions) ? rawActions : [];

  const handleAddAction = () => {
    if (!newAction.nome.trim()) return;
    const updated = [...actions, { ...newAction }];
    updateField(['acoes_combate'], updated);
    setNewAction({ nome: '', ataqueBonus: 0, dano: '1d6', tipo: 'Corpo a Corpo' });
    setShowAddAction(false);
  };

  const handleRemoveAction = (idx: number) => {
    const updated = actions.filter((_, i) => i !== idx);
    updateField(['acoes_combate'], updated);
  };

  // Diário de Sessão
  const rawSessionNotes = getField(['diario_sessao'], getField(['historico_sessao'], []));
  const sessionNotes: SessionNote[] = Array.isArray(rawSessionNotes) ? rawSessionNotes : [];

  const handleAddSessionNote = () => {
    if (!newSessionNote.resumo.trim()) return;
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const updated = [{ data: dateStr, resumo: newSessionNote.resumo }, ...sessionNotes];
    updateField(['diario_sessao'], updated);
    setNewSessionNote({ resumo: '' });
    setShowAddNote(false);
  };

  const handleRemoveSessionNote = (idx: number) => {
    const updated = sessionNotes.filter((_, i) => i !== idx);
    updateField(['diario_sessao'], updated);
  };

  return (
    <div className="character-sheet-dashboard">
      
      {/* HEADER SECTION */}
      <div className="actor-header-main">
        <img src={avatarUrl} alt={nome} className="actor-header-portrait" />
        
        <div className="actor-header-content">
          <input 
            className="actor-name-input"
            type="text" 
            value={nome} 
            onChange={(e) => updateField(['nome'], e.target.value)}
          />
          
          <div className="actor-info-row">
            <div className="actor-info-item">
              Nível
              <input type="number" value={nivel} onChange={(e) => updateField(['nivel'], Number(e.target.value))} />
            </div>
            <div className="actor-info-item">
              Classe
              <input type="text" value={classe} onChange={(e) => updateField(['classe'], e.target.value)} style={{ width: '80px' }} />
            </div>
            <div className="actor-info-item">
              Raça
              <input type="text" value={raca} onChange={(e) => updateField(['raca'], e.target.value)} style={{ width: '80px' }} />
            </div>
            <div className="actor-info-item" style={{ color: '#fbbf24' }}>
              💰 Ouro
              <input type="number" value={getOuro()} onChange={(e) => updateOuro(Number(e.target.value))} style={{ width: '70px', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)', fontWeight: 'bold' }} />
            </div>
            <div className="actor-info-item" style={{ color: '#c084fc' }}>
              💎 Gemas Astrais
              <input type="number" value={getField(['gemas_astrais'], 0)} onChange={(e) => updateField(['gemas_astrais'], Number(e.target.value))} style={{ width: '70px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)', fontWeight: 'bold' }} />
            </div>
          </div>
          
          <div className="actor-header-stats">
            <div className="actor-vital-box hp">
              <div className="vital-icon"><Heart size={20} /></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vital-label">Pontos de Vida</span>
                <div className="vital-inputs">
                  <input type="number" value={getHP()} onChange={(e) => updateHP(Number(e.target.value))} />
                  /
                  <input type="number" value={getMaxHP()} onChange={(e) => updateMaxHP(Number(e.target.value))} />
                </div>
              </div>
            </div>
            
            <div className="actor-vital-box mana">
              <div className="vital-icon"><Zap size={20} /></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vital-label">Mana / PM</span>
                <div className="vital-inputs">
                  <input type="number" value={getMana()} onChange={(e) => updateMana(Number(e.target.value))} />
                  /
                  <input type="number" value={getMaxMana()} onChange={(e) => updateMaxMana(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="actor-vital-box">
              <div className="vital-icon" style={{ background: 'rgba(255,255,255,0.1)' }}><Shield size={20} /></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="vital-label">Classe de Armadura</span>
                <div className="vital-inputs">
                  <input type="number" value={getAC()} onChange={(e) => updateAC(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS SECTION */}
      <div className="actor-tabs">
        <Tooltip label="Visão Geral e Combate">
          <div className={`actor-tab ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>
            <Sword size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Visão Geral
          </div>
        </Tooltip>
        <Tooltip label="Magias e Habilidades">
          <div className={`actor-tab ${activeTab === 'magias' ? 'active' : ''}`} onClick={() => setActiveTab('magias')}>
            <Sparkles size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Magias ({spells.length})
          </div>
        </Tooltip>
        <Tooltip label="Equipamentos e Itens">
          <div className={`actor-tab ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => setActiveTab('inventario')}>
            <Package size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Inventário ({inventory.length})
          </div>
        </Tooltip>
        <Tooltip label="História e Diário de Sessão">
          <div className={`actor-tab ${activeTab === 'biografia' ? 'active' : ''}`} onClick={() => setActiveTab('biografia')}>
            <Book size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Biografia & Diário
          </div>
        </Tooltip>
      </div>

      {/* BODY SECTION */}
      <div className="actor-content-body">
        
        {/* ABA: GERAL */}
        {activeTab === 'geral' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* ATTRIBUTES */}
              <div className="actor-ability-grid">
                {[
                  { id: 'for', label: 'Força', val: attrFor },
                  { id: 'des', label: 'Destreza', val: attrDes },
                  { id: 'con', label: 'Constituição', val: attrCon },
                  { id: 'int', label: 'Inteligência', val: attrInt },
                  { id: 'sab', label: 'Sabedoria', val: attrSab },
                  { id: 'car', label: 'Carisma', val: attrCar }
                ].map(attr => (
                  <div key={attr.id} className="actor-ability-card">
                    <span className="actor-ability-label">{attr.label}</span>
                    <div className="actor-ability-score">
                      <input 
                        type="number" 
                        value={attr.val} 
                        onChange={(e) => updateAttr(attr.id, Number(e.target.value))} 
                      />
                    </div>
                    <Tooltip label={`Rolar ${attr.label}`}>
                      <div 
                        className="actor-ability-mod" 
                        onClick={() => sendRollToChat(attr.label, calcMod(attr.val))}
                      >
                        {formatMod(calcMod(attr.val))}
                      </div>
                    </Tooltip>
                  </div>
                ))}
              </div>

              {/* AÇÕES RÁPIDAS DE ATAQUE */}
              <div className="actor-section">
                <div className="actor-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Ações & Ataques Rápidos</span>
                  <button 
                    onClick={() => setShowAddAction(!showAddAction)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <Plus size={14} /> Novo Ataque
                  </button>
                </div>

                {showAddAction && (
                  <div className="actor-add-box" style={{ marginBottom: '0.8rem' }}>
                    <input 
                      placeholder="Nome do Ataque (ex: Espada Longa)" 
                      value={newAction.nome}
                      onChange={(e) => setNewAction({ ...newAction, nome: e.target.value })}
                      style={{ flex: 1, minWidth: '150px' }}
                    />
                    <input 
                      type="number"
                      placeholder="Bônus (+5)" 
                      value={newAction.ataqueBonus}
                      onChange={(e) => setNewAction({ ...newAction, ataqueBonus: Number(e.target.value) })}
                      style={{ width: '80px' }}
                    />
                    <input 
                      placeholder="Dano (ex: 1d8+3)" 
                      value={newAction.dano}
                      onChange={(e) => setNewAction({ ...newAction, dano: e.target.value })}
                      style={{ width: '100px' }}
                    />
                    <button className="btn-roll-sm" onClick={handleAddAction}>Adicionar</button>
                  </div>
                )}

                <div className="actor-actions-grid">
                  {actions.length === 0 && !showAddAction && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', gridColumn: '1 / -1' }}>
                      Nenhum ataque rápido configurado. Clique em "+ Novo Ataque" para adicionar espadas, arcos ou ataques desarmados.
                    </div>
                  )}

                  {actions.map((act, idx) => (
                    <div key={idx} className="actor-action-card">
                      <div className="actor-action-header">
                        <span className="actor-action-title">{act.nome}</span>
                        <button onClick={() => handleRemoveAction(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Ataque: {act.ataqueBonus !== undefined ? (act.ataqueBonus >= 0 ? `+${act.ataqueBonus}` : `${act.ataqueBonus}`) : '+0'} | Dano: {act.dano || '1d6'}
                      </div>
                      <div className="actor-action-buttons">
                        <button 
                          className="btn-roll-sm"
                          onClick={() => sendRollToChat(`Ataque: ${act.nome}`, Number(act.ataqueBonus || 0))}
                        >
                          <Dice5 size={12} /> Ataque
                        </button>
                        {act.dano && (
                          <button 
                            className="btn-roll-sm"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                            onClick={() => sendCustomRollToChat(act.dano || '1d6', `Dano: ${act.nome}`)}
                          >
                            <Sword size={12} /> Dano
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SAVING THROWS */}
              <div className="actor-section">
                <div className="actor-section-header">Salvaguardas</div>
                <div className="actor-skills-list">
                  {[
                    { id: 'fortitude', label: 'Fortitude', attr: 'CON' },
                    { id: 'reflexos', label: 'Reflexos', attr: 'DES' },
                    { id: 'vontade', label: 'Vontade', attr: 'SAB' }
                  ].map(save => {
                    const saveVal = getField(['defesas', save.id], getField([save.id], 0));
                    return (
                      <Tooltip key={save.id} label={`Rolar ${save.label}`}>
                        <div className="actor-rollable-row" onClick={() => sendRollToChat(save.label, Number(saveVal))}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                            <span className="actor-roll-name">{save.label}</span>
                            <span className="actor-roll-attr">({save.attr})</span>
                          </div>
                          <input 
                            type="number" 
                            value={saveVal} 
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateDefesa(save.id, Number(e.target.value))} 
                          />
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* SKILLS */}
              <div className="actor-section">
                <div className="actor-section-header">Perícias Comuns</div>
                <div className="actor-skills-list">
                  {[
                    'Acrobacia', 'Arcanismo', 'Atletismo', 'Enganação', 'Furtividade', 
                    'Intimidação', 'Medicina', 'Natureza', 'Percepção', 'Religião', 'Sobrevivência'
                  ].map(skillName => {
                    const skillId = skillName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const skillVal = getField(['pericias', skillId], getField([skillId], 0));
                    
                    return (
                      <Tooltip key={skillId} label={`Rolar ${skillName}`}>
                        <div className="actor-rollable-row" onClick={() => sendRollToChat(skillName, Number(skillVal))}>
                          <span className="actor-roll-name">{skillName}</span>
                          <input 
                            type="number" 
                            value={skillVal}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updatePericia(skillId, Number(e.target.value))} 
                          />
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ABA: MAGIAS */}
        {activeTab === 'magias' && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Grimório de Magias & Poderes</span>
              <button 
                onClick={() => setShowAddSpell(!showAddSpell)}
                className="btn-cast-sm"
              >
                <Plus size={14} /> Nova Magia / Poder
              </button>
            </div>

            {showAddSpell && (
              <div className="actor-add-box">
                <input 
                  placeholder="Nome da Magia" 
                  value={newSpell.nome}
                  onChange={(e) => setNewSpell({ ...newSpell, nome: e.target.value })}
                  style={{ flex: 2, minWidth: '150px' }}
                />
                <input 
                  type="number"
                  placeholder="Custo PM" 
                  value={newSpell.custo_pm}
                  onChange={(e) => setNewSpell({ ...newSpell, custo_pm: Number(e.target.value) })}
                  style={{ width: '80px' }}
                />
                <input 
                  placeholder="Dano/Cura (ex: 3d6+2)" 
                  value={newSpell.dano}
                  onChange={(e) => setNewSpell({ ...newSpell, dano: e.target.value })}
                  style={{ width: '120px' }}
                />
                <input 
                  placeholder="Alcance (ex: 9m)" 
                  value={newSpell.alcance}
                  onChange={(e) => setNewSpell({ ...newSpell, alcance: e.target.value })}
                  style={{ width: '100px' }}
                />
                <input 
                  placeholder="Descrição breve do efeito" 
                  value={newSpell.descricao}
                  onChange={(e) => setNewSpell({ ...newSpell, descricao: e.target.value })}
                  style={{ flex: 3, minWidth: '200px' }}
                />
                <button className="btn-cast-sm" onClick={handleAddSpell}>Salvar Magia</button>
              </div>
            )}

            <div className="actor-list-container">
              {spells.length === 0 && !showAddSpell && (
                <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontStyle: 'italic' }}>
                  Nenhuma magia registrada. Clique em "+ Nova Magia / Poder" para adicionar.
                </div>
              )}

              {spells.map((spell, idx) => (
                <div key={idx} className="actor-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{spell.nome}</span>
                      {spell.custo_pm !== undefined && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', fontWeight: 600 }}>
                          {spell.custo_pm} PM
                        </span>
                      )}
                      {spell.alcance && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>• {spell.alcance}</span>
                      )}
                    </div>
                    {spell.descricao && (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{spell.descricao}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button className="btn-cast-sm" onClick={() => handleCastSpell(spell)}>
                      <Sparkles size={12} /> Conjurar
                    </button>
                    <button onClick={() => handleRemoveSpell(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: INVENTÁRIO */}
        {activeTab === 'inventario' && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Mochila & Equipamentos</span>
              <button 
                onClick={() => setShowAddItem(!showAddItem)}
                className="btn-roll-sm"
              >
                <Plus size={14} /> Adicionar Item
              </button>
            </div>

            {showAddItem && (
              <div className="actor-add-box">
                <input 
                  placeholder="Nome do Item / Arma / Poção" 
                  value={newItem.nome}
                  onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                  style={{ flex: 2, minWidth: '150px' }}
                />
                <input 
                  type="number"
                  placeholder="Qtd" 
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                  style={{ width: '60px' }}
                />
                <input 
                  type="number"
                  placeholder="Peso" 
                  value={newItem.peso}
                  onChange={(e) => setNewItem({ ...newItem, peso: Number(e.target.value) })}
                  style={{ width: '60px' }}
                />
                <input 
                  placeholder="Dano/Efeito (ex: 1d8 cortante)" 
                  value={newItem.dano}
                  onChange={(e) => setNewItem({ ...newItem, dano: e.target.value })}
                  style={{ width: '120px' }}
                />
                <input 
                  placeholder="Descrição breve" 
                  value={newItem.descricao}
                  onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
                  style={{ flex: 3, minWidth: '180px' }}
                />
                <button className="btn-roll-sm" onClick={handleAddItem}>Salvar Item</button>
              </div>
            )}

            <div className="actor-list-container">
              {inventory.length === 0 && !showAddItem && (
                <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', fontStyle: 'italic' }}>
                  Mochila vazia. Clique em "+ Adicionar Item" para guardar armas, poções ou tesouros.
                </div>
              )}

              {inventory.map((item, idx) => (
                <div key={idx} className="actor-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.nome}</span>
                      {item.peso !== undefined && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>• {item.peso} kg</span>
                      )}
                      {item.dano && (
                        <span style={{ fontSize: '0.7rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                          {item.dano}
                        </span>
                      )}
                    </div>
                    {item.descricao && (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.descricao}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.dano && (
                      <button 
                        className="btn-roll-sm"
                        onClick={() => sendCustomRollToChat(item.dano || '1d6', `Usar ${item.nome}`)}
                      >
                        <Dice5 size={12} /> Usar
                      </button>
                    )}

                    <div className="actor-item-quantity">
                      <button className="qty-btn" onClick={() => handleUpdateItemQty(idx, -1)}>-</button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {item.quantidade || 1}
                      </span>
                      <button className="qty-btn" onClick={() => handleUpdateItemQty(idx, 1)}>+</button>
                    </div>

                    <button onClick={() => handleRemoveItem(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: BIOGRAFIA & DIÁRIO DE SESSÃO */}
        {activeTab === 'biografia' && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* CAMPOS DE BACKGROUND */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Antecedente / Origem</span>
                <input 
                  type="text" 
                  value={getField(['antecedente'], getField(['background'], ''))} 
                  onChange={(e) => updateField(['antecedente'], e.target.value)}
                  placeholder="Ex: Soldado, Nobre, Órfão..."
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alinhamento / Tendência</span>
                <input 
                  type="text" 
                  value={getField(['alinhamento'], getField(['tendencia'], ''))} 
                  onChange={(e) => updateField(['alinhamento'], e.target.value)}
                  placeholder="Ex: Leal e Bom, Neutro..."
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Divindade / Patrono</span>
                <input 
                  type="text" 
                  value={getField(['divindade'], getField(['patrono'], ''))} 
                  onChange={(e) => updateField(['divindade'], e.target.value)}
                  placeholder="Ex: Valkaria, Khalmyr..."
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* TRAÇOS & PERSONALIDADE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Traços de Personalidade</span>
                <textarea 
                  rows={3}
                  value={getField(['tracos_personalidade'], '')} 
                  onChange={(e) => updateField(['tracos_personalidade'], e.target.value)}
                  placeholder="Como o personagem se comporta e fala..."
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ideais & Vínculos</span>
                <textarea 
                  rows={3}
                  value={getField(['ideais_vinculos'], '')} 
                  onChange={(e) => updateField(['ideais_vinculos'], e.target.value)}
                  placeholder="O que o move no mundo..."
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* DIÁRIO / HISTÓRICO DE SESSÃO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <History size={16} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Diário & Registros de Sessão ({sessionNotes.length})</span>
                </div>
                <button 
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="btn-roll-sm"
                >
                  <Plus size={14} /> Novo Registro
                </button>
              </div>

              {showAddNote && (
                <div className="actor-add-box">
                  <textarea 
                    rows={3}
                    placeholder="O que aconteceu nesta sessão? Descobertas, ferimentos, promessas..." 
                    value={newSessionNote.resumo}
                    onChange={(e) => setNewSessionNote({ resumo: e.target.value })}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '0.5rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                  <button className="btn-roll-sm" onClick={handleAddSessionNote}>Salvar no Diário</button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {sessionNotes.length === 0 && !showAddNote && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                    Nenhum registro de sessão ainda. Adicione notas da aventura para acompanhar a evolução do personagem.
                  </div>
                )}

                {sessionNotes.map((note, idx) => (
                  <div key={idx} className="session-log-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="session-log-date">📅 {note.data}</span>
                      <button onClick={() => handleRemoveSessionNote(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="session-log-text">{note.resumo}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
