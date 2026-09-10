import { useEffect, useRef, useState, useCallback } from "react";
import {
  emptyWorkspace,
  loadWorkspace,
  saveWorkspace,
  SavedWorkspace,
  StoredWorkspace,
  loadRecovery,
  restoreRecovery,
  storageErrorMessage,
  WorkspaceConflictError,
} from "../utils/storage";

export function useWorkspace() {
  const [data, setData] = useState<SavedWorkspace>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Abrindo arquivo...");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [recovery, setRecovery] = useState<StoredWorkspace | null>(null);
  const [working, setWorking] = useState(false);
  const [canRetrySave, setCanRetrySave] = useState(true);
  const ownsLock = useRef(false),
    retrying = useRef(false);
  const [past, setPast] = useState<SavedWorkspace[]>([]);
  const [future, setFuture] = useState<SavedWorkspace[]>([]);
  const current = useRef(data);
  const revision = useRef(0);
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());
  const failed = useRef(false);
  const mounted = useRef(false);
  const batch = useRef({ key: "", time: 0 });
  const open = useCallback(
    async (recover: boolean | SavedWorkspace = false) => {
      if (!ownsLock.current || retrying.current) return;
      retrying.current = true;
      setWorking(true);
      setLoadError("");
      setStatus(recover ? "Recuperando arquivo..." : "Abrindo arquivo...");
      try {
        const loaded = recover
          ? await restoreRecovery(
              typeof recover === "object" ? recover : undefined,
            )
          : await loadWorkspace();
        if (!mounted.current) return;
        revision.current = loaded.revision;
        current.current = loaded;
        setData(loaded);
        setReady(true);
        setStatus("Salvo neste navegador");
        setPast([]);
        setFuture([]);
        setRecovery(null);
      } catch (e) {
        const checkpoint = await loadRecovery().catch(() => null);
        if (mounted.current) {
          setLoadError(storageErrorMessage(e));
          setRecovery(checkpoint);
          setStatus("Não foi possível abrir o arquivo local");
        }
      } finally {
        retrying.current = false;
        if (mounted.current) setWorking(false);
      }
    },
    [],
  );
  useEffect(() => {
    let release: (() => void) | undefined;
    let disposed = false;
    const controller = new AbortController();
    mounted.current = true;
    if (!navigator.locks) {
      setStatus(
        "Use Chrome ou Edge atualizados para abrir o arquivo com proteção entre abas.",
      );
      return;
    }
    setStatus(
      "Aguardando acesso ao arquivo. Se ele estiver aberto em outra aba, feche essa aba para editar aqui.",
    );
    navigator.locks
      .request(
        "dozero-workspace-editor",
        { signal: controller.signal },
        async () => {
          if (disposed) return;
          ownsLock.current = true;
          await open();
          if (disposed) {
            ownsLock.current = false;
            return;
          }
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          ownsLock.current = false;
        },
      )
      .catch(() => {});
    return () => {
      disposed = true;
      mounted.current = false;
      controller.abort();
      release?.();
    };
  }, [open]);
  const persist = useCallback((next: SavedWorkspace) => {
    pending.current++;
    setStatus("Salvando...");
    queue.current = queue.current.then(async () => {
      if (failed.current) {
        pending.current--;
        return;
      }
      try {
        revision.current = await saveWorkspace(next, revision.current);
      } catch (e) {
        failed.current = true;
        if (mounted.current) {
          setError(storageErrorMessage(e));
          setCanRetrySave(!(e instanceof WorkspaceConflictError));
          setStatus("Alterações pendentes — baixe um backup");
        }
      } finally {
        pending.current--;
        if (!pending.current && !failed.current && mounted.current)
          setStatus("Salvo neste navegador");
      }
    });
  }, []);
  const retrySave = useCallback(async () => {
    if (
      !failed.current ||
      retrying.current ||
      !ownsLock.current ||
      !canRetrySave
    )
      return;
    retrying.current = true;
    setWorking(true);
    await queue.current;
    setStatus("Tentando salvar novamente...");
    try {
      revision.current = await saveWorkspace(current.current, revision.current);
      failed.current = false;
      if (mounted.current) {
        setError("");
        setStatus("Salvo neste navegador");
      }
    } catch (e) {
      if (mounted.current) {
        setError(storageErrorMessage(e));
        setCanRetrySave(!(e instanceof WorkspaceConflictError));
        setStatus("Alterações pendentes — baixe um backup");
      }
    } finally {
      retrying.current = false;
      if (mounted.current) setWorking(false);
    }
  }, [canRetrySave]);
  const commit = useCallback(
    (change: (data: SavedWorkspace) => SavedWorkspace, key = "") => {
      if (!ready || failed.current) return;
      const old = current.current,
        next = change(old);
      if (next === old) return;
      const now = Date.now();
      if (!key || batch.current.key !== key || now - batch.current.time > 700)
        setPast((p) => [...p.slice(-39), old]);
      batch.current = { key, time: now };
      current.current = next;
      setFuture([]);
      setData(next);
      persist(next);
    },
    [ready, persist],
  );
  const undo = useCallback(() => {
    if (!past.length || failed.current) return;
    const next = past[past.length - 1],
      previous = current.current;
    setFuture((f) => [previous, ...f]);
    setPast((p) => p.slice(0, -1));
    current.current = next;
    setData(next);
    persist(next);
    batch.current = { key: "", time: 0 };
  }, [past, persist]);
  const redo = useCallback(() => {
    if (!future.length || failed.current) return;
    const next = future[0],
      previous = current.current;
    setPast((p) => [...p, previous]);
    setFuture((f) => f.slice(1));
    current.current = next;
    setData(next);
    persist(next);
    batch.current = { key: "", time: 0 };
  }, [future, persist]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (pending.current || failed.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  return {
    data,
    ready,
    status,
    error,
    loadError,
    recovery,
    working,
    canRetrySave,
    retrySave,
    retryOpen: () => open(),
    recover: () => open(true),
    recoverBackup: (backup: SavedWorkspace) => open(backup),
    commit,
    undo,
    redo,
    canUndo: !!past.length,
    canRedo: !!future.length,
  };
}
