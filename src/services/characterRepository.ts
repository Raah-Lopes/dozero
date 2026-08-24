import { supabase, isSupabaseConfigured } from './supabase';

// -------------------------------------------------------------------
// Tipos
// -------------------------------------------------------------------

export interface CharacterRecord {
  id: string;
  campaign_id: string | null; // null = Vault global do jogador
  owner_id?: string;
  name: string;
  type: 'pc' | 'npc' | 'monster';
  avatar_url?: string;
  data: Record<string, unknown>;   // Atributos, vitais, perícias, macros
  notes_markdown?: string;         // Grimório livre
  is_public_to_party?: boolean;
  created_at?: string;
  updated_at?: string;
}

// -------------------------------------------------------------------
// Cache local
// -------------------------------------------------------------------

const LOCAL_KEY = 'dozero_character_vault';

function readLocal(): CharacterRecord[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch { return []; }
}

function writeLocal(list: CharacterRecord[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function upsertLocal(record: CharacterRecord) {
  const list = readLocal();
  const idx = list.findIndex(c => c.id === record.id);
  if (idx >= 0) list[idx] = record; else list.unshift(record);
  writeLocal(list);
}

// -------------------------------------------------------------------
// API pública
// -------------------------------------------------------------------

/**
 * Carrega personagens do Vault global do usuário (campaign_id IS NULL).
 * Local-first: retorna cache instantaneamente e sincroniza em background.
 */
export async function getVaultCharacters(userId?: string | null): Promise<CharacterRecord[]> {
  const local = readLocal().filter(c => c.campaign_id === null);

  if (!isSupabaseConfigured || !userId) return local;

  try {
    const { data, error } = await supabase
      .from('characters')
      .select('id, campaign_id, owner_id, name, type, avatar_url, data, notes_markdown, is_public_to_party, created_at, updated_at')
      .is('campaign_id', null)
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (error) { console.warn('[CharRepo] getVaultCharacters:', error.message); return local; }

    const records = (data || []) as CharacterRecord[];
    // Merge: mantém locais não sincronizados ainda
    const merged = [
      ...records,
      ...readLocal().filter(c => c.campaign_id === null && !records.find(r => r.id === c.id))
    ];
    writeLocal([...merged, ...readLocal().filter(c => c.campaign_id !== null)]);
    return merged;
  } catch { return local; }
}

/**
 * Carrega personagens vinculados a uma campanha específica.
 */
export async function getCampaignCharacters(campaignId: string, userId?: string | null): Promise<CharacterRecord[]> {
  const local = readLocal().filter(c => c.campaign_id === campaignId);

  if (!isSupabaseConfigured) return local;

  try {
    const { data, error } = await supabase
      .from('characters')
      .select('id, campaign_id, owner_id, name, type, avatar_url, data, notes_markdown, is_public_to_party, created_at, updated_at')
      .eq('campaign_id', campaignId)
      .order('updated_at', { ascending: false });

    if (error) { console.warn('[CharRepo] getCampaignCharacters:', error.message); return local; }

    const records = (data || []) as CharacterRecord[];
    const others = readLocal().filter(c => c.campaign_id !== campaignId);
    writeLocal([...records, ...others]);
    return records;
  } catch { return local; }
}

/**
 * Cria ou atualiza um personagem (Vault ou vinculado a campanha).
 * Local-first: persiste localmente antes de tentar a nuvem.
 */
export async function saveCharacter(
  char: Partial<CharacterRecord> & { name: string },
  userId?: string | null
): Promise<CharacterRecord> {
  const now = new Date().toISOString();
  const record: CharacterRecord = {
    id:               char.id || crypto.randomUUID(),
    campaign_id:      char.campaign_id ?? null,
    owner_id:         userId || char.owner_id,
    name:             char.name,
    type:             char.type || 'pc',
    avatar_url:       char.avatar_url || '',
    data:             char.data || {},
    notes_markdown:   char.notes_markdown || '',
    is_public_to_party: char.is_public_to_party !== false,
    created_at:       char.created_at || now,
    updated_at:       now,
  };

  upsertLocal(record);

  if (isSupabaseConfigured && userId) {
    try {
      const { error } = await supabase.from('characters').upsert({
        id:                 record.id,
        campaign_id:        record.campaign_id,
        owner_id:           record.owner_id,
        name:               record.name,
        type:               record.type,
        avatar_url:         record.avatar_url,
        data:               record.data,
        notes_markdown:     record.notes_markdown,
        is_public_to_party: record.is_public_to_party,
        updated_at:         record.updated_at,
      });
      if (error) console.warn('[CharRepo] saveCharacter upsert:', error.message);
    } catch (e) { console.warn('[CharRepo] saveCharacter rede:', e); }
  }

  return record;
}

/**
 * Importa um personagem do Vault global para uma campanha
 * (cria um novo registro vinculado, sem remover o original do Vault).
 */
export async function importCharacterToCampaign(
  charId: string,
  campaignId: string,
  userId?: string | null
): Promise<CharacterRecord | null> {
  const source = readLocal().find(c => c.id === charId);
  if (!source) {
    // Tenta buscar na nuvem
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.from('characters').select('*').eq('id', charId).single();
    if (error || !data) return null;
    return saveCharacter({ ...(data as CharacterRecord), id: undefined, campaign_id: campaignId }, userId);
  }
  return saveCharacter({ ...source, id: undefined, campaign_id: campaignId }, userId);
}

/**
 * Remove um personagem do Vault ou de uma campanha.
 */
export async function deleteCharacter(id: string, userId?: string | null): Promise<void> {
  writeLocal(readLocal().filter(c => c.id !== id));

  if (isSupabaseConfigured && userId) {
    try {
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (error) console.warn('[CharRepo] deleteCharacter:', error.message);
    } catch (e) { console.warn('[CharRepo] deleteCharacter rede:', e); }
  }
}
