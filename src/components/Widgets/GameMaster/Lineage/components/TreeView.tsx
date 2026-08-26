import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FamilyTree, Person } from "../model/tree";
import { clamp } from "../lib/utils";
import { PersonCard } from "./PersonCard";
import { VisualRelationPicker } from "./VisualRelationPicker";
import type { KinshipKind } from "./Modals";
import { BrandSigil, IconFit, IconPlus, IconSpark, IconZoomIn, IconZoomOut } from "./icons";

export const CARD_W = 224;
export const CARD_H = 330;
const COUPLE_GAP = 36;
const SIBLING_GAP = 56;
const ROW_GAP = 96;
const PAD = 90;

interface Unit {
  head: Person;
  partner: Person | null;
  children: Unit[];
  width: number;
}

interface Placed {
  x: number;
  y: number;
  depth: number;
}

interface CoupleLine {
  x1: number;
  y1: number;
  x2: number;
}

interface RelationLine {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color: string;
  dash: string;
}

interface Layout {
  placed: Map<string, Placed>;
  coupleLines: CoupleLine[];
  childPaths: string[];
  relationLines: RelationLine[];
  width: number;
  height: number;
}

export interface TreeViewProps {
  tree: FamilyTree;
  selectedId: string | null;
  matchedIds: Set<string> | null;
  focus: { id: string; n: number } | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddPartner: (id: string) => void;
  onAddExtendedRelation: (sourceId: string, relation: KinshipKind) => void;
  onAddFounder: () => void;
  onLoadSample: () => void;
}

