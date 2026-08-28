import React, { Suspense } from 'react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { ErrorBoundary } from '../ErrorBoundary';
import { CommandPalette } from '../UI/CommandPalette';
import { useCommandRegistry } from '../../store';
import { ShieldAlert } from 'lucide-react';
import { AppProvider as SoundboardProvider } from '../Soundboard/store';
import { FloatingVoiceHUD } from './FloatingVoiceHUD';

// Lazy loading individual widgets
const OracleWidgetV2 = React.lazy(() => import('../Widgets/Generators/OracleWidgetV2').then(m => ({ default: m.OracleWidgetV2 })));
const NPCGeneratorWidget = React.lazy(() => import('../Widgets/Generators/NPCGeneratorWidget').then(m => ({ default: m.NPCGeneratorWidget })));
const LocationGeneratorWidget = React.lazy(() => import('../Widgets/Generators/LocationGeneratorWidget').then(m => ({ default: m.LocationGeneratorWidget })));
const EncounterWidget = React.lazy(() => import('../Widgets/GameMaster/EncounterWidget').then(m => ({ default: m.EncounterWidget })));
const CampaignManagerWidget = React.lazy(() => import('../Widgets/GameMaster/CampaignManagerWidget').then(m => ({ default: m.CampaignManagerWidget })));
const AutomatedDiceWidget = React.lazy(() => import('../Widgets/PlayerTools/AutomatedDiceWidget').then(m => ({ default: m.AutomatedDiceWidget })));
const CharacterRosterWidget = React.lazy(() => import('../Widgets/PlayerTools/CharacterRosterWidget').then(m => ({ default: m.CharacterRosterWidget })));
const ChronosWidget = React.lazy(() => import('../Widgets/GameMaster/ChronosWidget').then(m => ({ default: m.ChronosWidget })));
const ChronicleWidget = React.lazy(() => import('../Widgets/GameMaster/ChronicleWidget').then(m => ({ default: m.ChronicleWidget })));
const LineageWidget = React.lazy(() => import('../Widgets/GameMaster/Lineage/LineageWidget').then(m => ({ default: m.LineageWidget })));
const LoreMachineWidget = React.lazy(() => import('../Widgets/Generators/LoreMachineWidget').then(m => ({ default: m.LoreMachineWidget })));
const WorldEngineWidget = React.lazy(() => import('../Widgets/Generators/WorldEngineWidget').then(m => ({ default: m.WorldEngineWidget })));
const EntityForgeWidget = React.lazy(() => import('./EntityForgeWidget').then(m => ({ default: m.EntityForgeWidget })));
const StrongholdWidget = React.lazy(() => import('../Widgets/Generators/StrongholdWidget').then(m => ({ default: m.StrongholdWidget })));
const ArsenalMestreWidget = React.lazy(() => import('../Widgets/GameMaster/ArsenalMestreWidget').then(m => ({ default: m.ArsenalMestreWidget })));
const AudioDirectorWidget = React.lazy(() => import('../Widgets/System/AudioDirectorWidget').then(m => ({ default: m.AudioDirectorWidget })));
const AudioDirectorCompactWidget = React.lazy(() => import('../Widgets/System/AudioDirectorWidget').then(m => ({ default: m.AudioDirectorCompactWidget })));
const WebFrameWidget = React.lazy(() => import('./WebFrameWidget').then(m => ({ default: m.WebFrameWidget })));
const DiceRollerWidget = React.lazy(() => import('../Widgets/PlayerTools/DiceRollerWidget').then(m => ({ default: m.DiceRollerWidget })));
const AIStudioWidget = React.lazy(() => import('../Widgets/GameMaster/AIStudioWidget').then(m => ({ default: m.AIStudioWidget })));
const TradeShopWidget = React.lazy(() => import('../Widgets/PlayerTools/TradeShopWidget').then(m => ({ default: m.TradeShopWidget })));
const PlayerManagerWidget = React.lazy(() => import('../Widgets/GameMaster/PlayerManagerWidget').then(m => ({ default: m.PlayerManagerWidget })));
const AuditorWidget = React.lazy(() => import('../Widgets/System/AuditorWidget').then(m => ({ default: m.AuditorWidget })));
const ConspiracyBoardWidget = React.lazy(() => import('../Widgets/ConspiracyBoard/ConspiracyBoardWidget').then(m => ({ default: m.ConspiracyBoardWidget })));
const GMNotesWidget = React.lazy(() => import('../Widgets/GameMaster/GMNotesWidget').then(m => ({ default: m.GMNotesWidget })));
const StoryDiceWidget = React.lazy(() => import('../Widgets/Generators/StoryDiceWidget').then(m => ({ default: m.StoryDiceWidget })));
const SSStoryDiceWidget = React.lazy(() => import('../Widgets/Generators/SSStoryDiceWidget').then(m => ({ default: m.StoryDiceWidget })));
const StoryBilderDeckWidget = React.lazy(() => import('../Widgets/Generators/StoryBilderDeckWidget').then(m => ({ default: m.StoryBilderDeckWidget })));
const RoomManagerWidget = React.lazy(() => import('../Widgets/System/RoomManagerWidget').then(m => ({ default: m.RoomManagerWidget })));
const MasterForgeWidget = React.lazy(() => import('../Widgets/Generators/MasterForgeWidget').then(m => ({ default: m.MasterForgeWidget })));
const VoiceRoomWidget = React.lazy(() => import('../Widgets/System/VoiceRoomWidget').then(m => ({ default: m.VoiceRoomWidget })));
const RadioWidget = React.lazy(() => import('../Widgets/System/RadioWidget').then(m => ({ default: m.RadioWidget })));

