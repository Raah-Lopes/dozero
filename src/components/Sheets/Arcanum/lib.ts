/* ============================================================
   Arcanum — tipos, presets de sistema, dados e persistência
   ============================================================ */


export interface Vital {
  id: string;
  label: string;
  value: number;
  max: number;
  color: string; // tailwind hex
}

export interface Attr {
  id: string;
  name: string;
  value: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number; // 0 = truque
  school: string;
  cost: string;
  desc: string;
  prepared: boolean;
}

export interface Macro {
  id: string;
  name: string;
  formula: string;
  note: string;
}

export interface InvItem {
  id: string;
  name: string;
  kind: string;
  qty: number;
  weight: number;
}

export interface GalleryImg {
  id: string;
  src: string;
}

export interface RollResult {
  id: string;
  label: string;
  formula: string;
  rolls: number[];
  sides: number;
  mod: number;
  total: number;
  kind: "crit" | "fumble" | "normal";
}

export interface Character {
  system: string;
  name: string;
  player: string;
  race: string;
  klass: string;
  alignment: string;
  level: number;
  xp: number;
  xpNext: number;
  avatar: string;
  vitals: Vital[];
  attributes: Attr[];
  affiliations: string[];
  spells: Spell[];
  macros: Macro[];
  inventory: InvItem[];
  gold: number;
  story: string;
  notes: string;
  gallery: GalleryImg[];
}

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

/* ---------- presets por sistema ----------------------------------------- */

export interface SystemPreset {
  attrs: string[];
  vitals: { label: string; color: string; max: number }[];
}

export const SYSTEMS: Record<string, SystemPreset> = {
  "D&D 5e": {
    attrs: ["Força", "Destreza", "Constituição", "Inteligência", "Sabedoria", "Carisma"],
    vitals: [
      { label: "Pontos de Vida", color: "#c14e39", max: 32 },
      { label: "Pontos de Magia", color: "#6b87b3", max: 18 },
    ],
  },
  "Tormenta20": {
    attrs: ["Força", "Destreza", "Constituição", "Inteligência", "Sabedoria", "Carisma"],
    vitals: [
      { label: "Pontos de Vida", color: "#c14e39", max: 28 },
      { label: "Pontos de Mana", color: "#6b87b3", max: 15 },
    ],
  },
  "Ordem Paranormal": {
    attrs: ["Força", "Agilidade", "Vigor", "Inteligência", "Presença"],
    vitals: [
      { label: "Pontos de Vida", color: "#c14e39", max: 28 },
      { label: "Pontos de Esforço", color: "#6db58d", max: 12 },
      { label: "Sanidade", color: "#8aa4cc", max: 24 },
    ],
  },
  "Pathfinder 2e": {
    attrs: ["Força", "Destreza", "Constituição", "Inteligência", "Sabedoria", "Carisma"],
    vitals: [
      { label: "Pontos de Vida", color: "#c14e39", max: 30 },
      { label: "Pontos de Foco", color: "#6b87b3", max: 6 },
    ],
  },
  "Chamado de Cthulhu": {
    attrs: ["FOR", "CON", "TAM", "DES", "APA", "INT", "POD", "EDU"],
    vitals: [
      { label: "Pontos de Vida", color: "#c14e39", max: 12 },
      { label: "Sanidade", color: "#8aa4cc", max: 60 },
      { label: "Magia", color: "#6db58d", max: 14 },
    ],
  },
  "Vampiro: A Máscara": {
    attrs: ["Força", "Destreza", "Vigor", "Carisma", "Manipulação", "Aparência", "Percepção", "Inteligência", "Raciocínio"],
    vitals: [
      { label: "Força de Vontade", color: "#e0b054", max: 8 },
      { label: "Sangue", color: "#c14e39", max: 10 },
    ],
  },
  "GURPS": {
    attrs: ["ST", "DX", "IQ", "HT"],
    vitals: [
      { label: "Pontos de Vida", color: "#c14e39", max: 11 },
      { label: "Fadiga", color: "#6db58d", max: 10 },
    ],
  },
  "Outro (personalizado)": {
    attrs: ["Atributo 1", "Atributo 2", "Atributo 3", "Atributo 4"],
    vitals: [
      { label: "Vitalidade", color: "#c14e39", max: 20 },
      { label: "Energia", color: "#6b87b3", max: 20 },
    ],
  },
};

export const SCHOOLS = [
  "Abjuração", "Adivinhação", "Conjuração", "Encantamento", "Evocação",
  "Ilusão", "Necromancia", "Transmutação", "Invocação", "Maldição", "Ritual",
];

export const ITEM_KINDS = ["Arma", "Armadura", "Poção", "Equipamento", "Tesouro", "Consumível", "Relíquia"];

/* ---------- ficha padrão -------------------------------------------------- */

