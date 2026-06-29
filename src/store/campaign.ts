import { state } from '../services/yjs';

export interface CampaignArc {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'active' | 'completed';
  filePath?: string;
}

export interface QuestLootItem {
  id: string;
  name: string;
  type: 'arma' | 'poder' | 'pocao' | 'maldicao' | 'objeto_campanha';
  description: string;
  quantidade?: number;
  efeito?: string;
}

export interface QuestObjective {
  id: string;
  text: string;
  done: boolean;
}

export interface CampaignQuest {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'abandoned' | 'failed' | 'completed';
  type: 'main' | 'side';
  coverUrl?: string;
  wikiLinks?: string[];
  objectives?: QuestObjective[];
  loot: QuestLootItem[];
  filePath?: string;
}

export interface CampaignSession {
  id: string;
  date: string;
  summary: string;
  status: 'upcoming' | 'completed';
  filePath?: string;
}

export interface CampaignData {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  status: 'active' | 'hiatus' | 'completed';
  folderPath?: string;
  overviewPath?: string;
  arcs: CampaignArc[];
  sessions: CampaignSession[];
  quests?: CampaignQuest[];
}

export function createCampaign(campaign: Omit<CampaignData, 'id'>) {
  const id = `campaign_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  state.campaigns.set(id, { ...campaign, id });
}

export function updateCampaign(id: string, updates: Partial<CampaignData>) {
  const c = state.campaigns.get(id) as CampaignData | undefined;
  if (c) {
    state.campaigns.set(id, { ...c, ...updates });
  }
}

export function deleteCampaign(id: string) {
  state.campaigns.delete(id);
}
