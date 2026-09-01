import { supabase, isSupabaseConfigured } from './supabase';

export interface CampaignCloudRecord {
  id: string;
  name: string;
  system: string;
  description?: string;
  cover_url?: string;
  room_code: string;
  pass_code?: string;
  is_public?: boolean;   // Visível ou não no lobby principal
  is_closed?: boolean;   // Mesa ativa ou fechada/trancada
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  last_played_at?: string;
  active_players_count?: number; // Contagem real de jogadores presentes na sala
}

const LOCAL_CAMPAIGNS_KEY = 'dozero_cloud_campaigns_cache';

// Obtém estatísticas reais para o painel do Lobby
export function getLobbyStats(campaigns: CampaignCloudRecord[]) {
  const activeRooms = campaigns.filter(c => !c.is_closed).length;
  const totalActivePlayers = campaigns.reduce((acc, c) => acc + (c.active_players_count || 0), 0);
  const uniqueMasters = new Set(campaigns.map(c => c.owner_id).filter(Boolean)).size;

  return {
    mastersCount: Math.max(1, uniqueMasters || 1),
    activePlayersCount: totalActivePlayers > 0 ? totalActivePlayers : activeRooms,
    activeTablesCount: activeRooms > 0 ? activeRooms : campaigns.length
  };
}

let inflightGetCampaigns: Promise<CampaignCloudRecord[]> | null = null;
let lastGetCampaignsTime = 0;
let cachedCampaignsList: CampaignCloudRecord[] | null = null;

/**
 * Obtém o cache local imediatamente sem delay de rede
 */
export function getLocalCampaignsCache(): CampaignCloudRecord[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_CAMPAIGNS_KEY) : null;
    if (!raw) return getCanonicalCampaigns();
    const parsed: CampaignCloudRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return getCanonicalCampaigns();
    
    // Se o cache tiver IDs demo antigos ou mais de 2 mesas antigas fora do padrão, limpa
    const hasObsolete = parsed.some(c => c.id === 'demo_1' || c.id === 'demo_2' || c.name === 'HELSOC');
    if (hasObsolete) {
      const clean = getCanonicalCampaigns();
      localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(clean));
      return clean;
    }
    return parsed;
  } catch {
    return getDefaultDemoCampaigns();
  }
}

/**
 * Força a limpeza e redefinição do cache local para a mesa canônica.
 */
export function resetCampaignsCache(): CampaignCloudRecord[] {
  const defaults = getCanonicalCampaigns();
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(defaults));
  }
  cachedCampaignsList = defaults;
  return defaults;
}

/**
 * Carrega campanhas com estratégia Local-First (Instantâneo) + Sincronização direta com Supabase
 */
export async function getCampaigns(userId?: string | null): Promise<CampaignCloudRecord[]> {
  const localList = userId ? getLocalCampaignsCache() : [];

  if (!isSupabaseConfigured) {
    return [];
  }

  // Deduplicação de chamadas simultâneas (cache quente em memória de 3s)
  const now = Date.now();
  if (cachedCampaignsList && now - lastGetCampaignsTime < 3000) {
    return cachedCampaignsList;
  }
  if (inflightGetCampaigns) {
    return inflightGetCampaigns;
  }

  inflightGetCampaigns = (async () => {
    try {
      const fetchPromise = supabase
        .from('campaigns')
        .select('id, name, system, description, cover_url, room_code, is_public, is_closed, active_players_count, owner_id, created_at, updated_at, last_played_at')
        .order('updated_at', { ascending: false });

      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de sincronização Supabase')), 3500)
      );

      const res = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const { data: tableData, error } = res || {};

      if (error) {
        console.warn('[CampaignCloud] Erro ou timeout no banco:', error.message || error);
        return [];
      }

      if (tableData && tableData.length > 0) {
        const cloudCampaigns: CampaignCloudRecord[] = tableData.map((row: any) => ({
          id: row.id,
          name: row.name,
          system: row.system,
          description: row.description,
          cover_url: row.cover_url,
          room_code: row.room_code,
          is_public: row.is_public,
          is_closed: row.is_closed,
          active_players_count: row.active_players_count || 1,
          owner_id: row.owner_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          last_played_at: row.last_played_at
        }));

        localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(cloudCampaigns));
        cachedCampaignsList = cloudCampaigns;
        lastGetCampaignsTime = Date.now();
        return cloudCampaigns;
      }

      return [];
    } catch (e) {
      console.warn('[CampaignCloud] Usando cache local:', e);
      return [];
    } finally {
      inflightGetCampaigns = null;
    }
  })();

  return inflightGetCampaigns;
}