export const DEFAULT_CHARACTER: Character = {
  system: "D&D 5e",
  name: "Lyra Vael'Theran",
  player: "Você",
  race: "Meio-elfa",
  klass: "Lâmina Arcana",
  alignment: "Caótica e Boa",
  level: 6,
  xp: 14200,
  xpNext: 23000,
  avatar:
    "https://image.qwenlm.ai/generated-images/9d4e2a07-971e-487f-859f-3dc0a88a939b/_result.png",
  vitals: [
    { id: "pv", label: "Pontos de Vida", value: 21, max: 32, color: "#c14e39" },
    { id: "pm", label: "Pontos de Magia", value: 11, max: 18, color: "#6b87b3" },
  ],
  attributes: [
    { id: "a1", name: "Força", value: 10 },
    { id: "a2", name: "Destreza", value: 18 },
    { id: "a3", name: "Constituição", value: 14 },
    { id: "a4", name: "Inteligência", value: 16 },
    { id: "a5", name: "Sabedoria", value: 12 },
    { id: "a6", name: "Carisma", value: 13 },
  ],
  affiliations: ["Companhia do Corvo Dourado", "Círculo Arcano de Vhal"],
  spells: [
    { id: "s1", name: "Chama Dançante", level: 0, school: "Evocação", cost: "Ação", desc: "Uma labareda dourada surge na palma da mão e ilumina 9 m por até 1 hora.", prepared: true },
    { id: "s2", name: "Passo Nebuloso", level: 1, school: "Conjuração", cost: "2 PM", desc: "Teleporta Lyra até 9 m para um espaço desocupado que ela possa ver.", prepared: true },
    { id: "s3", name: "Lâmina Flamejante", level: 2, school: "Evocação", cost: "4 PM", desc: "A espada irrompe em fogo arcano: +2d6 de dano ígneo até o fim do combate.", prepared: false },
  ],
  macros: [
    { id: "m1", name: "Ataque — Espada Longa", formula: "1d20+6", note: "Bônus de proficiência incluso" },
    { id: "m2", name: "Dano — Espada Longa", formula: "1d8+4", note: "Versátil: use 1d10+4 com duas mãos" },
    { id: "m3", name: "Lâmina Flamejante (fogo)", formula: "2d6", note: "Dano ígneo extra" },
    { id: "m4", name: "Teste de Sorte", formula: "1d100", note: "Rolagem de destino" },
  ],
  inventory: [
    { id: "i1", name: "Espada longa rúnica", kind: "Arma", qty: 1, weight: 1.5 },
    { id: "i2", name: "Couro batido +1", kind: "Armadura", qty: 1, weight: 5 },
    { id: "i3", name: "Poção de cura", kind: "Poção", qty: 4, weight: 0.25 },
    { id: "i4", name: "Grimório de Vhal", kind: "Relíquia", qty: 1, weight: 2 },
    { id: "i5", name: "Ração de viagem", kind: "Consumível", qty: 8, weight: 0.5 },
  ],
  gold: 246,
  story:
    "Lyra nasceu sob um eclipse duplo, nas torres quebradas de Vhal — a filha indesejada de uma maga de guerra elfa e de um espadachim humano que desertou na mesma noite. Criada entre bibliotecas em ruínas e tavernas de fronteira, aprendeu cedo que o aço convence mais rápido que a diplomacia, mas que um encantamento bem posto evita ambos.\n\nAos dezesseis anos, roubou o grimório proibido do Círculo Arcano — não por ganância, mas porque as páginas sussurravam o nome da mãe que ela nunca conheceu. Desde então, o Círculo a caça, o grimório muda de idioma quando chove, e a Companhia do Corvo Dourado é a única família que escolheu.\n\nProcura a Torre Invertida, onde diz a lenda que todo feitiço roubado retorna ao dono verdadeiro.",
  notes:
    "• O grimório só abre sob luz de vela vermelha.\n• Dívida de 50 PO com o taverneiro Brann, em Porto Cinzento.\n• Procurar o ferreiro anão que reconheceu as runas da espada.\n• Sessão 14: atravessar o Passo da Serpente antes da lua cheia.",
  gallery: [
    {
      id: "g1",
      src: "https://image.qwenlm.ai/generated-images/9da61df6-debd-45ed-9d5c-cfdd0a268757/_result.png",
    },
    {
      id: "g2",
      src: "https://image.qwenlm.ai/generated-images/e003a3b0-8ca7-4b1f-9b35-4088ebc0e74f/_result.png",
    },
  ],
};

/* ---------- dados (dice roller) ------------------------------------------- */

export function rollFormula(label: string, formula: string): RollResult | null {
  const m = formula.replace(/\s/g, "").toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!m) return null;
  const count = Math.min(Math.max(parseInt(m[1] || "1", 10), 1), 60);
  const sides = Math.min(Math.max(parseInt(m[2], 10), 2), 1000);
  const mod = m[3] ? parseInt(m[3], 10) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(1 + Math.floor(Math.random() * sides));
  const total = rolls.reduce((a, b) => a + b, 0) + mod;
  let kind: RollResult["kind"] = "normal";
  if (count === 1 && sides === 20) {
    if (rolls[0] === 20) kind = "crit";
    if (rolls[0] === 1) kind = "fumble";
  }
  return { id: uid(), label, formula, rolls, sides, mod, total, kind };
}

/* ---------- persistência --------------------------------------------------- */

const STORAGE_KEY = "arcanum-ficha-v1";

export function loadCharacter(): Character {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Character>;
      return { ...DEFAULT_CHARACTER, ...parsed };
    }
  } catch {
    /* ficha corrompida → usa padrão */
  }
  return structuredClone(DEFAULT_CHARACTER);
}

export function saveCharacter(c: Character): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    return true;
  } catch {
    return false; // ex.: cota estourada por imagens grandes
  }
}

export function downloadJSON(c: Character) {
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(c.name || "ficha").replace(/\s+/g, "-").toLowerCase()}-arcanum.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const readFileAsDataURL = async (file: File): Promise<string> => {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const ratio = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const modOf = (value: number) => Math.floor((value - 10) / 2);
export const fmtMod = (m: number) => (m >= 0 ? `+${m}` : `${m}`);
