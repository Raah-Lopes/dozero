import { supabase, isSupabaseConfigured } from './supabase';
import { state, pushChatMessage } from '../store';
import { Config } from '../store/modules/configModule';
import type { BackgroundData, MapConfig } from '../store';
import type { FogConfig } from '../store/modules/configModule';
import { toast } from '../components/UI/Toast';

export interface SceneRecord {
  id?: string;
  campaign_id?: string | null;
  owner_id?: string | null;
  name: string;
  thumbnail_url?: string | null;
  backgrounds: BackgroundData[];
  grid_config?: Partial<MapConfig>;
  fog_config?: Partial<FogConfig>;
  audio_config?: {
    musicUrl?: string;
    ambienceUrl?: string;
  };
  fog_ops?: any[];
  drawings?: any[];
  props?: any[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Salva ou atualiza uma cena no Supabase Postgres
 */
export async function saveSceneToCloud(scene: SceneRecord): Promise<SceneRecord | null> {
  if (!isSupabaseConfigured) {
    toast.warn('Supabase não conectado.');
    return null;
  }

  try {
    const payload = {
      campaign_id: scene.campaign_id || null,
      name: scene.name || 'Novo Cenário',
      thumbnail_url: scene.thumbnail_url || (scene.backgrounds?.[0]?.url ?? null),
      backgrounds: scene.backgrounds || [],
      grid_config: scene.grid_config || {},
      fog_config: scene.fog_config || {},
      audio_config: scene.audio_config || {},
      fog_ops: scene.fog_ops || [],
      drawings: scene.drawings || [],
      props: scene.props || [],
      updated_at: new Date().toISOString()
    };

    let res;
    if (scene.id) {
      res = await supabase
        .from('scenes')
        .update(payload)
        .eq('id', scene.id)
        .select()
        .single();
    } else {
      res = await supabase
        .from('scenes')
        .insert(payload)
        .select()
        .single();
    }

    if (res.error) throw res.error;
    toast.success(`Cena "${payload.name}" salva com sucesso!`);
    return res.data;
  } catch (err) {
    console.error('[SceneCloud] Erro ao salvar cena:', err);
    toast.error('Erro ao salvar cena na nuvem.');
    return null;
  }
}

/**
 * Busca todas as cenas salvas disponíveis para a campanha / mestre
 */
export async function getScenesFromCloud(campaignId?: string): Promise<SceneRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    let query = supabase
      .from('scenes')
      .select('*')
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[SceneCloud] Falha ao carregar cenas:', err);
    return [];
  }
}

/**
 * Exclui uma cena salva
 */
export async function deleteSceneFromCloud(sceneId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !sceneId) return false;

  try {
    const { error } = await supabase
      .from('scenes')
      .delete()
      .eq('id', sceneId);

    if (error) throw error;
    toast.info('Cena removida com sucesso.');
    return true;
  } catch (err) {
    toast.error('Erro ao remover cena.');
    return false;
  }
}

/**
 * Aplica uma cena na mesa ativa de forma atômica e sincronizada via Yjs
 */
export function applySceneToTable(scene: SceneRecord) {
  try {
    // 1. Substitui backgrounds
    state.backgrounds.clear();
    if (scene.backgrounds && Array.isArray(scene.backgrounds)) {
      scene.backgrounds.forEach((bg) => {
        state.backgrounds.set(bg.id, bg);
      });
    }

    // 2. Aplica Grid Config se presente
    if (scene.grid_config) {
      Config.setMapConfig(scene.grid_config);
    }

    // 3. Aplica Fog Config se presente
    if (scene.fog_config) {
      Config.setFogConfig(scene.fog_config);
    }

    // 4. Aplica Operações de Névoa de Guerra (Fog of War) salvas
    if (scene.fog_ops && Array.isArray(scene.fog_ops)) {
      state.fogOps.clear();
      scene.fog_ops.forEach((op: any) => {
        if (op.id) state.fogOps.set(op.id, op);
      });
    }

    // 5. Aplica Desenhos do Mapa (Drawings) salvos
    if (scene.drawings && Array.isArray(scene.drawings)) {
      state.drawings.clear();
      scene.drawings.forEach((drawing: any) => {
        if (drawing.id) state.drawings.set(drawing.id, drawing);
      });
    }

    // 6. Aplica Trilha Sonora / Soundscape da cena se configurado
    if (scene.audio_config?.musicUrl) {
      state.audio.set('music', {
        url: scene.audio_config.musicUrl,
        isPlaying: true,
        ts: Date.now()
      });
    }
    if (scene.audio_config?.ambienceUrl) {
      state.audio.set('ambience', {
        url: scene.audio_config.ambienceUrl,
        isPlaying: true,
        ts: Date.now()
      });
    }

    pushChatMessage(
      `🗺️ <b>Novo Cenário Carregado:</b> "${scene.name}" foi ativado pelo Mestre!`,
      true,
      false
    );
    toast.success(`Cenário "${scene.name}" ativado na mesa!`);
  } catch (err) {
    console.error('[SceneCloud] Erro ao aplicar cena:', err);
    toast.error('Erro ao ativar cenário na mesa.');
  }
}
