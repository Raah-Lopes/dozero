// src/components/Widgets/GameMaster/AIStudioWidget.tsx
// Estúdio IA do Mestre — widget exclusivo do GM para geração de conteúdo RPG via IA.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { generateAI, AI_MODELS, type AIProviderType, type AIModel } from '../../../services/ai/AIProvider';
import { buildSystemPrompt, buildUserPrompt, type RPGContentType } from '../../../services/ai/prompts/rpgPrompts';
import { saveMarkdownContent } from '../../../utils/githubApi';
import { useWiki } from '../../../hooks/useWiki';
import { state } from '../../../store';
import {
  Bot, Wand2, User, Skull, Map, Sword, BookOpen, Dices, Search,
  MessageSquare, Settings, Copy, Download, Save, Loader2, ChevronDown,
  Key, Zap, Wifi, WifiOff, RefreshCw, Trash2, Send, X, Plus, Quote, ToyBrick
} from 'lucide-react';

interface AIStudioWidgetProps {
  onClose: () => void;
}

// ── Tipos e constantes ───────────────────────────────────────────────────────

const CONTENT_TABS: { id: RPGContentType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'pc',            label: 'PC',         icon: <User size={14} />,         color: '#6ee7b7' },
  { id: 'npc',           label: 'NPC',        icon: <Bot size={14} />,          color: '#93c5fd' },
  { id: 'monstro',       label: 'Monstro',    icon: <Skull size={14} />,        color: '#fca5a5' },
  { id: 'local',         label: 'Local',      icon: <Map size={14} />,          color: '#fcd34d' },
  { id: 'item_magico',   label: 'Item',       icon: <Sword size={14} />,        color: '#d8b4fe' },
  { id: 'resumo_sessao', label: 'Sessão',     icon: <BookOpen size={14} />,     color: '#fb923c' },
  { id: 'quest',         label: 'Quest',      icon: <Dices size={14} />,        color: '#34d399' },
  { id: 'encontro',      label: 'Encontro',   icon: <Zap size={14} />,          color: '#f87171' },
  { id: 'dlc_expand',    label: 'Auditar',    icon: <Search size={14} />,       color: '#a78bfa' },
  { id: 'dlc_factory',   label: 'Fábrica',    icon: <ToyBrick size={14} />,     color: '#f43f5e' },
  { id: 'chat',          label: 'Chat',       icon: <MessageSquare size={14} />, color: '#60a5fa' },
];

const PROVIDER_LABELS: Record<AIProviderType, string> = {
  groq: 'Groq',
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
  pollinations: 'Pollinations (sem chave)',
  ollama: 'Ollama (local)',
};

const WIKI_SAVE_PATHS: Record<RPGContentType, string> = {
  pc:            '[1] 🏕️ Campanha Principal/Fichas/Jogadores',
  npc:           '[1] 🏕️ Campanha Principal/Fichas/NPCs',
  monstro:       '[1] 🏕️ Campanha Principal/Fichas/Inimigos',
  local:         '[1] 🏕️ Campanha Principal/Localizações',
  item_magico:   '[1] 🏕️ Campanha Principal/Items',
  resumo_sessao: '[1] 🏕️ Campanha Principal/Sessões',
  sessao_zero:   '[1] 🏕️ Campanha Principal',
  quest:         '[1] 🏕️ Campanha Principal/Quests',
  encontro:      '[1] 🏕️ Campanha Principal/Encontros',
  dlc_expand:    'DLCs',
  dlc_factory:   'DLCs',
  chat:          '',
};

const TYPE_LABELS: Record<string, Record<RPGContentType, string>> = {
  pc: {
    pc: 'Humano Guerreiro', npc: '', monstro: '', local: '', item_magico: '', resumo_sessao: '', sessao_zero: '', quest: '', encontro: '', dlc_expand: '', dlc_factory: '', chat: ''
  }
};

