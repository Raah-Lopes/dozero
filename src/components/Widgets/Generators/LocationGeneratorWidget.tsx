import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { Map, MapPin, Hammer, Save, Send, Sparkles, AlertTriangle, Compass, ShieldAlert } from 'lucide-react';
import { pushChatMessage } from '../../../store';
import { LocationParser } from '../../../services/oracle/LocationParser';
import type { NPCCategory } from '../../../services/oracle/NPCParser';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import { saveMarkdownContent } from '../../../utils/githubApi';
import { toast } from '../../UI/Toast';

interface GeneratedLocation {
  nome: string;
  tamanho: string;
  perigo: string;
  atmosfera: string;
  marcos: string;
  segredo: string;
  tipo: string;
  timestamp: number;
}

interface LocationGeneratorWidgetProps {
  onClose?: () => void;
  embedded?: boolean;
}

export const LocationGeneratorWidget: React.FC<LocationGeneratorWidgetProps> = ({ onClose, embedded }) => {
  const [categories, setCategories] = useState<NPCCategory[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterType, setFilterType] = useState<string>('Aleatório');
  const [currentLocation, setCurrentLocation] = useState<GeneratedLocation | null>(null);

  useEffect(() => {
    LocationParser.loadCategories().then(cats => setCategories(cats)).catch(() => {});

    // Global function to handle wiki creation from chat
    (window as any).createLocationWiki = async (locBase64: string) => {
      try {
        const locData = JSON.parse(decodeURIComponent(atob(locBase64)));
        await saveLocationToWiki(locData);
      } catch (err: any) {
        toast.error('Erro ao salvar local na Wiki.');
      }
    };
  }, []);

  const saveLocationToWiki = async (loc: GeneratedLocation) => {
    try {
      const fileName = `${loc.nome.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
      const path = `[1] 🏕️ Campanha Principal/Locais/${fileName}`;
      
      let md = `---\n`;
      md += `tipo: Local\n`;
      md += `nome: "${loc.nome}"\n`;
      md += `tamanho: "${loc.tamanho}"\n`;
      md += `perigo: "${loc.perigo}"\n`;
      md += `tags: [local, generated]\n`;
      md += `---\n\n`;
      md += `# 🏰 ${loc.nome}\n\n`;
      md += `> **Tamanho/População:** ${loc.tamanho}\n>\n`;
      md += `> **Nível de Perigo:** ${loc.perigo}\n\n`;
      md += `### 📜 Descrição & Atmosfera\n${loc.atmosfera}\n\n`;
      md += `### 🏛️ Marcos Notáveis\n${loc.marcos}\n\n`;
      md += `### 🎲 Segredos & Ganchos Narrativos\n${loc.segredo}\n\n`;

      await saveMarkdownContent(path, md);
      toast.success(`Ficha de Local "${loc.nome}" salva na Wiki com sucesso!`);
    } catch (err: any) {
      toast.error('Falha ao gravar arquivo na Wiki.');
    }
  };

  const shareToChat = (loc: GeneratedLocation) => {
    const base64Data = btoa(encodeURIComponent(JSON.stringify(loc)));
    const chatHtml = `
      <div style="background: rgba(59, 130, 246, 0.12); border-left: 4px solid #3b82f6; padding: 12px; border-radius: 6px; font-family: sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #60a5fa; font-weight: bold; font-size: 1.1em;">🏰 ${loc.nome}</span>
          <span style="font-size: 0.8em; color: var(--text-secondary); background: rgba(0,0,0,0.3); padding: 2px 6px; borderRadius: 4px;">${loc.tamanho}</span>
        </div>
        <div style="font-size: 0.9em; line-height: 1.4; color: var(--text-secondary);">
          <b>Atmosfera:</b> ${loc.atmosfera}<br/>
          <b>Marco:</b> ${loc.marcos}<br/>
          <div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid rgba(59, 130, 246, 0.5);">
            <b>⚠️ Perigo:</b> ${loc.perigo}<br/>
            <b>🕵️ Segredo:</b> <span style="color: #f87171">${loc.segredo}</span>
          </div>
        </div>
        <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px;">
          <button 
            onclick="window.createLocationWiki('${base64Data}')"
            style="background: #3b82f6; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em; display: flex; align-items: center; gap: 4px; font-weight: bold;"
          >
            📁 Salvar Local na Wiki
          </button>
        </div>
      </div>
    `;

    pushChatMessage(chatHtml);
    toast.success(`Local "${loc.nome}" compartilhado no Chat!`);
  };

  const gerarLocal = () => {
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

    // Fallbacks robustos se matrizes não estiverem carregadas
    const prefixos = ['Ruínas de', 'Fortaleza de', 'Vila de', 'Povoado de', 'Cripta de', 'Torre de', 'Santuário de', 'Porto de', 'Bosque de', 'Oásis de', 'Posto Avançado de', 'Cidadela de'];
    const sufixos = ['Valfenda', 'Kharanos', 'Eldoria', 'Pedranegra', 'Sombra-eterna', 'Sol-poente', 'Vento-frio', 'Brumas', 'Espinho', 'Chama-azul', 'Ossos-brancos', 'Prata-velha'];
    const tamanhos = ['Acampamento Isolado (3-10 habitantes)', 'Vila Pequena (50-200 habitantes)', 'Cidadela Murada (1.000+ habitantes)', 'Masmorra / Complexo Subterrâneo', 'Posto Comercial Fortificado'];
    const perigos = ['Baixo (Patrulhas constantes e clima calmo)', 'Moderado (Batedores e feras nas proximidades)', 'Alto (Presença de cultistas ou mortos-vivos)', 'Extremo / Mortal (Covil de dragão ou energia profana)'];
    const atmosferas = ['Névoa pesada, cheiro de enxofre e silêncio sepulcral', 'Ventos gélidos, tochas estalando e guardas apreensivos', 'Ruínas cobertas de musgo com inscrições arcanas brilhando suavemente', 'Mercado movimentado com mercadores de itens exóticos'];
    const marcosLista = ['Estátua colossal quebrada no centro da praça', 'Árvore ancestral com raízes pulsando seiva azul', 'Ponte de pedra suspensa sobre um abismo sem fundo', 'Monólito negro emitindo um zumbido constante'];
    const segredosLista = ['Túneis secretos sob a fonte levam a uma câmara do tesouro esquecida', 'O líder local é controlado por um parasita mental antigo', 'Um pacto antigo protege o local em troca de um sacrifício a cada lua cheia', 'Uma arma lendária está selada dentro da pedra angular'];

    const prefixo = rollT('Tipo de Local', prefixos);
    const sufixo = rollT('Nome do Local', sufixos);
    const nome = `${prefixo} ${sufixo}`;
    const tamanho = rollT('Tamanho / População', tamanhos);
    const perigo = rollT('Nível de Perigo', perigos);
    const atmosfera = rollT('Atmosfera', atmosferas);
    const marcos = rollT('Marco Notável', marcosLista);
    const segredo = rollT('Segredo', segredosLista);

    const loc: GeneratedLocation = {
      nome,
      tamanho,
      perigo,
      atmosfera,
      marcos,
      segredo,
      tipo: filterType,
      timestamp: Date.now()
    };

    setCurrentLocation(loc);
    shareToChat(loc);
    setTimeout(() => setIsGenerating(false), 400);
  };

  const bodyContent = (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Controles de Configuração */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
          <Compass size={18} /> Forja de Mundos & Locais
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Estilo:
          </label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', outline: 'none', fontSize: '0.8rem' }}
          >
            <option value="Aleatório">🎲 Aleatório</option>
            <option value="Fantasia">🏰 Fantasia Medieval</option>
            <option value="Sci-Fi">🚀 Sci-Fi / Cyberpunk</option>
          </select>
        </div>
      </div>

      {/* Botão de Forjar */}
      <button 
        onClick={gerarLocal}
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
          <><Hammer size={18} className="spin" /> Sintetizando Terreno...</>
        ) : (
          <><Sparkles size={18} /> Forjar Novo Local</>
        )}
      </button>

      {/* Exibição do Local Forjado Dentro do Widget */}
      {currentLocation ? (
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
              <span style={{ fontSize: '1.2rem' }}>🏰</span>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{currentLocation.nome}</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'var(--accent-glow)', color: 'var(--text-primary)', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--accent-primary)' }}>
              {currentLocation.tamanho}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', lineHeight: '1.45' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>⚠️ Ameaça & Perigo: </span>
              <span style={{ color: 'var(--warning)' }}>{currentLocation.perigo}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>📜 Atmosfera & Clima: </span>
              <span style={{ color: 'var(--text-primary)' }}>{currentLocation.atmosfera}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🏛️ Marco Notável: </span>
              <span style={{ color: 'var(--text-primary)' }}>{currentLocation.marcos}</span>
            </div>

            <div style={{ marginTop: '4px', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--danger)', fontWeight: 700 }}>🕵️ Segredo / Gancho: </span>
              <span style={{ color: 'var(--text-primary)' }}>{currentLocation.segredo}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => shareToChat(currentLocation)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              <Send size={13} /> Reenviar ao Chat
            </button>
            <button
              onClick={() => saveLocationToWiki(currentLocation)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', background: 'var(--accent-primary)', border: 'none',
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
          <MapPin size={28} style={{ opacity: 0.4 }} />
          <span style={{ fontSize: '0.85rem' }}>Nenhum local forjado ainda nesta sessão.</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Clique no botão "Forjar Novo Local" acima para sintetizar um cenário com atmosfera e segredos.</span>
        </div>
      )}

    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow 
      id="location-generator"
      title="Forja de Mundos & Locais" 
      onClose={onClose} 
      width={420}
      height={520}
      initialX={window.innerWidth / 2} 
      initialY={window.innerHeight / 2 - 260}
      dragAnywhere={false}
    >
      {bodyContent}
    </DraggableWindow>
  );
};
