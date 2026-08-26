import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import App from './App';
import { FamilyTree } from './model/tree';
import { loadSavedTree, saveTree } from './lib/utils';
import { indexeddbProvider, state } from '../../../../services/yjs';
import { loadLineageAtlas, saveLineageAtlas } from '../../../../services/lineageCloudService';
import './index.css';

type SyncState = 'loading' | 'local' | 'saving' | 'cloud';

export function LineageWidget({ onClose }: { onClose: () => void }) {
  const roomCode = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
  const [initialTree, setInitialTree] = useState<FamilyTree | null | undefined>(undefined);
  const [treeRevision, setTreeRevision] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const saveTimer = useRef<number | null>(null);
  const lastSerialized = useRef('');

  useEffect(() => {
    let active = true;
    const readSharedTree = () => {
      const raw = state.lineage.get('atlas');
      if (typeof raw !== 'string') return null;
      try {
        return FamilyTree.from(JSON.parse(raw));
      } catch {
        return null;
      }
    };

    const onSharedChange = () => {
      const shared = readSharedTree();
      if (!shared || shared.serialize() === lastSerialized.current) return;
      lastSerialized.current = shared.serialize();
      setInitialTree(shared);
      setTreeRevision((revision) => revision + 1);
      saveTree(shared, roomCode);
    };

    state.lineage.observe(onSharedChange);
    void (async () => {
      try {
        await Promise.race([
          indexeddbProvider?.whenSynced ?? Promise.resolve(),
          new Promise((resolve) => window.setTimeout(resolve, 900)),
        ]);
        let tree = readSharedTree();
        if (!tree) {
          const cloud = await loadLineageAtlas(roomCode);
          if (cloud?.data) tree = FamilyTree.from(cloud.data);
        }
        tree ??= loadSavedTree(roomCode);
        if (!active) return;
        if (tree) {
          lastSerialized.current = tree.serialize();
          state.lineage.set('atlas', lastSerialized.current);
        }
        setInitialTree(tree);
        setSyncState(tree ? 'cloud' : 'local');
      } catch (error) {
        console.warn('[Lineage] Inicialização local concluída sem nuvem:', error);
        if (active) {
          setInitialTree(loadSavedTree(roomCode));
          setSyncState('local');
        }
      }
    })();

    return () => {
      active = false;
      state.lineage.unobserve(onSharedChange);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [roomCode]);

  const handleTreeChange = useCallback((tree: FamilyTree) => {
    const serialized = tree.serialize();
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    state.lineage.set('atlas', serialized);
    saveTree(tree, roomCode);
    setSyncState('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const saved = await saveLineageAtlas(roomCode, tree.toJSON());
      setSyncState(saved ? 'cloud' : 'local');
    }, 900);
  }, [roomCode]);

  if (initialTree === undefined) {
    return (
      <div className="lineage-shell fixed inset-0 z-[10000] grid place-items-center bg-ink-950 text-parchment" style={{ pointerEvents: 'auto' }}>
        <div className="flex items-center gap-3 font-display text-sm tracking-[0.2em] text-brass-bright">
          <LoaderCircle className="animate-spin" size={20} /> Abrindo o atlas…
        </div>
      </div>
    );
  }

  const syncLabel = syncState === 'cloud'
    ? 'Salvo na nuvem'
    : syncState === 'saving'
      ? 'Salvando…'
      : 'Salvo nesta mesa';

  return (
    <section className="lineage-shell fixed inset-0 z-[10000] overflow-hidden bg-ink-950 text-parchment" style={{ pointerEvents: 'auto' }} aria-label="Linhagem — Atlas de Casas e Dinastias">
      <App
        key={treeRevision}
        roomCode={roomCode}
        initialTree={initialTree ?? undefined}
        onTreeChange={handleTreeChange}
        onClose={onClose}
        syncLabel={syncLabel}
      />
      <span className="pointer-events-none absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-900/90 px-2.5 py-1 text-[10px] text-muted shadow-lg backdrop-blur-sm lg:hidden">
        {syncState === 'cloud' ? <Cloud size={12} /> : syncState === 'saving' ? <LoaderCircle className="animate-spin" size={12} /> : <CloudOff size={12} />}
        {syncLabel}
      </span>
    </section>
  );
}
