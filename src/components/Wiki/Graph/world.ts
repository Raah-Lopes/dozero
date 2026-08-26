import { MarkerType, type Viewport } from "@xyflow/react";
import { TypeRegistry, uid, type NodeShape, type RPGFicha, type SavedView, type TypeReg, type WEdge, type WNode } from "./core";

/* ============================================================
 * WorldGraph — operações puras sobre o grafo (imutáveis)
 * Pathfinder — caminhos mínimos entre nós (BFS)
 * Layouts — radial (foco) e constelações por camada
 * ForceSimulator — física orgânica opcional
 * StatsEngine — radiografia completa do mundo RPG
 * Vault — persistência local e banco de dados JSON completo
 * ============================================================ */

export const DEFAULT_EDGE_COLOR = "#d8b45a";

export class WorldGraph {
  static createNode(
    typeId: string,
    x: number,
    y: number,
    type: TypeReg,
    label = "Novo nó",
    tags: string[] = [],
    ficha?: RPGFicha,
    summary = "",
    shape?: NodeShape,
    wikiPath?: string
  ): WNode {
    return {
      id: uid("n"),
      type: "world",
      position: { x, y },
      data: {
        label,
        typeId,
        summary,
        icon: type.icon,
        shape: shape || type.shape || "circle",
        tags,
        ficha: ficha ?? { status: "Ativo" },
        wikiPath,
      },
    };
  }

  static createEdge(source: string, target: string, label = "", color = DEFAULT_EDGE_COLOR, wikiSourcePath?: string): WEdge {
    return {
      id: uid("e"),
      source,
      target,
      type: "world",
      data: { label, color, wikiSourcePath },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    };
  }

  static updateNode(nodes: WNode[], id: string, patch: Partial<WNode["data"]>): WNode[] {
    return nodes.map((n) => {
      if (n.id !== id) return n;
      return {
        ...n,
        data: {
          ...n.data,
          ...patch,
          ficha: patch.ficha ? { ...(n.data.ficha ?? {}), ...patch.ficha } : n.data.ficha,
        },
      };
    });
  }

  static updateEdge(edges: WEdge[], id: string, label: string, color: string): WEdge[] {
    return edges.map((e) =>
      e.id === id
        ? { ...e, data: { ...e.data, label, color }, markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 } }
        : e
    );
  }

  static removeNode(nodes: WNode[], edges: WEdge[], id: string): { nodes: WNode[]; edges: WEdge[] } {
    return {
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
    };
  }

  static removeEdge(edges: WEdge[], id: string): WEdge[] {
    return edges.filter((e) => e.id !== id);
  }

  static degree(nodes: WNode[], edges: WEdge[]): Map<string, number> {
    const deg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    for (const e of edges) {
      deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
      deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
    }
    return deg;
  }
}

/* ---------- Pathfinder ---------- */

export interface PathResult {
  nodeIds: string[];
  edgeIds: string[];
}

export class Pathfinder {
  static shortest(nodes: WNode[], edges: WEdge[], fromId: string, toId: string): PathResult | null {
    if (fromId === toId) return { nodeIds: [fromId], edgeIds: [] };
    const adj = new Map<string, { to: string; edgeId: string }[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.source)?.push({ to: e.target, edgeId: e.id });
      adj.get(e.target)?.push({ to: e.source, edgeId: e.id });
    }
    const prev = new Map<string, { node: string; edge: string }>();
    const seen = new Set<string>([fromId]);
    const queue: string[] = [fromId];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === toId) break;
      for (const { to, edgeId } of adj.get(cur) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        prev.set(to, { node: cur, edge: edgeId });
        queue.push(to);
      }
    }
    if (!seen.has(toId)) return null;
    const nodeIds: string[] = [toId];
    const edgeIds: string[] = [];
    let cur = toId;
    while (cur !== fromId) {
      const p = prev.get(cur)!;
      edgeIds.unshift(p.edge);
      nodeIds.unshift(p.node);
      cur = p.node;
    }
    return { nodeIds, edgeIds };
  }
}

/* ---------- Layouts ---------- */

