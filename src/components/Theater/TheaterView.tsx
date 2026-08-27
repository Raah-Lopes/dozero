import { toggleVnMode, toggleShowHeroCards } from '../../store/theater';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PanelLeft, Video, VideoOff, ChevronLeft, ChevronRight, PlusCircle, Bot, Sparkles, MessageSquare, DoorOpen, Scroll, Music, Lock, BookOpen, Clock, Tv, Users } from 'lucide-react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useIsGM } from '../../store/user';
import { MoodEngine } from './MoodEngine';
import { DirectorPanel } from './DirectorPanel';
import { StagePropsLayer } from './StagePropsLayer';
import { DirectorBar } from './DirectorBar';
import { NpcPortrait } from './NpcPortrait';
import { HeroBadge } from './HeroBadge';
import { DiceResultToast } from './DiceResultToast';
import { LiveChronicleLog } from './LiveChronicleLog';
import { HandoutSpotlight } from './HandoutSpotlight';
import { StageProjectorDropzone } from './StageProjectorDropzone';
import { TheaterSoundscape } from './TheaterSoundscape';
import { SceneCluesModal } from './SceneCluesModal';
import { GMSecretsDrawer } from './GMSecretsDrawer';
import { StageClockOverlay } from './StageClockOverlay';
import { useSceneState } from './hooks/useSceneState';
import { useCastData } from './hooks/useCastData';
import { useTheaterClocks } from './hooks/useTheaterClocks';
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
import { CinematicDialogueStudio } from './CinematicDialogueStudio';
import { PixabayMediaPickerModal } from '../Modals/PixabayMediaPickerModal';
import { CharacterRosterWidget } from '../Widgets/PlayerTools/CharacterRosterWidget';
import { AudioDirectorWidget } from '../Widgets/System/AudioDirectorWidget';
import './Theater.css';

