export type CodexFieldKind = 'text' | 'longtext' | 'number' | 'select' | 'url' | 'list';

export interface CodexFieldDefinition {
  id: string;
  label: string;
  kind: CodexFieldKind;
  options?: string[];
}

export interface CodexType {
  id: string;
  name: string;
  plural?: string;
  color: string;
  icon: string;
  fields: CodexFieldDefinition[];
  standard?: boolean;
}

export interface CodexLink {
  label: string;
  url: string;
}

export interface CodexNote {
  id: string;
  name: string;
  description: string;
  typeId: string;
  folderId: string | null;
  tags: string[];
  fields: Record<string, string | number | string[]>;
  favorite: boolean;
  imageUrl?: string | null;
  gallery?: string[];
  icon?: string;
  chronosEventIds?: string[];
  lineagePersonId?: string;
  links: CodexLink[];
  createdAt: string;
  updatedAt: string;
}

export interface CodexFolder {
  id: string;
  name: string;
  color: string;
}

export interface CodexRelation {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  color: string;
  icon: string;
  bidirectional: boolean;
}

export interface CodexSavedView {
  id: string;
  name: string;
  search: string;
  typeIds: string[];
  tags: string[];
  folderId: string | null;
  favoritesOnly: boolean;
}

export interface CodexDocument {
  version: 1;
  notes: CodexNote[];
  types: CodexType[];
  folders: CodexFolder[];
  relations: CodexRelation[];
  savedViews: CodexSavedView[];
  updatedAt: string;
}

const fld = (id: string, label: string, kind: CodexFieldKind = 'text', options?: string[]): CodexFieldDefinition => ({
  id,
  label,
  kind,
  options,
});

