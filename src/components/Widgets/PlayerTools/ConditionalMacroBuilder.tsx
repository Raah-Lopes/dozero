// src/components/Widgets/PlayerTools/ConditionalMacroBuilder.tsx
import React, { useState } from 'react';
import { 
  Dices, Plus, Trash2, Zap, Play, Save, X, Sparkles, Shield, Flame, Heart, Swords
} from 'lucide-react';
import { 
  ConditionalMacro, 
  MacroCondition, 
  DieType, 
  PRESET_CONDITIONAL_MACROS, 
  saveCustomMacro, 
  executeConditionalMacro,
  MacroExecutionResult
} from '../../../services/conditionalMacroService';
import { toast } from '../../UI/Toast';

interface Props {
  initialMacro?: ConditionalMacro | null;
  onSave: (macro: ConditionalMacro) => void;
  onClose: () => void;
}

export const ConditionalMacroBuilder: React.FC<Props> = ({ initialMacro, onSave, onClose }) => {
  const [macroName, setMacroName] = useState(initialMacro?.name || '⚔️ Novo Golpe Condicional');
  const [macroDesc, setMacroDesc] = useState(initialMacro?.description || '');
  const [macroIcon, setMacroIcon] = useState(initialMacro?.icon || '⚔️');
  const [macroColor, setMacroColor] = useState(initialMacro?.color || '#ef4444');
  const [basePool, setBasePool] = useState<Partial<Record<DieType, number>>>(initialMacro?.basePool || { 20: 1 });
  const [baseModifier, setBaseModifier] = useState<number>(initialMacro?.baseModifier ?? 3);
  const [conditions, setConditions] = useState<MacroCondition[]>(initialMacro?.conditions || [
    {
      id: `cond_${Date.now()}`,
      label: 'Crítico em 19 ou 20 (+2d6 dano)',
      conditionType: 'die_gte',
      conditionValue: 19,
      conditionTarget: 'd20',
      effectType: 'extra_dice',
      effectValue: '2d6'
    }
  ]);

  // Simulador
  const [testResult, setTestResult] = useState<MacroExecutionResult | null>(null);

  const allDice: DieType[] = [4, 6, 8, 10, 12, 20, 100];

  const handleDieCountChange = (d: DieType, delta: number) => {
    const current = basePool[d] || 0;
    const next = Math.max(0, current + delta);
    const newPool = { ...basePool };
    if (next === 0) delete newPool[d];
    else newPool[d] = next;
    setBasePool(newPool);
  };

  const handleAddCondition = () => {
    const newCond: MacroCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: 'Regra Condicional',
      conditionType: 'die_gte',
      conditionValue: 19,
      conditionTarget: 'd20',
      effectType: 'extra_dice',
      effectValue: '1d6'
    };
    setConditions(prev => [...prev, newCond]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCondition = (id: string, updates: Partial<MacroCondition>) => {
    setConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleLoadPreset = (preset: ConditionalMacro) => {
    setMacroName(preset.name);
    setMacroDesc(preset.description || '');
    setMacroIcon(preset.icon || '⚡');
    setMacroColor(preset.color || '#38bdf8');
    setBasePool({ ...preset.basePool });
    setBaseModifier(preset.baseModifier);
    setConditions([...preset.conditions]);
    toast.success(`Preset carregado: ${preset.name}`);
  };

  const buildCurrentMacroObject = (): ConditionalMacro => {
    return {
      id: initialMacro?.id || `macro_${Date.now()}`,
      name: macroName.trim() || 'Macro Sem Nome',
      description: macroDesc,
      icon: macroIcon,
      color: macroColor,
      basePool,
      baseModifier,
      conditions
    };
  };

  const handleTestRoll = () => {
    const macroObj = buildCurrentMacroObject();
    const result = executeConditionalMacro(macroObj, {
      characterHpPct: 40, // Simula HP baixo para testar fúria
      characterPm: 5,
    }, false);
    setTestResult(result);
    toast.info(`Simulação executada: Total ${result.finalTotal}`);
  };

  const handleSaveAndClose = () => {
    const macroObj = buildCurrentMacroObject();
    saveCustomMacro(macroObj);
    onSave(macroObj);
    toast.success(`Macro salva com sucesso: ${macroObj.name}`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        backgroundColor: '#0f172a',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f1f5f9'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(90deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#38bdf8" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.04em' }}>
              FORJA DE MACROS CONDICIONAIS
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPO SCROLLÁVEL */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* PRESETS RÁPIDOS */}
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
              Carregar Preset de RPG:
            </span>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '4px', paddingBottom: '4px' }}>
              {PRESET_CONDITIONAL_MACROS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: `1px solid ${preset.color}55`,
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name.replace(/^[^\s]+\s/, '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DADOS BÁSICOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                Nome da Ação / Magia / Golpe:
              </label>
              <input
                type="text"
                value={macroName}
                onChange={(e) => setMacroName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                Cor Temática:
              </label>
              <input
                type="color"
                value={macroColor}
                onChange={(e) => setMacroColor(e.target.value)}
                style={{
                  width: '45px',
                  height: '34px',
                  padding: 0,
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent'
                }}
              />
            </div>
          </div>

          {/* POOL DE DADOS BASE & MODIFICADOR */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
              1. Fórmula de Dados Base
            </span>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
              {allDice.map((d) => {
                const count = basePool[d] || 0;
                return (
                  <div key={d} style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: count > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${count > 0 ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '6px',
                    padding: '2px 6px',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>d{d}</span>
                    <button
                      onClick={() => handleDieCountChange(d, -1)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: '14px', textAlign: 'center' }}>
                      {count}
                    </span>
                    <button
                      onClick={() => handleDieCountChange(d, 1)}
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      +
                    </button>
                  </div>
                );
              })}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Modificador:</span>
                <input
                  type="number"
                  value={baseModifier}
                  onChange={(e) => setBaseModifier(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '60px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* REGRAS CONDICIONAIS */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                2. Regras Condicionais ("Quando X ocorrer ➔ Então aplique Y")
              </span>
              <button
                onClick={handleAddCondition}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid #f59e0b',
                  color: '#fbbf24',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} /> Nova Regra
              </button>
            </div>

            {conditions.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                Nenhuma condição configurada. Esta macro rolará apenas os dados base.
              </p>
            ) : (
              conditions.map((cond, idx) => (
                <div key={cond.id} style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <input
                      type="text"
                      value={cond.label}
                      onChange={(e) => handleUpdateCondition(cond.id, { label: e.target.value })}
                      placeholder="Rótulo da regra (ex: Crítico 19-20)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.2)',
                        color: '#f8fafc',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        flex: 1,
                        marginRight: '8px'
                      }}
                    />
                    <button
                      onClick={() => handleRemoveCondition(cond.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* GATILHO (QUANDO) */}
                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                        QUANDO (Gatilho):
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                          value={cond.conditionType}
                          onChange={(e) => handleUpdateCondition(cond.id, { conditionType: e.target.value as any })}
                          style={{
                            background: '#0c0e12',
                            color: '#f8fafc',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            padding: '3px',
                            flex: 1
                          }}
                        >
                          <option value="die_gte">Dado D20 tirar &gt;=</option>
                          <option value="die_lte">Dado D20 tirar &lt;=</option>
                          <option value="die_eq">Dado D20 tirar ==</option>
                          <option value="total_gte">Total Geral &gt;= (CD/CA)</option>
                          <option value="hp_pct_lte">HP do Personagem &lt;= %</option>
                          <option value="mp_gte">Gastar PM &gt;=</option>
                          <option value="always">Sempre Ativo</option>
                        </select>
                        {cond.conditionType !== 'always' && (
                          <input
                            type="number"
                            value={cond.conditionValue}
                            onChange={(e) => handleUpdateCondition(cond.id, { conditionValue: parseInt(e.target.value, 10) || 0 })}
                            style={{
                              width: '45px',
                              background: '#0c0e12',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              textAlign: 'center'
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* EFEITO (ENTÃO) */}
                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                        ENTÃO (Efeito):
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <select
                          value={cond.effectType}
                          onChange={(e) => handleUpdateCondition(cond.id, { effectType: e.target.value as any })}
                          style={{
                            background: '#0c0e12',
                            color: '#f8fafc',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            padding: '3px',
                            flex: 1
                          }}
                        >
                          <option value="extra_dice">Rolar Dados Extras (ex: 2d6)</option>
                          <option value="bonus_mod">Somar Bônus Fixo (+X)</option>
                          <option value="play_sfx">Tocar Efeito Sonoro</option>
                          <option value="custom_msg">Mensagem no Chat</option>
                        </select>
                        <input
                          type="text"
                          value={cond.effectValue}
                          onChange={(e) => handleUpdateCondition(cond.id, { effectValue: e.target.value })}
                          placeholder={cond.effectType === 'extra_dice' ? '2d6' : cond.effectType === 'play_sfx' ? 'criticalHit' : '4'}
                          style={{
                            width: '70px',
                            background: '#0c0e12',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* SIMULADOR & TESTE */}
          {testResult && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399' }}>
                  RESULTADO DO TESTE:
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fcd34d' }}>
                  Total: {testResult.finalTotal}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Dados Base: [{testResult.baseRolls.map(r => `d${r.die}: ${r.result}`).join(', ')}] + Mod ({testResult.baseModifier})
              </span>
              {testResult.triggeredEffects.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>
                  <b>Regras Ativadas:</b> {testResult.triggeredEffects.map(e => e.conditionLabel).join(' | ')}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <button
            onClick={handleTestRoll}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={14} /> Testar Rolagem
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndClose}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Save size={14} /> Salvar Macro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
