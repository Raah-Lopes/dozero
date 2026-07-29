import { LucideIcon, Bot, Shield, BookOpen, FileText, Users, Skull, Swords, Timer, Sun, Map, Video, Dices, Network, Globe, Coins, UserPlus, Eye, Sparkles, Anvil, Castle, ToyBrick, Palette } from 'lucide-react';

export type WidgetActionType = 'toggleWindow' | 'setActiveModal' | 'setShowActors' | 'custom';

export interface WidgetMeta {
  id: string;
  cat: 'Game Master' | 'Player Tools' | 'Generators & AI' | 'System';
  title: string;
  icon: LucideIcon;
  theme: string;
  shadow?: string;
  actionType: WidgetActionType;
  actionPayload: string;
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  // Game Master
  { id: 'ai', cat: 'Game Master', title: 'Estúdio IA do Mestre', icon: Bot, theme: 'theme-purple', shadow: '0 0 10px rgba(168,85,247,0.4)', actionType: 'toggleWindow', actionPayload: 'aiStudio' },
  { id: 'arsenal', cat: 'Game Master', title: 'Arsenal do Mestre', icon: Shield, theme: 'theme-amber', actionType: 'toggleWindow', actionPayload: 'arsenalMestre' },
  { id: 'campaign', cat: 'Game Master', title: 'Gestor de Campanhas', icon: BookOpen, theme: 'theme-indigo', actionType: 'toggleWindow', actionPayload: 'campaignManager' },
  { id: 'gmnotes', cat: 'Game Master', title: 'Bloco de Notas', icon: FileText, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)', actionType: 'toggleWindow', actionPayload: 'gmNotes' },
  { id: 'players', cat: 'Game Master', title: 'Identidades (Jogadores)', icon: Users, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'playerManager' },
  { id: 'encounter', cat: 'Game Master', title: 'Forja de Encontros', icon: Skull, theme: 'theme-orange', actionType: 'toggleWindow', actionPayload: 'encounterGenerator' },
  { id: 'tracker', cat: 'Game Master', title: 'Iniciativa (Combate)', icon: Swords, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'combatTracker' },
  { id: 'clock', cat: 'Game Master', title: 'Relógio de Tensão', icon: Timer, theme: 'theme-amber', actionType: 'setActiveModal', actionPayload: 'clockConfig' },
  { id: 'chronos', cat: 'Game Master', title: 'Motor Chronos', icon: Sun, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'chronos' },
  { id: 'mapsettings', cat: 'Game Master', title: 'Visual da Mesa (Cenário)', icon: Map, theme: 'theme-blue', actionType: 'setActiveModal', actionPayload: 'settings-cenario' },
  { id: 'actors', cat: 'Game Master', title: 'Biblioteca de Atores', icon: Users, theme: 'theme-amber', actionType: 'setShowActors', actionPayload: 'true' },
  { id: 'cutscene', cat: 'Game Master', title: 'Diretor de Cenas (Títulos)', icon: Video, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'cutsceneDirector' },

  // Player Tools
  { id: 'diceroller', cat: 'Player Tools', title: 'Rolador de Dados', icon: Dices, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'diceRoller' },
  { id: 'autodice', cat: 'Player Tools', title: 'Dados Automáticos', icon: Dices, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'automatedDice' },
  { id: 'roster', cat: 'Player Tools', title: 'Lista de Personagens', icon: Users, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'characterRoster' },
  { id: 'mindmap', cat: 'Player Tools', title: 'Painel de Conspiração', icon: Network, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'mindMap' },
  { id: 'webframe', cat: 'Player Tools', title: 'Navegador Integrado', icon: Globe, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'webFrame' },
  { id: 'tradeshop', cat: 'Player Tools', title: 'Sistema Comercial & Lojas', icon: Coins, theme: 'theme-amber', shadow: '0 0 10px rgba(245,158,11,0.3)', actionType: 'toggleWindow', actionPayload: 'tradeShop' },
  { id: 'quickbar', cat: 'Player Tools', title: 'Barra Rápida (QuickBar)', icon: Users, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'playerQuickBar' },

  // Generators & AI
  { id: 'npcgen', cat: 'Generators & AI', title: 'Forja de NPCs', icon: UserPlus, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'npcGenerator' },
  { id: 'locgen', cat: 'Generators & AI', title: 'Forja de Mundos', icon: Map, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'locationGenerator' },
  { id: 'oraclev2', cat: 'Generators & AI', title: 'Mega Oráculo', icon: Eye, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'oracle' },
  { id: 'lore', cat: 'Generators & AI', title: 'Máquina de Lores', icon: Sparkles, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'loreMachine' },
  { id: 'worldengine', cat: 'Generators & AI', title: 'Motor de Mundo', icon: Globe, theme: 'theme-indigo', actionType: 'toggleWindow', actionPayload: 'worldEngine' },
  { id: 'entityforge', cat: 'Generators & AI', title: 'Forja de Entidades', icon: Anvil, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'entityForge' },
  { id: 'stronghold', cat: 'Generators & AI', title: 'Fortaleza da Party', icon: Castle, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'stronghold' },
  { id: 'storydice', cat: 'Generators & AI', title: 'Story Dice (V1)', icon: Dices, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'storyDice' },
  { id: 'ssstorydice', cat: 'Generators & AI', title: 'Story Dice (V2)', icon: Dices, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'ssStoryDice' },
  { id: 'storybilderdeck', cat: 'Generators & AI', title: 'Story Bilder Deck', icon: Sparkles, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'storyBilderDeck' },

  // System
  { id: 'roommgr', cat: 'System', title: 'Gestor de Salas (Multiplayer)', icon: Network, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)', actionType: 'setActiveModal', actionPayload: 'players' },
  { id: 'themes', cat: 'System', title: 'Temas Visuais (Aparência)', icon: Palette, theme: 'theme-pink', shadow: '0 0 10px rgba(236,72,153,0.4)', actionType: 'setActiveModal', actionPayload: 'settings-aparencia' },
  { id: 'audiodir', cat: 'System', title: 'Audio Director', icon: Sparkles, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'audioDirector' },
  { id: 'dlc', cat: 'System', title: 'Gerenciador de Complementos', icon: ToyBrick, theme: 'theme-orange', actionType: 'setActiveModal', actionPayload: 'settings-modulos' },
  { id: 'auditor', cat: 'System', title: 'Auditor de Sistema (Linter)', icon: Shield, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'systemAuditor' },
  { id: 'aibot', cat: 'System', title: 'Robô Assistente IA', icon: Bot, theme: 'theme-pink', actionType: 'setActiveModal', actionPayload: 'settings-ia' },
];

export const getDefaultQuickActions = () => {
  return ['diceroller', 'mindmap', 'tracker', 'quickbar'];
};
