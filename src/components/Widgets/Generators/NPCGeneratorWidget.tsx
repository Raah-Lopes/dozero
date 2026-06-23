import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { UserPlus, Dna, Settings2 } from 'lucide-react';
import { pushChatMessage } from '../../../store';
import { NPCParser } from '../../../services/oracle/NPCParser';
import type { NPCCategory, NPCTable } from '../../../services/oracle/NPCParser';
import { LootParser } from '../../../services/oracle/LootParser';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { saveMarkdownContent } from '../../../utils/githubApi';

interface NPCGeneratorWidgetProps {
  onClose?: () => void;
}

const RACAS_DISPONIVEIS = ['Humano', 'Elfo', 'Anão', 'Fada', 'Sintético', 'Dragão', 'Monstro/Orc', 'Demônio', 'Anjo', 'Vampiro'];

export const NPCGeneratorWidget: React.FC<NPCGeneratorWidgetProps> = ({ onClose }) => {
  const [categories, setCategories] = useState<NPCCategory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filtros Avançados
  const [filterRaca, setFilterRaca] = useState<string>('Aleatório');
  const [filterAmeaca, setFilterAmeaca] = useState<string>('Aleatório');

  useEffect(() => {
    NPCParser.getCategories().then(cats => setCategories(cats));
    LootParser.loadCategories();

    (window as any).rollLootForNPC = (npcNome: string, npcAmeaca: string) => {
      const lootCats = LootParser.getCategoriesSync();
      if (lootCats.length === 0) return;

      const megaLoot = lootCats[0]; // Mega Loot
      const findTable = (tName: string) => megaLoot.tables.find(t => t.name.toLowerCase() === tName.toLowerCase());

      const rollT = (tName: string) => {
        const table = findTable(tName);
        if (!table) return '';
        const r = new DiceRoll(table.dice);
        const row = table.rows.find(row => r.total >= row.min && r.total <= row.max);
        return row ? row.result : '';
      };

      let money = rollT('Moedas e Valores');
      let items = [rollT('Itens Mundanos / Lixo')];

      if (npcAmeaca.includes('Nv 2')) {
        items.push(rollT('Consumíveis'));
      } else if (npcAmeaca.includes('Nv 3')) {
        items.push(rollT('Consumíveis'));
        items.push(rollT('Equipamento Incomum'));
      } else if (npcAmeaca.includes('Nv 4')) {
        items.push(rollT('Consumíveis'));
        items.push(rollT('Equipamento Incomum'));
        if (Math.random() > 0.5) items.push(rollT('Artefatos e Raridades'));
      } else if (npcAmeaca.includes('Nv 5')) {
        items.push(rollT('Equipamento Incomum'));
        items.push(rollT('Equipamento Incomum'));
        items.push(rollT('Artefatos e Raridades'));
        items.push(rollT('Artefatos e Raridades'));
      }

      const lootHtml = `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace;">
          <div style="color: #fbbf24; font-size: 1.1em; border-bottom: 1px solid rgba(251,191,36,0.3); padding-bottom: 4px; margin-bottom: 8px; display:flex; align-items:center; gap: 6px;">
            💰 <b>Loot de ${npcNome}</b> <span style="font-size: 0.8em; color: var(--text-secondary)">(${npcAmeaca})</span>
          </div>
          <div style="font-size: 0.9em; line-height: 1.6; color: var(--text-secondary);">
            <b style="color: #fcd34d;">Valores:</b> ${money}<br/>
            <b style="color: #34d399;">Itens:</b>
            <ul style="margin: 4px 0 0 0; padding-left: 20px;">
              ${items.filter(i => i).map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
      pushChatMessage(lootHtml);
    };

    // Global function to handle wiki creation from chat
    (window as any).createNPCWiki = async (npcBase64: string) => {
      try {
        const npcData = JSON.parse(decodeURIComponent(atob(npcBase64)));
        const fileName = `${npcData.nome.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
        const path = `[1] 🏕️ Campanha Principal/NPCs/${fileName}`;
        
        let md = `---\n`;
        md += `tipo: NPC\n`;
        md += `nome: "${npcData.nome}"\n`;
        md += `HP: ${npcData.hp}\n`;
        md += `HP_max: ${npcData.hp}\n`;
        md += `PM: 10\n`;
        md += `PM_max: 10\n`;
        md += `energia: 100\n`;
        md += `energia_max: 100\n`;
        md += `sanidade: 100\n`;
        md += `sanidade_max: 100\n`;
        md += `fome: 0\n`;
        md += `fome_max: 100\n`;
        md += `sede: 0\n`;
        md += `sede_max: 100\n`;
        md += `cansaco: 0\n`;
        md += `cansaco_max: 100\n`;
        md += `defesa: 10\n`;
        md += `Nivel: 1\n`;
        md += `Ouro: 0\n`;
        md += `Riquezas: 0\n`;
        md += `status_efeitos: []\n`;
        md += `armas: []\n`;
        md += `poderes: []\n`;
        md += `pocoes: []\n`;
        md += `maldicoes: []\n`;
        md += `objetos_campanha: []\n`;
        md += `inventario: []\n`;
        md += `tags: [npc, generated, ${npcData.racaReal}]\n`;
        md += `---\n\n`;
        md += `# 👤 ${npcData.nome}\n\n`;
        md += `> **${npcData.sexo} | ${npcData.racaReal} | ${npcData.idade} | ${npcData.papel}**\n>\n`;
        md += `> *Disposição:* ${npcData.disposicao}\n\n`;
        
        md += `## 👁️ Aparência & Personalidade\n`;
        md += `- **Marca Racial:** ${npcData.marcaRacial}\n`;
        md += `- **Traço Físico Geral:** ${npcData.fisico}\n`;
        md += `- **Psicológico:** ${npcData.psicologico}\n`;
        md += `- **🎯 Motivação:** ${npcData.motivacao}\n`;
        md += `- **🕵️ Segredo Sombrio:** ${npcData.segredo}\n\n`;

        md += `## 📊 Status de Combate\n`;
        md += `- **Nível de Ameaça:** ${npcData.ameaca}\n`;
        md += `- **Estilo:** ${npcData.estilo}\n`;
        md += `- **HP Máximo:** ${npcData.hp}\n\n`;

        md += `### Notas do Mestre\n`;
        md += `(Adicione as anotações sobre como os jogadores conheceram esta entidade aqui)\n`;

        await saveMarkdownContent(path, md);
        alert(`✅ Ficha de ${npcData.nome} criada com sucesso em [1] 🏕️ Campanha Principal/NPCs/!`);
      } catch (e) {
        console.error(e);
        alert('Erro ao criar a ficha na Wiki.');
      }
    };

    return () => {
      delete (window as any).createNPCWiki;
      delete (window as any).rollLootForNPC;
    };
  }, []);

  const findTable = (name: string): NPCTable | null => {
    for (const cat of categories) {
      for (const t of cat.tables) {
        if (t.name.toLowerCase() === name.toLowerCase()) return t;
      }
    }
    // Fallback pra includes se o exact match falhar
    for (const cat of categories) {
      for (const t of cat.tables) {
        if (t.name.toLowerCase().includes(name.toLowerCase())) return t;
      }
    }
    return null;
  };

  const rollTable = (table: NPCTable | null): string => {
    if (!table) return 'Desconhecido';
    try {
      const roll = new DiceRoll(table.dice);
      const row = table.rows.find(r => roll.total >= r.min && roll.total <= r.max);
      return row ? row.result : `[${roll.total}]`;
    } catch {
      return 'Erro';
    }
  };

  const gerarNPC = () => {
    setIsGenerating(true);
    
    // 1. Definir Raça Real (Seja por filtro ou sorteio)
    let racaReal = filterRaca;
    if (racaReal === 'Aleatório') {
      const rIdx = Math.floor(Math.random() * RACAS_DISPONIVEIS.length);
      racaReal = RACAS_DISPONIVEIS[rIdx];
    }

    // 2. Rolagens Básicas com base na Raça
    const nomeTable = findTable(`Nome (${racaReal})`) || findTable('Nome (Humano)');
    const marcaTable = findTable(`Marca Racial (${racaReal})`) || findTable('Marca Racial (Genérica)');
    
    const nome = rollTable(nomeTable);
    const marcaRacial = rollTable(marcaTable);
    
    // 3. Rolagens Padrão
    const sexo = rollTable(findTable('Sexo'));
    const idade = rollTable(findTable('Idade'));
    const papel = rollTable(findTable('Papel ou Profissão'));
    const disp = rollTable(findTable('Disposição'));
    
    // Perfil
    const fisico = rollTable(findTable('Descritor Físico'));
    const psico = rollTable(findTable('Descritor Psicológico'));
    const motivacao = rollTable(findTable('Motivação Principal'));
    const segredo = rollTable(findTable('Segredo Sombrio'));

    // 4. Status de Combate
    let ameaca = '';
    if (filterAmeaca !== 'Aleatório') {
      ameaca = filterAmeaca; // Força a ameaça selecionada
    } else {
      ameaca = rollTable(findTable('Nível de Ameaça'));
    }
    const estilo = rollTable(findTable('Estilo de Combate'));

    // Calcula um HP Base baseado no nível de ameaça gerado
    let hp = 10;
    if (ameaca.includes('Nv 2')) hp = 25;
    else if (ameaca.includes('Nv 3')) hp = 50;
    else if (ameaca.includes('Nv 4')) hp = 80;
    else if (ameaca.includes('Nv 5')) hp = 150;
    
    // Dragões ganham boost insano de HP
    if (racaReal === 'Dragão') hp *= 5;

    // Constrói o objeto de dados
    const npcData = {
      nome, racaReal, sexo, idade, papel, disposicao: disp, fisico, marcaRacial, psicologico: psico, ameaca, estilo, hp, motivacao, segredo
    };

    const base64Data = btoa(encodeURIComponent(JSON.stringify(npcData)));

    // Emojis dinâmicos para a raça
    const racaEmoji = {
      'Humano': '👤', 'Elfo': '🧝', 'Anão': '🧔', 'Fada': '🧚', 
      'Sintético': '🤖', 'Dragão': '🐉', 'Monstro/Orc': '👹', 
      'Demônio': '👿', 'Anjo': '👼', 'Vampiro': '🧛'
    }[racaReal] || '👤';

    // Formata pro chat
    const chatHtml = `
      <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace;">
        <div style="color: var(--accent-primary); font-size: 1.1em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 8px; display:flex; align-items:center; justify-content: space-between;">
          <span>${racaEmoji} <b>${nome}</b> <span style="font-size: 0.8em; color: var(--text-secondary)">(${racaReal} ${papel})</span></span>
        </div>
        <div style="font-size: 0.9em; line-height: 1.4; color: var(--text-secondary);">
          <b>Perfil:</b> ${sexo}, ${idade}<br/>
          <b>Disposição:</b> ${disp}<br/>
          <span style="color: #c084fc"><b>Marca Racial:</b> ${marcaRacial}</span><br/>
          <b>Traço Extra:</b> ${fisico}<br/>
          <b>Personalidade:</b> ${psico}<br/>
          <div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid rgba(255,122,0,0.5);">
            <b>🎯 Motivação:</b> ${motivacao}<br/>
            <b>🕵️ Segredo:</b> <span style="color: #f87171">${segredo}</span>
          </div>
        </div>
        <div style="margin-top: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 0.85em;">
          ⚔️ <b>${ameaca}</b> | HP: ${hp}<br/>
          🛡️ <b>Estilo:</b> ${estilo}
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px;">
          <button 
            onclick="window.rollLootForNPC('${nome}', '${ameaca}')"
            style="background: #fbbf24; color: black; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px; font-weight: bold;"
          >
            💰 Rolar Loot
          </button>
          <button 
            onclick="window.createNPCWiki('${base64Data}')"
            style="background: var(--accent-primary); color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px;"
          >
            📁 Salvar Ficha
          </button>
        </div>
      </div>
    `;

    pushChatMessage(chatHtml);
    setTimeout(() => setIsGenerating(false), 500);
  };

  return (
    <DraggableWindow 
      id="npc-generator"
      title="Forja de Entidades" 
      onClose={onClose} 
      width={340}
      height={320}
      initialX={window.innerWidth / 2 - 170} 
      initialY={window.innerHeight / 2 - 160}
      dragAnywhere={false}
    >
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
          <Settings2 size={18} /> Filtros Genéticos
        </div>

        {/* Dropdown de Raça */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Espécie / Origem
          </label>
          <select 
            value={filterRaca} 
            onChange={e => setFilterRaca(e.target.value)}
            style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px', outline: 'none' }}
          >
            <option value="Aleatório">🎲 Qualquer (Aleatório)</option>
            {RACAS_DISPONIVEIS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Dropdown de Ameaça */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Nível de Ameaça
          </label>
          <select 
            value={filterAmeaca} 
            onChange={e => setFilterAmeaca(e.target.value)}
            style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px', outline: 'none' }}
          >
            <option value="Aleatório">🎲 Aleatório pelas tabelas</option>
            <option value="Nv 1 (Minion/Aldeão)">Nv 1 (Minion/Aldeão)</option>
            <option value="Nv 2 (Capanga/Soldado)">Nv 2 (Capanga/Soldado)</option>
            <option value="Nv 3 (Veterano/Ameaça Real)">Nv 3 (Veterano/Ameaça Real)</option>
            <option value="Nv 4 (Elite/Chefe Menor)">Nv 4 (Elite/Chefe Menor)</option>
            <option value="Nv 5 (Chefe Absoluto)">Nv 5 (Chefe Absoluto)</option>
          </select>
        </div>

        {/* Botão Principal */}
        <button 
          onClick={gerarNPC}
          disabled={categories.length === 0 || isGenerating}
          style={{ 
            marginTop: 'auto',
            padding: '16px', 
            background: categories.length === 0 ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: categories.length === 0 || isGenerating ? 'not-allowed' : 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            transition: 'all 0.2s',
            transform: isGenerating ? 'scale(0.98)' : 'scale(1)',
            boxShadow: '0 4px 15px rgba(255,122,0, 0.3)'
          }}
        >
          {categories.length === 0 ? (
            'Carregando Genoma...'
          ) : isGenerating ? (
            <><Dna size={20} className="spin" /> Sintetizando...</>
          ) : (
            <><UserPlus size={20} /> Forjar Entidade</>
          )}
        </button>

      </div>
    </DraggableWindow>
  );
};
