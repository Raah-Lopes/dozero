import type { Category, DataState, Scene, Sound, Soundpad, SoundType, Vista } from "../types";

export const CATS: Category[] = [
  { id: "fantasia", name: "Fantasia", color: "#fb7185" },
  { id: "sagrado", name: "Sagrado", color: "#f6c453" },
  { id: "combate", name: "Combate", color: "#ef4444" },
  { id: "natureza", name: "Natureza", color: "#4ade80" },
  { id: "cidade", name: "Cidade", color: "#fb923c" },
  { id: "urbano", name: "Urbano", color: "#eab308" },
  { id: "horror", name: "Horror", color: "#a855f7" },
  { id: "scifi", name: "Sci-Fi", color: "#22d3ee" },
  { id: "musica", name: "Música", color: "#3b82f6" },
  { id: "ritual", name: "Ritual", color: "#e879f9" },
  { id: "dungeon", name: "Dungeon", color: "#94a3b8" },
  { id: "maritimo", name: "Marítimo", color: "#2dd4bf" },
];

function buildSeed(): DataState {
  const sounds: Record<string, Sound> = {};
  let i = 0;
  const now = Date.now();
  const S = (
    name: string,
    icon: string,
    categoryId: string,
    type: SoundType,
    synth: string,
    extra: Partial<Sound> = {}
  ): string => {
    const id = "snd" + ++i;
    sounds[id] = {
      id, name, icon, categoryId, type, synth,
      duration: 0, loop: true, volume: 70, fadeIn: 700, fadeOut: 900,
      createdAt: now, ...extra,
    };
    return id;
  };
  const one = (name: string, icon: string, categoryId: string, synth: string, duration: number, extra: Partial<Sound> = {}) =>
    S(name, icon, categoryId, "SFX", synth, { loop: false, duration, fadeIn: 30, fadeOut: 150, ...extra });

  /* ---- Reinos do Norte ---- */
  const fTaverna = S("Taverna do Javali", "users", "cidade", "Ambiente", "file:legacy-amb-tavern", {
    fileUrl: "/audio/ambience/tavern.wav",
  });
  const fFogueira = S("Fogueira do Acampamento", "flame", "natureza", "Ambiente", "fire");
  const fChuva = S("Chuva nas Colinas", "rain", "natureza", "Ambiente", "rain");
  S("Vento do Norte", "wind", "natureza", "Ambiente", "wind");
  const fHarpa = S("Harpa da Corte", "note", "musica", "Música", "harp", { volume: 60 });
  S("Templo de Prata", "bell", "sagrado", "Música", "bells", { volume: 60 });
  const fMarcha = S("Marcha dos Clãs", "sword", "combate", "Música", "warDrums", { volume: 80 });
  one("Uivo na Noite", "paw", "natureza", "howl", 2.8);
  one("Aço contra Aço", "sword", "combate", "sword", 1);
  one("Trovão Distante", "zap", "natureza", "thunder", 3);

  /* ---- Castle Raven ---- */
  const rNevoa = S("Névoa Eterna", "ghost", "horror", "Ambiente", "droneDark");
  const rLamento = S("Lamento da Cripta", "ghost", "horror", "Ambiente", "ghost", { volume: 55 });
  const rPanico = S("Pânico Crescente", "heart", "horror", "Ambiente", "heartbeat", { volume: 65 });
  const rCatacumbas = S("Catacumbas Gotejantes", "wave", "dungeon", "Ambiente", "drip");
  S("Ritual dos Corvos", "book", "ritual", "Ambiente", "chant", { volume: 62 });
  one("Porta do Mausoléu", "door", "horror", "doorCreak", 1.1);
  one("Sino da Meia-Noite", "bell", "horror", "bellToll", 7);
  one("Tempestade no Castelo", "zap", "horror", "thunder", 3);
  S("Corredores Gelados", "wind", "horror", "Ambiente", "windIce", { volume: 55 });

  /* ---- Desert Planet ---- */
  const dDunas = S("Dunas Sem Fim", "mountain", "natureza", "Ambiente", "windDesert");
  S("Acampamento Científico", "rocket", "scifi", "Ambiente", "humSci", { volume: 60 });
  one("Blaster", "zap", "combate", "laser", 0.4);
  const dVerme = one("Verme da Areia", "paw", "combate", "roar", 1.7);
  S("Vibração das Areias", "sparkle", "scifi", "Ambiente", "droneDeep", { volume: 62 });
  one("Mercador de Especiarias", "coin", "cidade", "coin", 0.5);
  S("Nave Abatida", "rocket", "scifi", "Ambiente", "shipHum", { volume: 60 });

  /* ---- Ice Planet ---- */
  const iBlizzard = S("Blizzard", "snow", "natureza", "Ambiente", "windIce");
  S("Ventania Polar", "wind", "natureza", "Ambiente", "wind", { volume: 65 });
  S("Aurora Profunda", "sparkle", "scifi", "Ambiente", "droneDeep", { volume: 60 });
  S("Hipotermia", "heart", "horror", "Ambiente", "heartbeat", { volume: 55 });
  S("Base Congelada", "rocket", "scifi", "Ambiente", "shipHum", { volume: 55 });
  one("Criatura do Gelo", "paw", "horror", "howl", 2.8);
  one("Fase de Plasma", "zap", "combate", "laser", 0.4);

  /* ---- Jungle Planet ---- */
  const jDossel = S("Dossel Fechado", "tree", "natureza", "Ambiente", "jungle");
  S("Noite na Selva", "moon", "natureza", "Ambiente", "crickets", { volume: 60 });
  S("Amanhecer Tropical", "sparkle", "natureza", "Ambiente", "birds", { volume: 60 });
  S("Monção", "rain", "natureza", "Ambiente", "rain", { volume: 72 });
  one("Predador Apex", "paw", "combate", "roar", 1.7);
  one("Zarabatana", "arrowRight", "combate", "arrow", 0.5);
  one("Disparo Atordoador", "zap", "combate", "laser", 0.4);
  S("Rio Serpenteante", "wave", "maritimo", "Ambiente", "sea", { volume: 62 });

  /* ---- Future City ---- */
  const cNeon = S("Distrito Neon", "city", "musica", "Música", "neonCity", { volume: 62 });
  S("Servidores Zumbindo", "gear", "scifi", "Ambiente", "humSci", { volume: 55 });
  S("Mercado Noturno", "users", "cidade", "Ambiente", "crowd", { volume: 62 });
  S("Chuva Ácida", "rain", "urbano", "Ambiente", "rain", { volume: 60 });
  one("Drone Policial", "zap", "combate", "laser", 0.4);
  S("Tráfego Aéreo", "rocket", "scifi", "Ambiente", "shipHum", { volume: 52 });
  one("Credchips", "coin", "urbano", "coin", 0.5);
  S("Beco Abandonado", "ghost", "horror", "Ambiente", "droneDark", { volume: 55 });

  /* ---- Monster Pack ---- */
  const mRugido = one("Rugido da Fera", "paw", "combate", "roar", 1.7);
  one("Uivo da Matilha", "paw", "natureza", "howl", 2.8);
  one("Grito Espectral", "ghost", "horror", "howl", 2.8, { volume: 55 });
  one("Pisada de Titã", "mountain", "combate", "thunder", 3);
  one("Garras no Metal", "sword", "combate", "sword", 1);
  one("Ninho Rangendo", "door", "dungeon", "doorCreak", 1.1);
  S("Caçada Próxima", "heart", "horror", "Ambiente", "heartbeat", { volume: 60 });
  one("Chamado da Horda", "bell", "combate", "horn", 2.1);

  /* ---- True West ---- */
  const wSaloon = S("Piano do Saloon", "note", "musica", "Música", "saloon", { volume: 62 });
  S("Planície Seca", "compass", "natureza", "Ambiente", "windDesert", { volume: 66 });
  S("Noite na Pradaria", "moon", "natureza", "Ambiente", "crickets", { volume: 58 });
  S("Bar Lotado", "users", "cidade", "Ambiente", "crowd", { volume: 60 });
  one("Pote de Ouro", "coin", "cidade", "coin", 0.5);
  one("Flecha Silenciosa", "arrowRight", "combate", "arrow", 0.5);
  one("Duelo de Facas", "sword", "combate", "sword", 1);
  one("Trovoada na Planície", "zap", "natureza", "thunder", 3);
  one("Trompa da Cavalaria", "bell", "combate", "horn", 2.1);

  /* ---- Wasteland ---- */
  const xPoeira = S("Poeira Radioativa", "wind", "dungeon", "Ambiente", "windDesert", { volume: 68 });
  S("Zona Morta", "ghost", "horror", "Ambiente", "droneDark", { volume: 62 });
  S("Barril em Chamas", "flame", "cidade", "Ambiente", "fire", { volume: 64 });
  const xSaqueadores = S("Gangue de Saqueadores", "sword", "combate", "Música", "warDrums", { volume: 75 });
  one("Mutante", "paw", "horror", "roar", 1.7);
  one("Explosão Distante", "zap", "combate", "thunder", 3);
  S("Esgoto", "wave", "dungeon", "Ambiente", "drip", { volume: 58 });
  S("Vozes do Rádio", "mic", "horror", "Ambiente", "ghost", { volume: 48 });

  /* ---- novas composições do bardo (módulo musical expandido) ---- */
  const nLute = S("Alaúde do Bardo", "note", "musica", "Música", "lute", { volume: 62 });
  const nWaltz = S("Valsa da Corte", "crown", "musica", "Música", "waltz", { volume: 58 });
  const nJig = S("Giga da Lareira", "flame", "musica", "Música", "jig", { volume: 60 });
  const nFuneral = S("Marcha Fúnebre de Raven", "skull", "horror", "Música", "funeral", { volume: 55 });
  const nCoro = S("Coro dos Condenados", "ghost", "horror", "Música", "chant", { volume: 52 });
  const nDunas = S("Cântico das Dunas", "book", "ritual", "Música", "chant", { volume: 56 });
  const nNinar = S("Canção de Ninar Polar", "snow", "musica", "Música", "lullaby", { volume: 55 });
  const nAurora = S("Sinos da Aurora", "sparkle", "sagrado", "Música", "bells", { volume: 55 });
  const nNeon = S("Neon Drive", "city", "musica", "Música", "synthwave", { volume: 60 });
  const nDuelo = S("Duelo ao Meio-Dia", "compass", "musica", "Música", "morricone", { volume: 62 });
  const nFiddle = S("Fiddle da Fronteira", "note", "musica", "Música", "fiddle", { volume: 60 });
  const nHorda = S("Fúria da Horda", "sword", "combate", "Música", "orchestra", { volume: 78 });
  const nFerro = S("Marcha do Ferro", "gear", "combate", "Música", "orchestra", { volume: 72 });
  const nSucata = S("Cortejo de Sucata", "flame", "dungeon", "Música", "funeral", { volume: 55 });
  const nProfund = S("Coral das Profundezas", "wave", "ritual", "Música", "chant", { volume: 54 });

  /* ---- Sons Temáticos de RPG & Fantasia (A.2) ---- */
  const rpgMissile = one("Mísseis Mágicos", "sparkle", "fantasia", "magicMissile", 0.75, { hotkey: "1" });
  const rpgHeal = one("Cura Divina", "heart", "sagrado", "divineHeal", 2.4, { hotkey: "2" });
  const rpgFireball = one("Bola de Fogo", "flame", "combate", "fireball", 1.8, { hotkey: "3" });
  const rpgCrit = one("Golpe Crítico", "sword", "combate", "criticalHit", 1.4, { hotkey: "4" });
  const rpgShield = one("Bloqueio de Escudo", "shield", "combate", "shieldHit", 0.55, { hotkey: "5" });
  const rpgTrap = one("Armadilha Ativada", "zap", "dungeon", "trapSpring", 0.6, { hotkey: "6" });
  const rpgStoneDoor = one("Porta de Masmorra", "door", "dungeon", "stoneDoor", 2.6, { hotkey: "7" });
  const rpgDragon = one("Rugido de Dragão", "paw", "horror", "dragonRoar", 2.8, { hotkey: "8" });
  const rpgVictory = one("Vitória Triunfal", "crown", "sagrado", "victorySting", 2.2, { hotkey: "9" });
  const rpgTension = one("Tensão / Pânico", "ghost", "horror", "tensionSting", 2.4);
  const rpgChest = one("Baú de Tesouro", "coin", "cidade", "chestOpen", 1.1);
  const rpgTeleport = one("Teletransporte", "sparkle", "fantasia", "teleport", 1.2);

  const pads: Soundpad[] = [
    {
      id: "pad-rpg-sfx",
      name: "Arsenal do Mestre (SFX)",
      icon: "sparkle",
      color: "#f6c453",
      soundIds: [
        rpgMissile, rpgHeal, rpgFireball, rpgCrit, rpgShield, rpgTrap,
        rpgStoneDoor, rpgDragon, rpgVictory, rpgTension, rpgChest, rpgTeleport
      ]
    },
    { id: "pad-norte", name: "Reinos do Norte", icon: "crown", color: "#f6c453", soundIds: [fTaverna, fFogueira, fChuva, "snd4", fHarpa, "snd6", fMarcha, "snd8", "snd9", "snd10", nLute, nWaltz, nJig] },
    { id: "pad-raven", name: "Castle Raven", icon: "skull", color: "#a855f7", soundIds: [rNevoa, rLamento, rPanico, rCatacumbas, "snd15", "snd16", "snd17", "snd18", "snd19", nFuneral, nCoro] },
    { id: "pad-desert", name: "Desert Planet", icon: "mountain", color: "#fb923c", soundIds: [dDunas, "snd21", "snd22", dVerme, "snd24", "snd25", "snd26", nDunas] },
    { id: "pad-ice", name: "Ice Planet", icon: "snow", color: "#22d3ee", soundIds: [iBlizzard, "snd28", "snd29", "snd30", "snd31", "snd32", "snd33", nNinar, nAurora] },
    { id: "pad-jungle", name: "Jungle Planet", icon: "tree", color: "#4ade80", soundIds: [jDossel, "snd35", "snd36", "snd37", "snd38", "snd39", "snd40", "snd41", nProfund] },
    { id: "pad-future", name: "Future City", icon: "city", color: "#b78cff", soundIds: [cNeon, "snd43", "snd44", "snd45", "snd46", "snd47", "snd48", "snd49", nNeon] },
    { id: "pad-monster", name: "Monster Pack", icon: "paw", color: "#ef4444", soundIds: [mRugido, "snd51", "snd52", "snd53", "snd54", "snd55", "snd56", "snd57", nHorda] },
    { id: "pad-west", name: "True West", icon: "compass", color: "#d3a93e", soundIds: [wSaloon, "snd59", "snd60", "snd61", "snd62", "snd63", "snd64", "snd65", "snd66", nDuelo, nFiddle] },
    { id: "pad-waste", name: "Wasteland", icon: "flame", color: "#94a3b8", soundIds: [xPoeira, "snd68", "snd69", xSaqueadores, "snd71", "snd72", "snd73", "snd74", nFerro, nSucata] },
  ];

  /* ---- biblioteca dos soundboards legados do DOZERO ---- */
  const legacyAudio = [
    ["legacy-amb-rain", "Tempestade & Chuva", "rain", "natureza", "Ambiente", "/audio/ambience/rain.wav", 0],
    ["legacy-amb-tavern", "Taverna & Lareira", "flame", "cidade", "Ambiente", "/audio/ambience/tavern.wav", 0],
    ["legacy-amb-wind", "Vento Gélido", "wind", "natureza", "Ambiente", "/audio/ambience/wind.wav", 0],
    ["legacy-amb-combat", "Tensão de Batalha", "sword", "combate", "Ambiente", "/audio/ambience/combat.wav", 0],
    ["legacy-amb-cave", "Caverna & Cripta", "ghost", "dungeon", "Ambiente", "/audio/ambience/cave.wav", 0],
    ["legacy-amb-forest", "Floresta Misteriosa", "tree", "natureza", "Ambiente", "/audio/ambience/forest.wav", 0],
    ["legacy-amb-crickets", "Noite Estrelada", "moon", "natureza", "Ambiente", "/audio/ambience/crickets.wav", 0],
    ["legacy-amb-water", "Rio & Cachoeira", "wave", "maritimo", "Ambiente", "/audio/ambience/water.wav", 0],
    ["legacy-mus-epic", "Jornada Épica (Sinfonia)", "note", "musica", "Música", "/audio/music/epic_journey.mp3", 0],
    ["legacy-mus-tavern", "Taverna Festiva", "note", "musica", "Música", "/audio/music/tavern_vibe.mp3", 0],
    ["legacy-mus-dark", "Suspense & Mistério", "ghost", "horror", "Música", "/audio/ambience/cave.wav", 0],
    ["legacy-sfx-thunder", "Relâmpago / Trovão", "zap", "natureza", "SFX", "/audio/sfx/thunder.mp3", 3],
    ["legacy-sfx-sword", "Golpe de Espada", "sword", "combate", "SFX", "/audio/sfx/sword.mp3", 1],
    ["legacy-sfx-impact", "Impacto / Pancada", "zap", "combate", "SFX", "/audio/sfx/impact.mp3", 1],
    ["legacy-sfx-door", "Porta de Masmorra", "door", "dungeon", "SFX", "/audio/sfx/door.mp3", 1],
    ["legacy-sfx-magic", "Magia Arcana", "sparkle", "sagrado", "SFX", "/audio/sfx/magic.mp3", 1],
    ["legacy-sfx-alarm", "Alarme / Tensão", "bell", "combate", "SFX", "/audio/sfx/alarm.mp3", 1],
    ["legacy-sfx-victory", "Vitória", "sparkle", "sagrado", "SFX", "/audio/sfx/victory.mp3", 1],
    ["legacy-sfx-loot", "Tesouro / Ouro", "coin", "cidade", "SFX", "/audio/sfx/loot.mp3", 1],
    ["legacy-sfx-dice", "Rolagem de Dados", "dice", "combate", "SFX", "/audio/sfx/dice.mp3", 1],
    ["legacy-sfx-critical", "Acerto Crítico", "zap", "combate", "SFX", "/audio/sfx/critical.mp3", 1],
  ] as const;
  const legacySoundIds = legacyAudio.map(([id, name, icon, categoryId, type, fileUrl, duration]) => {
    sounds[id] = {
      id, name, icon, categoryId, type, synth: `file:${id}`, duration,
      loop: type !== "SFX", volume: type === "SFX" ? 78 : 65, fadeIn: type === "SFX" ? 30 : 700, fadeOut: type === "SFX" ? 150 : 900,
      fileUrl, createdAt: now,
    };
    return id;
  });
  pads.push({ id: "pad-legacy-audio", name: "Biblioteca DOZERO", icon: "folder", color: "#cd973c", soundIds: legacySoundIds });

  const scenes: Scene[] = [
    {
      id: "scn-taverna", name: "Taverna do Javali", icon: "users", fadeMs: 2500,
      layers: [
        { soundId: fTaverna, volume: 80 },
        { soundId: fFogueira, volume: 62 },
        { soundId: fChuva, volume: 38 },
      ],
    },
    {
      id: "scn-cripta", name: "Cripta Profana", icon: "skull", fadeMs: 3000,
      layers: [
        { soundId: rNevoa, volume: 70 },
        { soundId: rCatacumbas, volume: 55 },
        { soundId: rLamento, volume: 38 },
      ],
    },
    {
      id: "scn-emboscada", name: "Emboscada!", icon: "sword", fadeMs: 900,
      layers: [
        { soundId: fMarcha, volume: 85 },
        { soundId: rPanico, volume: 50 },
      ],
    },
    {
      id: "scn-tempestade", name: "Tempestade no Passo", icon: "zap", fadeMs: 2500,
      layers: [
        { soundId: "snd4", volume: 45 },
        { soundId: iBlizzard, volume: 55 },
        { soundId: fChuva, volume: 70 },
      ],
    },
    {
      id: "scn-astral", name: "Travessia Astral", icon: "rocket", fadeMs: 3500,
      layers: [
        { soundId: "snd26", volume: 60 },
        { soundId: "snd24", volume: 45 },
        { soundId: cNeon, volume: 30 },
      ],
    },
    {
      id: "scn-baile", name: "Baile de Inverno", icon: "crown", fadeMs: 2000,
      layers: [
        { soundId: nWaltz, volume: 72 },
        { soundId: fFogueira, volume: 48 },
        { soundId: fTaverna, volume: 40 },
      ],
    },
  ];

  const vistas: Vista[] = [
    { id: "vis-combate", name: "Combate Total", padId: "all", typeFilter: "Todos", categoryId: "combate", search: "" },
    { id: "vis-calma", name: "Calmaria do Mestre", padId: "pad-norte", typeFilter: "Ambiente", categoryId: "all", search: "" },
    { id: "vis-sombras", name: "Sombras de Raven", padId: "pad-raven", typeFilter: "Todos", categoryId: "horror", search: "" },
  ];

  return {
    sounds,
    pads,
    scenes,
    categories: CATS,
    vistas,
    favorites: [rpgMissile, rpgHeal, rpgFireball, rpgCrit, rpgShield, rpgDragon, fTaverna, fMarcha, rNevoa],
    vtt: {
      foundryUrl: "ws://localhost:30000",
      foundryConnected: false,
      roll20Key: "",
      roll20Connected: false,
      playerSync: false,
      triggers: [
        { id: "trg1", event: "combat_start", sceneId: "scn-emboscada", enabled: true },
        { id: "trg2", event: "long_rest", sceneId: "scn-taverna", enabled: true },
        { id: "trg3", event: "enter_dungeon", sceneId: "scn-cripta", enabled: false },
      ],
    },
    master: 80,
  };
}

