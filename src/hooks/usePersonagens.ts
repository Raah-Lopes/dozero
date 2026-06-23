// src/hooks/usePersonagens.ts
// Hook centralizado para carregar e mapear personagens da wiki.
// Substitui a lógica duplicada que existia em AutomatedDiceWidget e CharacterRosterWidget.
import { useState, useCallback, useEffect } from 'react';
import { useWiki } from './useWiki';

export interface FichaPersonagem {
  nome: string;
  pv: number;
  pv_max: number;
  xp: number;
  nivel: number;
  mana: number;
  mana_max: number;
  armadura: number;
  defesa: number;
  velocidade: number;
  ataque: number;
  status: 'jogador' | 'npc' | 'inimigo';
  avatar?: string;
  caminhoArquivo: string;
  ativo: boolean;
  ouro: number;
  tipoFicha: string;
  usos_cura: number;
  status_efeitos: string[];
  saqueado: boolean;

  // Atributos 4DET / D&D
  forca: number;
  destreza: number;
  constituicao: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;

  // Atributos 3D&T
  habilidade: number;
  armadura_3dt: number;
  forca_3dt: number;
  resistencia: number;
  pdf: number;

  // Inventário e equipamentos
  inventario: any[];
  armas: any[];
  poderes: any[];
  pocoes: any[];
  maldicoes: any[];
  objetos_campanha: any[];

  // Ataque personalizado
  ataque_basico?: string;

  // Macros MD (ataques/rolagens personalizadas do frontmatter)
  macros?: MacroFicha[];

  // Recursos físicos/vitais
  energia: number;
  energia_max: number;
  sanidade: number;
  sanidade_max: number;
  fome: number;
  fome_max: number;
  sede: number;
  sede_max: number;
  cansaco: number;
  cansaco_max: number;
  riquezas: number;
}

export interface MacroFicha {
  nome: string;
  formula: string;
  tipo?: 'ataque' | 'defesa' | 'teste' | 'magia' | 'outro';
  descricao?: string;
  custo?: string;
}

/** Converte valor YAML que pode ser NaN/null/undefined para um número válido */
function safeNum(val: any, fallback: number): number {
  if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
    return fallback;
  }
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

/** Retorna true se o valor é "não configurado" (NaN, null, undefined ou string vazia) */
export function isFieldConfigured(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number' && isNaN(val)) return false;
  return true;
}

