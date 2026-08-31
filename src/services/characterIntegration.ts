import type { CharacterRecord } from './characterRepository';
import { createWikiTokenData } from './wiki/wikiTokenAdapter';
import {
  deleteCodexNote,
  normalizeCodex,
  type CodexDocument,
  type CodexNote,
} from '../components/Wiki/Codex/codexModel';
import { FamilyTree, Person } from '../components/Widgets/GameMaster/Lineage/model/tree';
import { state } from './yjs';
import { addChronosEvent, getChronosEvents } from '../store/world';

const CODEX_KEY = '__codex_v1__';

type UnknownRecord = Record<string, unknown>;

export type CharacterIntegrationOptions = {
  lineage?: boolean;
  timeline?: boolean;
};

export type WikiCharacterDraft = Omit<CharacterRecord, 'id' | 'created_at' | 'updated_at'>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function firstFinite(...values: unknown[]): number | undefined {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function characterKind(type: CharacterRecord['type']): 'personagem' | 'criatura' {
  return type === 'monster' ? 'criatura' : 'personagem';
}

function characterStatus(character: CharacterRecord): string {
  const data = asRecord(character.data);
  return firstText(data.status, data.situacao, data['situação']) || 'Vivo';
}

function characterFields(character: CharacterRecord): Record<string, string | number | string[]> {
  const data = asRecord(character.data);
  const ficha = asRecord(data.ficha_personagem);
  const cabecalho = asRecord(ficha.cabecalho);
  const fields: Record<string, string | number | string[]> = { status: characterStatus(character) };
  const raca = firstText(data.raca, data.raça, cabecalho.raca, cabecalho.raça);
  const classe = firstText(data.classe, cabecalho.classe);
  const nivel = firstFinite(data.nivel, data.Nivel, cabecalho.nivel);
  const afiliacao = firstText(data.afiliacao, data.afiliação, cabecalho.afiliacao, cabecalho.afiliacao);
  const descricao = firstText(data.descricao, data.descrição, data.resumo);

  if (raca) fields.raca = raca;
  if (classe) fields.classe = classe;
  if (nivel !== undefined) fields.nivel = nivel;
  if (afiliacao) fields.afiliacao = afiliacao;
  if (descricao) fields.motivacao = descricao;
  return fields;
}

/** Caminho Markdown vinculado a uma ficha de Vault/Mesa, quando houver. */
export function getCharacterWikiPath(character: Pick<CharacterRecord, 'data'>): string {
  const data = asRecord(character.data);
  return firstText(data.wikiPath, data.caminhoArquivo);
}

/** Localiza a conversão já existente para evitar duplicar uma ficha Markdown. */
export function findCharacterByWikiPath(records: CharacterRecord[], wikiPath: string): CharacterRecord | undefined {
  return records.find((character) => getCharacterWikiPath(character) === wikiPath);
}

/** Converte o frontmatter legado em uma ficha portável, mantendo o link à Wiki. */
export function createCharacterFromWiki(
  metadata: UnknownRecord,
  wikiPath: string,
  campaignId: string | null,
  ownerId?: string,
): WikiCharacterDraft {
  const token = createWikiTokenData(metadata, wikiPath) as UnknownRecord;
  const ficha = asRecord(metadata.ficha_personagem);
  const cabecalho = asRecord(ficha.cabecalho);
  const type = token.type === 'player' ? 'pc' : token.type === 'enemy' ? 'monster' : 'npc';

  return {
    campaign_id: campaignId,
    owner_id: ownerId,
    name: firstText(token.name, cabecalho.nome_personagem, metadata.nome, metadata.titulo) || 'Sem nome',
    type,
    avatar_url: firstText(token.imageUrl),
    data: {
      sheetKind: 'wiki',
      source: 'wiki',
      wikiPath,
      caminhoArquivo: wikiPath,
      wikiSlug: token.wikiSlug,
      hp: token.hp,
      maxHp: token.maxHp,
      mana: token.mana,
      maxMana: token.maxMana,
      attributes: token.atributos || {},
      ficha_personagem: ficha,
      status: token.status,
    },
    notes_markdown: firstText(metadata.descricao, metadata.descrição, metadata.resumo, metadata.historia, metadata.história),
    is_public_to_party: true,
  };
}

export function findCodexNoteForCharacter(document: CodexDocument, character: CharacterRecord): CodexNote | undefined {
  const wikiPath = getCharacterWikiPath(character);
  return document.notes.find((note) =>
    note.characterId === character.id ||
    Boolean(wikiPath) && note.wikiPath === wikiPath,
  );
}

/** Cria ou atualiza o espelho semântico da ficha no Códice. */
export function upsertCharacterCodex(document: CodexDocument, character: CharacterRecord): { document: CodexDocument; note: CodexNote } {
  const existing = findCodexNoteForCharacter(document, character);
  const timestamp = new Date().toISOString();
  const note: CodexNote = {
    id: existing?.id || `character_${character.id}`,
    name: character.name,
    description: character.notes_markdown || existing?.description || '',
    typeId: characterKind(character.type),
    folderId: existing?.folderId || null,
    tags: existing?.tags || [],
    fields: { ...existing?.fields, ...characterFields(character) },
    favorite: existing?.favorite || false,
    imageUrl: character.avatar_url || existing?.imageUrl || null,
    gallery: existing?.gallery || [],
    icon: existing?.icon,
    chronosEventIds: existing?.chronosEventIds || [],
    lineagePersonId: existing?.lineagePersonId,
    characterId: character.id,
    characterScope: character.campaign_id ? 'campaign' : 'vault',
    wikiPath: getCharacterWikiPath(character) || existing?.wikiPath,
    links: existing?.links || [],
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  return {
    document: {
      ...document,
      notes: existing
        ? document.notes.map((item) => item.id === note.id ? note : item)
        : [note, ...document.notes],
      updatedAt: timestamp,
    },
    note,
  };
}

function readLineageTree(): FamilyTree {
  const raw = state.lineage.get('atlas');
  if (typeof raw !== 'string') return FamilyTree.empty();
  try {
    return FamilyTree.from(JSON.parse(raw));
  } catch {
    return FamilyTree.empty();
  }
}

function lineageStatus(character: CharacterRecord): 'vivo' | 'falecido' | 'desconhecido' {
  const status = characterStatus(character).toLocaleLowerCase('pt-BR');
  if (status.includes('morto') || status.includes('falec')) return 'falecido';
  if (status.includes('desconhec') || status.includes('desaparec')) return 'desconhecido';
  return 'vivo';
}

function upsertLineagePerson(note: CodexNote, character: CharacterRecord): CodexNote {
  const personId = note.lineagePersonId || `lineage_${note.id}`;
  const data = asRecord(character.data);
  const existing = readLineageTree().get(personId);
  const person = new Person({
    id: personId,
    name: character.name,
    affiliation: firstText(data.afiliacao, data.afiliação),
    notes: character.notes_markdown || '',
    portrait: character.avatar_url || null,
    status: lineageStatus(character),
    characterId: character.id,
    characterScope: character.campaign_id ? 'campaign' : 'vault',
    parentIds: existing ? [...existing.parentIds] : [],
    partnerIds: existing ? [...existing.partnerIds] : [],
    relations: existing ? [...existing.relations] : [],
    birthOrder: existing?.birthOrder,
    createdAt: existing?.createdAt,
  });
  const tree = existing ? readLineageTree().update(personId, person) : readLineageTree().add(person);
  state.lineage.set('atlas', tree.serialize());
  return { ...note, lineagePersonId: personId };
}

function upsertTimelineEvent(note: CodexNote, character: CharacterRecord): CodexNote {
  const existingIds = new Set(note.chronosEventIds || []);
  const hasExisting = getChronosEvents().some((event) => existingIds.has(event.id));
  if (hasExisting) return note;
  const event = addChronosEvent(character.name, undefined, {
    layer: 'character',
    wikiPath: `codex://${note.id}`,
    characterId: character.id,
    characterScope: character.campaign_id ? 'campaign' : 'vault',
  });
  return event ? { ...note, chronosEventIds: [...existingIds, event.id] } : note;
}

function persistCodex(document: CodexDocument) {
  state.wiki.set(CODEX_KEY, document);
  window.dispatchEvent(new CustomEvent('codex-updated'));
}

/** Integra uma ficha ao Códice e, quando pedido, cria suas entradas em Linhagem e Chronos. */
export function integrateCharacter(character: CharacterRecord, options: CharacterIntegrationOptions = {}): CodexNote {
  const current = normalizeCodex(state.wiki.get(CODEX_KEY));
  const result = upsertCharacterCodex(current, character);
  let note = result.note;
  if (options.lineage) note = upsertLineagePerson(note, character);
  if (options.timeline) note = upsertTimelineEvent(note, character);
  const document = {
    ...result.document,
    notes: result.document.notes.map((item) => item.id === note.id ? note : item),
    updatedAt: new Date().toISOString(),
  };
  persistCodex(document);
  return note;
}

/** Remove apenas os espelhos gerados no ecossistema; o Markdown de origem não é apagado. */
export function removeCharacterIntegration(character: CharacterRecord) {
  const current = normalizeCodex(state.wiki.get(CODEX_KEY));
  const note = findCodexNoteForCharacter(current, character);
  if (!note) return;
  if (note.chronosEventIds?.length) {
    const ids = new Set(note.chronosEventIds);
    state.chronos.set('events', getChronosEvents().filter((event) => !ids.has(event.id)));
  }
  if (note.lineagePersonId) {
    state.lineage.set('atlas', readLineageTree().remove(note.lineagePersonId).serialize());
  }
  persistCodex(deleteCodexNote(current, note.id));
}

function safeFilename(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'ficha';
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportCharactersJson(characters: CharacterRecord[]) {
  const payload = {
    kind: 'dozero-character-batch',
    version: 1,
    exportedAt: new Date().toISOString(),
    characters,
  };
  download('fichas-dozero.json', new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
}

function drawLines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, limit = 5) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > width && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = word;
      if (lines === limit) return;
    } else {
      line = attempt;
    }
  }
  if (line && lines < limit) ctx.fillText(line, x, y + lines * lineHeight);
}

