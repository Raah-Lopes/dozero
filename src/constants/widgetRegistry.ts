import { LucideIcon, Bot, Shield, BookOpen, FileText, Users, Skull, Swords, Timer, Sun, Map, Video, Dices, Network, Globe, Coins, UserPlus, Eye, Sparkles, Anvil, Castle, ToyBrick, Palette } from 'lucide-react';

export type WidgetActionType = 'toggleWindow' | 'setActiveModal' | 'setShowActors' | 'custom';

export interface WidgetMeta {
  id: string;
  cat: 'Game Master' | 'Player Tools' | 'Generators & AI' | 'System';
  title: string;
  description: string;
  icon: LucideIcon;
  theme: string;
  shadow?: string;
  actionType: WidgetActionType;
  actionPayload: string;
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  // Game Master
  { id: 'ai', cat: 'Game Master', title: 'Estúdio IA do Mestre', description: 'Geração inteligente de textos e imagens narrativas para usar na campanha', icon: Bot, theme: 'theme-purple', shadow: '0 0 10px rgba(168,85,247,0.4)', actionType: 'toggleWindow', actionPayload: 'aiStudio' },
  { id: 'arsenal', cat: 'Game Master', title: 'Arsenal do Mestre', description: 'Painel com atalhos para itens, moedas, PVs rápidos e controle de recursos', icon: Shield, theme: 'theme-amber', actionType: 'toggleWindow', actionPayload: 'arsenalMestre' },
  { id: 'campaign', cat: 'Game Master', title: 'Gestor de Campanhas', description: 'Controle de missões (quests), andamento dos arcos, calendário e resumo das sessões', icon: BookOpen, theme: 'theme-indigo', actionType: 'toggleWindow', actionPayload: 'campaignManager' },
  { id: 'gmnotes', cat: 'Game Master', title: 'Bloco de Notas', description: 'Anotações ocultas e rascunhos exclusivos apenas para os olhos do Mestre', icon: FileText, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)', actionType: 'toggleWindow', actionPayload: 'gmNotes' },
  { id: 'players', cat: 'Game Master', title: 'Identidades (Jogadores)', description: 'Painel para monitorar quem está logado, PVs e estatísticas da party', icon: Users, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'playerManager' },
  { id: 'encounter', cat: 'Game Master', title: 'Forja de Encontros', description: 'Gerador e construtor de desafios e combates perigosos sob demanda', icon: Skull, theme: 'theme-orange', actionType: 'toggleWindow', actionPayload: 'encounterGenerator' },
  { id: 'tracker', cat: 'Game Master', title: 'Iniciativa (Combate)', description: 'Organizador de turnos para combates intensos entre jogadores e NPCs', icon: Swords, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'combatTracker' },
  { id: 'clock', cat: 'Game Master', title: 'Relógio de Tensão', description: 'Cronômetro visual de fatias (pizza) no meio da tela para marcar o tempo de urgência', icon: Timer, theme: 'theme-amber', actionType: 'setActiveModal', actionPayload: 'clockConfig' },
  { id: 'chronos', cat: 'Game Master', title: 'Motor Chronos', description: 'Controle atmosférico de clima, dia, noite e efeitos imersivos (chuva, neve)', icon: Sun, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'chronos' },
  { id: 'mapsettings', cat: 'Game Master', title: 'Visual da Mesa (Cenário)', description: 'Mude a imagem de fundo principal, ajuste alinhamento, escala de grid e cores', icon: Map, theme: 'theme-blue', actionType: 'setActiveModal', actionPayload: 'settings-cenario' },
  { id: 'actors', cat: 'Game Master', title: 'Biblioteca de Atores', description: 'Compêndio de monstros, NPCs e jogadores disponíveis para jogar no mapa', icon: Users, theme: 'theme-amber', actionType: 'setShowActors', actionPayload: 'true' },
  { id: 'cutscene', cat: 'Game Master', title: 'Diretor de Cenas (Títulos)', description: 'Projete textos cinematográficos, títulos e falas gigantescentes na tela para todos', icon: Video, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'cutsceneDirector' },

  // Player Tools
  { id: 'diceroller', cat: 'Player Tools', title: 'Rolador de Dados', description: 'Painel de dados 3D padrão do sistema e histórico individual de resultados', icon: Dices, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'diceRoller' },
  { id: 'autodice', cat: 'Player Tools', title: 'Dados Automáticos', description: 'Opções de rolagens predefinidas e macros numéricas rápidas', icon: Dices, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'automatedDice' },
  { id: 'roster', cat: 'Player Tools', title: 'Lista de Personagens', description: 'Seleção da ficha do jogador atual, troca de controle e consulta aos aliados', icon: Users, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'characterRoster' },
  { id: 'mindmap', cat: 'Player Tools', title: 'Painel de Conspiração', description: 'Mural de notas interligadas para detetives e investigadores ligarem os pontos', icon: Network, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'mindMap' },
  { id: 'webframe', cat: 'Player Tools', title: 'Navegador Integrado', description: 'Abre um iframe embutido com links úteis da internet (ex: compêndios de fora)', icon: Globe, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'webFrame' },
  { id: 'tradeshop', cat: 'Player Tools', title: 'Sistema Comercial & Lojas', description: 'Vitrine interativa de lojas, mercadores e sistema de compras em jogo', icon: Coins, theme: 'theme-amber', shadow: '0 0 10px rgba(245,158,11,0.3)', actionType: 'toggleWindow', actionPayload: 'tradeShop' },
  { id: 'quickbar', cat: 'Player Tools', title: 'Barra Rápida (QuickBar)', description: 'Invoca a barra inferior de atalhos se você tiver ocultado sem querer', icon: Users, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'playerQuickBar' },

