import React, { Suspense } from 'react';
import { useWindowManager } from '../../hooks/useWindowManager';
import { ErrorBoundary } from '../ErrorBoundary';
import { CommandPalette } from '../UI/CommandPalette';
import { useCommandRegistry } from '../../store';
import { ShieldAlert } from 'lucide-react';

// Lazy loaded widgets
const OracleWidgetV2 = React.lazy(() => import('../Widgets/Generators/OracleWidgetV2').then(m => ({ default: m.OracleWidgetV2 })));
const NPCGeneratorWidget = React.lazy(() => import('../Widgets/Generators/NPCGeneratorWidget').then(m => ({ default: m.NPCGeneratorWidget })));
const LocationGeneratorWidget = React.lazy(() => import('../Widgets/Generators/LocationGeneratorWidget').then(m => ({ default: m.LocationGeneratorWidget })));
const EncounterWidget = React.lazy(() => import('../Widgets/GameMaster/EncounterWidget').then(m => ({ default: m.EncounterWidget })));
const CampaignManagerWidget = React.lazy(() => import('../Widgets/GameMaster/CampaignManagerWidget').then(m => ({ default: m.CampaignManagerWidget })));
const MapasMentaisWidget = React.lazy(() => import('../Widgets/PlayerTools/MindMapWidget').then(m => ({ default: m.MapasMentaisWidget })));
const AutomatedDiceWidget = React.lazy(() => import('../Widgets/PlayerTools/AutomatedDiceWidget').then(m => ({ default: m.AutomatedDiceWidget })));
const CharacterRosterWidget = React.lazy(() => import('../Widgets/PlayerTools/CharacterRosterWidget').then(m => ({ default: m.CharacterRosterWidget })));
const ChronosWidget = React.lazy(() => import('../Widgets/GameMaster/ChronosWidget').then(m => ({ default: m.ChronosWidget })));
const LoreMachineWidget = React.lazy(() => import('../Widgets/Generators/LoreMachineWidget').then(m => ({ default: m.LoreMachineWidget })));
const DLCManagerWidget = React.lazy(() => import('../Widgets/System/DLCManagerWidget').then(m => ({ default: m.DLCManagerWidget })));
const WorldEngineWidget = React.lazy(() => import('../Widgets/Generators/WorldEngineWidget').then(m => ({ default: m.WorldEngineWidget })));
const EntityForgeWidget = React.lazy(() => import('./EntityForgeWidget').then(m => ({ default: m.EntityForgeWidget })));
const StrongholdWidget = React.lazy(() => import('../Widgets/Generators/StrongholdWidget').then(m => ({ default: m.StrongholdWidget })));
const ArsenalMestreWidget = React.lazy(() => import('../Widgets/GameMaster/ArsenalMestreWidget').then(m => ({ default: m.ArsenalMestreWidget })));
const AudioDirectorWidget = React.lazy(() => import('../Widgets/System/AudioDirectorWidget').then(m => ({ default: m.AudioDirectorWidget })));
const WebFrameWidget = React.lazy(() => import('./WebFrameWidget').then(m => ({ default: m.WebFrameWidget })));
const DiceRollerWidget = React.lazy(() => import('../Widgets/PlayerTools/DiceRollerWidget').then(m => ({ default: m.DiceRollerWidget })));
const AIStudioWidget = React.lazy(() => import('../Widgets/GameMaster/AIStudioWidget').then(m => ({ default: m.AIStudioWidget })));
const TradeShopWidget = React.lazy(() => import('../Widgets/PlayerTools/TradeShopWidget').then(m => ({ default: m.TradeShopWidget })));
const AuditorWidget = React.lazy(() => import('../Widgets/System/AuditorWidget').then(m => ({ default: m.AuditorWidget })));

const FallbackLoader = () => (
  <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(15,23,42,0.9)', padding: '20px', borderRadius: '12px', color: '#fff', zIndex: 9999 }}>
    Carregando Módulo...
  </div>
);

export const WidgetLayer: React.FC = React.memo(() => {
  const openWindows = useWindowManager((state) => state.openWindows);
  const closeWindow = useWindowManager((state) => state.closeWindow);
  const openWindow = useWindowManager((state) => state.openWindow);
  const registerCommand = useCommandRegistry((state) => state.registerCommand);

  React.useEffect(() => {
    registerCommand({
      id: 'sys_auditor',
      title: 'Auditor de Sistema (Linter IA)',
      category: 'System',
      icon: <ShieldAlert size={16} />,
      onSelect: () => openWindow('systemAuditor')
    });
  }, [registerCommand, openWindow]);

  return (
    <>
      <CommandPalette />
      <Suspense fallback={<FallbackLoader />}>
        <ErrorBoundary fallbackMessage="Falha ao carregar Módulo da Central.">
          {openWindows.oracle && <OracleWidgetV2 onClose={() => closeWindow('oracle')} />}
          {openWindows.npcGenerator && <NPCGeneratorWidget onClose={() => closeWindow('npcGenerator')} />}
          {openWindows.locationGenerator && <LocationGeneratorWidget onClose={() => closeWindow('locationGenerator')} />}
          {openWindows.encounterGenerator && <EncounterWidget onClose={() => closeWindow('encounterGenerator')} />}
          {openWindows.campaignManager && <CampaignManagerWidget onClose={() => closeWindow('campaignManager')} />}
          {openWindows.mindMap && <MapasMentaisWidget onClose={() => closeWindow('mindMap')} />}
          {openWindows.automatedDice && <AutomatedDiceWidget onClose={() => closeWindow('automatedDice')} />}
          {openWindows.characterRoster && <CharacterRosterWidget onClose={() => closeWindow('characterRoster')} />}
          {openWindows.chronos && <ChronosWidget onClose={() => closeWindow('chronos')} />}
          {openWindows.loreMachine && <LoreMachineWidget onClose={() => closeWindow('loreMachine')} />}
          {openWindows.dlcManager && <DLCManagerWidget onClose={() => closeWindow('dlcManager')} />}
          {openWindows.worldEngine && <WorldEngineWidget onClose={() => closeWindow('worldEngine')} />}
          {openWindows.entityForge && <EntityForgeWidget onClose={() => closeWindow('entityForge')} />}
          {openWindows.stronghold && <StrongholdWidget onClose={() => closeWindow('stronghold')} />}
          {openWindows.arsenalMestre && <ArsenalMestreWidget onClose={() => closeWindow('arsenalMestre')} />}
          {openWindows.audioDirector && <AudioDirectorWidget onClose={() => closeWindow('audioDirector')} />}
          {openWindows.webFrame && <WebFrameWidget onClose={() => closeWindow('webFrame')} zIndex={999} onFocus={() => {}} />}
          {openWindows.diceRoller && <DiceRollerWidget onClose={() => closeWindow('diceRoller')} />}
          {openWindows.aiStudio && <AIStudioWidget onClose={() => closeWindow('aiStudio')} />}
          {openWindows.tradeShop && <TradeShopWidget onClose={() => closeWindow('tradeShop')} />}
          {openWindows.systemAuditor && <AuditorWidget onClose={() => closeWindow('systemAuditor')} />}
        </ErrorBoundary>
      </Suspense>
    </>
  );
});
