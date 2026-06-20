import React, { useState, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { Map, MapPin, Hammer } from 'lucide-react';
import { pushChatMessage } from '../../store';
import { LocationParser } from '../../services/oracle/LocationParser';
import type { NPCCategory, NPCTable } from '../../services/oracle/NPCParser';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { saveMarkdownContent } from '../../utils/githubApi';

interface LocationGeneratorWidgetProps {
  onClose?: () => void;
}

export const LocationGeneratorWidget: React.FC<LocationGeneratorWidgetProps> = ({ onClose }) => {
  const [categories, setCategories] = useState<NPCCategory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterType, setFilterType] = useState<string>('Aleatório');

  useEffect(() => {
    LocationParser.loadCategories().then(cats => setCategories(cats));

    // Global function to handle wiki creation from chat
    (window as any).createLocationWiki = async (locBase64: string) => {
      try {
        const locData = JSON.parse(decodeURIComponent(atob(locBase64)));
        const fileName = `${locData.nome.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
        const path = `[1] 🏕️ Campanha Principal/Locais/${fileName}`;
        
        let md = `---\n`;
        md += `tipo: Local\n`;
        md += `nome: "${locData.nome}"\n`;
        md += `tags: [local, generated]\n`;
        md += `---\n\n`;
        md += `# 🏰 ${locData.nome}\n\n`;
        md += `> **Tamanho:** ${locData.tamanho}\n>\n`;
        md += `> *Ameaça/Perigo:* ${locData.perigo}\n\n`;
        
        md += `## 📜 Visão Geral\n`;
        md += `- **Atmosfera:** ${locData.atmosfera}\n`;
        md += `- **Economia Principal:** ${locData.economia}\n`;
        md += `- **Rumor/Segredo:** ${locData.rumor}\n\n`;

        md += `### Notas do Mestre\n`;
        md += `(Adicione as anotações detalhadas sobre este local aqui)\n`;

        await saveMarkdownContent(path, md);
        alert(`✅ Ficha de ${locData.nome} criada com sucesso em [1] 🏕️ Campanha Principal/Locais/!`);
      } catch (e) {
        console.error(e);
        alert('Erro ao criar a ficha de Local na Wiki.');
      }
    };

    return () => {
      delete (window as any).createLocationWiki;
    };
  }, []);

  const findTable = (name: string): NPCTable | null => {
    if (categories.length === 0) return null;
    const cat = categories[0];
    return cat.tables.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
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

  const gerarLocal = () => {
    setIsGenerating(true);
    
    let tema = filterType;
    if (tema === 'Aleatório') {
      tema = Math.random() > 0.5 ? 'Fantasia' : 'Sci-Fi';
    }

    const nomeTable = findTable(`Nome (${tema})`) || findTable('Nome (Fantasia)');
    const nome = rollTable(nomeTable);
    
    const tamanho = rollTable(findTable('Tamanho do Assentamento'));
    const economia = rollTable(findTable('Economia / Recurso Principal'));
    const perigo = rollTable(findTable('Perigo Local'));
    const atmosfera = rollTable(findTable('Atmosfera (Vibe)'));
    const rumor = rollTable(findTable('Segredo / Rumor'));

    const locData = { nome, tamanho, economia, perigo, atmosfera, rumor };
    const base64Data = btoa(encodeURIComponent(JSON.stringify(locData)));

    const chatHtml = `
      <div style="background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace;">
        <div style="color: var(--accent-primary); font-size: 1.1em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 8px; display:flex; align-items:center; gap: 6px;">
          🗺️ <b>${nome}</b>
        </div>
        <div style="font-size: 0.9em; line-height: 1.4; color: var(--text-secondary);">
          <b>Escala:</b> ${tamanho}<br/>
          <b>Vibe:</b> ${atmosfera}<br/>
          <b>Economia:</b> ${economia}<br/>
          <div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid rgba(239,68,68,0.5);">
            <b>⚠️ Perigo:</b> ${perigo}<br/>
            <b>🕵️ Segredo/Rumor:</b> <span style="color: #c084fc">${rumor}</span>
          </div>
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
          <button 
            onclick="window.createLocationWiki('${base64Data}')"
            style="background: var(--accent-primary); color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px;"
          >
            📁 Salvar Local
          </button>
        </div>
      </div>
    `;

    pushChatMessage(chatHtml);
    setTimeout(() => setIsGenerating(false), 400);
  };

  return (
    <DraggableWindow 
      id="location-generator"
      title="Forja de Mundos" 
      onClose={onClose} 
      width={320}
      height={260}
      initialX={window.innerWidth / 2} 
      initialY={window.innerHeight / 2 - 130}
      dragAnywhere={false}
    >
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
          <MapPin size={18} /> Geometria
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Tema / Estilo
          </label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px', outline: 'none' }}
          >
            <option value="Aleatório">🎲 Aleatório</option>
            <option value="Fantasia">🏰 Fantasia Medieval</option>
            <option value="Sci-Fi">🚀 Sci-Fi / Cyberpunk</option>
          </select>
        </div>

        <button 
          onClick={gerarLocal}
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
            'Carregando Terreno...'
          ) : isGenerating ? (
            <><Hammer size={20} className="spin" /> Construindo...</>
          ) : (
            <><Map size={20} /> Forjar Local</>
          )}
        </button>

      </div>
    </DraggableWindow>
  );
};