/** Exporta uma ficha como carta WebP, sem depender de bibliotecas adicionais. */
export async function exportCharacterWebp(character: CharacterRecord) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = asRecord(character.data);
  const hp = firstFinite(data.hp, data.pv) ?? 0;
  const maxHp = firstFinite(data.maxHp, data.pv_max) ?? hp;
  const mana = firstFinite(data.mana, data.pm) ?? 0;
  const maxMana = firstFinite(data.maxMana, data.pm_max) ?? mana;
  const accent = character.type === 'monster' ? '#cf5b5b' : character.type === 'npc' ? '#d7a74b' : '#63ad89';

  ctx.fillStyle = '#16120e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(220, 120, 20, 220, 120, 780);
  glow.addColorStop(0, `${accent}60`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
  ctx.fillStyle = '#211b14';
  ctx.fillRect(70, 90, 330, 540);
  ctx.fillStyle = `${accent}44`;
  ctx.fillRect(70, 90, 330, 540);
  ctx.fillStyle = accent;
  ctx.font = '900 170px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(character.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?', 235, 410);
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = '800 22px sans-serif';
  ctx.fillText(character.type === 'monster' ? 'CRIATURA' : character.type === 'npc' ? 'NPC' : 'PERSONAGEM', 460, 118);
  ctx.fillStyle = '#f4ead6';
  ctx.font = '700 52px Georgia, serif';
  drawLines(ctx, character.name, 460, 190, 720, 60, 2);
  ctx.strokeStyle = '#4b4031';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(460, 330);
  ctx.lineTo(1160, 330);
  ctx.stroke();
  ctx.fillStyle = '#d9ccb5';
  ctx.font = '500 26px sans-serif';
  drawLines(ctx, character.notes_markdown || 'Ficha integrada ao ecossistema DOZERO.', 460, 390, 680, 35, 4);
  ctx.fillStyle = '#a69980';
  ctx.font = '700 20px sans-serif';
  ctx.fillText(`PV ${hp}/${maxHp}   ·   PM ${mana}/${maxMana}`, 460, 590);
  ctx.fillStyle = '#8d806a';
  ctx.font = '600 16px sans-serif';
  ctx.fillText(`DOZERO · exportado em ${new Date().toLocaleDateString('pt-BR')}`, 460, 630);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
  if (blob) download(`${safeFilename(character.name)}.webp`, blob);
}