/** Pacote comunitário importável (simula biblioteca compartilhada) */
export function communityPack(): { pad: Soundpad; sounds: Sound[]; scenes: Scene[] } {
  const now = Date.now();
  const mk = (id: string, name: string, icon: string, categoryId: string, type: SoundType, synth: string, extra: Partial<Sound> = {}): Sound => ({
    id, name, icon, categoryId, type, synth,
    duration: 0, loop: true, volume: 65, fadeIn: 800, fadeOut: 1000, createdAt: now, ...extra,
  });
  const sounds = [
    mk("eld1", "Sussurros do Vazio", "ghost", "horror", "Ambiente", "ghost", { volume: 50 }),
    mk("eld2", "Coral dos Afogados", "wave", "ritual", "Ambiente", "chant", { volume: 58 }),
    mk("eld3", "Maré Negra", "wave", "maritimo", "Ambiente", "sea", { volume: 66 }),
    mk("eld4", "Olho que Observa", "eye", "horror", "Ambiente", "droneDark", { volume: 60 }),
    mk("eld5", "Sino do Abismo", "bell", "horror", "SFX", "bellToll", { loop: false, duration: 7, fadeIn: 30, fadeOut: 150 }),
    mk("eld6", "Despertar do Leviatã", "paw", "combate", "SFX", "roar", { loop: false, duration: 1.7, fadeIn: 30, fadeOut: 150 }),
  ];
  return {
    sounds,
    pad: { id: "pad-eldritch", name: "Pacote Eldritch", icon: "eye", color: "#e879f9", soundIds: sounds.map((s) => s.id) },
    scenes: [
      {
        id: "scn-eldritch", name: "Chamado de Cthulhu", icon: "eye", fadeMs: 3500,
        layers: [
          { soundId: "eld4", volume: 62 },
          { soundId: "eld3", volume: 48 },
          { soundId: "eld1", volume: 40 },
        ],
      },
    ],
  };
}

export const seedState: DataState = buildSeed();
