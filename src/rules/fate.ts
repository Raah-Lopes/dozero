import type { RulesEngineDefinition } from './index';

const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

export const fateEngine: RulesEngineDefinition = {
  id: 'fate',
  name: 'Fate / Fudge',
  description: 'Rolagem de 4 dados Fate (-1, 0, +1) somados à perícia do personagem.',
  author: 'DOZERO Core',
  icon: '✨',
  defaultDie: 6, // Fate uses dF (which has 6 sides visually, but we map it logically below)

  rollAttribute: (attrName, attrValue, charName, cd) => {
    // 4dF
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 3) - 1);
    const diceTotal = rolls.reduce((a, b) => a + b, 0);
    const total = diceTotal + attrValue;
    
    let resultLabel = total >= cd ? '✅ SUCESSO' : '❌ FALHA';
    if (total >= cd + 3) resultLabel = '💥 SUCESSO COM ESTILO';
    
    const faceLabels = rolls.map(r => r === 1 ? '[+]' : r === -1 ? '[-]' : '[ ]').join(' ');

    return {
      logMsg: `✨ **${charName}** rola **${attrName.toUpperCase()}** (Fate): ${faceLabels} = ${formatMod(diceTotal)} + ${attrValue}(perícia) = **${total}** vs CD ${cd}. [**${resultLabel}**]`,
      pushGlobal: true,
      isSuccess: total >= cd,
      isCritical: total >= cd + 3,
    };
  },

  rollSkill: (skillName, skillValue, charName, cd) => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 3) - 1);
    const diceTotal = rolls.reduce((a, b) => a + b, 0);
    const total = diceTotal + skillValue;
    
    let resultLabel = total >= cd ? '✅ SUCESSO' : '❌ FALHA';
    if (total >= cd + 3) resultLabel = '💥 SUCESSO COM ESTILO';
    
    const faceLabels = rolls.map(r => r === 1 ? '[+]' : r === -1 ? '[-]' : '[ ]').join(' ');

    return {
      logMsg: `✨ **${charName}** rola perícia **${skillName}** (Fate): ${faceLabels} = ${formatMod(diceTotal)} + ${skillValue}(perícia) = **${total}** vs CD ${cd}. [**${resultLabel}**]`,
      pushGlobal: true,
      isSuccess: total >= cd,
      isCritical: total >= cd + 3,
    };
  }
};
