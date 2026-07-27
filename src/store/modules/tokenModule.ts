/**
 * CENTRALIZED TOKEN MANAGEMENT MODULE
 * 
 * Single source of truth for all token-related operations.
 * Replaces scattered functions from tokens.ts with a unified namespace API.
 * 
 * Usage:
 *   import { Tokens } from '../../store/modules/tokenModule';
 *   
 *   Tokens.getAll()
 *   Tokens.getById(tokenId)
 *   Tokens.create({ name: 'NPC', hp: 20 })
 *   Tokens.applyDamage(tokenId, 5)
 */

import { state } from '../../services/yjs';
import { pushChatMessage } from '../chat';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Core token data structure
 * Synced via Yjs to all connected players
 */
export interface Token {
  id: string;
  name: string;
  type?: 'npc' | 'player' | 'enemy' | 'prop';
  
  // Position on canvas
  x: number;
  y: number;
  
  // Stats
  hp: number;
  maxHp: number;
  mana?: number;
  maxMana?: number;
  defesa?: number;
  
  // Visual
  imageUrl?: string;
  borderColor?: string;
  tokenShape?: 'circle' | 'square' | 'standee';
  sizeScale?: number;
  showName?: boolean;
  hpBarMode?: 'always' | 'hover' | 'never';
  
  // Visibility & Vision
  visionRadius?: number;
  hasVision?: boolean;
  
  // Status & Effects
  status_efeitos?: string[];
  
  // Wiki Integration
  wikiPath?: string;
  caminhoArquivo?: string;
  
  // Server-side only
  isPlayer?: boolean;
  
  // Extensible for RPG systems
  [key: string]: any;
}

/**
 * Ephemeral local state (NOT synced across network)
 * Stored in browser memory only
 */
export interface TokenLocalState {
  selected: Set<string>;      // Currently selected tokens
  targets: Set<string>;       // Tokens marked as targets
}

// ============================================================================
// LOCAL STATE
// ============================================================================

export const localState: TokenLocalState = {
  selected: new Set(),
  targets: new Set(),
};

// ============================================================================
// PUBLIC API - NAMESPACE PATTERN
// ============================================================================

/**
 * Primary interface for all token operations
 * Organized by use case: getters, mutations, bulk operations
 */
