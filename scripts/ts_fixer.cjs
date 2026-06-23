const fs = require('fs');

function replaceAll(file, findRegex, replaceStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(findRegex, replaceStr);
  fs.writeFileSync(file, content);
}

replaceAll('src/components/HUD/AutomatedDiceWidget.tsx', /vasculharCadaver,/g, '');
replaceAll('src/components/HUD/CampaignManagerWidget.tsx', /useCallback,/g, '');
replaceAll('src/components/HUD/CampaignManagerWidget.tsx', /createCampaign,/g, '');
replaceAll('src/components/HUD/CampaignManagerWidget.tsx', /Search,/g, '');
replaceAll('src/components/HUD/CampaignManagerWidget.tsx', /CheckSquare,/g, '');
replaceAll('src/components/HUD/CampaignManagerWidget.tsx', /PlusCircle,/g, '');
replaceAll('src/components/HUD/CampaignManagerWidget.tsx', /MinusCircle,/g, '');
replaceAll('src/components/HUD/CharacterRosterWidget.tsx', /Heart,/g, '');
replaceAll('src/components/HUD/ChronosWidget.tsx', /Sunset,/g, '');
replaceAll('src/components/HUD/ChronosWidget.tsx', /Coffee,/g, '');
replaceAll('src/components/HUD/ClockConfigModal.tsx', /X,/g, '');
replaceAll('src/components/HUD/CombatTracker.tsx', /Activity,/g, '');
replaceAll('src/components/HUD/CombatTracker.tsx', /import type \{ CombatCondition \} from '\.\.\/\.\.\/store';/g, '');
replaceAll('src/components/HUD/DLCManagerWidget.tsx', /AlertCircle,/g, '');
replaceAll('src/components/HUD/DLCManagerWidget.tsx', /const \[availableDLCs, setAvailableDLCs\] = /g, 'const [availableDLCs, _setAvailableDLCs] = ');
replaceAll('src/components/HUD/DraggableWindow.tsx', /useEffect,/g, '');
replaceAll('src/components/HUD/LoreMachineWidget.tsx', /ToyBrick,/g, '');
replaceAll('src/components/HUD/LoreMachineWidget.tsx', /const activeMods = /g, 'const _activeMods = ');
replaceAll('src/components/HUD/MapSettingsPanel.tsx', /AlignCenter,/g, '');
replaceAll('src/components/HUD/MapSettingsPanel.tsx', /AlignHorizontalSpaceAround,/g, '');
replaceAll('src/components/HUD/MindMapWidget.tsx', /Network,/g, '');
replaceAll('src/components/HUD/MindMapWidget.tsx', /FolderOpen,/g, '');
replaceAll('src/components/HUD/OracleWidgetV2.tsx', /Sparkles,/g, '');
replaceAll('src/components/HUD/SettingsModal.tsx', /state,/g, '');

let tt = fs.readFileSync('src/components/HUD/TargetTerminal.tsx', 'utf8');
tt = tt.replace(/Crosshair, Edit2, BookOpen, ChevronDown, ChevronUp, DollarSign, RefreshCw, Play, Shield, Star,/g, '');
tt = tt.replace(/const \[isWikiLoading, setIsWikiLoading\] = useState\(false\);/g, 'const [, setIsWikiLoading] = useState(false);');
tt = tt.replace(/justifyContent: 'justifySpace'/g, "justifyContent: 'space-between'");
tt = tt.replace(/fetchCharData\(targetId\);/g, "fetchCharData(targetId || '');");
tt = tt.replace(/loadMarkdownFile\(wikiPath\)/g, "loadMarkdownFile(wikiPath || '')");
tt = tt.replace(/wikiPath \? await loadMarkdownFile\(wikiPath\) : null/g, "wikiPath ? await loadMarkdownFile(wikiPath || '') : null");
tt = tt.replace(/updateData\(targetId,/g, "updateData(targetId || '',");
tt = tt.replace(/const data = await fetchCharData\(targetId\);/g, "const data = await fetchCharData(targetId || '');");
tt = tt.replace(/const mdText = await loadMarkdownFile\(wikiPath\);/g, "const mdText = await loadMarkdownFile(wikiPath || '');");
tt = tt.replace(/await updateData\(targetId,/g, "await updateData(targetId || '',");
tt = tt.replace(/await loadMarkdownFile\(wikiPath\)/g, "await loadMarkdownFile(wikiPath || '')");
fs.writeFileSync('src/components/HUD/TargetTerminal.tsx', tt);

replaceAll('src/components/HUD/TensionClockWidget.tsx', /Settings,/g, '');

replaceAll('src/components/Theater/CastPanel.tsx', /Plus,/g, '');
replaceAll('src/components/Theater/DirectorBar.tsx', /goToPrevScene,/g, '');
replaceAll('src/components/Theater/EnemyBoard.tsx', /toggleCastCondition,/g, '');

let ucd = fs.readFileSync('src/components/Theater/hooks/useCastData.ts', 'utf8');
ucd = ucd.replace(/status: string;/g, 'status: "npc" | "jogador" | "inimigo";');
fs.writeFileSync('src/components/Theater/hooks/useCastData.ts', ucd);

replaceAll('src/components/Theater/hooks/useSceneState.ts', /MoodType, WeatherType, TimeOfDay/g, '');
replaceAll('src/components/Theater/NarrativeTrack.tsx', /MOOD_LABELS/g, '_MOOD_LABELS');
replaceAll('src/components/Theater/NarrativeTrack.tsx', /WEATHER_LABELS/g, '_WEATHER_LABELS');
replaceAll('src/components/Theater/NarrativeTrack.tsx', /const \{ currentScene, patchCurrentScene \} = useSceneState\(\);/g, 'const { patchCurrentScene } = useSceneState();');
replaceAll('src/components/Theater/NarrativeTrack.tsx', /const i = /g, 'const _i = ');

replaceAll('src/components/Theater/ScenePanel.tsx', /theaterData,/g, '');
replaceAll('src/components/Theater/ScenePanel.tsx', /const _accentColor = 'var\(--theater-accent, #a855f7\)';/g, '');

replaceAll('src/components/Wiki/MindMap.tsx', /useState,/g, '');
replaceAll('src/components/Wiki/MindMap.tsx', /const \[nodes, setNodes\] = /g, 'const [nodes, _setNodes] = ');

replaceAll('src/components/Wiki/WikiGraph.tsx', /const \[_trigger, setTrigger\] = useState\(0\);/g, 'const [, setTrigger] = useState(0);');

replaceAll('src/engine/GameCanvas.tsx', /AlphaFilter,/g, '');

replaceAll('src/rules/FateParser.ts', /const name = /g, 'const _name = ');

replaceAll('src/store/index.ts', /times\?: number/g, '');

console.log("All fixes applied.");
