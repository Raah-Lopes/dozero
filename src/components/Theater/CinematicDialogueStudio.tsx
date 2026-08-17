// src/components/Theater/CinematicDialogueStudio.tsx
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Sparkles, Send, X, User, Crown, Shield, 
  Flame, Moon, Smile, AlertTriangle, Scroll, Plus, Trash2,
  Volume2, Eye, RefreshCw, Layers, ArrowRight, Bookmark,
  Copy, ChevronUp, ChevronDown, BookOpen, Wand2
} from 'lucide-react';
import { 
  getTheaterState, setActiveDialogue, closeActiveDialogue, 
  saveDialogueScript, deleteDialogueScript,
  type TheaterDialogue, type DialogueChoice, type DialogueScriptStep, type SavedDialogueScript
} from '../../store/theater';
import { useCastData } from './hooks/useCastData';
import { useSceneState } from './hooks/useSceneState';
import { askAI } from '../../services/ai';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EMOTIONS = [
  { id: 'neutral', label: 'Neutro', icon: <User size={14} />, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  { id: 'fury', label: 'Fúria / Ameaça', icon: <Flame size={14} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  { id: 'mystic', label: 'Místico / Sussurro', icon: <Moon size={14} />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  { id: 'panic', label: 'Tensão / Alerta', icon: <AlertTriangle size={14} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { id: 'joy', label: 'Triunfo / Alegria', icon: <Smile size={14} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { id: 'solemn', label: 'Solene / Narrador', icon: <Scroll size={14} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
] as const;

const NARRATIVE_PRESETS = [
  { name: 'O Narrador', title: 'Voz da Narrativa', avatar: '', emotion: 'solemn' },
  { name: 'Voz Misteriosa', title: 'Das Sombras', avatar: '', emotion: 'mystic' },
  { name: 'Guarda da Cidade', title: 'Sentinela do Portão', avatar: '', emotion: 'panic' },
  { name: 'Entidade Ancestral', title: 'Eco dos Antigos', avatar: '', emotion: 'mystic' },
];

const RPG_SCRIPT_TEMPLATES: { title: string; desc: string; steps: DialogueScriptStep[] }[] = [
  {
    title: 'Interrogatório nas Sombras',
    desc: 'O prisioneiro hesita em falar. Os heróis decidem intimidar ou negociar.',
    steps: [
      {
        id: 'step_1',
        speakerName: 'Prisioneiro Manchado',
        speakerTitle: 'Cultista Capturado',
        speakerAvatar: '',
        text: 'Vocês acham que podem me fazer falar? Meu mestre já selou o destino de toda esta região...',
        emotion: 'fury',
        choices: [
          { id: 'c1', label: '[Intimidar]: "Seu mestre não está aqui para salvar sua pele."', outcomeText: 'M-misericórdia! Eu conto onde está a chave do santuário!' },
          { id: 'c2', label: '[Persuadir]: "Se cooperar, garantimos sua saída com vida."', outcomeText: 'Vocês juram? Ele planeja abrir o portal na próxima lua nova...' },
          { id: 'c3', label: '[Místico]: "Sua mente já revela tudo o que esconde."', outcomeText: 'Não entrem na minha cabeça! Eu falo tudo!' }
        ]
      },
      {
        id: 'step_2',
        speakerName: 'O Narrador',
        speakerTitle: 'Cena Dramática',
        speakerAvatar: '',
        text: 'O prisioneiro desaba de joelhos, apontando um mapa ensanguentado com as rotas secretas da fortaleza.',
        emotion: 'solemn',
        choices: []
      }
    ]
  },
  {
    title: 'O Enigma do Guardião Místico',
    desc: 'Uma estátua ancestral ganha vida e bloqueia o portal com uma charada.',
    steps: [
      {
        id: 'step_1',
        speakerName: 'Guardião de Pedra',
        speakerTitle: 'Sentinela da Cripta',
        speakerAvatar: '',
        text: 'Aqueles que buscam a câmara do rei devem provar que enxergam além da ilusão carnal...',
        emotion: 'mystic',
        choices: []
      },
      {
        id: 'step_2',
        speakerName: 'Guardião de Pedra',
        speakerTitle: 'O Enigma',
        speakerAvatar: '',
        text: 'Eu devoro todas as coisas: pássaros, feras, árvores e flores. Mastigo ferro e mordo aço. Quem sou eu?',
        emotion: 'mystic',
        choices: [
          { id: 'c1', label: 'O Tempo', outcomeText: 'Resposta correta! As engrenagens ancestrais se movem e a passagem se abre.' },
          { id: 'c2', label: 'A Morte', outcomeText: 'Incorreto! Um tremor ecoa pelo chão e as runas de defesa reluzem.' },
          { id: 'c3', label: 'O Fogo', outcomeText: 'Incorreto! O fogo consome, mas o Tempo devora até as próprias cinzas.' }
        ]
      }
    ]
  },
  {
    title: 'Desafio do Vilão Principal',
    desc: 'O antagonista se revela no topo da câmara e faz seu discurso final.',
    steps: [
      {
        id: 'step_1',
        speakerName: 'Lorde das Cinzas',
        speakerTitle: 'Mestre da Torre',
        speakerAvatar: '',
        text: 'Tão previsíveis... Vocês lutaram tanto apenas para testemunhar o amanhecer de uma nova era.',
        emotion: 'fury',
        choices: []
      },
      {
        id: 'step_2',
        speakerName: 'Lorde das Cinzas',
        speakerTitle: 'Última Proposta',
        speakerAvatar: '',
        text: 'Ajoelhem-se e jurem lealdade à minha coroa, ou sejam apagados da história para sempre!',
        emotion: 'fury',
        choices: [
          { id: 'c1', label: '[Desafiar]: "Sua tirania termina aqui e agora!"', outcomeText: 'Então que o sangue de vocês lave os degraus deste trono!' },
          { id: 'c2', label: '[Provocar]: "Você fala demais para quem está prestes a cair."', outcomeText: 'Insolentes! Destruirei suas almas!' }
        ]
      }
    ]
  }
];

export const CinematicDialogueStudio: React.FC<Props> = ({ isOpen, onClose }) => {
  const { members } = useCastData();
  const { currentScene, activeNpc } = useSceneState();
  const theaterState = getTheaterState();
  const vaultNpcs = (theaterState.globalAssets || []).filter(a => a.type === 'npc' || a.type === 'monster');

  // Modo: 'single' (Fala Rápida) ou 'script' (Mini-Roteiro Sequencial)
  const [activeTab, setActiveTab] = useState<'single' | 'script'>('single');

  // Estado para Fala Rápida
  const [speakerName, setSpeakerName] = useState(activeNpc?.name || 'O Narrador');
  const [speakerTitle, setSpeakerTitle] = useState(activeNpc?.subtitle || 'Voz da Cena');
  const [speakerAvatar, setSpeakerAvatar] = useState(activeNpc?.imageUrl || '');
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<TheaterDialogue['emotion']>('neutral');
  const [choices, setChoices] = useState<DialogueChoice[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Estado para Mini-Roteiro Sequencial
  const [scriptTitle, setScriptTitle] = useState('Diálogo Dramático');
  const [scriptSteps, setScriptSteps] = useState<DialogueScriptStep[]>([
    {
      id: 'step_1',
      speakerName: activeNpc?.name || 'O Narrador',
      speakerTitle: activeNpc?.subtitle || 'Cena Principal',
      speakerAvatar: activeNpc?.imageUrl || '',
      text: 'O silêncio é rompido por passos pesados na escuridão...',
      emotion: 'mystic',
      choices: []
    }
  ]);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  // Sincronizar com NPC ativo se selecionado ou com evento disparado
  useEffect(() => {
    if (activeNpc) {
      setSpeakerName(activeNpc.name);
      setSpeakerTitle(activeNpc.subtitle || 'Em Cena');
      if (activeNpc.imageUrl) setSpeakerAvatar(activeNpc.imageUrl);
    }
  }, [activeNpc]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail;
      if (detail) {
        if (detail.speakerName) setSpeakerName(detail.speakerName);
        if (detail.speakerTitle) setSpeakerTitle(detail.speakerTitle);
        if (detail.speakerAvatar !== undefined) setSpeakerAvatar(detail.speakerAvatar);
      }
    };
    window.addEventListener('theater-open-dialogue-studio', handler);
    return () => window.removeEventListener('theater-open-dialogue-studio', handler);
  }, []);

  if (!isOpen) return null;

  const currentStep = scriptSteps[activeStepIdx] || scriptSteps[0];

  // Handlers para Fala Rápida
  const handleSelectVaultNpc = (npc: any) => {
    const name = npc.title || npc.name;
    const title = npc.description || 'NPC do Acervo';
    const avatar = npc.url || '';
    if (activeTab === 'single') {
      setSpeakerName(name);
      setSpeakerTitle(title);
      setSpeakerAvatar(avatar);
    } else {
      updateStep(activeStepIdx, { speakerName: name, speakerTitle: title, speakerAvatar: avatar });
    }
  };

  const handleSelectHero = (hero: any) => {
    const name = hero.nome;
    const title = hero.classe || 'Herói';
    const avatar = hero.avatar || '';
    if (activeTab === 'single') {
      setSpeakerName(name);
      setSpeakerTitle(title);
      setSpeakerAvatar(avatar);
    } else {
      updateStep(activeStepIdx, { speakerName: name, speakerTitle: title, speakerAvatar: avatar });
    }
  };

  const handleSelectPreset = (preset: typeof NARRATIVE_PRESETS[0]) => {
    if (activeTab === 'single') {
      setSpeakerName(preset.name);
      setSpeakerTitle(preset.title);
      setSpeakerAvatar(preset.avatar);
      setEmotion(preset.emotion as any);
    } else {
      updateStep(activeStepIdx, { 
        speakerName: preset.name, 
        speakerTitle: preset.title, 
        speakerAvatar: preset.avatar,
        emotion: preset.emotion as any
      });
    }
  };

  const handleAddChoice = (stepIdx?: number) => {
    if (stepIdx === undefined) {
      if (choices.length >= 4) {
        toast.warn('Máximo de 4 opções por diálogo.');
        return;
      }
      const id = `choice_${Date.now()}_${choices.length + 1}`;
      setChoices(prev => [...prev, { id, label: `Opção ${prev.length + 1}` }]);
    } else {
      const step = scriptSteps[stepIdx];
      const currentChoices = step.choices || [];
      if (currentChoices.length >= 4) {
        toast.warn('Máximo de 4 opções por passo.');
        return;
      }
      const id = `choice_${Date.now()}_${currentChoices.length + 1}`;
      const newChoices = [...currentChoices, { id, label: `Opção ${currentChoices.length + 1}` }];
      updateStep(stepIdx, { choices: newChoices });
    }
  };

  const handleUpdateChoice = (choiceId: string, label: string, outcomeText?: string, stepIdx?: number) => {
    if (stepIdx === undefined) {
      setChoices(prev => prev.map(c => c.id === choiceId ? { ...c, label, ...(outcomeText !== undefined ? { outcomeText } : {}) } : c));
    } else {
      const step = scriptSteps[stepIdx];
      const newChoices = (step.choices || []).map(c => c.id === choiceId ? { ...c, label, ...(outcomeText !== undefined ? { outcomeText } : {}) } : c);
      updateStep(stepIdx, { choices: newChoices });
    }
  };

  const handleRemoveChoice = (choiceId: string, stepIdx?: number) => {
    if (stepIdx === undefined) {
      setChoices(prev => prev.filter(c => c.id !== choiceId));
    } else {
      const step = scriptSteps[stepIdx];
      const newChoices = (step.choices || []).filter(c => c.id !== choiceId);
      updateStep(stepIdx, { choices: newChoices });
    }
  };

  // Handlers para o Mini-Roteiro
  const addStep = () => {
    const newStep: DialogueScriptStep = {
      id: `step_${Date.now()}`,
      speakerName: speakerName || 'Personagem',
      speakerTitle: speakerTitle || '',
      speakerAvatar: speakerAvatar || '',
      text: '',
      emotion: 'neutral',
      choices: []
    };
    setScriptSteps(prev => [...prev, newStep]);
    setActiveStepIdx(scriptSteps.length);
  };

  const updateStep = (index: number, updates: Partial<DialogueScriptStep>) => {
    setScriptSteps(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeStep = (index: number) => {
    if (scriptSteps.length <= 1) {
      toast.warn('O roteiro deve conter pelo menos 1 passo.');
      return;
    }
    setScriptSteps(prev => prev.filter((_, i) => i !== index));
    if (activeStepIdx >= index && activeStepIdx > 0) {
      setActiveStepIdx(activeStepIdx - 1);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === scriptSteps.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...scriptSteps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    setScriptSteps(newSteps);
    setActiveStepIdx(targetIndex);
  };

  const loadTemplate = (template: typeof RPG_SCRIPT_TEMPLATES[0]) => {
    setScriptTitle(template.title);
    setScriptSteps(template.steps);
    setActiveStepIdx(0);
    toast.success(`Modelo "${template.title}" carregado no estúdio! 📜`);
  };

  // Gerador de Fala com IA
  const handleGenerateAiLine = async () => {
    setIsGeneratingAi(true);
    try {
      const sceneContext = currentScene 
        ? `Cenário Atual: "${currentScene.title}". Clima: ${currentScene.weather}. Emoção da cena: ${currentScene.mood}. Descrição: ${currentScene.description || 'Sem descrição'}`
        : 'Cenário de aventura de RPG';

      const currentSpeaker = activeTab === 'single' ? speakerName : currentStep.speakerName;
      const currentTitle = activeTab === 'single' ? speakerTitle : currentStep.speakerTitle;
      const currentEmotion = activeTab === 'single' ? emotion : currentStep.emotion;

      const prompt = `Você é o roteirista de uma mesa de RPG de fantasia e mistério.
Gere APENAS UMA FALA marcante e imersiva (máximo 2 a 3 frases) dita pelo personagem "${currentSpeaker}" (${currentTitle}).
Tom de emoção: "${currentEmotion}".
Contexto: ${sceneContext}.
A resposta deve conter APENAS o texto da fala entre aspas, sem introduções ou explicações.`;

      const aiResponse = await askAI(prompt);
      const cleaned = (aiResponse || '').trim().replace(/^["']|["']$/g, '');
      if (cleaned) {
        if (activeTab === 'single') {
          setText(cleaned);
        } else {
          updateStep(activeStepIdx, { text: cleaned });
        }
        toast.success('Fala gerada com sucesso pela IA!');
      }
    } catch {
      const fallbacks = [
        "Prestem atenção aos detalhes. Nada neste lugar é por acaso.",
        "Os ventos sussurram segredos que as mentes mortais jamais ousaram compreender...",
        "Vocês cometeram o maior erro de suas vidas ao cruzar meu caminho!",
        "Rápido! Não há tempo para hesitar, o destino de todos está em jogo!"
      ];
      const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      if (activeTab === 'single') setText(pick);
      else updateStep(activeStepIdx, { text: pick });
      toast.info('Fala contextual gerada!');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Gerador de Roteiro Completo com IA
  const handleGenerateScriptAi = async () => {
    setIsGeneratingAi(true);
    try {
      const sceneContext = currentScene 
        ? `Cenário: "${currentScene.title}". Clima: ${currentScene.weather}. Clima emocional: ${currentScene.mood}. Descrição: ${currentScene.description || 'Aventura de RPG'}`
        : 'Masmorra perigosa e cheia de mistérios';

      const prompt = `Você é um roteirista sênior de RPG. Crie um MINI-ROTEIRO INTERATIVO de 3 passos dramáticos para a seguinte cena:
${sceneContext}.
O roteiro deve conter:
- Passo 1: Fala de introdução dramática de um NPC ou Narrador.
- Passo 2: O NPC faz uma revelação ou desafio e apresenta 2 a 3 opções de escolha/resposta para os jogadores.
- Passo 3: Conclusão impactante da cena.

Responda ESTRITAMENTE em formato JSON com esta estrutura (sem blocos markdown):
{
  "title": "Título do Roteiro",
  "steps": [
    {
      "speakerName": "Nome do Personagem",
      "speakerTitle": "Título/Papel",
      "text": "Texto da fala",
      "emotion": "mystic",
      "choices": [
        { "label": "Opção do Jogador", "outcomeText": "Resposta imediata do NPC" }
      ]
    }
  ]
}`;

      const aiResponse = await askAI(prompt);
      let parsed = null;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {}

      if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        setScriptTitle(parsed.title || 'Roteiro Gerado');
        const formattedSteps: DialogueScriptStep[] = parsed.steps.map((s: any, idx: number) => ({
          id: `step_${Date.now()}_${idx}`,
          speakerName: s.speakerName || 'Personagem',
          speakerTitle: s.speakerTitle || '',
          speakerAvatar: '',
          text: s.text || '',
          emotion: s.emotion || 'neutral',
          choices: (s.choices || []).map((c: any, cIdx: number) => ({
            id: `c_${Date.now()}_${cIdx}`,
            label: c.label || `Opção ${cIdx + 1}`,
            outcomeText: c.outcomeText || ''
          }))
        }));
        setScriptSteps(formattedSteps);
        setActiveStepIdx(0);
        toast.success('Roteiro completo gerado pela IA com sucesso! 🪄');
      } else {
        throw new Error('Falha no formato JSON');
      }
    } catch {
      loadTemplate(RPG_SCRIPT_TEMPLATES[0]);
      toast.info('Modelo de roteiro carregado!');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Transmissão
  const handleBroadcast = () => {
    if (activeTab === 'single') {
      if (!text.trim()) {
        toast.warn('Digite ou gere uma fala antes de transmitir.');
        return;
      }

      const dialogue: TheaterDialogue = {
        id: `dialogue_${Date.now()}`,
        speakerName: speakerName.trim() || 'Personagem',
        speakerTitle: speakerTitle.trim() || undefined,
        speakerAvatar: speakerAvatar.trim() || undefined,
        text: text.trim(),
        emotion: emotion || 'neutral',
        choices: choices.filter(c => c.label.trim().length > 0),
        timestamp: Date.now()
      };

      setActiveDialogue(dialogue);
      toast.success(`Diálogo de "${speakerName}" transmitido na tela de todos os jogadores! 🎬`);
    } else {
      // Transmissão de Mini-Roteiro
      if (scriptSteps.length === 0 || !scriptSteps[0].text.trim()) {
        toast.warn('Preencha a fala do primeiro passo do roteiro antes de transmitir.');
        return;
      }

      const firstStep = scriptSteps[0];
      const dialogue: TheaterDialogue = {
        id: `script_dialogue_${Date.now()}`,
        speakerName: firstStep.speakerName.trim() || 'Personagem',
        speakerTitle: firstStep.speakerTitle?.trim() || undefined,
        speakerAvatar: firstStep.speakerAvatar?.trim() || undefined,
        text: firstStep.text.trim(),
        emotion: firstStep.emotion || 'neutral',
        choices: firstStep.choices || [],
        timestamp: Date.now(),
        scriptTitle: scriptTitle.trim() || 'Mini-Roteiro',
        currentStepIndex: 0,
        totalSteps: scriptSteps.length,
        steps: scriptSteps
      };

      setActiveDialogue(dialogue);
      toast.success(`Roteiro "${scriptTitle}" transmitido! Os jogadores interagirão passo a passo. 🎬`);
    }
    onClose();
  };

  const handleCloseActive = () => {
    closeActiveDialogue();
    toast.info('Diálogo ativo removido da tela.');
  };

  return (
    <div className="theater-modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="cinematic-dialogue-studio-modal animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Tabs */}
        <div className="cds-header">
          <div className="cds-header-left">
            <div className="cds-header-title">
              <MessageSquare className="cds-icon-accent" size={22} />
              <div>
                <h3>Estúdio de Diálogo Cinematográfico</h3>
                <p>Crie falas instantâneas ou mini-roteiros dramáticos com perguntas e escolhas</p>
              </div>
            </div>

            {/* Abas Modo Rápido vs Mini-Roteiro */}
            <div className="cds-tab-buttons">
              <button 
                className={`cds-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
                onClick={() => setActiveTab('single')}
              >
                <Sparkles size={14} /> Fala Rápida (1 Cena)
              </button>
              <button 
                className={`cds-tab-btn ${activeTab === 'script' ? 'active' : ''}`}
                onClick={() => setActiveTab('script')}
              >
                <Scroll size={14} /> Mini-Roteiro Interativo
              </button>
            </div>
          </div>

          <button className="theater-btn-close" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Body Container */}
        <div className="cds-body">
          
          {/* ================================================================
              MODO 1: FALA RÁPIDA
             ================================================================ */}
          {activeTab === 'single' && (
            <>
              {/* Coluna Esquerda: Configurações do Personagem */}
              <div className="cds-left-column">
                
                {/* Seletor Rápido de Quem Fala */}
                <div className="cds-section">
                  <label className="cds-section-label">🎭 Quem está falando?</label>
                  
                  {/* Presets Rápidos */}
                  <div className="cds-quick-speakers">
                    {NARRATIVE_PRESETS.map((p, idx) => (
                      <button 
                        key={idx} 
                        className={`cds-chip-btn ${speakerName === p.name ? 'active' : ''}`}
                        onClick={() => handleSelectPreset(p)}
                      >
                        <Crown size={12} /> {p.name}
                      </button>
                    ))}
                  </div>

                  {/* NPCs do Acervo */}
                  {vaultNpcs.length > 0 && (
                    <div className="cds-subgroup">
                      <span className="cds-subgroup-title">NPCs do Acervo:</span>
                      <div className="cds-avatar-chips">
                        {vaultNpcs.slice(0, 6).map((npc) => (
                          <button
                            key={npc.id}
                            className={`cds-avatar-chip ${speakerName === (npc.title || npc.name) ? 'active' : ''}`}
                            onClick={() => handleSelectVaultNpc(npc)}
                            title={npc.title || npc.name}
                          >
                            {npc.url ? (
                              <img src={npc.url} alt={npc.title} className="cds-chip-img" />
                            ) : (
                              <User size={14} />
                            )}
                            <span>{npc.title || npc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Heróis do Cast */}
                  {members.length > 0 && (
                    <div className="cds-subgroup">
                      <span className="cds-subgroup-title">Personagens dos Jogadores:</span>
                      <div className="cds-avatar-chips">
                        {members.slice(0, 6).map((hero: any) => (
                          <button
                            key={hero.caminhoArquivo}
                            className={`cds-avatar-chip ${speakerName === hero.nome ? 'active' : ''}`}
                            onClick={() => handleSelectHero(hero)}
                            title={hero.nome}
                          >
                            {hero.avatar ? (
                              <img src={hero.avatar} alt={hero.nome} className="cds-chip-img" />
                            ) : (
                              <Shield size={14} />
                            )}
                            <span>{hero.nome}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dados do Personagem */}
                <div className="cds-section">
                  <div className="cds-input-row">
                    <div className="cds-input-field">
                      <label>Nome do Personagem:</label>
                      <input 
                        type="text" 
                        value={speakerName} 
                        onChange={(e) => setSpeakerName(e.target.value)}
                        placeholder="Ex: Mestre, Lorde Valerius..."
                      />
                    </div>
                    <div className="cds-input-field">
                      <label>Título / Função:</label>
                      <input 
                        type="text" 
                        value={speakerTitle} 
                        onChange={(e) => setSpeakerTitle(e.target.value)}
                        placeholder="Ex: Arquimago, Guarda Real..."
                      />
                    </div>
                  </div>

                  <div className="cds-input-field">
                    <label>URL do Avatar / Retrato (Opcional):</label>
                    <input 
                      type="text" 
                      value={speakerAvatar} 
                      onChange={(e) => setSpeakerAvatar(e.target.value)}
                      placeholder="https://... ou cole imagem"
                    />
                  </div>
                </div>

                {/* Emoção / Tom Dramático */}
                <div className="cds-section">
                  <label className="cds-section-label">🎨 Emoção & Tom da Fala:</label>
                  <div className="cds-emotions-grid">
                    {EMOTIONS.map((emo) => (
                      <button
                        key={emo.id}
                        className={`cds-emotion-card ${emotion === emo.id ? 'active' : ''}`}
                        style={{
                          borderColor: emotion === emo.id ? emo.color : 'rgba(255, 255, 255, 0.1)',
                          backgroundColor: emotion === emo.id ? emo.bg : 'rgba(0, 0, 0, 0.2)'
                        }}
                        onClick={() => setEmotion(emo.id as any)}
                      >
                        <span style={{ color: emo.color }}>{emo.icon}</span>
                        <span className="cds-emotion-name">{emo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Coluna Direita: Fala, IA e Opções de Escolha */}
              <div className="cds-right-column">
                
                {/* Campo de Fala */}
                <div className="cds-section">
                  <div className="cds-section-header-row">
                    <label className="cds-section-label">💬 Fala do Diálogo:</label>
                    <button 
                      className="cds-btn-ai"
                      onClick={handleGenerateAiLine}
                      disabled={isGeneratingAi}
                    >
                      <Sparkles size={14} className={isGeneratingAi ? 'animate-spin' : ''} />
                      {isGeneratingAi ? 'Escrevendo...' : 'Gerar com IA'}
                    </button>
                  </div>

                  <textarea 
                    className="cds-dialogue-textarea"
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escreva a fala que aparecerá no centro da tela dos jogadores com efeito de digitação suave..."
                  />
                </div>

                {/* Opções de Escolha para os Jogadores */}
                <div className="cds-section">
                  <div className="cds-section-header-row">
                    <label className="cds-section-label">🎯 Opções de Resposta / Escolhas dos Jogadores:</label>
                    <button className="cds-btn-add-choice" onClick={() => handleAddChoice()}>
                      <Plus size={13} /> Adicionar Escolha
                    </button>
                  </div>

                  {choices.length === 0 ? (
                    <p className="cds-empty-choices-hint">
                      Sem escolhas. O diálogo fechará com um clique ou após a leitura.
                    </p>
                  ) : (
                    <div className="cds-choices-list">
                      {choices.map((c, idx) => (
                        <div key={c.id} className="cds-choice-row">
                          <span className="cds-choice-num">{idx + 1}.</span>
                          <input 
                            type="text" 
                            value={c.label} 
                            onChange={(e) => handleUpdateChoice(c.id, e.target.value)}
                            placeholder={`Opção de resposta ${idx + 1}...`}
                          />
                          <button 
                            className="cds-btn-delete-choice" 
                            onClick={() => handleRemoveChoice(c.id)}
                            title="Remover opção"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prévia ao Vivo */}
                <div className="cds-section cds-preview-box">
                  <div className="cds-preview-header">
                    <Eye size={13} /> Prévia da Cena
                  </div>
                  <div className="cds-preview-bubble">
                    <div className="cds-preview-speaker">
                      {speakerAvatar && <img src={speakerAvatar} alt={speakerName} className="cds-preview-avatar" />}
                      <div>
                        <strong>{speakerName}</strong>
                        {speakerTitle && <small> — {speakerTitle}</small>}
                      </div>
                    </div>
                    <p className="cds-preview-text">
                      “{text || 'Digite uma fala para visualizar a prévia aqui...'}”
                    </p>
                    {choices.length > 0 && (
                      <div className="cds-preview-choices">
                        {choices.map((c, i) => (
                          <span key={c.id} className="cds-preview-choice-tag">
                            {i + 1}. {c.label || 'Sem texto'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ================================================================
              MODO 2: MINI-ROTEIRO INTERATIVO (SEQUENCIAL & COM PERGUNTAS)
             ================================================================ */}
          {activeTab === 'script' && (
            <div className="cds-script-workspace">
              
              {/* Topbar do Roteiro */}
              <div className="cds-script-topbar">
                <div className="cds-script-title-box">
                  <label>Título do Roteiro:</label>
                  <input 
                    type="text" 
                    value={scriptTitle}
                    onChange={(e) => setScriptTitle(e.target.value)}
                    placeholder="Ex: Interrogatório do Cultista, Enigma do Guardião..."
                  />
                </div>

                {/* Ações de IA e Modelos */}
                <div className="cds-script-top-actions">
                  <button 
                    className="cds-btn-ai script"
                    onClick={handleGenerateScriptAi}
                    disabled={isGeneratingAi}
                  >
                    <Wand2 size={14} className={isGeneratingAi ? 'animate-spin' : ''} />
                    {isGeneratingAi ? 'Criando Roteiro...' : '🪄 Gerar Roteiro Completo com IA'}
                  </button>
                  
                  {/* Presets Prontos */}
                  <div className="cds-templates-dropdown">
                    <span className="cds-template-label"><BookOpen size={13} /> Modelos Prontos:</span>
                    {RPG_SCRIPT_TEMPLATES.map((tpl, idx) => (
                      <button 
                        key={idx} 
                        className="cds-template-btn"
                        onClick={() => loadTemplate(tpl)}
                        title={tpl.desc}
                      >
                        {tpl.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid: Timeline de Passos na Esquerda + Editor do Passo Ativo na Direita */}
              <div className="cds-script-grid">
                
                {/* Timeline / Lista de Passos */}
                <div className="cds-steps-timeline">
                  <div className="cds-steps-header">
                    <span>Passos da Cena ({scriptSteps.length})</span>
                    <button className="cds-btn-add-step" onClick={addStep}>
                      <Plus size={13} /> Adicionar Passo
                    </button>
                  </div>

                  <div className="cds-steps-list">
                    {scriptSteps.map((step, idx) => {
                      const isSelected = activeStepIdx === idx;
                      const hasChoices = step.choices && step.choices.length > 0;
                      return (
                        <div 
                          key={step.id} 
                          className={`cds-step-card ${isSelected ? 'active' : ''}`}
                          onClick={() => setActiveStepIdx(idx)}
                        >
                          <div className="cds-step-card-header">
                            <span className="cds-step-index">#{idx + 1}</span>
                            <strong className="cds-step-speaker">{step.speakerName || 'Narrador'}</strong>
                            {hasChoices && <span className="cds-step-choice-indicator">🎯 {step.choices?.length} escolhas</span>}
                          </div>
                          <p className="cds-step-snippet">
                            {step.text ? `“${step.text.substring(0, 45)}...”` : '(Sem fala preenchida)'}
                          </p>

                          <div className="cds-step-controls" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} title="Mover para cima">
                              <ChevronUp size={13} />
                            </button>
                            <button onClick={() => moveStep(idx, 'down')} disabled={idx === scriptSteps.length - 1} title="Mover para baixo">
                              <ChevronDown size={13} />
                            </button>
                            <button onClick={() => removeStep(idx)} title="Excluir passo" className="delete">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Editor do Passo Atual */}
                <div className="cds-step-editor">
                  <div className="cds-step-editor-header">
                    <h4>Editando Passo #{activeStepIdx + 1}: <span className="highlight">{currentStep.speakerName}</span></h4>
                    <button 
                      className="cds-btn-ai small"
                      onClick={handleGenerateAiLine}
                      disabled={isGeneratingAi}
                    >
                      <Sparkles size={12} /> Gerar Fala Deste Passo
                    </button>
                  </div>

                  {/* Seletor Rápido de Interlocutor para o Passo */}
                  <div className="cds-step-quick-speakers-section">
                    <label className="cds-section-label">🎭 Selecionar Interlocutor Deste Passo:</label>
                    
                    {/* Presets Rápidos */}
                    <div className="cds-quick-speakers">
                      {NARRATIVE_PRESETS.map((p, idx) => (
                        <button 
                          key={idx} 
                          className={`cds-chip-btn ${currentStep.speakerName === p.name ? 'active' : ''}`}
                          onClick={() => handleSelectPreset(p)}
                        >
                          <Crown size={12} /> {p.name}
                        </button>
                      ))}
                    </div>

                    {/* Heróis do Cast / Fichas dos Jogadores */}
                    {members.length > 0 && (
                      <div className="cds-subgroup">
                        <span className="cds-subgroup-title">Heróis do Grupo:</span>
                        <div className="cds-avatar-chips">
                          {members.map((hero: any) => (
                            <button
                              key={hero.caminhoArquivo}
                              className={`cds-avatar-chip ${currentStep.speakerName === hero.nome ? 'active' : ''}`}
                              onClick={() => handleSelectHero(hero)}
                              title={hero.nome}
                            >
                              {hero.avatar ? (
                                <img src={hero.avatar} alt={hero.nome} className="cds-chip-img" />
                              ) : (
                                <Shield size={14} />
                              )}
                              <span>{hero.nome}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* NPCs do Acervo */}
                    {vaultNpcs.length > 0 && (
                      <div className="cds-subgroup">
                        <span className="cds-subgroup-title">NPCs do Acervo:</span>
                        <div className="cds-avatar-chips">
                          {vaultNpcs.map((npc) => (
                            <button
                              key={npc.id}
                              className={`cds-avatar-chip ${currentStep.speakerName === (npc.title || npc.name) ? 'active' : ''}`}
                              onClick={() => handleSelectVaultNpc(npc)}
                              title={npc.title || npc.name}
                            >
                              {npc.url ? (
                                <img src={npc.url} alt={npc.title} className="cds-chip-img" />
                              ) : (
                                <User size={14} />
                              )}
                              <span>{npc.title || npc.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interlocutor do Passo (Campos Manuais) */}
                  <div className="cds-step-speaker-row">
                    <div className="cds-input-field">
                      <label>Nome do Personagem:</label>
                      <input 
                        type="text" 
                        value={currentStep.speakerName} 
                        onChange={(e) => updateStep(activeStepIdx, { speakerName: e.target.value })}
                        placeholder="Ex: O Narrador, Guardião, Vilão..."
                      />
                    </div>
                    <div className="cds-input-field">
                      <label>Título / Papel:</label>
                      <input 
                        type="text" 
                        value={currentStep.speakerTitle || ''} 
                        onChange={(e) => updateStep(activeStepIdx, { speakerTitle: e.target.value })}
                        placeholder="Ex: Voz das Sombras..."
                      />
                    </div>
                    <div className="cds-input-field avatar">
                      <label>Avatar (URL):</label>
                      <input 
                        type="text" 
                        value={currentStep.speakerAvatar || ''} 
                        onChange={(e) => updateStep(activeStepIdx, { speakerAvatar: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Emoção do Passo */}
                  <div className="cds-emotions-mini-bar">
                    {EMOTIONS.map((emo) => (
                      <button
                        key={emo.id}
                        className={`cds-emotion-chip ${currentStep.emotion === emo.id ? 'active' : ''}`}
                        style={{
                          borderColor: currentStep.emotion === emo.id ? emo.color : 'rgba(255, 255, 255, 0.1)',
                          backgroundColor: currentStep.emotion === emo.id ? emo.bg : 'transparent',
                          color: currentStep.emotion === emo.id ? emo.color : '#94a3b8'
                        }}
                        onClick={() => updateStep(activeStepIdx, { emotion: emo.id as any })}
                      >
                        {emo.icon} <span>{emo.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Texto da Fala */}
                  <div className="cds-step-text-field">
                    <label>💬 Texto da Fala:</label>
                    <textarea 
                      rows={3}
                      value={currentStep.text}
                      onChange={(e) => updateStep(activeStepIdx, { text: e.target.value })}
                      placeholder="Texto que será falado neste passo da cena..."
                    />
                  </div>

                  {/* Perguntas & Escolhas Interativas com Resposta */}
                  <div className="cds-step-choices-section">
                    <div className="cds-section-header-row">
                      <label className="cds-section-label">🎯 Perguntas / Escolhas para os Jogadores (Opcional):</label>
                      <button className="cds-btn-add-choice" onClick={() => handleAddChoice(activeStepIdx)}>
                        <Plus size={13} /> Adicionar Opção
                      </button>
                    </div>

                    {(!currentStep.choices || currentStep.choices.length === 0) ? (
                      <p className="cds-empty-choices-hint">
                        Sem escolhas neste passo. O diálogo passará para o próximo passo com um clique.
                      </p>
                    ) : (
                      <div className="cds-script-choices-list">
                        {currentStep.choices.map((c, cIdx) => (
                          <div key={c.id} className="cds-script-choice-card">
                            <div className="cds-script-choice-row">
                              <span className="cds-choice-num">{cIdx + 1}.</span>
                              <input 
                                type="text"
                                className="cds-choice-label-input"
                                value={c.label}
                                onChange={(e) => handleUpdateChoice(c.id, e.target.value, c.outcomeText, activeStepIdx)}
                                placeholder={`Texto do botão de escolha ${cIdx + 1}...`}
                              />
                              <button 
                                className="cds-btn-delete-choice"
                                onClick={() => handleRemoveChoice(c.id, activeStepIdx)}
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="cds-script-outcome-row">
                              <span className="cds-outcome-tag">↳ Resposta do NPC:</span>
                              <input 
                                type="text"
                                className="cds-outcome-input"
                                value={c.outcomeText || ''}
                                onChange={(e) => handleUpdateChoice(c.id, c.label, e.target.value, activeStepIdx)}
                                placeholder="Fala imediata que o interlocutor dirá caso esta opção seja escolhida (Opcional)..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="cds-footer">
          <button className="theater-btn-secondary" onClick={handleCloseActive}>
            <X size={15} /> Limpar Diálogo da Tela
          </button>
          
          <div className="cds-footer-right">
            <button className="theater-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="cds-btn-broadcast" onClick={handleBroadcast}>
              <Send size={16} /> 
              {activeTab === 'single' ? 'Transmitir Fala na Mesa' : `Transmitir Roteiro (${scriptSteps.length} Passos)`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
