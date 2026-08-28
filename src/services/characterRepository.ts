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
// Cache quente e deduplicação de requisições em voo
// -------------------------------------------------------------------

let inflightVault: Promise<CharacterRecord[]> | null = null;
let lastVaultFetchTime = 0;
let cachedVaultList: CharacterRecord[] | null = null;

const inflightCampaigns = new Map<string, Promise<CharacterRecord[]>>();
const lastCampaignFetchTime = new Map<string, number>();
const cachedCampaignList = new Map<string, CharacterRecord[]>();

// Fila de debounce para upserts remotos
const pendingCloudSaves = new Map<string, NodeJS.Timeout>();

// -------------------------------------------------------------------
// API pública
// -------------------------------------------------------------------

/**
 * Carrega personagens do Vault global do usuário (campaign_id IS NULL).
 * Local-first: retorna cache instantaneamente e sincroniza em background com deduplicação.
 */
export async function getVaultCharacters(userId?: string | null): Promise<CharacterRecord[]> {
  const local = readLocal().filter(c => c.campaign_id === null);

  if (!isSupabaseConfigured || !userId) return local;

  const now = Date.now();
  if (cachedVaultList && now - lastVaultFetchTime < 4000) {
    return cachedVaultList;
  }

  if (inflightVault) return inflightVault;

  inflightVault = (async () => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('id, campaign_id, owner_id, name, type, avatar_url, data, notes_markdown, is_public_to_party, created_at, updated_at')
        .is('campaign_id', null)
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('[CharRepo] getVaultCharacters aviso:', error.message);
        return local;
      }

      const records = (data || []) as CharacterRecord[];
      const merged = [
        ...records,
        ...readLocal().filter(c => c.campaign_id === null && !records.find(r => r.id === c.id))
      ];
      writeLocal([...merged, ...readLocal().filter(c => c.campaign_id !== null)]);
      cachedVaultList = merged;
      lastVaultFetchTime = Date.now();
      return merged;
    } catch {
      return local;
    } finally {
      inflightVault = null;
    }
  })();

  return inflightVault;
}

/**
 * Carrega personagens vinculados a uma campanha específica.
 */
export async function getCampaignCharacters(campaignId: string, _userId?: string | null): Promise<CharacterRecord[]> {
  const local = readLocal().filter(c => c.campaign_id === campaignId);

  if (!isSupabaseConfigured || !campaignId) return local;

  const now = Date.now();
  const lastTime = lastCampaignFetchTime.get(campaignId) || 0;
  const cached = cachedCampaignList.get(campaignId);
  if (cached && now - lastTime < 4000) {
    return cached;
  }

  const existingInflight = inflightCampaigns.get(campaignId);
  if (existingInflight) return existingInflight;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('id, campaign_id, owner_id, name, type, avatar_url, data, notes_markdown, is_public_to_party, created_at, updated_at')
        .eq('campaign_id', campaignId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('[CharRepo] getCampaignCharacters aviso:', error.message);
        return local;
      }

      const records = (data || []) as CharacterRecord[];
      const others = readLocal().filter(c => c.campaign_id !== campaignId);
      writeLocal([...records, ...others]);
      cachedCampaignList.set(campaignId, records);
      lastCampaignFetchTime.set(campaignId, Date.now());
      return records;
    } catch {
      return local;
    } finally {
      inflightCampaigns.delete(campaignId);
    }
  })();

  inflightCampaigns.set(campaignId, promise);
  return promise;
}

/**
 * Cria ou atualiza um personagem (Vault ou vinculado a campanha).
 * Local-first: persiste localmente antes de tentar a nuvem com debounce inteligente.
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

  // Invalida cache quente em memória para forçar atualização no próximo ciclo
  if (record.campaign_id) {
    cachedCampaignList.delete(record.campaign_id);
  } else {
    cachedVaultList = null;
  }

  if (isSupabaseConfigured && userId) {
    // Cancela save anterior pendente deste mesmo personagem para evitar rajada de requests
    const prevTimer = pendingCloudSaves.get(record.id);
    if (prevTimer) clearTimeout(prevTimer);

    const timer = setTimeout(async () => {
      pendingCloudSaves.delete(record.id);
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
        if (error) console.warn('[CharRepo] saveCharacter upsert aviso:', error.message);
      } catch (e) {
        console.warn('[CharRepo] saveCharacter rede offline:', e);
      }
    }, 400);

    pendingCloudSaves.set(record.id, timer);
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

export interface CharacterVersionRecord {
  id: string;
  character_id: string;
  label: string;
  snapshot: CharacterRecord;
  created_at: string;
}

// -------------------------------------------------------------------
// Cache local de Versões
// -------------------------------------------------------------------

const VERSIONS_KEY = 'dozero_character_versions';

function readVersionsLocal(): CharacterVersionRecord[] {
  try { return JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]'); }
  catch { return []; }
}

function writeVersionsLocal(list: CharacterVersionRecord[]) {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(list));
}

/**
 * Cria um snapshot / ponto de restauração do estado atual do personagem.
 */
