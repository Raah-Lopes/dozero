import { useState, useCallback, useEffect } from "react";
import {
  MapProject,
  MapLocation,
  MapAnnotation,
  GlossaryEntry,
  Tool,
} from "./types";
import { useWorkspace } from "./hooks/useWorkspace";
import { TrashItem, readLocalRecords } from "./utils/storage";
import {
  exportBackup,
  parseBackup,
  remapBackup,
  downloadBlob,
} from "./utils/backup";
import StoragePanel from "./components/StoragePanel";
import Sidebar from "./components/Sidebar";
import MapEditor from "./components/MapEditor";
import Toolbar from "./components/Toolbar";
import Glossary from "./components/Glossary";
import ProceduralGenerator from "./components/ProceduralGenerator";
import ExportPanel from "./components/ExportPanel";
import ProjectManager from "./components/ProjectManager";
import { Compass, Undo2, Redo2, ArrowLeft, Grid3X3, Loader2 } from "lucide-react";
import {
  emptyLocationFilters,
  matchesLocation,
  type LocationFilters,
} from "./utils/locationFilters";
import SecondaryToolbar from "./components/SecondaryToolbar";
import HelpOverlay from "./components/HelpOverlay";
import { useToast } from "./components/ToastProvider";

type View =
  "projects" | "editor" | "procedural" | "glossary" | "export" | "trash";
const uid = () => crypto.randomUUID();
interface MapStudioProps {
  onBackToVtt?: () => void;
  onInsertOnGrid?: (project: MapProject) => Promise<void>;
}

