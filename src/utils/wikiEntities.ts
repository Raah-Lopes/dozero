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
