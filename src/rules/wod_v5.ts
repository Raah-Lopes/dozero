import type { RulesEngineDefinition } from './index';

export const wodV5Engine: RulesEngineDefinition = {
  id: 'wod_v5',
  name: 'Vampiro: A Máscara (WoD V5)',
  description: 'Rolagem de Parada de Dados (d10). Resultados 6+ são sucessos. 10s contam dobrado em pares.',
  author: 'DOZERO Core',
  icon: '🩸',
  defaultDie: 10,

  rollAttribute: (attrName, attrValue, charName, cd) => {
    // In WoD V5, usually you roll Attribute + Skill. 
    // If just rolling an attribute (e.g. for a raw check), pool is attrValue
    const pool = Math.max(1, attrValue);
    const rolls = Array.from({ length: pool }, () => Math.floor(Math.random() * 10) + 1);
    
    const successes = rolls.filter(r => r >= 6 && r < 10).length;
    const tens = rolls.filter(r => r === 10).length;
    const criticalSuccesses = Math.floor(tens / 2) * 4 + (tens % 2); // Pair of 10s = 4 successes (2 crits)
    const totalSuccesses = successes + criticalSuccesses;
    const isCrit = tens >= 2;
    
    let resultLabel = totalSuccesses >= cd ? '✅ SUCESSO' : '❌ FALHA';
    if (isCrit && totalSuccesses >= cd) resultLabel = '💥 SUCESSO CRÍTICO';
    
    const rollsStr = rolls.map(r => r >= 6 ? `**${r}**` : `${r}`).join(', ');

    return {
      logMsg: `🩸 **${charName}** rola **${attrName.toUpperCase()}** (Parada: ${pool}d10): [${rollsStr}] = **${totalSuccesses}** sucessos vs CD ${cd}. [**${resultLabel}**]`,
      pushGlobal: true,
      isSuccess: totalSuccesses >= cd,
      isCritical: isCrit && totalSuccesses >= cd,
    };
  },

  rollSkill: (skillName, skillValue, charName, cd) => {
    const pool = Math.max(1, skillValue);
    const rolls = Array.from({ length: pool }, () => Math.floor(Math.random() * 10) + 1);
    
    const successes = rolls.filter(r => r >= 6 && r < 10).length;
    const tens = rolls.filter(r => r === 10).length;
    const criticalSuccesses = Math.floor(tens / 2) * 4 + (tens % 2);
    const totalSuccesses = successes + criticalSuccesses;
    const isCrit = tens >= 2;
    
    let resultLabel = totalSuccesses >= cd ? '✅ SUCESSO' : '❌ FALHA';
    if (isCrit && totalSuccesses >= cd) resultLabel = '💥 SUCESSO CRÍTICO';
    
    const rollsStr = rolls.map(r => r >= 6 ? `**${r}**` : `${r}`).join(', ');

    return {
      logMsg: `🩸 **${charName}** rola perícia **${skillName}** (Parada: ${pool}d10): [${rollsStr}] = **${totalSuccesses}** sucessos vs CD ${cd}. [**${resultLabel}**]`,
      pushGlobal: true,
      isSuccess: totalSuccesses >= cd,
      isCritical: isCrit && totalSuccesses >= cd,
    };
  }
};
