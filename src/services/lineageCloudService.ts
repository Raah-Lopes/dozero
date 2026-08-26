import { isSupabaseConfigured, supabase } from './supabase';
import { getCampaignIdForRoom } from './sceneCloudService';
import type { TreeJSON } from '../components/Widgets/GameMaster/Lineage/model/tree';

export interface LineageAtlasRecord {
  campaign_id: string;
  data: TreeJSON;
  updated_at: string;
  updated_by: string | null;
}

export async function loadLineageAtlas(roomCode: string): Promise<LineageAtlasRecord | null> {
  if (!isSupabaseConfigured || !roomCode) return null;

  const campaignId = await getCampaignIdForRoom(roomCode);
  if (!campaignId) return null;

  const { data, error } = await supabase
    .from('lineage_atlases')
    .select('campaign_id,data,updated_at,updated_by')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (error) {
    if (error.code !== '42P01' && error.code !== 'PGRST205') {
      console.warn('[LineageCloud] Não foi possível carregar o atlas:', error);
    }
    return null;
  }
  return data as LineageAtlasRecord | null;
}

export async function saveLineageAtlas(roomCode: string, tree: TreeJSON): Promise<boolean> {
  if (!isSupabaseConfigured || !roomCode) return false;

  const [{ data: auth }, campaignId] = await Promise.all([
    supabase.auth.getUser(),
    getCampaignIdForRoom(roomCode),
  ]);
  if (!auth.user || !campaignId) return false;

  const { error } = await supabase.from('lineage_atlases').upsert(
    {
      campaign_id: campaignId,
      data: tree,
      schema_version: tree.version,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'campaign_id' },
  );

  if (error) {
    console.warn('[LineageCloud] Não foi possível salvar o atlas:', error);
    return false;
  }
  return true;
}
