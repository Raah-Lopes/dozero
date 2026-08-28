// src/services/conditionalMacroService.ts
import { pushAdvancedChatMessage } from '../store/chat';
import { audioEngine } from './AudioEngine';

export type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type MacroConditionType = 
  | 'die_gte'        // Dado específico tirou >= X (ex: d20 >= 19 para crítico)
  | 'die_lte'        // Dado específico tirou <= X (ex: d20 == 1 para desastre)
  | 'die_eq'         // Dado específico tirou == X
  | 'total_gte'      // Total da rolagem superou >= X (ou CD/CA)
  | 'hp_pct_lte'     // HP do personagem <= X% (Fúria/Desespero)
  | 'mp_gte'         // Personagem possui PM suficiente >= X (Consumo)
  | 'always';        // Sempre ativo

export type MacroEffectType = 
  | 'extra_dice'     // Rola dados extras (ex: '2d6', '1d8')
  | 'bonus_mod'      // Adiciona bônus fixo (ex: +4)
  | 'play_sfx'       // Dispara som procedural (ex: 'criticalHit', 'divineHeal')
  | 'custom_msg';    // Mensagem especial formatada no chat

export interface MacroCondition {
  id: string;
  label: string;
  conditionType: MacroConditionType;
  conditionValue: number;
  conditionTarget?: 'd20' | 'd100' | 'primary_die' | 'total' | 'attacker_hp_pct' | 'attacker_pm';
  effectType: MacroEffectType;
  effectValue: string | number;
}

export interface ConditionalMacro {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  basePool: Partial<Record<DieType, number>>;
  baseModifier: number;
  targetDC?: number;
  conditions: MacroCondition[];
  isDefault?: boolean;
}

export interface MacroContext {
  characterName?: string;
  characterHpPct?: number; // 0 to 100
  characterPm?: number;
  targetAC?: number;
  advantage?: boolean;
}

export interface TriggeredEffect {
  conditionLabel: string;
  effectType: MacroEffectType;
  effectValue: string | number;
  extraRolls?: { die: DieType; result: number }[];
  extraSum?: number;
}

export interface MacroExecutionResult {
  macroId: string;
  macroName: string;
  baseRolls: { die: DieType; result: number }[];
  baseSum: number;
  baseModifier: number;
  triggeredEffects: TriggeredEffect[];
  totalBonus: number;
  totalDamageDice: { die: DieType; result: number }[];
  finalTotal: number;
  isCritical: boolean;
  isFailure: boolean;
  chatMessageHtml: string;
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function parseDiceString(diceStr: string): { count: number; sides: DieType } {
  const match = diceStr.trim().toLowerCase().match(/^(\d+)d(4|6|8|10|12|20|100)$/);
  if (!match) return { count: 1, sides: 6 };
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10) as DieType,
  };
}

