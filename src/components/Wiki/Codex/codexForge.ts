/*
 * Forja de Criaturas — motor de geração determinística (com semente aleatória).
 * Recebe as escolhas do assistente e devolve uma criatura completa:
 * nome, título, lore, estatísticas e campos prontos para a ficha.
 */

export interface ConfigForja {
  prompt: string;
  categoria: string;
  familia: string;
  tematica: string;
  porte: string;
  ameaca: string;
  estilo: string;
  papel: string;
  extras: string;
}

export interface ResultadoForja {
  nome: string;
  descricao: string;
  campos: Record<string, string>;
  tags: string[];
  icone: string | null;
}

/* ---------- utilidades ---------- */

type Rng = () => number;

function mulberry32(semente: number): Rng {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escolha = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];

const distintas = <T,>(r: Rng, arr: readonly T[], n: number): T[] => {
  const copia = [...arr];
  const saida: T[] = [];
  while (saida.length < n && copia.length) saida.push(copia.splice(Math.floor(r() * copia.length), 1)[0]);
  return saida;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const slugTematica = (t: string): string => {
  const s = slug(t);
  if (s.startsWith("sombrio")) return "sombrio";
  if (s.startsWith("elemental")) return "elemental";
  if (s.startsWith("infernal")) return "infernal";
  if (s.startsWith("arcano")) return "arcano";
  if (s.startsWith("bestial")) return "bestial";
  if (s.startsWith("militar")) return "militar";
  if (s.startsWith("morto")) return "morto";
  if (s.startsWith("dracon")) return "draconico";
  return "sombrio";
};

/* ---------- tabelas ---------- */

const NOMES: Record<string, { pre: string[]; suf: string[] }> = {
  sombrio: {
    pre: ["Vor", "Mal", "Gor", "Krag", "Thul", "Zeth", "Noct", "Umbra", "Mor"],
    suf: ["ath", "ok", "mir", "zul", "gar", "neth", "dor", "gash", "hun"],
  },
  elemental: {
    pre: ["Tor", "Tem", "Bor", "Gal", "Zef", "Pyr", "Unda"],
    suf: ["um", "ar", "ion", "ess", "orim", "ael"],
  },
  infernal: {
    pre: ["Az", "Bel", "Xal", "Vaz", "Mal", "Gorg"],
    suf: ["gor", "phon", "zeb", "rak", "phar", "uth"],
  },
  arcano: {
    pre: ["Aur", "Thal", "Eld", "Myr", "Ser", "Oph", "Vael"],
    suf: ["ion", "ath", "elis", "um", "ar", "ith"],
  },
  bestial: {
    pre: ["Fen", "Urs", "Rav", "Gru", "Skar", "Lup"],
    suf: ["ar", "ok", "fang", "mir", "gar", "thak"],
  },
  militar: {
    pre: ["Cor", "Val", "Tor", "Bran", "Ser", "Kar"],
    suf: ["van", "dras", "mund", "ek", "os", "an"],
  },
  morto: {
    pre: ["Mor", "Nek", "Oss", "Ghul", "Vam", "Sepul"],
    suf: ["arth", "eron", "uvia", "ir", "ok", "eth"],
  },
  draconico: {
    pre: ["Ver", "Aur", "Zir", "Kal", "Drax", "Vael", "Ith"],
    suf: ["ion", "ax", "arion", "uth", "ys", "axus"],
  },
};

const TITULOS_MIL = ["Comandante", "Centurião", "Carrasco", "Estandarte", "Marechal", "Algoz"];

const EPITETOS = [
  "o Devorador", "a Lamentação", "das Cinzas", "o Sem-Rosto", "da Maré Negra", "o Eterno",
  "Portador do Vazio", "a Última Chama", "o Flagelo", "da Noite Partida", "o Voraz",
  "Coração de Brasa", "o Silencioso", "de Mil Olhos",
];

const FOLCLORE = [
  "Boitatá", "Mapinguari", "Curupira", "Iara", "Cuca", "Mula-sem-Cabeça", "Cabra-Cabriola",
  "Corpo-Seco", "Pisadeira", "Bicho-Papão", "Matinta Perera", "Minhocão", "Papa-Figo",
];

const EPITETOS_FOLC = [
  "do Brejo Fundo", "da Serra Negra", "do Ribeirão das Almas", "da Mata Fechada",
  "das Sete Encruzilhadas", "do Cerrado Velho",
];

const AMEACA: Record<string, { faixa: [number, number]; xp: [number, number] }> = {
  Minion: { faixa: [1, 1], xp: [25, 50] },
  Fraco: { faixa: [1, 4], xp: [100, 200] },
  Médio: { faixa: [5, 8], xp: [450, 1100] },
  Forte: { faixa: [9, 14], xp: [2300, 5000] },
  Elite: { faixa: [15, 18], xp: [8400, 13000] },
  Lendário: { faixa: [19, 23], xp: [22000, 30000] },
};

const PORTE_MULT: Record<string, number> = {
  Diminuto: 0.45, Miúdo: 0.65, Pequeno: 0.85, Médio: 1, Grande: 1.45, Enorme: 2.1, Colossal: 3.4,
};

const HABITAT: Record<string, string> = {
  sombrio: "criptas afundadas, pântanos mortos e ruínas que os mapas se recusam a nomear",
  elemental: "o coração de tempestades eternas, geleiras vivas e desertos de vidro",
  infernal: "fendas sulfurosas, pactos selados e cidades erguidas sobre ossos",
  arcano: "bibliotecas lacradas, torres invertidas e anéis de menires adormecidos",
  bestial: "matas antigas, desfiladeiros de caça e vales onde o vento uiva de volta",
  militar: "estradas de guerra, fortalezas sitiadas e acampamentos que nunca dormem",
  morto: "necrópoles esquecidas, campos de batalha antigos e vilarejos que param os relógios",
  draconico: "picos acima das nuvens, vulcões adormecidos e cavernas de tesouro amaldiçoado",
};

const ABERTURAS: Record<string, string[]> = {
  sombrio: [
    "Há lugares onde a luz aprende a pedir perdão — {nome} nasceu de um deles.",
    "Os antigos não enterravam {nome}; eles o negociavam.",
  ],
  elemental: [
    "Quando a natureza perde a paciência, ela não envia exércitos: envia {nome}.",
    "{nome} não é uma criatura que habita o mundo — é o mundo, por um instante, ganhando fome.",
  ],
  infernal: [
    "Todo pacto tem uma cláusula que ninguém lê em voz alta. {nome} é essa cláusula.",
    "Dizem que o inferno não exporta monstros; ele empresta. E {nome} venceu o prazo.",
  ],
  arcano: [
    "{nome} foi esculpido para guardar algo que os próprios criadores temiam lembrar.",
    "Os arcanos discutem se {nome} é um feitiço que ganhou vontade ou uma vontade que virou feitiço.",
  ],
  bestial: [
    "Os caçadores da região têm uma regra: se a floresta ficar quieta demais, {nome} está ouvindo.",
    "{nome} não odeia os viajantes. Apenas nunca aprendeu que eles param de se mover.",
  ],
  militar: [
    "Nos registros da campanha, {nome} aparece três vezes. Depois disso, os registros aparecem sem páginas.",
    "{nome} não comanda por medo — comanda porque já viu o fim de todas as formações possíveis.",
  ],
  morto: [
    "A morte costuma ser um ponto final. No caso de {nome}, foi apenas uma vírgula.",
    "{nome} lembra de estar vivo do mesmo modo que um rio lembra da chuva.",
  ],
  draconico: [
    "As montanhas não abrigam {nome}; elas o toleram, como se tolera um vulcão educado.",
    "Antes de {nome}, o céu desta região tinha outra cor. Ninguém sabe dizer qual.",
  ],
};

const MEIOS: Record<string, string[]> = {
  sombrio: [
    "Move-se entre o visível e o quase, deixando para trás um frio que cheira a ferro e velas apagadas.",
    "Seus olhos não refletem a luz: negociam com ela.",
  ],
  elemental: [
    "Seu corpo é um argumento geológico — pedra, raiz e trovão em desacordo permanente.",
    "O ar ao seu redor se dobra, como se o próprio clima pedisse licença.",
  ],
  infernal: [
    "Cada palavra sua soa como um contrato lido em voz baixa, e nenhuma é gratuita.",
    "Onde pisa, o chão lembra de promessas antigas e começa a cobrar.",
  ],
  arcano: [
    "Runas dormem sob sua superfície, acordando apenas quando a pergunta errada é feita.",
    "Gravidade e tempo tratam {nome} como um colega, não como um sujeito.",
  ],
  bestial: [
    "Caça com paciência de estação: não persegue a presa, espera o inverno fazer o trabalho.",
    "Seu rugido não assusta — posiciona. Depois dele, todos já estão onde {nome} queria.",
  ],
  militar: [
    "Lê um campo de batalha como outros leem um cardápio: sem pressa e sabendo o que vai pedir.",
    "Suas tropas não obedecem por lealdade; obedecem porque a alternativa já foi apresentada.",
  ],
  morto: [
    "Carrega o próprio silêncio como armadura, e ele nunca trinca.",
    "Não precisa de exércitos: basta que os mortos antigos lembrem do seu nome.",
  ],
  draconico: [
    "Seu voo não desloca ar — desloca prioridades.",
    "Guarda um tesouro que não é ouro: é o que restou das perguntas que lhe fizeram.",
  ],
};

const HABILIDADES: Record<string, [string, string][]> = {
  sombrio: [
    ["Manto do Vazio", "torna-se quase imperceptível; ataques contra ele sofrem desvantagem até que ataque"],
    ["Toque da Vigília", "drena lembranças; a vítima esquece uma habilidade até o amanhecer"],
    ["Uivo Subterrâneo", "o medo se espalha em raio — criaturas fracas fogem ou congelam"],
    ["Pele de Penumbra", "dano radiante é reduzido pela metade; luz forte o revela"],
  ],
  elemental: [
    ["Fôlego da Tempestade", "exala uma rajada elemental em cone que empurra e atordoa"],
    ["Pele de Obsidiana", "ganha resistência a dano físico enquanto não se mover"],
    ["Raízes Famintas", "o solo ao redor prende os pés dos inimigos"],
    ["Núcleo Instável", "ao cair abaixo de metade da vitalidade, explode em lascas elementais"],
  ],
  infernal: [
    ["Cláusula Escaldante", "marcas de pacto queimam quem quebrar a palavra perto dele"],
    ["Correntes de Brasa", "agarrões à distância que puxam a presa para o calor"],
    ["Pacto Menor", "oferece um acordo no meio do combate — aceitar muda as regras da cena"],
    ["Aura de Enxofre", "o ar ao redor sufoca tochas, magias de chama e coragem"],
  ],
  arcano: [
    ["Glifo Vivo", "runas orbitam o corpo e explodem ao serem tocadas"],
    ["Espelho de Sílabas", "copia a última magia lançada contra ele, invertida"],
    ["Passo Vetorial", "teleporta-se para qualquer sombra de objeto que já viu"],
    ["Campo de Estase", "congela o tempo num raio curto — menos para ele"],
  ],
  bestial: [
    ["Investida Sísmica", "ataque em carga que derruba e abre crateras"],
    ["Faro de Sangue", "encontra feridos a quilômetros; ignora furtividade de quem sangra"],
    ["Mandíbula de Pressão", "mordida que prende; escapar exige força ou sacrifício de equipamento"],
    ["Pele de Matilha", "chama criaturas menores do território para cercar"],
  ],
  militar: [
    ["Voz de Comando", "aliados ganham precisão; inimigos hesitam na primeira rodada"],
    ["Formação Quebrada", "reposiciona o campo: derruba cobertura e empurra linhas"],
    ["Julgamento Marcial", "marca um alvo; enquanto o marca, ignora todos os outros"],
    ["Retirada Impossível", "quando encurralado, abre uma rota que não existia — para ele"],
  ],
  morto: [
    ["Véu de Cinzas", "ergue névoa necrótica que apaga sentidos e bússolas"],
    ["Chamado da Cova", "mãos esqueléticas agarram tornozelos numa área ampla"],
    ["Memória Fria", "assume a voz de alguém querido pela vítima para um golpe certeiro"],
    ["Coroa de Ossos", "cada queda de um aliado próximo o fortalece"],
  ],
  draconico: [
    ["Sopro Ancião", "exala destruição em cone ou linha, deixando o terreno alterado"],
    ["Escamas de Era", "ignora dano de armas que não sejam notáveis ou antigas"],
    ["Presença do Ápice", "criaturas de nível baixo precisam de coragem para agir"],
    ["Voo de Julgamento", "reposiciona-se pelo céu e escolhe o próximo golpe do alto"],
  ],
};

const FRAQUEZAS: Record<string, string> = {
  sombrio: "Luz concentrada e rituais de alvorecer revelam seu contorno; odeia espelhos, pois neles aparece o que ele comeu",
  elemental: "Seu núcleo fica exposto quando usa a habilidade mais forte; som grave e constante desestabiliza sua forma",
  infernal: "Contratos o prendem — cumprir à risca um acordo o obriga; prata abençoada queima suas correntes",
  arcano: "Sua magia tem um ritmo: interromper a sílaba certa (um contra-feitiço no tempo exato) o trava por um turno",
  bestial: "Caça por cheiro e som; pó de pimenta, água corrente e silêncio total confundem o faro",
  militar: "Sua honra é a alavanca: desafios formais, reféns e terreno estreito quebram sua doutrina",
  morto: "Âncoras materiais — objetos da vida passada — o prendem ao local; fogo purificador impede a regeneração",
  draconico: "Vaidade antiga: elogios, enigmas e tributos compram tempo; o ventre sob a asa é o ponto de sempre",
};

const DICAS_PAPEL: Record<string, string> = {
  Automático: "Use como a cena pedir — ele sabe improvisar.",
  Líder: "Mantenha-o atrás da linha, gritando ordens; mate o líder e a formação racha.",
  Comum: "Surge em grupos de 2 a 4; funciona como pressão constante.",
  Caçador: "Envie-o contra quem fugir — a perseguição é o espetáculo.",
  Artilheiro: "Deixe-o em posição elevada; obrigue o grupo a se mover ou morrer.",
  Bruto: "Jogue-o na linha de frente do grupo; espaço apertado o favorece.",
  Controlador: "Ele dita o campo: zonas de perigo, prisões e dilemas de posicionamento.",
  Boss: "Duas fases: quando cair abaixo de metade, algo nele muda (e o cenário também).",
  Espreitador: "Nunca mostre tudo dele; garras, sombras e desaparecimentos.",
  Manipulador: "Ele não luta — negocia, mente e some; o combate é o fracasso do plano dele.",
  Soldado: "Combina com aliados; em dupla com um suporte, vira um problema sério.",
  Suporte: "Prioridade do grupo inteligente: enquanto viver, os outros não caem.",
  Especialista: "Contra-medida direta para o recurso favorito do grupo (magia, furtividade, cura...).",
  Enxame: "Muitos, fracos, incansáveis — a munição do grupo acaba antes deles.",
  Solo: "Duelo: dê ações extras e terreno vivo, ou ele vira saco de pancadas.",
};

const ICONES_CATEGORIA: Record<string, string> = {
  Monstro: "garra",
  "NPC Hostil": "mascara",
  Boss: "coroa",
  Minion: "pata",
};

const FAMILIA_TIPO: Record<string, string> = {
  "Aberração": "Aberração",
  "Construto": "Construto",
  "Morto-Vivo": "Morto-vivo",
  "Elemental": "Elemental",
  "Celestial": "Celestial",
  "Feérico": "Feérico",
  "Diabo": "Corruptor",
};

const TEMATICA_TIPO: Record<string, string> = {
  sombrio: "Aberração",
  elemental: "Elemental",
  infernal: "Corruptor",
  arcano: "Construto",
  bestial: "Besta",
  militar: "Humanoide",
  morto: "Morto-vivo",
  draconico: "Dragão",
};

/* ---------- o motor ---------- */

export function forjarCriatura(cfg: ConfigForja): ResultadoForja {
  const r = mulberry32((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  const tk = slugTematica(cfg.tematica);

  /* nome */
  let nome: string;
  if (cfg.estilo === "Folclórico Brasileiro") {
    nome = escolha(r, FOLCLORE);
    if (r() > 0.4) nome += " " + escolha(r, EPITETOS_FOLC);
  } else {
    const t = NOMES[tk] ?? NOMES.sombrio;
    nome = cap(escolha(r, t.pre) + escolha(r, t.suf));
    if (cfg.categoria === "NPC Hostil" || tk === "militar") nome = escolha(r, TITULOS_MIL) + " " + nome;
    if (r() > 0.35) nome += ", " + escolha(r, EPITETOS);
  }

  /* números */
  const am = AMEACA[cfg.ameaca] ?? AMEACA.Médio;
  const nivel = am.faixa[0] + Math.floor(r() * (am.faixa[1] - am.faixa[0] + 1));
  const xpBase = am.xp[0] + Math.floor(r() * (am.xp[1] - am.xp[0] + 1));
  const mult = PORTE_MULT[cfg.porte] ?? 1;
  const xp = Math.round((xpBase * Math.sqrt(mult)) / 10) * 10;
  const vitalidade = Math.round(nivel * 8 * mult + r() * nivel * 2);
  const ataque = Math.round(2 + nivel * 1.4 * Math.pow(mult, 0.25) + r() * 3);
  const defesa = Math.round(8 + nivel * 0.9 + mult * 2 + r() * 3);

  /* habilidades e fraqueza */
  const habs = distintas(r, HABILIDADES[tk] ?? HABILIDADES.sombrio, 3).map(
    ([h, efeito]) => `${h} — ${cap(efeito)}.`
  );
  if (cfg.papel !== "Automático") {
    habs.push(`Instinto de ${cfg.papel.toLowerCase()} — ${DICAS_PAPEL[cfg.papel]}`);
  }
  const fraqueza = `${FRAQUEZAS[tk] ?? FRAQUEZAS.sombrio}. Tática: ${DICAS_PAPEL[cfg.papel] ?? DICAS_PAPEL.Automático}`;

  /* lore */
  const abre = (frase: string) => frase.split("{nome}").join(nome);
  const abertura = abre(escolha(r, ABERTURAS[tk] ?? ABERTURAS.sombrio));
  const meio = abre(escolha(r, MEIOS[tk] ?? MEIOS.sombrio));
  const paragrafos = [abertura, meio];
  if (cfg.prompt.trim()) {
    paragrafos.push("Nas visões do mestre, " + cfg.prompt.trim().replace(/\.$/, "") + ".");
  }
  if (cfg.extras.trim()) {
    paragrafos.push("Ordens da mesa: " + cfg.extras.trim().replace(/\.$/, "") + ".");
  }
  paragrafos.push(
    `Vitalidade ${vitalidade} · Ataque +${ataque} · Defesa ${defesa}. Encontrado em ${HABITAT[tk] ?? HABITAT.sombrio}.`
  );

  /* campos da ficha */
  const campos: Record<string, string> = {
    porte: cfg.porte,
    categoria: cfg.categoria,
    tipoCriatura: cfg.familia ? (FAMILIA_TIPO[cfg.familia] ?? TEMATICA_TIPO[tk]) : TEMATICA_TIPO[tk],
    ameaca: cfg.ameaca,
    desafio: `ND ${nivel} · ~${xp.toLocaleString("pt-BR")} XP`,
    estilo: cfg.estilo,
    papel: cfg.papel || "Automático",
    habitat: cap(HABITAT[tk] ?? HABITAT.sombrio),
    habilidades: habs.join("\n"),
    fraquezas: fraqueza,
  };

  const tags = [
    slug(cfg.tematica),
    slug(cfg.categoria),
    slug(cfg.porte),
    cfg.papel && cfg.papel !== "Automático" ? slug(cfg.papel) : null,
    "forjado",
  ].filter((t): t is string => Boolean(t));

  return {
    nome,
    descricao: paragrafos.join("\n\n"),
    campos,
    tags,
    icone: ICONES_CATEGORIA[cfg.categoria] ?? null,
  };
}

export function resumoConfig(cfg: ConfigForja): [string, string][] {
  const linhas: [string, string][] = [
    ["Categoria", cfg.categoria || "—"],
  ];
  if (cfg.familia) linhas.push(["Família", cfg.familia]);
  linhas.push(
    ["Temática", cfg.tematica || "—"],
    ["Porte", cfg.porte || "—"],
    ["Ameaça", cfg.ameaca || "—"],
    ["Estilo", cfg.estilo || "—"],
    ["Papel tático", cfg.papel || "Automático"]
  );
  return linhas;
}
