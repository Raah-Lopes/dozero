export type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface RollResult {
  logMsg: string;
  pushGlobal: boolean;
  isSuccess: boolean;
  isCritical: boolean;
}

export interface RulesEngineDefinition {
  id: string;
  name: string;
  description: string;
  author: string;
  icon: string;
  
  /** The default die selected in the DiceRollerWidget */
  defaultDie: DieType;
  
  /** Logic for rolling a raw attribute */
  rollAttribute: (attrName: string, attrValue: number, charName: string, cd: number) => RollResult;
  
  /** Logic for rolling a specific skill */
  rollSkill: (skillName: string, skillValue: number, charName: string, cd: number) => RollResult;
}

// ── Registry ─────────────────────────────────────────────────────────────

import { dnd5eEngine } from './dnd_5e';
import { wodV5Engine } from './wod_v5';
import { fateEngine } from './fate';
import { d100Engine } from './d100';

export const RULES_ENGINES: RulesEngineDefinition[] = [
  dnd5eEngine,
  wodV5Engine,
  fateEngine,
  d100Engine,
];

export const DEFAULT_RULES_ENGINE_ID = 'dnd_5e';