export const PRESET_CONDITIONAL_MACROS: ConditionalMacro[] = [
  {
    id: 'brutal_strike',
    name: '⚔️ Ataque Brutal',
    description: 'Ataque com d20. Se tirar 19 ou 20, ativa acerto crítico com +2d6 de dano e efeito sonoro.',
    icon: '⚔️',
    color: '#ef4444',
    basePool: { 20: 1 },
    baseModifier: 3,
    isDefault: true,
    conditions: [
      {
        id: 'crit_rule',
        label: 'Crítico Agressivo (19-20)',
        conditionType: 'die_gte',
        conditionValue: 19,
        conditionTarget: 'd20',
        effectType: 'extra_dice',
        effectValue: '2d6'
      },
      {
        id: 'crit_sfx',
        label: 'Som de Golpe Crítico',
        conditionType: 'die_gte',
        conditionValue: 19,
        conditionTarget: 'd20',
        effectType: 'play_sfx',
        effectValue: 'criticalHit'
      },
      {
        id: 'fumble_rule',
        label: 'Desastre Natural (1)',
        conditionType: 'die_eq',
        conditionValue: 1,
        conditionTarget: 'd20',
        effectType: 'play_sfx',
        effectValue: 'tensionSting'
      }
    ]
  },
  {
    id: 'desperate_fury',
    name: '🩸 Golpe do Desespero',
    description: 'Ataque desesperado. Se o HP estiver abaixo de 50%, soma +1d6 no dano e +2 no acerto.',
    icon: '🩸',
    color: '#f97316',
    basePool: { 20: 1 },
    baseModifier: 2,
    isDefault: true,
    conditions: [
      {
        id: 'fury_bonus',
        label: 'Fúria do Limiar de Sangue (HP <= 50%)',
        conditionType: 'hp_pct_lte',
        conditionValue: 50,
        conditionTarget: 'attacker_hp_pct',
        effectType: 'bonus_mod',
        effectValue: 2
      },
      {
        id: 'fury_dice',
        label: 'Dano Extra de Desespero (+1d6)',
        conditionType: 'hp_pct_lte',
        conditionValue: 50,
        conditionTarget: 'attacker_hp_pct',
        effectType: 'extra_dice',
        effectValue: '1d6'
      }
    ]
  },
  {
    id: 'empowered_spell',
    name: '🔮 Feitiço Potencializado',
    description: 'Dispara magia arcana básica. Se tiver 3+ PM, gasta PM e potencializa com +2d8 de fogo.',
    icon: '🔮',
    color: '#a855f7',
    basePool: { 8: 2 },
    baseModifier: 4,
    isDefault: true,
    conditions: [
      {
        id: 'spell_surge',
        label: 'Sobrecarga Arcana (PM >= 3)',
        conditionType: 'mp_gte',
        conditionValue: 3,
        conditionTarget: 'attacker_pm',
        effectType: 'extra_dice',
        effectValue: '2d8'
      },
      {
        id: 'spell_sfx',
        label: 'Som de Bola de Fogo',
        conditionType: 'mp_gte',
        conditionValue: 3,
        conditionTarget: 'attacker_pm',
        effectType: 'play_sfx',
        effectValue: 'fireball'
      }
    ]
  },
  {
    id: 'sneak_shot',
    name: '🏹 Disparo Furtivo',
    description: 'Disparo preciso com d20. Se o ataque total for >= 15, aplica +3d6 de dano furtivo.',
    icon: '🏹',
    color: '#10b981',
    basePool: { 20: 1 },
    baseModifier: 4,
    isDefault: true,
    conditions: [
      {
        id: 'sneak_crit',
        label: 'Acerto Furtivo (Total >= 15)',
        conditionType: 'total_gte',
        conditionValue: 15,
        conditionTarget: 'total',
        effectType: 'extra_dice',
        effectValue: '3d6'
      }
    ]
  },
  {
    id: 'perfect_parry',
    name: '🛡️ Bloqueio & Contra-Ataque',
    description: 'Defesa com d20. Se o resultado do d20 for >= 18, bloqueia totalmente e contra-ataca.',
    icon: '🛡️',
    color: '#38bdf8',
    basePool: { 20: 1 },
    baseModifier: 5,
    isDefault: true,
    conditions: [
      {
        id: 'parry_sfx',
        label: 'Bloqueio Metálico Perfeito',
        conditionType: 'die_gte',
        conditionValue: 18,
        conditionTarget: 'd20',
        effectType: 'play_sfx',
        effectValue: 'shieldHit'
      },
      {
        id: 'counter_dmg',
        label: 'Contra-Ataque Imediato (+1d8)',
        conditionType: 'die_gte',
        conditionValue: 18,
        conditionTarget: 'd20',
        effectType: 'extra_dice',
        effectValue: '1d8'
      }
    ]
  }
];

const STORAGE_KEY = 'dozero_conditional_macros';

export function loadCustomMacros(): ConditionalMacro[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return PRESET_CONDITIONAL_MACROS;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return PRESET_CONDITIONAL_MACROS;
    return parsed;
  } catch {
    return PRESET_CONDITIONAL_MACROS;
  }
}

