import yaml from 'js-yaml';
import { DEFAULT_CHARACTER, type Character, type Macro } from '../components/Sheets/Arcanum/lib';

export type CharacterAuditIssue = { field: string; message: string; severity: 'error' | 'warning' };
export type CharacterAuditReport = { issues: CharacterAuditIssue[]; valid: boolean };

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const formula = (value: string) => /^(\d*)d(\d+)([+-]\d+)?$/i.test(value.replace(/\s/g, ''));

export function auditCharacter(character: Character): CharacterAuditReport {
  const issues: CharacterAuditIssue[] = [];
  if (!character.name.trim()) issues.push({ field: 'Nome', message: 'A ficha precisa de um nome.', severity: 'error' });
  if (!character.system.trim()) issues.push({ field: 'Sistema', message: 'Escolha um sistema de regras.', severity: 'error' });
  if (!character.vitals.length) issues.push({ field: 'Status', message: 'Inclua ao menos um recurso vital.', severity: 'error' });
  character.vitals.forEach(vital => {
    if (!vital.label.trim()) issues.push({ field: 'Status', message: 'Um recurso vital está sem nome.', severity: 'warning' });
    if (vital.max < 0 || vital.value < 0 || vital.value > vital.max) issues.push({ field: vital.label || 'Status', message: 'O valor atual deve ficar entre zero e o máximo.', severity: 'error' });
  });
  character.macros.forEach(macro => { if (!macro.name.trim() || !formula(macro.formula)) issues.push({ field: macro.name || 'Macro', message: 'Use uma fórmula válida, como 1d20+5 ou 2d6.', severity: 'error' }); });
  if (!character.attributes.length) issues.push({ field: 'Atributos', message: 'A ficha não possui atributos.', severity: 'warning' });
  return { issues, valid: !issues.some(issue => issue.severity === 'error') };
}

export function normalizeCharacter(character: Character): Character {
  const macros: Macro[] = character.macros
    .filter(macro => macro.name.trim() || macro.formula.trim())
    .map((macro, index) => ({ ...macro, id: macro.id || `macro_${index}`, name: macro.name.trim() || `Macro ${index + 1}`, formula: formula(macro.formula) ? macro.formula.replace(/\s/g, '') : '1d20', note: macro.note?.trim() || '' }));
  return { ...character, name: character.name.trim() || 'Sem nome', system: character.system.trim() || 'Outro (personalizado)', macros, vitals: character.vitals.map((vital, index) => ({ ...vital, id: vital.id || `vital_${index}`, label: vital.label.trim() || `Recurso ${index + 1}`, max: Math.max(0, number(vital.max)), value: Math.max(0, Math.min(number(vital.value), Math.max(0, number(vital.max)))) })) };
}

/** Converts Markdown/frontmatter without requiring an AI provider. */
export function characterFromMarkdown(markdown: string): Character {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const data = record(match ? yaml.load(match[1]) : {});
  const value = (...keys: string[]) => keys.map(key => data[key]).find(item => item !== undefined && item !== null && item !== '');
  const hp = number(value('hp', 'HP', 'pv', 'PV'), 0);
  const maxHp = number(value('hp_max', 'HP_max', 'maxHp', 'pv_max', 'PV_max'), hp);
  const mana = number(value('mana', 'pm', 'PM'), 0);
  const maxMana = number(value('mana_max', 'pm_max', 'PM_max', 'maxMana'), mana);
  const body = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*/,'').trim();
  const rawMacros = value('macros', 'ataques', 'rolagens');
  const macros = Array.isArray(rawMacros) ? rawMacros.map((item, index) => { const macro = record(item); return { id: `legacy_macro_${index}`, name: text(macro.nome || macro.name) || `Macro ${index + 1}`, formula: text(macro.formula || macro.rolagem || macro.dado), note: text(macro.nota || macro.note) }; }) : [];
  return normalizeCharacter({ ...structuredClone(DEFAULT_CHARACTER), name: text(value('nome', 'name', 'titulo')) || 'Ficha convertida', system: text(value('sistema', 'system', 'regras')) || 'Outro (personalizado)', race: text(value('raca', 'raça', 'ancestralidade', 'linhagem')), klass: text(value('classe', 'class', 'classe_personagem', 'arquetipo', 'arquétipo', 'tipo')), level: number(value('nivel', 'nível', 'level', 'nd'), 1), avatar: text(value('imagem', 'image', 'avatar')), story: body, notes: text(value('biografia', 'historia', 'história', 'notas', 'background')), vitals: [{ id: 'hp', label: 'Pontos de Vida', value: hp, max: Math.max(hp, maxHp), color: '#c14e39' }, { id: 'mana', label: 'Pontos de Mana', value: mana, max: Math.max(mana, maxMana), color: '#6b87b3' }], macros });
}