export const STANDARD_CODEX_TYPES: CodexType[] = [
  {
    id: 'personagem',
    name: 'Personagem',
    plural: 'Personagens',
    color: '#e07b4f',
    icon: 'espada',
    standard: true,
    fields: [
      fld('raca', 'Raça'),
      fld('classe', 'Classe'),
      fld('nivel', 'Nível', 'number'),
      fld('alinhamento', 'Alinhamento', 'select', [
        'Leal e bom',
        'Neutro e bom',
        'Caótico e bom',
        'Leal e neutro',
        'Neutro',
        'Caótico e neutro',
        'Leal e mau',
        'Neutro e mau',
        'Caótico e mau',
      ]),
      fld('afiliacao', 'Afiliações'),
      fld('status', 'Estado', 'select', ['Vivo', 'Morto', 'Desaparecido', 'Desconhecido']),
      fld('motivacao', 'Motivação', 'longtext'),
    ],
  },
  {
    id: 'local',
    name: 'Local',
    plural: 'Locais',
    color: '#74b183',
    icon: 'mapa',
    standard: true,
    fields: [
      fld('tipoLocal', 'Tipo de local', 'select', [
        'Cidade',
        'Vila',
        'Fortaleza',
        'Masmorra',
        'Região selvagem',
        'Plano outro',
        'Ruínas',
      ]),
      fld('clima', 'Clima'),
      fld('governo', 'Governo / domínio'),
      fld('populacao', 'População'),
      fld('perigos', 'Perigos conhecidos', 'longtext'),
    ],
  },
  {
    id: 'evento',
    name: 'Evento',
    plural: 'Eventos',
    color: '#e3b64f',
    icon: 'ampulheta',
    standard: true,
    fields: [
      fld('data', 'Data no mundo'),
      fld('escala', 'Escala', 'select', ['Pessoal', 'Local', 'Regional', 'Mundial', 'Cósmico']),
      fld('participantes', 'Envolvidos'),
      fld('consequencias', 'Consequências', 'longtext'),
    ],
  },
  {
    id: 'item',
    name: 'Item',
    plural: 'Itens',
    color: '#6fa8d8',
    icon: 'gema',
    standard: true,
    fields: [
      fld('raridade', 'Raridade', 'select', ['Comum', 'Incomum', 'Raro', 'Muito raro', 'Lendário', 'Artefato']),
      fld('peso', 'Peso'),
      fld('valor', 'Valor estimado'),
      fld('poderes', 'Poderes e maldições', 'longtext'),
    ],
  },
  {
    id: 'criatura',
    name: 'Criatura',
    plural: 'Criaturas',
    color: '#d05f5f',
    icon: 'pata',
    standard: true,
    fields: [
      fld('porte', 'Porte', 'select', ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Colossal']),
      fld('categoria', 'Categoria', 'select', ['Monstro', 'NPC Hostil', 'Boss', 'Minion']),
      fld('tipoCriatura', 'Tipo', 'select', ['Besta', 'Dragão', 'Morto-vivo', 'Aberração', 'Construto', 'Celestial', 'Corruptor', 'Elemental', 'Feérico', 'Humanoide']),
      fld('ameaca', 'Nível de ameaça', 'select', ['Minion', 'Fraco', 'Médio', 'Forte', 'Elite', 'Lendário']),
      fld('desafio', 'Desafio (ND)'),
      fld('estilo', 'Estilo narrativo', 'select', ['Sombrio & Épico', 'Lúdico & Fantástico', 'Realista & Brutal', 'Mítico & Ancestral', 'Sci-Fi & Futurista', 'Folclórico Brasileiro']),
      fld('papel', 'Papel tático', 'select', ['Automático', 'Líder', 'Comum', 'Caçador', 'Artilheiro', 'Bruto', 'Controlador', 'Boss', 'Espreitador', 'Manipulador', 'Soldado', 'Suporte', 'Especialista', 'Enxame', 'Solo']),
      fld('habitat', 'Habitat'),
      fld('habilidades', 'Habilidades', 'longtext'),
      fld('fraquezas', 'Fraquezas e táticas', 'longtext'),
    ],
  },
  {
    id: 'entidade',
    name: 'Entidade',
    plural: 'Entidades',
    color: '#a78bd8',
    icon: 'olho',
    standard: true,
    fields: [
      fld('natureza', 'Natureza'),
      fld('dominio', 'Domínio de influência'),
      fld('manifestacao', 'Manifestações', 'longtext'),
    ],
  },
  {
    id: 'organizacao',
    name: 'Organização',
    plural: 'Organizações',
    color: '#d98fae',
    icon: 'escudo',
    standard: true,
    fields: [
      fld('lider', 'Liderança'),
      fld('sede', 'Sede'),
      fld('membros', 'Membros notáveis'),
      fld('objetivos', 'Objetivos', 'longtext'),
    ],
  },
  {
    id: 'divindade',
    name: 'Divindade',
    plural: 'Divindades',
    color: '#f0d98c',
    icon: 'sol',
    standard: true,
    fields: [
      fld('dominios', 'Domínios'),
      fld('simbolo', 'Símbolo sagrado'),
      fld('dogmas', 'Dogmas e ritos', 'longtext'),
    ],
  },
  {
    id: 'raca',
    name: 'Raça',
    plural: 'Raças',
    color: '#5fbfae',
    icon: 'usuarios',
    standard: true,
    fields: [
      fld('tracos', 'Traços marcantes'),
      fld('expectativa', 'Expectativa de vida'),
      fld('patrias', 'Terras natais'),
      fld('cultura', 'Cultura e costumes', 'longtext'),
    ],
  },
  {
    id: 'resumo',
    name: 'Resumo de Sessão',
    plural: 'Resumos de Sessão',
    color: '#a9a294',
    icon: 'livro',
    standard: true,
    fields: [
      fld('sessao', 'Sessão nº', 'number'),
      fld('dataReal', 'Data da mesa'),
      fld('presentes', 'Jogadores presentes'),
      fld('xp', 'XP concedido', 'number'),
      fld('ganchos', 'Ganchos abertos', 'list'),
      fld('recompensas', 'Recompensas', 'list'),
    ],
  },
  {
    id: 'rota',
    name: 'Rota',
    plural: 'Rotas',
    color: '#8f9e63',
    icon: 'trilha',
    standard: true,
    fields: [
      fld('origem', 'Origem'),
      fld('destino', 'Destino'),
      fld('duracao', 'Duração da viagem'),
      fld('perigo', 'Nível de perigo', 'select', ['Segura', 'Moderada', 'Perigosa', 'Mortal']),
      fld('encontros', 'Encontros prováveis', 'list'),
    ],
  },
  {
    id: 'conceito',
    name: 'Conceito',
    plural: 'Conceitos',
    color: '#c2b49a',
    icon: 'faiscas',
    standard: true,
    fields: [
      fld('aplicacao', 'Aplicação em jogo', 'longtext'),
    ],
  },
];

export const LEGACY_TYPE_ALIASES: Record<string, string> = {
  person: 'personagem',
  place: 'local',
  faction: 'organizacao',
  creature: 'criatura',
  event: 'evento',
  lore: 'conceito',
};

export function mapTypeId(id: string): string {
  return LEGACY_TYPE_ALIASES[id] || id;
}

export function createEmptyCodex(now = new Date().toISOString()): CodexDocument {
  return {
    version: 1,
    notes: [],
    types: structuredClone(STANDARD_CODEX_TYPES),
    folders: [],
    relations: [],
    savedViews: [],
    updatedAt: now,
  };
}

export function initialFieldValuesForType(type: CodexType): Record<string, string | number | string[]> {
  const fields: Record<string, string | number | string[]> = {};
  for (const field of type.fields) {
    fields[field.id] = field.kind === 'list' ? [] : field.kind === 'number' ? '' : '';
  }
  return fields;
}

export function createCodexNote(type: CodexType, folderId: string | null, now = new Date().toISOString()): CodexNote {
  return {
    id: `note_${crypto.randomUUID()}`,
    name: `${type.name} sem nome`,
    description: '',
    typeId: type.id,
    folderId,
    tags: [],
    fields: initialFieldValuesForType(type),
    favorite: false,
    icon: type.icon,
    imageUrl: null,
    gallery: [],
    chronosEventIds: [],
    links: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCodex(value: unknown): CodexDocument {
  const empty = createEmptyCodex();
  if (!value || typeof value !== 'object') return empty;
  const source = value as Partial<CodexDocument>;

  const standardIds = new Set(STANDARD_CODEX_TYPES.map((t) => t.id));
  const customTypes: CodexType[] = [];

  if (Array.isArray(source.types)) {
    for (const t of source.types) {
      if (!t || typeof t !== 'object') continue;
      const mappedId = mapTypeId(t.id);
      if (!standardIds.has(mappedId) && !customTypes.some((ct) => ct.id === mappedId)) {
        customTypes.push({
          id: mappedId,
          name: t.name || 'Tipo Personalizado',
          plural: t.plural || `${t.name || 'Tipo'}s`,
          color: t.color || '#a78bd8',
          icon: t.icon || 'faiscas',
          fields: Array.isArray(t.fields) ? t.fields : [],
          standard: false,
        });
      }
    }
  }

  const types = [...structuredClone(STANDARD_CODEX_TYPES), ...customTypes];
  const typeMap = new Map(types.map((t) => [t.id, t]));

  const notes: CodexNote[] = Array.isArray(source.notes)
    ? source.notes.map((note: any) => {
        const rawTypeId = String(note?.typeId || 'conceito');
        const typeId = mapTypeId(rawTypeId);
        const matchedType = typeMap.get(typeId) || types[0];
        const fields = typeof note?.fields === 'object' && note.fields !== null ? { ...note.fields } : {};

        // Normaliza campos legados para novo padrão se necessário
        if (note.fields?.role && !fields.classe) fields.classe = note.fields.role;
        if (note.fields?.region && !fields.tipoLocal) fields.tipoLocal = note.fields.region;
        if (note.fields?.alignment && !fields.alinhamento) fields.alinhamento = note.fields.alignment;
        if (note.fields?.threat !== undefined && fields.desafio === undefined) fields.desafio = note.fields.threat;

        return {
          id: String(note.id || `note_${crypto.randomUUID()}`),
          name: String(note.name || 'Sem nome'),
          description: String(note.description || ''),
          typeId: matchedType.id,
          folderId: note.folderId ? String(note.folderId) : null,
          tags: Array.isArray(note.tags) ? note.tags.map(String).map((t: string) => t.trim()).filter(Boolean) : [],
          fields,
          favorite: Boolean(note.favorite),
          imageUrl: note.imageUrl || note.imagem || null,
          icon: note.icon || note.icone || matchedType.icon,
          gallery: Array.isArray(note.gallery) ? note.gallery.filter((g: unknown) => typeof g === 'string') : [],
          chronosEventIds: Array.isArray(note.chronosEventIds) ? note.chronosEventIds.filter((e: unknown) => typeof e === 'string') : [],
          lineagePersonId: note.lineagePersonId ? String(note.lineagePersonId) : undefined,
          links: Array.isArray(note.links)
            ? note.links.map((l: any) => ({ label: String(l?.label || l?.rotulo || ''), url: String(l?.url || '') })).filter((l: CodexLink) => l.url)
            : note.externalUrl
              ? [{ label: 'Link Externo', url: String(note.externalUrl) }]
              : [],
          createdAt: typeof note.createdAt === 'string' ? note.createdAt : (typeof note.criadoEm === 'number' ? new Date(note.criadoEm).toISOString() : new Date().toISOString()),
          updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : (typeof note.atualizadoEm === 'number' ? new Date(note.atualizadoEm).toISOString() : new Date().toISOString()),
        };
      })
    : [];

  const folders: CodexFolder[] = Array.isArray(source.folders)
    ? source.folders.map((f: any) => ({
        id: String(f.id || `folder_${crypto.randomUUID()}`),
        name: String(f.name || f.nome || 'Pasta'),
        color: String(f.color || f.cor || '#d9a441'),
      }))
    : [];

  const relations: CodexRelation[] = Array.isArray(source.relations)
    ? source.relations.map((r: any) => ({
        id: String(r.id || `relation_${crypto.randomUUID()}`),
        sourceId: String(r.sourceId || r.origemId || ''),
        targetId: String(r.targetId || r.destinoId || ''),
        label: String(r.label || r.tipo || 'Vinculado a'),
        color: String(r.color || r.cor || '#8a7f6a'),
        icon: String(r.icon || r.icone || 'link'),
        bidirectional: Boolean(r.bidirectional || r.bidirecional),
      })).filter((r: CodexRelation) => r.sourceId && r.targetId)
    : [];

  const savedViews: CodexSavedView[] = Array.isArray(source.savedViews)
    ? source.savedViews.map((v: any) => ({
        id: String(v.id || `view_${crypto.randomUUID()}`),
        name: String(v.name || v.nome || 'Vista'),
        search: String(v.search || v.busca || ''),
        typeIds: Array.isArray(v.typeIds) ? v.typeIds.map(String) : (Array.isArray(v.tipos) ? v.tipos.map(String) : []),
        tags: Array.isArray(v.tags) ? v.tags.map(String) : (Array.isArray(v.etiquetas) ? v.etiquetas.map(String) : []),
        folderId: v.folderId ? String(v.folderId) : (v.pastaId ? String(v.pastaId) : null),
        favoritesOnly: Boolean(v.favoritesOnly || v.soFavoritas),
      }))
    : [];

  return {
    version: 1,
    notes,
    types,
    folders,
    relations,
    savedViews,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : empty.updatedAt,
  };
}

export function deleteCodexNote(document: CodexDocument, noteId: string): CodexDocument {
  return {
    ...document,
    notes: document.notes.filter((note) => note.id !== noteId),
    relations: document.relations.filter((relation) => relation.sourceId !== noteId && relation.targetId !== noteId),
    updatedAt: new Date().toISOString(),
  };
}

export function deleteCodexType(document: CodexDocument, typeId: string): CodexDocument {
  const type = document.types.find((item) => item.id === typeId);
  if (!type || type.standard) return document;
  return {
    ...document,
    types: document.types.filter((item) => item.id !== typeId),
    notes: document.notes.map((note) => (note.typeId === typeId ? { ...note, typeId: 'conceito' } : note)),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertCodexFolder(document: CodexDocument, folder: CodexFolder): CodexDocument {
  const trimmedName = folder.name.trim();
  if (!trimmedName) throw new Error('O nome da pasta não pode ser vazio.');
  const normalizedFolder: CodexFolder = { ...folder, name: trimmedName, color: folder.color || '#d9a441' };
  return {
    ...document,
    folders: document.folders.some((item) => item.id === folder.id)
      ? document.folders.map((item) => (item.id === folder.id ? normalizedFolder : item))
      : [...document.folders, normalizedFolder],
    updatedAt: new Date().toISOString(),
  };
}

export function deleteCodexFolder(document: CodexDocument, folderId: string): CodexDocument {
  return {
    ...document,
    folders: document.folders.filter((folder) => folder.id !== folderId),
    notes: document.notes.map((note) => (note.folderId === folderId ? { ...note, folderId: null } : note)),
    savedViews: document.savedViews.map((view) => (view.folderId === folderId ? { ...view, folderId: null } : view)),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertCodexRelation(document: CodexDocument, relation: CodexRelation): CodexDocument {
  if (relation.sourceId === relation.targetId) throw new Error('Uma entidade não pode se relacionar consigo mesma.');
  if (!document.notes.some((note) => note.id === relation.sourceId) || !document.notes.some((note) => note.id === relation.targetId)) {
    throw new Error('A relação aponta para uma entidade inexistente.');
  }
  const duplicate = document.relations.some(
    (item) =>
      item.id !== relation.id &&
      item.sourceId === relation.sourceId &&
      item.targetId === relation.targetId &&
      item.label.trim().toLocaleLowerCase('pt-BR') === relation.label.trim().toLocaleLowerCase('pt-BR')
  );
  if (duplicate) throw new Error('Esta relação já existe.');
  return {
    ...document,
    relations: document.relations.some((item) => item.id === relation.id)
      ? document.relations.map((item) => (item.id === relation.id ? relation : item))
      : [...document.relations, relation],
    updatedAt: new Date().toISOString(),
  };
}

export interface CodexFilters {
  search?: string;
  typeIds?: string[];
  tags?: string[];
  folderId?: string | null;
  favoritesOnly?: boolean;
}

export function filterCodexNotes(notes: CodexNote[], filters: CodexFilters): CodexNote[] {
  const search = filters.search?.trim().toLocaleLowerCase('pt-BR') || '';
  return notes.filter((note) => {
    const haystack = [note.name, note.description, ...note.tags, ...Object.values(note.fields).flat().map(String)]
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    return (
      (!search || haystack.includes(search)) &&
      (!filters.typeIds?.length || filters.typeIds.includes(note.typeId)) &&
      (!filters.tags?.length || filters.tags.every((tag) => note.tags.includes(tag))) &&
      (filters.folderId === undefined || note.folderId === filters.folderId) &&
      (!filters.favoritesOnly || note.favorite)
    );
  });
}

