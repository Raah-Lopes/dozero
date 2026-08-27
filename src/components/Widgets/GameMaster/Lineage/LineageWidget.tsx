import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import App from './App';
import { FamilyTree } from './model/tree';
import { loadSavedTree, saveTree } from './lib/utils';
import { state } from '../../../../services/yjs';
import { loadLineageAtlas, saveLineageAtlas } from '../../../../services/lineageCloudService';
import './index.css';

type SyncState = 'loading' | 'local' | 'saving' | 'cloud';

export function LineageWidget({ onClose }: { onClose: () => void }) {
  const roomCode = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';

  // Carrega instantaneamente do Yjs ou do localStorage (0ms de espera)
  const [initialTree, setInitialTree] = useState<FamilyTree | null>(() => {
    const raw = state.lineage.get('atlas');
    if (typeof raw === 'string') {
      try {
        return FamilyTree.from(JSON.parse(raw));
      } catch {}
    }
    const local = loadSavedTree(roomCode);
    if (local) return local;
    return null;
  });

  const [syncState, setSyncState] = useState<SyncState>(initialTree ? 'local' : 'loading');
  const saveTimer = useRef<number | null>(null);
  const lastSerialized = useRef(initialTree ? initialTree.serialize() : '');
  const isLocalUpdate = useRef(false);

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
      if (isLocalUpdate.current) return;
      const shared = readSharedTree();
      if (!shared) return;
      const serialized = shared.serialize();
      if (serialized === lastSerialized.current) return;
      lastSerialized.current = serialized;
      setInitialTree(shared);
      saveTree(shared, roomCode);
    };

    state.lineage.observe(onSharedChange);

    // Sincronização em segundo plano (não-bloqueante) com a nuvem/IndexedDB
    void (async () => {
      try {
        let tree = readSharedTree();
        if (!tree) {
          const cloud = await loadLineageAtlas(roomCode).catch(() => null);
          if (cloud?.data) tree = FamilyTree.from(cloud.data);
        }
        tree ??= loadSavedTree(roomCode);
        if (!active) return;
        if (tree) {
          const serialized = tree.serialize();
          if (serialized !== lastSerialized.current) {
            lastSerialized.current = serialized;
            state.lineage.set('atlas', serialized);
            setInitialTree(tree);
          }
          setSyncState('cloud');
        } else {
          setSyncState('local');
        }
      } catch (error) {
        if (active) setSyncState('local');
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

    isLocalUpdate.current = true;
    try {
      state.lineage.set('atlas', serialized);
    } finally {
      setTimeout(() => { isLocalUpdate.current = false; }, 50);
    }

    saveTree(tree, roomCode);
    setSyncState('saving');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const saved = await saveLineageAtlas(roomCode, tree.toJSON()).catch(() => false);
      setSyncState(saved ? 'cloud' : 'local');
    }, 1500);
  }, [roomCode]);

  const syncLabel = syncState === 'cloud'
    ? 'Salvo na nuvem'
    : syncState === 'saving'
      ? 'Salvando…'
      : 'Salvo nesta mesa';

  return (
    <section className="lineage-shell fixed inset-0 z-[10000] overflow-hidden bg-ink-950 text-parchment" style={{ pointerEvents: 'auto' }} aria-label="Linhagem — Atlas de Casas e Dinastias">
      <App
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
