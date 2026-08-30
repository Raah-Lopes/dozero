import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { toPng } from "html-to-image";

import GraphNode from "./GraphNode";
import GraphEdge from "./GraphEdge";
import Sidebar from "./Sidebar";
import Inspector from "./Inspector";
import TopBar from "./TopBar";
import { EdgeModal, FichaModal, NodeCreateModal, SaveViewModal, StatsModal, Toasts, type Toast } from "./Modals";
import { IX } from "./icons";

import { uid, TypeRegistry, type SavedView, type TypeReg, type WEdge, type WNode, type WorldNodeData } from "./core";
import { DEFAULT_EDGE_COLOR, ForceSimulator, Layouts, Pathfinder, StatsEngine, Vault, WorldGraph, type PathResult, type VaultPayload } from "./world";
import { SEED_EDGES, SEED_NODES, TYPE_ORDER } from "./seed";
import "@xyflow/react/dist/style.css";
import "./arcanum.css";

const nodeTypes = { world: GraphNode };
const edgeTypes = { world: GraphEdge };

/* ---------- Carga inicial com fallback ---------- */
function boot() {
  const saved = Vault.load();
  if (saved && Array.isArray(saved.nodes) && saved.nodes.length > 0) {
    const allZero = saved.nodes.length > 1 && saved.nodes.every((n) => (!n.position?.x && !n.position?.y));
    const nodes = allZero ? Layouts.clusterByType(saved.nodes as WNode[], TYPE_ORDER) : (saved.nodes as WNode[]);
    return {
      nodes,
      edges: (saved.edges ?? []) as WEdge[],
      customTypes: saved.customTypes ?? [],
      savedViews: saved.savedViews ?? [],
    };
  }
  return {
    nodes: Layouts.clusterByType(SEED_NODES, TYPE_ORDER),
    edges: SEED_EDGES,
    customTypes: [] as TypeReg[],
    savedViews: [] as SavedView[],
  };
}
const BOOT = boot();

type ModalState =
  | { kind: "node"; x: number; y: number }
  | { kind: "edge"; edgeId: string }
  | { kind: "ficha"; nodeId: string }
  | { kind: "stats" }
  | { kind: "save" }
  | null;

export interface ArcanumGraphProps {
  initialNodes?: WNode[];
  initialEdges?: WEdge[];
  initialPayload?: VaultPayload;
  onPersist?: (payload: VaultPayload) => void;
  onClose?: () => void;
  onNodeDoubleClick?: (node: WNode) => void;
  onSaveToWiki?: (nodeId: string, updatedSummary: string) => Promise<void>;
  onCreateWikiRelation?: (sourcePath: string, targetName: string, label: string) => Promise<void>;
}