/**
 * Cria ou atualiza uma campanha diretamente na tabela `campaigns` do Supabase
 */
export async function createOrUpdateCampaign(
  campaign: Partial<CampaignCloudRecord>,
  userId?: string | null
): Promise<CampaignCloudRecord> {
  const now = new Date().toISOString();
  
  // Gera UUID nativo seguro
  const id = campaign.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `camp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const roomCode = campaign.room_code || `mesa_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  
  const record: CampaignCloudRecord = {
    id,
    name: campaign.name || 'Nova Campanha',
    system: campaign.system || 'D&D 5e / Fantasia',
    description: campaign.description || '',
    cover_url: campaign.cover_url || '/assets/vtt_layout_hero.jpg',
    room_code: roomCode,
    pass_code: campaign.pass_code || '',
    is_public: false,
    is_closed: campaign.is_closed !== undefined ? campaign.is_closed : false,
    active_players_count: campaign.active_players_count || 1,
    owner_id: userId || undefined,
    created_at: campaign.created_at || now,
    updated_at: now,
    last_played_at: now
  };

  // 1. Atualiza cache local (Local-First síncrono)
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');
  const existingIdx = localList.findIndex(c => c.id === record.id || c.room_code === record.room_code);
  if (existingIdx >= 0) {
    localList[existingIdx] = record;
  } else {
    localList.unshift(record);
  }
  localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(localList));

  // 2. Persiste na tabela 'campaigns' do Supabase e vincula GM em 'players'
  if (isSupabaseConfigured && userId) {
    try {
      const { error: campError } = await supabase.from('campaigns').upsert({
        id: record.id,
        name: record.name,
        system: record.system,
        description: record.description,
        cover_url: record.cover_url,
        room_code: record.room_code,
        is_public: record.is_public,
        is_closed: record.is_closed,
        active_players_count: record.active_players_count,
        owner_id: userId,
        updated_at: record.updated_at
      });

      if (campError) {
        console.warn('[CampaignCloud] Erro no upsert do Supabase:', campError.message);
      } else {
        // Vincula o criador como GM na tabela relacional de players
        await supabase.from('players').upsert({
          campaign_id: record.id,
          user_id: userId,
          role: 'gm',
          last_seen_at: now
        }, { onConflict: 'campaign_id,user_id' });
      }
    } catch (e) {
      console.warn('[CampaignCloud] Erro ao sincronizar campanha com o Supabase:', e);
    }
  }

  return record;
}

/**
 * Exclui uma campanha localmente e no banco de dados do Supabase
 */
export async function deleteCampaignCloud(id: string, userId?: string | null): Promise<void> {
  // 1. Remove do cache local
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');
  const filtered = localList.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(filtered));

  // 2. Remove do Supabase
  if (isSupabaseConfigured && userId) {
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) {
        console.warn('[CampaignCloud] Erro ao deletar no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('[CampaignCloud] Erro de rede ao deletar campanha:', e);
    }
  }
}

/**
 * Salva o snapshot consolidado da sessão na mesa
 */
export async function saveSessionSnapshot(roomCode: string, snapshot: any): Promise<boolean> {
  if (!isSupabaseConfigured || !roomCode) return false;
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({
        snapshot,
        last_played_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('room_code', roomCode);

    return !error;
  } catch (err) {
    console.warn('[CampaignCloud] Erro ao salvar snapshot de sessão:', err);
    return false;
  }
}

/**
 * Carrega o snapshot consolidado da mesa
 */
export async function loadSessionSnapshot(roomCode: string): Promise<any | null> {
  if (!isSupabaseConfigured || !roomCode) return null;
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('snapshot')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (error || !data) return null;
    return data.snapshot;
  } catch (err) {
    console.warn('[CampaignCloud] Erro ao carregar snapshot:', err);
    return null;
  }
}

