import React from 'react';
import { Map, MousePointer2, CloudFog, Ruler, Users, Eye, EyeOff, Paintbrush, Hexagon, RefreshCcw, Square, Circle, Triangle, Lasso, Eraser, Hand, Pen, ArrowRight, Type, ImageIcon, Undo2, Redo2, ChevronLeft, Settings, Settings2, Layers, LayoutGrid, BookOpen, Film, MessageSquare, Dices, LogOut, Pin, Menu, Search, CloudUpload, User as UserIcon, UserCheck, Shield, Globe } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useAuthStore } from '../../store/authStore';
import { Config, onFogConfigChanged } from '../../store/modules/configModule';
import { FogOfWar } from '../../store/modules/fogModule';
import { setActiveTool as setGlobalActiveTool, setFogMode as setGlobalFogMode, localState } from '../../store';
import { Tooltip } from '../UI/Tooltip';
import { toast } from '../UI/Toast';
import type { FogConfig } from '../../store/modules/configModule';

function UserCheckIcon({ user }: { user: any }) {
  if (user) {
    const avatarUrl = user.user_metadata?.custom_avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture;
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt="Avatar" 
          style={{ width: '20px', height: '20px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #10b981' }} 
        />
      );
    }
    return <UserCheck size={20} className="text-emerald-400" />;
  }
  return <UserIcon size={20} />;
}

