import { doc, state } from '../yjs';
import { saveCharacter, type CharacterRecord } from '../characterRepository';
import { integrateCharacter } from '../characterIntegration';
import { saveChronicleEvent, type ChronicleEventKind, type ChronosEventLayer } from '../../store/world';
import { FamilyTree, Person, type Status } from '../../components/Widgets/GameMaster/Lineage/model/tree';
import { normalizeCodex, type CodexDocument, type CodexNote, type CodexRelation } from '../../components/Wiki/Codex/codexModel';
import type { CampaignArc, CampaignData, CampaignSession } from '../../store/questLog';

const CODEX_KEY = '__codex_v1__';
const allowedTypes = new Set(['personagem', 'local', 'evento', 'item', 'criatura', 'entidade', 'organizacao', 'divindade', 'raca', 'resumo', 'rota', 'conceito']);
const eventKinds = new Set<ChronicleEventKind>(['fundacao', 'reinado', 'batalha', 'descoberta', 'catastrofe', 'pacto', 'magia', 'jornada', 'queda']);

export interface CampaignLoreNote {
  name: string;
  typeId: string;
  description?: string;
  tags?: string[];
  fields?: Record<string, string | number | string[]>;
}

export interface CampaignLoreCharacter {
  name: string;
  type: 'pc' | 'npc' | 'monster';
  description?: string;
  data?: Record<string, unknown>;
}

export interface CampaignLoreEvent {
  title: string;
  year: number;
  description?: string;
  layer?: ChronosEventLayer;
  kind?: ChronicleEventKind;
  tags?: string[];
}

export interface CampaignLorePlan {
  version: 1;
  campaign: { name: string; summary: string; diary?: string };
  notes: CampaignLoreNote[];
  relations: { source: string; target: string; label: string }[];
  characters: CampaignLoreCharacter[];
  events: CampaignLoreEvent[];
  lineage: { name: string; affiliation?: string; notes?: string; status?: Status; parents?: string[]; partners?: string[] }[];
  arcs: { name: string; description: string }[];
  sessions: { summary: string }[];
}

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value.trim() : fallback; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function id(prefix: string) { return `${prefix}_${crypto.randomUUID()}`; }

/** Parses the strict JSON response and rejects malformed campaign plans before any write. */
export function parseCampaignLorePlan(raw: string): CampaignLorePlan {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const root = object(JSON.parse(clean));
  const campaign = object(root.campaign);
  const name = text(campaign.name);
  if (!name) throw new Error('O plano não informa o nome da campanha.');
  const notes = list(root.notes).map((item) => {
    const note = object(item); const typeId = text(note.typeId, 'conceito');
    const fields = object(note.fields);
    return { name: text(note.name), typeId: allowedTypes.has(typeId) ? typeId : 'conceito', description: text(note.description), tags: list(note.tags).map(item => text(item)).filter(Boolean), fields: fields as Record<string, string | number | string[]> };
  }).filter(note => note.name);
  const characters = list(root.characters).map((item) => {
    const char = object(item); const type = text(char.type, 'npc');
    return { name: text(char.name), type: type === 'pc' || type === 'monster' ? type : 'npc', description: text(char.description), data: object(char.data) } as CampaignLoreCharacter;
  }).filter(char => char.name);
  const events = list(root.events).map((item) => {
    const event = object(item); const kind = text(event.kind, 'jornada') as ChronicleEventKind; const layer = text(event.layer, 'campaign') as ChronosEventLayer;
    return { title: text(event.title), year: Number(event.year), description: text(event.description), layer: ['world', 'campaign', 'character'].includes(layer) ? layer : 'campaign', kind: eventKinds.has(kind) ? kind : 'jornada', tags: list(event.tags).map(item => text(item)).filter(Boolean) };
  }).filter(event => event.title && Number.isFinite(event.year));
  const lineage = list(root.lineage).map((item) => { const person = object(item); return { name: text(person.name), affiliation: text(person.affiliation), notes: text(person.notes), status: ['vivo', 'falecido', 'desconhecido'].includes(text(person.status)) ? text(person.status) as Status : 'vivo' as Status, parents: list(person.parents).map(item => text(item)).filter(Boolean), partners: list(person.partners).map(item => text(item)).filter(Boolean) }; }).filter(person => person.name);
  const relations = list(root.relations).map((item) => { const relation = object(item); return { source: text(relation.source), target: text(relation.target), label: text(relation.label, 'Relacionado a') }; }).filter(relation => relation.source && relation.target && relation.source !== relation.target);
  const arcs = list(root.arcs).map((item) => { const arc = object(item); return { name: text(arc.name), description: text(arc.description) }; }).filter(arc => arc.name);
  const sessions = list(root.sessions).map((item) => ({ summary: text(object(item).summary) })).filter(session => session.summary);
  return { version: 1, campaign: { name, summary: text(campaign.summary), diary: text(campaign.diary) }, notes, relations, characters, events, lineage, arcs, sessions };
}