export interface CampaignMemberRecord {
  id: string;
  campaign_id: string;
  user_id: string;
  role: 'gm' | 'player' | 'spectator';
  character_name?: string;
  joined_at?: string;
  last_seen_at?: string;
  profile?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

const inflightMembers = new Map<string, Promise<CampaignMemberRecord[]>>();
const lastMembersFetchTime = new Map<string, number>();
const cachedMembersList = new Map<string, CampaignMemberRecord[]>();

/**
 * Busca os participantes e mestre de uma campanha
 */
export async function getCampaignMembers(campaignId: string): Promise<CampaignMemberRecord[]> {
  if (!isSupabaseConfigured || !campaignId) return [];

  const now = Date.now();
  const lastTime = lastMembersFetchTime.get(campaignId) || 0;
  const cached = cachedMembersList.get(campaignId);
  if (cached && now - lastTime < 4000) {
    return cached;
  }

  const existing = inflightMembers.get(campaignId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, campaign_id, user_id, role, character_name, joined_at, last_seen_at, profile:profiles(id, username, full_name, avatar_url)')
        .eq('campaign_id', campaignId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.warn('[CampaignCloud] Erro ao buscar membros da campanha:', error.message);
        return cached || [];
      }

      const records = (data || []) as unknown as CampaignMemberRecord[];
      cachedMembersList.set(campaignId, records);
      lastMembersFetchTime.set(campaignId, Date.now());
      return records;
    } catch (err) {
      console.warn('[CampaignCloud] Falha na rede ao buscar membros:', err);
      return cached || [];
    } finally {
      inflightMembers.delete(campaignId);
    }
  })();

  inflightMembers.set(campaignId, promise);
  return promise;
}

/**
 * Altera o papel de um participante na campanha
 */
export async function updateCampaignMemberRole(
  campaignId: string,
  userId: string,
  role: 'gm' | 'player' | 'spectator'
): Promise<boolean> {
  if (!isSupabaseConfigured || !campaignId || !userId) return false;
  try {
    const { error } = await supabase
      .from('players')
      .update({ role, last_seen_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('user_id', userId);

    return !error;
  } catch (err) {
    console.warn('[CampaignCloud] Erro ao atualizar papel do membro:', err);
    return false;
  }
}

/**
 * Remove um participante de uma campanha
 */
export async function removeCampaignMember(campaignId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !campaignId || !userId) return false;
  try {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', userId);

    return !error;
  } catch (err) {
    console.warn('[CampaignCloud] Erro ao remover membro:', err);
    return false;
  }
}

/**
 * Registra o ingresso do usuário na campanha
 */
export async function joinCampaign(
  campaignId: string,
  userId: string,
  role: 'player' | 'spectator' = 'player',
  characterName?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !campaignId || !userId) return false;
  try {
    const { error } = await supabase
      .from('players')
      .upsert({
        campaign_id: campaignId,
        user_id: userId,
        role,
        character_name: characterName || undefined,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'campaign_id,user_id' });

    return !error;
  } catch (err) {
    console.warn('[CampaignCloud] Erro ao ingressar na campanha:', err);
    return false;
  }
}

function getCanonicalCampaigns(): CampaignCloudRecord[] {
  return [
    {
      id: 'dozero-mesa-principal-v2',
      name: 'Mesa 0 — Ecossistema DOZERO',
      system: 'Sistema agnóstico',
      description: 'Mesa canônica usada para desenvolver e validar o ecossistema DOZERO.',
      cover_url: '/assets/vtt_layout_hero.jpg',
      room_code: 'dozero-mesa-principal-v2',
      is_public: false,
      is_closed: false,
      active_players_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}