export class Layouts {
  /** Constelações por camada: distribuição orbital limpa e bem espaçada. */
  static clusterByType(nodes: WNode[], typeOrder: string[]): WNode[] {
    const groups = new Map<string, WNode[]>();
    for (const n of nodes) {
      const typeId = n.data?.typeId ?? "conceito";
      const list = groups.get(typeId) ?? [];
      list.push(n);
      groups.set(typeId, list);
    }
    const extraKeys = [...groups.keys()].filter((k) => !typeOrder.includes(k));
    const present = [...typeOrder.filter((t) => groups.has(t)), ...extraKeys];
    const result: WNode[] = [];
    const total = Math.max(present.length, 1);
    present.forEach((typeId, gi) => {
      const ring = gi % 2;
      const R = 560 + ring * 300 + total * 18;
      const ang = (gi / total) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(ang) * R * 1.2;
      const cy = Math.sin(ang) * R * 0.85;
      const members = groups.get(typeId) ?? [];
      members.forEach((n, k) => {
        const r = 135 * Math.sqrt(k + 1);
        const th = k * 2.39996 + gi * 1.7;
        result.push({ ...n, position: { x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r } });
      });
    });
    return result;
  }

  /** Foco radial: o nó escolhido vira o coração; os demais orbitam por distância de conexão. */
  static radialFocus(nodes: WNode[], edges: WEdge[], centerId: string): WNode[] {
    const center = nodes.find((n) => n.id === centerId);
    if (!center) return nodes;
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    }
    const dist = new Map<string, number>([[centerId, 0]]);
    const queue: string[] = [centerId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nx of adj.get(cur) ?? []) {
        if (!dist.has(nx)) {
          dist.set(nx, dist.get(cur)! + 1);
          queue.push(nx);
        }
      }
    }
    let maxD = 0;
    dist.forEach((d) => (maxD = Math.max(maxD, d)));
    const layers = new Map<number, WNode[]>();
    for (const n of nodes) {
      if (n.id === centerId) continue;
      const d = dist.get(n.id) ?? maxD + 1;
      const list = layers.get(d) ?? [];
      list.push(n);
      layers.set(d, list);
    }
    const cx = center.position.x;
    const cy = center.position.y;
    const pos = new Map<string, { x: number; y: number }>();
    for (const [d, members] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
      const radius = d <= maxD ? 260 * d : 260 * (maxD + 1) + 200;
      members.forEach((n, i) => {
        const th = (i / members.length) * Math.PI * 2 + d * 0.55 - Math.PI / 2;
        pos.set(n.id, { x: cx + Math.cos(th) * radius, y: cy + Math.sin(th) * radius * 0.92 });
      });
    }
    return nodes.map((n) => {
      const p = pos.get(n.id);
      return p ? { ...n, position: p } : n;
    });
  }
}

/* ---------- Física Orgânica ---------- */

export class ForceSimulator {
  alpha = 1;

  reheat(a = 1) {
    this.alpha = a;
  }

  cooled() {
    return this.alpha < 0.02;
  }

  tick(nodes: WNode[], edges: WEdge[]): WNode[] {
    if (this.cooled()) return nodes;
    this.alpha *= 0.95;
    const disp = new Map<string, { x: number; y: number }>();
    for (const n of nodes) disp.set(n.id, { x: 0, y: 0 });

    // repulsão suave entre todos os pares
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.position.x - b.position.x;
        let dy = a.position.y - b.position.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d2 = 1;
        }
        const d = Math.sqrt(d2);
        const f = Math.min(36000 / d2, 18);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        disp.get(a.id)!.x += fx;
        disp.get(a.id)!.y += fy;
        disp.get(b.id)!.x -= fx;
        disp.get(b.id)!.y -= fy;
      }
    }
    // molas equilibradas nas relações
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (d - 220) * 0.015;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      disp.get(a.id)!.x += fx;
      disp.get(a.id)!.y += fy;
      disp.get(b.id)!.x -= fx;
      disp.get(b.id)!.y -= fy;
    }
    return nodes.map((n) => {
      if (n.dragging || n.selected) return n;
      const d = disp.get(n.id)!;
      return {
        ...n,
        position: {
          x: n.position.x + d.x * this.alpha,
          y: n.position.y + d.y * this.alpha,
        },
      };
    });
  }
}

