import { useEffect, useState } from 'react';
import { getCampaignMembers, getCampaigns } from '../../../services/campaignCloudService';
import { isSupabaseConfigured } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useIsGM } from '../../../store/user';

export function useCodexAccess(roomCode: string) {
  const user = useAuthStore(state => state.user);
  const localGM = useIsGM();
  // Permissão padrão liberada para criadores/mestres da mesa local
  const [canEdit, setCanEdit] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured || !user?.id || !roomCode) {
      if (active) setCanEdit(true);
      return () => { active = false; };
    }

    (async () => {
      setIsLoading(true);
      try {
        const campaigns = await getCampaigns(user.id);
        const campaign = campaigns.find(item => item.room_code === roomCode || item.id === roomCode);
        if (!campaign) {
          if (active) setCanEdit(true);
          return;
        }
        const members = await getCampaignMembers(campaign.id);
        const isOwner = campaign.owner_id === user.id;
        const isGM = members.some(member => member.user_id === user.id && member.role === 'gm');
        if (active) setCanEdit(isOwner || isGM || localGM);
      } catch {
        if (active) setCanEdit(true);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => { active = false; };
  }, [roomCode, user?.id, localGM]);

  return { canEdit, isLoading };
}

