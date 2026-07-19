import { toggleVnMode } from '../../store/theater';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PanelLeft, Video, VideoOff, ChevronLeft, ChevronRight, PlusCircle, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { MoodEngine } from './MoodEngine';
import { DirectorPanel } from './DirectorPanel';
import { StagePropsLayer } from './StagePropsLayer';
import { DirectorBar } from './DirectorBar';
import { NpcPortrait } from './NpcPortrait';
import { HeroBadge } from './HeroBadge';
import { DiceResultToast } from './DiceResultToast';
import { useSceneState } from './hooks/useSceneState';
import { useCastData } from './hooks/useCastData';
import { useAIStageManager } from './hooks/useAIStageManager';
import { FloatingWindow } from './FloatingWindow';
import { CastPanel } from './CastPanel';
import { EnemyArsenal } from './EnemyArsenal';
import { ClockRail } from './ClockRail';
import { TacticalRadar } from './TacticalRadar';
import { NarrativeTrack } from './NarrativeTrack';
import { SessionDiary } from './SessionDiary';
import { CutsceneManager } from './CutsceneManager';
import { ScenePanel } from './ScenePanel';
import { PropsPanel } from './PropsPanel';
import { TheaterCommandPalette } from './TheaterCommandPalette';
import { VisualNovelOverlay } from './VisualNovelOverlay';
import './Theater.css';

