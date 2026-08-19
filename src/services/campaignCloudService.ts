import { supabase, isSupabaseConfigured } from './supabase';

export interface CampaignCloudRecord {
  id: string;
  name: string;
  system: string;
  description?: string;
  cover_url?: string;
  room_code: string;
  pass_code?: string;
  wiki_path?: string;   // Caminho da pasta da Wiki (ex: D:/DOZERO/wikidozero)
  is_public?: boolean;   // Visível ou não no lobby principal
  is_closed?: boolean;   // Mesa ativa ou fechada/trancada
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  last_played_at?: string;
  active_players_count?: number; // Contagem em tempo real de jogadores na sala
}

const LOCAL_CAMPAIGNS_KEY = 'dozero_cloud_campaigns_cache';

// Obtém estatísticas dinâmicas para o painel da Taverna / Lobby
export function getLobbyStats(campaigns: CampaignCloudRecord[]) {
  const activeRooms = campaigns.filter(c => !c.is_closed).length;
  // Simula ou agrega contagem de jogadores ativos nas mesas
  const totalActivePlayers = campaigns.reduce((acc, c) => acc + (c.active_players_count || (c.is_closed ? 0 : Math.floor(Math.random() * 4) + 1)), 0);
  return {
    mastersCount: Math.max(1, new Set(campaigns.map(c => c.owner_id || 'gm')).size),
    activePlayersCount: totalActivePlayers > 0 ? totalActivePlayers : 12,
    activeTablesCount: activeRooms > 0 ? activeRooms : campaigns.length
  };
}

// Carrega campanhas sincronizando Local-First + Supabase Metadata + Supabase Table
export async function getCampaigns(userId?: string | null): Promise<CampaignCloudRecord[]> {
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');

  // Se a lista local estiver vazia, cria 2 mesas de exemplo se desejado
  if (localList.length === 0) {
    const defaultDemos: CampaignCloudRecord[] = [
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
    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(defaultDemos));
    return defaultDemos;
  }

  if (!isSupabaseConfigured || !userId) {
    return localList;
  }

  try {
    const campaignMap = new Map<string, CampaignCloudRecord>();
    // 1. Coloca dados locais
    localList.forEach(c => campaignMap.set(c.id, c));

    // 2. Busca do user_metadata do Supabase Auth (funciona 100% mesmo sem migrations de banco)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.saved_campaigns && Array.isArray(user.user_metadata.saved_campaigns)) {
      user.user_metadata.saved_campaigns.forEach((c: CampaignCloudRecord) => {
        campaignMap.set(c.id, c);
      });
    }

    // 3. Tenta buscar da tabela pública 'campaigns' se ela existir
    try {
      const { data: tableData } = await supabase
        .from('campaigns')
        .select('*')
        .order('updated_at', { ascending: false });

      if (tableData && tableData.length > 0) {
        tableData.forEach((c: CampaignCloudRecord) => campaignMap.set(c.id, c));
      }
    } catch (e) {
      // Ignora erro de tabela não existente
    }

    const merged = Array.from(campaignMap.values()).sort((a, b) => {
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    });

    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    return localList;
  }
}

// Cria ou salva uma nova campanha sincronizando em nuvem
export async function createOrUpdateCampaign(
  campaign: Partial<CampaignCloudRecord>,
  userId?: string | null
): Promise<CampaignCloudRecord> {
  const now = new Date().toISOString();
  const roomCode = campaign.room_code || `mesa_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  
  const record: CampaignCloudRecord = {
    id: campaign.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: campaign.name || 'Nova Campanha',
    system: campaign.system || 'D&D 5e / Fantasia',
    description: campaign.description || '',
    cover_url: campaign.cover_url || '/assets/vtt_layout_hero.jpg',
    room_code: roomCode,
    pass_code: campaign.pass_code || '',
    wiki_path: campaign.wiki_path || 'D:/DOZERO/wikidozero',
    is_public: campaign.is_public !== undefined ? campaign.is_public : true,
    is_closed: campaign.is_closed !== undefined ? campaign.is_closed : false,
    active_players_count: campaign.active_players_count || 1,
    owner_id: userId || undefined,
    created_at: campaign.created_at || now,
    updated_at: now,
    last_played_at: now
  };

  // 1. Persistência síncrona local (Local-first)
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');
  const existingIdx = localList.findIndex(c => c.id === record.id || c.room_code === record.room_code);
  if (existingIdx >= 0) {
    localList[existingIdx] = record;
  } else {
    localList.unshift(record);
  }
  localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(localList));

  // 2. Sincroniza em nuvem via Supabase Auth user_metadata
  if (isSupabaseConfigured && userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cloudList: CampaignCloudRecord[] = user.user_metadata?.saved_campaigns || [];
        const cloudIdx = cloudList.findIndex((c: CampaignCloudRecord) => c.id === record.id || c.room_code === record.room_code);
        if (cloudIdx >= 0) {
          cloudList[cloudIdx] = record;
        } else {
          cloudList.unshift(record);
        }
        await supabase.auth.updateUser({
          data: { saved_campaigns: cloudList }
        });
      }

      // 3. Tenta salvar na tabela 'campaigns' do Supabase
      try {
        await supabase.from('campaigns').upsert({
          id: record.id,
          name: record.name,
          system: record.system,
          description: record.description,
          cover_url: record.cover_url,
          room_code: record.room_code,
          pass_code: record.pass_code,
          wiki_path: record.wiki_path,
          is_public: record.is_public,
          is_closed: record.is_closed,
          owner_id: userId,
          updated_at: record.updated_at
        });
      } catch (errTable) {
        // Tabela opcional
      }
    } catch (e) {
      console.warn('Erro ao sincronizar campanha com nuvem:', e);
    }
  }

  return record;
}

// Exclui uma campanha local e na nuvem
export async function deleteCampaignCloud(id: string, userId?: string | null): Promise<void> {
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');
  const filtered = localList.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(filtered));

  if (isSupabaseConfigured && userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cloudList: CampaignCloudRecord[] = user.user_metadata?.saved_campaigns || [];
        const updated = cloudList.filter((c: CampaignCloudRecord) => c.id !== id);
        await supabase.auth.updateUser({
          data: { saved_campaigns: updated }
        });
      }

      try {
        await supabase.from('campaigns').delete().eq('id', id);
      } catch (err) {
        // Ignore
      }
    } catch (e) {
      console.warn('Erro ao deletar da nuvem:', e);
    }
  }
}