function mapearEntidade(e: any): FichaPersonagem {
  const tipo = e.metadata?.tipo;
  const metaStatus = String(e.metadata?.status || '').toLowerCase();

  let status: 'jogador' | 'npc' | 'inimigo' = 'npc';
  if (['pc', 'personagem', 'jogador'].includes(String(tipo || '').toLowerCase()) || metaStatus === 'jogador') {
    status = 'jogador';
  } else if (['monstro', 'inimigo', 'hostil'].includes(String(tipo || '').toLowerCase()) || metaStatus === 'inimigo' || metaStatus === 'hostil') {
    status = 'inimigo';
  }

  // Macros do frontmatter
  let macros: MacroFicha[] = [];
  if (Array.isArray(e.metadata?.macros)) {
    macros = e.metadata.macros.map((m: any) => ({
      nome: String(m.nome || m.name || 'Macro'),
      formula: String(m.formula || m.dice || '1d20'),
      tipo: m.tipo || m.type || 'outro',
      descricao: m.descricao || m.description || '',
      custo: m.custo || m.cost || '',
    }));
  }

  return {
    nome: e.metadata?.nome || e.metadata?.titulo || e.slug || 'Sem nome',
    pv: safeNum(e.metadata?.pv ?? e.metadata?.HP, 0),
    pv_max: safeNum(e.metadata?.pv_max ?? e.metadata?.HP_max ?? e.metadata?.pv ?? e.metadata?.HP, 0),
    xp: safeNum(e.metadata?.xp ?? e.metadata?.XP ?? e.metadata?.XP_recompensa, 0),
    nivel: safeNum(e.metadata?.nivel ?? e.metadata?.Nivel, 1),
    mana: safeNum(e.metadata?.mana ?? e.metadata?.PM, 0),
    mana_max: safeNum(e.metadata?.mana_max ?? e.metadata?.PM_max ?? e.metadata?.mana ?? e.metadata?.PM, 0),
    armadura: safeNum(e.metadata?.armadura ?? e.metadata?.Armadura ?? e.metadata?.CA ?? e.metadata?.A, 0),
    defesa: safeNum(e.metadata?.defesa ?? e.metadata?.Defesa ?? e.metadata?.CA, 0),
    velocidade: safeNum(e.metadata?.velocidade ?? e.metadata?.Velocidade ?? e.metadata?.Deslocamento, 0),
    ataque: safeNum(e.metadata?.ataque ?? e.metadata?.Ataque ?? e.metadata?.F ?? e.metadata?.PdF, 0),
    status,
    avatar: e.metadata?.imageUrl || e.metadata?.avatar || e.metadata?.imagem,
    caminhoArquivo: e.path,
    ativo: e.metadata?.ativo !== false,
    ouro: safeNum(e.metadata?.ouro ?? e.metadata?.Ouro ?? e.metadata?.Ouro_recompensa, 0),
    tipoFicha: String(e.metadata?.tipo || (status === 'jogador' ? 'Personagem' : status === 'inimigo' ? 'Monstro' : 'NPC')),
    usos_cura: e.metadata?.usos_cura_atual !== undefined ? safeNum(e.metadata.usos_cura_atual, 3) : 3,
    status_efeitos: Array.isArray(e.metadata?.status_efeitos) ? e.metadata.status_efeitos : [],
    saqueado: e.metadata?.saqueado === 'true' || e.metadata?.saqueado === true,

    // 4DET
    forca: safeNum(e.metadata?.força ?? e.metadata?.forca ?? e.metadata?.FOR, 10),
    destreza: safeNum(e.metadata?.destreza ?? e.metadata?.DES, 10),
    constituicao: safeNum(e.metadata?.constituicao ?? e.metadata?.CON, 10),
    inteligencia: safeNum(e.metadata?.inteligencia ?? e.metadata?.INT, 10),
    sabedoria: safeNum(e.metadata?.sabedoria ?? e.metadata?.SAB, 10),
    carisma: safeNum(e.metadata?.carisma ?? e.metadata?.CAR, 10),

    // 3D&T
    habilidade: safeNum(e.metadata?.habilidade ?? e.metadata?.H, 0),
    armadura_3dt: safeNum(e.metadata?.armadura_3dt ?? e.metadata?.A, 0),
    forca_3dt: safeNum(e.metadata?.forca_3dt ?? e.metadata?.F, 0),
    resistencia: safeNum(e.metadata?.resistencia ?? e.metadata?.R, 0),
    pdf: safeNum(e.metadata?.pdf ?? e.metadata?.PdF, 0),

    // Inventário
    inventario: Array.isArray(e.metadata?.inventario) ? e.metadata.inventario : [],
    armas: Array.isArray(e.metadata?.armas) ? e.metadata.armas : [],
    poderes: Array.isArray(e.metadata?.poderes) ? e.metadata.poderes : [],
    pocoes: Array.isArray(e.metadata?.pocoes) ? e.metadata.pocoes : [],
    maldicoes: Array.isArray(e.metadata?.maldicoes) ? e.metadata.maldicoes : [],
    objetos_campanha: Array.isArray(e.metadata?.objetos_campanha) ? e.metadata.objetos_campanha : [],

    ataque_basico: e.metadata?.ataque_basico || e.metadata?.ataque_basico_descricao,
    macros,

    // Recursos físicos — usa isFieldConfigured para não mostrar campos NaN
    energia: safeNum(e.metadata?.energia, 100),
    energia_max: safeNum(e.metadata?.energia_max, 100),
    sanidade: safeNum(e.metadata?.sanidade ?? e.metadata?.Sanidade, 100),
    sanidade_max: safeNum(e.metadata?.sanidade_max ?? e.metadata?.Sanidade_max, 100),
    fome: safeNum(e.metadata?.fome ?? e.metadata?.Fome, 0),
    fome_max: safeNum(e.metadata?.fome_max, 100),
    sede: safeNum(e.metadata?.sede ?? e.metadata?.Sede, 0),
    sede_max: safeNum(e.metadata?.sede_max, 100),
    cansaco: safeNum(e.metadata?.cansaco ?? e.metadata?.Cansaço, 0),
    cansaco_max: safeNum(e.metadata?.cansaco_max, 100),
    riquezas: safeNum(e.metadata?.riquezas ?? e.metadata?.Riquezas, 0),
  };
}

function isFichaEntry(e: any): boolean {
  const tipo = String(e.metadata?.tipo || '').toLowerCase();
  const status = String(e.metadata?.status || '').toLowerCase();
  const path = e.path.toLowerCase();

  if (path.includes('_modelo')) return false;

  return (
    ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
    ['jogador', 'npc', 'inimigo'].includes(status) ||
    path.includes('/fichas/') ||
    path.includes('/personagens/')
  );
}

/**
 * Hook centralizado para carregar personagens/fichas da wiki.
 * @param apenasAtivos - se true (padrão), filtra apenas personagens com ativo !== false
 */
export function usePersonagens(apenasAtivos = true) {
  const { index, isLoading: carregando } = useWiki();
  const [personagens, setPersonagens] = useState<FichaPersonagem[]>([]);

  const carregar = useCallback(() => {
    if (!index || index.length === 0) return;

    const entidades = index.filter(isFichaEntry);
    const carregadas = entidades.map(mapearEntidade);

    setPersonagens(apenasAtivos ? carregadas.filter(p => p.ativo) : carregadas);
  }, [index, apenasAtivos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /**
   * Retorna a ficha de um personagem pelo caminho do arquivo.
   */
  const getPersonagemByPath = useCallback((path: string): FichaPersonagem | null => {
    const entry = index.find(e => e.path === path);
    if (!entry) return null;
    return mapearEntidade(entry);
  }, [index]);

  return { personagens, carregando, recarregar: carregar, getPersonagemByPath };
}