/** Gera um WebP por ficha selecionada; navegadores podem agrupar os downloads. */
export async function exportCharactersWebp(characters: CharacterRecord[]) {
  for (const character of characters) await exportCharacterWebp(character);
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);

/** Abre uma composição imprimível. No diálogo do navegador, escolha "Salvar como PDF". */
export function printCharacters(characters: CharacterRecord[]) {
  const page = window.open('', '_blank', 'width=960,height=900');
  if (!page) return false;
  page.opener = null;
  const cards = characters.map((character) => {
    const data = asRecord(character.data);
    const hp = firstFinite(data.hp, data.pv) ?? 0;
    const maxHp = firstFinite(data.maxHp, data.pv_max) ?? hp;
    const mana = firstFinite(data.mana, data.pm) ?? 0;
    const maxMana = firstFinite(data.maxMana, data.pm_max) ?? mana;
    return `<article><small>${escapeHtml(character.type.toUpperCase())}</small><h1>${escapeHtml(character.name)}</h1><p>${escapeHtml(character.notes_markdown || 'Ficha integrada ao ecossistema DOZERO.')}</p><footer>PV ${hp}/${maxHp} · PM ${mana}/${maxMana}</footer></article>`;
  }).join('');
  page.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Fichas DOZERO</title><style>@page{size:A4;margin:14mm}body{font-family:Georgia,serif;color:#261d14}article{break-inside:avoid;border:2px solid #a76f2d;border-radius:10px;padding:18px;margin:0 0 14px;background:#fffaf0}small{font:700 10px system-ui;color:#8a5d27;letter-spacing:.12em}h1{margin:5px 0 12px;font-size:25px}p{white-space:pre-wrap;line-height:1.45;min-height:45px}footer{border-top:1px solid #d5bb91;padding-top:8px;font:700 12px system-ui;color:#65441f}</style></head><body>${cards}</body></html>`);
  page.document.close();
  page.focus();
  window.setTimeout(() => page.print(), 150);
  return true;
}
