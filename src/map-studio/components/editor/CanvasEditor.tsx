import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GEN,
  SHAPES,
  SIZES,
  T,
  TILE,
  clamp,
  terrainName,
  type GenParams,
  type MapData,
  type Tool,
  type ViewOpts,
} from "../lib/core";
import { generateMap } from "../lib/generate";
import { deserializeMap, serializeMap } from "../lib/io";
import { renderFull, renderRegion } from "../lib/render";
import { addArchObjects } from "../lib/archStamp";
import { Toolbar } from "./Toolbar"; // re-exported from panels.tsx
import { ToolbarZoomControls } from "./ToolbarZoomControls";

/**
 * CanvasEditor – componente que contém o canvas de desenho e as ferramentas.
 * Copiado e adaptado de `MAPA/src/App.tsx`.
 */
export function CanvasEditor() {
  // ---------- estado central ----------
  const [boot] = useState(() => {
    try {
      const raw = localStorage.getItem("atlas-arcano-v1");
      if (raw) return deserializeMap(raw);
    } catch {}
    return generateMap(DEFAULT_GEN, 48213, "Reino de Eldoria", "pergaminho");
  });
  const mapRef = useRef<MapData>(boot);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  // UI state
  const [tool, setTool] = useState<Tool>("brush");
  const [terrainId, setTerrainId] = useState<number>(T.GRASS);
  const [brushSize, setBrushSize] = useState(3);
  const [stampType, setStampType] = useState("tree");
  const [view, setView] = useState<ViewOpts>({ grid: false, frame: true, compass: true, title: true });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 60, y: 30 });

  // refs
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<null | {
    mode: "pan" | "paint" | "move";
    lx?: number;
    ly?: number;
    bx0?: number;
    by0?: number;
    bx1?: number;
    by1?: number;
    kind?: "obj" | "label";
    id?: number;
    ox?: number;
    oy?: number;
    moved?: boolean;
  }>(null);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const spaceRef = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  // ---------- helpers ----------
  const toMap = (e: { clientX: number; clientY: number }) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const p = pan;
    const z = zoom;
    return {
      x: (e.clientX - rect.left - p.x) / z / TILE,
      y: (e.clientY - rect.top - p.y) / z / TILE,
    };
  };

  const paintAt = (x: number, y: number) => {
    const m = mapRef.current;
    const r = brushSize / 2;
    const nt = tool === "eraser" ? T.VOID : terrainId;
    let changed = false;
    let lx0 = 999, ly0 = 999, lx1 = -1, ly1 = -1;
    for (let ty = Math.floor(y - r - 0.5); ty <= Math.floor(y + r + 0.5); ty++) {
      for (let tx = Math.floor(x - r - 0.5); tx <= Math.floor(x + r + 0.5); tx++) {
        if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
        const dx = tx + 0.5 - x;
        const dy = ty + 0.5 - y;
        if (dx * dx + dy * dy > r * r + 0.01) continue;
        const idx = ty * m.w + tx;
        if (m.terrain[idx] !== nt) {
          m.terrain[idx] = nt;
          changed = true;
          if (tx < lx0) lx0 = tx;
          if (ty < ly0) ly0 = ty;
          if (tx > lx1) lx1 = tx;
          if (ty > ly1) ly1 = ty;
        }
      }
    }
    if (changed && offRef.current) {
      const ctx = offRef.current.getContext("2d")!;
      renderRegion(ctx, m, view, TILE, lx0 - 2, ly0 - 2, lx1 + 3, ly1 + 3);
    }
    return changed ? { x0: lx0, y0: ly0, x1: lx1, y1: ly1 } : null;
  };

  const floodFill = (tx: number, ty: number) => {
    const m = mapRef.current;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return;
    const target = m.terrain[ty * m.w + tx];
    const repl = terrainId;
    if (target === repl) return;
    const stack: number[] = [tx, ty];
    m.terrain[ty * m.w + tx] = repl;
    while (stack.length) {
      const cy = stack.pop()!;
      const cx = stack.pop()!;
      const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (const [nx2, ny2] of nb) {
        if (nx2 < 0 || ny2 < 0 || nx2 >= m.w || ny2 >= m.h) continue;
        const idx = ny2 * m.w + nx2;
        if (m.terrain[idx] === target) {
          m.terrain[idx] = repl;
          stack.push(nx2, ny2);
        }
      }
    }
    bump();
  };

  // ---------- render ----------
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const stage = stageRef.current;
    const off = offRef.current;
    if (!cv || !stage) return;
    const dpr = window.devicePixelRatio || 1;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = W + "px";
      cv.style.height = H + "px";
    }
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const z = zoom;
    const p = pan;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * p.x, dpr * p.y);
    ctx.imageSmoothingEnabled = z < 1.6;
    if (off) ctx.drawImage(off, 0, 0);
    const hv = hoverRef.current;
    const lw = 1.4 / z;
    ctx.lineWidth = lw;
    if (hv && hv.x >= 0 && hv.y >= 0 && hv.x <= mapRef.current.w && hv.y <= mapRef.current.h && !spaceRef.current && tool !== "pan") {
      ctx.strokeStyle = tool === "eraser" ? "rgba(207,90,58,0.95)" : "rgba(227,189,96,0.95)";
      ctx.setLineDash([5 / z, 4 / z]);
      ctx.beginPath();
      ctx.arc(hv.x * TILE, hv.y * TILE, (brushSize / 2) * TILE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(hv.x * TILE, hv.y * TILE, 1.2 / z, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [tool, brushSize, zoom]);

  // ---------- effects ----------
  useEffect(() => {
    offRef.current = renderFull(mapRef.current, view);
    bump();
  }, [tick, view]);

  useEffect(() => {
    draw();
  }, [draw, tick, view, zoom, pan]);

  // autosave
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem("atlas-arcano-v1", serializeMap(mapRef.current));
      } catch {}
    }, 700);
    return () => window.clearTimeout(saveTimer.current);
  }, [tick]);

  // pointer handling
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mpt = toMap(e);
    if (e.button === 1 || spaceRef.current || tool === "pan") {
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y } as any;
      return;
    }
    if (e.button !== 0) return;
    if (tool === "brush" || tool === "eraser") {
      const bb = paintAt(mpt.x, mpt.y);
      dragRef.current = { mode: "paint", lx: mpt.x, ly: mpt.y, bx0: bb?.x0 ?? 999, by0: bb?.y0 ?? 999, bx1: bb?.x1 ?? -1, by1: bb?.y1 ?? -1 } as any;
    } else if (tool === "fill") {
      floodFill(Math.floor(mpt.x), Math.floor(mpt.y));
    } else if (tool === "stamp") {
      const m = mapRef.current;
      m.objects.push({
        id: Date.now() % 1e9 + Math.floor(Math.random() * 999),
        type: stampType,
        x: mpt.x,
        y: mpt.y,
        s: 0.95,
        r: 0,
        v: 0,
      });
      bump();
    } else if (tool === "label") {
      const m = mapRef.current;
      const id = Date.now() % 1e9 + Math.floor(Math.random() * 999);
      m.labels.push({ id, text: "Novo Lugar", x: mpt.x, y: mpt.y, size: 2.4, color: "", font: "serif" });
      bump();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mpt = toMap(e);
    hoverRef.current = mpt;
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "pan") {
      setPan({ x: d.px! + (e.clientX - d.sx!), y: d.py! + (e.clientY - d.sy!) });
    } else if (d.mode === "paint") {
      const dx = mpt.x - d.lx!;
      const dy = mpt.y - d.ly!;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 0.3));
      for (let i = 1; i <= steps; i++) {
        const bb = paintAt(d.lx! + (dx * i) / steps, d.ly! + (dy * i) / steps);
        if (bb) {
          d.bx0 = Math.min(d.bx0!, bb.x0);
          d.by0 = Math.min(d.by0!, bb.y0);
          d.bx1 = Math.max(d.bx1!, bb.x1);
          d.by1 = Math.max(d.by1!, bb.y1);
        }
      }
      d.lx = mpt.x;
      d.ly = mpt.y;
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // ---------- UI ----------
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-1 bg-ink-900 border-b border-ink-700">
        <Toolbar tool={tool} setTool={setTool} brushSize={brushSize} setBrushSize={setBrushSize} />
        <ToolbarZoomControls
          zoom={zoom}
          setZoom={setZoom}
          resetFocus={() => {
            const stage = stageRef.current;
            if (!stage) return;
            const m = mapRef.current;
            const z = Math.min((stage.clientWidth - 56) / (m.w * TILE), (stage.clientHeight - 56) / (m.h * TILE));
            setZoom(z);
            setPan({ x: (stage.clientWidth - m.w * TILE * z) / 2, y: (stage.clientHeight - m.h * TILE * z) / 2 });
          }}
        />
      </div>
      <div ref={stageRef} className="relative flex-1 overflow-hidden" style={{ cursor: tool === "pan" ? "grab" : "crosshair" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
    </div>
  );
}
