import { LucideIcon, Bot, Shield, BookOpen, FileText, Users, Skull, Swords, Timer, Sun, Map, Video, Dices, Network, Globe, Coins, UserPlus, Eye, Sparkles, Anvil, Castle, ToyBrick, Palette, Flame, CalendarRange, GitFork } from 'lucide-react';

export type WidgetActionType = 'toggleWindow' | 'setActiveModal' | 'setShowActors' | 'custom';

export type WidgetCategory = 'Narrativa' | 'Personagens' | 'Ferramentas' | 'Jogos & Acaso' | 'Comunicação' | 'Configurações';

export interface WidgetMeta {
  id: string;
  cat: WidgetCategory;
  title: string;
  description: string;
  icon: LucideIcon;
  theme: string;
  shadow?: string;
  actionType: WidgetActionType;
  actionPayload: string;
  gmOnly?: boolean;
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  // 📖 Narrativa
  { id: 'campaign', cat: 'Narrativa', title: 'Gestor de Campanhas', description: 'Controle de missões (quests), andamento dos arcos, calendário e resumo das sessões', icon: BookOpen, theme: 'theme-indigo', actionType: 'toggleWindow', actionPayload: 'campaignManager', gmOnly: true },
  { id: 'cutscene', cat: 'Narrativa', title: 'Diretor de Cenas (Títulos)', description: 'Projete textos cinematográficos, títulos e falas gigantescentes na tela para todos', icon: Video, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'cutsceneDirector', gmOnly: true },
  { id: 'gmnotes', cat: 'Narrativa', title: 'Bloco de Notas Secreto', description: 'Anotações ocultas e rascunhos exclusivos apenas para os olhos do Mestre', icon: FileText, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)', actionType: 'toggleWindow', actionPayload: 'gmNotes', gmOnly: true },
  { id: 'mindmap', cat: 'Narrativa', title: 'Painel de Conspiração', description: 'Mural de notas interligadas para detetives e investigadores ligarem os pontos', icon: Network, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'mindMap' },
  { id: 'lore', cat: 'Narrativa', title: 'Máquina de Lores', description: 'Crie histórias míticas, rumores e crônicas automaticamente a partir da Wiki', icon: Sparkles, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'loreMachine' },
  { id: 'chronicle', cat: 'Narrativa', title: 'Chronica — Linha do Tempo', description: 'Organize eras e acontecimentos históricos do mundo, com busca, camadas e vínculos à Wiki', icon: CalendarRange, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'chronicle', gmOnly: true },
  { id: 'lineage', cat: 'Narrativa', title: 'Linhagem — Casas & Dinastias', description: 'Construa árvores genealógicas, casas, descendências e relações sociais em um atlas visual colaborativo', icon: GitFork, theme: 'theme-amber', actionType: 'toggleWindow', actionPayload: 'lineage', gmOnly: true },

  // 👥 Personagens & Atores
  { id: 'roster', cat: 'Personagens', title: 'Lista de Personagens', description: 'Seleção da ficha do jogador atual, troca de controle e consulta aos aliados', icon: Users, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'characterRoster' },
  { id: 'actors', cat: 'Personagens', title: 'Biblioteca de Atores', description: 'Compêndio de monstros, NPCs e jogadores disponíveis para jogar no mapa', icon: Users, theme: 'theme-amber', actionType: 'setShowActors', actionPayload: 'true', gmOnly: true },
  { id: 'npcgen', cat: 'Personagens', title: 'Forja de NPCs', description: 'Gera nomes, motivações, segredos e descrições físicas de PNJs rapidamente', icon: UserPlus, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'npcGenerator' },
  { id: 'entityforge', cat: 'Personagens', title: 'Forja de Entidades (Wiki)', description: 'Evocar tokens de monstros e fichas de personagens da Wiki para a mesa', icon: Anvil, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'entityForge' },
  { id: 'quickbar', cat: 'Personagens', title: 'Barra Rápida (QuickBar)', description: 'Invoca a barra inferior de atalhos e fichas de personagens', icon: Users, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'playerQuickBar' },

