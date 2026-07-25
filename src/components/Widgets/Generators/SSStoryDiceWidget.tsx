import React, { useState, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { Dices, Sparkles, Save, RotateCcw, Copy, BookOpen, Lightbulb, Shuffle, Trash2, Clock, MapPin, User, Sword, Heart, Eye } from 'lucide-react';
import { pushChatMessage } from '../../../store/chat';
// ============================================
// BANCO DE DADOS DE STORY DICES
// ============================================
export interface StoryDieCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  items: string[];
}
const STORY_DICE_CATEGORIES: StoryDieCategory[] = [
  {
    id: 'cenarios',
    name: 'Cenários',
    icon: <MapPin size={16} />,
    color: '#3b82f6',
    items: [
      'Um castelo abandonado',
      'Uma floresta sussurrante',
      'Uma cidade submersa',
      'Uma estação espacial derelicta',
      'Um deserto de cristais',
      'Uma biblioteca infinita',
      'Um cemitério de navios',
      'Uma montanha flutuante',
      'Um vulcão adormecido',
      'Um labirinto de espelhos',
      'Uma caverna de cogumelos gigantes',
      'Um oásis no espaço',
      'Uma fábrica automatizada',
      'Um templo esquecido',
      'Um mercado negro dimensional',
      'Uma ilha que se move',
      'Um reino de sombras',
      'Uma torre que toca o céu',
      'Um pântano bioluminescente',
      'Uma ruína antiga'
    ]
  },
  {
    id: 'objetos',
    name: 'Objetos',
    icon: <Clock size={16} />,
    color: '#f59e0b',
    items: [
      'Uma ampulheta quebrada',
      'Um mapa rasgado',
      'Uma chave enferrujada',
      'Um espelho que mostra o passado',
      'Uma pena de fênix',
      'Um diário sem autor',
      'Uma bússola que aponta para desejos',
      'Uma lanterna que revela fantasmas',
      'Um anel que muda de dedo',
      'Uma moeda de duas caras',
      'Um relógio que anda para trás',
      'Uma garrafa com mensagem',
      'Um livro em branco',
      'Uma espada embainhada',
      'Um colar com retrato',
      'Um dado viciado',
      'Uma máscara de teatro',
      'Um cajado rachado',
      'Uma coroa quebrada',
      'Um frasco de essência'
    ]
  },
  {
    id: 'criaturas',
    name: 'Criaturas',
    icon: <Eye size={16} />,
    color: '#10b981',
    items: [
      'Anfíbios com asas de águia',
      'Um golem de musgo',
      'Fantasmas mecânicos',
      'Dragões de cristal',
      'Seres de pura energia',
      'Lobos que caminham nas nuvens',
      'Peixes que voam',
      'Árvores humanoides',
      'Insetos do tamanho de cavalos',
      'Sombras que ganham vida',
      'Robôs com consciência',
      'Sereias do deserto',
      'Gigantes adormecidos',
      'Fadas sombrias',
      'Quimeras aladas',
      'Espectros do tempo',
      'Bestas de obsidiana',
      'Espíritos da natureza',
      'Constructos antigos',
      'Predadores dimensionais'
    ]
  },
  {
    id: 'personagens',
    name: 'Personagens',
    icon: <User size={16} />,
    color: '#8b5cf6',
    items: [
      'Um guerreiro arrependido',
      'Uma criança com poderes',
      'Um mercador misterioso',
      'Uma rainha exilada',
      'Um inventor louco',
      'Um fantasma amigável',
      'Um caçador de recompensas',
      'Uma sacerdotisa caída',
      'Um bardo sem memória',
      'Um alquimista recluso',
      'Um pirata do espaço',
      'Uma guardiã ancestral',
      'Um desertor',
      'Um profeta cego',
      'Uma espiã dupla',
      'Um necromante reformado',
      'Uma estudiosa obcecada',
      'Um paladino corrupto',
      'Uma ladra nobre',
      'Um eremita sábio'
    ]
  },
  {
    id: 'conflitos',
    name: 'Conflitos',
    icon: <Sword size={16} />,
    color: '#ef4444',
    items: [
      'Uma guerra iminente',
      'Uma praga misteriosa',
      'Uma traição revelada',
      'Uma maldição antiga',
      'Uma invasão alienígena',
      'Um desastre natural',
      'Uma rebelião interna',
      'Uma caçada implacável',
      'Uma competição mortal',
      'Um segredo perigoso',
      'Uma profecia sombria',
      'Uma escassez crítica',
      'Uma corrupção crescente',
      'Uma fuga desesperada',
      'Um resgate impossível',
      'Uma vingança jurada',
      'Uma disputa territorial',
      'Uma luta pela sobrevivência',
      'Uma batalha contra o tempo',
      'Um sacrifício necessário'
    ]
  },
  {
    id: 'twists',
    name: 'Reviravoltas',
    icon: <Shuffle size={16} />,
    color: '#ec4899',
    items: [
      'O vilão é o herói',
      'O tempo está loopando',
      'Tudo era um sonho',
      'O objeto é vivo',
      'O aliado é um traidor',
      'O morto está vivo',
      'O lugar é uma ilusão',
      'O poder tem um preço',
      'A missão é falsa',
      'O mentor é o inimigo',
      'A cura é a doença',
      'O passado é o futuro',
      'A fraqueza é força',
      'O inimigo é um aliado',
      'A verdade é mentira',
      'O começo é o fim',
      'O pequeno é gigante',
      'O silêncio fala',
      'A luz é escuridão',
      'O amor é ódio'
    ]
  },
  {
    id: 'temas',
    name: 'Temas',
    icon: <Heart size={16} />,
    color: '#f43f5e',
    items: [
      'Redenção',
      'Sacrifício',
      'Identidade',
      'Liberdade',
      'Justiça',
      'Vingança',
      'Amor proibido',
      'Superação',
      'Traição',
      'Esperança',
      'Perda',
      'Descoberta',
      'Corrupção',
      'Lealdade',
      'Medo',
      'Coragem',
      'Verdade',
      'Ilusão',
      'Destino',
      'Livre arbítrio'
    ]
  }
];
const GENEROS = ['Fantasia', 'Mistério', 'Ficção Científica', 'Terror', 'Romance', 'Aventura', 'Drama', 'Comédia'];
const ARQUETIPOS = ['Guerreiro', 'Detetive', 'Mago', 'Criança', 'Mercenário', 'Nobre', 'Forasteiro', 'Sobrevivente'];
interface RolledDie {
  categoryId: string;
  categoryName: string;
  result: string;
  icon: React.ReactNode;
  color: string;
  timestamp: number;
}
interface SavedCombination {
  id: string;
  dice: RolledDie[];
  timestamp: number;
  notes?: string;
}
export function StoryDiceWidget({ onClose }: { onClose: () => void }) {
  const [rolledDice, setRolledDice] = useState<RolledDie[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['cenarios', 'objetos', 'criaturas', 'personagens', 'conflitos']);
  const [savedCombinations, setSavedCombinations] = useState<SavedCombination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [genre, setGenre] = useState<string>('Fantasia');
  const [archetype, setArchetype] = useState<string>('Guerreiro');
  const [customNotes, setCustomNotes] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  // Carregar combinações salvas ao iniciar
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('storydice_combinations');
      if (saved) {
        setSavedCombinations(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Erro ao carregar combinações salvas:', e);
    }
  }, []);
  const rollSingleDie = useCallback((categoryId: string): RolledDie | null => {
    const category = STORY_DICE_CATEGORIES.find(c => c.id === categoryId);
    if (!category || category.items.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * category.items.length);
    return {
      categoryId: category.id,
      categoryName: category.name,
      result: category.items[randomIndex],
      icon: category.icon,
      color: category.color,
      timestamp: Date.now()
    };
  }, []);
  const rollAllDice = useCallback(() => {
    setIsRolling(true);
    // Animação simples de "rolagem"
    setTimeout(() => {
      const newDice: RolledDie[] = [];
      selectedCategories.forEach(catId => {
        const die = rollSingleDie(catId);
        if (die) newDice.push(die);
      });
      setRolledDice(newDice);
      setIsRolling(false);
      // Enviar para o chat
      sendToChat(newDice);
    }, 600);
  }, [selectedCategories, rollSingleDie]);
  const sendToChat = useCallback((dice: RolledDie[]) => {
    const emojiMap: Record<string, string> = {
      'cenarios': '🏰',
      'objetos': '⏳',
      'criaturas': '🦅',
      'personagens': '🎭',
      'conflitos': '⚔️',
      'twists': '🌀',
      'temas': '💖'
    };
    let chatHTML = `
      <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
                  padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent-primary);">
        <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 8px;">
          <Sparkles size="16" color="var(--accent-primary)" />
          <b style="color: var(--accent-primary);">🎲 Story Dice - Rolagem de História</b>
        </div>
        <div style="display: grid; gap: 6px;">
    `;
    dice.forEach(die => {
      const emoji = emojiMap[die.categoryId] || '🎲';
      chatHTML += `
        <div style="font-size: 13px; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
          <span style="color: ${die.color};">${emoji} <b>${die.categoryName}:</b></span> ${die.result}
        </div>
      `;
    });
    chatHTML += `</div></div>`;
    pushChatMessage(chatHTML);
  }, []);
  const saveCombination = useCallback(() => {
    if (rolledDice.length === 0) return;
    const newCombination: SavedCombination = {
      id: `combo-${Date.now()}`,
      dice: rolledDice,
      timestamp: Date.now(),
      notes: customNotes || undefined
    };
    const updated = [newCombination, ...savedCombinations].slice(0, 20); // Manter apenas 20
    setSavedCombinations(updated);
    localStorage.setItem('storydice_combinations', JSON.stringify(updated));
    setCustomNotes('');
  }, [rolledDice, savedCombinations, customNotes]);
  const loadCombination = useCallback((combo: SavedCombination) => {
    setRolledDice(combo.dice);
    setCustomNotes(combo.notes || '');
  }, []);
  const deleteCombination = useCallback((id: string) => {
    const updated = savedCombinations.filter(c => c.id !== id);
    setSavedCombinations(updated);
    localStorage.setItem('storydice_combinations', JSON.stringify(updated));
  }, [savedCombinations]);
  const generateStoryPrompt = useCallback(() => {
    if (rolledDice.length < 2) return null;
    const prompts = [
      `**Ordem Linear:** Comece com "${rolledDice[0]?.result}". Em seguida, introduza "${rolledDice[1]?.result}". Como ${rolledDice.slice(2).map(d => d.result).join(', ')} se conecta?`,
      `**Foco no Mistério:** O segredo está em "${rolledDice[Math.floor(Math.random() * rolledDice.length)]?.result}". Todos os outros elementos giram em torno disso.`,
      `**Desafio Rápido:** Escreva um parágrafo de até 5 linhas usando TODOS os ${rolledDice.length} elementos de uma só vez.`,
      `**Conexão Inesperada:** Como "${rolledDice[0]?.result}" e "${rolledDice[rolledDice.length - 1]?.result}" estão secretamente relacionados?`,
      `**Pergunta Provocativa:** O que aconteceria se "${rolledDice[Math.floor(Math.random() * rolledDice.length)]?.result}" fosse destruído/removido da história?`
    ];
    return prompts;
  }, [rolledDice]);
  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };
  const copyToClipboard = useCallback(() => {
    const text = rolledDice.map(d => `${d.categoryName}: ${d.result}`).join('\n');
    navigator.clipboard.writeText(text);
  }, [rolledDice]);
  const clearAll = useCallback(() => {
    setRolledDice([]);
    setCustomNotes('');
  }, []);
  const storyPrompts = generateStoryPrompt();
  return (
    <DraggableWindow
      id="story-dice-widget"
      title="🎲 Story Dice - Criador de Histórias"
      onClose={onClose}
      width={450}
      height={650}
      initialX={window.innerWidth / 2 - 225}
      initialY={80}
      dragAnywhere={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px' }}>
        {/* Header com configurações */}
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {ARQUETIPOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Gênero: <b style={{ color: 'var(--accent-primary)' }}>{genre}</b> |
            Protagonista: <b style={{ color: 'var(--accent-secondary)' }}>{archetype}</b>
          </div>
        </div>
        {/* Seleção de Categorias */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            CATEGORIAS ATIVAS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {STORY_DICE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                style={{
                  padding: '6px 10px',
                  background: selectedCategories.includes(cat.id)
                    ? `${cat.color}33`
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedCategories.includes(cat.id) ? cat.color : 'var(--glass-border)'}`,
                  borderRadius: '6px',
                  color: selectedCategories.includes(cat.id) ? cat.color : 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        {/* Botão de rolagem */}
        <button
          onClick={rollAllDice}
          disabled={selectedCategories.length === 0 || isRolling}
          style={{
            width: '100%',
            padding: '12px',
            background: isRolling
              ? 'linear-gradient(135deg, #6b7280, #4b5563)'
              : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: selectedCategories.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px',
            opacity: selectedCategories.length === 0 ? 0.5 : 1,
            transition: 'all 0.3s'
          }}
        >
          <Dices size={18} className={isRolling ? 'animate-spin' : ''} />
          {isRolling ? 'Rolando...' : `Rolar ${selectedCategories.length} Dados`}
        </button>
        {/* Resultados */}
        {rolledDice.length > 0 && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '16px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                RESULTADOS
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={copyToClipboard}
                  title="Copiar resultados"
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Copy size={12} /> Copiar
                </button>
                <button
                  onClick={clearAll}
                  title="Limpar"
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={12} /> Limpar
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rolledDice.map((die, index) => (
                <div
                  key={`${die.categoryId}-${die.timestamp}`}
                  style={{
                    padding: '10px 12px',
                    background: `linear-gradient(135deg, ${die.color}11, ${die.color}05)`,
                    border: `1px solid ${die.color}44`,
                    borderLeft: `3px solid ${die.color}`,
                    borderRadius: '6px',
                    animation: `slideIn 0.3s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: die.color }}>{die.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: die.color, textTransform: 'uppercase' }}>
                      {die.categoryName}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                    {die.result}
                  </div>
                </div>
              ))}
            </div>
            {/* Sugestões de Narrativa */}
            {showSuggestions && storyPrompts && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Lightbulb size={16} color="#fbbf24" />
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                    SUGESTÕES DE NARRATIVA
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {storyPrompts.map((prompt, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      {prompt}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Área de Notas */}
            <div style={{ marginTop: '12px' }}>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Suas ideias, conexões ou desenvolvimento da história..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {/* Botão Salvar */}
            <button
              onClick={saveCombination}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '6px',
                color: '#10b981',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Save size={14} /> Salvar Combinação
            </button>
          </div>
        )}
        {/* Combinações Salvas */}
        {savedCombinations.length > 0 && (
          <div style={{
            borderTop: '1px solid var(--glass-border)',
            paddingTop: '12px',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              COMBINAÇÕES SALVAS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {savedCombinations.map(combo => (
                <div
                  key={combo.id}
                  style={{
                    padding: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div
                    onClick={() => loadCombination(combo)}
                    style={{ flex: 1, cursor: 'pointer', fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    {new Date(combo.timestamp).toLocaleString()} - {combo.dice.length} dados
                    {combo.notes && <span style={{ color: 'var(--text-primary)' }}> • {combo.notes.substring(0, 30)}...</span>}
                  </div>
                  <button
                    onClick={() => deleteCombination(combo.id)}
                    style={{
                      padding: '4px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Footer com dicas */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: '1px solid var(--glass-border)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          💡 Dica: Combine elementos de formas inesperadas para criar histórias únicas!
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DraggableWindow>
  );
}
