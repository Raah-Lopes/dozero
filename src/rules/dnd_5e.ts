import type { RulesEngineDefinition } from './index';

// ── Utils ──
const getMod = (val: number) => Math.floor((val - 10) / 2);
const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

const getD20Degree = (roll: number, total: number, target: number) => {
  const natural20 = roll === 20;
  const natural1 = roll === 1;
  
  let baseGrau: 'sucesso_critico' | 'sucesso' | 'falha' | 'falha_critica' = 'falha';
  
  if (total >= target) {
    baseGrau = (total >= target + 10) ? 'sucesso_critico' : 'sucesso'; // Optional Pathfinder style criticals
  } else {
    baseGrau = (total <= target - 10) ? 'falha_critica' : 'falha';
  }
  
  let finalGrau = baseGrau;
  if (natural20) {
    if (baseGrau === 'falha_critica') finalGrau = 'falha';
    else if (baseGrau === 'falha') finalGrau = 'sucesso';
    else if (baseGrau === 'sucesso') finalGrau = 'sucesso_critico';
  } else if (natural1) {
    if (baseGrau === 'sucesso_critico') finalGrau = 'sucesso';
    else if (baseGrau === 'sucesso') finalGrau = 'falha';
    else if (baseGrau === 'falha') finalGrau = 'falha_critica';
  }
  
  const labels = {
    sucesso_critico: '💥 SUCESSO CRÍTICO',
    sucesso: '✅ SUCESSO',
    falha: '❌ FALHA',
    falha_critica: '💀 FALHA CRÍTICA',
  };
  
  return { grau: finalGrau, label: labels[finalGrau] };
};

export const dnd5eEngine: RulesEngineDefinition = {
  id: 'dnd_5e',
  name: 'Dungeons & Dragons 5E / D20 System',
  description: 'Rolagens de 1d20 + Modificador contra uma Classe de Armadura ou CD.',
  author: 'DOZERO Core',
  icon: '⚔️',
  defaultDie: 20,

  rollAttribute: (attrName, attrValue, charName, cd) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = getMod(attrValue);
    const total = roll + mod;
    const res = getD20Degree(roll, total, cd);
    
    return {
      logMsg: `🎲 **${charName}** rola **${attrName.toUpperCase()}**: 1d20(${roll})${formatMod(mod)} = **${total}** vs CD ${cd}. [**${res.label}**]`,
      pushGlobal: true,
      isSuccess: res.grau === 'sucesso' || res.grau === 'sucesso_critico',
      isCritical: res.grau === 'sucesso_critico',
    };
  },

  rollSkill: (skillName, skillValue, charName, cd) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = getMod(skillValue);
    const total = roll + mod;
    const res = getD20Degree(roll, total, cd);
    
    return {
      logMsg: `🤸‍♂️ **${charName}** rola perícia **${skillName}**: 1d20(${roll})${formatMod(mod)} = **${total}** vs CD ${cd}. [**${res.label}**]`,
      pushGlobal: true,
      isSuccess: res.grau === 'sucesso' || res.grau === 'sucesso_critico',
      isCritical: res.grau === 'sucesso_critico',
    };
  }
};