function buildLayout(tree: FamilyTree): Layout {
  const persons = tree.all();
  const valid = (id: string) => tree.has(id);

  const noParents = persons.filter((p) => !p.parentIds.some(valid));
  const noParentIds = new Set(noParents.map((p) => p.id));
  const attachedTo = new Map<string, string>();

  // 1) fundadores sem linhagem anexam-se ao parceiro que tem linhagem
  for (const p of noParents) {
    const anchor = p.partnerIds
      .map((id) => tree.get(id))
      .find((q) => q && q.parentIds.some(valid));
    if (anchor) attachedTo.set(p.id, anchor.id);
  }
  // 2) casais fundadores viram uma única unidade
  for (const p of noParents) {
    if (attachedTo.has(p.id)) continue;
    for (const qid of p.partnerIds) {
      if (!noParentIds.has(qid) || attachedTo.has(qid)) continue;
      attachedTo.set(qid, p.id);
      break;
    }
  }

  const roots = noParents.filter((p) => !attachedTo.has(p.id));

  const kidsOf = new Map<string, Person[]>();
  for (const p of persons) {
    for (const pid of p.parentIds.filter(valid)) {
      const arr = kidsOf.get(pid) ?? [];
      arr.push(p);
      kidsOf.set(pid, arr);
    }
  }
  for (const arr of kidsOf.values()) {
    arr.sort((a, b) => a.birthOrder - b.birthOrder || a.createdAt - b.createdAt);
  }

  const buildUnit = (head: Person, seen: Set<string>): Unit => {
    seen.add(head.id);
    let partner: Person | null = null;
    for (const [a, h] of attachedTo) {
      if (h === head.id) {
        partner = tree.get(a) ?? null;
        break;
      }
    }
    const memberIds = partner ? [head.id, partner.id] : [head.id];
    const seenKids = new Map<string, Person>();
    for (const mid of memberIds) {
      for (const k of kidsOf.get(mid) ?? []) {
        if (!seen.has(k.id)) seenKids.set(k.id, k);
      }
    }
    const kids = [...seenKids.values()];
    kids.forEach((k) => seen.add(k.id));
    return {
      head,
      partner,
      children: kids.map((k) => buildUnit(k, new Set(seen))),
      width: 0,
    };
  };

  const units = roots.map((r) => buildUnit(r, new Set()));

  // ---- medida ----
  const measure = (u: Unit): number => {
    const contentW = u.partner ? CARD_W * 2 + COUPLE_GAP : CARD_W;
    const kidsW =
      u.children.reduce((s, c) => s + measure(c), 0) +
      Math.max(0, u.children.length - 1) * SIBLING_GAP;
    u.width = Math.max(contentW, kidsW);
    return u.width;
  };
  units.forEach(measure);

  // ---- posicionamento ----
  const placed = new Map<string, Placed>();
  const coupleLines: CoupleLine[] = [];
  const childPaths: string[] = [];

  const place = (u: Unit, cx: number, depth: number) => {
    const contentW = u.partner ? CARD_W * 2 + COUPLE_GAP : CARD_W;
    const headX = cx - contentW / 2;
    const y = PAD + depth * (CARD_H + ROW_GAP);
    placed.set(u.head.id, { x: PAD + headX, y, depth });
    if (u.partner) {
      const px = headX + CARD_W + COUPLE_GAP;
      placed.set(u.partner.id, { x: PAD + px, y, depth });
      coupleLines.push({ x1: PAD + headX + CARD_W, y1: y + 74, x2: PAD + px });
    }
    if (u.children.length > 0) {
      const kidsW =
        u.children.reduce((s, c) => s + c.width, 0) +
        (u.children.length - 1) * SIBLING_GAP;
      let x = cx - kidsW / 2;
      const py = y + CARD_H;
      const busY = py + 44;
      const pcx = PAD + cx;
      for (const c of u.children) {
        const childCx = x + c.width / 2;
        const ccx = PAD + childCx;
        childPaths.push(
          `M ${pcx} ${py} L ${pcx} ${busY} L ${ccx} ${busY} L ${ccx} ${py + ROW_GAP}`,
        );
        place(c, childCx, depth + 1);
        x += c.width + SIBLING_GAP;
      }
    }
  };

  const totalW = units.reduce((s, u) => s + u.width, 0) + Math.max(0, units.length - 1) * SIBLING_GAP * 2;
  let cx = -totalW / 2;
  for (const u of units) {
    place(u, cx + u.width / 2, 0);
    cx += u.width + SIBLING_GAP * 2;
  }

  // ---- Cálculo de linhas de relações sociais (amantes, amigos, inimigos, etc.) ----
  const relationLines: RelationLine[] = [];
  const processedRelations = new Set<string>();

  const RELATION_STYLES: Record<string, { color: string; dash: string; label: string }> = {
    amante: { color: "#f43f5e", dash: "5 4", label: "Amante" },
    amigo: { color: "#10b981", dash: "6 4", label: "Aliado" },
    inimigo: { color: "#ef4444", dash: "3 3", label: "Inimigo" },
    rival: { color: "#f59e0b", dash: "4 4", label: "Rival" },
    mentor: { color: "#3b82f6", dash: "6 3", label: "Mentor" },
    discipulo: { color: "#06b6d4", dash: "6 3", label: "Discípulo" },
    jurado: { color: "#a855f7", dash: "5 5", label: "Jurado" },
  };

  for (const p of persons) {
    for (const rel of p.relations) {
      const pairKey = [p.id, rel.targetId].sort().join("<->");
      if (processedRelations.has(pairKey)) continue;
      processedRelations.add(pairKey);

      const posA = placed.get(p.id);
      const posB = placed.get(rel.targetId);
      if (!posA || !posB) continue;

      const style = RELATION_STYLES[rel.type] ?? { color: "#c9a227", dash: "4 4", label: rel.type };

      // Conecta os centros laterais ou superior/inferior dos cards
      const x1 = posA.x + CARD_W / 2;
      const y1 = posA.y + CARD_H / 2;
      const x2 = posB.x + CARD_W / 2;
      const y2 = posB.y + CARD_H / 2;

      relationLines.push({
        id: pairKey,
        sourceId: p.id,
        targetId: rel.targetId,
        type: rel.type,
        x1,
        y1,
        x2,
        y2,
        label: style.label,
        color: style.color,
        dash: style.dash,
      });
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of placed.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + CARD_W);
    maxY = Math.max(maxY, p.y + CARD_H);
  }
  const has = placed.size > 0;

  return {
    placed,
    coupleLines,
    childPaths,
    relationLines,
    width: has ? maxX + PAD : 0,
    height: has ? maxY + PAD : 0,
  };
}

