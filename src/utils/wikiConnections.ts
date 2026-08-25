export interface WikiConnectionDraft {
  type: string;
  description: string;
}

export const WIKI_CONNECTION_TYPES = [
  'Irmão(ã) de',
  'Filho(a) de',
  'Aliado de',
  'Inimigo de',
  'Localizado em'
] as const;

export function formatWikiConnection(target: string, draft: WikiConnectionDraft) {
  const safeTarget = target.replace(/[[\]\r\n]/g, '').trim();
  const type = draft.type.replace(/[\r\n:]/g, ' ').replace(/\s+/g, ' ').trim();
  const description = draft.description.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${type ? `${type}:: ` : ''}[[${safeTarget}]]${description ? ` — ${description}` : ''}`;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
