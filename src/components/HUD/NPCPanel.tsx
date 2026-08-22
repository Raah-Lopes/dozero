// src/components/HUD/NPCPanel.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Tokens } from '../../store/modules';
import { state, updateTokenProps } from '../../store';
import { useWiki } from '../../hooks/useWiki';
import { loadMarkdownFile, saveMarkdownContent, saveImageToCloud } from '../../utils/githubApi';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import { NPCParser } from '../../services/oracle/NPCParser';
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import * as yaml from 'js-yaml';
import { 
  UserPlus, GripVertical, Eye, EyeOff, Target, FileText, 
  Trash2, Search, LayoutGrid, List, User, Cpu, Copy, BookOpen, Sparkles, Settings
} from 'lucide-react';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { getWikiConfig } from '../../store';
import { resolveImageUrl, convertImageToWebP } from '../../utils/imageUtils';
import { toast } from '../UI/Toast';
import { confirmDialog } from '../UI/Toast';
import { Tooltip } from '../UI/Tooltip';

const RACAS_DISPONIVEIS = ['Humano', 'Elfo', 'Anão', 'Fada', 'Sintético', 'Dragão', 'Monstro/Orc', 'Demônio', 'Anjo', 'Vampiro'];

const CONDITIONS = [
  { id: 'burning',    label: '🔥', title: 'Queimando',    color: '#f97316' },
  { id: 'poisoned',  label: '☠',  title: 'Envenenado',   color: '#22c55e' },
  { id: 'frozen',    label: '❄',  title: 'Congelado',    color: '#38bdf8' },
  { id: 'stunned',   label: '😵', title: 'Atordoado',    color: '#a855f7' },
  { id: 'frightened',label: '👁', title: 'Assustado',    color: '#eab308' },
  { id: 'bleeding',  label: '🩸', title: 'Sangrando',    color: '#ef4444' },
  { id: 'inspired',  label: '⭐', title: 'Inspirado',    color: 'var(--warning)' },
  { id: 'invisible', label: '👻', title: 'Invisível',    color: 'var(--text-secondary)' },
  { id: 'shielded',  label: '🛡', title: 'Protegido',    color: '#3b82f6' },
  { id: 'weakened',  label: '💀', title: 'Enfraquecido', color: '#6b7280' },
];

