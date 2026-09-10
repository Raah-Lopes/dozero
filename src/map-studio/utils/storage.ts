import type {
  MapProject,
  GlossaryEntry,
  MapLocation,
  MapAnnotation,
} from "../types";
import { validateWorkspace } from "./backup";

export interface TrashItem {
  id: string;
  name: string;
  deletedAt: Date;
  projectId?: string;
  kind: "project" | "location" | "annotation" | "glossary";
  value: MapProject | MapLocation | MapAnnotation | GlossaryEntry;
  entries?: GlossaryEntry[];
}
export interface SavedWorkspace {
  projects: MapProject[];
  glossary: GlossaryEntry[];
  trash: TrashItem[];
}
export interface StoredWorkspace extends SavedWorkspace {
  revision: number;
  savedAt?: string;
}
export const emptyWorkspace: SavedWorkspace = {
  projects: [],
  glossary: [],
  trash: [],
};

let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("dozero-mapas", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
    });
  }
  return database;
}

async function readRecord(key: string): Promise<any> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace"),
      request = transaction.objectStore("workspace").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("A leitura foi interrompida."));
  });
}

function normalizeStored(raw: any): StoredWorkspace {
  if (
    !raw ||
    !Array.isArray(raw.projects) ||
    (raw.glossary !== undefined && !Array.isArray(raw.glossary)) ||
    (raw.trash !== undefined && !Array.isArray(raw.trash))
  )
    throw new Error("O registro salvo está incompleto ou inválido.");
  const revision = raw.revision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new Error("A revisão do registro salvo está inválida.");
  const data = validateWorkspace({ ...emptyWorkspace, ...raw });
  const categories = [
    "geral",
    "personagem",
    "local",
    "item",
    "magia",
    "criatura",
    "organização",
    "evento",
  ];
  return {
    ...data,
    revision,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : undefined,
    glossary: data.glossary.map((e) => ({
      ...e,
      type: categories.includes(e.type) ? e.type : "local",
    })),
  };
}

export async function loadWorkspace(): Promise<StoredWorkspace> {
  const raw = await readRecord("current");
  return raw === undefined
    ? { ...emptyWorkspace, revision: 0 }
    : normalizeStored(raw);
}
export async function loadRecovery(): Promise<StoredWorkspace | null> {
  const raw = await readRecord("recovery");
  return raw === undefined ? null : normalizeStored(raw);
}

export class WorkspaceConflictError extends Error {
  constructor() {
    super(
      "Os dados mudaram em outra aba. Baixe um backup das alterações pendentes e reabra esta aba antes de importar esse backup.",
    );
    this.name = "WorkspaceConflictError";
  }
}
export function storageErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError")
    return "O espaço reservado pelo navegador acabou. As alterações continuam nesta tela. Baixe um backup, libere espaço no dispositivo e tente salvar novamente.";
  if (error instanceof WorkspaceConflictError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError")
    return "O salvamento foi interrompido. As alterações continuam nesta tela; tente salvar novamente ou baixe um backup.";
  return error instanceof Error
    ? error.message
    : "Não foi possível acessar o armazenamento. Baixe um backup antes de fechar.";
}

export async function saveWorkspace(
  data: SavedWorkspace,
  expectedRevision: number,
): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite"),
      store = transaction.objectStore("workspace");
    const request = store.get("current");
    let failure: unknown;
    request.onsuccess = () => {
      try {
        if ((request.result?.revision ?? 0) !== expectedRevision)
          throw new WorkspaceConflictError();
        // The previous valid state and the new state commit together, or neither does.
        if (request.result !== undefined) {
          normalizeStored(request.result);
          store.put(request.result, "recovery");
        }
        store.put(
          {
            ...data,
            revision: expectedRevision + 1,
            savedAt: new Date().toISOString(),
          },
          "current",
        );
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(expectedRevision + 1);
    transaction.onabort = () =>
      reject(
        failure ||
          transaction.error ||
          new DOMException("Gravação interrompida", "AbortError"),
      );
  });
}

// Called only while the editor owns the workspace lock and the main record failed to load.
export async function restoreRecovery(
  replacement?: SavedWorkspace,
): Promise<StoredWorkspace> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite"),
      store = transaction.objectStore("workspace");
    let restored: StoredWorkspace, failure: unknown;
    const current = store.get("current"),
      checkpoint = store.get("recovery");
    checkpoint.onsuccess = () => {
      try {
        restored = replacement
          ? { ...validateWorkspace(replacement), revision: 0 }
          : normalizeStored(checkpoint.result);
        if (current.result !== undefined)
          store.put(current.result, "recovery-original");
        restored = {
          ...restored,
          revision:
            Math.max(
              restored.revision,
              Number.isSafeInteger(current.result?.revision)
                ? current.result.revision
                : 0,
            ) + 1,
          savedAt: new Date().toISOString(),
        };
        store.put(restored, "current");
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(restored);
    transaction.onabort = () =>
      reject(
        failure ||
          transaction.error ||
          new DOMException("Recuperação interrompida", "AbortError"),
      );
  });
}

export async function readLocalRecords() {
  return {
    format: "dozero-local-records",
    exportedAt: new Date().toISOString(),
    current: await readRecord("current"),
    recovery: await readRecord("recovery"),
    original: await readRecord("recovery-original"),
  };
}