export function campaignLoreSystemPrompt() {
  return `Você é o arquiteto de campanhas do DOZERO. Responda SOMENTE JSON válido, sem Markdown. Crie um plano coerente e interligado para uma campanha de RPG. Use exatamente este contrato: {"version":1,"campaign":{"name":"","summary":"","diary":""},"notes":[{"name":"","typeId":"personagem|local|evento|item|criatura|entidade|organizacao|divindade|raca|resumo|rota|conceito","description":"","tags":[],"fields":{}}],"relations":[{"source":"nome de note","target":"nome de note","label":""}],"characters":[{"name":"","type":"pc|npc|monster","description":"","data":{}}],"events":[{"title":"","year":0,"description":"","layer":"world|campaign|character","kind":"fundacao|reinado|batalha|descoberta|catastrofe|pacto|magia|jornada|queda","tags":[]}],"lineage":[{"name":"","affiliation":"","notes":"","status":"vivo|falecido|desconhecido","parents":[],"partners":[]}],"arcs":[{"name":"","description":""}],"sessions":[{"summary":""}]}. Crie somente dados que possam ser apresentados ao mestre e nunca invente fatos que contradigam o contexto fornecido.`;
}

export async function applyCampaignLorePlan(plan: CampaignLorePlan, campaignId: string, userId?: string | null) {
  const current = normalizeCodex(state.wiki.get(CODEX_KEY));
  const createdNotes = plan.notes.map((item): CodexNote => ({ id: id('lore'), name: item.name, typeId: item.typeId, description: item.description || '', tags: item.tags || [], fields: item.fields || {}, favorite: false, imageUrl: null, gallery: [], links: [], icon: current.types.find(type => type.id === item.typeId)?.icon, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  const allNotes = [...createdNotes, ...current.notes];
  const byName = new Map(allNotes.map(note => [note.name.trim().toLocaleLowerCase('pt-BR'), note]));
  const createdRelations: CodexRelation[] = plan.relations.flatMap((relation) => {
    const source = byName.get(relation.source.toLocaleLowerCase('pt-BR')); const target = byName.get(relation.target.toLocaleLowerCase('pt-BR'));
    return source && target ? [{ id: id('relation'), sourceId: source.id, targetId: target.id, label: relation.label, color: '#8a7f6a', icon: 'link', bidirectional: false }] : [];
  });
  const campaignRecord: CampaignData = { id: `ai_campaign_${crypto.randomUUID()}`, name: plan.campaign.name, description: [plan.campaign.summary, plan.campaign.diary].filter(Boolean).join('\n\n'), status: 'active', arcs: plan.arcs.map((arc): CampaignArc => ({ id: id('arc'), name: arc.name, description: arc.description, status: 'planned' })), sessions: plan.sessions.map((session): CampaignSession => ({ id: id('session'), date: new Date().toISOString().slice(0, 10), summary: session.summary, status: 'upcoming' })), quests: [] };
  doc.transact(() => {
    const next: CodexDocument = { ...current, notes: allNotes, relations: [...current.relations, ...createdRelations], updatedAt: new Date().toISOString() };
    state.wiki.set(CODEX_KEY, next);
    state.campaigns.set(campaignRecord.id, campaignRecord);
    for (const event of plan.events) saveChronicleEvent({ ...event, wikiPath: `codex://campaign/${campaignRecord.id}` });
    let tree = (() => { try { const raw = state.lineage.get('atlas'); return typeof raw === 'string' ? FamilyTree.from(JSON.parse(raw)) : FamilyTree.empty(); } catch { return FamilyTree.empty(); } })();
    const persons = new Map(plan.lineage.map(person => [person.name.toLocaleLowerCase('pt-BR'), person]));
    const personIds = new Map<string, string>();
    for (const person of plan.lineage) { const personId = id('lineage'); personIds.set(person.name.toLocaleLowerCase('pt-BR'), personId); tree = tree.add(new Person({ id: personId, name: person.name, affiliation: person.affiliation, notes: person.notes, status: person.status })); }
    for (const person of persons.values()) {
      const personId = personIds.get(person.name.toLocaleLowerCase('pt-BR'))!;
      for (const parentName of person.parents || []) {
        const parentId = personIds.get(parentName.toLocaleLowerCase('pt-BR'));
        if (parentId) tree = tree.linkParent(personId, parentId);
      }
      for (const partnerName of person.partners || []) {
        const partnerId = personIds.get(partnerName.toLocaleLowerCase('pt-BR'));
        if (partnerId) tree = tree.linkPartner(personId, partnerId);
      }
    }
    state.lineage.set('atlas', tree.serialize());
  });
  window.dispatchEvent(new CustomEvent('codex-updated'));
  const characters: CharacterRecord[] = [];
  for (const draft of plan.characters) {
    const record = await saveCharacter({ name: draft.name, type: draft.type, campaign_id: campaignId, notes_markdown: draft.description || '', data: { ...draft.data, description: draft.description || '', source: 'ai-campaign-plan' } }, userId);
    integrateCharacter(record);
    characters.push(record);
  }
  return { notes: createdNotes.length, relations: createdRelations.length, characters: characters.length, events: plan.events.length, lineage: plan.lineage.length, campaignId: campaignRecord.id };
}