const FallbackLoader = () => (
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'rgba(15,23,42,0.92)', padding: '8px 16px', borderRadius: '8px', color: '#ffd980', zIndex: 9999, border: '1px solid rgba(217,164,65,0.35)', backdropFilter: 'blur(8px)', fontSize: '0.8rem', fontWeight: 600, pointerEvents: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
    Carregando módulo…
  </div>
);

export const WidgetLayer: React.FC<{ standaloneWidget?: string }> = React.memo(({ standaloneWidget }) => {
  const storeOpenWindows = useWindowManager((state) => state.openWindows);
  const closeWindow = useWindowManager((state) => state.closeWindow);
  const openWindow = useWindowManager((state) => state.openWindow);
  const registerCommand = useCommandRegistry((state) => state.registerCommand);

  // If running in popout/standalone mode, we only open the requested widget!
  const openWindows = standaloneWidget 
    ? { [standaloneWidget]: true } 
    : storeOpenWindows;

  React.useEffect(() => {
    // Register standard window toggle commands into CommandPalette
    registerCommand({
      id: 'toggle-dice',
      title: 'Abrir Rolador de Dados',
      category: 'Ferramentas',
      onSelect: () => openWindow('diceRoller')
    });
    registerCommand({
      id: 'toggle-master-forge',
      title: 'Abrir A Forja do Mestre (Geradores)',
      category: 'Mestre',
      onSelect: () => openWindow('masterForge'),
    });
    registerCommand({
      id: 'toggle-ai-studio',
      title: 'Abrir AI Studio do Mestre',
      category: 'Mestre',
      onSelect: () => openWindow('aiStudio'),
    });
    registerCommand({
      id: 'toggle-chronos',
      title: 'Abrir Motor Chronos (Calendário e Tempo)',
      category: 'Mestre',
      onSelect: () => openWindow('chronos')
    });
    registerCommand({
      id: 'toggle-campaign',
      title: 'Abrir Gestor de Campanhas',
      category: 'Mestre',
      onSelect: () => openWindow('campaignManager')
    });
    registerCommand({
      id: 'toggle-chronicle',
      title: 'Abrir Chronica — Linha do Tempo',
      category: 'Mestre',
      onSelect: () => openWindow('chronicle')
    });
    registerCommand({
      id: 'toggle-lineage',
      title: 'Abrir Linhagem — Atlas de Casas e Dinastias',
      category: 'Mestre',
      onSelect: () => openWindow('lineage')
    });
    registerCommand({
      id: 'toggle-soundboard',
      title: 'Abrir Soundboard Principal',
      category: 'Áudio',
      onSelect: () => openWindow('audioDirector')
    });
    registerCommand({
      id: 'toggle-ambient-radio',
      title: 'Abrir Rádio Ambiente & Climas',
      category: 'Áudio',
      onSelect: () => openWindow('ambientRadio')
    });
  }, [registerCommand, openWindow]);

  const hasAudioOpen = Boolean(openWindows.audioDirector || openWindows.audioDirectorCompact);

  return (
    <Suspense fallback={<FallbackLoader />}>
      <ErrorBoundary fallback={<div style={{position: 'fixed', bottom: 10, right: 10, background: 'rgba(239,68,68,0.2)', padding: 10, borderRadius: 8, color: '#fca5a5', zIndex: 999999, display: 'flex', gap: 6, alignItems: 'center'}}><ShieldAlert size={16}/> Erro ao carregar um dos widgets.</div>}>
        <CommandPalette />
        <div className="widgets-layer" style={{ pointerEvents: 'none' }}>
        {openWindows.oracle && <OracleWidgetV2 onClose={() => closeWindow('oracle')} />}
        {openWindows.npcGenerator && <NPCGeneratorWidget onClose={() => closeWindow('npcGenerator')} />}
        {openWindows.locationGenerator && <LocationGeneratorWidget onClose={() => closeWindow('locationGenerator')} />}
        {openWindows.encounterGenerator && <EncounterWidget onClose={() => closeWindow('encounterGenerator')} />}
        {openWindows.campaignManager && <CampaignManagerWidget onClose={() => closeWindow('campaignManager')} />}
        {openWindows.automatedDice && <AutomatedDiceWidget onClose={() => closeWindow('automatedDice')} />}
        {openWindows.characterRoster && <CharacterRosterWidget onClose={() => closeWindow('characterRoster')} />}
        {openWindows.chronos && <ChronosWidget onClose={() => closeWindow('chronos')} />}
        {openWindows.chronicle && <ChronicleWidget onClose={() => closeWindow('chronicle')} />}
        {openWindows.lineage && <LineageWidget onClose={() => closeWindow('lineage')} />}
        {openWindows.loreMachine && <LoreMachineWidget onClose={() => closeWindow('loreMachine')} />}
        {openWindows.worldEngine && <WorldEngineWidget onClose={() => closeWindow('worldEngine')} />}
        {openWindows.entityForge && <EntityForgeWidget onClose={() => closeWindow('entityForge')} />}
        {openWindows.stronghold && <StrongholdWidget onClose={() => closeWindow('stronghold')} />}
        {openWindows.arsenalMestre && <ArsenalMestreWidget onClose={() => closeWindow('arsenalMestre')} />}
        {hasAudioOpen && (
          <SoundboardProvider>
            {openWindows.audioDirector && <AudioDirectorWidget onClose={() => closeWindow('audioDirector')} />}
            {openWindows.audioDirectorCompact && <AudioDirectorCompactWidget onClose={() => closeWindow('audioDirectorCompact')} onExpand={() => { closeWindow('audioDirectorCompact'); openWindow('audioDirector'); }} />}
          </SoundboardProvider>
        )}
        {openWindows.webFrame && <WebFrameWidget onClose={() => closeWindow('webFrame')} zIndex={999} onFocus={() => {}} />}
        {openWindows.diceRoller && <DiceRollerWidget onClose={() => closeWindow('diceRoller')} />}
        {openWindows.aiStudio && <AIStudioWidget onClose={() => closeWindow('aiStudio')} />}
        {openWindows.tradeShop && <TradeShopWidget onClose={() => closeWindow('tradeShop')} />}
        {openWindows.playerManager && <PlayerManagerWidget onClose={() => closeWindow('playerManager')} />}
        {openWindows.systemAuditor && <AuditorWidget onClose={() => closeWindow('systemAuditor')} />}
        {openWindows.storyBilderDeck && <StoryBilderDeckWidget onClose={() => closeWindow('storyBilderDeck')} />}
        {openWindows.mindMap && <ConspiracyBoardWidget onClose={() => closeWindow('mindMap')} />}
        {openWindows.gmNotes && <GMNotesWidget onClose={() => closeWindow('gmNotes')} />}
        {openWindows.storyDice && <StoryDiceWidget onClose={() => closeWindow('storyDice')} />}
        {openWindows.ssStoryDice && <SSStoryDiceWidget onClose={() => closeWindow('ssStoryDice')} />}
        {openWindows.roomManager && <RoomManagerWidget onClose={() => closeWindow('roomManager')} />}
        {openWindows.masterForge && <MasterForgeWidget onClose={() => closeWindow('masterForge')} />}
        {openWindows.voiceRoom && <VoiceRoomWidget onClose={() => closeWindow('voiceRoom')} />}
        {openWindows.ambientRadio && <RadioWidget onClose={() => closeWindow('ambientRadio')} />}
        <FloatingVoiceHUD />
        </div>
      </ErrorBoundary>
    </Suspense>
  );
});