function ArcanumInner({ initialNodes, initialEdges, initialPayload, onPersist, onClose, onCreateWikiRelation }: ArcanumGraphProps) {
  const rf = useReactFlow<WNode, WEdge>();

  const [nodes, setNodes] = useState<WNode[]>(() => initialPayload?.nodes || (initialNodes && initialNodes.length > 0 ? initialNodes : BOOT.nodes));
  const [edges, setEdges] = useState<WEdge[]>(() => initialPayload?.edges || (initialEdges && initialEdges.length > 0 ? initialEdges : BOOT.edges));
  const [customTypes, setCustomTypes] = useState<TypeReg[]>(() => initialPayload?.customTypes || BOOT.customTypes);
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => initialPayload?.savedViews || BOOT.savedViews);

  useEffect(() => {
    if (initialPayload) {
      setNodes(initialPayload.nodes);
      setEdges(initialPayload.edges);
      setCustomTypes(initialPayload.customTypes);
      setSavedViews(initialPayload.savedViews);
      return;
    }
    if (initialNodes && initialNodes.length > 0) {
      setNodes((prev) => {
        if (prev.length === initialNodes.length) {
          return initialNodes.map(n => {
            const ext = prev.find(p => p.id === n.id);
            return ext ? { ...n, position: ext.position, selected: ext.selected } : n;
          });
        }
        return initialNodes;
      });
      if (initialEdges) setEdges(initialEdges);
    }
  }, [initialPayload, initialNodes, initialEdges]);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [isolate, setIsolate] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState<{ from: string } | null>(null);
  const [path, setPath] = useState<PathResult | null>(null);

  const [physicsOn, setPhysicsOn] = useState(false);
  const [physicsRun, setPhysicsRun] = useState(0);
  const [attraction, setAttraction] = useState(1.2);
  const [idealDistance, setIdealDistance] = useState(120);
  const [gliding, setGliding] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<{ sourceId: string; x: number; y: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef(new ForceSimulator());
  const edgesRef = useRef(edges);
  const toastSeq = useRef(0);

  const pushToast = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastSeq.current;
    setToasts((ts) => [...ts.slice(-2), { id, msg, kind }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3400);
  }, []);

  const handleSetAttraction = useCallback((val: number) => {
    setAttraction(val);
    simRef.current.setAttraction(val);
    simRef.current.reheat(0.8);
    setPhysicsRun((r) => r + 1);
  }, []);

  const handleSetIdealDistance = useCallback((val: number) => {
    setIdealDistance(val);
    simRef.current.setIdealDistance(val);
    simRef.current.reheat(0.8);
    setPhysicsRun((r) => r + 1);
  }, []);

  const handleReheatPhysics = useCallback(() => {
    simRef.current.reheat(1.0);
    setPhysicsRun((r) => r + 1);
    pushToast("Nós reagrupados!");
  }, [pushToast]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const registry = useMemo(() => new TypeRegistry(customTypes), [customTypes]);

  /* Ajuste de enquadramento inicial */
  useEffect(() => {
    const t = window.setTimeout(() => {
      rf.fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1.1, duration: 600 });
    }, 180);
    return () => window.clearTimeout(t);
  }, [rf]);

  const persistPayload = useCallback((payload: VaultPayload) => {
    if (onPersist) onPersist(payload);
    else Vault.save(payload);
  }, [onPersist]);

  /* Persistência automática compartilhada, com Vault apenas como fallback isolado. */
  useEffect(() => {
    const t = window.setTimeout(() => persistPayload({ v: 1, nodes, edges, customTypes, savedViews }), 350);
    return () => window.clearTimeout(t);
  }, [nodes, edges, customTypes, savedViews, persistPayload]);

  /* Derivações visuais */
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) m.set(n.data.typeId, (m.get(n.data.typeId) ?? 0) + 1);
    return m;
  }, [nodes]);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) {
      for (const t of n.data.tags ?? []) {
        m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return [...m.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [nodes]);

  const pathNodeSet = useMemo(() => new Set(path?.nodeIds ?? []), [path]);
  const pathEdgeSet = useMemo(() => new Set(path?.edgeIds ?? []), [path]);

  /* Vizinhança direta do nó selecionado (1º grau) */
  const connectedNodeIds = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [selectedId, edges]);

  const connectedEdgeIds = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>();
    for (const e of edges) {
      if (e.source === selectedId || e.target === selectedId) {
        set.add(e.id);
      }
    }
    return set;
  }, [selectedId, edges]);

  const dimmedIds = useMemo(() => {
    const s = new Set<string>();
    if (!isolate && !path && !selectedTag && !connectedNodeIds) return s;
    for (const n of nodes) {
      const matchIsolate = !isolate || n.data.typeId === isolate;
      const matchPath = !path || pathNodeSet.has(n.id);
      const matchTag = !selectedTag || (n.data.tags ?? []).includes(selectedTag);
      const matchConnected = !connectedNodeIds || connectedNodeIds.has(n.id);
      if (!matchIsolate || !matchPath || !matchTag || !matchConnected) {
        s.add(n.id);
      }
    }
    return s;
  }, [nodes, isolate, path, pathNodeSet, selectedTag, connectedNodeIds]);

  const visibleIds = useMemo(() => new Set(nodes.filter((n) => !hidden.has(n.data.typeId)).map((n) => n.id)), [nodes, hidden]);

  const selectedNodeObj = useMemo(() => {
    if (!selectedId) return null;
    return nodes.find((n) => n.id === selectedId) ?? null;
  }, [nodes, selectedId]);

  const neighborPositions = useMemo(() => {
    if (!selectedId || !selectedNodeObj || !connectedNodeIds) return new Map<string, { x: number; y: number }>();
    const neighbors = nodes.filter((node) => connectedNodeIds.has(node.id) && node.id !== selectedId && visibleIds.has(node.id));
    if (neighbors.length === 0) return new Map<string, { x: number; y: number }>();

    const ordered = neighbors
      .map((node) => ({
        node,
        angle: Math.atan2(node.position.y - selectedNodeObj.position.y, node.position.x - selectedNodeObj.position.x),
      }))
      .sort((a, b) => a.angle - b.angle);
    const radius = Math.max(225, 180 + ordered.length * 9);
    const startAngle = ordered[0].angle;

    return new Map(ordered.map(({ node }, index) => {
      const angle = startAngle + (index / ordered.length) * Math.PI * 2;
      return [node.id, {
        x: selectedNodeObj.position.x + Math.cos(angle) * radius,
        y: selectedNodeObj.position.y + Math.sin(angle) * radius,
      }];
    }));
  }, [selectedId, selectedNodeObj, connectedNodeIds, nodes, visibleIds]);

  const renderNodes = useMemo<WNode[]>(
    () =>
      nodes
        .filter((n) => visibleIds.has(n.id))
        .map((n) => {
          const t = registry.get(n.data.typeId);
          const isSelected = n.id === selectedId;
          const isNeighbor = !!connectedNodeIds?.has(n.id) && !isSelected;
          const position = isNeighbor ? neighborPositions.get(n.id) ?? n.position : n.position;
          const dim = dimmedIds.has(n.id);
          const onPath = pathNodeSet.has(n.id);
          const isSource = connectSource === n.id;
          const shape = n.data.shape || t.shape || "circle";
          const sameData = n.data.typeColor === t.color
            && n.data.typeName === t.name
            && n.data.shape === shape
            && n.data.dim === dim
            && n.data.onPath === onPath
            && n.data.isSource === isSource
            && n.data.isNeighbor === isNeighbor;

          return {
            ...n,
            position,
            data: sameData ? n.data : {
              ...n.data,
              typeColor: t.color,
              typeName: t.name,
              shape,
              dim,
              onPath,
              isSource,
              isNeighbor,
            },
          };
        }),
    [nodes, visibleIds, registry, dimmedIds, pathNodeSet, connectSource, selectedId, connectedNodeIds, neighborPositions]
  );

  const renderEdges = useMemo<WEdge[]>(
    () =>
      edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => {
          const isConnectedToSelected = !!connectedEdgeIds?.has(e.id);
          const isDimmed = connectedEdgeIds
            ? !isConnectedToSelected
            : dimmedIds.has(e.source) || dimmedIds.has(e.target) || (!!path && !pathEdgeSet.has(e.id));

          return {
            ...e,
            data: {
              ...(e.data ?? { label: "", color: DEFAULT_EDGE_COLOR }),
              dim: isDimmed,
              onPath: pathEdgeSet.has(e.id) || isConnectedToSelected,
            },
          };
        }),
    [edges, visibleIds, dimmedIds, path, pathEdgeSet, connectedEdgeIds]
  );

  const onNodesChange = useCallback((changes: NodeChange<WNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), []);
  const onEdgesChange = useCallback((changes: EdgeChange<WEdge>[]) => setEdges((es) => applyEdgeChanges(changes, es)), []);

  /* Física orgânica opcional */
  useEffect(() => {
    if (!physicsOn) return;
    simRef.current.reheat(0.85);
    let raf = 0;
    let previousFrame = 0;
    const step = (time: number) => {
      if (simRef.current.cooled()) return;
      if (time - previousFrame < 32) {
        raf = requestAnimationFrame(step);
        return;
      }
      previousFrame = time;
      setNodes((ns) => simRef.current.tick(ns, edgesRef.current));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [physicsOn, physicsRun]);

  const focusNode = useCallback(
    (id: string) => {
      const n = nodes.find((m) => m.id === id);
      if (!n) return;
      setNodes((ns) => ns.map((m) => ({ ...m, selected: m.id === id })));
      setSelectedId(id);
      const w = n.measured?.width ?? 60;
      const h = n.measured?.height ?? 60;
      rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1.45, duration: 650 });
    },
    [nodes, rf]
  );

  const finishConnect = useCallback(
    (a: string, b: string) => {
      const edge = WorldGraph.createEdge(a, b);
      setEdges((es) => [...es, edge]);
      setModal({ kind: "edge", edgeId: edge.id });
      pushToast("Laço criado — defina o tipo da relação");
    },
    [pushToast]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: WNode) => {
      if (pathMode) {
        if (node.id !== pathMode.from) {
          const res = Pathfinder.shortest(nodes, edges, pathMode.from, node.id);
          if (res) {
            setPath(res);
            pushToast(`Caminho traçado: ${res.edgeIds.length === 0 ? "mesmo nó" : `${res.edgeIds.length} laço(s)`}`);
          } else {
            pushToast("Nenhum laço une estes dois fragmentos", "warn");
          }
        }
        setPathMode(null);
        return;
      }
      if (connectMode) {
        if (!connectSource) {
          setConnectSource(node.id);
          pushToast("Origem marcada — agora clique no destino");
        } else if (connectSource !== node.id) {
          finishConnect(connectSource, node.id);
          setConnectSource(null);
          setConnectMode(false);
        }
        return;
      }

      setSelectedId(node.id);
      setNodes((ns) => ns.map((m) => ({ ...m, selected: m.id === node.id })));
      const w = node.measured?.width ?? 60;
      const h = node.measured?.height ?? 60;
      rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
        zoom: 1.45,
        duration: 650,
      });
    },
    [pathMode, connectMode, connectSource, nodes, edges, finishConnect, pushToast, rf]
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: WNode) => {
      setSelectedId(node.id);
      setModal({ kind: "ficha", nodeId: node.id });
    },
    []
  );

  const glide = useCallback(
    (next: WNode[], msg: string) => {
      setGliding(true);
      setNodes(next);
      window.setTimeout(() => {
        rf.fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1.1, duration: 650 });
        setGliding(false);
      }, 660);
      pushToast(msg);
    },
    [rf, pushToast]
  );

  const focusCenter = useCallback(
    (id: string) => {
      glide(Layouts.radialFocus(nodes, edges, id), "Nó centralizado: o mundo orbita ao seu redor");
    },
    [nodes, edges, glide]
  );

  const clusterAll = useCallback(() => {
    const order = [...TYPE_ORDER, ...customTypes.map((t) => t.id)];
    glide(Layouts.clusterByType(nodes, order), "Nós organizados em constelações por camada");
  }, [nodes, customTypes, glide]);

  const exportWebp = useCallback(async () => {
    pushToast("Renderizando pergaminho em alta definição…");
    try {
      const el = document.querySelector(".react-flow__viewport") as HTMLElement;
      if (!el) throw new Error("Viewport não encontrado");
      const png = await toPng(el, {
        backgroundColor: "#0c0911",
        pixelRatio: 2,
        filter: (node) => {
          const c = (node as HTMLElement).classList;
          if (!c) return true;
          return !c.contains("react-flow__minimap") && !c.contains("react-flow__controls") && !c.contains("react-flow__attribution");
        },
      });
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("img"));
        img.src = png;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            pushToast("Falha ao gerar .webp", "warn");
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `dozero-arcanum-grafo-${new Date().toISOString().slice(0, 10)}.webp`;
          a.click();
          URL.revokeObjectURL(url);
          pushToast("Grafo exportado com sucesso como .webp");
        },
        "image/webp",
        0.95
      );
    } catch {
      pushToast("Não foi possível exportar a imagem agora", "warn");
    }
  }, [pushToast]);

  const applyView = useCallback(
    (v: SavedView) => {
      setHidden(new Set(v.hidden || []));
      setIsolate(v.isolate || null);

      if (v.nodePositions && Object.keys(v.nodePositions).length > 0) {
        setNodes((ns) =>
          ns.map((n) => {
            const savedPos = v.nodePositions?.[n.id];
            return savedPos
              ? { ...n, position: { ...savedPos }, selected: n.id === v.selectedNodeId }
              : { ...n, selected: n.id === v.selectedNodeId };
          })
        );
      } else if (v.selectedNodeId !== undefined) {
        setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === v.selectedNodeId })));
      }

      setSelectedId(v.selectedNodeId ?? null);

      if (v.viewport) {
        requestAnimationFrame(() => {
          rf.setViewport(v.viewport, { duration: 700 });
        });
      }

      pushToast(`Vista aplicada: ${v.name}`);
    },
    [rf, pushToast]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((ns) => {
        const r = WorldGraph.removeNode(ns, edgesRef.current, id);
        setEdges(r.edges);
        return r.nodes;
      });
      setSelectedId(null);
      if (path?.nodeIds.includes(id)) setPath(null);
      pushToast("Fragmento removido do mundo");
    },
    [path, pushToast]
  );

  const handleExportDB = useCallback(() => {
    const payload: VaultPayload = {
      v: 1,
      nodes,
      edges,
      customTypes,
      savedViews,
    };
    Vault.exportJSON(payload);
    pushToast("Backup JSON do banco de dados baixado");
  }, [nodes, edges, customTypes, savedViews, pushToast]);

  const handleImportDB = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as VaultPayload;
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          setCustomTypes(parsed.customTypes ?? []);
          setSavedViews(parsed.savedViews ?? []);
          setSelectedId(null);
          setIsolate(null);
          setSelectedTag(null);
          setHidden(new Set());
          window.setTimeout(() => rf.fitView({ padding: 0.18, duration: 600 }), 100);
          pushToast("Banco de dados do grafo importado com sucesso!");
        } else {
          pushToast("Arquivo JSON inválido", "warn");
        }
      } catch {
        pushToast("Erro ao ler arquivo JSON", "warn");
      }
    };
    reader.readAsText(file);
  }, [rf, pushToast]);

  /* Atalhos de teclado */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      setConnectMode(false);
      setConnectSource(null);
      setPathMode(null);
      setPending(null);
    };
    const onEditEdge = (ev: Event) => setModal({ kind: "edge", edgeId: (ev as CustomEvent).detail as string });
    window.addEventListener("keydown", onKey);
    window.addEventListener("arcanum:edit-edge", onEditEdge);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("arcanum:edit-edge", onEditEdge);
    };
  }, []);

  /* Shift + Arraste para conectar */
  const pendingSourceId = pending?.sourceId;
  useEffect(() => {
    if (!pendingSourceId) return;
    const move = (ev: MouseEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPending((p) => (p ? { ...p, x: ev.clientX - rect.left, y: ev.clientY - rect.top } : p));
    };
    const up = (ev: MouseEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-node-id]") as HTMLElement | null;
      const targetId = el?.getAttribute("data-node-id") ?? null;
      setPending(null);
      if (targetId && targetId !== pendingSourceId) finishConnect(pendingSourceId, targetId);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [pendingSourceId, finishConnect]);

  const onWrapperMouseDownCapture = useCallback((e: React.MouseEvent) => {
    if (!e.shiftKey) return;
    const el = (e.target as HTMLElement).closest("[data-node-id]") as HTMLElement | null;
    if (!el) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPending({ sourceId: el.getAttribute("data-node-id")!, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const onWrapperDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.closest(".react-flow__node") ||
        t.closest(".react-flow__edge") ||
        t.closest(".edge-chip") ||
        t.closest(".react-flow__minimap") ||
        t.closest(".react-flow__controls") ||
        t.closest(".arcanum-sidebar") ||
        t.closest(".arcanum-inspector") ||
        t.closest(".arcanum-modal")
      ) {
        return;
      }
      if (!t.closest(".react-flow__pane")) return;

      // Duplo-clique no fundo (fora dos nós): zoom out suave mostrando todo o grafo sem diminuir excessivamente
      rf.fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1.1, duration: 700 });
      setSelectedId(null);
      setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
    },
    [rf]
  );

  const pendingLine = useMemo(() => {
    if (!pending) return null;
    const src = nodes.find((n) => n.id === pending.sourceId);
    if (!src) return null;
    const start = rf.flowToScreenPosition({
      x: src.position.x + (src.measured?.width ?? 60) / 2,
      y: src.position.y + (src.measured?.height ?? 60) / 2,
    });
    return { x1: start.x, y1: start.y, x2: pending.x, y2: pending.y };
  }, [pending, nodes, rf]);

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null;
  const modalEdge = modal?.kind === "edge" ? edges.find((e) => e.id === modal.edgeId) ?? null : null;
  const fichaNode = modal?.kind === "ficha" ? nodes.find((n) => n.id === modal.nodeId) ?? null : null;
  const stats = useMemo(() => StatsEngine.compute(nodes, edges, registry), [nodes, edges, registry]);

  const banner = connectMode
    ? connectSource
      ? "Origem marcada — clique no nó de destino"
      : "Modo conectar — clique no nó de origem"
    : pathMode
      ? "Traçando caminho — clique no nó de destino"
      : pending
        ? "Solte sobre outro nó para selar o laço"
        : selectedTag
          ? `Filtro ativo por tag: ${selectedTag}`
          : path
            ? `Caminho traçado · ${path.edgeIds.length} laço(s) iluminado(s)`
            : null;

  return (
    <div className="arcanum-workspace arcanum-sky">
      <TopBar
        nodes={renderNodes}
        edgeCount={edges.length}
        connectMode={connectMode}
        physicsOn={physicsOn}
        onToggleConnect={() => {
          setConnectMode((v) => !v);
          setConnectSource(null);
          setPathMode(null);
        }}
        onTogglePhysics={() => {
          const next = !physicsOn;
          if (next) {
            pushToast("O grafo começa a respirar com física orgânica");
            simRef.current.reheat(1.0);
            setPhysicsRun((run) => run + 1);
          }
          setPhysicsOn(next);
        }}
        onNewNode={() => {
          const c = rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          setModal({ kind: "node", x: c.x - 30, y: c.y - 30 });
        }}
        onCluster={clusterAll}
        onFit={() => rf.fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1.1, duration: 650 })}
        onZoomIn={() => rf.zoomIn({ duration: 250 })}
        onZoomOut={() => rf.zoomOut({ duration: 250 })}
        onExport={exportWebp}
        onStats={() => setModal({ kind: "stats" })}
        onFocusNode={focusNode}
        onClose={onClose}
      />

      <div className="flex-1 flex min-h-0 relative">
        <Sidebar
          types={registry.all()}
          counts={counts}
          tags={tagCounts}
          selectedTag={selectedTag}
          onSelectTag={(t) => {
            setSelectedTag(t);
            if (t) pushToast(`Tag filtrada: ${t}`);
          }}
          hidden={hidden}
          isolate={isolate}
          onToggleVisible={(id) =>
            setHidden((h) => {
              const n = new Set(h);
              if (n.has(id)) {
                n.delete(id);
              } else {
                n.add(id);
                if (selectedId && nodes.find((x) => x.id === selectedId)?.data.typeId === id) setSelectedId(null);
              }
              return n;
            })
          }
          onIsolate={(id) => {
            setIsolate(id);
            if (id) pushToast(`Camada destacada: ${registry.get(id).name}`);
          }}
          onAddCustom={(name, color, icon) => {
            let reg = registry.addCustom(name, color, icon);
            if (registry.all().some((t) => t.id === reg.id)) {
              reg = { ...reg, id: uid("tipo") };
            }
            setCustomTypes((ct) => [...ct, reg]);
            pushToast(`Nova camada criada: ${name}`);
          }}
          onRemoveCustom={(id) => {
            if ((counts.get(id) ?? 0) > 0) {
              setNodes((ns) => ns.map((n) => (n.data.typeId === id ? { ...n, data: { ...n.data, typeId: "conceito", icon: "💠" } } : n)));
            }
            setCustomTypes((ct) => ct.filter((t) => t.id !== id));
            setHidden((h) => {
              const n = new Set(h);
              n.delete(id);
              return n;
            });
            if (isolate === id) setIsolate(null);
            pushToast("Camada removida — nós transferidos para Conceito");
          }}
          savedViews={savedViews}
          onApplyView={applyView}
          onDeleteView={(id) => {
            setSavedViews((vs) => {
              const updated = vs.filter((v) => v.id !== id);
              persistPayload({ v: 1, nodes, edges, customTypes, savedViews: updated });
              return updated;
            });
            pushToast("Vista removida");
          }}
          onSaveView={() => setModal({ kind: "save" })}
          onRestore={() => {
            setNodes(Layouts.clusterByType(SEED_NODES, TYPE_ORDER));
            setEdges(SEED_EDGES);
            setHidden(new Set());
            setIsolate(null);
            setSelectedTag(null);
            setPath(null);
            setSelectedId(null);
            window.setTimeout(() => rf.fitView({ padding: 0.2, minZoom: 0.55, maxZoom: 1.1, duration: 700 }), 80);
            pushToast("Mundo de exemplo renasceu completo!");
          }}
          onOpenStats={() => setModal({ kind: "stats" })}
          onExportDB={handleExportDB}
          onImportDB={handleImportDB}
          attraction={attraction}
          onSetAttraction={handleSetAttraction}
          idealDistance={idealDistance}
          onSetIdealDistance={handleSetIdealDistance}
          physicsOn={physicsOn}
          onTogglePhysics={() => {
            const next = !physicsOn;
            if (next) {
              simRef.current.reheat(1.0);
              setPhysicsRun((run) => run + 1);
            }
            setPhysicsOn(next);
          }}
          onReheatPhysics={handleReheatPhysics}
        />

        {/* Canvas ReactFlow */}
        <div
          ref={wrapRef}
          className={`flex-1 relative min-w-0 ${gliding ? "gliding" : ""}`}
          onDoubleClick={onWrapperDoubleClick}
          onMouseDownCapture={onWrapperMouseDownCapture}
        >
          <ReactFlow<WNode, WEdge>
            nodes={renderNodes}
            edges={renderEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeClick={(_, edge) => setModal({ kind: "edge", edgeId: edge.id })}
            onPaneClick={() => {
              setConnectSource(null);
              setSelectedId(null);
            }}
            onNodeDragStop={() => {
              if (!physicsOn) return;
              simRef.current.reheat(0.25);
              setPhysicsRun((run) => run + 1);
            }}
            deleteKeyCode={["Backspace", "Delete"]}
            nodesConnectable={false}
            nodesDraggable={!gliding}
            elementsSelectable={true}
            panOnDrag={true}
            selectionOnDrag={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            autoPanOnNodeDrag={true}
            minZoom={0.42}
            maxZoom={3.0}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.55, maxZoom: 1.1 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1.8} color="#5a4a68" />
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              nodeStrokeWidth={4}
              nodeColor={(n) => registry.get(((n.data ?? {}) as WorldNodeData).typeId ?? "conceito").color}
              maskColor="rgba(12, 9, 17, 0.84)"
              style={{
                background: "#120e19",
                transform: selectedNode ? "translateX(-350px)" : undefined,
                transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            <Controls 
              position="bottom-left" 
              showInteractive={true}
              showZoom={true}
              showFitView={true}
            />
          </ReactFlow>

          {/* Estado vazio */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
              <div className="text-center bg-[#120e19]/80 p-6 rounded-2xl border border-[#2a2236]">
                <div className="font-display text-[22px] font-bold text-[#cd973c]">O mundo está em branco</div>
                <p className="text-[13px] text-[#a99e88] mt-2">
                  Dê um duplo clique no vazio ou clique em <b className="text-[#f3ead6]">Novo Nó</b> acima.
                </p>
              </div>
            </div>
          )}

          {/* Banner de modo ativo */}
          {banner && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 rise-in">
              <div className="flex items-center gap-2.5 rounded-full border border-[#cd973c] bg-[#120e19]/98 px-5 py-2 hud-shadow shadow-2xl">
                <span className="w-2 h-2 rounded-full bg-[#cd973c] animate-pulse" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#cd973c]">{banner}</span>
                {path && !pathMode && (
                  <button type="button" onClick={() => setPath(null)} className="font-mono text-[10px] uppercase text-[#a99e88] hover:text-[#c14e39] flex items-center gap-1 ml-1">
                    <IX className="w-3.5 h-3.5" /> limpar rota
                  </button>
                )}
                {selectedTag && (
                  <button type="button" onClick={() => setSelectedTag(null)} className="font-mono text-[10px] uppercase text-[#a99e88] hover:text-[#c14e39] flex items-center gap-1 ml-1">
                    <IX className="w-3.5 h-3.5" /> remover filtro
                  </button>
                )}
                {(pathMode || connectMode || pending) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPathMode(null);
                      setConnectMode(false);
                      setConnectSource(null);
                      setPending(null);
                    }}
                    className="font-mono text-[10px] uppercase text-[#a99e88] hover:text-[#c14e39] ml-1 font-bold"
                  >
                    esc (cancelar)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Linha provisória do shift+arraste */}
          {pendingLine && (
            <svg className="absolute inset-0 pointer-events-none z-40" width="100%" height="100%">
              <line
                x1={pendingLine.x1}
                y1={pendingLine.y1}
                x2={pendingLine.x2}
                y2={pendingLine.y2}
                stroke="#cd973c"
                strokeWidth="3"
                strokeDasharray="8 6"
                strokeLinecap="round"
              />
                <circle cx={pendingLine.x2} cy={pendingLine.y2} r="6" fill="#cd973c" />
            </svg>
          )}

          {/* Inspector (1 clique) */}
          {selectedNode && (
            <Inspector
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              types={registry.all()}
              onChange={(id, patch) => setNodes((ns) => WorldGraph.updateNode(ns, id, patch))}
              onDelete={deleteNode}
              onFocusCenter={focusCenter}
              onStartPath={(id) => {
                setPathMode({ from: id });
                setConnectMode(false);
                setConnectSource(null);
              }}
              onEditEdge={(id) => setModal({ kind: "edge", edgeId: id })}
              onDeleteEdge={(id) => {
                setEdges((es) => WorldGraph.removeEdge(es, id));
                pushToast("Laço desfeito");
              }}
              onJumpNode={focusNode}
              onHighlightGroup={(typeId) => {
                setIsolate(typeId);
                pushToast(`Camada destacada: ${registry.get(typeId).name}`);
              }}
              onOpenFicha={(id) => setModal({ kind: "ficha", nodeId: id })}
              onClose={() => {
                setSelectedId(null);
                setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));
              }}
            />
          )}
        </div>
      </div>

      {/* Legenda de atalhos */}
      <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-30 hidden md:block">
        <div className="rounded-full border border-[#3b2e4a] bg-[#120e19]/90 backdrop-blur-md px-5 py-1.5 font-mono text-[10px] text-[#c5b99f] tracking-wide whitespace-nowrap shadow-xl">
          🔍 <span className="text-[#cd973c] font-bold">1 Clique</span> Configurações
          <span className="text-[#5a4a68] mx-2">·</span>
          📜 <span className="text-[#cd973c] font-bold">2 Cliques</span> Ficha Completa RPG
          <span className="text-[#5a4a68] mx-2">·</span>
          🔗 <span className="text-[#cd973c] font-bold">Shift + arraste</span> Conectar
          <span className="text-[#5a4a68] mx-2">·</span>
          ✦ <span className="text-[#cd973c] font-bold">Duplo clique no vazio</span> Novo nó
        </div>
      </div>

      {/* Modais */}
      {modal?.kind === "ficha" && fichaNode && (
        <FichaModal
          node={fichaNode}
          nodes={nodes}
          edges={edges}
          types={registry.all()}
          onChange={(id, patch) => setNodes((ns) => WorldGraph.updateNode(ns, id, patch))}
          onJumpNode={focusNode}
          onOpenFicha={(id) => {
            setSelectedId(id);
            setModal({ kind: "ficha", nodeId: id });
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "node" && (
        <NodeCreateModal
          types={registry.all()}
          onClose={() => setModal(null)}
          onCreate={(d) => {
            const type = registry.get(d.typeId);
            const node = WorldGraph.createNode(
              d.typeId,
              modal.x,
              modal.y,
              type,
              d.label,
              d.tags,
              d.ficha ?? { status: "Ativo" },
              d.summary,
              d.shape || type.shape || "circle"
            );
            node.data.icon = d.icon || type.icon;
            setNodes((ns) => [...ns, node]);
            setSelectedId(node.id);
            setModal(null);
            pushToast(`Fragmento inscrito: ${d.label}`);
          }}
        />
      )}

      {modal?.kind === "edge" && modalEdge && (
        <EdgeModal
          edge={modalEdge}
          fromLabel={nodes.find((n) => n.id === modalEdge.source)?.data.label ?? "?"}
          toLabel={nodes.find((n) => n.id === modalEdge.target)?.data.label ?? "?"}
          onClose={() => setModal(null)}
          onSave={(id, label, color) => {
            setEdges((es) => WorldGraph.updateEdge(es, id, label, color));
            setModal(null);
            pushToast(label ? `Relação selada: “${label}”` : "Relação atualizada");
            const source = nodes.find((node) => node.id === modalEdge.source);
            const target = nodes.find((node) => node.id === modalEdge.target);
            if (onCreateWikiRelation && source?.data.wikiPath && target?.data.label) {
              void onCreateWikiRelation(source.data.wikiPath, target.data.label, label)
                .then(() => pushToast('Relação sincronizada com a Wiki'))
                .catch((error) => pushToast(error instanceof Error ? error.message : 'Falha ao sincronizar relação', 'error'));
            }
          }}
          onDelete={(id) => {
            setEdges((es) => WorldGraph.removeEdge(es, id));
            setModal(null);
            pushToast("Laço desfeito");
          }}
        />
      )}

      {modal?.kind === "stats" && <StatsModal stats={stats} onClose={() => setModal(null)} />}

      {modal?.kind === "save" && (
        <SaveViewModal
          onClose={() => setModal(null)}
          onSave={(name) => {
            const positions: Record<string, { x: number; y: number }> = {};
            for (const n of nodes) {
              positions[n.id] = { x: n.position.x, y: n.position.y };
            }
            const v: SavedView = {
              id: uid("v"),
              name,
              ts: Date.now(),
              viewport: rf.getViewport(),
              hidden: [...hidden],
              isolate,
              nodePositions: positions,
              selectedNodeId: selectedId,
            };
            setSavedViews((vs) => {
              const updated = [v, ...vs];
              persistPayload({ v: 1, nodes, edges, customTypes, savedViews: updated });
              return updated;
            });
            setModal(null);
            pushToast(`Vista favoritada: ${name}`);
          }}
        />
      )}

      <Toasts items={toasts} />
    </div>
  );
}

export default function ArcanumGraph(props: ArcanumGraphProps) {
  return (
    <ReactFlowProvider>
      <ArcanumInner {...props} />
    </ReactFlowProvider>
  );
}
