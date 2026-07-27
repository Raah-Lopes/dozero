import React, { useState, useEffect } from 'react';
import { 
  Shuffle, Save, FolderOpen, Copy, MessageSquare, Trash2, RefreshCw, Sparkles, User, MapPin, Zap, Key, Eye 
} from 'lucide-react';
import { pushChatMessage } from '../../../store';
import { DraggableWindow } from '../../HUD/DraggableWindow';

const CARD_DATA = {
  protagonist: [
    "Um inventor genial que teme sua própria criação",
    "Um detetive cego que 'vê' ecos do passado",
    "Uma criança guerreira de uma tribo perdida",
    "Um mercador que vende memórias alheias",
    "Um robô que acredita ter uma alma humana",
    "Uma feiticeira amnésica em busca de seu nome",
    "Um pirata do espaço procurando um planeta lendário",
    "Um médico curandeiro em uma terra sem magia",
    "Um espião duplo que esqueceu qual lado é o seu",
    "Um bardo cuja música pode alterar a realidade",
    "Um gigante gentil expulso de sua montanha",
    "Uma rainha destronada vivendo como mendiga",
    "Um necromante que só revive plantas mortas",
    "Um atleta olímpico transportado para um mundo medieval",
    "Um fantasma preso ao seu próprio diário",
    "Um caçador de recompensas com preço na própria cabeça",
    "Uma cientista louca tentando consertar o tempo",
    "Um ladrão que rouba apenas segredos, não objetos",
    "Um druida urbano protegendo parques da cidade",
    "O último sobrevivente de uma civilização submersa"
  ],
  setting: [
    "Uma cidade flutuante sustentada por balões gigantes",
    "Uma floresta onde as árvores sussurram profecias",
    "Um deserto de vidro sob um sol negro",
    "Uma biblioteca infinita com escadas que levam ao céu",
    "Uma estação espacial abandonada há séculos",
    "Um reino subterrâneo iluminado por cogumelos bioluminescentes",
    "Uma vila costeira onde o mar seca toda noite",
    "Um castelo feito inteiramente de gelo eterno",
    "Uma metrópole cyberpunk chovendo constantemente",
    "Um cemitério de navios no meio de dunas de areia",
    "Uma ilha que muda de lugar a cada lua cheia",
    "Um vulcão adormecido que guarda um portal dimensional",
    "Uma torre que toca as nuvens e nunca projeta sombra",
    "Um labirinto de espelhos que reflete versões alternativas",
    "Uma selva onde a gravidade funciona invertida",
    "Um mercado negro flutuando em um rio de lava",
    "Uma fortaleza construída nas costas de uma tartaruga gigante",
    "Um vale onde o tempo passa 10x mais rápido",
    "Uma cidade feita dentro dos ossos de um deus antigo",
    "Um salão de baile congelado no exato momento da meia-noite"
  ],
  conflict: [
    "O combustível que mantém a cidade no ar está acabando",
    "Uma praga que faz as pessoas esquecerem quem amam",
    "Duas luas estão colidindo lentamente no céu",
    "Um tirano proibiu o uso de cores na sociedade",
    "As sombras ganharam vida e estão caçando seus donos",
    "A magia do mundo está vazando para outra dimensão",
    "Uma guerra fria entre guildas de assassinos e curandeiros",
    "O sol não nasceu hoje e ninguém sabe o porquê",
    "Um artefato antigo começou a contar uma regressiva",
    "Árvores gigantescas estão crescendo e esmagando cidades",
    "Os mortos estão voltando, mas pacíficos e confusos",
    "Uma chuva ácida está dissolvendo a tecnologia antiga",
    "O rei foi substituído por um sósia perfeito",
    "Uma maldição transforma mentirosos em estátuas de sal",
    "Recursos naturais estão se transformando em ouro inútil",
    "Portais aleatórios estão abrindo em lugares perigosos",
    "Uma profecia diz que o próximo recém-nascido destruirá o mundo",
    "O silêncio absoluto se espalha, impedindo a fala",
    "Animais comuns estão evoluindo rapidamente para monstros",
    "A gravidade está falhando em zonas intermitentes"
  ],
  item: [
    "Um diário antigo com páginas que mudam de texto sozinhas",
    "Uma chave que abre qualquer porta, mas tranca a mente do usuário",
    "Um espelho que mostra o futuro se quebrado",
    "Uma bússola que aponta para o que você mais deseja",
    "Uma moeda que sempre cai em pé e decide o destino",
    "Um anel que torna o usuário invisível, mas mudo",
    "Uma lanterna que revela coisas ocultas no plano etéreo",
    "Um relógio de bolso que pode voltar 1 minuto no tempo",
    "Uma pena de ave fênix que cura qualquer ferida",
    "Um mapa tatuado na pele de um estranho",
    "Uma espada que canta quando inimigos estão perto",
    "Um frasco contendo a última gota de água pura do mundo",
    "Um baralho de cartas onde cada carta é uma pessoa real",
    "Uma máscara que permite assumir a identidade de quem a veste",
    "Um colar que traduz a linguagem de qualquer criatura",
    "Um martelo que pode pregara realidade como se fosse madeira",
    "Uma bolsa que contém um universo em miniatura",
    "Um livro em branco que escreve o que você pensa em dizer",
    "Uma coroa de espinhos que concede sabedoria dolorosa",
    "Um amuleto que protege contra magia, mas atrai raios"
  ],
  twist: [
    "O vilão é, na verdade, uma versão futura do protagonista",
    "Toda a aventura foi um sonho de uma criança dormindo",
    "O narrador da história é o verdadeiro antagonista",
    "O objeto de poder é senciente e manipula todos",
    "O cenário é, na verdade, uma nave espacial disfarçada",
    "O protagonista já morreu no primeiro ato e é um fantasma",
    "A profecia foi mal interpretada: 'salvar' significa 'destruir'",
    "O aliado mais fiel é um espião infiltrado desde o início",
    "O mundo é uma simulação criada por uma IA antiga",
    "A 'praga' é na verdade uma evolução necessária da espécie",
    "O tesouro procurado é algo que o protagonista já tinha",
    "O tempo não está passando linearmente, mas em loop",
    "Os monstros são as vítimas e os heróis são os invasores",
    "A magia não existe, é apenas tecnologia avançada esquecida",
    "O protagonista é o filho do vilão, criado sem saber",
    "A reviravolta é que não há reviravolta, é tudo literal",
    "Deus existe, mas é maligno e indiferente",
    "A jornada foi orquestrada por um terceiro partido oculto",
    "O 'fim do mundo' é apenas o fim de um ciclo natural",
    "O leitor/jogador é parte da história sem saber"
  ]
};

