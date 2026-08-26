import { useCallback, useEffect, useState } from 'react';
import { indexeddbProvider, state } from '../../../services/yjs';
import { createEmptyCodex, normalizeCodex, type CodexDocument } from './codexModel';

const CODEX_KEY = '__codex_v1__';

export function useCampaignCodex() {
  const [document, setDocument] = useState<CodexDocument>(() => normalizeCodex(state.wiki.get(CODEX_KEY)));

  useEffect(() => {
    const read = () => setDocument(normalizeCodex(state.wiki.get(CODEX_KEY)));
    state.wiki.observe(read);
    let cancelled = false;
    const initialize = async () => {
      await indexeddbProvider?.whenSynced;
      if (cancelled) return;
      if (!state.wiki.has(CODEX_KEY)) state.wiki.set(CODEX_KEY, createEmptyCodex());
      read();
    };
    void initialize();
    return () => { cancelled = true; state.wiki.unobserve(read); };
  }, []);

  const update = useCallback((recipe: (current: CodexDocument) => CodexDocument) => {
    const current = normalizeCodex(state.wiki.get(CODEX_KEY));
    state.wiki.set(CODEX_KEY, { ...recipe(current), updatedAt: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent('codex-updated'));
  }, []);

  return { document, update };
}
