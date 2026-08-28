import type { Edge, Node } from "@xyflow/react";

/* ============================================================
 * Núcleo do domínio — Arcanum (Cérebro-Grafo RPG)
 * Orientação a Objetos & Modelagem de Domínio Completa
 * ============================================================ */

export type NodeShape = "circle" | "diamond" | "hexagon" | "shield" | "square";

export interface TypeReg {
  id: string;
  name: string;
  color: string;
  icon: string;
  shape?: NodeShape;
  custom?: boolean;
}

export interface RPGFicha {
  level?: string;         // ex: "Nível 7", "ND 12", "Ancestral"
  status?: string;        // ex: "Ativo", "Desaparecido", "Selado", "Corrompido"
  alignment?: string;     // ex: "Caótico e Neutro", "Leal e Bom"
  hp?: string;            // ex: "85/85"
  defense?: string;       // ex: "CA 17"
  gmNotes?: string;       // Notas secretas do Mestre de RPG
  inventory?: string;     // Itens carregados / Tesouros
  linkedNodeIds?: string[]; // IDs de outros nós explicitamente linkados/referenciados
}

export interface WorldNodeData extends Record<string, unknown> {
  label: string;
  typeId: string;
  summary: string;
  icon: string;
  image?: string;
  tint?: string;          // Cor personalizada que sobrepõe a cor da camada
  shape?: NodeShape;      // Formato geométrico do nó
  tags?: string[];        // Tags/Hashtags de classificação (ex: ["#vilao", "#lendario"])
  ficha?: RPGFicha;       // Ficha de RPG e notas aprofundadas
  wikiPath?: string;      // Caminho original do arquivo .md na Wiki
  
  /* Derivações visuais calculadas dinamicamente no render */
  typeColor?: string;
  typeName?: string;
  dim?: boolean;
  onPath?: boolean;
  isSource?: boolean;
  isNeighbor?: boolean;
}

export interface WorldEdgeData extends Record<string, unknown> {
  label: string;
  color: string;
  dim?: boolean;
  onPath?: boolean;
  wikiSourcePath?: string;
}

export type WNode = Node<WorldNodeData, "world">;
export type WEdge = Edge<WorldEdgeData, "world">;

export interface SavedView {
  id: string;
  name: string;
  ts: number;
  viewport: { x: number; y: number; zoom: number };
  hidden: string[];
  isolate: string | null;
  selectedNodeId?: string | null;
  nodePositions?: Record<string, { x: number; y: number }>;
  favorite?: boolean;
}

/* ---------- 11 Camadas Padrão do Mundo RPG com Formas Geométricas ---------- */
export const DEFAULT_TYPES: TypeReg[] = [
  { id: "conceito", name: "Conceito", color: "#8f9e63", icon: "💠", shape: "diamond" },
  { id: "criatura", name: "Criatura", color: "#c66f4e", icon: "🐉", shape: "circle" },
  { id: "divindade", name: "Divindade", color: "#cd973c", icon: "✨", shape: "diamond" },
  { id: "evento", name: "Evento", color: "#b85a3d", icon: "⚡", shape: "diamond" },
  { id: "item", name: "Item", color: "#a5762a", icon: "🗡️", shape: "circle" },
  { id: "local", name: "Local", color: "#6f9a78", icon: "🏰", shape: "hexagon" },
  { id: "organizacao", name: "Organização", color: "#8a7350", icon: "🛡️", shape: "shield" },
  { id: "personagem", name: "Personagem", color: "#b58b61", icon: "🧝", shape: "circle" },
  { id: "racas", name: "Raças", color: "#8f9e63", icon: "🧬", shape: "hexagon" },
  { id: "resumo", name: "Resumo de Sessão", color: "#9a8e7b", icon: "📜", shape: "square" },
  { id: "rota", name: "Rota", color: "#a99e88", icon: "🛤️", shape: "square" },
];

/* ---------- Modelos Predefinidos por Camada de RPG ---------- */
export interface RPGTemplate {
  placeholder: string;
  defaultIcon: string;
  suggestedTags: string[];
  defaultFicha: RPGFicha;
  templateSummary: string;
}