const TIPO_OPTIONS: Record<RPGContentType, string[]> = {
  pc: ['Humano Guerreiro', 'Elfo Arqueiro', 'Anão Paladino', 'Meio-Elfo Bardo', 'Gnomo Mago', 'Halfling Ladino', 'Fada Druida', 'Tiefling Feiticeiro', 'Sintético Monge', 'Vampiro Necromante'],
  npc: ['Comerciante Neutro', 'Guarda da Cidade', 'Sábio Eremita', 'Vilão Político', 'Aliado Leal', 'Informante Duvidoso', 'Nobre Corrupto', 'Curandeiro Místico'],
  monstro: ['Besta Selvagem (Nv1)', 'Goblin/Kobold (Nv1)', 'Orc Guerreiro (Nv2)', 'Troll das Pedras (Nv3)', 'Dragão Jovem (Nv4)', 'Lich Ancião (Nv5)', 'Aberração (Nv3)', 'Demônio Menor (Nv4)'],
  local: ['Taverna', 'Masmorra', 'Floresta Sombria', 'Cidade Costeira', 'Ruína Antiga', 'Torre do Mago', 'Vila Pacata', 'Caverna', 'Palácio', 'Porto Movimentado'],
  item_magico: ['Espada', 'Armadura', 'Anel', 'Colar', 'Bastão Mágico', 'Poção', 'Pergaminho', 'Botas', 'Manto', 'Artefato Ancião'],
  resumo_sessao: ['Resumo Completo', 'Highlights Rápidos'],
  sessao_zero: ['Fantasia Medieval', 'Horror Gótico', 'Steampunk', 'Pós-Apocalíptico', 'Ficção Científica'],
  quest: ['Exploração', 'Resgate', 'Assassinato/Caça', 'Investigação', 'Proteção/Escolta', 'Roubo/Infiltração', 'Diplomacia'],
  encontro: ['Bandidos na Estrada', 'Monstros na Masmorra', 'Emboscada Urbana', 'Defesa de Ponto', 'Caçada'],
  dlc_expand: ['Expandir', 'Auditar Balanceamento', 'Corrigir Inconsistências'],
  dlc_factory: ['Fantasia Medieval', 'Horror Gótico', 'Steampunk', 'Pós-Apocalíptico', 'Ficção Científica', 'Cangaço Místico'],
  chat: ['Pergunta sobre Regras', 'Ideia de Campanha', 'Improvisar NPC', 'Sugestão de Plot'],
};

// ── Storage Helper ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'dozero_ai_studio';
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveConfig(data: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadConfig(), ...data }));
}