const CATEGORIES = {
  protagonist: { id: 'protagonist', label: 'Protagonista', icon: User, gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#60a5fa' },
  setting: { id: 'setting', label: 'Cenário', icon: MapPin, gradient: 'linear-gradient(135deg, #10b981, #22c55e)', color: '#34d399' },
  conflict: { id: 'conflict', label: 'Conflito', icon: Zap, gradient: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#f87171' },
  item: { id: 'item', label: 'Objeto', icon: Key, gradient: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#fbbf24' },
  twist: { id: 'twist', label: 'Reviravolta', icon: Eye, gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#c084fc' },
};

interface DrawnCard {
  category: string;
  content: string;
  id: number;
}

interface SavedDeck {
  id: string;
  name: string;
  date: string;
  cards: DrawnCard[];
}

interface Props {
  onClose?: () => void;
}

export const StoryBilderDeckWidget = ({ onClose }: Props) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(CATEGORIES));
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [deckName, setDeckName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('storyBilderDecks');
    if (saved) {
      setSavedDecks(JSON.parse(saved));
    }
  }, []);

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(c => c !== catId) 
        : [...prev, catId]
    );
  };

  const drawCards = () => {
    if (selectedCategories.length === 0) return;
    
    setIsAnimating(true);
    setRevealedCards([]);
    
    // Create new cards face down
    const newCards: DrawnCard[] = selectedCategories.map((cat, i) => ({
      category: cat,
      content: CARD_DATA[cat as keyof typeof CARD_DATA][Math.floor(Math.random() * CARD_DATA[cat as keyof typeof CARD_DATA].length)],
      id: Date.now() + i
    }));
    
    setDrawnCards(newCards);

    // Reveal one by one with a flip animation
    newCards.forEach((card, index) => {
      setTimeout(() => {
        setRevealedCards(prev => [...prev, card.id]);
        if (index === newCards.length - 1) {
          setIsAnimating(false);
        }
      }, 500 + (index * 300)); // Delay per card
    });
  };

  const copyToClipboard = () => {
    const text = drawnCards.map(card => {
      const catLabel = CATEGORIES[card.category as keyof typeof CATEGORIES].label;
      return `**${catLabel}:** ${card.content}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text);
  };

  const sendToChat = () => {
    const messageContent = `🃏 **Story Bilder Deck**\n` + drawnCards.map(card => {
      const catLabel = CATEGORIES[card.category as keyof typeof CATEGORIES].label;
      return `**${catLabel}:** ${card.content}`;
    }).join('\n');
    
    pushChatMessage(messageContent, false, false);
  };

  const saveDeck = () => {
    if (drawnCards.length === 0) return;
    const name = deckName.trim() || `Deck ${new Date().toLocaleTimeString()}`;
    
    const newDeck: SavedDeck = {
      id: Date.now().toString(),
      name,
      date: new Date().toLocaleDateString(),
      cards: drawnCards
    };

    const updatedDecks = [newDeck, ...savedDecks].slice(0, 20);
    setSavedDecks(updatedDecks);
    localStorage.setItem('storyBilderDecks', JSON.stringify(updatedDecks));
    setDeckName('');
  };

  const loadDeck = (deck: SavedDeck) => {
    setDrawnCards(deck.cards);
    setRevealedCards(deck.cards.map(c => c.id));
    setShowSaved(false);
  };

  const deleteDeck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedDecks.filter(d => d.id !== id);
    setSavedDecks(updated);
    localStorage.setItem('storyBilderDecks', JSON.stringify(updated));
  };

  return (
    <DraggableWindow
      id="storyBilderDeck"
      title="Story Bilder Deck"
      initialX={200}
      initialY={100}
      width={700}
      height={650}
      onClose={onClose}
      variant="glass"
    >
      <style>{`
        .sbd-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(15, 23, 42, 0.4);
          color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }
        
        .sbd-scroll-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .sbd-control-panel {
          background: rgba(30, 41, 59, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px;
        }

        .sbd-cat-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .sbd-cat-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .sbd-cat-btn.active {
          color: white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          border-color: transparent;
        }

        .sbd-cat-btn:not(.active) {
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
        }
        
        .sbd-cat-btn:not(.active):hover {
          background: rgba(255,255,255,0.1);
        }

        .sbd-btn-primary {
          width: 100%;
          background: linear-gradient(90deg, #4f46e5, #9333ea);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4);
          transition: all 0.2s ease;
        }

        .sbd-btn-primary:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(147, 51, 234, 0.6);
          transform: translateY(-2px);
        }

        .sbd-btn-primary:active:not(:disabled) {
          transform: scale(0.98);
        }

        .sbd-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(100%);
        }

        /* DYNAMIC LAYOUT (No Overflow) */
        .sbd-cards-container {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          padding: 16px;
          gap: 12px;
          flex: 1;
          overflow-y: auto;
          align-content: center;
        }

        /* 3D FLIP CARD */
        .sbd-card-scene {
          perspective: 1200px;
          flex: 1 1 calc(33.333% - 12px);
          max-width: 180px;
          min-width: 90px;
          aspect-ratio: 2/3.1;
          container-type: inline-size;
        }

        .sbd-card-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
          cursor: pointer;
        }

        .sbd-card-scene.revealed .sbd-card-inner {
          transform: rotateY(180deg);
        }
        
        .sbd-card-scene.revealed:hover .sbd-card-inner {
          transform: rotateY(180deg) translateY(-10px) scale(1.05);
        }

        .sbd-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0,0,0,0.5);
        }

        /* BACK OF THE CARD (Face Down) */
        .sbd-card-back {
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 2px solid rgba(168, 85, 247, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sbd-card-back-pattern {
          width: 90%;
          height: 90%;
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.02) 10px,
            transparent 10px,
            transparent 20px
          );
        }

        /* FRONT OF THE CARD (Face Up) */
        .sbd-card-front {
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.1);
          transform: rotateY(180deg);
          display: flex;
          flex-direction: column;
        }

        .sbd-card-header {
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .sbd-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          margin-bottom: 12px;
          z-index: 2;
        }

        .sbd-card-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          z-index: 2;
          text-align: center;
        }

        .sbd-card-content {
          flex: 1;
          background: rgba(15, 23, 42, 0.9);
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 13px;
          line-height: 1.4;
          color: #e2e8f0;
          font-weight: 500;
          border-top: 1px solid rgba(255,255,255,0.05);
          overflow-y: auto;
        }
        
        /* Container Queries for when the card shrinks to fit many cards */
        @container (max-width: 180px) {
          .sbd-icon-wrap {
            width: 32px;
            height: 32px;
            margin-bottom: 6px;
          }
          .sbd-icon-wrap svg {
            width: 18px;
            height: 18px;
          }
          .sbd-card-header {
            padding: 10px 8px;
          }
          .sbd-card-title {
            font-size: 9px;
            letter-spacing: 0.1em;
          }
          .sbd-card-content {
            font-size: 11px;
            padding: 8px;
            line-height: 1.3;
          }
        }
        
        @container (max-width: 140px) {
          .sbd-icon-wrap {
            width: 26px;
            height: 26px;
            margin-bottom: 4px;
          }
          .sbd-icon-wrap svg {
            width: 14px;
            height: 14px;
          }
          .sbd-card-header {
            padding: 8px 4px;
          }
          .sbd-card-title {
            font-size: 8px;
            letter-spacing: 0;
          }
          .sbd-card-content {
            font-size: 9.5px;
            padding: 6px;
            line-height: 1.2;
          }
        }

        .sbd-bottom-bar {
          padding: 16px;
          background: rgba(30, 41, 59, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .sbd-action-row {
          display: flex;
          gap: 8px;
        }

        .sbd-btn-sec {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 6px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }

        .sbd-btn-chat { background: #059669; }
        .sbd-btn-chat:hover { background: #047857; }
        .sbd-btn-copy { background: #475569; }
        .sbd-btn-copy:hover { background: #334155; }
        
        .sbd-input {
          flex: 1;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: white;
          font-size: 13px;
          outline: none;
        }
        .sbd-input:focus { border-color: #6366f1; }

        .sbd-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border-radius: 6px;
          border: none;
          color: white;
          cursor: pointer;
        }
        .sbd-btn-save { background: #4f46e5; }
        .sbd-btn-load { background: #475569; position: relative; }

        .sbd-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 16px;
          height: 16px;
          background: #ef4444;
          border-radius: 50%;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .sbd-empty-state {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-align: center;
        }
      `}</style>
      <div className="sbd-container">
        <div className="sbd-scroll-area">
          
          <div className="sbd-control-panel">
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#f59e0b" /> Categorias Ativas
            </h3>
            <div className="sbd-cat-grid">
              {Object.values(CATEGORIES).map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`sbd-cat-btn ${isActive ? 'active' : ''}`}
                    style={isActive ? { background: cat.gradient } : {}}
                  >
                    <Icon size={12} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={drawCards}
              disabled={selectedCategories.length === 0 || isAnimating}
              className="sbd-btn-primary"
            >
              <RefreshCw className={isAnimating ? "animate-spin" : ""} size={18} style={isAnimating ? { animation: 'spin 1s linear infinite' } : {}} />
              {isAnimating ? 'Embaralhando e Puxando...' : `Sortear ${selectedCategories.length} Cartas`}
            </button>
          </div>

          <div className="sbd-cards-container">
            {drawnCards.length === 0 && !isAnimating && (
              <div className="sbd-empty-state">
                <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p style={{ fontSize: '15px', fontWeight: 500, color: '#e2e8f0' }}>A mesa está vazia...</p>
                <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px' }}>Role suas cartas para começar sua história.</p>
              </div>
            )}

            {drawnCards.map((card) => {
              const config = CATEGORIES[card.category as keyof typeof CATEGORIES];
              const Icon = config.icon;
              const isRevealed = revealedCards.includes(card.id);
              
              return (
                <div key={card.id} className={`sbd-card-scene ${isRevealed ? 'revealed' : ''}`}>
                  <div className="sbd-card-inner">
                    
                    {/* BACK OF CARD */}
                    <div className="sbd-card-face sbd-card-back">
                      <div className="sbd-card-back-pattern">
                        <Sparkles size={32} color="rgba(168, 85, 247, 0.4)" />
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', letterSpacing: '0.3em', fontWeight: 'bold' }}>STORY</span>
                      </div>
                    </div>

                    {/* FRONT OF CARD */}
                    <div className="sbd-card-face sbd-card-front" style={{ borderColor: config.color }}>
                      <div className="sbd-card-header" style={{ background: config.gradient }}>
                        <div className="sbd-icon-wrap" style={{ color: 'white' }}>
                          <Icon size={24} strokeWidth={2} />
                        </div>
                        <h4 className="sbd-card-title" style={{ color: 'white' }}>
                          {config.label}
                        </h4>
                      </div>
                      
                      <div className="sbd-card-content">
                        {card.content}
                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {drawnCards.length > 0 && (
          <div className="sbd-bottom-bar">
            <div className="sbd-action-row">
              <button onClick={sendToChat} className="sbd-btn-sec sbd-btn-chat">
                <MessageSquare size={16} /> Enviar Chat
              </button>
              <button onClick={copyToClipboard} className="sbd-btn-sec sbd-btn-copy">
                <Copy size={16} /> Copiar
              </button>
            </div>
            
            <div className="sbd-action-row">
              <input 
                type="text" 
                placeholder="Nome do Deck..." 
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="sbd-input"
              />
              <button onClick={saveDeck} className="sbd-btn-icon sbd-btn-save" title="Salvar">
                <Save size={18} />
              </button>
              <button onClick={() => setShowSaved(!showSaved)} className="sbd-btn-icon sbd-btn-load" title="Carregar">
                <FolderOpen size={18} />
                {savedDecks.length > 0 && (
                  <span className="sbd-badge">{savedDecks.length}</span>
                )}
              </button>
            </div>

            {showSaved && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '16px', right: '16px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '160px', overflowY: 'auto', zIndex: 20 }}>
                {savedDecks.length === 0 ? (
                  <p style={{ padding: '12px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>Nenhum deck salvo.</p>
                ) : (
                  savedDecks.map(deck => (
                    <div key={deck.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <button onClick={() => loadDeck(deck)} style={{ background: 'none', border: 'none', textAlign: 'left', flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>{deck.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{deck.date} • {deck.cards.length} cartas</div>
                      </button>
                      <button 
                        onClick={(e) => deleteDeck(e, deck.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableWindow>
  );
}