export default function App({ onBackToVtt, onInsertOnGrid }: MapStudioProps) {
  const workspace = useWorkspace();
  const { data, commit, undo, redo } = workspace;
  const { projects, glossary, trash } = data;
  const addToast = useToast();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>("projects");
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [insertingOnGrid, setInsertingOnGrid] = useState(false);

  const onZoomIn = () =>
    setZoomLevel((z) => Math.min(Number((z + 0.1).toFixed(1)), 3));
  const onZoomOut = () =>
    setZoomLevel((z) => Math.max(Number((z - 0.1).toFixed(1)), 0.5));

  useEffect(() => {
    if (workspace.error) {
      addToast(workspace.error, "error");
    }
  }, [workspace.error, addToast]);

  useEffect(() => {
    const handleF1 = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleF1);
    return () => window.removeEventListener("keydown", handleF1);
  }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.innerWidth < 1024,
  );
  const [locationFilters, setLocationFilters] =
    useState<LocationFilters>(emptyLocationFilters);
  const changeLocationFilters = (filters: LocationFilters) => {
    setLocationFilters(filters);
    const selected = activeProject?.locations.find(
      (l) => l.id === selectedLocationId,
    );
    if (selected && !matchesLocation(selected, filters)) {
      setSelectedLocationId(null);
      setFocusLocation(undefined);
    }
  };
  const [focusLocation, setFocusLocation] = useState<{
    id: string;
    request: number;
  }>();
  const locate = (id: string | null) => {
    if (id) setSidebarCollapsed(false);
    const target = activeProject?.locations.find((l) => l.id === id);
    if (target && !matchesLocation(target, locationFilters)) {
      setLocationFilters(emptyLocationFilters);
      setNotice("Filtros limpos para localizar " + target.name + ".");
    }
    setSelectedLocationId(id);
    setFocusLocation(id ? { id, request: performance.now() } : undefined);
  };
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  useEffect(() => {
    const selected = activeProject?.locations.find(
      (l) => l.id === selectedLocationId,
    );
    if (selected && !matchesLocation(selected, locationFilters))
      setSelectedLocationId(null);
  }, [activeProject?.locations, selectedLocationId, locationFilters]);
  useEffect(() => {
    setLocationFilters(emptyLocationFilters);
  }, [activeProjectId]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const openProject = (id: string) => {
    setActiveProjectId(id);
    setSelectedLocationId(null);
    setFocusLocation(undefined);
    setCurrentView("editor");
  };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input,textarea,select") ||
          event.target.isContentEditable)
      )
        return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          event.shiftKey ? redo() : undo();
        } else if (event.key.toLowerCase() === "y") {
          event.preventDefault();
          redo();
        }
        return;
      }
      const keys: Record<string, Tool> = {
        v: "select",
        h: "pan",
        l: "addLocation",
        t: "addText",
        d: "draw",
        n: "addLine",
        a: "addArrow",
        r: "addRectangle",
        c: "addCircle",
      };
      if (currentView === "editor" && keys[event.key.toLowerCase()])
        setActiveTool(keys[event.key.toLowerCase()]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, currentView]);
  const updateProject = useCallback(
    (id: string, updates: Partial<MapProject>) =>
      commit(
        (d) => ({
          ...d,
          projects: d.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p,
          ),
        }),
        Object.keys(updates).every((k) => ["name", "description"].includes(k))
          ? "project:" + id
          : "",
      ),
    [commit],
  );
  const createProject = useCallback(
    (name: string, description: string, extra: Partial<MapProject> = {}) => {
      const p: MapProject = {
        id: uid(),
        name,
        description,
        imageUrl: null,
        imageWidth: 2000,
        imageHeight: 1500,
        locations: [],
        annotations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        style: "fantasy",
        gridEnabled: false,
        gridSize: 50,
        ...extra,
      };
      commit((d) => ({
        ...d,
        projects: [...d.projects, p],
        glossary: [
          ...d.glossary,
          ...p.locations.map((l) => ({
            id: uid(),
            name: l.name,
            description: l.description,
            type: "local",
            tags: l.tags,
            mapId: p.id,
            locationId: l.id,
          })),
        ],
      }));
      setActiveProjectId(p.id);
      setSelectedLocationId(null);
      setCurrentView("editor");
      return p;
    },
    [commit],
  );
  const deleteProject = (id: string) =>
    commit((d) => {
      const p = d.projects.find((p) => p.id === id);
      if (!p) return d;
      return {
        ...d,
        projects: d.projects.filter((p) => p.id !== id),
        glossary: d.glossary.filter((e) => e.mapId !== id),
        trash: [
          ...d.trash,
          {
            id: uid(),
            kind: "project",
            name: p.name,
            deletedAt: new Date(),
            value: p,
            entries: d.glossary.filter((e) => e.mapId === id),
          },
        ],
      };
    });
  const addLocation = (location: MapLocation) => {
    if (!activeProject) return;
    if (!matchesLocation(location, locationFilters)) {
      setLocationFilters(emptyLocationFilters);
      setNotice("Filtros limpos para mostrar o novo local.");
    }
    commit((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              locations: [...p.locations, location],
              updatedAt: new Date(),
            }
          : p,
      ),
      glossary: [
        ...d.glossary,
        {
          id: uid(),
          name: location.name,
          description: location.description,
          type: "local",
          tags: location.tags,
          mapId: activeProject.id,
          locationId: location.id,
        },
      ],
    }));
  };
  const updateLocation = (id: string, updates: Partial<MapLocation>) =>
    commit(
      (d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id === activeProjectId
            ? {
                ...p,
                locations: p.locations.map((l) =>
                  l.id === id ? { ...l, ...updates } : l,
                ),
                updatedAt: new Date(),
              }
            : p,
        ),
        glossary: d.glossary.map((e) =>
          e.mapId === activeProjectId && e.locationId === id
            ? {
                ...e,
                ...(updates.name !== undefined ? { name: updates.name } : {}),
                ...(updates.description !== undefined
                  ? { description: updates.description }
                  : {}),
              }
            : e,
        ),
      }),
      Object.keys(updates).every((key) =>
        ["name", "description", "notes", "tags"].includes(key),
      )
        ? "location:" + id
        : "",
    );
  const deleteLocation = (id: string) =>
    commit((d) => {
      const p = d.projects.find((p) => p.id === activeProjectId),
        l = p?.locations.find((l) => l.id === id);
      if (!p || !l) return d;
      return {
        ...d,
        projects: d.projects.map((x) =>
          x.id === p.id
            ? { ...x, locations: x.locations.filter((l) => l.id !== id) }
            : x,
        ),
        glossary: d.glossary.filter((e) => e.locationId !== id),
        trash: [
          ...d.trash,
          {
            id: uid(),
            kind: "location",
            name: l.name,
            deletedAt: new Date(),
            value: l,
            projectId: p.id,
            entries: d.glossary.filter((e) => e.locationId === id),
          },
        ],
      };
    });
  const addAnnotation = (annotation: MapAnnotation) =>
    commit((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              annotations: [...p.annotations, annotation],
              updatedAt: new Date(),
            }
          : p,
      ),
    }));
  const deleteAnnotation = (id: string) =>
    commit((d) => {
      const p = d.projects.find((p) => p.id === activeProjectId),
        a = p?.annotations.find((a) => a.id === id);
      if (!p || !a) return d;
      return {
        ...d,
        projects: d.projects.map((x) =>
          x.id === p.id
            ? { ...x, annotations: x.annotations.filter((a) => a.id !== id) }
            : x,
        ),
        trash: [
          ...d.trash,
          {
            id: uid(),
            kind: "annotation",
            name: a.text || a.type,
            deletedAt: new Date(),
            value: a,
            projectId: p.id,
          },
        ],
      };
    });
  const addEntry = (e: GlossaryEntry) =>
    commit((d) => ({
      ...d,
      glossary: [...d.glossary, { ...e, mapId: activeProjectId || undefined }],
    }));
  const updateEntry = (id: string, updates: Partial<GlossaryEntry>) =>
    commit((d) => {
      const e = d.glossary.find((e) => e.id === id);
      return {
        ...d,
        glossary: d.glossary.map((e) =>
          e.id === id ? { ...e, ...updates } : e,
        ),
        projects: d.projects.map((p) =>
          p.id === e?.mapId
            ? {
                ...p,
                locations: p.locations.map((l) =>
                  l.id === e.locationId
                    ? {
                        ...l,
                        ...(updates.name !== undefined
                          ? { name: updates.name }
                          : {}),
                        ...(updates.description !== undefined
                          ? { description: updates.description }
                          : {}),
                      }
                    : l,
                ),
              }
            : p,
        ),
      };
    }, "entry:" + id);
  const deleteEntry = (id: string) =>
    commit((d) => {
      const e = d.glossary.find((e) => e.id === id);
      return !e
        ? d
        : {
            ...d,
            glossary: d.glossary.filter((e) => e.id !== id),
            trash: [
              ...d.trash,
              {
                id: uid(),
                kind: "glossary",
                name: e.name,
                deletedAt: new Date(),
                value: e,
                projectId: e.mapId,
              },
            ],
          };
    });
  const restore = (t: TrashItem) => {
    if (t.projectId && !projects.some((p) => p.id === t.projectId)) {
      setNotice("Restaure o projeto original antes de restaurar este item.");
      return;
    }
    commit((d) => ({
      ...d,
      trash: d.trash.filter((x) => x.id !== t.id),
      projects:
        t.kind === "project"
          ? [...d.projects, t.value as MapProject]
          : d.projects.map((p) =>
              p.id === t.projectId
                ? {
                    ...p,
                    locations:
                      t.kind === "location"
                        ? [...p.locations, t.value as MapLocation]
                        : p.locations,
                    annotations:
                      t.kind === "annotation"
                        ? [...p.annotations, t.value as MapAnnotation]
                        : p.annotations,
                  }
                : p,
            ),
      glossary: [
        ...d.glossary,
        ...(t.entries || []),
        ...(t.kind === "glossary" ? [t.value as GlossaryEntry] : []),
      ],
    }));
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const incoming = remapBackup(await parseBackup(file));
      commit((d) => ({
        projects: [...d.projects, ...incoming.projects],
        glossary: [...d.glossary, ...incoming.glossary],
        trash: [...d.trash, ...incoming.trash],
      }));
      setNotice(
        "Importação concluída: " +
          incoming.projects.length +
          " projeto(s), sem substituir os existentes.",
      );
    } catch (e) {
      setNotice("Não foi possível importar: " + (e as Error).message);
    }
  };
  const syncGlossary = () =>
    commit((d) => ({
      ...d,
      glossary: [
        ...d.glossary,
        ...(activeProject?.locations || [])
          .filter(
            (l) =>
              !d.glossary.some(
                (e) => e.mapId === activeProjectId && e.locationId === l.id,
              ),
          )
          .map((l) => ({
            id: uid(),
            name: l.name,
            description: l.description,
            type: "local",
            tags: l.tags,
            mapId: activeProjectId!,
            locationId: l.id,
          })),
      ],
    }));
  if (!workspace.ready)
    return (
      <div className="p-10 max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl">DOZERO · Arquivo local</h1>
        <p role="status">{workspace.status}</p>
        {workspace.loadError && (
          <>
            <p role="alert" className="text-amber-200">
              {workspace.loadError}
            </p>
            <button
              className="dz-button"
              disabled={workspace.working}
              onClick={() => void workspace.retryOpen()}
            >
              Tentar abrir novamente
            </button>
            <button
              className="dz-button ml-3"
              disabled={workspace.working}
              onClick={async () => {
                try {
                  downloadBlob(
                    new Blob([JSON.stringify(await readLocalRecords())], {
                      type: "application/json",
                    }),
                    "DOZERO-registros-locais.json",
                  );
                } catch {
                  setNotice(
                    "Não foi possível ler os registros para baixar a cópia.",
                  );
                }
              }}
            >
              Baixar cópia dos registros locais
            </button>
            {workspace.recovery && (
              <div className="border border-stone-700 rounded p-5 space-y-3">
                <h2 className="text-lg">Ponto de recuperação disponível</h2>
                <p>
                  {workspace.recovery.projects.length} projeto(s) ·{" "}
                  {workspace.recovery.glossary.length} termo(s) no Códice
                  {workspace.recovery.savedAt
                    ? " · " +
                      new Date(workspace.recovery.savedAt).toLocaleString(
                        "pt-BR",
                      )
                    : ""}
                </p>
                <p>
                  Você pode voltar a esse salvamento. Ele pode ser anterior às
                  últimas alterações. O registro que falhou será guardado
                  separadamente para recuperação posterior.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="dz-button"
                    disabled={workspace.working}
                    onClick={() =>
                      exportBackup(
                        workspace.recovery!,
                        "DOZERO-ponto-de-recuperacao",
                      )
                    }
                  >
                    Baixar backup do ponto de recuperação
                  </button>
                  <button
                    className="dz-button"
                    disabled={workspace.working}
                    onClick={() => void workspace.recover()}
                  >
                    Restaurar ponto de recuperação
                  </button>
                </div>
              </div>
            )}
            {!workspace.recovery && (
              <p>
                Nenhum ponto de recuperação válido foi encontrado. Os registros
                existentes foram mantidos.
              </p>
            )}
            <div className="border-t border-stone-700 pt-4 space-y-3">
              <p>
                Se você possui um backup JSON, pode usá-lo para recuperar o
                acervo. O arquivo escolhido substituirá o registro que não
                abriu; esse registro será guardado separadamente.
              </p>
              <label className="dz-button inline-block cursor-pointer">
                Restaurar de um backup JSON
                <input
                  className="hidden"
                  type="file"
                  accept=".json"
                  aria-label="Restaurar de um backup JSON"
                  disabled={workspace.working}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const backup = await parseBackup(file);
                      await workspace.recoverBackup(backup);
                    } catch (error) {
                      setNotice(
                        "Backup não aplicado: " + (error as Error).message,
                      );
                    }
                  }}
                />
              </label>
            </div>
            {notice && <p role="alert">{notice}</p>}
          </>
        )}
      </div>
    );
  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "#0a0806", color: "#e8dcc4" }}
    >
      <header className="flex items-center gap-4 px-5 py-3 border-b border-[#3d2e22] shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onBackToVtt}
          className="dz-button flex items-center gap-2"
          aria-label="Voltar para o VTT"
        >
          <ArrowLeft size={16} /> Voltar ao VTT
        </button>
        <span className="flex gap-2 items-center font-display text-amber-300">
          <Compass size={20} /> DOZERO
        </span>
        <nav className="flex gap-1 flex-wrap">
          {(
            [
              ["projects", "Arquivo"],
              ["editor", "Editor"],
              ["procedural", "Forja"],
              ["glossary", "Códice"],
              ["export", "Exportar"],
              ["trash", "Lixeira"],
            ] as [View, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              aria-label={label}
              onClick={() => setCurrentView(id)}
              className={
                "px-3 py-1 rounded " +
                (currentView === id
                  ? "bg-amber-900/40 text-amber-200"
                  : "text-stone-400")
              }
            >
              {label}
              {id === "trash" && trash.length ? " (" + trash.length + ")" : ""}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex gap-2">
          {activeProject && onInsertOnGrid && (
            <button
              type="button"
              className="dz-button flex items-center gap-2"
              disabled={insertingOnGrid || !!workspace.error}
              onClick={async () => {
                setInsertingOnGrid(true);
                try {
                  await onInsertOnGrid(activeProject);
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : "Não foi possível inserir o mapa no Grid.");
                  setInsertingOnGrid(false);
                }
              }}
            >
              {insertingOnGrid ? <Loader2 size={16} className="animate-spin" /> : <Grid3X3 size={16} />}
              {insertingOnGrid ? "Inserindo…" : "Inserir no Grid"}
            </button>
          )}
          <button
            aria-label="Desfazer"
            title="Desfazer (Ctrl+Z)"
            disabled={!workspace.canUndo || !!workspace.error}
            onClick={undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            aria-label="Refazer"
            title="Refazer (Ctrl+Shift+Z)"
            disabled={!workspace.canRedo || !!workspace.error}
            onClick={redo}
          >
            <Redo2 size={18} />
          </button>
        </div>
      </header>
      {currentView === "editor" && activeProject && (
        <SecondaryToolbar
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onExport={() => setCurrentView("export")}
        />
      )}
      <div className="flex justify-between px-5 py-1 text-xs border-b border-[#30251d]">
        <span role="status">{workspace.status}</span>
        <span>{activeProject?.name}</span>
      </div>
      {notice && (
        <div role="alert" className="p-3 bg-stone-800 flex justify-between">
          {notice}
          <button onClick={() => setNotice("")}>Fechar aviso</button>
        </div>
      )}
      <div className="flex-1 flex min-h-0">
        {currentView === "editor" && activeProject && (
          <div
            id="editor-sidebar"
            style={{ display: sidebarCollapsed ? "none" : "flex" }}
            className="shrink-0 min-h-0"
          >
            <Sidebar
              locationFilters={locationFilters}
              onChangeFilters={changeLocationFilters}
              projects={projects}
              onOpenMap={openProject}
              project={activeProject}
              selectedLocationId={selectedLocationId}
              onSelectLocation={locate}
              onUpdateLocation={updateLocation}
              onDeleteLocation={deleteLocation}
              onAddLocation={addLocation}
              onDeleteAnnotation={deleteAnnotation}
            />
          </div>
        )}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto">
          {currentView === "projects" && (
            <>
              <div className="p-4 flex gap-3 flex-wrap items-center">
                <button
                  className="dz-button"
                  onClick={() => exportBackup(data)}
                >
                  Baixar backup completo
                </button>
                <label className="dz-button cursor-pointer">
                  Importar backup
                  <input
                    aria-label="Importar backup"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      void importFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  placeholder="Pesquisar projetos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Ordenar projetos"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="name">Nome</option>
                </select>
              </div>
              <StoragePanel status={workspace.status} />
              <ProjectManager
                projects={[...projects]
                  .filter((p) =>
                    (p.name + " " + p.description)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .sort((a, b) =>
                    sort === "name"
                      ? a.name.localeCompare(b.name)
                      : +b.updatedAt - +a.updatedAt,
                  )}
                activeProjectId={activeProjectId}
                onCreateProject={createProject}
                onSelectProject={openProject}
                onDeleteProject={deleteProject}
              />
            </>
          )}
          {currentView === "editor" &&
            (activeProject ? (
              <>
                <div className="flex flex-wrap items-center gap-2 p-2 text-xs border-b border-[#3d2e22]">
                  <label>
                    Projeto{" "}
                    <input
                      aria-label="Nome do projeto"
                      value={activeProject.name}
                      onChange={(e) =>
                        updateProject(activeProject.id, {
                          name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <input
                    aria-label="Descrição do projeto"
                    placeholder="Descrição do projeto"
                    value={activeProject.description}
                    onChange={(e) =>
                      updateProject(activeProject.id, {
                        description: e.target.value,
                      })
                    }
                  />
                  <button
                    className="dz-button"
                    onClick={() => {
                      const copy = remapBackup({
                        projects: [activeProject],
                        glossary: glossary.filter(
                          (e) => e.mapId === activeProject.id,
                        ),
                        trash: [],
                      });
                      copy.projects[0].name += " — cópia";
                      commit((d) => ({
                        ...d,
                        projects: [...d.projects, ...copy.projects],
                        glossary: [...d.glossary, ...copy.glossary],
                      }));
                      openProject(copy.projects[0].id);
                    }}
                  >
                    Duplicar projeto
                  </button>
                </div>
                <Toolbar
                  sidebarCollapsed={sidebarCollapsed}
                  onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                  project={activeProject}
                  onUpdateProject={updateProject}
                  onOpenHelp={() => setShowHelp(true)}
                />
                <MapEditor
                  project={activeProject}
                  activeTool={activeTool}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={locate}
                  onUpdateProject={updateProject}
                  onAddLocation={addLocation}
                  onAddAnnotation={addAnnotation}
                  onUpdateLocation={updateLocation}
                  onDeleteLocation={deleteLocation}
                  onDeleteAnnotation={deleteAnnotation}
                  locationFilters={locationFilters}
                  focusLocation={focusLocation}
                  onOpenLocationDetails={() => {
                    if (selectedLocationId) locate(selectedLocationId);
                  }}
                  zoomLevel={zoomLevel}
                />
              </>
            ) : (
              <div className="p-10">Abra ou crie um projeto no Arquivo.</div>
            ))}
          {currentView === "procedural" && (
            <ProceduralGenerator
              initialProject={activeProject || undefined}
              onLoadMap={(p) =>
                createProject(
                  p.name || "Mapa procedural",
                  p.description || "",
                  p,
                )
              }
            />
          )}
          {currentView === "glossary" && (
            <>
              <div className="p-3 flex flex-wrap gap-3 items-center">
                <span>
                  {activeProject
                    ? "Códice de " + activeProject.name
                    : "Códice geral"}
                </span>
                <select
                  aria-label="Projeto do códice"
                  value={activeProjectId || ""}
                  onChange={(e) => setActiveProjectId(e.target.value || null)}
                >
                  <option value="">Geral (sem projeto)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {activeProject && (
                  <button className="dz-button" onClick={syncGlossary}>
                    Sincronizar locais
                  </button>
                )}
              </div>
              <Glossary
                entries={glossary.filter((e) =>
                  activeProjectId ? e.mapId === activeProjectId : !e.mapId,
                )}
                onAddEntry={addEntry}
                onUpdateEntry={updateEntry}
                onDeleteEntry={deleteEntry}
                locations={activeProject?.locations || []}
              />
              {glossary
                .filter((e) => e.mapId === activeProjectId && e.locationId)
                .map((e) => (
                  <button
                    className="text-left px-8 py-1 text-amber-300"
                    key={e.id}
                    onClick={() => {
                      setCurrentView("editor");
                      locate(e.locationId!);
                    }}
                  >
                    Localizar no mapa: {e.name}
                  </button>
                ))}
            </>
          )}
          {currentView === "export" &&
            (activeProject ? (
              <>
                <div className="p-3">
                  <button
                    className="dz-button"
                    onClick={() =>
                      exportBackup(
                        {
                          projects: [activeProject],
                          glossary: glossary.filter(
                            (e) => e.mapId === activeProject.id,
                          ),
                          trash: [],
                        },
                        activeProject.name,
                      )
                    }
                  >
                    Baixar projeto editável com códice
                  </button>
                </div>
                <ExportPanel
                  project={activeProject}
                  glossary={glossary.filter(
                    (e) => e.mapId === activeProject.id,
                  )}
                />
              </>
            ) : (
              <div className="p-10">Selecione um projeto no Arquivo.</div>
            ))}
          {currentView === "trash" && (
            <div className="p-8">
              <h1 className="text-2xl mb-3">Lixeira</h1>
              <p className="mb-6 text-stone-400">
                Itens excluídos ficam aqui até você restaurá-los. A lixeira
                também acompanha o backup completo.
              </p>
              {!trash.length && <p>A lixeira está vazia.</p>}
              {[...trash].reverse().map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between gap-4 p-4 border-b border-stone-800"
                >
                  <span>
                    {t.name} · {new Date(t.deletedAt).toLocaleString("pt-BR")}
                  </span>
                  <button className="dz-button" onClick={() => restore(t)}>
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <HelpOverlay visible={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
