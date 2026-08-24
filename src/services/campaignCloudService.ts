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

/**
 * Carrega campanhas com estratégia de Cache Local (Local-First) + Sincronização direta com Supabase Postgres
 * Evita carregar campos pesados (como snapshot da mesa) no lobby.
 */
export async function getCampaigns(userId?: string | null): Promise<CampaignCloudRecord[]> {
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');

  // Se o Supabase não estiver configurado ou não houver usuário logado, retorna cache local (ou demos se vazio)
  if (!isSupabaseConfigured) {
    if (localList.length === 0) {
      const defaultDemos = getDefaultDemoCampaigns();
      localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(defaultDemos));
      return defaultDemos;
    }
    return localList;
  }

  try {
    // Busca apenas as colunas necessárias para o Lobby (otimização de payload)
    const { data: tableData, error } = await supabase
      .from('campaigns')
      .select('id, name, system, description, cover_url, room_code, is_public, is_closed, active_players_count, owner_id, created_at, updated_at, last_played_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[CampaignCloud] Erro ao buscar campanhas do banco:', error.message);
      return localList.length > 0 ? localList : getDefaultDemoCampaigns();
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
      return cloudCampaigns;
    }

    return localList;
  } catch (e) {
    console.warn('[CampaignCloud] Falha na rede, usando cache local:', e);
    return localList;
  }
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
    is_public: campaign.is_public !== undefined ? campaign.is_public : true,
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
      .single();

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

/**
 * Busca os participantes e mestre de uma campanha
 */
export async function getCampaignMembers(campaignId: string): Promise<CampaignMemberRecord[]> {
  if (!isSupabaseConfigured || !campaignId) return [];
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, campaign_id, user_id, role, character_name, joined_at, last_seen_at, profile:profiles(id, username, full_name, avatar_url)')
      .eq('campaign_id', campaignId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.warn('[CampaignCloud] Erro ao buscar membros da campanha:', error.message);
      return [];
    }

    return (data || []) as unknown as CampaignMemberRecord[];
  } catch (err) {
    console.warn('[CampaignCloud] Falha na rede ao buscar membros:', err);
    return [];
  }
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

function getDefaultDemoCampaigns(): CampaignCloudRecord[] {
  return [
    {
      id: 'demo_1',
      name: 'A Cripta do Rei Esquecido',
      system: 'D&D 5e / Fantasia Medieval',
      description: 'Uma expedição arqueológica às ruínas subterrâneas de Valdoria revelou portais selados há milênios.',
      cover_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      room_code: 'mesa_cripta_esquecida',
      is_public: true,
      is_closed: false,
      active_players_count: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_2',
      name: 'Sombras sobre Arton',
      system: 'Tormenta20',
      description: 'Investigação de corrupção rubra nas fronteiras de Deheon. Apenas os mais bravos sobreviverão.',
      cover_url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=800&q=80',
      room_code: 'mesa_sombras_arton',
      is_public: true,
      is_closed: false,
      active_players_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}
