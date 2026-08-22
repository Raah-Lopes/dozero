import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { UserPlus, Dna, Settings2, Coins, Save, Send, Sparkles } from 'lucide-react';
import { pushChatMessage } from '../../../store';
import { NPCParser } from '../../../services/oracle/NPCParser';
import type { NPCCategory } from '../../../services/oracle/NPCParser';
import { LootParser } from '../../../services/oracle/LootParser';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { saveMarkdownContent } from '../../../utils/githubApi';
import { toast } from '../../UI/Toast';

interface GeneratedNPC {
  nome: string;
  racaReal: string;
  sexo: string;
  idade: string;
  papel: string;
  disposicao: string;
  fisico: string;
  marcaRacial: string;
  psicologico: string;
  ameaca: string;
  estilo: string;
  hp: number;
  motivacao: string;
  segredo: string;
  racaEmoji: string;
  base64Data: string;
}

interface NPCGeneratorWidgetProps {
  onClose?: () => void;
  embedded?: boolean;
}

const RACAS_DISPONIVEIS = [
  'Humano', 'Elfo', 'Meio-Elfo', 'Drow (Elfo Negro)', 
  'Anão', 'Duergar', 'Gnomo', 'Fada (Dríade/Ninfa)', 'Firbolg',
  'Aarakocra (Povo-pássaro)', 'Centauro', 'Sátiro',
  'Gith', 'Gnoll', 'Dragonborn', 'Dragão',
  'Demônio/Diabo', 'Anjo/Celestial', 'Elemental', 'Djinni',
  'Gigante', 'Aberrações (Illithid/Aboleth)', 'Sintético', 'Vampiro'
];