export async function createCharacterSnapshot(
  charId: string,
  label?: string,
  userId?: string | null
): Promise<CharacterVersionRecord | null> {
  const current = readLocal().find(c => c.id === charId);
  if (!current) return null;

  const versionRecord: CharacterVersionRecord = {
    id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    character_id: charId,
    label: label || `Snapshot - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    snapshot: JSON.parse(JSON.stringify(current)),
    created_at: new Date().toISOString()
  };

  const list = readVersionsLocal();
  list.unshift(versionRecord);
  writeVersionsLocal(list);

  return versionRecord;
}

/**
 * Recupera o histórico de versões / snapshots de um personagem.
 */
export async function getCharacterVersions(
  charId: string,
  _userId?: string | null
): Promise<CharacterVersionRecord[]> {
  return readVersionsLocal().filter(v => v.character_id === charId);
}

/**
 * Restaura um personagem a partir de uma versão salva no histórico.
 */
export async function restoreCharacterVersion(
  versionId: string,
  userId?: string | null
): Promise<CharacterRecord | null> {
  const version = readVersionsLocal().find(v => v.id === versionId);
  if (!version) return null;

  // Atualiza o personagem mantendo o ID original mas restaurando dados, atributos e notas
  const restored = await saveCharacter({
    ...version.snapshot,
    id: version.character_id,
    updated_at: new Date().toISOString()
  }, userId);

  return restored;
}

/**
 * Remove um snapshot do histórico de versões.
 */
export async function deleteCharacterVersion(versionId: string): Promise<void> {
  const list = readVersionsLocal().filter(v => v.id !== versionId);
  writeVersionsLocal(list);
}

/**
 * Clona um personagem com novo UUID, permitindo transferir para outra campanha ou duplicar no Vault.
 */
export async function cloneCharacter(
  charId: string,
  targetCampaignId?: string | null,
  newName?: string,
  userId?: string | null
): Promise<CharacterRecord | null> {
  let source = readLocal().find(c => c.id === charId);
  if (!source && isSupabaseConfigured) {
    const { data } = await supabase.from('characters').select('*').eq('id', charId).single();
    if (data) source = data as CharacterRecord;
  }

  if (!source) return null;

  const clonedName = newName || `${source.name} (Cópia)`;
  const clonedRecord: Partial<CharacterRecord> & { name: string } = {
    ...JSON.parse(JSON.stringify(source)),
    id: undefined, // Força criação de novo UUID
    name: clonedName,
    campaign_id: targetCampaignId !== undefined ? targetCampaignId : source.campaign_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return saveCharacter(clonedRecord, userId);
}

/**
 * Exporta uma ficha completa como download de arquivo JSON.
 */
export function exportCharacterJson(char: CharacterRecord): void {
  const exportData = {
    schema_version: '1.0',
    app: 'DOZERO VTT',
    exported_at: new Date().toISOString(),
    character: char
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${char.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_vault.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Importa uma ficha de personagem a partir de string JSON.
 */
export async function importCharacterFromJson(
  jsonContent: string,
  userId?: string | null
): Promise<CharacterRecord> {
  const parsed = JSON.parse(jsonContent);
  const charData = parsed.character || parsed;

  if (!charData || !charData.name) {
    throw new Error('Formato de ficha JSON inválido. Campo "name" não encontrado.');
  }

  return saveCharacter({
    name: charData.name,
    type: charData.type || 'pc',
    avatar_url: charData.avatar_url || '',
    data: charData.data || {},
    notes_markdown: charData.notes_markdown || '',
    campaign_id: null
  }, userId);
}

/**
 * Remove um personagem do Vault ou de uma campanha.
 */
export async function deleteCharacter(id: string, userId?: string | null): Promise<void> {
  writeLocal(readLocal().filter(c => c.id !== id));
  // Limpa também as versões associadas
  writeVersionsLocal(readVersionsLocal().filter(v => v.character_id !== id));

  if (isSupabaseConfigured && userId) {
    try {
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (error) console.warn('[CharRepo] deleteCharacter:', error.message);
    } catch (e) { console.warn('[CharRepo] deleteCharacter rede:', e); }
  }
}

