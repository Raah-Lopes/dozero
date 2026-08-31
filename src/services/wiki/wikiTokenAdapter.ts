type WikiData = Record<string, unknown>;

export interface WikiTokenPosition {
  x?: number;
  y?: number;
}

function asRecord(value: unknown): WikiData {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as WikiData : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(fallback: number, ...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function firstArray(...values: unknown[]): unknown[] {
  return values.find(Array.isArray) || [];
}

function validTokenShape(value: unknown): string {
  return ['circle', 'square', 'hexagon', 'standee', 'figure'].includes(String(value))
    ? String(value)
    : 'circle';
}

function validHpBarMode(value: unknown): 'always' | 'hover' | 'never' {
  return ['always', 'hover', 'never'].includes(String(value))
    ? value as 'always' | 'hover' | 'never'
    : 'always';
}

function isActive(value: unknown): boolean {
  return value !== false && value !== 'false';
}

/**
 * Resolve uma imagem sem permitir data URLs no estado Yjs. Imagens base64
 * tornam o documento compartilhado grande demais e podem impedir o token de
 * sincronizar com os outros participantes.
 */
export function getWikiTokenImage(data: WikiData, fallback: string): string {
  const image = firstString(data.token_imagem, data.imageUrl, data.avatar, data.imagem);
  return image && !image.startsWith('data:') ? image : fallback;
}

/** Converte o frontmatter legado ou estruturado de uma ficha em um token DOZERO. */
export function createWikiTokenData(data: WikiData, wikiPath: string, position: WikiTokenPosition = {}) {
  const ficha = asRecord(data.ficha_personagem);
  const cabecalho = asRecord(ficha.cabecalho);
  const pontosVida = asRecord(ficha.pontos_vida);
  const atributos = asRecord(ficha.atributos);
  const defesas = asRecord(ficha.defesas);
  const path = wikiPath.toLowerCase();
  const tipo = String(data.tipo || '').toLowerCase();
  const status = String(data.status || '').toLowerCase();
  const isPlayer = ['pc', 'personagem', 'jogador'].includes(tipo) || status === 'jogador' || path.includes('/jogadores/');
  const isEnemy = !isPlayer && (['monstro', 'inimigo', 'hostil', 'criatura'].includes(tipo) || ['inimigo', 'hostil'].includes(status));
  const type = isPlayer ? 'player' : isEnemy ? 'enemy' : 'npc';
  const fallbackImage = isPlayer ? '/mascot/zye-head-smile.png' : isEnemy ? '/enemy_monster.png' : '/enemy_bandit.png';
  const hp = firstNumber(100, pontosVida.atuais, data.HP, data.hp, data.pv);
  const maxHp = firstNumber(hp, pontosVida.maximo, data.HP_max, data.maxHp, data.pv_max, data.HP, data.hp, data.pv);
  const mana = firstNumber(0, data.PM, data.mana, data.mp);
  const maxMana = firstNumber(mana, data.PM_max, data.maxMana, data.mana_max, data.mp_max, data.PM, data.mana, data.mp);
  const explicitVision = data.hasVision;

  return {
    x: position.x ?? 0,
    y: position.y ?? 0,
    name: firstString(cabecalho.nome_personagem, data.nome, data.titulo, data.title, wikiPath.split(/[\\/]/).pop()?.replace(/\.md$/i, '')) || 'Sem nome',
    type,
    status: isPlayer ? 'jogador' : isEnemy ? 'inimigo' : 'npc',
    isPlayer,
    hp,
    maxHp,
    mana,
    maxMana,
    defesa: firstNumber(10, defesas.ca, data.defesa, data.Defesa, data.CA),
    ataque: firstNumber(0, data.ataque, data.Ataque),
    velocidade: firstNumber(0, ficha.velocidade_metros, data.velocidade, data.Velocidade, data.Deslocamento),
    imageUrl: getWikiTokenImage(data, fallbackImage),
    tokenShape: validTokenShape(data.tokenShape),
    sizeScale: Math.max(0.1, firstNumber(1, data.sizeScale)),
    borderColor: firstString(data.borderColor) || (isPlayer ? '#10b981' : isEnemy ? '#ef4444' : '#f59e0b'),
    showName: typeof data.showName === 'boolean' ? data.showName : true,
    hpBarMode: validHpBarMode(data.hpBarMode),
    visionRadius: Math.max(0, firstNumber(0, data.visionRadius)),
    hasVision: explicitVision === false || explicitVision === 'false' ? false : true,
    ativo: isActive(data.ativo),
    status_efeitos: firstArray(data.status_efeitos).map(String),
    sanity: firstNumber(100, data.sanidade, data.Sanidade),
    sanidade: firstNumber(100, data.sanidade, data.Sanidade),
    hunger: firstNumber(0, data.fome, data.Fome),
    thirst: firstNumber(0, data.sede, data.Sede),
    energia: firstNumber(100, data.energia, data.Energia),
    wikiPath,
    caminhoArquivo: wikiPath,
    wikiSlug: wikiPath.split(/[\\/]/).pop()?.replace(/\.md$/i, ''),
    inventario: firstArray(data.inventario),
    armas: firstArray(data.armas),
    poderes: firstArray(data.poderes),
    pocoes: firstArray(data.pocoes),
    maldicoes: firstArray(data.maldicoes),
    objetos_campanha: firstArray(data.objetos_campanha),
    macros: firstArray(data.macros),
    atributos: Object.keys(atributos).length > 0 ? atributos : undefined,
  };
}
