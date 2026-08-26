import { MarkerType } from "@xyflow/react";
import type { RPGFicha, WEdge, WNode } from "./core";

/* ============================================================
 * O mundo exemplo: "A Mácula de Valdris"
 * Fichas de RPG ricas, tags (#) e conexões profundas
 * ============================================================ */

function n(
  id: string,
  typeId: string,
  label: string,
  summary: string,
  icon: string,
  tags: string[] = [],
  ficha?: RPGFicha,
  image?: string
): WNode {
  return {
    id,
    type: "world",
    position: { x: 0, y: 0 },
    data: {
      label,
      typeId,
      summary,
      icon,
      tags,
      ficha,
      image,
    },
  };
}

function e(id: string, source: string, target: string, label: string, color = "#d8b45a"): WEdge {
  return {
    id,
    source,
    target,
    type: "world",
    data: { label, color },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  };
}

export const SEED_NODES: WNode[] = [
  // Personagens
  n(
    "kaelen",
    "personagem",
    "Kaelen Vael",
    "Lâmina errante da [[Ordem do Véu]], carrega a [[Lâmina do Crepúsculo]] e uma dívida de sangue com [[Vhorun, o Olho Cego]].",
    "🧝",
    ["#protagonista", "#ladino", "#mestre-de-armas"],
    { level: "Nível 8", status: "Ativo", alignment: "Caótico e Neutro", hp: "68/68", defense: "CA 17", inventory: "Empunha a lendária [[Lâmina do Crepúsculo]].", gmNotes: "Possui uma cicatriz astral no pulso esquerdo que queima na presença dos [[Espreitadores do Véu]]." }
  ),
  n(
    "ondine",
    "personagem",
    "Mestra Ondine",
    "Vidente suprema que lidera a [[Ordem do Véu]]. Lê o tecido do cosmos e protege a [[Torre Alba]].",
    "🔮",
    ["#lider", "#arcano", "#vidente"],
    { level: "Nível 14", status: "Ativo", alignment: "Leal e Neutro", hp: "92/92", defense: "CA 15", gmNotes: "Sabe a verdadeira data da ruptura da [[Mácula de Khael]], mas guarda em segredo." }
  ),
  n(
    "bram",
    "personagem",
    "Bram, o Caçador",
    "Batedor silvaren que conhece cada sussurro do Bosque de Ecos. Odeia cidades suspensas.",
    "🏹",
    ["#batedor", "#druida", "#silvaren"],
    { level: "Nível 7", status: "Ativo", alignment: "Neutro e Bom", hp: "74/74", defense: "CA 16", gmNotes: "Consegue ouvir árvores mortas há séculos." }
  ),
  n(
    "seraphine",
    "personagem",
    "Séra dos Mapas",
    "Cartógrafa audaz da Companhia do Lampião. Desenha rotas que ninguém mais ousa trilhar.",
    "🧭",
    ["#cartografa", "#especialista", "#guia"],
    { level: "Nível 6", status: "Ativo", alignment: "Caótico e Bom", hp: "45/45", defense: "CA 14", gmNotes: "Possui uma bússola de mercúrio que aponta para anomalias do véu." }
  ),

  // Criaturas
  n(
    "pyrrhaxia",
    "criatura",
    "Pyrrhaxia, a Cinzenta",
    "Dragoa ancestral que dorme sob as Ruínas de Khael. Seu hálito apaga memórias dos que a desafiam.",
    "🐉",
    ["#boss", "#dragao", "#ancestral"],
    { level: "ND 18", status: "Adormecida", alignment: "Verdadeiro Neutro", hp: "340/340", defense: "CA 21", gmNotes: "Só acorda se a orbe fendida for removida do seu ninho." }
  ),
  n(
    "espreitadores",
    "criatura",
    "Espreitadores do Véu",
    "Sombras famintas que Vhorun cospe pela Mácula. Caçam em silêncio absoluto através do reflexo de espelhos.",
    "👁️",
    ["#monstro", "#sombras", "#vhorun"],
    { level: "ND 5", status: "Hostil", alignment: "Caótico e Mau", hp: "52/52", defense: "CA 15", gmNotes: "Vulneráveis a dano radiante e prata encantada." }
  ),

  // Divindades
  n(
    "aurora",
    "divindade",
    "Aurora, a Tecelã",
    "Deusa que tece o Véu da realidade. Cada amanhecer é um nó sagrado novo em seu tear divino.",
    "✨",
    ["#divindade", "#luz", "#ordem"],
    { level: "Deusa Maior", status: "Transcendente", alignment: "Leal e Bom", gmNotes: "Seu poder enfraquece a cada rasgo não reparado na tapeçaria." }
  ),
  n(
    "vhorun",
    "divindade",
    "Vhorun, o Devorador",
    "O deus faminto preso do outro lado do Véu. Quer desfazer a tapeçaria da existência fio a fio.",
    "🌑",
    ["#divindade", "#antagonista", "#vazio"],
    { level: "Deus Proibido", status: "Selado", alignment: "Caótico e Destrutivo", gmNotes: "Comunica-se através de pesadelos e sussurros de loucura." }
  ),

  // Locais
  n(
    "valdris",
    "local",
    "Valdris, a Cidade Suspensa",
    "Cidadela pendurada em correntes colossais sobre o Desfiladeiro de Sal. Sede da Ordem do Véu.",
    "🏰",
    ["#capital", "#seguro", "#fortaleza"],
    { status: "Habitada", gmNotes: "As 4 correntes maiores foram forjadas com lágrimas de titãs." }
  ),
  n(
    "bosque",
    "local",
    "Bosque de Ecos",
    "Floresta ancestral que repete em sussurros tudo que já foi dito entre suas copas eternas.",
    "🌲",
    ["#floresta", "#misterio", "#silvaren"],
    { status: "Instável", gmNotes: "Quem mente no bosque perde a voz por 3 dias." }
  ),
  n(
    "khael",
    "local",
    "Ruínas de Khael",
    "O que restou da primeira grande civilização. Hoje, um cemitério de torres sob névoa perpétua.",
    "🗿",
    ["#ruinas", "#perigo", "#tesouro"],
    { status: "Abandonado", gmNotes: "Repleto de armadilhas mecânicas e construtos desativados." }
  ),
  n(
    "portao",
    "local",
    "O Portão Selado",
    "Fenda abissal no fundo de Khael onde o Véu é fino como pele de cebola. Ninguém voltou de lá intacto.",
    "🚪",
    ["#portal", "#extremo-perigo", "#macula"],
    { status: "Rachado", gmNotes: "O selo original de Aurora está com 3 das 7 runas apagadas." }
  ),

  // Organizações
  n(
    "ordem",
    "organizacao",
    "Ordem do Véu",
    "Guardiões do tecido da realidade. Juraram remendar cada rasgo do mundo a qualquer custo.",
    "🛡️",
    ["#faccao", "#guardioes", "#leal"],
    { status: "Ativa", gmNotes: "Possuem arquivos secretos no subsolo da Cidadela de Valdris." }
  ),
  n(
    "companhia",
    "organizacao",
    "Companhia do Lampião",
    "Guilda de bravos guias e cartógrafos que mantém as rotas acesas contra a escuridão da Mácula.",
    "🏮",
    ["#guilda", "#exploradores", "#neutro"],
    { status: "Ativa", gmNotes: "Cobram pedágio e ouro em troca de passagem segura pelas trilhas." }
  ),

  // Itens
  n(
    "lamina",
    "item",
    "Lâmina do Crepúsculo",
    "Espada lendária que corta o Véu sem rasgá-lo. A única lâmina capaz de ferir um Espreitador duas vezes.",
    "🗡️",
    ["#arma-lendaria", "#reliquia", "#kaelen"],
    { level: "Artefato", status: "Empunhada", gmNotes: "Causa dano radiante extra a criaturas das sombras." }
  ),
  n(
    "orbe",
    "item",
    "Orbe Fendido",
    "Relíquia que Pyrrhaxia guarda: um olho cristalizado de Aurora, rachado na Primeira Queda.",
    "🔮",
    ["#artefato", "#divino", "#magia"],
    { level: "Artefato Maior", status: "Guardado", gmNotes: "Permite reverter 10 segundos no tempo uma vez por dia." }
  ),

  // Eventos
  n(
    "queda",
    "evento",
    "A Queda da Torre Alba",
    "Quando a maior torre de Valdris despencou no abismo, ceifando 300 almas e abrindo a primeira fenda.",
    "⚡",
    ["#cataclisma", "#historico", "#passado"],
    { status: "Concluído", gmNotes: "Ocorreu há 42 anos; foi sabotagem de um traidor da Ordem." }
  ),
  n(
    "pacto",
    "evento",
    "O Pacto de Cinzas",
    "Trégua selada entre a Ordem e Pyrrhaxia: a dragoa vigia o Portão e nenhuma expedição a caça.",
    "🕯️",
    ["#tratado", "#politica", "#paz"],
    { status: "Vigente", gmNotes: "O pacto está prestes a quebrar devido a caçadores clandestinos." }
  ),

  // Raças
  n(
    "drakonidas",
    "racas",
    "Drakônidas",
    "Povo-escama que reivindica linhagem direta de Pyrrhaxia. Falam com vibração no peito.",
    "🦎",
    ["#raca", "#guerreiros", "#resistencia"],
    { status: "Presente", gmNotes: "Imunes a fogo natural e resistentes a venenos arcanos." }
  ),
  n(
    "silvaren",
    "racas",
    "Silvaren",
    "Filhos imortais do Bosque de Ecos. Envelhecem ao contrário: nascem sábios e morrem crianças puras.",
    "🍃",
    ["#raca", "#elficos", "#floresta"],
    { status: "Presente", gmNotes: "Capacidade inata de passar despercebidos pela vegetação." }
  ),

  // Rotas
  n(
    "estrada",
    "rota",
    "Estrada das Cinzas",
    "Rota comercial perigosa que liga Valdris às Ruínas de Khael. À noite, cinzas caem sem fogo.",
    "🛤️",
    ["#rota-comercial", "#viagem", "#caravanas"],
    { status: "Patrulhada", gmNotes: "Tempo de viagem: 3 dias a cavalo." }
  ),
  n(
    "trilha",
    "rota",
    "Trilha dos Sussurros",
    "Atalho secreto pelo Bosque de Ecos. Só aparece no mapa para quem já a trilhou pelo menos uma vez.",
    "🌫️",
    ["#atalho", "#secreto", "#perigo"],
    { status: "Oculta", gmNotes: "Corta a viagem para 1 dia, mas exige teste de Sabedoria contra loucura." }
  ),

  // Conceitos
  n(
    "macula",
    "conceito",
    "A Mácula",
    "Corrupção entrópica que vaza das fendas do Véu: dobra pedras, corrompe memórias e quebra juramentos.",
    "💠",
    ["#lore", "#corrupcao", "#ameaca"],
    { status: "Em Expansão", gmNotes: "Cura apenas com o fogo sagrado de Aurora." }
  ),
  n(
    "magia",
    "conceito",
    "Magia do Véu",
    "A arte milenar de puxar fios da tapeçaria cósmica de Aurora. Todo fio puxado arrisca deixar um buraco.",
    "🌀",
    ["#sistema-de-magia", "#arcano", "#regras"],
    { status: "Fundamental", gmNotes: "Gera acúmulo de estresse arcano se conjurada em excesso." }
  ),

  // Resumos de Sessão
  n(
    "sessao12",
    "resumo",
    "Sessão 12 — O Portão Selado",
    "O grupo desceu às Ruínas de Khael, negociou com Pyrrhaxia e viu o Portão respirar pela primeira vez.",
    "📜",
    ["#sessao", "#campanha", "#recap"],
    { status: "Registrado", gmNotes: "XP concedido: 1.200 por jogador. Kaelen obteve pista da adaga." }
  ),
  n(
    "sessao13",
    "resumo",
    "Sessão 13 — Sob a Cidade",
    "Espreitadores invadiram as correntes de Valdris. Kaelen perdeu a lâmina temporariamente numa emboscada.",
    "📜",
    ["#sessao", "#campanha", "#climax"],
    { status: "Registrado", gmNotes: "Ondine revelou uma profecia incompleta antes da batalha terminar." }
  ),
];

