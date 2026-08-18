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
}

const LOCAL_CAMPAIGNS_KEY = 'dozero_cloud_campaigns_cache';

// Carrega campanhas com fallback local inteligente
export async function getCampaigns(userId?: string | null): Promise<CampaignCloudRecord[]> {
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');

  if (!isSupabaseConfigured || !userId) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      return localList;
    }

    if (data && data.length > 0) {
      localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(data));
      return data;
    }

    return localList;
  } catch (e) {
    return localList;
  }
}

// Cria ou salva uma nova campanha
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

  // 2. Sincronização assíncrona no Supabase (se configurado e autenticado)
  if (isSupabaseConfigured && userId) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .upsert(record)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Aviso: Salvo localmente, sync no Supabase pendente:', err);
    }
  }

  return record;
}

// Remove uma campanha
export async function deleteCampaignCloud(id: string, userId?: string | null): Promise<boolean> {
  const localList: CampaignCloudRecord[] = JSON.parse(localStorage.getItem(LOCAL_CAMPAIGNS_KEY) || '[]');
  const filtered = localList.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(filtered));

  if (isSupabaseConfigured && userId) {
    try {
      await supabase.from('campaigns').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar campanha na nuvem:', e);
    }
  }
  return true;
}
