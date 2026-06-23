const fs = require('fs');

function replace(file, findRegex, replaceStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(findRegex, replaceStr);
  fs.writeFileSync(file, content);
}

replace('src/components/HUD/MindMapWidget.tsx', /Plus, /g, '');
replace('src/components/HUD/OracleWidgetV2.tsx', /Sparkles, /g, '');
replace('src/components/HUD/SettingsModal.tsx', /state, /g, '');
replace('src/components/HUD/TargetTerminal.tsx', /Crosshair, Edit2, BookOpen, ChevronDown, ChevronUp, DollarSign, RefreshCw, Play, Shield, Star, /g, '');
replace('src/components/HUD/TargetTerminal.tsx', /const \[isWikiLoading, setIsWikiLoading\] = useState\(false\);/g, 'const [, setIsWikiLoading] = useState(false);');
replace('src/components/HUD/TargetTerminal.tsx', /justifyContent: 'justifySpace'/g, "justifyContent: 'space-between'");

replace('src/components/HUD/TensionClockWidget.tsx', /Settings, /g, '');
replace('src/components/HUD/WorldEngineWidget.tsx', /Shield, /g, '');

replace('src/components/Theater/CastPanel.tsx', /import \{ Plus \} from 'lucide-react';\r?\n/g, '');
replace('src/components/Theater/DirectorBar.tsx', /Plus, /g, '');
replace('src/components/Theater/DirectorBar.tsx', /const \{ currentScene, goToNextScene, goToPrevScene \} = useSceneState\(\);/g, 'const { currentScene, goToNextScene } = useSceneState();');

replace('src/components/Theater/EnemyBoard.tsx', /const \{ cast, updateCastMember, toggleCastCondition \} = useCastData\(\);/g, 'const { cast, updateCastMember } = useCastData();');

replace('src/components/Theater/hooks/useSceneState.ts', /import type \{ MoodType, WeatherType, TimeOfDay \} from '..\/..\/..\/store';\r?\n/g, '');

replace('src/components/Theater/MoodEngine.tsx', /import React, \{ useEffect, useRef \} from 'react';\r?\n/g, 'import React from \'react\';\n');

replace('src/components/Theater/NarrativeTrack.tsx', /const MOOD_LABELS = \{[^\}]+\};\r?\n/g, '');
replace('src/components/Theater/NarrativeTrack.tsx', /const WEATHER_LABELS = \{[^\}]+\};\r?\n/g, '');
replace('src/components/Theater/NarrativeTrack.tsx', /currentScene, /g, '');
replace('src/components/Theater/NarrativeTrack.tsx', /const i = /g, 'const _i = ');

replace('src/components/Theater/ScenePanel.tsx', /updateTheaterState, /g, '');
replace('src/components/Theater/ScenePanel.tsx', /TheaterObjective, /g, '');
replace('src/components/Theater/ScenePanel.tsx', /theaterData, /g, '');
replace('src/components/Theater/ScenePanel.tsx', /const accentColor = /g, 'const _accentColor = ');

replace('src/components/Theater/SessionDiary.tsx', /Filter, /g, '');

replace('src/components/Wiki/MindMap.tsx', /import React, \{ useState \} from 'react';/g, 'import React from \'react\';');
replace('src/components/Wiki/MindMap.tsx', /const \[nodes, setNodes\] = /g, 'const [nodes, _setNodes] = ');

replace('src/components/Wiki/WikiGraph.tsx', /const \[_trigger, setTrigger\] = useState\(0\);/g, 'const [, setTrigger] = useState(0);');

replace('src/components/Wiki/WikiViewer.tsx', /import ReactMarkdown from 'react-markdown';\r?\nimport remarkGfm from 'remark-gfm';\r?\n/g, '');
replace('src/components/Wiki/WikiViewer.tsx', /Plus, /g, '');

replace('src/engine/GameCanvas.tsx', /AlphaFilter, /g, '');
replace('src/engine/GameCanvas.tsx', /addTensionClock, removeTensionClock, updateTensionClockProps, triggerClockConsequence/g, '');
replace('src/engine/GameCanvas.tsx', /const isGM = /g, '// const isGM = ');

replace('src/rules/FateParser.ts', /const name = /g, 'const _name = ');

replace('src/services/oracle/LocationParser.ts', /p =>/g, '(p: any) =>');
replace('src/services/oracle/LootParser.ts', /p =>/g, '(p: any) =>');
replace('src/services/oracle/NPCParser.ts', /p =>/g, '(p: any) =>');

replace('src/store/index.ts', /times\?: number/g, '');

// Fix 'string | undefined' in TargetTerminal
let tt = fs.readFileSync('src/components/HUD/TargetTerminal.tsx', 'utf8');
tt = tt.replace(/async \(\) => \{\r?\n\s*if \(!targetId\) return;/g, 'async () => {\n    if (!targetId) return;');
tt = tt.replace(/fetchCharData\(targetId\);/g, 'fetchCharData(targetId || \'\');');
tt = tt.replace(/loadMarkdownFile\(wikiPath\)/g, 'loadMarkdownFile(wikiPath || \'\')');
tt = tt.replace(/wikiPath \? await loadMarkdownFile\(wikiPath\) : null/g, 'wikiPath ? await loadMarkdownFile(wikiPath || \'\') : null');
tt = tt.replace(/updateData\((targetId),/g, 'updateData($1 || \'\',');
fs.writeFileSync('src/components/HUD/TargetTerminal.tsx', tt);

// Fix CastMember status
let cm = fs.readFileSync('src/components/Theater/hooks/useCastData.ts', 'utf8');
cm = cm.replace(/status: string;/g, 'status: "npc" | "jogador" | "inimigo";');
fs.writeFileSync('src/components/Theater/hooks/useCastData.ts', cm);