export const NPCGeneratorWidget: React.FC<NPCGeneratorWidgetProps> = ({ onClose, embedded }) => {
  const [categories, setCategories] = useState<NPCCategory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterRaca, setFilterRaca] = useState<string>('Aleatório');
  const [filterAmeaca, setFilterAmeaca] = useState<string>('Aleatório');
  const [currentNPC, setCurrentNPC] = useState<GeneratedNPC | null>(null);

  useEffect(() => {
    NPCParser.loadCategories().then(cats => setCategories(cats)).catch(() => {});
    LootParser.loadCategories();

    (window as any).rollLootForNPC = (npcNome: string, npcAmeaca: string) => {
      const lootCats = LootParser.getCategoriesSync();
      if (lootCats.length === 0) return;

      const megaLoot = lootCats[0];
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
        items.push(rollT('Itens Mágicos Menores / Relíquias'));
      } else if (npcAmeaca.includes('Nv 5')) {
        items.push(rollT('Consumíveis'));
        items.push(rollT('Equipamento Incomum'));
        items.push(rollT('Itens Mágicos Menores / Relíquias'));
        items.push(rollT('Itens Mágicos Menores / Relíquias'));
      }

      const itemsHtml = items.filter(Boolean).map(i => `<li>${i}</li>`).join('');

      const lootHtml = `
        <div style="background: rgba(234, 179, 8, 0.1); border-left: 4px solid #eab308; padding: 8px 12px; border-radius: 4px; margin-top: 8px; font-family: monospace;">
          <div style="color: #facc15; font-weight: bold; font-size: 0.9em; margin-bottom: 4px;">💰 Loot de ${npcNome}</div>
          <div style="font-size: 0.85em; color: var(--text-secondary);">
            <b>Valores:</b> ${money || 'Nenhum'}<br/>
            <b>Pertences:</b>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              ${itemsHtml}
            </ul>
          </div>
        </div>
      `;

      pushChatMessage(lootHtml);
      toast.success(`Loot de "${npcNome}" rolado no chat!`);
    };

    (window as any).createNPCWiki = async (npcBase64: string) => {
      try {
        const npcData = JSON.parse(decodeURIComponent(atob(npcBase64)));
        await saveNPCToWiki(npcData);
      } catch (err: any) {
        toast.error('Erro ao salvar ficha na Wiki.');
      }
    };
  }, []);

  const saveNPCToWiki = async (npc: GeneratedNPC | any) => {
    try {
      const fileName = `${npc.nome.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
      const path = `[1] 🏕️ Campanha Principal/Personagens/${fileName}`;
      
      let md = `---\n`;
      md += `tipo: NPC\n`;
      md += `nome: "${npc.nome}"\n`;
      md += `raca: "${npc.racaReal}"\n`;
      md += `hp: ${npc.hp}\n`;
      md += `maxHp: ${npc.hp}\n`;
      md += `ameaca: "${npc.ameaca}"\n`;
      md += `tags: [npc, generated]\n`;
      md += `---\n\n`;
      md += `# 🧙‍♂️ ${npc.nome}\n\n`;
      md += `> **Espécie:** ${npc.racaReal} (${npc.papel || 'Cidadão'})\n>\n`;
      md += `> **Perfil:** ${npc.sexo}, ${npc.idade} | **Ameaça:** ${npc.ameaca} (HP: ${npc.hp})\n\n`;
      md += `### 🎭 Personalidade & Disposição\n* **Disposição:** ${npc.disposicao}\n* **Psicológico:** ${npc.psicologico}\n* **Estilo:** ${npc.estilo}\n\n`;
      md += `### 🧬 Características Físicas\n* **Marca Racial:** ${npc.marcaRacial}\n* **Traço Marcante:** ${npc.fisico}\n\n`;
      md += `### 🎯 Motivação & Segredo\n* **Motivação:** ${npc.motivacao}\n* **Segredo:** ${npc.segredo}\n\n`;

      await saveMarkdownContent(path, md);
      toast.success(`Ficha de "${npc.nome}" salva na Wiki!`);
    } catch (err) {
      toast.error('Falha ao salvar ficha do NPC na Wiki.');
    }
  };

  const shareToChat = (npc: GeneratedNPC) => {
    const chatHtml = `
      <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace;">
        <div style="color: #4ade80; font-size: 1.05em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 8px; display:flex; align-items:center; justify-content: space-between;">
          <span>${npc.racaEmoji} <b>${npc.nome}</b> <span style="font-size: 0.8em; color: var(--text-secondary)">(${npc.racaReal} ${npc.papel})</span></span>
        </div>
        <div style="font-size: 0.88em; line-height: 1.4; color: var(--text-secondary);">
          <b>Perfil:</b> ${npc.sexo}, ${npc.idade}<br/>
          <b>Disposição:</b> ${npc.disposicao}<br/>
          <span style="color: #c084fc"><b>Marca Racial:</b> ${npc.marcaRacial}</span><br/>
          <b>Traço Extra:</b> ${npc.fisico}<br/>
          <b>Personalidade:</b> ${npc.psicologico}<br/>
          <div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid rgba(34, 197, 94, 0.5);">
            <b>🎯 Motivação:</b> ${npc.motivacao}<br/>
            <b>🕵️ Segredo:</b> <span style="color: #f87171">${npc.segredo}</span>
          </div>
        </div>
        <div style="margin-top: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 0.85em;">
          ⚔️ <b>${npc.ameaca}</b> | HP: ${npc.hp}<br/>
          🛡️ <b>Estilo:</b> ${npc.estilo}
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px;">
          <button 
            onclick="window.rollLootForNPC('${npc.nome}', '${npc.ameaca}')"
            style="background: #fbbf24; color: black; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px; font-weight: bold;"
          >
            💰 Rolar Loot
          </button>
          <button 
            onclick="window.createNPCWiki('${npc.base64Data}')"
            style="background: var(--accent-primary); color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px; font-weight: bold;"
          >
            📁 Salvar Ficha
          </button>
        </div>
      </div>
    `;

    pushChatMessage(chatHtml);
    toast.success(`NPC "${npc.nome}" enviado ao Chat!`);
  };

  const gerarNPC = () => {
    setIsGenerating(true);

    const findTable = (tName: string) => {
      for (const cat of categories) {
        const table = cat.tables.find(t => t.name.toLowerCase().includes(tName.toLowerCase()));
        if (table) return table;
      }
      return null;
    };

    const rollT = (tName: string, fallbackArr: string[]) => {
      const table = findTable(tName);
      if (table && table.rows && table.rows.length > 0) {
        try {
          const r = new DiceRoll(table.dice || '1d100');
          const row = table.rows.find(row => r.total >= row.min && r.total <= row.max);
          if (row) return row.result;
        } catch (e) {}
      }
      return fallbackArr[Math.floor(Math.random() * fallbackArr.length)];
    };

    const racaReal = filterRaca === 'Aleatório' ? RACAS_DISPONIVEIS[Math.floor(Math.random() * RACAS_DISPONIVEIS.length)] : filterRaca;
    const ameaca = filterAmeaca === 'Aleatório' ? ['Nv 1 (Aldeão)', 'Nv 2 (Capanga)', 'Nv 3 (Veterano)', 'Nv 4 (Elite)', 'Nv 5 (Chefe)'][Math.floor(Math.random() * 5)] : filterAmeaca;

    const nomes = ['Kaelen', 'Theron', 'Vael', 'Lyra', 'Morwen', 'Draxis', 'Zephyr', 'Baelor', 'Rowan', 'Gideon', 'Aeliana', 'Sylas'];
    const papeis = ['Mercador', 'Ferreiro', 'Guarda', 'Mago Errante', 'Ladrão de Joias', 'Sacerdote', 'Nobre Caído', 'Caçador de Recompensas', 'Alquimista', 'Veterano de Guerra'];
    const disposicoes = ['Amigável e acolhedor', 'Desconfiado e arredio', 'Curioso e intrometido', 'Hostil e intimidador', 'Frio e calculista'];
    const fisicos = ['Cicatriz profunda no olho', 'Olhar penetrante e misterioso', 'Tatuagens rúnicas brilhantes', 'Capa de viagem surrada', 'Postura militar impecável'];
    const marcas = ['Olhos dourados como ouro', 'Voz que ressoa em harmonia', 'Cheiro constante de ozônio e fogo', 'Passos que não deixam pegadas'];
    const psicologicos = ['Orgulhoso e leal', 'Paranoico e observador', 'Sonhador e impulsivo', 'Melancólico e sábio', 'Pragmático e implacável'];
    const estilos = ['Ataque corpo-a-corpo brutal', 'Feitiços rápidos à distância', 'Emboscada e venenos', 'Evasão e contra-ataque'];
    const motivacoes = ['Recuperar a honra de sua família', 'Pagar uma dívida de sangue com o submundo', 'Encontrar a cura para uma maldição ancestral', 'Acumular riqueza para construir sua própria fortaleza'];
    const segredos = ['Trabalha em segredo para a facção rival', 'Possui um artefato proibido escondido no casaco', 'É um fugitivo procurado em três reinos', 'Tem um pacto com uma entidade do abismo'];

    const nome = rollT('Nomes', nomes);
    const sexo = Math.random() > 0.5 ? 'Masculino' : 'Feminino';
    const idade = `${Math.floor(Math.random() * 40) + 18} anos`;
    const papel = rollT('Papéis', papeis);
    const disp = rollT('Disposição', disposicoes);
    const fisico = rollT('Físico', fisicos);
    const marcaRacial = rollT('Marcas Raciais', marcas);
    const psico = rollT('Psicológico', psicologicos);
    const estilo = rollT('Estilo de Combate', estilos);
    const motivacao = rollT('Motivação', motivacoes);
    const segredo = rollT('Segredo', segredos);

    let hp = 15;
    if (ameaca.includes('Nv 2')) hp = 30;
    else if (ameaca.includes('Nv 3')) hp = 60;
    else if (ameaca.includes('Nv 4')) hp = 95;
    else if (ameaca.includes('Nv 5')) hp = 160;

    const racaEmoji = {
      'Humano': '👤', 'Elfo': '🧝', 'Anão': '🧔', 'Fada': '🧚', 
      'Sintético': '🤖', 'Dragão': '🐉', 'Monstro/Orc': '👹', 
      'Demônio': '👿', 'Anjo': '👼', 'Vampiro': '🧛'
    }[racaReal] || '👤';

    const npcData = {
      nome, racaReal, sexo, idade, papel, disposicao: disp, fisico, marcaRacial, psicologico: psico, ameaca, estilo, hp, motivacao, segredo
    };
    const base64Data = btoa(encodeURIComponent(JSON.stringify(npcData)));

    const createdNPC: GeneratedNPC = {
      ...npcData,
      racaEmoji,
      base64Data
    };

    setCurrentNPC(createdNPC);
    shareToChat(createdNPC);
    setTimeout(() => setIsGenerating(false), 400);
  };

  const bodyContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
          <Settings2 size={18} /> Forja de Personagens & NPCs
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select 
            value={filterRaca} 
            onChange={e => setFilterRaca(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }}
          >
            <option value="Aleatório">🎲 Raça: Aleatória</option>
            {RACAS_DISPONIVEIS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select 
            value={filterAmeaca} 
            onChange={e => setFilterAmeaca(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }}
          >
            <option value="Aleatório">🎲 Ameaça: Aleatória</option>
            <option value="Nv 1 (Aldeão)">Nv 1 (Aldeão)</option>
            <option value="Nv 2 (Capanga)">Nv 2 (Capanga)</option>
            <option value="Nv 3 (Veterano)">Nv 3 (Veterano)</option>
            <option value="Nv 4 (Elite)">Nv 4 (Elite)</option>
            <option value="Nv 5 (Chefe)">Nv 5 (Chefe)</option>
          </select>
        </div>
      </div>

      {/* Botão de Forjar */}
      <button 
        onClick={gerarNPC}
        disabled={isGenerating}
        style={{ 
          padding: '12px 16px', 
          background: 'var(--accent-primary)', 
          color: '#ffffff', 
          border: '1px solid var(--glass-border-highlight)', 
          borderRadius: '8px', 
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px', 
          fontSize: '14px', 
          fontWeight: 'bold',
          transition: 'all 0.2s',
          transform: isGenerating ? 'scale(0.98)' : 'scale(1)',
          boxShadow: '0 4px 15px var(--accent-glow)',
          flexShrink: 0
        }}
      >
        {isGenerating ? (
          <><Dna size={18} className="spin" /> Sintetizando Genoma...</>
        ) : (
          <><UserPlus size={18} /> Forjar Novo NPC</>
        )}
      </button>

      {/* Visualização Direta do NPC Forjado */}
      {currentNPC ? (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: 'var(--glass-shadow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{currentNPC.racaEmoji}</span>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{currentNPC.nome}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({currentNPC.racaReal} • {currentNPC.papel})</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'var(--accent-glow)', color: 'var(--text-primary)', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--accent-primary)' }}>
              HP: {currentNPC.hp} | {currentNPC.ameaca}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', lineHeight: '1.45' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>👤 Perfil & Idade: </span>
              <span style={{ color: 'var(--text-primary)' }}>{currentNPC.sexo}, {currentNPC.idade}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🤝 Disposição & Vibe: </span>
              <span style={{ color: 'var(--warning)' }}>{currentNPC.disposicao}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🧬 Marca Racial & Físico: </span>
              <span style={{ color: 'var(--accent-primary)' }}>{currentNPC.marcaRacial}</span> • <span>{currentNPC.fisico}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🛡️ Estilo & Personalidade: </span>
              <span style={{ color: 'var(--text-primary)' }}>{currentNPC.estilo} ({currentNPC.psicologico})</span>
            </div>

            <div style={{ marginTop: '4px', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', borderRadius: '4px' }}>
              <div style={{ color: 'var(--danger)', fontWeight: 700 }}>🎯 Motivação: <span style={{ color: 'var(--text-primary)', fontWeight: 400 }}>{currentNPC.motivacao}</span></div>
              <div style={{ color: 'var(--danger)', fontWeight: 700, marginTop: '2px' }}>🕵️ Segredo: <span style={{ color: 'var(--text-primary)', fontWeight: 400 }}>{currentNPC.segredo}</span></div>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => (window as any).rollLootForNPC(currentNPC.nome, currentNPC.ameaca)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', background: 'var(--warning)', border: 'none',
                borderRadius: '6px', color: '#000', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700
              }}
            >
              <Coins size={13} /> Rolar Loot
            </button>
            <button
              onClick={() => shareToChat(currentNPC)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              <Send size={13} /> Reenviar ao Chat
            </button>
            <button
              onClick={() => saveNPCToWiki(currentNPC)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', background: 'var(--success)', border: 'none',
                borderRadius: '6px', color: '#fff', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700
              }}
            >
              <Save size={13} /> Salvar Ficha na Wiki
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          border: '1px dashed var(--glass-border)',
          borderRadius: '10px',
          padding: '24px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          gap: '8px'
        }}>
          <UserPlus size={28} style={{ opacity: 0.4 }} />
          <span style={{ fontSize: '0.85rem' }}>Nenhum NPC sintetizado ainda nesta sessão.</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Escolha os filtros acima e clique em "Forjar Novo NPC".</span>
        </div>
      )}

    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow 
      id="npc-generator"
      title="🧙‍♂️ Forja de NPCs" 
      onClose={onClose} 
      width={440}
      height={540}
      initialX={window.innerWidth / 2 - 220} 
      initialY={window.innerHeight / 2 - 270}
      dragAnywhere={false}
    >
      {bodyContent}
    </DraggableWindow>
  );
};
