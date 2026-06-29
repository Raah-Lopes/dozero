import type { RulesEngineDefinition } from './index';

const getD100Degree = (roll: number, chance: number) => {
  const ext = Math.floor(chance / 5);
  const hard = Math.floor(chance / 2);
  
  let grau: 'sucesso_critico' | 'sucesso_bom' | 'sucesso' | 'falha' | 'falha_critica' = 'falha';
  
  if (roll <= ext || roll === 1) {
    grau = 'sucesso_critico';
  } else if (roll <= hard) {
    grau = 'sucesso_bom';
  } else if (roll <= chance) {
    grau = 'sucesso';
  } else if (roll >= 96) {
    grau = 'falha_critica';
  } else {
    grau = 'falha';
  }
  
  const labels = {
    sucesso_critico: '💥 SUCESSO EXTREMO',
    sucesso_bom: '🔥 SUCESSO BOM (Duro)',
    sucesso: '✅ SUCESSO (Normal)',
    falha: '❌ FALHA',
    falha_critica: '💀 FALHA DESASTROSA',
  };
  
  return { grau, label: labels[grau] };
};

export const d100Engine: RulesEngineDefinition = {
  id: 'd100',
  name: 'Sistema Percentual (d100)',
  description: 'Rolagem de 1d100. Deve tirar igual ou menos que a chance (Perícia/Atributo x 5).',
  author: 'DOZERO Core',
  icon: '📊',
  defaultDie: 100,

  rollAttribute: (attrName, attrValue, charName, _cd) => {
    // In d100, attributes are usually multiplied by 5 for a % chance
    const chance = attrValue * 5;
    const roll = Math.floor(Math.random() * 100) + 1;
    const res = getD100Degree(roll, chance);
    
    return {
      logMsg: `📊 **${charName}** rola **${attrName.toUpperCase()} (d100)**: Rolou **${roll}** vs chance **${chance}%** (Atributo ${attrValue}). [**${res.label}**]`,
      pushGlobal: true,
      isSuccess: res.grau === 'sucesso' || res.grau === 'sucesso_bom' || res.grau === 'sucesso_critico',
      isCritical: res.grau === 'sucesso_critico' || res.grau === 'sucesso_bom',
    };
  },

  rollSkill: (skillName, skillValue, charName, _cd) => {
    // In d100, skill values are usually 1-100 directly.
    // If they are 1-20 in DOZERO, we need to adapt:
    const chance = skillValue <= 20 ? skillValue * 5 : skillValue;
    const roll = Math.floor(Math.random() * 100) + 1;
    const res = getD100Degree(roll, chance);
    
    return {
      logMsg: `📊 **${charName}** rola perícia **${skillName} (d100)**: Rolou **${roll}** vs chance **${chance}%**. [**${res.label}**]`,
      pushGlobal: true,
      isSuccess: res.grau === 'sucesso' || res.grau === 'sucesso_bom' || res.grau === 'sucesso_critico',
      isCritical: res.grau === 'sucesso_critico' || res.grau === 'sucesso_bom',
    };
  }
};
