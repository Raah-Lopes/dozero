const fs = require('fs');

let code;

try {
  code = fs.readFileSync('src/App.tsx', 'utf8');
  code = code.replace(/import React, \{ useState, useEffect, Suspense \} from 'react';/, "import { useState, useEffect, Suspense } from 'react';");
  code = code.replace(/const \[isReady, setIsReady\] = useState\(false\);/, 'const [isReady, ] = useState(false);');
  code = code.replace(/prev =>/g, '(prev: any) =>');
  code = code.replace(/d =>/g, '(d: any) =>');
  code = code.replace(/\(doc, index\) =>/g, '(doc: any, index: any) =>');
  code = code.replace(/id =>/g, '(id: any) =>');
  code = code.replace(/showCombatLog/g, 'CombatLog');
  fs.writeFileSync('src/App.tsx', code);
} catch (e) { console.error('App.tsx error', e); }

try {
  code = fs.readFileSync('src/components/HUD/ArsenalMestreWidget.tsx', 'utf8');
  code = code.replace(/import \{ ShieldAlert, Shield, Zap, Sparkles, Heart, HeartPulse, Coins, CheckCircle, Eye, EyeOff, Skull, Compass, Backpack, AlertTriangle \} from 'lucide-react';/, "import { AlertTriangle } from 'lucide-react';");
  code = code.replace(/const isLoading = /g, 'const _isLoading = ');
  code = code.replace(/wiki\.triggerRefresh\(\)/g, 'wiki.refresh()');
  fs.writeFileSync('src/components/HUD/ArsenalMestreWidget.tsx', code);
} catch (e) { console.error('ArsenalMestreWidget error', e); }