export const TheaterView: React.FC = () => {
  const isGM = useIsGM();
  const { setViewMode } = useWindowManager();
  const { 
    mood, weather, currentScene, scenes, setCurrentScene, patchCurrentScene, 
    goToNextScene, goToPrevScene, linkAudioToScene, vnModeActive,
    activeNpc, setActiveNpc, showHeroCards, activeDialogue
  } = useSceneState();
  const { members } = useCastData();
  const clocks = useTheaterClocks();

  const [isTvMode, setIsTvMode] = useState(false);
  const isPlayerView = !isGM || isTvMode;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('cenas');
  const [rosterOpen, setRosterOpen] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const [soundscapeOpen, setSoundscapeOpen] = useState(false);
  const [audioDirectorOpen, setAudioDirectorOpen] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(false);
  const [secretsOpen, setSecretsOpen] = useState(false);
  const [clocksOpen, setClocksOpen] = useState(false);
  const [dialogueStudioOpen, setDialogueStudioOpen] = useState(false);
  const [pixabayOpen, setPixabayOpen] = useState(false);
  const [pixabayInitialQuery, setPixabayInitialQuery] = useState('dark fantasy scenery');
  const [pixabayInitialTab, setPixabayInitialTab] = useState<'image' | 'video' | 'portrait'>('image');
  const [isCinematic, setIsCinematic] = useState(false);
  const [isAiActive, setIsAiActive] = useState(false);
  const [kenBurnsActive, setKenBurnsActive] = useState(true);
  useAIStageManager(isAiActive);

  // Hotkey: 'L' or 'l' to toggle chronicle log
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'l' || e.key === 'L') {
        setChronicleOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isCinematicRef = useRef(isCinematic);
  useEffect(() => { isCinematicRef.current = isCinematic; }, [isCinematic]);
  
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

  // NPC portrait event (from DirectorPanel or Projector)
  useEffect(() => {
    const handler = (e: Event) => {
      const npc = (e as CustomEvent<any>).detail;
      setActiveNpc(npc);
    };
    window.addEventListener('theater-show-npc', handler);
    return () => window.removeEventListener('theater-show-npc', handler);
  }, [setActiveNpc]);

  // Quick modals listeners
  useEffect(() => {
    const onSoundscape = () => setSoundscapeOpen(true);
    const onAudioDirector = () => {
      setSoundscapeOpen(false);
      setAudioDirectorOpen(prev => !prev);
    };
    const onClues = () => setCluesOpen(true);
    const onSecrets = () => setSecretsOpen(true);
    const onClocks = () => setClocksOpen(true);
    const onRoster = () => setRosterOpen(prev => !prev);
    const onDialogueStudio = () => setDialogueStudioOpen(true);
    const onPixabay = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string; tab?: 'image' | 'video' | 'portrait' }>).detail || {};
      if (detail.query) setPixabayInitialQuery(detail.query);
      if (detail.tab) setPixabayInitialTab(detail.tab);
      setPixabayOpen(true);
    };

    window.addEventListener('theater-open-soundscape', onSoundscape);
    window.addEventListener('theater-open-audio-director', onAudioDirector);
    window.addEventListener('theater-open-clues', onClues);
    window.addEventListener('theater-open-secrets', onSecrets);
    window.addEventListener('theater-open-clock-creator', onClocks);
    window.addEventListener('theater-open-roster', onRoster);
    window.addEventListener('theater-open-dialogue-studio', onDialogueStudio);
    window.addEventListener('theater-open-pixabay', onPixabay);

    return () => {
      window.removeEventListener('theater-open-soundscape', onSoundscape);
      window.removeEventListener('theater-open-audio-director', onAudioDirector);
      window.removeEventListener('theater-open-clues', onClues);
      window.removeEventListener('theater-open-secrets', onSecrets);
      window.removeEventListener('theater-open-clock-creator', onClocks);
      window.removeEventListener('theater-open-roster', onRoster);
      window.removeEventListener('theater-open-dialogue-studio', onDialogueStudio);
      window.removeEventListener('theater-open-pixabay', onPixabay);
    };
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

  // Determine the current background image or video
  const bgImages = [
    ...(currentScene?.imageUrl ? [currentScene.imageUrl] : []),
    ...(currentScene?.assets?.filter(a => a.type === 'location').map(a => a.url) ?? []),
  ];
  const bgUrl = bgImages[activeBgIndex] ?? null;
  const isVideoBg = !!bgUrl && (/\.(mp4|webm|ogg)($|\?)/i.test(bgUrl) || bgUrl.startsWith('data:video/'));

  const sceneIdx = scenes.findIndex(s => s.id === currentScene?.id);
  const hasPrev = sceneIdx > 0;
  const hasNext = sceneIdx < scenes.length - 1;

  return (
    <StageProjectorDropzone disabled={isPlayerView}>
      <MoodEngine
        mood={mood}
        weather={weather}
        bgElement={
          <div className="theater-stage">
            {isVideoBg ? (
              <video
                key={bgUrl}
                src={bgUrl!}
                autoPlay
                loop
                muted
                playsInline
                className={`theater-stage-video ${kenBurnsActive ? 'theater-ken-burns' : ''}`}
              />
            ) : (
              <div
                className={`theater-stage-bg ${kenBurnsActive ? 'theater-ken-burns' : ''}`}
                style={{ backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined }}
              />
            )}
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

        {/* ── Live Chronicle Stream / Event Log ── */}
        <LiveChronicleLog 
          isOpen={chronicleOpen} 
          onClose={() => setChronicleOpen(false)} 
        />

        {/* ── Handout / Clue Theatrical Spotlight ── */}
        <HandoutSpotlight />

        {/* ── Soundscape & Jukebox Modal ── */}
        <TheaterSoundscape 
          isOpen={soundscapeOpen} 
          onClose={() => setSoundscapeOpen(false)} 
          onOpenAudioDirector={() => {
            setSoundscapeOpen(false);
            setAudioDirectorOpen(true);
          }}
        />

        {/* ── Audio Director Pro Modal ── */}
        {audioDirectorOpen && (
          <AudioDirectorWidget onClose={() => setAudioDirectorOpen(false)} />
        )}

        {/* ── Scene Clues / Handouts Modal ── */}
        <SceneCluesModal 
          isOpen={cluesOpen} 
          onClose={() => setCluesOpen(false)} 
        />

        {/* ── Character Roster Modal (Ativar/Desativar Personagens) ── */}
        {rosterOpen && (
          <CharacterRosterWidget onClose={() => setRosterOpen(false)} />
        )}

        {/* ── GM Secrets Drawer (GM Only) ── */}
        {!isPlayerView && (
          <GMSecretsDrawer 
            isOpen={secretsOpen} 
            onClose={() => setSecretsOpen(false)} 
          />
        )}

        {/* ── Cinematic Dialogue Studio Modal (GM Only) ── */}
        {!isPlayerView && (
          <CinematicDialogueStudio
            isOpen={dialogueStudioOpen}
            onClose={() => setDialogueStudioOpen(false)}
          />
        )}

        {/* ── Director panel (drawer) (GM Only) ── */}
        {!isPlayerView && (
          <div 
            className={`theater-drawer-overlay ${drawerOpen ? 'open' : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            <div 
              className={`theater-drawer ${drawerOpen ? 'open' : ''}`}
              onClick={e => e.stopPropagation()}
            >
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
        )}

        {/* ── Floating Windows (GM Only) ── */}
        {!isPlayerView && floatingPanels.map((tab, idx) => {
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
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Heróis</div><CastPanel type="jogador" /></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Ameaças</div><EnemyArsenal /></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>NPCs</div><CastPanel type="npc" /></div>
              </div>
            ); 
            title = 'Elenco & Ameaças'; 
          }
          else if (tab === 'mecanicas') { 
            content = (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Relógios</div><ClockRail /></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Zonas</div><TacticalRadar /></div>
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
            {/* Left: Exit & Director toggle */}
            <div className="theater-topbar-left">
              <div className="theater-workspace-brand" aria-label="Teatro da mesa">
                <span className="theater-workspace-brand-icon"><Sparkles size={18} /></span>
                <span className="theater-workspace-brand-copy">
                  <strong>TEATRO</strong>
                  <small>Mesa cinematográfica</small>
                </span>
              </div>

              <button
                className="theater-exit-btn"
                onClick={() => setViewMode('canvas')}
                title="Voltar para a Mesa de Jogo"
              >
                <DoorOpen size={16} color="var(--accent-primary)" />
                <span className="theater-exit-btn-text">Painel Principal</span>
              </button>

              <div className="theater-topbar-divider" />

              {!isPlayerView && (
                <button
                  className={`theater-director-btn ${drawerOpen ? 'active' : ''}`}
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  title="Abrir Painel do Diretor"
                >
                  <PanelLeft size={15} />
                  <span>Diretor</span>
                </button>
              )}

              {isTvMode && isGM && (
                <button
                  className="theater-tv-badge"
                  onClick={() => setIsTvMode(false)}
                  title="Clique para voltar ao Modo Mestre"
                >
                  <Tv size={13} />
                  <span>Modo Telão / Jogador (Sair)</span>
                </button>
              )}
            </div>

            {/* Center: Scene title & prev/next */}
            <div className="theater-topbar-center">
              {!isPlayerView && (
                <button
                  className="theater-icon-btn"
                  onClick={goToPrevScene}
                  disabled={!hasPrev}
                  style={{ opacity: hasPrev ? 1 : 0.3 }}
                  title="Cena anterior"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div
                className="theater-topbar-title-box"
                onClick={() => {
                  if (!isPlayerView) {
                    setDrawerTab('ambiente');
                    setDrawerOpen(true);
                  }
                }}
                style={{ cursor: isPlayerView ? 'default' : 'pointer' }}
                title={isPlayerView ? 'Cena Atual' : 'Clique para abrir detalhes da cena'}
              >
                <span className="theater-topbar-title-text">
                  {currentScene?.title ?? 'Sem cena ativa'}
                </span>
                {currentScene?.subtitle && (
                  <span className="theater-topbar-sub-text">
                    — {currentScene.subtitle}
                  </span>
                )}
              </div>

              {!isPlayerView && (
                <button
                  className="theater-icon-btn"
                  onClick={goToNextScene}
                  disabled={!hasNext}
                  style={{ opacity: hasNext ? 1 : 0.3 }}
                  title="Próxima cena"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* Right: Quick Stage Mode Toggles & Narration Tools */}
            <div className="theater-topbar-right">
              <button
                className={`theater-icon-btn ${rosterOpen ? 'active' : ''}`}
                onClick={() => setRosterOpen(!rosterOpen)}
                title="Lista de Personagens (Ativar/Desativar na Mesa e Teatro)"
              >
                <Users size={15} color={rosterOpen ? 'var(--accent-primary)' : 'currentColor'} />
              </button>

              <button
                className={`theater-icon-btn ${soundscapeOpen ? 'active' : ''}`}
                onClick={() => setSoundscapeOpen(!soundscapeOpen)}
                title="Jukebox & Efeitos Sonoros / Ambientes Rápidos"
              >
                <Music size={15} color={soundscapeOpen ? 'var(--accent-primary)' : 'currentColor'} />
              </button>

              <button
                className={`theater-icon-btn ${cluesOpen ? 'active' : ''}`}
                onClick={() => setCluesOpen(!cluesOpen)}
                title="Mural de Pistas & Handouts da Cena"
              >
                <BookOpen size={15} color={cluesOpen ? 'var(--accent-primary)' : 'currentColor'} />
              </button>

              <button
                className={`theater-icon-btn ${clocksOpen ? 'active' : ''}`}
                onClick={() => setClocksOpen(!clocksOpen)}
                title="Relógios de Tensão (Ativar na Tela)"
              >
                <Clock size={15} color={clocksOpen ? 'var(--accent-primary)' : 'currentColor'} />
                {clocks.length > 0 && (
                  <span className="theater-badge-counter">{clocks.length}</span>
                )}
              </button>

              {!isPlayerView && (
                <button
                  className={`theater-icon-btn ${secretsOpen ? 'active' : ''}`}
                  onClick={() => setSecretsOpen(!secretsOpen)}
                  title="Segredos do Mestre (Confidencial)"
                >
                  <Lock size={15} color={secretsOpen ? 'var(--danger, #c14e39)' : 'currentColor'} />
                </button>
              )}

              <button
                className={`theater-icon-btn ${chronicleOpen ? 'active' : ''}`}
                onClick={() => setChronicleOpen(!chronicleOpen)}
                title="Feed de Acontecimentos / Log (L)"
              >
                <Scroll size={15} color={chronicleOpen ? 'var(--accent-primary)' : 'currentColor'} />
              </button>

              <div className="theater-topbar-divider" />

              <button
                className={`theater-icon-btn ${kenBurnsActive ? 'active' : ''}`}
                onClick={() => setKenBurnsActive(!kenBurnsActive)}
                title={kenBurnsActive ? 'Câmera Viva Ativa (Ken Burns)' : 'Ativar Câmera Viva (Ken Burns)'}
              >
                <Sparkles size={15} color={kenBurnsActive ? 'var(--accent-primary)' : 'currentColor'} />
              </button>

              {!isPlayerView && (
                <button
                  className={`theater-icon-btn ${isAiActive ? 'active' : ''}`}
                  onClick={() => setIsAiActive(!isAiActive)}
                  title={isAiActive ? 'AI Auto Stage Manager Ativo' : 'Ativar AI Auto Stage Manager'}
                >
                  <Bot size={15} color={isAiActive ? 'var(--accent-primary)' : 'currentColor'} />
                </button>
              )}

              {!isPlayerView && (
                <button
                  className={`theater-icon-btn ${dialogueStudioOpen ? 'active' : ''}`}
                  onClick={() => setDialogueStudioOpen(true)}
                  title="Estúdio de Diálogo Cinematográfico (Falas & Visual Novel)"
                >
                  <MessageSquare size={15} color={dialogueStudioOpen ? 'var(--accent-primary)' : 'currentColor'} />
                </button>
              )}

              <button
                className={`theater-icon-btn ${showHeroCards ? 'active' : ''}`}
                onClick={toggleShowHeroCards}
                title={showHeroCards ? 'Ocultar Cards de Heróis' : 'Exibir Cards de Heróis'}
              >
                <Users size={15} color={showHeroCards ? 'var(--accent-primary)' : 'currentColor'} />
              </button>

              {isGM && (
                <>
                  <div className="theater-topbar-divider" />
                  <button
                    className={`theater-icon-btn ${isTvMode ? 'active' : ''}`}
                    onClick={() => setIsTvMode(!isTvMode)}
                    title={isTvMode ? 'Sair do Modo Telão (Voltar ao Mestre)' : 'Modo Telão / Pré-visualizar como Jogador'}
                  >
                    <Tv size={15} color={isTvMode ? 'var(--accent-primary)' : 'currentColor'} />
                  </button>
                </>
              )}

              <div className="theater-topbar-divider" />

              <button
                className={`theater-icon-btn ${isCinematic ? 'active' : ''}`}
                onClick={() => setIsCinematic(!isCinematic)}
                title={isCinematic ? 'Sair do Modo Cinemático' : 'Modo Cinemático (Ocultar UI)'}
              >
                {isCinematic ? <VideoOff size={15} /> : <Video size={15} />}
              </button>
            </div>
          </div>

          {/* STAGE CONTENT AREA */}
          <div className="theater-stage-content">
            {/* Stage Tension Clocks Floating Overlay */}
            <StageClockOverlay 
              isOpen={clocksOpen} 
              onClose={() => setClocksOpen(false)} 
            />

            {/* Hero Cards — Free Positioned / Party Strip */}
            {members.length > 0 && showHeroCards && (
              <div className="theater-hero-strip">
                {(members.filter(m => m.status === 'jogador').length > 0 
                  ? members.filter(m => m.status === 'jogador') 
                  : members
                ).slice(0, 8).map((m, idx) => (
                  <HeroBadge key={m.caminhoArquivo} member={m} index={idx} />
                ))}
              </div>
            )}

            {/* Active Character Stage Presentation (Oculta se houver diálogo ativo para não sobrepor) */}
            {activeNpc && !activeDialogue && (
              <NpcPortrait
                name={activeNpc.name}
                imageUrl={activeNpc.imageUrl}
                subtitle={activeNpc.subtitle}
                quote={activeNpc.quote}
                type={activeNpc.type}
                onClose={() => setActiveNpc(null)}
              />
            )}
          </div>

          {/* COCKPIT / Director bar (GM Only) */}
          {!isPlayerView && (
            <div className="theater-cockpit-wrapper" style={{ flexShrink: 0 }}>
              <DirectorBar />
            </div>
          )}
        </div>

        {/* Cinematic exit hint */}
        {isCinematic && (
          <button className="theater-cinematic-exit" onClick={() => setIsCinematic(false)}>
            🎬 MODO CINEMÁTICO — clique ou ESC para sair
          </button>
        )}

        {/* Visual Novel Mode */}
        <VisualNovelOverlay />

        {/* Pixabay Universal Media Picker Modal */}
        <PixabayMediaPickerModal
          isOpen={pixabayOpen}
          onClose={() => setPixabayOpen(false)}
          initialQuery={pixabayInitialQuery}
          initialTab={pixabayInitialTab}
        />

        <TheaterCommandPalette />
      </MoodEngine>
    </StageProjectorDropzone>
  );
};