export const SEED_EDGES: WEdge[] = [
  e("e1", "kaelen", "lamina", "empunha", "#d8b45a"),
  e("e2", "kaelen", "ordem", "desertou de", "#e0705f"),
  e("e3", "kaelen", "vhorun", "jurou vingança", "#e0705f"),
  e("e4", "kaelen", "bram", "aliado de", "#6fbf8f"),
  e("e5", "ondine", "ordem", "lidera", "#d8b45a"),
  e("e6", "ondine", "aurora", "devota de", "#facc15"),
  e("e7", "bram", "bosque", "habita", "#2dd4bf"),
  e("e8", "bram", "silvaren", "descende de", "#a3e635"),
  e("e9", "seraphine", "companhia", "membro de", "#d8b45a"),
  e("e10", "seraphine", "estrada", "mapeia", "#d4a373"),
  e("e11", "pyrrhaxia", "khael", "habita", "#2dd4bf"),
  e("e12", "pyrrhaxia", "orbe", "guarda", "#f472b6"),
  e("e13", "pyrrhaxia", "portao", "vigia", "#5fd0c5"),
  e("e14", "espreitadores", "vhorun", "servem", "#e0705f"),
  e("e15", "espreitadores", "macula", "nascem da", "#c778d9"),
  e("e16", "aurora", "vhorun", "opõe-se a", "#e0705f"),
  e("e17", "aurora", "magia", "tece", "#facc15"),
  e("e18", "magia", "macula", "pode corromper", "#c778d9"),
  e("e19", "valdris", "estrada", "liga-se por", "#d4a373"),
  e("e20", "estrada", "khael", "leva a", "#d4a373"),
  e("e21", "bosque", "trilha", "esconde a", "#d4a373"),
  e("e22", "trilha", "valdris", "leva a", "#d4a373"),
  e("e23", "ordem", "valdris", "sediada em", "#2dd4bf"),
  e("e24", "companhia", "estrada", "controla", "#e8a86b"),
  e("e25", "queda", "valdris", "aconteceu em", "#fb923c"),
  e("e26", "queda", "macula", "espalhou", "#c778d9"),
  e("e27", "pacto", "pyrrhaxia", "envolve", "#fb923c"),
  e("e28", "pacto", "ordem", "envolve", "#fb923c"),
  e("e29", "drakonidas", "pyrrhaxia", "descendem de", "#a3e635"),
  e("e30", "sessao12", "pacto", "culminou n'", "#94a3b8"),
  e("e31", "sessao12", "portao", "explorou", "#94a3b8"),
  e("e32", "sessao13", "espreitadores", "relata", "#94a3b8"),
  e("e33", "sessao13", "valdris", "ocorreu em", "#94a3b8"),
  e("e34", "ondine", "kaelen", "mentora de", "#6aa5e8"),
];

export const TYPE_ORDER = [
  "personagem",
  "criatura",
  "divindade",
  "local",
  "organizacao",
  "item",
  "evento",
  "racas",
  "rota",
  "conceito",
  "resumo",
];