/* ================= componente ================= */

export interface TreeViewProps {
  tree: FamilyTree;
  selectedId: string | null;
  matchedIds: Set<string> | null;
  focus: { id: string; n: number } | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddPartner: (id: string) => void;
  onAddFounder: () => void;
  onLoadSample: () => void;
}

export function TreeView({
  tree,
  selectedId,
  matchedIds,
  focus,
  onSelect,
  onEdit,
  onAddChild,
  onAddPartner,
  onAddExtendedRelation,
  onAddFounder,
  onLoadSample,
}: TreeViewProps) {
  const layout = useMemo(() => buildLayout(tree), [tree]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 60, y: 40, k: 1 });
  const [smooth, setSmooth] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, ox: 0, oy: 0, moved: false });
  const didFit = useRef(false);
  const prevCount = useRef(tree.size);
  const smoothTimer = useRef<number | null>(null);

  // Estado do Picker Visual Interativo
  const [pickerState, setPickerState] = useState<{
    personId: string;
    direction: "top" | "bottom" | "left" | "right";
  } | null>(null);

  const [, setHoveredCardId] = useState<string | null>(null);

  const glide = (next: { x: number; y: number; k: number }) => {
    setSmooth(true);
    setView(next);
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    smoothTimer.current = window.setTimeout(() => setSmooth(false), 480);
  };

  const fit = () => {
    const el = containerRef.current;
    if (!el || layout.width === 0) return;
    const r = el.getBoundingClientRect();
    const k = clamp(Math.min((r.width - 100) / layout.width, (r.height - 110) / layout.height), 0.3, 1);
    glide({
      k,
      x: (r.width - layout.width * k) / 2,
      y: Math.max(24, (r.height - layout.height * k) / 2),
    });
  };

  // enquadra na primeira carga e quando a árvore nasce do zero
  useLayoutEffect(() => {
    if (tree.size > 0 && (!didFit.current || (prevCount.current === 0 && tree.size > 0))) {
      didFit.current = true;
      fit();
    }
    prevCount.current = tree.size;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  // zoom com a roda (listener nativo para permitir preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setView((v) => {
        const k2 = clamp(v.k * Math.exp(-e.deltaY * 0.0013), 0.3, 1.6);
        return { k: k2, x: mx - ((mx - v.x) * k2) / v.k, y: my - ((my - v.y) * k2) / v.k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // centraliza no foco solicitado (busca / criação)
  useEffect(() => {
    if (!focus) return;
    const p = layout.placed.get(focus.id);
    const el = containerRef.current;
    if (!p || !el) return;
    const r = el.getBoundingClientRect();
    const k = clamp(Math.max(view.k, 0.85), 0.3, 1.6);
    glide({
      k,
      x: r.width / 2 - (p.x + CARD_W / 2) * k,
      y: r.height / 2 - (p.y + CARD_H / 2) * k,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = r.width / 2;
    const my = r.height / 2;
    setView((v) => {
      const k2 = clamp(v.k * factor, 0.3, 1.6);
      return { k: k2, x: mx - ((mx - v.x) * k2) / v.k, y: my - ((my - v.y) * k2) / v.k };
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-card], [data-picker], button")) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
    setDragging(true);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const d = dragRef.current;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
  };
  const onPointerUp = () => {
    if (dragging && !dragRef.current.moved) {
      onSelect(null);
      setPickerState(null);
    }
    setDragging(false);
  };

  const matchCount = matchedIds ? matchedIds.size : 0;
  let cardIndex = 0;

  const onCardClick = (id: string) => {
    onSelect(id);
    const p = layout.placed.get(id);
    const el = containerRef.current;
    if (p && el) {
      const r = el.getBoundingClientRect();
      const targetK = clamp(Math.max(view.k, 1), 0.7, 1.4);
      glide({
        k: targetK,
        x: r.width / 2 - (p.x + CARD_W / 2) * targetK,
        y: r.height / 2 - (p.y + CARD_H / 2) * targetK,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-grid relative h-full w-full touch-none select-none overflow-hidden ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {tree.size > 0 && (
        <div
          className={smooth ? "view-smooth absolute left-0 top-0" : "absolute left-0 top-0"}
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: "0 0",
          }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute left-0 top-0 overflow-visible"
            aria-hidden
          >
            {layout.childPaths.map((d, i) => (
              <path
                key={`c${i}`}
                d={d}
                pathLength={1}
                className="bond-line"
                stroke="rgba(201,162,39,0.38)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {layout.coupleLines.map((l, i) => (
              <g key={`p${i}`}>
                <line
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y1}
                  pathLength={1}
                  className="bond-line couple-line"
                  stroke="rgba(201,162,39,0.55)"
                  strokeWidth={2}
                />
                <rect
                  x={(l.x1 + l.x2) / 2 - 3.4}
                  y={l.y1 - 3.4}
                  width={6.8}
                  height={6.8}
                  transform={`rotate(45 ${(l.x1 + l.x2) / 2} ${l.y1})`}
                  fill="#c9a227"
                  opacity={0.9}
                />
              </g>
            ))}

            {/* Linhas de Relações Interpessoais (Amantes, Amigos, Inimigos, Mentores, etc.) */}
            {layout.relationLines.map((rel) => {
              // Curva quadrática Bézier para criar um arco elegante
              const midX = (rel.x1 + rel.x2) / 2;
              const midY = (rel.y1 + rel.y2) / 2 - 40; // eleva o ponto de controle
              const d = `M ${rel.x1} ${rel.y1} Q ${midX} ${midY} ${rel.x2} ${rel.y2}`;
              return (
                <g key={`rel-${rel.id}`} className="transition-opacity duration-300">
                  <path
                    d={d}
                    fill="none"
                    stroke={rel.color}
                    strokeWidth={1.8}
                    strokeDasharray={rel.dash}
                    strokeOpacity={0.8}
                    className="hover:stroke-width-2"
                  />
                  <circle cx={rel.x1} cy={rel.y1} r={3.5} fill={rel.color} />
                  <circle cx={rel.x2} cy={rel.y2} r={3.5} fill={rel.color} />
                  {/* Badge no meio do arco */}
                  <g transform={`translate(${midX}, ${midY + 12})`}>
                    <rect
                      x={-rel.label.length * 4 - 6}
                      y={-8}
                      width={rel.label.length * 8 + 12}
                      height={16}
                      rx={3}
                      fill="#0e140f"
                      stroke={rel.color}
                      strokeWidth={1}
                      fillOpacity={0.92}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={rel.color}
                      fontSize={9.5}
                      fontFamily="inherit"
                      fontWeight="bold"
                      letterSpacing="0.05em"
                    >
                      {rel.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Cards da Árvore */}
          {[...layout.placed.entries()].map(([id, pos]) => {
            const person = tree.get(id);
            if (!person) return null;
            const idx = cardIndex++;
            const dimmed = matchedIds !== null && !matchedIds.has(id);
            return (
              <div
                key={id}
                className="absolute left-0 top-0 will-change-transform"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                onMouseEnter={() => {
                  if (!pickerState) setHoveredCardId(id);
                }}
                onMouseLeave={() => {
                  if (!pickerState) setHoveredCardId((prev) => (prev === id ? null : prev));
                }}
              >
                <PersonCard
                  person={person}
                  generation={pos.depth + 1}
                  partnerCount={tree.partnersOf(id).length}
                  childCount={tree.childrenOf(id).length}
                  selected={selectedId === id}
                  dimmed={dimmed}
                  matched={matchedIds?.has(id) ?? false}
                  enterDelay={Math.min(pos.depth * 70 + idx * 22, 420)}
                  actions={{
                    onSelect: onCardClick,
                    onEdit,
                    onAddChild,
                    onAddPartner,
                    onOpenRelationPicker: (pid, direction = "top") => {
                      setPickerState({ personId: pid, direction });
                      const p = layout.placed.get(pid);
                      const el = containerRef.current;
                      if (p && el) {
                        const r = el.getBoundingClientRect();
                        const targetK = clamp(Math.max(view.k, 1.05), 0.85, 1.4);
                        // Centraliza compensando a altura da caixa acima do card
                        const offsetY = direction === "top" ? -120 : 0;
                        glide({
                          k: targetK,
                          x: r.width / 2 - (p.x + CARD_W / 2) * targetK,
                          y: r.height / 2 - (p.y + CARD_H / 2 + offsetY) * targetK,
                        });
                      }
                    },
                  }}
                />

                {/* Balão / Seletor de Parentes Visual - sempre exibido acima do card de forma destacada */}
                {pickerState?.personId === id && (
                  <div
                    className={`absolute z-[100] ${
                      pickerState.direction === "left"
                        ? "top-1/2 -left-4 -translate-x-full -translate-y-1/2"
                        : pickerState.direction === "right"
                        ? "top-1/2 -right-4 translate-x-full -translate-y-1/2"
                        : "-top-4 left-1/2 -translate-x-1/2 -translate-y-full"
                    }`}
                  >
                    <VisualRelationPicker
                      person={person}
                      direction={pickerState.direction}
                      onSelectRelation={(rel) => {
                        onAddExtendedRelation(person.id, rel);
                        setPickerState(null);
                      }}
                      onClose={() => setPickerState(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* estado vazio */}
      {tree.size === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="float-slow opacity-90">
            <BrandSigil size={104} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wide text-parchment">
              Sua lenda começa com um nome
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Erga o fundador de uma dinastia, depois teça casamentos, herdeiros e
              bastardos — cada card guarda retrato, afiliação e notas de campanha.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onAddFounder}
              className="inline-flex items-center gap-2 rounded-md bg-brass px-4 py-2.5 font-display text-sm font-bold tracking-wide text-ink-950 shadow-[0_6px_20px_rgba(201,162,39,0.3)] transition-all hover:-translate-y-0.5 hover:bg-brass-bright"
            >
              <IconPlus size={16} /> Criar fundador
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-ink-850/80 px-4 py-2.5 font-display text-sm font-bold tracking-wide text-parchment-dim transition-all hover:-translate-y-0.5 hover:border-brass/50 hover:text-brass-bright"
            >
              <IconSpark size={16} /> Carregar a Casa Valdris
            </button>
          </div>
        </div>
      )}

      {/* contador de busca */}
      {matchedIds && tree.size > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-md border border-brass/40 bg-ink-900/90 px-3 py-1.5 text-xs font-medium text-brass-bright shadow-lg backdrop-blur-sm panel-enter">
          {matchCount === 0
            ? "Nenhum registro encontrado"
            : `${matchCount} registro${matchCount > 1 ? "s" : ""} encontrado${matchCount > 1 ? "s" : ""}`}
        </div>
      )}

      {/* controles de zoom */}
      {tree.size > 0 && (
        <div className="absolute bottom-4 right-4 flex flex-col items-stretch gap-1 rounded-md border border-line bg-ink-900/90 p-1 shadow-xl backdrop-blur-sm">
          <ZoomBtn label="Aproximar" onClick={() => zoomBy(1.25)}>
            <IconZoomIn size={15} />
          </ZoomBtn>
          <ZoomBtn label="Afastar" onClick={() => zoomBy(0.8)}>
            <IconZoomOut size={15} />
          </ZoomBtn>
          <ZoomBtn label="Enquadrar árvore" onClick={fit}>
            <IconFit size={15} />
          </ZoomBtn>
          <span className="pt-0.5 text-center text-[10px] font-bold tabular-nums text-muted">
            {Math.round(view.k * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function ZoomBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-sm border border-transparent p-1.5 text-parchment-dim transition-colors hover:border-brass/40 hover:bg-brass/10 hover:text-brass-bright"
    >
      {children}
    </button>
  );
}
