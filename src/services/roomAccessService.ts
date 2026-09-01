import { isSupabaseConfigured, supabase } from './supabase';

const LOCAL_BOOTSTRAP_ADMINS = new Set(['raphaell.lops@gmail.com', 'rmirraine@gmail.com']);
const BASE_ROOM_CODE = 'dozero-mesa-principal-v2';

function canBootstrapBaseRoomLocally(roomCode: string, email?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal && roomCode === BASE_ROOM_CODE && !!email && LOCAL_BOOTSTRAP_ADMINS.has(email.toLowerCase());
}

export type RoomAccess =
  | { allowed: true; campaignId: string; role: 'admin' | 'owner' | 'gm' | 'player' | 'spectator' }
  | { allowed: false; reason: 'not_authenticated' | 'not_configured' | 'not_member' | 'suspended' | 'unavailable' };

/** Source of truth used before a VTT room is rendered or synchronized. */
export async function verifyRoomAccess(roomCode: string): Promise<RoomAccess> {
  if (!isSupabaseConfigured) return { allowed: false, reason: 'not_configured' };
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { allowed: false, reason: 'not_authenticated' };

  // Bootstrap de desenvolvimento: os dois responsáveis confirmados conseguem
  // administrar a Mesa 0 no localhost mesmo antes da migration alcançar o
  // projeto remoto. A URL publicada continua dependente de RLS no Supabase.
  if (canBootstrapBaseRoomLocally(roomCode, user.email)) {
    return { allowed: true, campaignId: BASE_ROOM_CODE, role: 'admin' };
  }

  const [{ data: control }, { data: admin }, { data: campaign, error }] = await Promise.all([
    supabase.from('account_controls').select('status').eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
    supabase.from('campaigns').select('id, owner_id').eq('room_code', roomCode).maybeSingle(),
  ]);
  if (control?.status === 'suspended') return { allowed: false, reason: 'suspended' };
  if (error) return { allowed: false, reason: 'unavailable' };
  if (!campaign) return { allowed: false, reason: 'not_member' };
  if (admin) return { allowed: true, campaignId: campaign.id, role: 'admin' };
  if (campaign.owner_id === user.id) return { allowed: true, campaignId: campaign.id, role: 'owner' };

  const { data: member } = await supabase.from('players').select('role').eq('campaign_id', campaign.id).eq('user_id', user.id).maybeSingle();
  if (!member) return { allowed: false, reason: 'not_member' };
  return { allowed: true, campaignId: campaign.id, role: member.role };
}

export async function getMyPlatformRole(): Promise<'admin' | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase.from('platform_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  return data?.role === 'admin' ? 'admin' : null;
}

export async function createCampaignInvite(campaignId: string, email: string, role: 'gm' | 'player' | 'spectator') {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sessão inválida.');
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Informe um e-mail válido.');
  const { error } = await supabase.from('campaign_invites').upsert({ campaign_id: campaignId, email: normalizedEmail, role, created_by: userId, revoked_at: null, accepted_at: null, accepted_by: null }, { onConflict: 'campaign_id,email' });
  if (error) throw error;
}

export async function listCampaignInvites(campaignId: string) {
  const { data, error } = await supabase.from('campaign_invites').select('id, email, role, created_at, accepted_at, revoked_at').eq('campaign_id', campaignId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function revokeCampaignInvite(inviteId: string) {
  const { error } = await supabase.from('campaign_invites').update({ revoked_at: new Date().toISOString() }).eq('id', inviteId);
  if (error) throw error;
}

export interface CampaignCharacterAssignment {
  campaign_id: string;
  character_id: string;
  player_id: string;
  assigned_by: string;
  assigned_at: string;
}

/** Vincula uma ficha da campanha a um jogador. Apenas dono, mestre ou admin pode alterar. */
export async function assignCampaignCharacter(campaignId: string, characterId: string, playerId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const assignedBy = sessionData.session?.user.id;
  if (!assignedBy) throw new Error('Sessão inválida.');
  const { error } = await supabase.from('campaign_character_assignments').upsert({
    campaign_id: campaignId,
    character_id: characterId,
    player_id: playerId,
    assigned_by: assignedBy,
    assigned_at: new Date().toISOString(),
  }, { onConflict: 'campaign_id,character_id' });
  if (error) throw error;
}

export async function listCampaignCharacterAssignments(campaignId: string): Promise<CampaignCharacterAssignment[]> {
  const { data, error } = await supabase.from('campaign_character_assignments')
    .select('campaign_id, character_id, player_id, assigned_by, assigned_at')
    .eq('campaign_id', campaignId)
    .order('assigned_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listMyPendingInvites() {
  const { data, error } = await supabase.from('campaign_invites')
    .select('id, campaign_id, role, created_at, campaign:campaigns(name, system)')
    .is('accepted_at', null).is('revoked_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function acceptCampaignInvite(inviteId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Entre para aceitar o convite.');
  const { error } = await supabase.from('campaign_invites').update({ accepted_at: new Date().toISOString(), accepted_by: userId }).eq('id', inviteId);
  if (error) throw error;
}

export async function listAdminAccounts() {
  const { data, error } = await supabase.from('profiles').select('id, username, full_name, avatar_url').order('username');
  if (error) throw error;
  const [controls, roles] = await Promise.all([
    supabase.from('account_controls').select('user_id, status'),
    supabase.from('platform_roles').select('user_id, role'),
  ]);
  if (controls.error) throw controls.error;
  if (roles.error) throw roles.error;
  return (data || []).map(profile => ({ ...profile, status: controls.data?.find(control => control.user_id === profile.id)?.status || 'active', role: roles.data?.find(role => role.user_id === profile.id)?.role || null }));
}

export async function setAccountStatus(userId: string, status: 'active' | 'suspended') {
  const { error } = await supabase.from('account_controls').upsert({ user_id: userId, status, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function setPlatformAdmin(userId: string, enabled: boolean) {
  const query = enabled
    ? supabase.from('platform_roles').upsert({ user_id: userId, role: 'admin' })
    : supabase.from('platform_roles').delete().eq('user_id', userId);
  const { error } = await query;
  if (error) throw error;
}