export const RPG_TEMPLATES: Record<string, RPGTemplate> = {
  personagem: {
    placeholder: "Ex.: Kaelen Vael, Valéria Sombra, Mestre Aldous...",
    defaultIcon: "🧝",
    suggestedTags: ["#protagonista", "#ladino", "#mago", "#aliado", "#vilao"],
    defaultFicha: {
      level: "Nível 5",
      status: "Ativo",
      alignment: "Leal e Bom",
      hp: "45/45",
      defense: "CA 16",
      inventory: "Armadura de couro batido, espada curta élfica, adaga oculta.",
      gmNotes: "Possui uma aliança secreta com o conselho dos magos.",
    },
    templateSummary: "Aventureiro audaz com habilidades refinadas. Busca desvendar mistérios do passado e defender seus aliados.",
  },
  criatura: {
    placeholder: "Ex.: Pyrrhaxia a Cinzenta, Basilisco das Sombras, Kraken...",
    defaultIcon: "🐉",
    suggestedTags: ["#monstro", "#boss", "#fera", "#ancestral", "#ameaca"],
    defaultFicha: {
      level: "ND 8",
      status: "Hostil",
      alignment: "Caótico e Mau",
      hp: "120/120",
      defense: "CA 18",
      inventory: "Escamas impenetráveis, garras peçonhentas.",
      gmNotes: "Possui fraqueza contra fogo sagrado e prata encantada.",
    },
    templateSummary: "Fera temível que habita as profundezas. Conhecida por sua ferocidade e resistência implacável.",
  },
  divindade: {
    placeholder: "Ex.: Aurora a Tecelã, Sol Invictus, Vhorun o Olho Cego...",
    defaultIcon: "✨",
    suggestedTags: ["#sagrado", "#divindade", "#culto", "#primordial"],
    defaultFicha: {
      level: "Divindade Maior",
      status: "Venerada",
      alignment: "Verdadeiro Neutro",
      hp: "Imortal",
      defense: "CA 25",
      inventory: "Cetro da Criação, Véu dos Mil Amanheceres.",
      gmNotes: "Concede visões proféticas apenas aos fiéis que realizarem o ritual do crepúsculo.",
    },
    templateSummary: "Entidade celestial que governa o tecido da realidade e os destinos dos mortais.",
  },
  item: {
    placeholder: "Ex.: Lâmina do Crepúsculo, Tomo dos Sussurros, Anel Astral...",
    defaultIcon: "🗡️",
    suggestedTags: ["#reliquia", "#arma", "#artefato", "#magico", "#lendario"],
    defaultFicha: {
      level: "Lendário",
      status: "Em Posse",
      alignment: "Neutro",
      hp: "Indestrutível",
      defense: "Bônus +3",
      inventory: "Emite um brilho azulado na presença de magia.",
      gmNotes: "Requer sintonização sob a luz da lua cheia para liberar todo o seu poder.",
    },
    templateSummary: "Artefato milenar forjado com essência pura. Concede poderes arcanos extraordinários ao seu portador.",
  },
  local: {
    placeholder: "Ex.: Torre Alba, Ruínas de Khael, Bosque de Ecos, Porto Real...",
    defaultIcon: "🏰",
    suggestedTags: ["#cidade", "#fortaleza", "#ruinas", "#masmorra", "#capital"],
    defaultFicha: {
      level: "Metrópole",
      status: "Próspero",
      alignment: "Neutro",
      hp: "Muralhas Nível 4",
      defense: "Guarnição Forte",
      inventory: "Mercados exóticos, guildas de ferreiros, tavernas secretas.",
      gmNotes: "Nas catacumbas sob a praça central existe uma passagem secreta para a cidadela.",
    },
    templateSummary: "Bastião estratégico de grande relevância histórica e comercial na região.",
  },
  organizacao: {
    placeholder: "Ex.: Ordem do Véu, Companhia do Lampião, Aliança do Norte...",
    defaultIcon: "🛡️",
    suggestedTags: ["#faccao", "#guilda", "#irmandade", "#exercito"],
    defaultFicha: {
      level: "Ordem Continental",
      status: "Ativa",
      alignment: "Leal e Neutro",
      hp: "1.200 Membros",
      defense: "Influência Alta",
      inventory: "Rede de espiões, cofres protegidos por runas.",
      gmNotes: "Seus líderes planejam uma ofensiva contra o império vizinho no próximo solstício.",
    },
    templateSummary: "Facção poderosa com grande influência política e militar em todo o continente.",
  },
  evento: {
    placeholder: "Ex.: Ruptura da Mácula, Noite dos Três Eclipses, Cerco de Valdris...",
    defaultIcon: "⚡",
    suggestedTags: ["#batalha", "#cataclisma", "#revolucao", "#historico"],
    defaultFicha: {
      level: "Evento Global",
      status: "Concluído",
      alignment: "Caótico",
      inventory: "Cicatrizes mágicas permanentes deixadas no terreno.",
      gmNotes: "As consequências desta batalha ainda ressoam na política atual dos reinos.",
    },
    templateSummary: "Acontecimento marcante que transformou a história e as fronteiras do mundo.",
  },
  racas: {
    placeholder: "Ex.: Silvaren, Povo da Cinza, Draconatos de Jade...",
    defaultIcon: "🧬",
    suggestedTags: ["#linhagem", "#ancestral", "#povo", "#origem"],
    defaultFicha: {
      level: "Povo Ancestral",
      status: "Próspero",
      alignment: "Neutro",
      gmNotes: "Possuem afinidade natural para a visão no escuro e resistência a venenos.",
    },
    templateSummary: "Povo ancestral dotado de tradições milenares e profunda conexão com a natureza e o éter.",
  },
  resumo: {
    placeholder: "Ex.: Sessão 14 - A Queda do Bastião, O Despertar do Titã...",
    defaultIcon: "📜",
    suggestedTags: ["#sessao", "#campanha", "#cronica", "#capitulo"],
    defaultFicha: {
      level: "Capítulo 4",
      status: "Registrado",
      alignment: "Neutro",
      gmNotes: "O grupo adquiriu a chave dourada e desbloqueou a rota para o submundo.",
    },
    templateSummary: "Registro dos acontecimentos épicos, decisões cruciais e combates travados nesta sessão.",
  },
  rota: {
    placeholder: "Ex.: Trilha das Sombras, Estrada do Rei, Passo dos Sussurros...",
    defaultIcon: "🛤️",
    suggestedTags: ["#estrada", "#viagem", "#perigo", "#comercial"],
    defaultFicha: {
      level: "Perigosa",
      status: "Aberta",
      alignment: "Neutro",
      gmNotes: "Bandidos armam emboscadas nas curvas próximas à garganta de pedra.",
    },
    templateSummary: "Caminho crucial que conecta importantes regiões, cercado de desafios e oportunidades.",
  },
  conceito: {
    placeholder: "Ex.: O Véu Cósmico, Teoria da Mácula, Corrupção Astral...",
    defaultIcon: "💠",
    suggestedTags: ["#lore", "#magia", "#filosofia", "#arcano"],
    defaultFicha: {
      level: "Princípio Maior",
      status: "Ativo",
      alignment: "Verdadeiro Neutro",
      gmNotes: "A manipulação deste conceito exige grimórios da primeira era.",
    },
    templateSummary: "Fundamento místico e cosmológico que rege as leis mágicas e espirituais do universo.",
  },
};

