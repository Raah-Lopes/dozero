// Definições centrais de tipos para o projeto DOZERO

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface TokenData {
  id: string;
  name: string;
  type: 'npc' | 'player' | 'enemy';
  hp?: { current: number; max: number };
  ac?: number;
  initiative?: number;
  [key: string]: any; // Permitido apenas para dados dinâmicos específicos de RPG
}

export interface WikiEntry {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  lastModified: number;
  author?: string;
}

export interface CombatLogEntry {
  id: string;
  message: string;
  type: 'damage' | 'heal' | 'info' | 'roll' | 'turn';
  timestamp: number;
  source?: string;
}

export interface WindowState {
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export interface AppState {
  activeTab: string;
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
}

export type WidgetType = 'chat' | 'combat' | 'wiki' | 'lore' | 'notes';

export interface YjsDocState {
  awareness: any; // Tipagem específica do YjsAwareness
  doc: any;       // Tipagem específica do YjsDoc
}