export const Tokens = {
  // ========================================================================
  // GETTERS - Pure functions that don't modify state
  // ========================================================================

  /**
   * Get all tokens currently in play
   * @returns Array of all tokens from Yjs store
   */
  getAll(): Token[] {
    return Array.from(state.tokens.values());
  },

  /**
   * Get a specific token by ID
   * @param id - Token ID
   * @returns Token or undefined if not found
   */
  getById(id: string): Token | undefined {
    return state.tokens.get(id) as Token | undefined;
  },

  /**
   * Get all selected tokens
   * @returns Array of tokens that are currently selected
   */
  getSelected(): Token[] {
    return Array.from(localState.selected)
      .map(id => this.getById(id))
      .filter(Boolean) as Token[];
  },

  /**
   * Get IDs of selected tokens
   * @returns Array of selected token IDs
   */
  getSelectedIds(): string[] {
    return Array.from(localState.selected);
  },

  /**
   * Get all tokens marked as targets
   * @returns Array of target token IDs
   */
  getTargets(): string[] {
    return Array.from(localState.targets);
  },

  /**
   * Get tokens with vision capability
   * @returns Array of tokens that can see (visionRadius > 0)
   */
  getVisionSources(): Token[] {
    return this.getAll().filter(t => t.hasVision !== false && t.visionRadius);
  },

  /**
   * Get tokens that are visible on canvas
   * (not hidden off-screen at -9999,-9999)
   * @returns Visible tokens
   */
  getVisible(): Token[] {
    return this.getAll().filter(t => t.x > -1000 && t.y > -1000);
  },

  /**
   * Check if a token is currently selected
   * @param id - Token ID
   */
  isSelected(id: string): boolean {
    return localState.selected.has(id);
  },

  /**
   * Check if a token is currently targeted
   * @param id - Token ID
   */
  isTarget(id: string): boolean {
    return localState.targets.has(id);
  },

  // ========================================================================
  // MUTATIONS - Functions that modify state
  // ========================================================================

  /**
   * Create a new token and add to game
   * @param data - Partial token data (will use defaults for missing fields)
   * @returns Created token
   */
  create(data: Partial<Token>): Token {
    const id = `token_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const token: Token = {
      id,
      name: data.name || 'Novo Token',
      type: data.type || 'npc',
      hp: data.hp ?? 10,
      maxHp: data.maxHp ?? 10,
      x: data.x ?? window.innerWidth / 2,
      y: data.y ?? window.innerHeight / 2,
      visionRadius: data.visionRadius,
      hasVision: data.hasVision !== false,
      imageUrl: data.imageUrl,
      ...data,
    };
    state.tokens.set(id, token);
    
    pushChatMessage(
      `⚡ <b>${token.name}</b> foi adicionado(a) à mesa!`,
      true,
      false
    );
    
    return token;
  },

  /**
   * Update token properties (partial update)
   * @param id - Token ID
   * @param props - Properties to update
   */
  update(id: string, props: Partial<Token>): void {
    const token = this.getById(id);
    if (!token) {
      console.warn(`[Tokens] Token ${id} not found`);
      return;
    }
    state.tokens.set(id, { ...token, ...props });
  },

  /**
   * Move token to new position
   * @param id - Token ID
   * @param x - New X coordinate
   * @param y - New Y coordinate
   */
  move(id: string, x: number, y: number): void {
    const token = this.getById(id);
    if (token && (token.x !== x || token.y !== y)) {
      this.update(id, { x, y });
    }
  },

  /**
   * Apply damage to a token
   * Updates HP and triggers chat message if fatal
   * @param id - Token ID
   * @param amount - Damage amount (positive number)
   */
  applyDamage(id: string, amount: number): void {
    const token = this.getById(id);
    if (!token) return;

    const newHp = Math.max(0, token.hp - amount);
    this.update(id, { hp: newHp });

    // Emit chat feedback
    if (newHp === 0) {
      pushChatMessage(
        `💀 <b>${token.name}</b> foi derrotado(a)!`,
        false,
        true // isFailure style
      );
    } else if (amount > 0) {
      pushChatMessage(
        `❤️ <b>${token.name}</b> sofreu ${amount} de dano! (${newHp}/${token.maxHp} HP)`,
        false,
        false
      );
    }
  },

  /**
   * Heal a token
   * @param id - Token ID
   * @param amount - Healing amount (positive number)
   */
  heal(id: string, amount: number): void {
    const token = this.getById(id);
    if (!token) return;

    const newHp = Math.min(token.maxHp, token.hp + amount);
    const actualHealed = newHp - token.hp;
    this.update(id, { hp: newHp });

    if (actualHealed > 0) {
      pushChatMessage(
        `💚 <b>${token.name}</b> recuperou ${actualHealed} HP! (${newHp}/${token.maxHp})`,
        true,
        false // isCritical style
      );
    }
  },

  /**
   * Delete token from game
   * Removes from all selections/targets
   * @param id - Token ID
   */
  delete(id: string): void {
    state.tokens.delete(id);
    localState.selected.delete(id);
    localState.targets.delete(id);
    
    window.dispatchEvent(new Event('token-selection-updated'));
    window.dispatchEvent(new Event('targets-updated'));
  },

  // ========================================================================
  // SELECTION MANAGEMENT
  // ========================================================================

  /**
   * Toggle selection of a token
   * @param id - Token ID
   * @param multi - If true, add to existing selection. If false, replace selection.
   */
  toggleSelected(id: string, multi: boolean = false): void {
    if (!multi) {
      localState.selected.clear();
    }

    if (localState.selected.has(id)) {
      localState.selected.delete(id);
    } else {
      localState.selected.add(id);
    }

    window.dispatchEvent(new Event('token-selection-updated'));
  },

  /**
   * Select multiple tokens at once
   * Clears previous selection
   * @param ids - Array of token IDs to select
   */
  selectBulk(ids: string[]): void {
    localState.selected.clear();
    ids.forEach(id => localState.selected.add(id));
    window.dispatchEvent(new Event('token-selection-updated'));
  },

  /**
   * Clear all selections
   */
  clearSelection(): void {
    localState.selected.clear();
    window.dispatchEvent(new Event('token-selection-updated'));
  },

  // ========================================================================
  // TARGET MANAGEMENT
  // ========================================================================

  /**
   * Toggle token as target
   * @param id - Token ID
   */
  toggleTarget(id: string): void {
    if (localState.targets.has(id)) {
      localState.targets.delete(id);
    } else {
      localState.targets.add(id);
    }
    window.dispatchEvent(new Event('targets-updated'));
  },

  /**
   * Add token to targets
   * @param id - Token ID
   */
  addTarget(id: string): void {
    localState.targets.add(id);
    window.dispatchEvent(new Event('targets-updated'));
  },

  /**
   * Remove token from targets
   * @param id - Token ID
   */
  removeTarget(id: string): void {
    localState.targets.delete(id);
    window.dispatchEvent(new Event('targets-updated'));
  },

  /**
   * Set targets to specific list
   * Clears previous targets
   * @param ids - Array of token IDs to target
   */
  setTargets(ids: string[]): void {
    localState.targets.clear();
    ids.forEach(id => localState.targets.add(id));
    window.dispatchEvent(new Event('targets-updated'));
  },

  /**
   * Clear all targets
   */
  clearTargets(): void {
    localState.targets.clear();
    window.dispatchEvent(new Event('targets-updated'));
  },

  // ========================================================================
  // VISIBILITY & POSITIONING
  // ========================================================================

  /**
   * Hide token (move off-screen)
   * @param id - Token ID
   */
  hide(id: string): void {
    this.update(id, { x: -9999, y: -9999 });
  },

  /**
   * Show token (move to center of screen)
   * @param id - Token ID
   */
  show(id: string): void {
    this.update(id, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  },

  /**
   * Toggle visibility of a token
   * @param id - Token ID
   */
  toggleVisibility(id: string): void {
    const token = this.getById(id);
    if (!token) return;

    const isVisible = token.x > -1000 && token.y > -1000;
    if (isVisible) {
      this.hide(id);
    } else {
      this.show(id);
    }
  },

  // ========================================================================
  // STATUS & EFFECTS
  // ========================================================================

  /**
   * Add a status effect to a token
   * @param id - Token ID
   * @param effect - Effect name (e.g., 'queimado', 'congelado', 'envenenado')
   */
  addEffect(id: string, effect: string): void {
    const token = this.getById(id);
    if (!token) return;

    const effects = token.status_efeitos || [];
    if (!effects.includes(effect)) {
      effects.push(effect);
      this.update(id, { status_efeitos: effects });
    }
  },

  /**
   * Remove a status effect from a token
   * @param id - Token ID
   * @param effect - Effect name
   */
  removeEffect(id: string, effect: string): void {
    const token = this.getById(id);
    if (!token) return;

    const effects = (token.status_efeitos || []).filter(e => e !== effect);
    this.update(id, { status_efeitos: effects });
  },

  /**
   * Toggle a status effect on a token
   * @param id - Token ID
   * @param effect - Effect name
   */
  toggleEffect(id: string, effect: string): void {
    const token = this.getById(id);
    if (!token) return;

    const effects = token.status_efeitos || [];
    if (effects.includes(effect)) {
      this.removeEffect(id, effect);
    } else {
      this.addEffect(id, effect);
    }
  },

  /**
   * Clear all effects from a token
   * @param id - Token ID
   */
  clearEffects(id: string): void {
    this.update(id, { status_efeitos: [] });
  },

  // ========================================================================
  // CLONE & DUPLICATE
  // ========================================================================

  /**
   * Clone a token with a new ID and slightly offset position
   * @param id - Source token ID
   * @param offset - Position offset (default: 35 pixels diagonal)
   * @returns New token
   */
  clone(id: string, offset: number = 35): Token | undefined {
    const source = this.getById(id);
    if (!source) return undefined;

    // Auto-increment name if it ends with a number
    let newName = source.name;
    const match = source.name.match(/\s+(\d+)$/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      newName = source.name.replace(/\s+(\d+)$/, ` ${num}`);
    } else {
      newName = `${source.name} 2`;
    }

    return this.create({
      ...source,
      name: newName,
      x: source.x + offset,
      y: source.y + offset,
    });
  },

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  /**
   * Apply damage to multiple tokens
   * @param ids - Array of token IDs
   * @param amount - Damage amount
   */
  applyDamageToMultiple(ids: string[], amount: number): void {
    ids.forEach(id => this.applyDamage(id, amount));
  },

  /**
   * Heal multiple tokens
   * @param ids - Array of token IDs
   * @param amount - Healing amount
   */
  healMultiple(ids: string[], amount: number): void {
    ids.forEach(id => this.heal(id, amount));
  },

  /**
   * Add effect to multiple tokens
   * @param ids - Array of token IDs
   * @param effect - Effect name
   */
  addEffectToMultiple(ids: string[], effect: string): void {
    ids.forEach(id => this.addEffect(id, effect));
  },

  /**
   * Remove effect from multiple tokens
   * @param ids - Array of token IDs
   * @param effect - Effect name
   */
  removeEffectFromMultiple(ids: string[], effect: string): void {
    ids.forEach(id => this.removeEffect(id, effect));
  },

  // ========================================================================
  // BATCH VISIBILITY
  // ========================================================================

  /**
   * Hide multiple tokens
   * @param ids - Array of token IDs
   */
  hideMultiple(ids: string[]): void {
    ids.forEach(id => this.hide(id));
  },

  /**
   * Show multiple tokens
   * @param ids - Array of token IDs
   */
  showMultiple(ids: string[]): void {
    ids.forEach(id => this.show(id));
  },

  /**
   * Delete multiple tokens
   * @param ids - Array of token IDs
   */
  deleteMultiple(ids: string[]): void {
    ids.forEach(id => this.delete(id));
  },
};

// ============================================================================
// EVENT EMITTERS (for React components)
// ============================================================================

/**
 * Subscribe to token selection changes
 * @example
 *   useEffect(() => {
 *     const handler = () => setSelected(Tokens.getSelected());
 *     window.addEventListener('token-selection-updated', handler);
 *     return () => window.removeEventListener('token-selection-updated', handler);
 *   }, []);
 */
export function onTokenSelectionChanged(callback: () => void): () => void {
  window.addEventListener('token-selection-updated', callback);
  return () => window.removeEventListener('token-selection-updated', callback);
}

/**
 * Subscribe to target changes
 */
export function onTargetsChanged(callback: () => void): () => void {
  window.addEventListener('targets-updated', callback);
  return () => window.removeEventListener('targets-updated', callback);
}

/**
 * Subscribe to tokens added/removed/updated
 * (automatic Yjs observer)
 */
export function onTokensChanged(callback: () => void): () => void {
  state.tokens.observe(callback);
  return () => state.tokens.unobserve(callback);
}
