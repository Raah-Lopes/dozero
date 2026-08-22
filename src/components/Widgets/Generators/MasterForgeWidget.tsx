import React, { useState, useEffect, Suspense } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { useWindowManager } from '../../../hooks/useWindowManager';
import { 
  Sparkles, UserPlus, Anvil, Skull, Map, Globe, Castle, 
  Eye, Dices, Layers, Bot, Search, ExternalLink, ScrollText, Flame,
  PanelLeftClose, PanelLeft, Menu
} from 'lucide-react';

import { NPCGeneratorWidget } from './NPCGeneratorWidget';
import { EntityForgeWidget } from '../../HUD/EntityForgeWidget';
import { EncounterWidget } from '../GameMaster/EncounterWidget';
import { LocationGeneratorWidget } from './LocationGeneratorWidget';
import { WorldEngineWidget } from './WorldEngineWidget';
import { StrongholdWidget } from './StrongholdWidget';
import { OracleWidgetV2 } from './OracleWidgetV2';
import { StoryDiceWidget } from './StoryDiceWidget';
import { StoryBilderDeckWidget } from './StoryBilderDeckWidget';
import { LoreMachineWidget } from './LoreMachineWidget';
import { AIStudioWidget } from '../GameMaster/AIStudioWidget';

interface MasterForgeWidgetProps {
  onClose: () => void;
}

interface ForgeToolItem {
  id: string;
  title: string;
  category: 'characters' | 'worlds' | 'oracles' | 'ai';
  categoryLabel: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  accentColor: string;
}

const FORGE_TOOLS: ForgeToolItem[] = [
  // Personagens & Criaturas
  {
    id: 'npcGenerator',
    title: 'Forja de NPCs',
    category: 'characters',
    categoryLabel: 'Personagens & Criaturas',
    description: 'Sintetize NPCs com raça, traços, motivação, segredos e loot gerado.',
    icon: <UserPlus size={18} />,
    badge: 'Rápido',
    accentColor: 'rgb(34, 197, 94)'
  },
  {
    id: 'entityForge',
    title: 'Monstros & Entidades',
    category: 'characters',
    categoryLabel: 'Personagens & Criaturas',
    description: 'Evocar tokens de monstros e fichas do compêndio para a mesa.',
    icon: <Anvil size={18} />,
    badge: 'Wiki',
    accentColor: 'rgb(239, 68, 68)'
  },
  {
    id: 'encounterGenerator',
    title: 'Gerador de Encontros',
    category: 'characters',
    categoryLabel: 'Personagens & Criaturas',
    description: 'Composições de batalha, facções e modificadores de terreno.',
    icon: <Skull size={18} />,
    accentColor: 'rgb(249, 115, 22)'
  },

  // Mundos & Locais
  {
    id: 'locationGenerator',
    title: 'Forja de Mundos & Locais',
    category: 'worlds',
    categoryLabel: 'Mundos & Locais',
    description: 'Cidades, masmorras, marcos históricos e perigos com ficha na Wiki.',
    icon: <Map size={18} />,
    accentColor: 'rgb(59, 130, 246)'
  },
  {
    id: 'worldEngine',
    title: 'Motor de Mundo & Facções',
    category: 'worlds',
    categoryLabel: 'Mundos & Locais',
    description: 'Tensões geopolíticas, avanço de facções e estabilidade econômica.',
    icon: <Globe size={18} />,
    accentColor: 'rgb(139, 92, 246)'
  },
  {
    id: 'stronghold',
    title: 'Fortaleza da Party',
    category: 'worlds',
    categoryLabel: 'Mundos & Locais',
    description: 'Gestão da base, tesouraria em ouro e melhorias de descanso.',
    icon: <Castle size={18} />,
    accentColor: 'rgb(16, 185, 129)'
  },

  // Oráculos & Inspiração
  {
    id: 'oracle',
    title: 'Mega Oráculo V2',
    category: 'oracles',
    categoryLabel: 'Oráculos & Inspiração',
    description: 'Centenas de tabelas de oráculo, dados e resultados automáticos.',
    icon: <Eye size={18} />,
    badge: 'Essencial',
    accentColor: 'rgb(168, 85, 247)'
  },
  {
    id: 'storyDice',
    title: 'Story Dice',
    category: 'oracles',
    categoryLabel: 'Oráculos & Inspiração',
    description: 'Dados de história com ícones narrativos para desbloqueio criativo.',
    icon: <Dices size={18} />,
    accentColor: 'rgb(234, 179, 8)'
  },
  {
    id: 'storyBilderDeck',
    title: 'Deck de Cartas de Cenário',
    category: 'oracles',
    categoryLabel: 'Oráculos & Inspiração',
    description: 'Tire cartas ilustradas de Tarot para reviravoltas e atmosfera.',
    icon: <Layers size={18} />,
    accentColor: 'rgb(236, 72, 153)'
  },
  {
    id: 'loreMachine',
    title: 'Máquina de Lores',
    category: 'oracles',
    categoryLabel: 'Oráculos & Inspiração',
    description: 'Gera rumores, ganchos e missões cruzando os dados da sua Wiki.',
    icon: <ScrollText size={18} />,
    accentColor: 'rgb(6, 182, 212)'
  },

  // Inteligência Artificial
  {
    id: 'aiStudio',
    title: 'Estúdio IA do Mestre',
    category: 'ai',
    categoryLabel: 'Inteligência Artificial',
    description: 'Crie fichas, lore e encontros com modelos de ponta Gemini, OpenAI e Groq.',
    icon: <Bot size={18} />,
    badge: 'IA',
    accentColor: 'rgb(192, 132, 252)'
  }
];

