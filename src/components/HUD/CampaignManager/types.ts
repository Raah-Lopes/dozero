import type { CampaignData, CampaignArc, CampaignSession, CampaignQuest, QuestLootItem } from '../../../store';

export interface CampaignTabProps {
  campaign: CampaignData;
  updateCampaign: (id: string, updates: Partial<CampaignData>) => void;
  // Wiki context
  wikiIndex?: any[];
  setLinkingId: (id: string | null) => void;
  linkingId: string | null;
  // Shared helpers
  }