export const NPCPanel: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [activePanelTab, setActivePanelTab] = useState<'board' | 'library'>('board');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'players' | 'enemies'>('all');
  const [showOnlyLinked, setShowOnlyLinked] = useState(true);
  const [generatorCategories, setGeneratorCategories] = useState<any[]>([]);

  const { index: wikiIndex, isLoading: isWikiLoading } = useWiki();

  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  const [uploadingTokenId, setUploadingTokenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const observer = () => {
      const allTokens = Array.from(state.tokens.values());
      setTokens(allTokens);
    };

    state.tokens.observe(observer);
    observer();

    // Carrega tabelas do oráculo para a fábrica de NPCs
    NPCParser.getCategories().then(cats => setGeneratorCategories(cats));

    return () => state.tokens.unobserve(observer);
  }, []);

  const createNewCharacter = () => {
    const id = 'npc_' + Date.now() + Math.random().toString(36).substr(2, 5);
    state.tokens.set(id, {
      id,
      name: 'Novo NPC',
      hp: 10,
      maxHp: 10,
      mana: 0,
      maxMana: 0,
      x: -9999, // Off-screen initially
      y: -9999,
      isPlayer: false
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tokenId: string) => {
    e.dataTransfer.setData('tokenId', tokenId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartWiki = (e: React.DragEvent<HTMLDivElement>, path: string) => {
    e.dataTransfer.setData('wikiPath', path);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleToggleVisibility = (token: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isVisible = token.x > -1000 && token.y > -1000;
    if (isVisible) {
      // Esconder: move off-screen
      state.tokens.set(token.id, { ...token, x: -9999, y: -9999 });
    } else {
      // Mostrar: move to center
      state.tokens.set(token.id, { 
        ...token, 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2 
      });
    }
  };

  const handleFocusToken = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('focus-token', { detail: { tokenId } }));
  };

  const handleOpenSheet = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('token-dblclick', { detail: { tokenId } }));
  };

  const handleOpenWikiSheet = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: path }));
  };

  const handleDeleteToken = async (tokenId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmDialog(`Deseja remover "${name}" do tabuleiro?\nA ficha Markdown (.md) continuará existindo na Wiki.`);
    if (ok) state.tokens.delete(tokenId);
  };

  const handleCloneToken = (token: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = 'token_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    let newName = token.name;
    const match = token.name.match(/\s+(\d+)$/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      newName = token.name.replace(/\s+(\d+)$/, ` ${num}`);
    } else {
      newName = `${token.name} 2`;
    }

    state.tokens.set(id, {
      ...token,
      id,
      name: newName,
      x: token.x + 35,
      y: token.y + 35
    });

    state.chat.push([{
      text: `👥 Clone <b>${newName}</b> criado a partir de <b>${token.name}</b> no mapa!`,
      timestamp: Date.now(),
      isCritical: false,
      isFailure: false
    }]);
  };

  const handleSpawnFromWiki = async (path: string) => {
    try {
      const rawMd = await loadMarkdownFile(path);
      if (!rawMd) return;
      const parts = rawMd.split('---');
      if (parts.length < 3) {
        toast.error("O arquivo não tem formato Frontmatter válido.");
        return;
      }

      const data = yaml.load(parts[1]) as any;
      if (!data) return;

      const tipo = String(data.tipo || '').toLowerCase();
      const status = String(data.status || '').toLowerCase();
      const isPlayer = ['pc', 'personagem', 'jogador'].includes(tipo) || status === 'jogador' || path.toLowerCase().includes('/jogadores/');

      const entry = wikiIndex.find(e => e.path === path);
      const wikiSlug = entry?.slug;

      const id = `token_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      state.tokens.set(id, {
        id,
        name: data.nome || data.titulo || (entry?.slug) || path.split('/').pop()?.replace('.md', '') || 'Desconhecido',
        hp: data.HP || data.pv || 100,
        maxHp: data.HP_max || data.pv_max || data.HP || data.pv || 100,
        mana: data.PM || data.mana || 50,
        maxMana: data.PM_max || data.mana_max || data.PM || data.mana || 50,
        hunger: Number(data.fome || data.Fome || 0),
        thirst: Number(data.sede || data.Sede || 0),
        sanity: Number(data.sanidade || data.Sanidade || 100),
        imageUrl: data.imageUrl || data.avatar || data.imagem || '/vite.svg',
        tokenShape: data.tokenShape || 'circle',
        sizeScale: Number(data.sizeScale) || 1,
        borderColor: data.borderColor || '#06b6d4',
        showName: data.showName === true,
        hpBarMode: data.hpBarMode || 'always',
        isPlayer,
        wikiSlug,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });

      state.chat.push([{
        text: `⚡ <b>${data.nome || entry?.slug || 'Entidade'}</b> foi conjurado(a) no centro do mapa!`,
        timestamp: Date.now(),
        isCritical: true,
        isFailure: false
      }]);
    } catch (err) {
      console.error("Erro ao evocar da biblioteca:", err);
      toast.error("Falha ao conjurar entidade.");
    }
  };

  // Fábrica automática de Fichas .md para tokens sem ficha linked
  const handleGenerateSheetForToken = async (token: any) => {
    if (generatorCategories.length === 0) {
      toast.info("Carregando tabelas do Oráculo. Aguarde um instante...");
      return;
    }
    
    try {
      const name = token.name || 'Novo NPC';
      const cleanName = name.replace(/[^a-z0-9]/gi, '_');
      const fileName = `${cleanName}_${Date.now()}.md`;
      const path = `[1] 🏕️ Campanha Principal/NPCs/${fileName}`;

      const findTableLocal = (tableName: string) => {
        for (const cat of generatorCategories) {
          for (const t of cat.tables) {
            if (t.name.toLowerCase() === tableName.toLowerCase()) return t;
          }
        }
        for (const cat of generatorCategories) {
          for (const t of cat.tables) {
            if (t.name.toLowerCase().includes(tableName.toLowerCase())) return t;
          }
        }
        return null;
      };

      const rollTableLocal = (table: any) => {
        if (!table) return 'Desconhecido';
        try {
          const roll = new DiceRoll(table.dice);
          const row = table.rows.find((r: any) => roll.total >= r.min && roll.total <= r.max);
          return row ? row.result : `[${roll.total}]`;
        } catch {
          return 'Erro';
        }
      };

      // Rola atributos aleatórios
      const rIdx = Math.floor(Math.random() * RACAS_DISPONIVEIS.length);
      const racaReal = RACAS_DISPONIVEIS[rIdx];

      const marcaTable = findTableLocal(`Marca Racial (${racaReal})`) || findTableLocal('Marca Racial (Genérica)');
      const marcaRacial = rollTableLocal(marcaTable);
      
      const sexo = rollTableLocal(findTableLocal('Sexo'));
      const idade = rollTableLocal(findTableLocal('Idade'));
      const papel = rollTableLocal(findTableLocal('Papel ou Profissão'));
      const disp = rollTableLocal(findTableLocal('Disposição'));
      const fisico = rollTableLocal(findTableLocal('Descritor Físico'));
      const psico = rollTableLocal(findTableLocal('Descritor Psicológico'));
      const motivacao = rollTableLocal(findTableLocal('Motivação Principal'));
      const segredo = rollTableLocal(findTableLocal('Segredo Sombrio'));
      const ameaca = rollTableLocal(findTableLocal('Nível de Ameaça'));
      const estilo = rollTableLocal(findTableLocal('Estilo de Combate'));

      let hp = token.hp || 10;
      if (hp === 10) {
        if (ameaca.includes('Nv 2')) hp = 25;
        else if (ameaca.includes('Nv 3')) hp = 50;
        else if (ameaca.includes('Nv 4')) hp = 80;
        else if (ameaca.includes('Nv 5')) hp = 150;
        if (racaReal === 'Dragão') hp *= 5;
      }
      
      const maxHp = Math.max(hp, token.maxHp || hp);

      // Constrói corpo do Markdown
      let md = `---\n`;
      md += `tipo: NPC\n`;
      md += `nome: "${name}"\n`;
      md += `HP: ${hp}\n`;
      md += `HP_max: ${maxHp}\n`;
      md += `PM: ${token.mana || 10}\n`;
      md += `PM_max: ${token.maxMana || 10}\n`;
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
      md += `defesa: ${token.defesa || 10}\n`;
      md += `Nivel: 1\n`;
      md += `Ouro: ${token.ouro || 0}\n`;
      md += `Riquezas: ${token.riquezas || 0}\n`;
      md += `status_efeitos: []\n`;
      md += `armas: []\n`;
      md += `poderes: []\n`;
      md += `pocoes: []\n`;
      md += `maldicoes: []\n`;
      md += `objetos_campanha: []\n`;
      md += `inventario: []\n`;
      md += `tags: [npc, generated, ${racaReal}]\n`;
      if (token.imageUrl) {
        md += `avatar: "${token.imageUrl}"\n`;
      }
      md += `---\n\n`;
      md += `# 👤 ${name}\n\n`;
      md += `> **${sexo} | ${racaReal} | ${idade} | ${papel}**\n>\n`;
      md += `> *Disposição:* ${disp}\n\n`;
      
      md += `## 👁️ Aparência & Personalidade\n`;
      md += `- **Marca Racial:** ${marcaRacial}\n`;
      md += `- **Traço Físico Geral:** ${fisico}\n`;
      md += `- **Psicológico:** ${psico}\n`;
      md += `- **🎯 Motivação:** ${motivacao}\n`;
      md += `- **🕵️ Segredo Sombrio:** ${segredo}\n\n`;
  
      md += `## 📊 Status de Combate\n`;
      md += `- **Nível de Ameaça:** ${ameaca}\n`;
      md += `- **Estilo:** ${estilo}\n`;
      md += `- **HP Máximo:** ${maxHp}\n\n`;
  
      md += `### Notas do Mestre\n`;
      md += `*(Ficha gerada automaticamente usando oráculos a partir do mapa)*\n`;

      await saveMarkdownContent(path, md);

      // Vincula o Token
      const wikiSlug = fileName.replace('.md', '');
      state.tokens.set(token.id, {
        ...token,
        hp,
        maxHp,
        wikiSlug
      });

      state.chat.push([{
        text: `🔮 Ficha de NPC (.md) criada e vinculada a <b>${name}</b>!<br/>` +
              `🧬 <b>Raça:</b> ${racaReal} | ⚔️ <b>Ameaça:</b> ${ameaca}`,
        timestamp: Date.now(),
        isCritical: true,
        isFailure: false
      }]);

      toast.success(`✅ Ficha de "${name}" criada e vinculada com sucesso!`);
      
      WikiIndexer.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar ficha gerada.");
    }
  };

  const handleUpdateTokenProp = async (token: any, field: string, value: any) => {
    Tokens.update(token.id, { [field]: value });

    const entry = wikiIndex.find(e => {
      if (token.wikiSlug && e.slug === token.wikiSlug) return true;
      const nameRaw = (token.name || '').trim().toLowerCase();
      return (e.metadata?.titulo || '').toLowerCase().trim() === nameRaw || e.slug.toLowerCase().trim() === nameRaw;
    });

    if (entry) {
      let wikiField = field;
      if (field === 'imageUrl') wikiField = 'avatar';
      
      const success = await syncTokenFieldToWiki(entry.path, wikiField, value);
      if (success) {
        WikiIndexer.clearCache();
        window.dispatchEvent(new Event('wiki-updated'));
      }
    }
  };

  const handlePropChangeEnd = async (token: any, field: string, value: any) => {
    const entry = wikiIndex.find(e => {
      if (token.wikiSlug && e.slug === token.wikiSlug) return true;
      const nameRaw = (token.name || '').trim().toLowerCase();
      return (e.metadata?.titulo || '').toLowerCase().trim() === nameRaw || e.slug.toLowerCase().trim() === nameRaw;
    });

    if (entry) {
      let wikiField = field;
      if (field === 'imageUrl') wikiField = 'avatar';
      
      const success = await syncTokenFieldToWiki(entry.path, wikiField, value);
      if (success) {
        WikiIndexer.clearCache();
        window.dispatchEvent(new Event('wiki-updated'));
      }
    }
  };

  const handleAvatarClick = (tokenId: string) => {
    console.log('[NPCPanel] handleAvatarClick triggered. tokenId:', tokenId, 'fileInputRef.current:', fileInputRef.current);
    setUploadingTokenId(tokenId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else {
      console.error('[NPCPanel] fileInputRef.current is null!');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTokenId) return;
    const token = state.tokens.get(uploadingTokenId) as any;
    if (!token) return;

    try {
      const { base64 } = await convertImageToWebP(file, 0.7, 512);
      
      // Nunca escreve base64 no Yjs — bloataria o documento e faria tokens sumirem
      // Sobe para nuvem primeiro
      const cleanName = (token.name || 'avatar').replace(/[^a-zA-Z0-9]/g, '_');
      const cloudUrl = await saveImageToCloud(base64, `${cleanName}_${Date.now()}.webp`);
      if (!cloudUrl) return;

      // Só então grava a URL permanente no Yjs
      Tokens.update(token.id, { imageUrl: cloudUrl });

      const entry = wikiIndex.find(en => {
        if (token.wikiSlug && en.slug === token.wikiSlug) return true;
        const nameRaw = (token.name || '').trim().toLowerCase();
        return (en.metadata?.titulo || '').toLowerCase().trim() === nameRaw || en.slug.toLowerCase().trim() === nameRaw;
      });
      if (entry) {
        const success = await syncTokenFieldToWiki(entry.path, 'avatar', cloudUrl);
        if (success) {
          WikiIndexer.clearCache();
          window.dispatchEvent(new Event('wiki-updated'));
        }
      }
    } catch (err) {
      console.error("[NPCPanel] Erro ao converter/salvar imagem do token", err);
    }
  };

  // Filter board tokens
  const filteredTokens = tokens.filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let isMatch = matchesSearch;
    if (filterType === 'players') isMatch = matchesSearch && t.isPlayer === true;
    if (filterType === 'enemies') isMatch = matchesSearch && t.isPlayer !== true;

    if (isMatch && showOnlyLinked) {
      const hasLinkedSheet = wikiIndex.some(e => {
        if (t.wikiSlug && e.slug === t.wikiSlug) return true;
        const nameRaw = (t.name || '').trim().toLowerCase();
        return (e.metadata?.titulo || '').toLowerCase().trim() === nameRaw || e.slug.toLowerCase().trim() === nameRaw;
      });
      return hasLinkedSheet;
    }
    
    return isMatch;
  });

  // Filter wiki files matching characters
  const wikiEntities = wikiIndex.filter(e => {
    const tipo = String(e.metadata?.tipo || '').toLowerCase();
    const status = String(e.metadata?.status || '').toLowerCase();
    const path = e.path.toLowerCase();
    
    if (path.includes('_modelo')) return false;

    const isChar = ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
                   ['jogador', 'npc', 'inimigo'].includes(status) ||
                   path.includes('/fichas/') ||
                   path.includes('/personagens/') ||
                   path.includes('fichas/') ||
                   path.includes('personagens/');

    if (!isChar) return false;

    const nome = String(e.metadata?.nome || e.metadata?.titulo || e.slug || '');
    return path.includes(searchTerm.toLowerCase()) || nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
      
      {/* Tab Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', borderRadius: '6px 6px 0 0', padding: '2px 4px 0 4px', flexShrink: 0 }}>
        <button
          onClick={() => setActivePanelTab('board')}
          style={{
            flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 'bold', border: 'none',
            background: activePanelTab === 'board' ? 'var(--accent-glow)' : 'transparent',
            borderBottom: activePanelTab === 'board' ? '2px solid var(--accent-primary)' : 'none',
            color: activePanelTab === 'board' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'all 0.15s ease'
          }}
        >
          No Tabuleiro ({tokens.filter(t => t.x > -1000).length})
        </button>
        <button
          onClick={() => setActivePanelTab('library')}
          style={{
            flex: 1, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 'bold', border: 'none',
            background: activePanelTab === 'library' ? 'var(--accent-glow)' : 'transparent',
            borderBottom: activePanelTab === 'library' ? '2px solid var(--accent-primary)' : 'none',
            color: activePanelTab === 'library' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer', borderRadius: '4px 4px 0 0', transition: 'all 0.15s ease'
          }}
        >
          Biblioteca (.md)
        </button>
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {activePanelTab === 'board' ? 'Gerenciador de Instâncias' : 'Fichas Disponíveis na Wiki'}
        </span>
        {activePanelTab === 'board' && (
          <Tooltip label="Criar Token Rápido">
            <button onClick={createNewCharacter} className="btn-icon" style={{ background: 'var(--accent-primary)', color: 'var(--text-primary)', border: 'none', width: '22px', height: '22px', padding: 0 }}>
              <UserPlus size={12} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Filters & View Modes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={activePanelTab === 'board' ? "Pesquisar no tabuleiro..." : "Pesquisar na Wiki..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '4px 24px 4px 8px', background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.75rem'
            }}
          />
          <Search size={12} color="var(--text-secondary)" style={{ position: 'absolute', right: '8px', top: '8px' }} />
        </div>

        {/* Categories (Board Tab only) */}
        {activePanelTab === 'board' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              {(['all', 'players', 'enemies'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    padding: '3px 6px', fontSize: '0.65rem', borderRadius: '4px',
                    background: filterType === type ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    border: filterType === type ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                    color: filterType === type ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {type === 'all' ? 'Todos' : type === 'players' ? 'PCs' : 'Monstros/NPCs'}
                </button>
              ))}
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showOnlyLinked} 
                  onChange={e => setShowOnlyLinked(e.target.checked)} 
                  style={{ cursor: 'pointer', margin: 0 }}
                />
                Fichas Normais
              </label>
            </div>

            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <Tooltip label="Visualização em Lista">
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    background: viewMode === 'list' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none', color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center'
                  }}
                >
                  <List size={12} />
                </button>
              </Tooltip>
              <Tooltip label="Visualização em Grade">
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    background: viewMode === 'grid' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none', color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center'
                  }}
                >
                  <LayoutGrid size={12} />
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* List / Grid Container */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
        
        {/* TAB 1: BOARD INSTANCES */}
        {activePanelTab === 'board' && (
          filteredTokens.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
              Nenhum token encontrado no tabuleiro.
            </p>
          ) : viewMode === 'list' ? (
            /* LIST VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredTokens.map(t => {
                const isVisible = t.x > -1000 && t.y > -1000;
                // Verifica se tem ficha .md vinculada
                const hasLinkedSheet = wikiIndex.some(e => {
                  if (t.wikiSlug && e.slug === t.wikiSlug) return true;
                  const nameRaw = (t.name || '').trim().toLowerCase();
                  return (e.metadata?.titulo || '').toLowerCase().trim() === nameRaw || e.slug.toLowerCase().trim() === nameRaw;
                });

                return (
                  <React.Fragment key={t.id}>
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px', background: isVisible ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        borderRadius: expandedTokenId === t.id ? '6px 6px 0 0' : '6px', 
                        border: '1px solid var(--glass-border)',
                        borderBottom: expandedTokenId === t.id ? 'none' : '1px solid var(--glass-border)',
                        cursor: 'grab', opacity: isVisible ? 1 : 0.6,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                      title="Arraste para o mapa!"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <GripVertical size={12} color="var(--text-secondary)" style={{ cursor: 'grab', flexShrink: 0 }} />
                        {/* Tiny Avatar */}
                        {t.imageUrl ? (
                          <img loading="lazy" decoding="async" 
                            src={t.imageUrl} 
                            alt={t.name} 
                            style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--glass-border)', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                            {t.isPlayer ? <User size={12} color="var(--success)" /> : <Cpu size={12} color="var(--text-secondary)" />}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            HP {t.hp}/{t.maxHp}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
                        <Tooltip label={isVisible ? "Esconder do Mapa" : "Materializar no Mapa"}>
                          <button
                            onClick={(e) => handleToggleVisibility(t, e)}
                            style={{ background: 'transparent', border: 'none', color: isVisible ? 'var(--success)' : 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                        </Tooltip>
                        {isVisible && (
                          <Tooltip label="Focar Câmera no Token">
                            <button
                              onClick={(e) => handleFocusToken(t.id, e)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--mana)', cursor: 'pointer', padding: '2px' }}
                            >
                              <Target size={12} />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip label="Duplicar Token (Clonar)">
                          <button
                            onClick={(e) => handleCloneToken(t, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Copy size={12} />
                          </button>
                        </Tooltip>
                        
                        {/* Gerador de Ficha se não tiver vinculada */}
                        {!hasLinkedSheet && (
                          <Tooltip label="Gerar Ficha .md (Oráculo)">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleGenerateSheetForToken(t); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '2px' }}
                            >
                              <Sparkles size={12} />
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip label="Aparência e Estilo do Token">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedTokenId(expandedTokenId === t.id ? null : t.id); }}
                            style={{ background: 'transparent', border: 'none', color: expandedTokenId === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Settings size={12} />
                          </button>
                        </Tooltip>

                        <Tooltip label="Abrir Ficha do Personagem">
                          <button
                            onClick={(e) => handleOpenSheet(t.id, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <FileText size={12} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Excluir do Tabuleiro">
                          <button
                            onClick={(e) => handleDeleteToken(t.id, t.name, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {expandedTokenId === t.id && (
                      <div style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '-1px',
                        marginBottom: '4px',
                        boxShadow: 'var(--glass-shadow)',
                        fontSize: '0.75rem'
                      }}>
                        {/* Title bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '4px' }}>
                          <Settings size={12} color="var(--accent-primary)" />
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>Configurações do Token</span>
                        </div>

                        {/* Name & Avatar */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Tooltip label="Alterar Imagem/Avatar">
                            <button
                              type="button"
                              onClick={() => handleAvatarClick(t.id)}
                              style={{
                                width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden',
                                border: '1px dashed var(--glass-border)', cursor: 'pointer', position: 'relative',
                                flexShrink: 0, padding: 0, background: 'transparent'
                              }}
                            >
                              {t.imageUrl ? (
                                <img loading="lazy" decoding="async" src={resolveImageUrl(t.imageUrl)} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <User size={16} />
                                </div>
                              )}
                              <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0, 
                                background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.5rem', 
                                textAlign: 'center', padding: '1px 0'
                              }}>
                                EDIT
                              </div>
                            </button>
                          </Tooltip>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Nome do Token</label>
                            <input
                              type="text"
                              value={t.name || ''}
                              onChange={(e) => {
                                Tokens.update(t.id, { name: e.target.value });
                              }}
                              onBlur={(e) => handlePropChangeEnd(t, 'name', e.target.value)}
                              style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                borderRadius: '4px', color: 'var(--text-primary)', padding: '3px 6px', fontSize: '0.75rem',
                                width: '100%'
                              }}
                            />
                          </div>
                        </div>

                        {/* Shape & Border Color */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Formato (Shape)</label>
                            <select
                              value={t.tokenShape || 'circle'}
                              onChange={(e) => handleUpdateTokenProp(t, 'tokenShape', e.target.value)}
                              style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.7rem',
                                width: '100%', height: '24px'
                              }}
                            >
                              <option value="circle">Círculo</option>
                              <option value="square">Quadrado</option>
                              <option value="hexagon">Hexágono</option>
                              <option value="standee">Standee (Silhueta)</option>
                            </select>
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Cor da Borda</label>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="color"
                                value={t.borderColor || '#06b6d4'}
                                onChange={(e) => {
                                  Tokens.update(t.id, { borderColor: e.target.value });
                                }}
                                onBlur={(e) => handlePropChangeEnd(t, 'borderColor', e.target.value)}
                                style={{
                                  background: 'transparent', border: 'none', width: '22px', height: '20px',
                                  padding: 0, cursor: 'pointer', flexShrink: 0
                                }}
                              />
                              <input
                                type="text"
                                value={t.borderColor || '#06b6d4'}
                                onChange={(e) => {
                                  Tokens.update(t.id, { borderColor: e.target.value });
                                }}
                                onBlur={(e) => handlePropChangeEnd(t, 'borderColor', e.target.value)}
                                style={{
                                  background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                  borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.65rem',
                                  width: '100%', fontFamily: 'monospace'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Scale & HP Bar Mode */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Escala (Size)</label>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{t.sizeScale ? Number(t.sizeScale).toFixed(1) : '1.0'}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="3.0"
                              step="0.1"
                              value={t.sizeScale ?? 1.0}
                              onChange={(e) => {
                                Tokens.update(t.id, { sizeScale: parseFloat(e.target.value) || 1.0 });
                              }}
                              onMouseUp={(e: any) => handlePropChangeEnd(t, 'sizeScale', parseFloat(e.target.value) || 1.0)}
                              onTouchEnd={(e: any) => handlePropChangeEnd(t, 'sizeScale', parseFloat(e.target.value) || 1.0)}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '4px', cursor: 'pointer', marginTop: '6px' }}
                            />
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Barra de Vida</label>
                            <select
                              value={t.hpBarMode || 'always'}
                              onChange={(e) => handleUpdateTokenProp(t, 'hpBarMode', e.target.value)}
                              style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.7rem',
                                width: '100%', height: '24px'
                              }}
                            >
                              <option value="always">Sempre Visível</option>
                              <option value="hover">Ao Passar Mouse</option>
                              <option value="hidden">Ocultar</option>
                            </select>
                          </div>
                        </div>

                        {/* Name Tag Toggle & Close Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.showName === true}
                              onChange={(e) => handleUpdateTokenProp(t, 'showName', e.target.checked)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Tag Nome</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.inCombat !== false}
                              onChange={(e) => handleUpdateTokenProp(t, 'inCombat', e.target.checked)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Ativo Iniciativa</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.hasVision === true}
                              onChange={(e) => {
                                handleUpdateTokenProp(t, 'hasVision', e.target.checked);
                                if (e.target.checked && !t.visionRadius) handleUpdateTokenProp(t, 'visionRadius', 200);
                              }}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Visão (Névoa)</span>
                          </label>
                          {t.hasVision && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                              <span>Raio(px):</span>
                              <input
                                type="number"
                                value={t.visionRadius || 200}
                                onChange={(e) => handleUpdateTokenProp(t, 'visionRadius', parseInt(e.target.value) || 200)}
                                style={{
                                  width: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                  borderRadius: '4px', color: 'var(--text-primary)', padding: '1px 2px', fontSize: '0.65rem'
                                }}
                              />
                              <select
                                value={t.visionStyle || 'gradient'}
                                onChange={(e) => Tokens.update(t.id, { visionStyle: e.target.value })}
                                style={{
                                  background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                  borderRadius: '4px', color: 'var(--text-primary)', padding: '1px 2px', fontSize: '0.65rem',
                                  outline: 'none', cursor: 'pointer'
                                }}
                                title="Estilo da luz na Névoa"
                              >
                                <option value="solid">Luz Sólida</option>
                                <option value="gradient">Luz Suave</option>
                              </select>
                            </label>
                          )}
                        </div>

                        {/* Jogador Atribuído (Dono / Permissão) */}
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Jogador Atribuído (Dono)</label>
                          <select
                            value={t.ownerName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                Tokens.update(t.id, { ownerId: undefined, ownerName: undefined });
                              } else {
                                const playerEntry = Array.from(state.players.values() as Iterable<any>).find((p: any) => p.name === val);
                                Tokens.update(t.id, { 
                                  ownerName: val, 
                                  ownerId: playerEntry?.userId || undefined 
                                });
                              }
                            }}
                            style={{
                              background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                              borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.7rem',
                              height: '24px', outline: 'none'
                            }}
                          >
                            <option value="">Livre / Qualquer Jogador</option>
                            {Array.from(state.players.values() as Iterable<any>).map((p: any, pIdx: number) => (
                              <option key={p.userId || p.name || pIdx} value={p.name}>
                                👤 {p.name} {p.userId ? '(Autenticado)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Status/Conditions */}
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Condições</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {CONDITIONS.map(cond => {
                              const isActive = (t.status_efeitos || []).includes(cond.id);
                              return (
                                <Tooltip key={cond.id} label={cond.title}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); Tokens.toggleEffect(t.id, cond.id); }}
                                    style={{
                                      background: isActive ? cond.color : 'var(--bg-tertiary)',
                                      border: `1px solid ${isActive ? cond.color : 'var(--glass-border)'}`,
                                      borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem',
                                      color: isActive ? '#000' : 'var(--text-secondary)',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px'
                                    }}
                                  >
                                    {cond.label}
                                  </button>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* Close Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            onClick={() => setExpandedTokenId(null)}
                            style={{
                              background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
                              borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 8px', fontSize: '0.65rem',
                              cursor: 'pointer'
                            }}
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            /* GRID VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '6px' }}>
              {filteredTokens.map(t => {
                const isVisible = t.x > -1000 && t.y > -1000;
                const hasLinkedSheet = wikiIndex.some(e => {
                  if (t.wikiSlug && e.slug === t.wikiSlug) return true;
                  const nameRaw = (t.name || '').trim().toLowerCase();
                  return (e.metadata?.titulo || '').toLowerCase().trim() === nameRaw || e.slug.toLowerCase().trim() === nameRaw;
                });

                return (
                  <React.Fragment key={t.id}>
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      style={{
                        background: isVisible ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)', borderRadius: '6px',
                        padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px',
                        alignItems: 'center', position: 'relative', cursor: 'grab',
                        opacity: isVisible ? 1 : 0.6
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                      title="Arraste para o mapa!"
                    >
                      {/* Grid Avatar */}
                      <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden' }}>
                        {t.imageUrl ? (
                          <img loading="lazy" decoding="async" 
                            src={t.imageUrl} 
                            alt={t.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {t.isPlayer ? <User size={16} color="var(--success)" /> : <Cpu size={16} color="var(--text-secondary)" />}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-primary)', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.name}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        {t.hp}/{t.maxHp} HP
                      </span>

                      {/* Actions Layout on Grid Card (Absolute tiny hover menu) */}
                      <div style={{
                        display: 'flex', gap: '2px', background: 'var(--bg-secondary)',
                        padding: '2px 4px', borderRadius: '4px', position: 'absolute',
                        top: '2px', right: '2px', opacity: 0, transition: 'opacity 0.15s ease'
                      }}
                      className="grid-actions-overlay"
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                      onClick={e => e.stopPropagation()}
                      >
                        <Tooltip label={isVisible ? "Esconder" : "Mostrar"} position="top">
                          <button
                            onClick={(e) => handleToggleVisibility(t, e)}
                            style={{ background: 'transparent', border: 'none', color: isVisible ? 'var(--success)' : 'var(--text-secondary)', cursor: 'pointer', padding: '1px' }}
                          >
                            {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                          </button>
                        </Tooltip>
                        {isVisible && (
                          <Tooltip label="Focar" position="top">
                            <button
                              onClick={(e) => handleFocusToken(t.id, e)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--mana)', cursor: 'pointer', padding: '1px' }}
                            >
                              <Target size={10} />
                            </button>
                          </Tooltip>
                        )}
                        <Tooltip label="Clonar" position="top">
                          <button
                            onClick={(e) => handleCloneToken(t, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '1px' }}
                          >
                            <Copy size={10} />
                          </button>
                        </Tooltip>

                        {!hasLinkedSheet && (
                          <Tooltip label="Gerar Ficha" position="top">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleGenerateSheetForToken(t); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '1px' }}
                            >
                              <Sparkles size={10} />
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip label="Configurar Aparência" position="top">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedTokenId(expandedTokenId === t.id ? null : t.id); }}
                            style={{ background: 'transparent', border: 'none', color: expandedTokenId === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '1px' }}
                          >
                            <Settings size={10} />
                          </button>
                        </Tooltip>

                        <Tooltip label="Ficha" position="top">
                          <button
                            onClick={(e) => handleOpenSheet(t.id, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '1px' }}
                          >
                            <FileText size={10} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Excluir" position="top">
                          <button
                            onClick={(e) => handleDeleteToken(t.id, t.name, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '1px' }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {expandedTokenId === t.id && (
                      <div style={{
                        gridColumn: '1 / -1',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: 'var(--glass-shadow)',
                        fontSize: '0.75rem',
                        marginTop: '2px',
                        marginBottom: '6px'
                      }}>
                        {/* Title bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '4px' }}>
                          <Settings size={12} color="var(--accent-primary)" />
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>Configurações do Token</span>
                        </div>

                        {/* Name & Avatar */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleAvatarClick(t.id)}
                            style={{
                              width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden',
                              border: '1px dashed var(--glass-border)', cursor: 'pointer', position: 'relative',
                              flexShrink: 0, padding: 0, background: 'transparent'
                            }}
                            title="Alterar Imagem/Avatar"
                          >
                            {t.imageUrl ? (
                              <img loading="lazy" decoding="async" src={resolveImageUrl(t.imageUrl)} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} />
                              </div>
                            )}
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0, 
                              background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.5rem', 
                              textAlign: 'center', padding: '1px 0'
                            }}>
                              EDIT
                            </div>
                          </button>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Nome do Token</label>
                              <button
                                onClick={() => {
                                  useWindowManager.getState().setEditingTokenId(t.id);
                                  useWindowManager.getState().setActiveModal('tokenConfig');
                                }}
                                style={{
                                  background: 'var(--accent-glow)',
                                  border: '1px solid var(--accent-primary)',
                                  borderRadius: '4px',
                                  color: 'var(--accent-primary)',
                                  fontSize: '0.6rem',
                                  padding: '1px 5px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                                title="Abrir painel completo de configuração do token"
                              >
                                ⚙️ Painel Completo
                              </button>
                            </div>
                            <input
                              type="text"
                              value={t.name || ''}
                              onChange={(e) => {
                                Tokens.update(t.id, { name: e.target.value });
                              }}
                              onBlur={(e) => handlePropChangeEnd(t, 'name', e.target.value)}
                              style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                borderRadius: '4px', color: 'var(--text-primary)', padding: '3px 6px', fontSize: '0.75rem',
                                width: '100%'
                              }}
                            />
                          </div>
                        </div>

                        {/* Shape & Border Color */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Formato (Shape)</label>
                            <select
                              value={t.tokenShape || 'circle'}
                              onChange={(e) => handleUpdateTokenProp(t, 'tokenShape', e.target.value)}
                              style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.7rem',
                                width: '100%', height: '24px'
                              }}
                            >
                              <option value="circle">Círculo</option>
                              <option value="square">Quadrado</option>
                              <option value="hexagon">Hexágono</option>
                              <option value="figure">Boneco (Transparente)</option>
                              <option value="standee">Standee (Silhueta)</option>
                            </select>
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Cor da Borda</label>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="color"
                                value={t.borderColor || '#06b6d4'}
                                onChange={(e) => {
                                  Tokens.update(t.id, { borderColor: e.target.value });
                                }}
                                onBlur={(e) => handlePropChangeEnd(t, 'borderColor', e.target.value)}
                                style={{
                                  background: 'transparent', border: 'none', width: '22px', height: '20px',
                                  padding: 0, cursor: 'pointer', flexShrink: 0
                                }}
                              />
                              <input
                                type="text"
                                value={t.borderColor || '#06b6d4'}
                                onChange={(e) => {
                                  Tokens.update(t.id, { borderColor: e.target.value });
                                }}
                                onBlur={(e) => handlePropChangeEnd(t, 'borderColor', e.target.value)}
                                style={{
                                  background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                  borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.65rem',
                                  width: '100%', fontFamily: 'monospace'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Scale & HP Bar Mode */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Escala (Size)</label>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{t.sizeScale ? Number(t.sizeScale).toFixed(1) : '1.0'}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="3.0"
                              step="0.1"
                              value={t.sizeScale ?? 1.0}
                              onChange={(e) => {
                                Tokens.update(t.id, { sizeScale: parseFloat(e.target.value) || 1.0 });
                              }}
                              onMouseUp={(e: any) => handlePropChangeEnd(t, 'sizeScale', parseFloat(e.target.value) || 1.0)}
                              onTouchEnd={(e: any) => handlePropChangeEnd(t, 'sizeScale', parseFloat(e.target.value) || 1.0)}
                              style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '4px', cursor: 'pointer', marginTop: '6px' }}
                            />
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Barra de Vida</label>
                            <select
                              value={t.hpBarMode || 'always'}
                              onChange={(e) => handleUpdateTokenProp(t, 'hpBarMode', e.target.value)}
                              style={{
                                background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.7rem',
                                width: '100%', height: '24px'
                              }}
                            >
                              <option value="always">Sempre Visível</option>
                              <option value="hover">Ao Passar Mouse</option>
                              <option value="hidden">Ocultar</option>
                            </select>
                          </div>
                        </div>

                        {/* Name Tag Toggle & Close Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.showName === true}
                              onChange={(e) => handleUpdateTokenProp(t, 'showName', e.target.checked)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Tag Nome</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.inCombat !== false}
                              onChange={(e) => handleUpdateTokenProp(t, 'inCombat', e.target.checked)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Ativo Iniciativa</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.hasVision === true}
                              onChange={(e) => {
                                handleUpdateTokenProp(t, 'hasVision', e.target.checked);
                                if (e.target.checked && !t.visionRadius) handleUpdateTokenProp(t, 'visionRadius', 200);
                              }}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Visão (Névoa)</span>
                          </label>
                          {t.hasVision && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                              <span>Raio(px):</span>
                              <input
                                type="number"
                                value={t.visionRadius || 200}
                                onChange={(e) => handleUpdateTokenProp(t, 'visionRadius', parseInt(e.target.value) || 200)}
                                style={{
                                  width: '46px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                                  borderRadius: '4px', color: 'var(--text-primary)', padding: '1px 2px', fontSize: '0.65rem'
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Jogador Atribuído (Dono / Permissão) */}
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Jogador Atribuído (Dono)</label>
                          <select
                            value={t.ownerName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                Tokens.update(t.id, { ownerId: undefined, ownerName: undefined });
                              } else {
                                const playerEntry = Array.from(state.players.values() as Iterable<any>).find((p: any) => p.name === val);
                                Tokens.update(t.id, { 
                                  ownerName: val, 
                                  ownerId: playerEntry?.userId || undefined 
                                });
                              }
                            }}
                            style={{
                              background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                              borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '0.7rem',
                              height: '24px', outline: 'none'
                            }}
                          >
                            <option value="">Livre / Qualquer Jogador</option>
                            {Array.from(state.players.values() as Iterable<any>).map((p: any, pIdx: number) => (
                              <option key={p.userId || p.name || pIdx} value={p.name}>
                                👤 {p.name} {p.userId ? '(Autenticado)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Status/Conditions */}
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Condições</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {CONDITIONS.map(cond => {
                              const isActive = (t.status_efeitos || []).includes(cond.id);
                              return (
                                <button
                                  key={cond.id}
                                  title={cond.title}
                                  onClick={(e) => { e.stopPropagation(); Tokens.toggleEffect(t.id, cond.id); }}
                                  style={{
                                    background: isActive ? cond.color : 'var(--bg-tertiary)',
                                    border: `1px solid ${isActive ? cond.color : 'var(--glass-border)'}`,
                                    borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem',
                                    color: isActive ? '#000' : 'var(--text-secondary)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px'
                                  }}
                                >
                                  {cond.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Close Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            onClick={() => setExpandedTokenId(null)}
                            style={{
                              background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
                              borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 8px', fontSize: '0.65rem',
                              cursor: 'pointer'
                            }}
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )
        )}

        {/* TAB 2: OBSIDIAN WIKI LIBRARY */}
        {activePanelTab === 'library' && (
          isWikiLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textAlign: 'center', marginTop: '2rem' }}>
              Carregando cofre Obsidian...
            </p>
          ) : wikiEntities.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
              Nenhuma ficha encontrada no cofre.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {wikiEntities.map(entity => {
                const title = entity.metadata?.titulo || entity.metadata?.nome || entity.slug;
                const pathStr = entity.path;
                const folder = pathStr.substring(0, pathStr.lastIndexOf('/'));
                const avatarUrl = entity.metadata?.imageUrl || entity.metadata?.avatar || entity.metadata?.imagem;

                return (
                  <div
                    key={entity.path}
                    draggable
                    onDragStart={(e) => handleDragStartWiki(e, entity.path)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px', background: 'var(--bg-secondary)',
                      borderRadius: '6px', border: '1px solid var(--glass-border)',
                      cursor: 'grab', transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                    title="Arraste para o mapa para materializar ou dê duplo clique para abrir a ficha!"
                    onDoubleClick={(e) => handleOpenWikiSheet(entity.path, e)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <GripVertical size={12} color="var(--text-secondary)" style={{ cursor: 'grab', flexShrink: 0 }} />
                      
                      {/* Avatar Thumbnail */}
                      {avatarUrl ? (
                        <img loading="lazy" decoding="async" 
                          src={avatarUrl} 
                          alt={title} 
                          style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--glass-border)', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
                          <BookOpen size={12} color="var(--accent-primary)" />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {title}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {folder}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
                      <button
                        onClick={() => handleSpawnFromWiki(entity.path)}
                        style={{
                          padding: '3px 8px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px',
                          color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 'bold'
                        }}
                        title="Instanciar no centro do Tabuleiro"
                      >
                        EVOCAR
                      </button>
                      <button
                        onClick={(e) => handleOpenWikiSheet(entity.path, e)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '2px' }}
                        title="Consultar Ficha (.md)"
                      >
                        <FileText size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
        onChange={handleImageUpload}
      />

      {/* Grid Hover Overlay Injecting Style */}
      <style>{`
        div:hover > .grid-actions-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};
