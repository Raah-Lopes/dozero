import React, { useState, useEffect } from 'react';
import * as yaml from 'js-yaml';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';
import './CharacterSheet.css';
import { Heart, Zap, Shield, Crosshair } from 'lucide-react';

interface CharacterSheetProps {
  rawYaml: string;
  onChange: (newYaml: string) => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ rawYaml, onChange }) => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'magias' | 'inventario' | 'biografia'>('geral');

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
      // Clone data to avoid direct mutation issues
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

  // Safe getter
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

  // Helper getters for common Pathfinder/DOZERO fields
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

  // Attributes
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
        <div className={`actor-tab ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>
          Visão Geral
        </div>
        <div className={`actor-tab ${activeTab === 'magias' ? 'active' : ''}`} onClick={() => setActiveTab('magias')}>
          Magias
        </div>
        <div className={`actor-tab ${activeTab === 'inventario' ? 'active' : ''}`} onClick={() => setActiveTab('inventario')}>
          Inventário
        </div>
        <div className={`actor-tab ${activeTab === 'biografia' ? 'active' : ''}`} onClick={() => setActiveTab('biografia')}>
          Biografia
        </div>
      </div>

      {/* BODY SECTION */}
      <div className="actor-content-body">
        
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
                    <div 
                      className="actor-ability-mod" 
                      onClick={() => sendRollToChat(attr.label, calcMod(attr.val))}
                      title={`Rolar ${attr.label}`}
                    >
                      {formatMod(calcMod(attr.val))}
                    </div>
                  </div>
                ))}
              </div>

              {/* SAVING THROWS (Pathfinder) */}
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
                      <div key={save.id} className="actor-rollable-row" onClick={() => sendRollToChat(save.label, Number(saveVal))}>
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
                    // Normalize id to lowercase without accents
                    const skillId = skillName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const skillVal = getField(['pericias', skillId], getField([skillId], 0));
                    
                    return (
                      <div key={skillId} className="actor-rollable-row" onClick={() => sendRollToChat(skillName, Number(skillVal))}>
                        <span className="actor-roll-name">{skillName}</span>
                        <input 
                          type="number" 
                          value={skillVal}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updatePericia(skillId, Number(e.target.value))} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* OUTRAS ABAS (Placeholder para expansões futuras) */}
        {activeTab !== 'geral' && (
          <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>O conteúdo da aba <strong>{activeTab}</strong> pode ser expandido aqui, ou configurado via Markdown (abaixo) como já é o costume no DOZERO!</p>
          </div>
        )}

      </div>
    </div>
  );
};