/* ---------- Estatísticas ---------- */

export interface WorldStats {
  nodeCount: number;
  edgeCount: number;
  density: number;
  components: number;
  byType: { type: TypeReg; count: number }[];
  topNodes: { id: string; label: string; deg: number; color: string }[];
  byRelation: { label: string; count: number }[];
  topTags: { tag: string; count: number }[];
}

export class StatsEngine {
  static compute(nodes: WNode[], edges: WEdge[], registry: TypeRegistry): WorldStats {
    const deg = WorldGraph.degree(nodes, edges);
    const counts = new Map<string, number>();
    const tagCounts = new Map<string, number>();

    for (const n of nodes) {
      counts.set(n.data.typeId, (counts.get(n.data.typeId) ?? 0) + 1);
      for (const t of n.data.tags ?? []) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }

    const byType = registry
      .all()
      .filter((t) => counts.has(t.id))
      .map((t) => ({ type: t, count: counts.get(t.id)! }))
      .sort((a, b) => b.count - a.count);

    const topNodes = nodes
      .map((n) => ({ id: n.id, label: n.data.label, deg: deg.get(n.id) ?? 0, color: registry.get(n.data.typeId).color }))
      .sort((a, b) => b.deg - a.deg)
      .slice(0, 6);

    const rel = new Map<string, number>();
    for (const e of edges) {
      const l = e.data?.label?.trim() || "sem nome";
      rel.set(l, (rel.get(l) ?? 0) + 1);
    }
    const byRelation = [...rel.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);

    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // componentes conexos
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    }
    const seen = new Set<string>();
    let components = 0;
    for (const n of nodes) {
      if (seen.has(n.id)) continue;
      components++;
      const q = [n.id];
      seen.add(n.id);
      while (q.length) {
        const c = q.shift()!;
        for (const nx of adj.get(c) ?? []) {
          if (!seen.has(nx)) {
            seen.add(nx);
            q.push(nx);
          }
        }
      }
    }

    const n = nodes.length;
    const density = n > 1 ? (2 * edges.length) / (n * (n - 1)) : 0;
    return { nodeCount: n, edgeCount: edges.length, density, components, byType, topNodes, byRelation, topTags };
  }
}

/* ---------- Persistência e Banco de Dados JSON ---------- */

export interface VaultPayload {
  v: number;
  nodes: WNode[];
  edges: WEdge[];
  customTypes: TypeReg[];
  savedViews: SavedView[];
}

export class Vault {
  static KEY = "dozero:arcanum:world:v1";

  static save(payload: VaultPayload) {
    try {
      const clean: VaultPayload = {
        ...payload,
        nodes: payload.nodes.map((n) => ({
          ...n,
          selected: false,
          data: {
            label: n.data.label,
            typeId: n.data.typeId,
            summary: n.data.summary,
            icon: n.data.icon,
            image: n.data.image,
            tint: n.data.tint,
            shape: n.data.shape,
            tags: n.data.tags ?? [],
            ficha: n.data.ficha,
            wikiPath: n.data.wikiPath,
          },
        })),
        edges: payload.edges.map((e) => ({
          ...e,
          data: {
            label: e.data?.label ?? "",
            color: e.data?.color ?? DEFAULT_EDGE_COLOR,
            wikiSourcePath: e.data?.wikiSourcePath,
          },
        })),
      };
      localStorage.setItem(Vault.KEY, JSON.stringify(clean));
    } catch {
      /* armazenamento indisponível */
    }
  }

  static load(): VaultPayload | null {
    try {
      const raw = localStorage.getItem(Vault.KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as VaultPayload;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  static exportJSON(payload: VaultPayload) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `dozero-arcanum-grafo-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  static clear() {
    try {
      localStorage.removeItem(Vault.KEY);
    } catch {
      /* noop */
    }
  }
}

export type { Viewport };