  // 🔧 Ferramentas & Mapa
  { id: 'tracker', cat: 'Ferramentas', title: 'Iniciativa & Combate', description: 'Organizador de turnos para combates dinâmicos entre jogadores e inimigos', icon: Swords, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'combatTracker' },
  { id: 'clock', cat: 'Ferramentas', title: 'Relógio de Tensão', description: 'Cronômetro visual de fatias para marcar o tempo de urgência de eventos', icon: Timer, theme: 'theme-amber', actionType: 'setActiveModal', actionPayload: 'clockConfig', gmOnly: true },
  { id: 'chronos', cat: 'Ferramentas', title: 'Motor Chronos', description: 'Suplemento operacional para calendário, passagem dos dias, lua, estações e eventos da sessão', icon: Sun, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'chronos', gmOnly: true },
  { id: 'mapsettings', cat: 'Ferramentas', title: 'Visual da Mesa (Cenário)', description: 'Ajuste imagem de fundo, escala de grid, alinhamento e cores', icon: Map, theme: 'theme-blue', actionType: 'setActiveModal', actionPayload: 'settings-cenario', gmOnly: true },
  { id: 'tradeshop', cat: 'Ferramentas', title: 'Sistema Comercial & Lojas', description: 'Vitrine interativa de lojas, mercadores e sistema de compras em jogo', icon: Coins, theme: 'theme-amber', shadow: '0 0 10px rgba(245,158,11,0.3)', actionType: 'toggleWindow', actionPayload: 'tradeShop' },
  { id: 'webframe', cat: 'Ferramentas', title: 'Navegador Integrado', description: 'Abre um iframe embutido com links úteis da internet', icon: Globe, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'webFrame' },

  // 🎲 Jogos & Acaso
  { id: 'masterforge', cat: 'Jogos & Acaso', title: '🔥 A Forja do Mestre (Suíte Completa)', description: 'Central unificada com todos os geradores de NPCs, locais, monstros, oráculos e IA', icon: Flame, theme: 'theme-purple', shadow: '0 0 14px rgba(168,85,247,0.5)', actionType: 'toggleWindow', actionPayload: 'masterForge', gmOnly: true },
  { id: 'diceroller', cat: 'Jogos & Acaso', title: 'Rolador de Dados 3D', description: 'Painel de dados 3D padrão do sistema e histórico de resultados', icon: Dices, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'diceRoller' },
  { id: 'autodice', cat: 'Jogos & Acaso', title: 'Dados Automáticos & Macros', description: 'Opções de rolagens predefinidas e macros numéricas rápidas', icon: Dices, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'automatedDice' },
  { id: 'oraclev2', cat: 'Jogos & Acaso', title: 'Mega Oráculo V2', description: 'Resposta imediata de oráculos (Sim/Não, Eventos aleatórios, Perigos)', icon: Eye, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'oracle' },
  { id: 'locgen', cat: 'Jogos & Acaso', title: 'Forja de Mundos & Locais', description: 'Gera cidades, masmorras e pontos de interesse com histórico e clima', icon: Map, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'locationGenerator' },
  { id: 'worldengine', cat: 'Jogos & Acaso', title: 'Motor de Mundo & Facções', description: 'Simula avanço de reinos, economia e tensões geopolíticas', icon: Globe, theme: 'theme-indigo', actionType: 'toggleWindow', actionPayload: 'worldEngine' },
  { id: 'stronghold', cat: 'Jogos & Acaso', title: 'Fortaleza da Party', description: 'Gerencie acampamentos, construções e melhorias da base dos jogadores', icon: Castle, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'stronghold' },
  { id: 'encounter', cat: 'Jogos & Acaso', title: 'Forja de Encontros', description: 'Construtor de batalhas balanceadas e emboscadas com injeção no combate', icon: Skull, theme: 'theme-orange', actionType: 'toggleWindow', actionPayload: 'encounterGenerator', gmOnly: true },
  { id: 'storydice', cat: 'Jogos & Acaso', title: 'Story Dice (V1)', description: 'Rolagem de dados simbólicos com imagens para improvisar narrativas', icon: Dices, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'storyDice' },
  { id: 'ssstorydice', cat: 'Jogos & Acaso', title: 'Story Dice (V2)', description: 'Versão modernizada dos dados de história com mais opções de símbolos', icon: Dices, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'ssStoryDice' },
  { id: 'storybuilderdeck', cat: 'Jogos & Acaso', title: 'Story Builder Deck (Tarot)', description: 'Deck de cartas de cenário para construir ganchos e impulsionar a imaginação', icon: Sparkles, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'storyBilderDeck' },