export const TheaterView: React.FC = () => {
  const { mood, weather, currentScene, scenes, setCurrentScene, patchCurrentScene, goToNextScene, goToPrevScene, linkAudioToScene, vnModeActive } = useSceneState();
  const { members } = useCastData();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('cenas');
  const [isCinematic, setIsCinematic] = useState(false);
  const [isAiActive, setIsAiActive] = useState(false);
  const [kenBurnsActive, setKenBurnsActive] = useState(true);
  useAIStageManager(isAiActive);

  const isCinematicRef = useRef(isCinematic);
  useEffect(() => { isCinematicRef.current = isCinematic; }, [isCinematic]);
  
  const [activeNpc, setActiveNpc] = useState<{ name: string; imageUrl?: string } | null>(null);
  // Active bg index within the current scene's asset gallery
  const [activeBgIndex, setActiveBgIndex] = useState(0);
  // Scene transition overlay
  const [transitionActive, setTransitionActive] = useState(false);
  const [transitionType, setTransitionType] = useState<'fade' | 'dissolve' | 'wipe'>('fade');

  const [floatingPanels, setFloatingPanels] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('theater_floating_panels') || '[]'); } 
    catch { return []; }
  });
  const [activeWindow, setActiveWindow] = useState<string | null>(floatingPanels[0] || null);

  useEffect(() => {
    localStorage.setItem('theater_floating_panels', JSON.stringify(floatingPanels));
  }, [floatingPanels]);

  const toggleFloat = (tab: string) => {
    setFloatingPanels(prev => {
      if (prev.includes(tab)) return prev.filter(t => t !== tab);
      setActiveWindow(tab);
      return [...prev, tab];
    });
  };

  // Reset bg index when scene changes
  useEffect(() => { setActiveBgIndex(0); }, [currentScene?.id]);

  // Scene transition listener
  useEffect(() => {
    const handler = (e: Event) => {
      const { type } = (e as CustomEvent<{ type: string }>).detail || {};
      if (type && type !== 'none') {
        setTransitionType(type as any);
        setTransitionActive(true);
        setTimeout(() => setTransitionActive(false), 800);
      }
    };
    window.addEventListener('theater-scene-transition', handler);
    return () => window.removeEventListener('theater-scene-transition', handler);
  }, []);

  // NPC portrait event (from DirectorPanel)
  useEffect(() => {
    const handler = (e: Event) => {
      const npc = (e as CustomEvent<{ name: string; imageUrl?: string } | null>).detail;
      setActiveNpc(npc);
    };
    window.addEventListener('theater-show-npc', handler);
    return () => window.removeEventListener('theater-show-npc', handler);
  }, []);

  // Open drawer to a specific tab (dispatched by DirectorBar buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab) setDrawerTab(tab);
      setDrawerOpen(true);
    };
    window.addEventListener('theater-open-drawer', handler);
    return () => window.removeEventListener('theater-open-drawer', handler);
  }, []);

  // Keyboard shortcut: Escape → exit cinematic
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCinematicRef.current) setIsCinematic(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Determine the current background image
  const bgImages = [
    ...(currentScene?.imageUrl ? [currentScene.imageUrl] : []),
    ...(currentScene?.assets?.filter(a => a.type === 'location').map(a => a.url) ?? []),
  ];
  const bgUrl = bgImages[activeBgIndex] ?? null;

  const sceneIdx = scenes.findIndex(s => s.id === currentScene?.id);
  const hasPrev = sceneIdx > 0;
  const hasNext = sceneIdx < scenes.length - 1;

  return (
    <MoodEngine
      mood={mood}
      weather={weather}
      bgElement={
        <div className="theater-stage">
          <div
            className={`theater-stage-bg ${kenBurnsActive ? 'theater-ken-burns' : ''}`}
            style={{ backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined }}
          />
          <div className="theater-stage-vignette" />
          {/* Global Color Grading Filter based on Mood */}
          <div className={`theater-global-filter-overlay mood-filter-${mood}`} />
        </div>
      }
    >
      {/* ── Scene transition overlay ── */}
      {transitionActive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
          background: transitionType === 'wipe' ? 'linear-gradient(to right, black 50%, transparent 50%)' : 'black',
          animation: transitionType === 'wipe'
            ? 'sceneWipe 0.8s ease-in-out'
            : 'sceneFade 0.8s ease-in-out',
        }} />
      )}
      <style>{`
        @keyframes sceneFade { 0% { opacity: 0; } 30% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes sceneWipe { 0% { transform: translateX(-100%); } 30% { transform: translateX(0); } 70% { transform: translateX(0); } 100% { transform: translateX(100%); } }
      `}</style>

      {/* ── Dice result toast ── */}
      <DiceResultToast />

      {/* ── Director panel (drawer) ── */}
      <div className="theater-drawer-overlay">
        <div className={`theater-drawer ${drawerOpen ? 'open' : ''}`}>
          <DirectorPanel
            onClose={() => setDrawerOpen(false)}
            activeBgIndex={activeBgIndex}
            onBgChange={setActiveBgIndex}
            initialTab={drawerTab}
            floatingPanels={floatingPanels}
            onToggleFloat={toggleFloat}
          />
        </div>
      </div>

      {/* ── Floating Windows ── */}
      {floatingPanels.map((tab, idx) => {
        let content = null;
        let title = '';
        if (tab === 'ambiente') { 
          content = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ScenePanel />
              <PropsPanel />
            </div>
          ); 
          title = 'Ambiente & Cena'; 
        }
        else if (tab === 'personagens') { 
          content = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Heróis</div><CastPanel type="jogador" /></div>
              <div><div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Ameaças</div><EnemyArsenal /></div>
              <div><div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>NPCs</div><CastPanel type="npc" /></div>
            </div>
          ); 
          title = 'Elenco & Ameaças'; 
        }
        else if (tab === 'mecanicas') { 
          content = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Relógios</div><ClockRail /></div>
              <div><div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Zonas</div><TacticalRadar /></div>
            </div>
          ); 
          title = 'Mecânicas'; 
        }
        else if (tab === 'narrativa') { 
          content = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <NarrativeTrack />
              <SessionDiary />
              <CutsceneManager />
            </div>
          ); 
          title = 'Narrativa'; 
        }
        else return null;

        return (
          <FloatingWindow
            key={tab}
            id={tab}
            title={title}
            isActive={activeWindow === tab}
            onFocus={() => setActiveWindow(tab)}
            onClose={() => toggleFloat(tab)}
            initialX={100 + idx * 30}
            initialY={100 + idx * 30}
          >
            {content}
          </FloatingWindow>
        );
      })}

      {/* ── Props Layer ── */}
      {currentScene && <StagePropsLayer propsList={currentScene.props || []} />}

      {/* ── UI Layer (topbar + stage content + cockpit) ── */}
      <div className={`theater-ui theater-cinematic-ui ${isCinematic ? 'hidden' : ''}`}>

        {/* TOPBAR */}
        <div className="theater-topbar">
          {/* Left controls */}
          <button
            className={`theater-icon-btn ${drawerOpen ? 'active' : ''}`}
            onClick={() => setDrawerOpen(!drawerOpen)}
            title="Painel do Diretor"
          >
            <PanelLeft size={16} />
          </button>

          {/* Scene prev/next */}
          <button
            className="theater-icon-btn"
            onClick={goToPrevScene}
            disabled={!hasPrev}
            style={{ opacity: hasPrev ? 1 : 0.3 }}
            title="Cena anterior"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Scene title (clickable — opens drawer) */}
          <div
            className="theater-topbar-title"
            onClick={() => setDrawerOpen(true)}
            title="Clique para abrir o painel"
          >
            {currentScene?.title ?? 'Sem cena ativa'}
            {currentScene?.subtitle && (
              <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: 8 }}>
                — {currentScene.subtitle}
              </span>
            )}
          </div>

          <button
            className="theater-icon-btn"
            onClick={goToNextScene}
            disabled={!hasNext}
            style={{ opacity: hasNext ? 1 : 0.3 }}
            title="Próxima cena"
          >
            <ChevronRight size={16} />
          </button>

          {/* Cinematic toggle */}
          <button
            className={`theater-icon-btn ${isCinematic ? 'active' : ''}`}
            onClick={() => setIsCinematic(!isCinematic)}
            title={isCinematic ? 'Sair do Modo Cinemático' : 'Modo Cinemático'}
          >
            {isCinematic ? <VideoOff size={15} /> : <Video size={15} />}
          </button>
          
          {/* Ken Burns toggle */}
          <button
            className={`theater-icon-btn ${kenBurnsActive ? 'active' : ''}`}
            onClick={() => setKenBurnsActive(!kenBurnsActive)}
            title={kenBurnsActive ? 'Desativar Movimento de Câmera' : 'Ativar Movimento de Câmera (Ken Burns)'}
            style={{ marginLeft: 4 }}
          >
            <Sparkles size={15} color={kenBurnsActive ? 'var(--accent-primary)' : 'currentColor'} />
          </button>
          
          {/* AI Auto Stage Manager toggle */}
          <button
            className={`theater-icon-btn ${isAiActive ? 'active' : ''}`}
            onClick={() => setIsAiActive(!isAiActive)}
            title={isAiActive ? 'Desativar AI Stage Manager' : 'Ativar AI Stage Manager (Lê o chat para mudar a cena)'}
            style={{ marginLeft: 8 }}
          >
            <Bot size={15} color={isAiActive ? 'var(--accent-primary)' : 'currentColor'} />
          </button>

          {/* VN Mode toggle */}
          <button
            className={`theater-icon-btn ${vnModeActive ? 'active' : ''}`}
            onClick={toggleVnMode}
            title={vnModeActive ? 'Desativar Modo Visual Novel' : 'Ativar Modo Visual Novel (Falas como RPG/Cutscene)'}
            style={{ marginLeft: 8 }}
          >
            <MessageSquare size={15} color={vnModeActive ? 'var(--accent-primary)' : 'currentColor'} />
          </button>
        </div>

        {/* STAGE CONTENT AREA */}
        <div className="theater-stage-content">
          {/* Hero badges — bottom left */}
          {members.length > 0 && (
            <div className="theater-hero-strip">
              {members.filter(m => m.status === 'jogador').slice(0, 6).map(m => (
                <HeroBadge key={m.caminhoArquivo} member={m} />
              ))}
            </div>
          )}

          {/* Active NPC portrait — bottom right */}
          {activeNpc && (
            <NpcPortrait
              name={activeNpc.name}
              imageUrl={activeNpc.imageUrl}
              onClose={() => setActiveNpc(null)}
            />
          )}
        </div>

        {/* COCKPIT / Director bar */}
        <div className="theater-cockpit-wrapper" style={{ flexShrink: 0 }}>
          <DirectorBar />
        </div>
      </div>

      {/* Cinematic exit hint */}
      {isCinematic && (
        <button className="theater-cinematic-exit" onClick={() => setIsCinematic(false)}>
          🎬 MODO CINEMÁTICO — clique ou ESC para sair
        </button>
      )}

      {/* Visual Novel Mode */}
      <VisualNovelOverlay />

      <TheaterCommandPalette />
    </MoodEngine>
  );
};