export function saveCustomMacro(macro: ConditionalMacro): ConditionalMacro[] {
  const current = loadCustomMacros();
  const index = current.findIndex(m => m.id === macro.id);
  let updated: ConditionalMacro[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = macro;
  } else {
    updated = [...current, macro];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Falha ao salvar macro condicional:', err);
  }
  return updated;
}

export function deleteCustomMacro(id: string): ConditionalMacro[] {
  const current = loadCustomMacros();
  const updated = current.filter(m => m.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Falha ao deletar macro:', err);
  }
  return updated;
}

export function evaluateCondition(
  cond: MacroCondition,
  baseRolls: { die: DieType; result: number }[],
  baseTotal: number,
  context?: MacroContext
): boolean {
  switch (cond.conditionType) {
    case 'always':
      return true;

    case 'die_gte': {
      // Procura se algum dado relevante tirou >= valor
      const matching = baseRolls.filter(r => {
        if (cond.conditionTarget === 'd20') return r.die === 20;
        if (cond.conditionTarget === 'd100') return r.die === 100;
        return true;
      });
      return matching.some(r => r.result >= cond.conditionValue);
    }

    case 'die_lte': {
      const matching = baseRolls.filter(r => {
        if (cond.conditionTarget === 'd20') return r.die === 20;
        if (cond.conditionTarget === 'd100') return r.die === 100;
        return true;
      });
      return matching.some(r => r.result <= cond.conditionValue);
    }

    case 'die_eq': {
      const matching = baseRolls.filter(r => {
        if (cond.conditionTarget === 'd20') return r.die === 20;
        if (cond.conditionTarget === 'd100') return r.die === 100;
        return true;
      });
      return matching.some(r => r.result === cond.conditionValue);
    }

    case 'total_gte':
      return baseTotal >= cond.conditionValue;

    case 'hp_pct_lte':
      if (context?.characterHpPct === undefined) return false;
      return context.characterHpPct <= cond.conditionValue;

    case 'mp_gte':
      if (context?.characterPm === undefined) return true; // Se não fornecido context, permite teste
      return context.characterPm >= cond.conditionValue;

    default:
      return false;
  }
}