  // Generators & AI
  { id: 'npcgen', cat: 'Generators & AI', title: 'Forja de NPCs', description: 'Gera nomes, motivações, segredos e descrições físicas de PNJs rapidamente', icon: UserPlus, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'npcGenerator' },
  { id: 'locgen', cat: 'Generators & AI', title: 'Forja de Mundos', description: 'Gera cidades, vilas, reinos e masmorras com ecossistemas complexos', icon: Map, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'locationGenerator' },
  { id: 'oraclev2', cat: 'Generators & AI', title: 'Mega Oráculo', description: 'Resposta imediata de oráculos (Sim/Não, Eventos aleatórios, Perigos)', icon: Eye, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'oracle' },
  { id: 'lore', cat: 'Generators & AI', title: 'Máquina de Lores', description: 'Crie histórias míticas, origens e crônicas automaticamente para rechear seu cenário', icon: Sparkles, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'loreMachine' },
  { id: 'worldengine', cat: 'Generators & AI', title: 'Motor de Mundo', description: 'Ferramenta avançada para clima sócio-econômico regional e evolução de facções', icon: Globe, theme: 'theme-indigo', actionType: 'toggleWindow', actionPayload: 'worldEngine' },
  { id: 'entityforge', cat: 'Generators & AI', title: 'Forja de Entidades', description: 'Gere estátísticas inimigas ou monstros absurdos em poucos cliques', icon: Anvil, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'entityForge' },
  { id: 'stronghold', cat: 'Generators & AI', title: 'Fortaleza da Party', description: 'Gerencie construções, acampamentos e evoluções das bases dos jogadores', icon: Castle, theme: 'theme-green', actionType: 'toggleWindow', actionPayload: 'stronghold' },
  { id: 'storydice', cat: 'Generators & AI', title: 'Story Dice (V1)', description: 'Rolagem de dados simbólicos com imagens para improvisar narrativas', icon: Dices, theme: 'theme-yellow', actionType: 'toggleWindow', actionPayload: 'storyDice' },
  { id: 'ssstorydice', cat: 'Generators & AI', title: 'Story Dice (V2)', description: 'Versão modernizada dos dados de história com mais opções de símbolos', icon: Dices, theme: 'theme-pink', actionType: 'toggleWindow', actionPayload: 'ssStoryDice' },
  { id: 'storybilderdeck', cat: 'Generators & AI', title: 'Story Bilder Deck', description: 'Deck de cartas (Tarot) para construir cenários e impulsionar a imaginação', icon: Sparkles, theme: 'theme-purple', actionType: 'toggleWindow', actionPayload: 'storyBilderDeck' },

  // System
  { id: 'roommgr', cat: 'System', title: 'Gestor de Salas (Multiplayer)', description: 'Painel mestre de convites, expulsão de jogadores e controle de quem dita as regras', icon: Network, theme: 'theme-green', shadow: '0 0 10px rgba(34,197,94,0.4)', actionType: 'setActiveModal', actionPayload: 'players' },
  { id: 'themes', cat: 'System', title: 'Temas Visuais (Aparência)', description: 'Escolha paletas de cores, opacidades e modo noturno do sistema inteiro', icon: Palette, theme: 'theme-pink', shadow: '0 0 10px rgba(236,72,153,0.4)', actionType: 'setActiveModal', actionPayload: 'settings-aparencia' },
  { id: 'audiodir', cat: 'System', title: 'Audio Director', description: 'Mixer de canais para gerenciar músicas de fundo (BGM) e sons de ambiente (SFX)', icon: Sparkles, theme: 'theme-blue', actionType: 'toggleWindow', actionPayload: 'audioDirector' },
  { id: 'dlc', cat: 'System', title: 'Gerenciador de Complementos', description: 'Ative/desative DLCs, livros externos, compêndios caseiros (Homebrews)', icon: ToyBrick, theme: 'theme-orange', actionType: 'setActiveModal', actionPayload: 'settings-modulos' },
  { id: 'auditor', cat: 'System', title: 'Auditor de Sistema (Linter)', description: 'Diagnostica problemas de desempenho, sincronia ou variáveis corrompidas na mesa', icon: Shield, theme: 'theme-red', actionType: 'toggleWindow', actionPayload: 'systemAuditor' },
  { id: 'aibot', cat: 'System', title: 'Robô Assistente IA', description: 'Configura o token/modelo do provedor de inteligência artificial embutido', icon: Bot, theme: 'theme-pink', actionType: 'setActiveModal', actionPayload: 'settings-ia' },
];

export const getDefaultQuickActions = () => {
  return ['diceroller', 'mindmap', 'tracker', 'quickbar'];
};
