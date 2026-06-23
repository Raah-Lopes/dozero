import { state } from '../services/yjs';
import { pushChatMessage } from './chat';

// =========================================================================
// EPHEMERAL LOCAL STATE (Not synced to other players, just for this client)
// =========================================================================
export const localState = {
  targets: new Set<string>(),
  selectedBgs: new Set<string>(),
  selectedTokens: new Set<string>(),
  selectedProps: new Set<string>(),
  activeTool: 'select' as 'select' | 'text',
  editingTextId: null as string | null,
};

export function setActiveTool(tool: 'select' | 'text') {
  localState.activeTool = tool;
  window.dispatchEvent(new Event('tool-changed'));
}

export function setEditingTextId(id: string | null) {
  localState.editingTextId = id;
  window.dispatchEvent(new Event('editing-text-changed'));
}

export function toggleTarget(tokenId: string) {
  if (localState.targets.has(tokenId)) {
    localState.targets.delete(tokenId);
  } else {
    localState.targets.add(tokenId);
  }
  window.dispatchEvent(new Event('targets-updated'));
}

export function getTargets(): string[] {
  return Array.from(localState.targets);
}

export function clearTargets() {
  localState.targets.clear();
  window.dispatchEvent(new Event('targets-updated'));
}

export function toggleTokenSelection(tokenId: string, multi: boolean) {
  if (!localState.selectedTokens) localState.selectedTokens = new Set<string>();

  if (!multi) localState.selectedTokens.clear();
  
  if (localState.selectedTokens.has(tokenId)) {
    localState.selectedTokens.delete(tokenId);
  } else {
    localState.selectedTokens.add(tokenId);
  }
  window.dispatchEvent(new Event('token-selection-updated'));
}

export function selectTokensBulk(tokenIds: string[]) {
  if (!localState.selectedTokens) localState.selectedTokens = new Set<string>();
  localState.selectedTokens.clear();
  tokenIds.forEach(id => localState.selectedTokens.add(id));
  window.dispatchEvent(new Event('token-selection-updated'));
}

export function clearTokenSelection() {
  if (!localState.selectedTokens) localState.selectedTokens = new Set<string>();
  localState.selectedTokens.clear();
  window.dispatchEvent(new Event('token-selection-updated'));
}

export function getSelectedTokens(): string[] {
  if (!localState.selectedTokens) return [];
  return Array.from(localState.selectedTokens);
}

export function togglePropSelection(propId: string, multi: boolean) {
  if (!localState.selectedProps) localState.selectedProps = new Set<string>();

  if (!multi) localState.selectedProps.clear();
  
  if (localState.selectedProps.has(propId)) {
    localState.selectedProps.delete(propId);
  } else {
    localState.selectedProps.add(propId);
  }
  window.dispatchEvent(new Event('prop-selection-updated'));
}

export function selectPropsBulk(propIds: string[]) {
  if (!localState.selectedProps) localState.selectedProps = new Set<string>();
  localState.selectedProps.clear();
  propIds.forEach(id => localState.selectedProps.add(id));
  window.dispatchEvent(new Event('prop-selection-updated'));
}

export function clearPropSelection() {
  if (!localState.selectedProps) localState.selectedProps = new Set<string>();
  localState.selectedProps.clear();
  window.dispatchEvent(new Event('prop-selection-updated'));
}

export function getSelectedProps(): string[] {
  if (!localState.selectedProps) return [];
  return Array.from(localState.selectedProps);
}

export function applyDamageToToken(tokenId: string, damage: number) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    const newHp = Math.max(0, token.hp - damage);
    state.tokens.set(tokenId, { ...token, hp: newHp });
  }
}

export function addTokenFromMarkdown(tokenData: any) {
  const id = `token_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  state.tokens.set(id, {
    id,
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    ...tokenData
  });
  pushChatMessage(`⚡ <b>${tokenData.name || 'Entidade Desconhecida'}</b> foi forjado(a) e adicionado(a) à mesa!`, true, false);
}

export function updateTokenProps(tokenId: string, props: Partial<any>) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    state.tokens.set(tokenId, { ...token, ...props });
  }
}

export function updateTokenPosition(tokenId: string, x: number, y: number) {
  const token = state.tokens.get(tokenId) as any;
  if (token) {
    if (token.x !== x || token.y !== y) {
      state.tokens.set(tokenId, { ...token, x, y });
    }
  }
}
