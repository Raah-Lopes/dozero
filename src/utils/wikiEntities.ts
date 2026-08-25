export const WIKI_ENTITY_STYLES: Record<string, { label: string; color: string }> = {
  local: { label: 'Local', color: '#34d399' },
  personagem: { label: 'Personagem', color: '#c084fc' },
  organizacao: { label: 'Organização', color: '#fbbf24' },
  evento: { label: 'Evento', color: '#38bdf8' },
  item: { label: 'Item', color: '#fb7185' },
  criatura: { label: 'Criatura', color: '#f87171' },
  divindade: { label: 'Divindade', color: '#fde047' },
  conceito: { label: 'Conceito', color: '#fb923c' }
};

export function getWikiEntityType(meta: Record<string, unknown> | null) {
  const rawType = String(meta?.tipo || meta?.type || meta?.categoria || '').toLowerCase();
  const aliases: Record<string, string> = { localizacao: 'local', lugar: 'local', npc: 'personagem', monstro: 'criatura', faccao: 'organizacao', facção: 'organizacao' };
  const type = aliases[rawType] || rawType;
  return WIKI_ENTITY_STYLES[type] ? type : '';
}

export function getWikiEntityStyle(meta: Record<string, unknown> | null) {
  return WIKI_ENTITY_STYLES[getWikiEntityType(meta)];
}

export function getEntityTags(meta: Record<string, unknown>) {
  const value = meta.tags;
  if (Array.isArray(value)) return value.map(String).map(tag => tag.trim()).filter(Boolean);
  return String(value || '').replace(/^\\?\[/, '').replace(/\]$/, '').split(',').map(tag => tag.trim()).filter(Boolean);
}

export function getEntityStatus(meta: Record<string, unknown>) {
  return String(meta.status || meta.situacao || meta['situação'] || '').trim();
}

export function getEntityDate(meta: Record<string, unknown>, kind: 'created' | 'updated') {
  const keys = kind === 'created'
    ? ['created_at', 'created', 'criado_em', 'data_criacao']
    : ['updated_at', 'updated', 'atualizado_em', 'modificado_em'];
  const value = keys.map(key => meta[key]).find(Boolean);
  return value ? Date.parse(String(value)) || 0 : 0;
}