export function executeConditionalMacro(
  macro: ConditionalMacro,
  context?: MacroContext,
  shouldSendToChat = true
): MacroExecutionResult {
  // 1. Rolar dados base
  const baseRolls: { die: DieType; result: number }[] = [];
  let baseSum = 0;

  Object.entries(macro.basePool).forEach(([dStr, qty]) => {
    const sides = parseInt(dStr, 10) as DieType;
    const count = qty || 0;
    for (let i = 0; i < count; i++) {
      const res = rollDie(sides);
      baseRolls.push({ die: sides, result: res });
      baseSum += res;
    }
  });

  const rawBaseTotal = baseSum + macro.baseModifier;

  // 2. Avaliar condições e coletar efeitos disparados
  const triggeredEffects: TriggeredEffect[] = [];
  let totalBonus = macro.baseModifier;
  const totalDamageDice: { die: DieType; result: number }[] = [];
  let isCritical = false;
  let isFailure = false;

  // Verificar se há d20 nativo 20 ou 1
  const d20Rolls = baseRolls.filter(r => r.die === 20);
  if (d20Rolls.some(r => r.result === 20)) isCritical = true;
  if (d20Rolls.some(r => r.result === 1)) isFailure = true;

  macro.conditions.forEach(cond => {
    const isMet = evaluateCondition(cond, baseRolls, rawBaseTotal, context);
    if (!isMet) return;

    if (cond.conditionType === 'die_gte' && cond.conditionValue >= 19 && !isFailure) {
      isCritical = true;
    }

    const effect: TriggeredEffect = {
      conditionLabel: cond.label,
      effectType: cond.effectType,
      effectValue: cond.effectValue,
    };

    if (cond.effectType === 'bonus_mod') {
      const bonusNum = typeof cond.effectValue === 'number' ? cond.effectValue : parseInt(cond.effectValue, 10) || 0;
      totalBonus += bonusNum;
    } else if (cond.effectType === 'extra_dice') {
      const { count, sides } = parseDiceString(String(cond.effectValue));
      const extraRolls: { die: DieType; result: number }[] = [];
      let extraSum = 0;
      for (let i = 0; i < count; i++) {
        const res = rollDie(sides);
        extraRolls.push({ die: sides, result: res });
        totalDamageDice.push({ die: sides, result: res });
        extraSum += res;
      }
      effect.extraRolls = extraRolls;
      effect.extraSum = extraSum;
    } else if (cond.effectType === 'play_sfx') {
      // Dispara o som no Soundboard se disponível
      const sfxName = String(cond.effectValue);
      audioEngine.playSFX({
        id: sfxName,
        name: sfxName,
        url: `synth:${sfxName}`
      }).catch(() => {});
    }

    triggeredEffects.push(effect);
  });

  const extraDiceSum = totalDamageDice.reduce((acc, r) => acc + r.result, 0);
  const finalTotal = baseSum + totalBonus + extraDiceSum;

  // 3. Montar card HTML estilizado para o chat
  const baseRollsStr = baseRolls.map(r => `d${r.die}: <b>${r.result}</b>`).join(', ');
  const rulesTriggeredHtml = triggeredEffects.length > 0
    ? `<div style="margin-top: 6px; padding: 6px 8px; background: rgba(0,0,0,0.3); border-left: 3px solid ${macro.color || '#38bdf8'}; border-radius: 4px; font-size: 0.78rem;">` +
      `<b>Regras Disparadas:</b><br/>` +
      triggeredEffects.map(eff => {
        let detail = '';
        if (eff.effectType === 'extra_dice' && eff.extraRolls) {
          detail = ` ➔ [${eff.extraRolls.map(r => r.result).join(' + ')}] = <b>+${eff.extraSum}</b>`;
        } else if (eff.effectType === 'bonus_mod') {
          detail = ` ➔ <b>+${eff.effectValue}</b>`;
        }
        return `• <i>${eff.conditionLabel}</i>${detail}`;
      }).join('<br/>') +
      `</div>`
    : '';

  const chatMessageHtml = `
    <div style="border: 1px solid ${isCritical ? '#10b981' : isFailure ? '#ef4444' : 'rgba(255,255,255,0.15)'}; background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9)); border-radius: 8px; padding: 10px; color: #f8fafc; font-family: inherit;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 6px;">
        <span style="font-weight: 800; color: ${macro.color || '#38bdf8'}; font-size: 0.9rem;">
          ${macro.icon || '⚡'} ${macro.name}
        </span>
        ${isCritical ? '<span style="background: #10b981; color: #000; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;">CRÍTICO</span>' : ''}
        ${isFailure ? '<span style="background: #ef4444; color: #fff; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;">DESASTRE</span>' : ''}
      </div>
      <div style="font-size: 0.8rem; color: #cbd5e1;">
        <b>Dados Base:</b> [${baseRollsStr}] + Mod (${macro.baseModifier}) = <b>${rawBaseTotal}</b>
      </div>
      ${rulesTriggeredHtml}
      <div style="margin-top: 8px; display: flex; align-items: baseline; justify-content: flex-end; gap: 6px;">
        <span style="font-size: 0.75rem; color: #94a3b8;">TOTAL:</span>
        <span style="font-size: 1.4rem; font-weight: 900; color: ${isCritical ? '#34d399' : isFailure ? '#f87171' : '#fbbf24'}; text-shadow: 0 0 10px rgba(0,0,0,0.5);">
          ${finalTotal}
        </span>
      </div>
    </div>
  `;

  if (shouldSendToChat) {
    pushAdvancedChatMessage(chatMessageHtml, {
      tipo: 'in-game',
      autor: context?.characterName || 'Macro Inteligente',
      autor_alias: macro.name,
      isCritical,
      isFailure
    });
  }

  return {
    macroId: macro.id,
    macroName: macro.name,
    baseRolls,
    baseSum,
    baseModifier: macro.baseModifier,
    triggeredEffects,
    totalBonus,
    totalDamageDice,
    finalTotal,
    isCritical,
    isFailure,
    chatMessageHtml
  };
}