// ── Componente principal ─────────────────────────────────────────────────────
export const AIStudioWidget: React.FC<AIStudioWidgetProps> = ({ onClose }) => {
  const { index, repoPath } = useWiki();
  const savedConfig = loadConfig();

  // Config de IA
  const [provider, setProvider]     = useState<AIProviderType>((savedConfig.provider as AIProviderType) || 'groq');
  const [modelId, setModelId]        = useState(savedConfig.modelId || 'llama-3.3-70b-versatile');
  const [apiKey, setApiKey]          = useState(savedConfig.apiKey || '');
  const [ollamaUrl, setOllamaUrl]    = useState(savedConfig.ollamaUrl || 'http://localhost:11434');
  const [showConfig, setShowConfig]  = useState(false);
  const [temperature, setTemperature] = useState(parseFloat(savedConfig.temperature || '0.8'));

  // Formulário
  const [activeTab, setActiveTab]    = useState<RPGContentType>('pc');
  const [nome, setNome]              = useState('');
  const [nivel, setNivel]            = useState(1);
  const [tipoEsp, setTipoEsp]        = useState(TIPO_OPTIONS['pc'][0]);
  const [conceito, setConceito]      = useState('');
  const [textoExtra, setTextoExtra]  = useState('');
  const [categoriasDlc, setCategoriasDlc] = useState<string[]>(['npc', 'loot', 'local']);
  const [dlcMode, setDlcMode]        = useState<'basico' | 'expandido' | 'modular'>('modular');
  const [useWikiCtx, setUseWikiCtx]  = useState(true);
  const [activeDLCs, setActiveDLCs]  = useState<string[]>([]);

  useEffect(() => {
    const observer = () => {
      const activeKeys = Array.from(state.dlcs.keys()).filter(k => state.dlcs.get(k) === true);
      setActiveDLCs(activeKeys);
    };
    state.dlcs.observe(observer);
    observer();
    return () => state.dlcs.unobserve(observer);
  }, []);

  // Output
  const [output, setOutput]          = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError]            = useState('');
  const [copyDone, setCopyDone]      = useState(false);

  // Salvar na wiki
  const [savePath, setSavePath]      = useState('');
  const [saveStatus, setSaveStatus]  = useState('');
  const [showSavePanel, setShowSavePanel] = useState(false);

  // Chat
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatInput, setChatInput]    = useState('');
  const chatEndRef                    = useRef<HTMLDivElement>(null);

  // Modelos filtrados pelo provedor selecionado
  const filteredModels = AI_MODELS.filter(m => m.provider === provider);

  // Quando troca de tab, ajusta tipo específico padrão
  useEffect(() => {
    setTipoEsp(TIPO_OPTIONS[activeTab][0] || '');
    setSavePath(WIKI_SAVE_PATHS[activeTab] || '');
  }, [activeTab]);

  // Quando troca provedor, seleciona o primeiro modelo
  useEffect(() => {
    const first = filteredModels[0];
    if (first) setModelId(first.id);
  }, [provider]);

  // Persiste config
  useEffect(() => {
    saveConfig({ provider, modelId, apiKey, ollamaUrl, temperature: String(temperature) });
  }, [provider, modelId, apiKey, ollamaUrl, temperature]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Contexto wiki resumido
  const buildWikiContext = useCallback(() => {
    if (!useWikiCtx || !index || index.length === 0) return '';

    // Filtra DLCs inativas
    const inactiveDlcFolders = new Set<string>();
    const allManifests = index.filter(e => e.metadata?.type === 'dlc_manifest');
    for (const manifest of allManifests) {
      const dlcId = manifest.metadata?.id || manifest.slug;
      if (!activeDLCs.includes(dlcId)) {
        // Ajuste para paths de Windows e Unix
        const folder = manifest.path.substring(0, Math.max(manifest.path.lastIndexOf('/'), manifest.path.lastIndexOf('\\')));
        inactiveDlcFolders.add(folder);
      }
    }

    const filteredIndex = index.filter(e => {
      for (const inactiveFolder of inactiveDlcFolders) {
        if (e.path.startsWith(inactiveFolder)) return false;
      }
      return true;
    });

    const pcs = filteredIndex.filter(e => ['PC', 'Personagem', 'jogador'].includes(String(e.metadata?.tipo || '')));
    const npcs = filteredIndex.filter(e => ['NPC', 'Monstro'].includes(String(e.metadata?.tipo || ''))).slice(0, 10);
    const locs = filteredIndex.filter(e => String(e.metadata?.tipo || '').toLowerCase().includes('local')).slice(0, 5);
    let ctx = '### Personagens conhecidos:\n';
    ctx += pcs.map(e => `- ${e.metadata?.nome || e.slug} (Nv${e.metadata?.nivel || 1})`).join('\n') || '(nenhum)';
    ctx += '\n### NPCs/Inimigos:\n';
    ctx += npcs.map(e => `- ${e.metadata?.nome || e.slug}`).join('\n') || '(nenhum)';
    ctx += '\n### Locais:\n';
    ctx += locs.map(e => `- ${e.metadata?.nome || e.slug}`).join('\n') || '(nenhum)';
    return ctx;
  }, [index, useWikiCtx, activeDLCs]);

  // ── Geração principal ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError('');
    setOutput('');
    setSaveStatus('');

    try {
      const selectedModel = filteredModels.find(m => m.id === modelId);
      if (selectedModel?.requiresKey && !apiKey && provider !== 'pollinations' && provider !== 'ollama') {
        throw new Error(`O modelo ${selectedModel.label} requer uma API Key. Configure em ⚙️ Configurações.`);
      }

      const system = buildSystemPrompt(activeTab, activeDLCs);
      const user = buildUserPrompt({
        type: activeTab,
        nome: nome || undefined,
        nivel,
        tipoEspecifico: tipoEsp,
        conceito: activeTab === 'chat' ? undefined : (conceito || undefined),
        contextoWiki: buildWikiContext() || undefined,
        textoExtra: textoExtra || undefined,
        grupoNivel: nivel,
        categorias_dlc: categoriasDlc,
        dlcMode: activeTab === 'dlc_factory' ? dlcMode : undefined,
      });

      const result = await generateAI({
        provider,
        model: modelId,
        apiKey: apiKey || undefined,
        systemPrompt: system,
        userPrompt: user,
        temperature,
        maxTokens: 6000,
        ollamaUrl: provider === 'ollama' ? ollamaUrl : undefined,
      });

      setOutput(result.text);
      setShowSavePanel(activeTab !== 'chat');
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao chamar a IA.');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, provider, modelId, apiKey, ollamaUrl, activeTab, nome, nivel, tipoEsp, conceito, textoExtra, temperature, buildWikiContext, filteredModels]);

  // ── Chat ────────────────────────────────────────────────────────────────────
  const handleChat = useCallback(async () => {
    if (!chatInput.trim() || isGenerating) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsGenerating(true);

    try {
      const result = await generateAI({
        provider,
        model: modelId,
        apiKey: apiKey || undefined,
        systemPrompt: buildSystemPrompt('chat', activeDLCs) + '\n\nContexto da campanha:\n' + (buildWikiContext() || 'Sem contexto disponível.'),
        userPrompt: userMsg,
        temperature,
        ollamaUrl: provider === 'ollama' ? ollamaUrl : undefined,
      });
      setChatHistory(prev => [...prev, { role: 'ai', text: result.text }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'ai', text: `❌ Erro: ${err.message}` }]);
    } finally {
      setIsGenerating(false);
    }
  }, [chatInput, isGenerating, provider, modelId, apiKey, ollamaUrl, temperature, buildWikiContext]);

  // ── Salvar na wiki ───────────────────────────────────────────────────────────
  const handleSaveToWiki = useCallback(async () => {
    if (!output || !savePath) return;
    setSaveStatus('Salvando...');
    try {
      if (activeTab === 'dlc_factory') {
        // Separa os blocos da DLC
        const blocks = output.split('---DLC_ASSET_SEPARATOR---').map(b => b.trim()).filter(b => b.length > 0);
        let savedCount = 0;
        
        // Pasta base para essa DLC será nome (se tiver) ou Tema/Conceito
        const folderName = (nome || conceito || 'Nova_DLC').replace(/[^a-zA-Z0-9À-ú ]/g, '').trim();
        const basePath = `${repoPath}/${savePath}/${folderName}`;
        
        for (const block of blocks) {
          const lines = block.split('\n');
          let fileName = lines[0].trim();
          if (!fileName.endsWith('.md')) fileName += '.md';
          const fileContent = lines.slice(1).join('\n').trim();
          
          await saveMarkdownContent(`${basePath}/${fileName}`, fileContent);
          savedCount++;
        }
        
        setSaveStatus(`✅ ${savedCount} arquivos salvos em: ${savePath}/${folderName}/`);
        setShowSavePanel(false);
      } else {
        const fileName = nome ? nome.replace(/[^a-zA-Z0-9À-ú ]/g, '').trim() : `${activeTab}_${Date.now()}`;
        const fullPath = `${repoPath}/${savePath}/${fileName}.md`;
        await saveMarkdownContent(fullPath, output);
        setSaveStatus(`✅ Salvo em: ${savePath}/${fileName}.md`);
        setShowSavePanel(false);
      }
    } catch (err: any) {
      setSaveStatus(`❌ Erro ao salvar: ${err.message}`);
    }
  }, [output, savePath, nome, conceito, activeTab, repoPath]);

  // ── Copy ────────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome || activeTab}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const currentTab = CONTENT_TABS.find(t => t.id === activeTab)!;
  const currentColor = currentTab?.color || '#a78bfa';
  const isChat = activeTab === 'chat';
  const needsTextArea = ['resumo_sessao', 'dlc_expand'].includes(activeTab);
  const selectedModel = filteredModels.find(m => m.id === modelId);

  return (
    <DraggableWindow
      id="aiStudio"
      title="🤖 Estúdio IA do Mestre"
      initialX={Math.max(20, window.innerWidth / 2 - 560)}
      initialY={60}
      width={1100}
      height={720}
      onClose={onClose}
      variant="glass"
    >
      <style>{`
        .ai-tab { padding: 5px 10px; border-radius: 6px 6px 0 0; font-size: 0.65rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; border: none; transition: all 0.2s; white-space: nowrap; }
        .ai-tab.active { background: rgba(255,255,255,0.08); }
        .ai-provider-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.6rem; font-weight: 700; cursor: pointer; border: 1px solid; transition: all 0.15s; }
        .ai-output { font-family: 'Fira Code', monospace; font-size: 0.72rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .ai-chat-bubble-user { background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); border-radius: 12px 12px 4px 12px; padding: 8px 12px; margin-left: 20%; }
        .ai-chat-bubble-ai { background: rgba(30,30,50,0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px 12px 12px 4px; padding: 8px 12px; margin-right: 20%; white-space: pre-wrap; font-size: 0.75rem; line-height: 1.6; }
        .ai-field-label { font-size: 0.6rem; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
        .ai-input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 7px 10px; font-size: 0.78rem; color: #e2e8f0; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .ai-input:focus { border-color: ${currentColor}66; }
        .ai-btn { display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'rgba(5,5,15,0.95)' }}>

        {/* ── HEADER BARRA ─────────────────────────────────────────────── */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Provedor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {(['groq', 'gemini', 'openrouter', 'pollinations', 'ollama'] as AIProviderType[]).map(p => (
              <button
                key={p}
                className="ai-provider-pill"
                onClick={() => setProvider(p)}
                style={{
                  background: provider === p ? `${p === 'groq' ? '#f97316' : p === 'gemini' ? '#4285f4' : p === 'openrouter' ? '#a855f7' : p === 'pollinations' ? '#22c55e' : '#64748b'}22` : 'transparent',
                  borderColor: provider === p ? (p === 'groq' ? '#f97316' : p === 'gemini' ? '#4285f4' : p === 'openrouter' ? '#a855f7' : p === 'pollinations' ? '#22c55e' : '#64748b') : 'rgba(255,255,255,0.12)',
                  color: provider === p ? 'white' : '#64748b',
                }}
              >
                {p === 'pollinations' ? '🔓 Pollinations' : p === 'ollama' ? '💻 Ollama' : PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Modelo */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <select
              value={modelId}
              onChange={e => setModelId(e.target.value)}
              className="ai-input"
              style={{ paddingRight: '24px', cursor: 'pointer', appearance: 'none' }}
            >
              {filteredModels.map(m => (
                <option key={m.id} value={m.id}>{m.label}{m.free ? ' ✓' : ''}</option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Status do modelo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: selectedModel?.requiresKey && !apiKey ? '#f87171' : '#34d399' }}>
            {selectedModel?.requiresKey && !apiKey ? <><WifiOff size={12} /> Sem chave</> : <><Wifi size={12} /> Pronto</>}
          </div>

          {/* Config button */}
          <button
            className="ai-btn"
            onClick={() => setShowConfig(!showConfig)}
            style={{ background: showConfig ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          >
            <Settings size={13} />
          </button>
        </div>

        {/* ── PAINEL DE CONFIG ─────────────────────────────────────────── */}
        {showConfig && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', display: 'flex', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label className="ai-field-label"><Key size={9} style={{ display: 'inline', marginRight: '2px' }} /> API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={provider === 'pollinations' || provider === 'ollama' ? 'Não necessária' : 'Cole sua API Key aqui...'}
                disabled={provider === 'pollinations' || provider === 'ollama'}
                className="ai-input"
              />
            </div>
            {provider === 'ollama' && (
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label className="ai-field-label">URL do Ollama</label>
                <input type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className="ai-input" />
              </div>
            )}
            <div style={{ minWidth: '150px' }}>
              <label className="ai-field-label">Temperatura: {temperature.toFixed(1)}</label>
              <input
                type="range" min="0" max="2" step="0.1" value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: currentColor }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#475569' }}>
                <span>Preciso</span><span>Balanceado</span><span>Criativo</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer' }}>
                <input type="checkbox" checked={useWikiCtx} onChange={e => setUseWikiCtx(e.target.checked)} style={{ accentColor: currentColor }} />
                Usar contexto da wiki
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '0.55rem', color: '#475569', lineHeight: 1.5 }}>
                <div>🟢 Groq: <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: '#f97316' }}>console.groq.com</a></div>
                <div>🔵 Gemini: <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#4285f4' }}>aistudio.google.com</a></div>
                <div>🟣 OpenRouter: <a href="https://openrouter.ai" target="_blank" rel="noreferrer" style={{ color: '#a855f7' }}>openrouter.ai</a></div>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '2px', padding: '6px 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, overflowX: 'auto' }}>
          {CONTENT_TABS.map(tab => (
            <button
              key={tab.id}
              className={`ai-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setOutput(''); setError(''); }}
              style={{
                color: activeTab === tab.id ? tab.color : '#475569',
                borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                background: activeTab === tab.id ? `${tab.color}10` : 'transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── CORPO PRINCIPAL ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Formulário */}
          {!isChat && (
            <div style={{ width: '300px', flexShrink: 0, padding: '14px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: currentColor, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                {currentTab.icon} {currentTab.label.toUpperCase()}
              </div>

              {/* Tipo específico */}
              <div>
                <label className="ai-field-label">Tipo / Arquétipo</label>
                <input 
                  list="tipo-options"
                  value={tipoEsp} 
                  onChange={e => setTipoEsp(e.target.value)} 
                  className="ai-input" 
                  placeholder="Ex: Meio-Orc Bárbaro"
                />
                <datalist id="tipo-options">
                  {TIPO_OPTIONS[activeTab]?.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>

              {/* Nome */}
              <div>
                <label className="ai-field-label">Nome {activeTab === 'pc' || activeTab === 'npc' || activeTab === 'monstro' ? '(deixe vazio para aleatório)' : ''}</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder={activeTab === 'pc' ? 'Ex: Kaelan, filho do vento...' : activeTab === 'local' ? 'Ex: Ruínas de Kharanos...' : 'Nome...'}
                  className="ai-input"
                />
              </div>

              {/* Nível */}
              {!['resumo_sessao', 'dlc_expand', 'dlc_factory', 'chat'].includes(activeTab) && (
                <div>
                  <label className="ai-field-label">
                    {activeTab === 'encontro' ? 'Nível Médio do Grupo' : activeTab === 'monstro' ? 'Nível de Ameaça (1-5)' : 'Nível / Desafio'}
                  </label>
                  <input
                    type="number"
                    value={nivel}
                    onChange={e => setNivel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    min="1" max="20"
                    className="ai-input"
                  />
                </div>
              )}

              {/* Modos DLC Factory */}
              {activeTab === 'dlc_factory' && (
                <div>
                  <label className="ai-field-label">Modo de Escala</label>
                  <select
                    value={dlcMode}
                    onChange={e => setDlcMode(e.target.value as any)}
                    className="ai-input"
                  >
                    <option value="basico">Básico (Rápido, Nomes e Status Simples)</option>
                    <option value="modular">Modular (Padrão, Elementos Completos Individuais)</option>
                    <option value="expandido">Expandido (Lore Profunda, Tramas Interligadas, Mais Demorado)</option>
                  </select>
                </div>
              )}

              {/* Categorias DLC Factory */}
              {activeTab === 'dlc_factory' && (
                <div>
                  <label className="ai-field-label" style={{ marginBottom: '8px', display: 'block' }}>O que você quer gerar nesta DLC?</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['npc', 'loot', 'local', 'quest', 'item_magico'].map(cat => (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#f1f5f9', cursor: 'pointer', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${categoriasDlc.includes(cat) ? currentColor : 'rgba(255,255,255,0.1)'}` }}>
                        <input
                          type="checkbox"
                          checked={categoriasDlc.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) setCategoriasDlc([...categoriasDlc, cat]);
                            else setCategoriasDlc(categoriasDlc.filter(c => c !== cat));
                          }}
                          style={{ margin: 0, accentColor: currentColor }}
                        />
                        {cat.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Conceito */}
              {!needsTextArea && (
                <div style={{ flex: 1 }}>
                  <label className="ai-field-label">
                    {activeTab === 'dlc_factory' ? 'Tema / Cenário da Expansão' : 'Conceito e Ideias'}
                  </label>
                  <textarea
                    value={conceito}
                    onChange={e => setConceito(e.target.value)}
                    placeholder={
                      activeTab === 'pc' ? 'Ex: Ex-guarda corrupto que encontrou redenção...' :
                      activeTab === 'npc' ? 'Ex: Taberneiro que esconde um passado como assassino...' :
                      activeTab === 'quest' ? 'Ex: O objeto roubado é mais perigoso do que parece...' :
                      activeTab === 'dlc_factory' ? 'Ex: Cangaço Medieval Místico com criaturas do deserto e magia antiga...' :
                      'Descreva o que você quer...'
                    }
                    className="ai-input"
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}

              {/* Textarea para sessão/DLC */}
              {needsTextArea && (
                <div style={{ flex: 1 }}>
                  <label className="ai-field-label">
                    {activeTab === 'resumo_sessao' ? 'Notas Brutas da Sessão' : 'Conteúdo da DLC para Auditar'}
                  </label>
                  <textarea
                    value={textoExtra}
                    onChange={e => setTextoExtra(e.target.value)}
                    placeholder={
                      activeTab === 'resumo_sessao'
                        ? 'Cole aqui o que aconteceu na sessão, pode ser em tópicos, frases soltas, o que você lembrar...'
                        : 'Cole aqui o texto da DLC que quer expandir ou auditar...'
                    }
                    className="ai-input"
                    rows={10}
                    style={{ resize: 'vertical', flex: 1 }}
                  />
                </div>
              )}

              {/* Contexto wiki */}
              {useWikiCtx && index.length > 0 && (
                <div style={{ fontSize: '0.58rem', color: '#475569', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  📚 Contexto wiki: {index.length} entradas indexadas
                </div>
              )}

              {/* Botão gerar */}
              <button
                className="ai-btn"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{
                  background: isGenerating ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${currentColor}33, ${currentColor}22)`,
                  border: `1px solid ${currentColor}66`,
                  color: isGenerating ? '#475569' : currentColor,
                  justifyContent: 'center',
                  padding: '10px',
                  fontSize: '0.8rem',
                }}
              >
                {isGenerating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</> : <><Wand2 size={14} /> Forjar com IA</>}
              </button>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.68rem', color: '#f87171', lineHeight: 1.5 }}>
                  ❌ {error}
                </div>
              )}
            </div>
          )}

          {/* Output / Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Chat */}
            {isChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Histórico */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatHistory.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#334155' }}>
                      <Bot size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Mestre-IA em espera</div>
                      <div style={{ fontSize: '0.7rem' }}>Pergunte sobre regras, peça ideias de plot, improvise um NPC ou converse sobre a campanha. A IA conhece o contexto da sua wiki.</div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={msg.role === 'user' ? 'ai-chat-bubble-user' : 'ai-chat-bubble-ai'} style={{ position: 'relative' }}>
                      <div style={{ fontSize: '0.55rem', color: '#475569', marginBottom: '4px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{msg.role === 'user' ? '👤 Você' : '🤖 Mestre-IA'}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => setChatInput((prev) => prev + (prev ? '\n\n' : '') + `> ${msg.text.split('\n').join('\n> ')}\n\n`)} 
                            title="Citar e Responder"
                            style={{ color: '#64748b', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = currentColor}
                            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                          >
                            <Quote size={11} />
                          </button>
                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.text)} 
                            title="Copiar texto"
                            style={{ color: '#64748b', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = currentColor}
                            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="ai-chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: currentColor }} />
                      <span style={{ fontSize: '0.7rem', color: '#475569' }}>Pensando...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input chat */}
                <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                    placeholder="Pergunte algo ao Mestre-IA... (Enter para enviar, Shift+Enter para nova linha)"
                    className="ai-input"
                    rows={2}
                    style={{ flex: 1, resize: 'none' }}
                  />
                  <button
                    className="ai-btn"
                    onClick={handleChat}
                    disabled={isGenerating || !chatInput.trim()}
                    style={{ background: `${currentColor}22`, border: `1px solid ${currentColor}66`, color: currentColor, height: '54px', flexShrink: 0 }}
                  >
                    <Send size={16} />
                  </button>
                  <button
                    className="ai-btn"
                    onClick={() => setChatHistory([])}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', height: '54px', flexShrink: 0 }}
                    title="Limpar conversa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* Output de geração */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Toolbar output */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, flex: 1 }}>
                    📄 Markdown Gerado
                  </span>
                  {output && (
                    <>
                      <button className="ai-btn" onClick={handleCopy} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: copyDone ? '#34d399' : '#94a3b8' }}>
                        <Copy size={12} /> {copyDone ? 'Copiado!' : 'Copiar'}
                      </button>
                      <button className="ai-btn" onClick={handleDownload} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                        <Download size={12} /> .md
                      </button>
                      <button className="ai-btn" onClick={handleGenerate} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }} title="Regenerar">
                        <RefreshCw size={12} />
                      </button>
                    </>
                  )}
                </div>

                {/* Output text */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px', position: 'relative' }}>
                  {isGenerating ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '40px 20px', color: '#475569', justifyContent: 'center', flexDirection: 'column' }}>
                      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: currentColor }} />
                      <div style={{ fontSize: '0.8rem' }}>
                        Forjando conteúdo com <b style={{ color: currentColor }}>{filteredModels.find(m => m.id === modelId)?.label}</b>...
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#334155' }}>Pode levar alguns segundos</div>
                    </div>
                  ) : output ? (
                    <textarea
                      value={output}
                      onChange={e => setOutput(e.target.value)}
                      className="ai-output"
                      style={{
                        width: '100%', height: '100%', background: 'transparent', border: 'none',
                        color: '#cbd5e1', outline: 'none', resize: 'none', lineHeight: 1.7,
                        fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: '0.72rem',
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#1e293b' }}>
                      <Wand2 size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.2 }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>Aguardando geração</div>
                      <div style={{ fontSize: '0.68rem' }}>Preencha o formulário e clique em "Forjar com IA"</div>
                    </div>
                  )}
                </div>

                {/* Painel salvar na wiki */}
                {showSavePanel && output && (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    <Save size={14} style={{ color: currentColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', flexShrink: 0 }}>Salvar em:</span>
                    <input
                      type="text"
                      value={savePath}
                      onChange={e => setSavePath(e.target.value)}
                      className="ai-input"
                      style={{ flex: 1, minWidth: '200px', fontSize: '0.65rem' }}
                      placeholder="Caminho na wiki..."
                    />
                    <button
                      className="ai-btn"
                      onClick={handleSaveToWiki}
                      style={{ background: `${currentColor}22`, border: `1px solid ${currentColor}66`, color: currentColor, flexShrink: 0 }}
                    >
                      <Save size={12} /> Salvar na Wiki
                    </button>
                    <button onClick={() => setShowSavePanel(false)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                    {saveStatus && (
                      <div style={{ width: '100%', fontSize: '0.65rem', color: saveStatus.startsWith('✅') ? '#34d399' : saveStatus.startsWith('❌') ? '#f87171' : '#94a3b8', paddingLeft: '22px' }}>
                        {saveStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DraggableWindow>
  );
};