export const MasterForgeWidget: React.FC<MasterForgeWidgetProps> = ({ onClose }) => {
  const { openWindow } = useWindowManager();
  const [activeToolId, setActiveToolId] = useState<string>('npcGenerator');
  const [search, setSearch] = useState<string>('');
  const [isCompact, setIsCompact] = useState<boolean>(() => window.innerWidth < 768);
  const [hoveredTool, setHoveredTool] = useState<ForgeToolItem | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number }>({ top: 0 });
  const [windowWidth, setWindowWidth] = useState<number>(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 640) {
        setIsCompact(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeTool = FORGE_TOOLS.find(t => t.id === activeToolId) || FORGE_TOOLS[0];

  const filteredTools = FORGE_TOOLS.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.categoryLabel.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filteredTools.map(t => t.categoryLabel)));

  const handleDetachWindow = (toolId: string) => {
    openWindow(toolId);
  };

  const renderActiveToolContent = () => {
    switch (activeToolId) {
      case 'npcGenerator':
        return <NPCGeneratorWidget embedded />;
      case 'entityForge':
        return <EntityForgeWidget embedded />;
      case 'encounterGenerator':
        return <EncounterWidget embedded />;
      case 'locationGenerator':
        return <LocationGeneratorWidget embedded />;
      case 'worldEngine':
        return <WorldEngineWidget embedded />;
      case 'stronghold':
        return <StrongholdWidget embedded />;
      case 'oracle':
        return <OracleWidgetV2 embedded />;
      case 'storyDice':
        return <StoryDiceWidget embedded />;
      case 'storyBilderDeck':
        return <StoryBilderDeckWidget embedded />;
      case 'loreMachine':
        return <LoreMachineWidget embedded />;
      case 'aiStudio':
        return <AIStudioWidget embedded />;
      default:
        return <NPCGeneratorWidget embedded />;
    }
  };

  const calculatedWidth = Math.min(960, Math.max(340, windowWidth - 24));
  const calculatedHeight = Math.min(640, Math.max(450, window.innerHeight - 70));

  return (
    <DraggableWindow
      id="masterForge"
      title="🔥 A Forja do Mestre — Suíte de Criação & Geradores"
      onClose={onClose}
      width={calculatedWidth}
      height={calculatedHeight}
      initialX={Math.max(10, (window.innerWidth - calculatedWidth) / 2)}
      initialY={Math.max(10, (window.innerHeight - calculatedHeight) / 2)}
      variant="glass"
      dragAnywhere={false}
    >
      <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
        
        {/* Sidebar Esquerda: Lista de Ferramentas com Modo Ícones Responsivo */}
        <div style={{
          width: isCompact ? '58px' : '260px',
          flexShrink: 0,
          borderRight: '1px solid var(--glass-border)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          position: 'relative'
        }}>
          {/* Header da Sidebar com Zye e Botão de Alternar Modo */}
          <div style={{
            padding: isCompact ? '8px 4px' : '10px 12px 8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCompact ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => setIsCompact(!isCompact)}
              title={isCompact ? "Expandir lista de ferramentas" : "Recolher para modo ícones"}
            >
              <img 
                src="/mascot/zye-head-smile.png" 
                alt="Zye" 
                style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(168,85,247,0.4))', flexShrink: 0 }} 
              />
              {!isCompact && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>A Forja do Mestre</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Central com Zye</div>
                </div>
              )}
            </div>

            {!isCompact && (
              <button
                onClick={() => setIsCompact(true)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                title="Recolher para ícones"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>

          {/* Busca Rápida (Apenas no modo expandido) */}
          {!isCompact && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filtrar ferramentas..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '5px 8px 5px 28px',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Navegação por Categorias e Ferramentas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isCompact ? '8px 4px' : '8px', display: 'flex', flexDirection: 'column', gap: isCompact ? '8px' : '12px' }}>
            {categories.map(cat => {
              const toolsInCat = filteredTools.filter(t => t.categoryLabel === cat);
              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {!isCompact ? (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-secondary)',
                      padding: '2px 6px'
                    }}>
                      {cat}
                    </span>
                  ) : (
                    <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  )}

                  {toolsInCat.map(tool => {
                    const isActive = tool.id === activeToolId;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveToolId(tool.id)}
                        onMouseEnter={(e) => {
                          setHoveredTool(tool);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverPos({ top: rect.top });
                        }}
                        onMouseLeave={() => setHoveredTool(null)}
                        onTouchStart={(e) => {
                          setHoveredTool(tool);
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoverPos({ top: rect.top });
                        }}
                        title={isCompact ? `${tool.title}: ${tool.description}` : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isCompact ? 'center' : 'flex-start',
                          gap: isCompact ? '0' : '10px',
                          padding: isCompact ? '6px 0' : '7px 8px',
                          borderRadius: '8px',
                          border: isActive ? `1px solid ${tool.accentColor}88` : '1px solid transparent',
                          background: isActive ? `${tool.accentColor}22` : 'transparent',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          width: isCompact ? '36px' : '30px',
                          height: isCompact ? '36px' : '30px',
                          borderRadius: '6px',
                          background: isActive ? tool.accentColor : 'rgba(255, 255, 255, 0.08)',
                          color: isActive ? '#000' : tool.accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isActive ? `0 0 10px ${tool.accentColor}66` : 'none',
                          transition: 'transform 0.15s ease'
                        }}>
                          {tool.icon}
                        </div>

                        {!isCompact && (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {tool.title}
                              </span>
                              {tool.badge && (
                                <span style={{
                                  fontSize: '0.52rem',
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  background: `${tool.accentColor}25`,
                                  color: tool.accentColor,
                                  fontWeight: 700
                                }}>
                                  {tool.badge}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                              {tool.description}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Tooltip no Modo Ícones / Touch */}
        {isCompact && hoveredTool && (
          <div 
            style={{
              position: 'fixed',
              left: '68px',
              top: `${Math.max(10, Math.min(window.innerHeight - 100, hoverPos.top))}px`,
              zIndex: 999999,
              background: 'rgba(15, 23, 42, 0.96)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${hoveredTool.accentColor}aa`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              boxShadow: '0 8px 25px rgba(0,0,0,0.7)',
              pointerEvents: 'none',
              maxWidth: '240px',
              animation: 'fade-in 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: hoveredTool.accentColor }}>{hoveredTool.title}</span>
              {hoveredTool.badge && (
                <span style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: '4px', background: `${hoveredTool.accentColor}33`, color: hoveredTool.accentColor, fontWeight: 700 }}>
                  {hoveredTool.badge}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#cbd5e1', lineHeight: 1.3 }}>{hoveredTool.description}</div>
          </div>
        )}

        {/* Palco Principal Direito: Ferramenta Ativa Renderizada */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(0, 0, 0, 0.15)' }}>
          
          {/* Subheader da Ferramenta Ativa com Botão de Desacoplar */}
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              {isCompact && (
                <button
                  onClick={() => setIsCompact(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem' }}
                  title="Expandir Menu Lateral"
                >
                  <PanelLeft size={13} />
                  <span style={{ display: windowWidth > 500 ? 'inline' : 'none' }}>Menu</span>
                </button>
              )}
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: activeTool.accentColor,
                boxShadow: `0 0 8px ${activeTool.accentColor}`,
                flexShrink: 0
              }} />
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeTool.title}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: windowWidth > 640 ? 'inline' : 'none' }}>
                — {activeTool.description}
              </span>
            </div>

            <button
              onClick={() => handleDetachWindow(activeTool.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0
              }}
              title="Abrir esta ferramenta como uma janela flutuante independente"
            >
              <ExternalLink size={12} />
              <span style={{ display: windowWidth > 480 ? 'inline' : 'none' }}>Destacar</span>
            </button>
          </div>

          {/* Área Interativa da Ferramenta */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <Suspense fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Sparkles className="spin" size={24} color={activeTool.accentColor} />
              </div>
            }>
              {renderActiveToolContent()}
            </Suspense>
          </div>

        </div>

      </div>
    </DraggableWindow>
  );
};
