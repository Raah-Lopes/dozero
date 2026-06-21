import { state } from '../services/yjs';

export interface WikiConfig {
  repoUrl: string; // ex: 'Raah-Lopes/rpg-obsidian-mestre-guiado'
  branch: string;  // ex: 'main'
  token: string;   // Optional personal access token
}

export function getWikiConfig(): WikiConfig {
  const current = state.wikiConfig.get('global');
  if (current) {
    const config = current as WikiConfig;
    if (config.repoUrl === 'D:/wikidozero') {
      config.repoUrl = 'D:/DOZERO/wikidozero';
      // Avoid infinite loop / side effects by just returning the corrected value
      // User can save again in settings later
    }
    return config;
  }
  return {
    repoUrl: 'D:/DOZERO/wikidozero',
    branch: 'main',
    token: ''
  };
}

export function updateWikiConfig(config: Partial<WikiConfig>) {
  const current = getWikiConfig();
  state.wikiConfig.set('global', { ...current, ...config });
}
