import { state } from '../services/yjs';

export interface CombatCondition {
  id: string;
  name: string;
  durationTurns: number;
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value?: number;
  icon?: string;
}

export interface CombatParticipant {
  tokenId: string;
  name: string;
  initiative: number;
  imageUrl?: string;
  conditions?: CombatCondition[];
  minionHits?: number;
  minionMaxHits?: number;
  actionsRemaining?: number;
}

export function addCombatParticipant(tokenId: string, name: string, initiative: number, imageUrl?: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const existingIndex = participants.findIndex(p => p.tokenId === tokenId);
  
  let newParticipants = [...participants];
  if (existingIndex >= 0) {
    newParticipants[existingIndex].initiative = initiative;
    if (imageUrl) newParticipants[existingIndex].imageUrl = imageUrl;
  } else {
    newParticipants.push({ tokenId, name, initiative, imageUrl, conditions: [] });
  }

  // Sort descending by initiative
  newParticipants.sort((a, b) => b.initiative - a.initiative);
  
  state.combat.set('participants', newParticipants);
}

export function addConditionToParticipant(tokenId: string, condition: CombatCondition) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = [...participants];
  const idx = newParticipants.findIndex(p => p.tokenId === tokenId);
  if (idx >= 0) {
    if (!newParticipants[idx].conditions) newParticipants[idx].conditions = [];
    newParticipants[idx].conditions!.push(condition);
    state.combat.set('participants', newParticipants);
  }
}

export function removeConditionFromParticipant(tokenId: string, conditionId: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = [...participants];
  const idx = newParticipants.findIndex(p => p.tokenId === tokenId);
  if (idx >= 0 && newParticipants[idx].conditions) {
    newParticipants[idx].conditions = newParticipants[idx].conditions!.filter(c => c.id !== conditionId);
    state.combat.set('participants', newParticipants);
  }
}

export function removeCombatParticipant(tokenId: string) {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  const newParticipants = participants.filter(p => p.tokenId !== tokenId);
  state.combat.set('participants', newParticipants);
  
  // Adjust turnIndex if needed
  let turnIndex = state.combat.get('turnIndex') as number;
  if (turnIndex >= newParticipants.length && newParticipants.length > 0) {
    state.combat.set('turnIndex', 0);
  }
}

export function nextCombatTurn() {
  const participants = (state.combat.get('participants') as CombatParticipant[]) || [];
  if (participants.length === 0) return;
  
  let turnIndex = state.combat.get('turnIndex') as number;
  const currentParticipant = participants[turnIndex];

  // Process Conditions for current participant BEFORE moving to the next
  if (currentParticipant && currentParticipant.conditions && currentParticipant.conditions.length > 0) {
    let newConditions = [...currentParticipant.conditions];
    const token = state.tokens.get(currentParticipant.tokenId) as any;
    
    if (token) {
      let hpChange = 0;
      let logMessages: string[] = [];

      newConditions = newConditions.filter(cond => {
        if (cond.type === 'damage' && cond.value) {
          hpChange -= cond.value;
          logMessages.push(`💀 <b>${cond.name}</b> causou ${cond.value} de dano a ${currentParticipant.name}.`);
        } else if (cond.type === 'heal' && cond.value) {
          hpChange += cond.value;
          logMessages.push(`💚 <b>${cond.name}</b> curou ${cond.value} PV de ${currentParticipant.name}.`);
        }

        cond.durationTurns -= 1;
        if (cond.durationTurns <= 0) {
          logMessages.push(`⏳ O efeito de <b>${cond.name}</b> acabou em ${currentParticipant.name}.`);
          return false; // Remove condition
        }
        return true; // Keep condition
      });

      // Apply HP change
      if (hpChange !== 0) {
        const newHp = Math.max(0, Math.min(token.maxHp || 9999, (token.hp || 0) + hpChange));
        state.tokens.set(currentParticipant.tokenId, { ...token, hp: newHp });
      }

      // Send logs to chat
      logMessages.forEach(msg => {
        state.chat.push([{ text: msg, timestamp: Date.now(), isCritical: false, isFailure: false }]);
      });

      // Save back conditions
      const newParticipants = [...participants];
      newParticipants[turnIndex].conditions = newConditions;
      state.combat.set('participants', newParticipants);
    }
  }

  turnIndex = (turnIndex + 1) % participants.length;
  state.combat.set('turnIndex', turnIndex);

  // PPR: Dispatch turn-change event for overlay
  const nextParticipant = participants[turnIndex];
  if (nextParticipant && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ppr-turn-change', {
      detail: { name: nextParticipant.name, imageUrl: nextParticipant.imageUrl }
    }));
  }
}

export function clearCombat() {
  state.combat.set('participants', []);
  state.combat.set('turnIndex', 0);
  state.combat.set('isActive', false);
}
