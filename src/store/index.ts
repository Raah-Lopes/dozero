export * from '../services/yjs';
export * from './tokens';
export * from './chat';
export * from './backgrounds';
export * from './combat';
export * from './clocks';
export * from './map';
export * from './theater';
export * from './campaign';
export * from './wiki';
export * from './world';
export * from './mapTexts';
export * from './props';

export interface LoreEntry {
  id: string;
  title: string;
  content: string;
}

export const useStore = () => ({
  combatLog: [],
  addLoreEntry: (entry: LoreEntry) => {}
});