export function GMToolbar() {
  const { activeTool, setActiveTool, activeModal, setActiveModal, showActors, setShowActors, openWindows, toggleWindow, viewMode, setViewMode } = useWindowManager();
  const { user, isAuthModalOpen, isProfileModalOpen, setAuthModalOpen, setProfileModalOpen } = useAuthStore();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const [fogConfig, setFogConfig] = React.useState<FogConfig>(Config.getFogConfig());
  const [activeFolder, setActiveFolder] = React.useState<'root'|'draw'|'fog'|'map_tools'>('root');
  const [fogMode, setLocalFogMode] = React.useState<'reveal' | 'hide'>('reveal');
  const [fogShape, setFogShape] = React.useState<'brush' | 'polygon' | 'rect' | 'circle' | 'triangle' | 'lasso' | 'eraser'>('brush');
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSyncCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/wiki/sync-cloud', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || 'Sincronizado com sucesso!');
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.gm-flyout-container')) {
        setActiveSubmenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSetTool = (tool: any, shape?: string) => {
    setActiveTool(tool);
    if (tool === 'FOG') {
      setGlobalActiveTool(`fog_${shape || fogShape}` as any);
    } else {
      setGlobalActiveTool(tool);
    }
    window.dispatchEvent(new Event('tool-changed'));
  };

  const handleSetFogMode = (mode: 'reveal' | 'hide') => {
    setLocalFogMode(mode);
    setGlobalFogMode(mode);
    window.dispatchEvent(new Event('tool-changed'));
  };
  
  React.useEffect(() => {
    if (activeTool === 'FOG') {
      const toolMap: Record<string, string> = { brush: 'fog_brush', polygon: 'fog_polygon', rect: 'fog_rect', circle: 'fog_circle', triangle: 'fog_triangle', lasso: 'fog_lasso', eraser: 'fog_erase' };
      setGlobalActiveTool((toolMap[fogShape] || 'fog_brush') as any);
      setGlobalFogMode(fogMode);
    } else if (activeTool === 'RULER') {
      setGlobalActiveTool('ruler');
    } else if (['pan', 'pen', 'shape', 'arrow', 'text', 'eraser'].includes(activeTool as string)) {
      setGlobalActiveTool(activeTool as any);
    } else {
      setGlobalActiveTool('select');
    }
  }, [activeTool, fogShape, fogMode]);

  React.useEffect(() => {
    const handleFogChange = () => setFogConfig(Config.getFogConfig());
    const unsub = onFogConfigChanged(handleFogChange);
    return () => unsub();
  }, []);

  // Update window variables for GameCanvas to read if needed (fallback)
  React.useEffect(() => {
    (window as any).__ACTIVE_TOOL__ = activeTool;
    (window as any).__FOG_MODE__ = fogMode;
    (window as any).__FOG_SHAPE__ = fogShape;
  }, [activeTool, fogMode, fogShape]);

  const toggleNPCPanel = () => {
    setShowActors(!showActors);
  };

  const isFog = activeTool === 'FOG';

  const isExpanded = isOpen;

  return (
    <div 
      className={`hud-sidebar-container ${isExpanded ? '' : 'collapsed'}`}
    >
      <div className="hud-glass" style={{
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.5rem',
        borderTopRightRadius: '16px',
        borderBottomRightRadius: '16px',
        borderLeft: 'none',
        overflow: 'hidden',
        pointerEvents: 'auto',
        boxSizing: 'border-box'
      }}>
        {/* Logo Details / Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', height: '50px', position: 'relative', marginBottom: '8px', paddingLeft: '8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: isOpen ? 'auto' : 'none' }}>
            <Layers size={24} color="var(--accent-primary)" />
            <span style={{ color: 'white', fontWeight: 600, fontSize: '18px', marginLeft: '12px' }}>Menu DOZERO</span>
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
              position: 'absolute', 
              right: isOpen ? '8px' : '50%', 
              transform: isOpen ? 'none' : 'translateX(50%)', 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              transition: 'all 0.3s' 
            }}
            title={isOpen ? "Recolher Menu" : "Expandir Menu"}
          >
            <Menu size={24} />
          </button>
        </div>
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0', flexShrink: 0 }} />

        <div 
          className="gm-tools-scroll-area"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            flex: '1 1 0%', 
            minHeight: 0,
            overflowY: 'auto', 
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            paddingBottom: '50px',
            boxSizing: 'border-box'
          }}
        >
        {activeFolder === 'root' && (
          <>
            {/* Hub & Nav Tools */}
            <ToolButton 
              icon={<Search size={20} />} 
              active={false} 
              onClick={() => window.dispatchEvent(new Event('open-command-palette'))} 
              tooltip="Busca (Ctrl+K)"
              description="Abre a paleta de comandos rápida do sistema"
            />
            <ToolButton 
              icon={<LayoutGrid size={20} />} 
              active={activeModal === 'widgets'} 
              onClick={() => setActiveModal(activeModal === 'widgets' ? 'none' : 'widgets')} 
              tooltip="Menu Geral (Hub)"
              description="Painel principal com widgets e funcionalidades do mestre"
            />
            <ToolButton 
              icon={<BookOpen size={20} />} 
              active={viewMode === 'wiki'} 
              onClick={() => setViewMode(viewMode === 'wiki' ? 'canvas' : 'wiki')} 
              tooltip="Wiki da Campanha"
              description="Acesse anotações, monstros e compêndios"
            />
            <ToolButton 
              icon={<Film size={20} />} 
              active={viewMode === 'theater'} 
              onClick={() => setViewMode(viewMode === 'theater' ? 'canvas' : 'theater')} 
              tooltip="Teatro da Mente"
              description="Modo cinematográfico imersivo para interpretação sem grid"
            />
            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            {/* Ferramentas do Mapa */}
            <ToolButton 
              icon={<Map size={20} />} 
              active={['CURSOR', 'pan', 'RULER'].includes(activeTool as string) || isFog || ['pen','shape','arrow','text','eraser'].includes(activeTool as string)}
              onClick={() => setActiveFolder('map_tools')} 
              tooltip="Ferramentas do Mapa"
              description="Abre o menu de Cursor, Medição, Névoa, Camadas e mais"
            />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            <ToolButton 
              icon={<Users size={20} />} 
              active={showActors} 
              onClick={toggleNPCPanel} 
              tooltip="Fichas & Tokens"
              description="Lista rápida dos participantes e monstros da cena (Cast)"
            />

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            
            <ToolButton 
              icon={<Globe size={20} />} 
              active={activeModal === 'lobby'} 
              onClick={() => setActiveModal('lobby')} 
              tooltip="Mural de Campanhas (Nuvem)"
              description="Gerencie suas campanhas salvas na nuvem, crie novas mesas ou troque de aventura"
            />
            <ToolButton 
              icon={<Shield size={20} />} 
              active={openWindows.playerManager} 
              onClick={() => toggleWindow('playerManager')} 
              tooltip="Controle de Jogadores (GM)"
              description="Gerencie conexões ativas, fichas/tokens, puxar visão e solicitar rolagens"
            />
            <ToolButton 
              icon={<Users size={20} />} 
              active={activeModal === 'players'} 
              onClick={() => setActiveModal('players')} 
              tooltip="Convidar Jogadores (Links & QR Code)"
              description="Copie o link da Vercel da sala atual, exiba o QR Code ou gerencie dados locais"
            />
            <ToolButton 
              icon={<MessageSquare size={20} />} 
              active={openWindows.chatWindow} 
              onClick={() => toggleWindow('chatWindow')} 
              tooltip="Chat P2P"
              description="Troque mensagens em tempo real com todos os conectados"
            />
            <ToolButton 
              icon={<Dices size={20} />} 
              active={openWindows.combatLog} 
              onClick={() => toggleWindow('combatLog')} 
              tooltip="Registro de Rolagens"
              description="Acompanhe o log detalhado dos dados jogados recentemente"
            />

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

            <ToolButton 
              icon={<Settings size={20} />} 
              active={activeModal === 'settings'} 
              onClick={() => setActiveModal('settings')} 
              tooltip="Configurações Globais"
              description="Ajuste atalhos de hardware, desempenho e volume"
            />
            <ToolButton 
              icon={<UserCheckIcon user={user} />} 
              active={isAuthModalOpen || isProfileModalOpen} 
              onClick={() => {
                if (user) {
                  setProfileModalOpen(true);
                } else {
                  setAuthModalOpen(true);
                }
              }} 
              tooltip={user ? `Meu Perfil (${user.user_metadata?.full_name || user.email})` : "Login / Criar Conta"}
              description={user ? "Clique para gerenciar seu perfil, avatar ou desconectar" : "Entre com sua conta Supabase para sincronizar suas mesas"}
            />
            {isLocalhost && (
              <ToolButton 
                icon={<CloudUpload size={20} className={isSyncing ? 'spin-anim' : ''} />} 
                active={false} 
                onClick={handleSyncCloud} 
                tooltip={isSyncing ? "Sincronizando..." : "Sincronizar Nuvem (Vercel)"}
                description="Salva todo o progresso no banco de dados nas nuvens permanentemente"
              />
            )}
            <ToolButton 
              icon={<LogOut size={20} />} 
              active={false} 
              onClick={() => window.location.href = '/'} 
              tooltip="Sair"
              description="Encerra a visão de mestre e retorna ao menu de campanhas"
            />
          </>
        )}

      {activeFolder === 'map_tools' && (
        <>
          <ToolButton 
            icon={<ChevronLeft size={20} />} 
            active={false} 
            onClick={() => { setActiveFolder('root'); setActiveTool('CURSOR'); }} 
            tooltip="Voltar"
            description="Retorna ao menu principal"
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          
          <ToolButton icon={<MousePointer2 size={20} />} active={activeTool === 'CURSOR'} onClick={() => { setActiveTool('CURSOR'); setActiveSubmenu(null); }} tooltip="Cursor" description="Interaja, selecione e mova tokens e objetos na mesa" />
          <ToolButton icon={<Hand size={20} />} active={activeTool === 'pan'} onClick={() => { setActiveTool('pan'); setActiveSubmenu(null); }} tooltip="Mover" description="Arraste para navegar pelo cenário livremente" />
          <ToolButton icon={<Ruler size={20} />} active={activeTool === 'RULER'} onClick={() => { setActiveTool('RULER'); setActiveSubmenu(null); }} tooltip="Régua de Medição" description="Verifique distâncias com o sistema de deslocamento do jogo" />
          <ToolButton icon={<Layers size={20} />} active={false} onClick={() => window.dispatchEvent(new Event('toggle-layers-menu'))} tooltip="Camadas (Layers)" description="Destranque mapas, ordene desenhos ou apague conteúdos" />
          <ToolButton icon={<Settings2 size={20} />} active={false} onClick={() => window.dispatchEvent(new Event('toggle-config-menu'))} tooltip="Configurações do Mapa" description="Altere tamanho do grid, imagem de fundo ou modo fow" />
          
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          
          <ToolButton icon={<Pen size={20} />} active={false} onClick={() => { setActiveFolder('draw'); setActiveSubmenu(null); }} tooltip="Desenhar" description="Exibe ferramentas de caneta, formas, setas e texto" />
          <ToolButton icon={<CloudFog size={20} />} active={isFog} onClick={() => { setActiveFolder('fog'); setActiveSubmenu(null); }} tooltip="Névoa" description="Esconda ou revele partes do mapa dos jogadores" />
        </>
      )}

      {activeFolder === 'draw' && (
        <>
          <ToolButton 
            icon={<ChevronLeft size={20} />} 
            active={false} 
            onClick={() => { setActiveFolder('root'); setActiveTool('CURSOR'); }} 
            tooltip="Voltar"
            description="Retorna ao menu de edição de mapa base"
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <ToolButton 
            icon={<Pen size={20} />} 
            active={activeTool === 'pen'} 
            onClick={() => handleSetTool('pen')} 
            tooltip="Caneta"
            description="Trace riscos livres sobre o quadro"
          />
          <ToolButton 
            icon={<Square size={20} />} 
            active={activeTool === 'shape'} 
            onClick={() => handleSetTool('shape')} 
            tooltip="Forma Geométrica"
            description="Desenhe blocos de formatos rígidos para delimitar a área"
          />
          <ToolButton 
            icon={<ArrowRight size={20} />} 
            active={activeTool === 'arrow'} 
            onClick={() => handleSetTool('arrow')} 
            tooltip="Seta"
            description="Crie linhas retas conectadas que indicam direção de vento, flechas ou empurrões"
          />
          <ToolButton 
            icon={<Type size={20} />} 
            active={activeTool === 'text'} 
            onClick={() => handleSetTool('text')} 
            tooltip="Texto"
            description="Escreva anotações textuais grudadas no tabuleiro"
          />
          <ToolButton 
            icon={<Eraser size={20} />} 
            active={activeTool === 'eraser'} 
            onClick={() => handleSetTool('eraser')} 
            tooltip="Borracha"
            description="Remova os rabiscos tocando nos que deseja deletar (Ctrl+Z para voltar)"
          />
          <ToolButton 
            icon={<ImageIcon size={20} />} 
            active={false} 
            onClick={() => window.dispatchEvent(new Event('trigger-image-upload'))} 
            tooltip="Adicionar Imagem"
            description="Envie adereços ou pedaços de cenário PNG local"
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <ToolButton 
            icon={<Undo2 size={20} />} 
            active={false} 
            onClick={() => window.dispatchEvent(new Event('canvas-undo'))} 
            tooltip="Desfazer"
            description="Atrasa 1 nível no histórico gráfico de ações"
          />
          <ToolButton 
            icon={<Redo2 size={20} />} 
            active={false} 
            onClick={() => window.dispatchEvent(new Event('canvas-redo'))} 
            tooltip="Refazer"
            description="Restitui 1 nível do histórico gráfico desfeito"
          />
        </>
      )}

       {activeFolder === 'fog' && (
        <>
          <ToolButton 
            icon={<ChevronLeft size={20} />} 
            active={false} 
            onClick={() => { setActiveFolder('root'); setActiveTool('CURSOR'); }} 
            tooltip="Voltar"
            description="Retorna ao menu de edição principal"
          />
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          
          <ToolButton icon={<Eye size={20} />} active={fogMode === 'reveal'} onClick={() => handleSetFogMode('reveal')} tooltip="Modo Revelar" description="O que você desenhar será iluminado para a visão dos jogadores na mesa" />
          <ToolButton icon={<EyeOff size={20} />} active={fogMode === 'hide'} onClick={() => handleSetFogMode('hide')} tooltip="Modo Esconder" description="O que você desenhar será obscurecido novamente (Apagão)" />

          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          <ToolButton icon={<Paintbrush size={20} />} active={isFog && fogShape === 'brush'} onClick={() => { setFogShape('brush'); handleSetTool('FOG', 'brush'); }} tooltip="Pincel" description="Traços naturais (use Shift+Roda do mouse para tamanho)" />
          <ToolButton icon={<Square size={20} />} active={isFog && fogShape === 'rect'} onClick={() => { setFogShape('rect'); handleSetTool('FOG', 'rect'); }} tooltip="Retângulo" description="Revela ou oculta caixas perfeitas (ideal para salas)" />
          <ToolButton icon={<Circle size={20} />} active={isFog && fogShape === 'circle'} onClick={() => { setFogShape('circle'); handleSetTool('FOG', 'circle'); }} tooltip="Círculo" description="Revela uma visão circular perfeitamente arredondada do centro para a borda" />
          <ToolButton icon={<Triangle size={20} />} active={isFog && fogShape === 'triangle'} onClick={() => { setFogShape('triangle'); handleSetTool('FOG', 'triangle'); }} tooltip="Triângulo" description="Útil para campos de visões e armadilhas cone-like" />
          <ToolButton icon={<Hexagon size={20} />} active={isFog && fogShape === 'polygon'} onClick={() => { setFogShape('polygon'); handleSetTool('FOG', 'polygon'); }} tooltip="Polígono" description="Use cliques múltiplos na tela para circundar cavernas e túneis tortuosos (Clique na origem para fechar a borda)" />
          <ToolButton icon={<Lasso size={20} />} active={isFog && fogShape === 'lasso'} onClick={() => { setFogShape('lasso'); handleSetTool('FOG', 'lasso'); }} tooltip="Laço" description="Desenhe e preencha grandes falhas de névoa orgânicas à mão livre em um só clique" />
          <ToolButton icon={<Eraser size={20} />} active={isFog && fogShape === 'eraser'} onClick={() => { setFogShape('eraser'); handleSetTool('FOG', 'erase'); }} tooltip="Borracha (FOG)" description="Apaga blocos de formas preenchidas que geraram a sombra ou luz clicando neles" />
          
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          
          <ToolButton icon={<Undo2 size={20} />} active={false} onClick={() => window.dispatchEvent(new Event('canvas-undo'))} tooltip="Desfazer Névoa" description="Desfaz a última manipulação da camada de iluminação" />
          <ToolButton icon={<Redo2 size={20} />} active={false} onClick={() => window.dispatchEvent(new Event('canvas-redo'))} tooltip="Refazer Névoa" description="Refaz as alterações na neblina" />

          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          
          <ToolButton icon={<RefreshCcw size={20} />} active={false} onClick={() => FogOfWar.clear()} tooltip="Resetar FOG" description="Preenche toda a tela de volta com escuridão completa, apagando todos os recortes!" />
          <ToolButton icon={fogConfig.enabled ? <EyeOff size={20} color="#ef4444" /> : <Eye size={20} color="#10b981" />} active={false} onClick={() => Config.updateFog({ enabled: !fogConfig.enabled })} tooltip={fogConfig.enabled ? "Desativar FOG Global" : "Ativar FOG Global"} description="Liga ou desliga o escurecimento total do mapa provisoriamente (Se desligado, os players veem TUDO!)" />
        </>
      )}
        </div>
      </div>
      <div className="hud-sidebar-trigger" />
    </div>
  );
}

function ToolButton({ icon, active, onClick, tooltip, description, small = false }: { icon: React.ReactNode, active: boolean, onClick: () => void, tooltip: string, description?: string, small?: boolean }) {
  const shortcutMatch = tooltip.match(/\(([^)]+)\)$/);
  const shortcut = shortcutMatch ? shortcutMatch[1] : undefined;
  const label = shortcutMatch ? tooltip.replace(/\s*\([^)]+\)$/, '') : tooltip;

  return (
    <Tooltip label={label} description={description} shortcut={shortcut} position="right">
      <button className={`gm-tool-btn ${active ? 'active' : ''}`} onClick={onClick}>
        <div className="gm-tool-icon">{icon}</div>
        <span className="gm-tool-label">{label}</span>
      </button>
    </Tooltip>
  );
}
