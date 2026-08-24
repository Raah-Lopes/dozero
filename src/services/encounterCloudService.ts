import { supabase } from './supabase';
import { state, pushChatMessage } from '../store';
import type { CombatParticipant } from '../store';
import { toast } from '../components/UI/Toast';

export interface CombatEncounterRecord {
  id?: string;
  campaign_id: string;
  name: string;
  round_count?: number;
  outcome?: 'active' | 'victory' | 'defeat' | 'draw' | 'escaped';
  combatants: Array<{
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    defense: number;
    attack: number;
    imageUrl?: string;
    weapons?: Array<{ nome: string; dano: string }>;
    powers?: Array<{ nome: string; efeito: string }>;
  }>;
  created_at?: string;
  ended_at?: string;
}

/**
 * Salva um encontro de combate no Supabase Postgres
 */
export async function saveCombatEncounter(encounter: Partial<CombatEncounterRecord>): Promise<CombatEncounterRecord | null> {
  if (!supabase || !encounter.campaign_id) return null;

  try {
    const payload = {
      campaign_id: encounter.campaign_id,
      name: encounter.name || 'Encontro de Combate',
      round_count: encounter.round_count || 1,
      outcome: encounter.outcome || 'active',
      combatants: encounter.combatants || [],
      ended_at: encounter.outcome && encounter.outcome !== 'active' ? new Date().toISOString() : null
    };

    let res;
    if (encounter.id) {
      res = await supabase
        .from('combat_encounters')
        .update(payload)
        .eq('id', encounter.id)
        .select()
        .single();
    } else {
      res = await supabase
        .from('combat_encounters')
        .insert(payload)
        .select()
        .single();
    }

    if (res.error) throw res.error;
    toast.success(`Encontro "${payload.name}" salvo na nuvem!`);
    return res.data;
  } catch (err) {
    console.error('[EncounterCloud] Erro ao salvar encontro:', err);
    toast.error('Erro ao salvar encontro na nuvem.');
    return null;
  }
}

/**
 * Busca todos os encontros salvos de uma campanha
 */
export async function getCombatEncounters(campaignId: string): Promise<CombatEncounterRecord[]> {
  if (!supabase || !campaignId) return [];

  try {
    const { data, error } = await supabase
      .from('combat_encounters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[EncounterCloud] Falha ao listar encontros:', err);
    return [];
  }
}

/**
 * Exclui um encontro salvo
 */
export async function deleteCombatEncounter(encounterId: string): Promise<boolean> {
  if (!supabase || !encounterId) return false;

  try {
    const { error } = await supabase
      .from('combat_encounters')
      .delete()
      .eq('id', encounterId);

    if (error) throw error;
    toast.info('Encontro removido da nuvem.');
    return true;
  } catch (err) {
    toast.error('Erro ao remover encontro.');
    return false;
  }
}

/**
 * Instancia todos os combatentes de um encontro salvo diretamente no grid Yjs e no Combat Tracker
 */
export function spawnEncounterToTable(encounter: CombatEncounterRecord) {
  if (!encounter.combatants || encounter.combatants.length === 0) {
    toast.warn('Este encontro não possui combatentes cadastrados.');
    return;
  }

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const currentParticipants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants: CombatParticipant[] = [];

  encounter.combatants.forEach((c, idx) => {
    const tokenId = `enc_spawn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const offsetX = (Math.random() - 0.5) * 200 + (idx * 24);
    const offsetY = (Math.random() - 0.5) * 200 + (idx * 24);

    state.tokens.set(tokenId, {
      id: tokenId,
      x: cx + offsetX,
      y: cy + offsetY,
      name: c.name,
      hp: c.hp || 20,
      maxHp: c.maxHp || c.hp || 20,
      nivel: c.level || 1,
      defesa: c.defense || 10,
      ataque: c.attack || 2,
      imageUrl: c.imageUrl || '/enemy_bandit.png',
      tokenShape: 'circle',
      sizeScale: 1,
      borderColor: '#ef4444',
      showName: true,
      hpBarMode: 'always',
      status: 'npc',
      ativo: true,
      armas: c.weapons || [{ nome: 'Ataque Corporal', dano: '1d6+2', equipado: true }],
      poderes: c.powers || []
    });

    newParticipants.push({
      tokenId,
      name: c.name,
      initiative: Math.floor(Math.random() * 20) + 1 + (c.level || 1),
      imageUrl: c.imageUrl || '/enemy_bandit.png'
    });
  });

  const merged = [...currentParticipants, ...newParticipants];
  merged.sort((a, b) => b.initiative - a.initiative);
  state.combat.set('participants', merged);

  pushChatMessage(
    `⚔️ <b>Encontro Invocado:</b> "${encounter.name}" foi posicionado no mapa com ${encounter.combatants.length} combatente(s)!`,
    true,
    false
  );
  toast.success(`Encontro "${encounter.name}" evocado no mapa!`);
}