  // 💬 Comunicação
  { id: 'players', cat: 'Comunicação', title: 'Central da Mesa & Jogadores', description: 'Gerenciar conexões, convites, barras de HP/Mana ao vivo e salas', icon: Users, theme: 'theme-indigo', shadow: '0 0 12px rgba(99,102,241,0.4)', actionType: 'setActiveModal', actionPayload: 'players' },

  // ⚙️ Configurações & Mestre
  { id: 'arsenal', cat: 'Configurações', title: 'Arsenal do Mestre', description: 'Painel com atalhos para itens, moedas, PVs rápidos e controle de recursos', icon: Shield, theme: 'theme-amber', actionType: 'toggleWindow', actionPayload: 'arsenalMestre', gmOnly: true },
  { id: 'ai', cat: 'Configurações', title: 'Estúdio IA do Mestre', description: 'Geração avançada de fichas e diálogos com modelos Gemini, OpenAI e Groq', icon: Bot, theme: 'theme-purple', shadow: '0 0 10px rgba(168,85,247,0.4)', actionType: 'toggleWindow', actionPayload: 'aiStudio', gmOnly: true },
  { id: 'lobby', cat: 'Configurações', title: 'Mural de Campanhas (Nuvem)', description: 'Troque de mesa, crie novas campanhas e gerencie dados na nuvem ou locais', icon: Globe, theme: 'theme-indigo', shadow: '0 0 10px rgba(99,102,241,0.4)', actionType: 'setActiveModal', actionPayload: 'lobby' },
  { id: 'themes', cat: 'Configurações', title: 'Temas Visuais (Aparência)', description: 'Escolha paletas de cores, opacidades e modo noturno do sistema inteiro', icon: Palette, theme: 'theme-pink', shadow: '0 0 10px rgba(236,72,153,0.4)', actionType: 'setActiveModal', actionPayload: 'settings-aparencia' },
  { id: 'audiodir', cat: 'Configurações', title: 'Diretor de Áudio (Mixer)', description: 'Mixer de canais para gerenciar músicas de fundo (BGM) e efeitos sonoros (SFX)', icon: Sparkles, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'audioDirector' },
  { id: 'dlc', cat: 'Configurações', title: 'Gerenciador de Módulos (DLCs)', description: 'Ative/desative DLCs, livros externos e compêndios caseiros (Homebrews)', icon: ToyBrick, theme: 'theme-orange', actionType: 'setActiveModal', actionPayload: 'settings-modulos', gmOnly: true },
  { id: 'auditor', cat: 'Configurações', title: 'Auditor de Sistema (Linter)', description: 'Diagnostica problemas de desempenho, sincronia ou variáveis na mesa', icon: Shield, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'systemAuditor', gmOnly: true },
  { id: 'aibot', cat: 'Configurações', title: 'Provedor de IA (Chaves API)', description: 'Configura as chaves e modelos de inteligência artificial', icon: Bot, theme: 'theme-pink', actionType: 'setActiveModal', actionPayload: 'settings-ia', gmOnly: true }
];

export const getDefaultQuickActions = () => {
  return ['diceroller', 'mindmap', 'tracker', 'quickbar'];
};