try {
  code = fs.readFileSync('src/components/HUD/TargetTerminal.tsx', 'utf8');
  code = code.replace(/import \{ Crosshair, Edit2, BookOpen, ChevronDown, ChevronUp, DollarSign, RefreshCw, Play, Shield, Star, Image as ImageIcon, Link, X, ExternalLink, Save \} from 'lucide-react';/, "import { Image as ImageIcon, Link, X, ExternalLink, Save } from 'lucide-react';");
  code = code.replace(/const \[isWikiLoading, setIsWikiLoading\] = useState\(false\);/, 'const [, setIsWikiLoading] = useState(false);');
  code = code.replace(/fetchCharData\(targetId\)/g, "fetchCharData(targetId || '')");
  code = code.replace(/loadMarkdownFile\(wikiPath\)/g, "loadMarkdownFile(wikiPath || '')");
  code = code.replace(/updateData\(targetId, /g, "updateData(targetId || '', ");
  code = code.replace(/justifyContent: 'justifySpace'/g, "justifyContent: 'space-between'");
  fs.writeFileSync('src/components/HUD/TargetTerminal.tsx', code);
} catch (e) { console.error('TargetTerminal error', e); }

try {
  code = fs.readFileSync('src/components/HUD/AutomatedDiceWidget.tsx', 'utf8');
  code = code.replace(/import \{ getWikiConfig \} from '\.\.\/\.\.\/store\/world';/, '');
  code = code.replace(/import \{ Zap, Shield, Plus, HeartPulse, Coins, Sparkles, RefreshCcw, Hand, Eye \} from 'lucide-react';/, "import { Sparkles, RefreshCcw, Hand, Eye } from 'lucide-react';");
  code = code.replace(/const executarAtaqueInteligente = /g, 'const _executarAtaqueInteligente = ');
  code = code.replace(/const executarCuraInteligente = /g, 'const _executarCuraInteligente = ');
  code = code.replace(/const vasculharCadaver = /g, 'const _vasculharCadaver = ');
  fs.writeFileSync('src/components/HUD/AutomatedDiceWidget.tsx', code);
} catch (e) { console.error('AutomatedDiceWidget error', e); }

try {
  code = fs.readFileSync('src/components/HUD/CampaignManagerWidget.tsx', 'utf8');
  code = code.replace(/import \{ useCallback, useState \} from 'react';/, "import { useState } from 'react';");
  code = code.replace(/import \{ Folder, FileText, Plus, Trash2, Edit3, Image as ImageIcon, Calendar, MinusCircle, BookOpen \} from 'lucide-react';/, "import { Folder, FileText, Plus, Trash2, Edit3, Image as ImageIcon, Calendar, BookOpen } from 'lucide-react';");
  fs.writeFileSync('src/components/HUD/CampaignManagerWidget.tsx', code);
} catch (e) { console.error('CampaignManagerWidget error', e); }

try {
  code = fs.readFileSync('src/components/HUD/ChronosWidget.tsx', 'utf8');
  code = code.replace(/import \{ Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, Map, Shield, Coffee, Sunrise \} from 'lucide-react';/, "import { Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, Map, Shield, Sunrise } from 'lucide-react';");
  fs.writeFileSync('src/components/HUD/ChronosWidget.tsx', code);
} catch (e) { console.error('ChronosWidget error', e); }

try {
  code = fs.readFileSync('src/components/HUD/CombatTracker.tsx', 'utf8');
  code = code.replace(/import \{ Activity, Shield, Sword, Heart, Clock, Play, SkipForward, Users, Settings \} from 'lucide-react';/, "import { Shield, Sword, Heart, Clock, Play, SkipForward, Users, Settings } from 'lucide-react';");
  code = code.replace(/import type \{ CombatCondition \} from '\.\.\/\.\.\/store';/, '');
  code = code.replace(/import type \{ CombatCondition \} from '\.\.\/\.\.\/store\/combat';/, '');
  fs.writeFileSync('src/components/HUD/CombatTracker.tsx', code);
} catch (e) { console.error('CombatTracker error', e); }

try {
  code = fs.readFileSync('src/components/HUD/DLCManagerWidget.tsx', 'utf8');
  code = code.replace(/import \{ AlertCircle, Box, CheckCircle, DownloadCloud, ExternalLink, Settings, XCircle \} from 'lucide-react';/, "import { Box, CheckCircle, DownloadCloud, ExternalLink, Settings, XCircle } from 'lucide-react';");
  fs.writeFileSync('src/components/HUD/DLCManagerWidget.tsx', code);
} catch (e) { console.error('DLCManager error', e); }

try {
  code = fs.readFileSync('src/components/HUD/DraggableWindow.tsx', 'utf8');
  code = code.replace(/import React, \{ useState, useEffect, ReactNode, useRef \} from 'react';/, "import React, { useState, ReactNode, useRef } from 'react';");
  fs.writeFileSync('src/components/HUD/DraggableWindow.tsx', code);
} catch (e) { console.error('DraggableWindow error', e); }

try {
  code = fs.readFileSync('src/components/HUD/LoreMachineWidget.tsx', 'utf8');
  code = code.replace(/import \{ Book, MessageSquare, Dices, Layers, Loader2, Sparkles, ToyBrick \} from 'lucide-react';/, "import { Book, MessageSquare, Dices, Layers, Loader2, Sparkles } from 'lucide-react';");
  code = code.replace(/const activeMods = /g, 'const _activeMods = ');
  fs.writeFileSync('src/components/HUD/LoreMachineWidget.tsx', code);
} catch (e) { console.error('LoreMachine error', e); }

try {
  code = fs.readFileSync('src/components/HUD/OracleWidgetV2.tsx', 'utf8');
  code = code.replace(/import \{ Dices, HelpCircle, Loader2, Save, Send, Sparkles, Terminal \} from 'lucide-react';/, "import { Dices, HelpCircle, Loader2, Save, Send, Terminal } from 'lucide-react';");
  fs.writeFileSync('src/components/HUD/OracleWidgetV2.tsx', code);
} catch (e) { console.error('OracleWidget error', e); }

try {
  code = fs.readFileSync('src/components/HUD/SettingsModal.tsx', 'utf8');
  code = code.replace(/import \{ state, getMapConfig, updateMapConfig \} from '\.\.\/\.\.\/store';/, "import { getMapConfig, updateMapConfig } from '../../store';");
  fs.writeFileSync('src/components/HUD/SettingsModal.tsx', code);
} catch (e) { console.error('SettingsModal error', e); }

try {
  code = fs.readFileSync('src/components/HUD/TensionClockWidget.tsx', 'utf8');
  code = code.replace(/import \{ Settings, Trash2, Play, Pause, AlertTriangle \} from 'lucide-react';/, "import { Trash2, Play, Pause, AlertTriangle } from 'lucide-react';");
  fs.writeFileSync('src/components/HUD/TensionClockWidget.tsx', code);
} catch (e) { console.error('TensionClockWidget error', e); }

try {
  code = fs.readFileSync('src/components/Theater/CastPanel.tsx', 'utf8');
  code = code.replace(/import \{ Edit2, Plus, Trash2, Check, X, Skull \} from 'lucide-react';/, '');
  fs.writeFileSync('src/components/Theater/CastPanel.tsx', code);
} catch (e) { console.error('CastPanel error', e); }

try {
  code = fs.readFileSync('src/components/Theater/hooks/useCastData.ts', 'utf8');
  code = code.replace(/status: string;/g, 'status: "npc" | "jogador" | "inimigo";');
  fs.writeFileSync('src/components/Theater/hooks/useCastData.ts', code);
} catch (e) { console.error('useCastData error', e); }

try {
  code = fs.readFileSync('src/components/Theater/hooks/useSceneState.ts', 'utf8');
  code = code.replace(/import type \{ MoodType, WeatherType, TimeOfDay \} from '\.\.\/\.\.\/store';/, '');
  fs.writeFileSync('src/components/Theater/hooks/useSceneState.ts', code);
} catch (e) { console.error('useSceneState error', e); }

try {
  code = fs.readFileSync('src/components/Theater/NarrativeTrack.tsx', 'utf8');
  code = code.replace(/const _MOOD_LABELS = /g, 'const __MOOD_LABELS = ');
  code = code.replace(/const _WEATHER_LABELS = /g, 'const __WEATHER_LABELS = ');
  code = code.replace(/const i = /g, 'const _i = ');
  fs.writeFileSync('src/components/Theater/NarrativeTrack.tsx', code);
} catch (e) { console.error('NarrativeTrack error', e); }

try {
  code = fs.readFileSync('src/components/Theater/ScenePanel.tsx', 'utf8');
  code = code.replace(/const \{ theaterData, updateScene, removeScene \} = useSceneState\(\);/, 'const { updateScene, removeScene } = useSceneState();');
  fs.writeFileSync('src/components/Theater/ScenePanel.tsx', code);
} catch (e) { console.error('ScenePanel error', e); }

try {
  code = fs.readFileSync('src/components/Wiki/WikiGraph.tsx', 'utf8');
  code = code.replace(/const \[_trigger, setTrigger\] = useState\(0\);/, 'const [, setTrigger] = useState(0);');
  fs.writeFileSync('src/components/Wiki/WikiGraph.tsx', code);
} catch (e) { console.error('WikiGraph error', e); }

try {
  code = fs.readFileSync('src/engine/GameCanvas.tsx', 'utf8');
  code = code.replace(/import \{ AlphaFilter, ColorMatrixFilter \} from 'pixi\.js';/, "import { ColorMatrixFilter } from 'pixi.js';");
  fs.writeFileSync('src/engine/GameCanvas.tsx', code);
} catch (e) { console.error('GameCanvas error', e); }

try {
  code = fs.readFileSync('src/rules/FateParser.ts', 'utf8');
  code = code.replace(/const name = /g, 'const _name = ');
  fs.writeFileSync('src/rules/FateParser.ts', code);
} catch (e) { console.error('FateParser error', e); }

console.log('Script completed');