export const EDGE_COLORS = [
  "#cd973c", // Ouro Arcanum
  "#6f9a78", // Verde vivo
  "#c14e39", // Brasa Rubra
  "#8b7a5c", // Terra antiga
  "#b58b61", // Madeira
  "#7a8e65", // Musgo
  "#a5762a", // Âmbar queimado
  "#a99e88", // Aço fosco
];

export const RELATION_HINTS = [
  "habita",
  "membro de",
  "aliado de",
  "inimigo de",
  "criou",
  "guarda",
  "leva a",
  "aconteceu em",
  "possui",
  "controla",
  "relata",
  "descende de",
  "venera",
  "caça",
  "empunha",
  "selou",
];

export const ICON_PRESETS = [
  "🧝", "🐉", "✨", "⚡", "🗡️", "🏰", "🛡️", "🧬", "📜", "🛤️",
  "💠", "🔮", "🌲", "🗿", "🏮", "🕯️", "🌑", "🦎", "🏹", "🧭",
  "👑", "💀", "👁️", "⚔️", "🔥", "🌊", "🪙", "📖", "🗝️", "🚪"
];

export const NODE_TINTS = [
  "",
  "#cd973c",
  "#c14e39",
  "#6f9a78",
  "#8b7a5c",
  "#b58b61",
  "#a5762a",
  "#7a8e65",
  "#8f9e63",
  "#9a8e7b"
];

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeTag(tag: string): string {
  const clean = tag.trim().replace(/^#+/, "");
  return clean ? `#${clean.toLowerCase()}` : "";
}

/**
 * Encontra nós referenciados no texto via sintaxe [[Nome do Nó]] ou [[id]]
 */
export function extractLinkedNodes(text: string, nodes: WNode[]): WNode[] {
  if (!text) return [];
  const matches = text.match(/\[\[(.*?)\]\]/g) || [];
  const matchedNodes: WNode[] = [];
  
  for (const raw of matches) {
    const target = raw.slice(2, -2).trim().toLowerCase();
    const found = nodes.find(
      (n) => n.id.toLowerCase() === target || n.data.label.toLowerCase() === target
    );
    if (found && !matchedNodes.some((m) => m.id === found.id)) {
      matchedNodes.push(found);
    }
  }
  return matchedNodes;
}

/* ---------- Registro de camadas (POO) ---------- */
export class TypeRegistry {
  private custom: TypeReg[];

  constructor(custom: TypeReg[] = []) {
    this.custom = custom;
  }

  all(): TypeReg[] {
    return [...DEFAULT_TYPES, ...this.custom];
  }

  get(id: string): TypeReg {
    return this.all().find((t) => t.id === id) ?? DEFAULT_TYPES[0];
  }

  addCustom(name: string, color: string, icon: string, shape: NodeShape = "circle"): TypeReg {
    const reg: TypeReg = { id: slugify(name) || uid("tipo"), name, color, icon, shape, custom: true };
    this.custom = [...this.custom, reg];
    return reg;
  }

  removeCustom(id: string): TypeReg[] {
    this.custom = this.custom.filter((t) => t.id !== id);
    return this.custom;
  }

  customTypes(): TypeReg[] {
    return this.custom;
  }
}
