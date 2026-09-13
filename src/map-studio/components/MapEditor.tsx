import { useRef, useState, useEffect, useMemo } from "react";
import { Maximize2 } from "lucide-react";
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { getLocationFocusScale } from "../utils/mapViewport";
import {
  getMapSymbol,
  isFocusSymbol,
  mapSymbolGroups,
} from "../utils/mapSymbols";
import { MapProject, MapLocation, MapAnnotation, Tool } from "../types";
import {
  AnnotationShape,
  Grid,
  layerOf,
  layers,
  MapPatterns,
  orderedAnnotations,
} from "./MapDrawing";
import { importMapImage } from "../utils/importImage";
import TiledImage from "./TiledImage";
import { snapGridPoint } from "../utils/gridGeometry";
import { resizeAnnotation, resizeHandle } from "../utils/annotationGeometry";
import LocationIcon, { LocationMarker } from "./LocationIcon";
import { LucideIcons } from '../icons/LucideIcons';
import ToolOptions, { hasToolOptions, toolGuidance } from "./ToolOptions";
import MiniMap from "./MiniMap";
import { locationTypes, locationIcons } from "../utils/locationIcons";
import {
  matchesLocation,
  type LocationFilters,
} from "../utils/locationFilters";
import {
  arrangeLocationLabels,
  measureLocationName,
  type LabelMode,
} from "../utils/locationLabels";
type Point = { x: number; y: number };
interface Props {
  onOpenLocationDetails: () => void;
  locationFilters: LocationFilters;
  focusLocation?: { id: string; request: number };
  project: MapProject;
  activeTool: Tool;
  selectedLocationId: string | null;
  onSelectLocation: (id: string | null) => void;
  onUpdateProject: (id: string, p: Partial<MapProject>) => void;
  onAddLocation: (l: MapLocation) => void;
  onAddAnnotation: (a: MapAnnotation) => void;
  onUpdateLocation?: (id: string, l: Partial<MapLocation>) => void;
  onDeleteLocation?: (id: string) => void;
  onDeleteAnnotation?: (id: string) => void;
  zoomLevel?: number;
}
const clamp = (n: number) => Math.min(100, Math.max(0, n));
function moveAnnotation(
  a: MapAnnotation,
  dx: number,
  dy: number,
): MapAnnotation {
  const xs = [
      a.x,
      ...(a.x2 !== undefined ? [a.x2] : []),
      ...(a.points?.map((p) => p.x) || []),
    ],
    ys = [
      a.y,
      ...(a.y2 !== undefined ? [a.y2] : []),
      ...(a.points?.map((p) => p.y) || []),
    ];
  if (a.type === "rectangle") {
    xs.push(a.x + (a.width || 0));
    ys.push(a.y + (a.height || 0));
  }
  dx = Math.max(-Math.min(...xs), Math.min(100 - Math.max(...xs), dx));
  dy = Math.max(-Math.min(...ys), Math.min(100 - Math.max(...ys), dy));
  return {
    ...a,
    x: a.x + dx,
    y: a.y + dy,
    x2: a.x2 === undefined ? undefined : a.x2 + dx,
    y2: a.y2 === undefined ? undefined : a.y2 + dy,
    points: a.points?.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  };
}
export default function MapEditor({
  onOpenLocationDetails,
  locationFilters,
  focusLocation,
  project,
  activeTool,
  selectedLocationId,
  onSelectLocation,
  onUpdateProject,
  onAddLocation,
  onAddAnnotation,
  onUpdateLocation,
  onDeleteLocation,
  onDeleteAnnotation,
  zoomLevel,
}: Props) {
  const transform = useRef<ReactZoomPanPinchRef>(null),
    surface = useRef<HTMLDivElement>(null),
    viewer = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string[]>([]),
    [start, setStart] = useState<Point | null>(null),
    [cursor, setCursor] = useState<Point | null>(null);
  const [color, setColor] = useState("#e7b86d"),
    [fill, setFill] = useState("none"),
    [stroke, setStroke] = useState(3),
    [fontSize, setFontSize] = useState(32),
    [symbol, setSymbol] = useState("🌲"),
    [symbolName, setSymbolName] = useState("");
  const [material, setMaterial] =
    useState<MapAnnotation["material"]>(undefined);
  const [snap, setSnap] = useState(false),
    [showLayers, setShowLayers] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"location" | "text" | null>(null),
    [text, setText] = useState(""),
    [locationType, setLocationType] = useState<MapLocation["type"]>("city");
  const [drag, setDrag] = useState<{
    kind: "location" | "annotation" | "resize";
    id: string;
    origin: Point;
    point: Point;
  } | null>(null);
  const dragging = useRef<typeof drag>(null),
    moved = useRef(false),
    drawing = useRef<Point[] | null>(null);
  const [path, setPath] = useState<Point[]>([]),
    [measurement, setMeasurement] = useState("");
  const clipboard = useRef<MapAnnotation[]>([]);
  const [view, setView] = useState({ scale: 0.5, positionX: 0, positionY: 0 });

  useEffect(() => {
    if (zoomLevel !== undefined && transform.current) {
      const currentScale = transform.current.state.scale;
      if (Math.abs(currentScale - zoomLevel) > 0.02) {
        transform.current.setTransform(view.positionX, view.positionY, zoomLevel, 150);
      }
    }
  }, [zoomLevel]);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });
  const [labelMode, setLabelMode] = useState<LabelMode>("auto");
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [showToolOptions, setShowToolOptions] = useState(true);
  const [showObjectProperties, setShowObjectProperties] = useState(true);
  const w = project.imageWidth,
    h = project.imageHeight;
  const visibleLocations = useMemo(
    () =>
      project.hiddenLayers?.includes("locais")
        ? []
        : project.locations
            .filter((l) => !l.hidden && matchesLocation(l, locationFilters))
            .map((l) =>
              drag?.kind === "location" && drag.id === l.id
                ? {
                    ...l,
                    x: clamp(l.x + drag.point.x - drag.origin.x),
                    y: clamp(l.y + drag.point.y - drag.origin.y),
                  }
                : l,
            )
            .sort(
              (a, b) =>
                Number(a.id === selectedLocationId) -
                Number(b.id === selectedLocationId),
            ),
    [
      project.locations,
      project.hiddenLayers,
      locationFilters,
      drag,
      selectedLocationId,
    ],
  );
  const labelPlacements = useMemo(
    () =>
      arrangeLocationLabels(
        visibleLocations.map((l) => ({
          id: l.id,
          name: l.name,
          x: (l.x * w * view.scale) / 100 + view.positionX,
          y: (l.y * h * view.scale) / 100 + view.positionY,
        })),
        {
          left: Math.max(0, view.positionX),
          top: Math.max(0, view.positionY),
          right: Math.min(viewport.width, view.positionX + w * view.scale),
          bottom: Math.min(viewport.height, view.positionY + h * view.scale),
        },
        selectedLocationId,
        labelMode,
        measureLocationName,
      ),
    [visibleLocations, w, h, view, viewport, selectedLocationId, labelMode],
  );
  const isLocked = (layer: string) =>
    project.lockedLayers?.includes(layer) || false;
  const updateAnn = (id: string, updates: Partial<MapAnnotation>) => {
    const item = project.annotations.find((a) => a.id === id);
    if (item && isLocked(layerOf(item))) return;
    onUpdateProject(project.id, {
      annotations: project.annotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a,
      ),
    });
  };
  const fit = () => {
    const el = viewer.current;
    if (el)
      transform.current?.centerView(
        Math.min((el.clientWidth - 60) / w, (el.clientHeight - 60) / h, 1),
        150,
      );
  };
  const centerAt = (x: number, y: number, scale = view.scale) => {
    const el = viewer.current;
    if (el)
      transform.current?.setTransform(
        el.clientWidth / 2 - (x * w * scale) / 100,
        el.clientHeight / 2 - (y * h * scale) / 100,
        scale,
        180,
      );
  };
  useEffect(() => {
    if (!focusLocation) return;
    const location = project.locations.find((l) => l.id === focusLocation.id);
    if (!location) return;
    const timer = setTimeout(
      () =>
        centerAt(
          location.x,
          location.y,
          getLocationFocusScale(transform.current?.state.scale || 1),
        ),
      120,
    );
    return () => clearTimeout(timer);
  }, [focusLocation, project.id]);
  const point = (event: { clientX: number; clientY: number }): Point => {
    const r = surface.current!.getBoundingClientRect();
    let x = clamp(((event.clientX - r.left) / r.width) * 100),
      y = clamp(((event.clientY - r.top) / r.height) * 100);
    if (snap) {
      const snapped = snapGridPoint(
        (x * w) / 100,
        (y * h) / 100,
        project.gridSize,
        project.gridType,
      );
      x = clamp((snapped.x / w) * 100);
      y = clamp((snapped.y / h) * 100);
    }
    return { x, y };
  };
  useEffect(() => {
    setStart(null);
    setCursor(null);
    setPath([]);
    drawing.current = null;
    setMeasurement("");
  }, [activeTool]);
  useEffect(() => {
    const timer = setTimeout(fit, 80);
    return () => clearTimeout(timer);
  }, [w, h]);
  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    let previous: { width: number; height: number } | undefined;
    const observer = new ResizeObserver(() => {
      const next = { width: el.clientWidth, height: el.clientHeight };
      const api = transform.current;
      if (previous && api && next.width > 0 && next.height > 0) {
        const { positionX, positionY, scale } = api.state;
        api.setTransform(
          positionX + (next.width - previous.width) / 2,
          positionY + (next.height - previous.height) / 2,
          scale,
          0,
        );
      }
      previous = next;
      setViewport(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.matches("input,textarea,select") ||
          e.target.isContentEditable)
      )
        return;
      if (e.key === "Escape") {
        setSelected([]);
        setStart(null);
        setModal(null);
        onSelectLocation(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        selected.forEach((id) => {
          const a = project.annotations.find((a) => a.id === id);
          if (a && !isLocked(layerOf(a))) onDeleteAnnotation?.(id);
        });
        if (selectedLocationId && !isLocked("locais"))
          onDeleteLocation?.(selectedLocationId);
        setSelected([]);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "c" &&
        selected.length
      ) {
        e.preventDefault();
        clipboard.current = project.annotations.filter((a) =>
          selected.includes(a.id),
        );
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "v" &&
        clipboard.current.length
      ) {
        e.preventDefault();
        const copies = clipboard.current.map((a) => ({
          ...moveAnnotation(a, 2, 2),
          id: crypto.randomUUID(),
        }));
        onUpdateProject(project.id, {
          annotations: [...project.annotations, ...copies],
        });
        setSelected(copies.map((a) => a.id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selected,
    selectedLocationId,
    project,
    onDeleteAnnotation,
    onDeleteLocation,
  ]);
  const create = (
    type: MapAnnotation["type"],
    p: Point,
    end?: Point,
  ): MapAnnotation => ({
    id: crypto.randomUUID(),
    type,
    x: p.x,
    y: p.y,
    x2: end?.x,
    y2: end?.y,
    color,
    fill:
      ["rectangle", "circle", "path"].includes(type) && fill !== "none"
        ? color
        : "none",
    material: ["rectangle", "circle", "path"].includes(type)
      ? material
      : undefined,
    strokeWidth: stroke,
    fontSize,
    layer: ["wall", "door"].includes(type)
      ? "paredes"
      : type === "symbol"
        ? "símbolos"
        : type === "light"
          ? "luzes"
          : "desenhos",
  });
  const shape = (end: Point): MapAnnotation | null => {
    if (!start) return null;
    const type = (
      {
        addLine: "line",
        addArrow: "arrow",
        addRectangle: "rectangle",
        addCircle: "circle",
        addWall: "wall",
        addDoor: "door",
      } as Record<string, MapAnnotation["type"]>
    )[activeTool];
    if (!type) return null;
    const a = create(type, start, end);
    if (type === "rectangle")
      Object.assign(a, {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      });
    if (type === "circle")
      a.width = 2 * Math.hypot(end.x - start.x, ((end.y - start.y) * h) / w);
    return a;
  };
// Helper to find the nearest location within a tolerance (map percentage units)
  const findNearestLocation = (p: Point) => {
    const tolerance = 3; // percent of map size
    let nearest = null;
    let minDist = Infinity;
    for (const loc of project.locations) {
      const dx = p.x - loc.x;
      const dy = p.y - loc.y;
      const dist = Math.hypot(dx, dy);
      if (dist < tolerance && dist < minDist) {
        minDist = dist;
        nearest = loc;
      }
    }
    return nearest;
  };

  // Reset view to default (scale 0.5, centered)
  const resetView = () => {
    transform.current?.resetTransform();
  };

  // Focus on a location with a smooth zoom (targetScale ensures text is legible)
  const focusOnLocation = (loc: { x: number; y: number }) => {
    const targetScale = Math.max(view.scale, 3); // ensure readability of labels
    centerAt(loc.x, loc.y, targetScale);
  };

  const click = (e: React.MouseEvent) => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    const p = point(e);
    // Navigation mode: pan tool interprets clicks for focus/reset
    if (activeTool === "pan") {
      const nearest = findNearestLocation(p);
      if (nearest) {
        focusOnLocation({ x: nearest.x, y: nearest.y });
      } else {
        resetView();
      }
      return;
    }
    const layer =
      activeTool === "addLocation"
        ? "locais"
        : ["addWall", "addDoor"].includes(activeTool)
          ? "paredes"
          : activeTool === "addSymbol"
            ? "símbolos"
            : activeTool === "addLight"
              ? "luzes"
              : "desenhos";
    if (!["select", "pan", "measure"].includes(activeTool) && isLocked(layer)) {
      setNotice("Esta camada está bloqueada. Desbloqueie em Camadas.");
      return;
    }
    if (activeTool === "select") {
      setSelected([]);
      onSelectLocation(null);
      return;
    }
    if (activeTool === "draw" || activeTool === "eraser") return;
    if (activeTool === "addLocation" || activeTool === "addText") {
      setStart(p);
      setText("");
      setModal(activeTool === "addLocation" ? "location" : "text");
      return;
    }
    if (activeTool === "addSymbol") {
      const symbolDefinition = getMapSymbol(symbol);
      onAddAnnotation({
        ...create("symbol", p),
        text: symbol,
        name: symbolName.trim() || undefined,
        interaction: symbolDefinition?.interaction,
        fontSize,
      });
      return;
    }
    if (activeTool === "addLight") {
      onAddAnnotation({
        ...create("light", p),
        width: ((project.gridSize * 6) / w) * 100,
        color: "#ffd16d",
      });
      return;
    }
    if (activeTool === "measure") {
      if (!start) {
        setStart(p);
        return;
      }
      const length =
        (Math.hypot(((p.x - start.x) * w) / 100, ((p.y - start.y) * h) / 100) /
          project.gridSize) *
        (project.unitsPerCell || 1.5);
      setMeasurement(length.toFixed(2) + " " + (project.scaleUnit || "m"));
      setCursor(p);
      setStart(null);
      return;
    }
    if (!start) {
      setStart(p);
      return;
    }
    const a = shape(p);
    if (a) onAddAnnotation(a);
    setStart(null);
    setCursor(null);
  };
  const beginDrag = (
    e: React.PointerEvent,
    kind: "location" | "annotation",
    id: string,
  ) => {
    if (activeTool === "eraser") {
      e.stopPropagation();
      if (kind === "annotation") {
        const a = project.annotations.find((a) => a.id === id);
        if (a && !isLocked(layerOf(a))) onDeleteAnnotation?.(id);
      } else if (!isLocked("locais")) onDeleteLocation?.(id);
      return;
    }
    if (activeTool !== "select") return;
    e.stopPropagation();
    if (kind === "location") {
      onSelectLocation(id);
      setSelected([]);
    } else {
      onSelectLocation(null);
      setSelected((s) =>
        e.shiftKey
          ? s.includes(id)
            ? s.filter((x) => x !== id)
            : [...s, id]
          : s.includes(id)
            ? s
            : [id],
      );
    }
    const layer =
      kind === "location"
        ? "locais"
        : layerOf(project.annotations.find((a) => a.id === id)!);
    if (isLocked(layer)) return;
    const p = point(e);
    const d = { kind, id, origin: p, point: p };
    dragging.current = d;
    setDrag(d);
    moved.current = false;
    surface.current?.setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (dragging.current) {
      const p = point(e);
      if (
        Math.hypot(
          p.x - dragging.current.origin.x,
          p.y - dragging.current.origin.y,
        ) > 0.15
      )
        moved.current = true;
      dragging.current = { ...dragging.current, point: p };
      setDrag(dragging.current);
      return;
    }
    if (drawing.current) {
      const p = point(e),
        last = drawing.current[drawing.current.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 0.08) {
        drawing.current.push(p);
        setPath([...drawing.current]);
      }
      return;
    }
    if (start) setCursor(point(e));
  };
  const pointerUp = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (d && moved.current) {
      const dx = d.point.x - d.origin.x,
        dy = d.point.y - d.origin.y;
      if (d.kind === "location") {
        const l = project.locations.find((l) => l.id === d.id)!;
        onUpdateLocation?.(l.id, { x: clamp(l.x + dx), y: clamp(l.y + dy) });
      } else if (d.kind === "resize") {
        const a = project.annotations.find((a) => a.id === d.id);
        if (a) updateAnn(a.id, resizeAnnotation(a, dx, dy, w, h));
      } else {
        const ids = selected.includes(d.id) ? selected : [d.id];
        onUpdateProject(project.id, {
          annotations: project.annotations.map((a) =>
            ids.includes(a.id) && !isLocked(layerOf(a))
              ? moveAnnotation(a, dx, dy)
              : a,
          ),
        });
      }
    }
    dragging.current = null;
    setDrag(null);
    if (drawing.current) {
      if (drawing.current.length > 1) {
        onAddAnnotation({
          ...create("path", drawing.current[0]),
          points: drawing.current,
        });
        moved.current = true;
      }
      drawing.current = null;
      setPath([]);
    }
    if (surface.current?.hasPointerCapture(e.pointerId))
      surface.current.releasePointerCapture(e.pointerId);
  };
  const selectedAnn = project.annotations.find((a) => a.id === selected[0]);
  const inputImage = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await importMapImage(file);
      onUpdateProject(project.id, result);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex-1 flex flex-col min-h-[420px] min-w-0">
      <div className="flex flex-wrap gap-2 items-center p-2 text-xs border-b border-[#3d2e22]">
        <button
          className="dz-button"
          aria-expanded={showLayers}
          aria-controls="map-layers"
          onClick={() => setShowLayers(!showLayers)}
        >
          Camadas
        </button>
        <button
          className="dz-button"
          aria-expanded={showGridSettings}
          aria-controls="grid-settings"
          onClick={() => setShowGridSettings(!showGridSettings)}
        >
          Grade e escala
        </button>
        <button className="dz-button" onClick={fit}>
          Ajustar à janela
        </button>
        <label className="flex items-center gap-2">
          Nomes
          <select
            aria-label="Exibição dos nomes"
            value={labelMode}
            onChange={(e) => setLabelMode(e.target.value as LabelMode)}
          >
            <option value="auto">Automáticos</option>
            <option value="all">Todos</option>
            <option value="selected">Só o selecionado</option>
          </select>
        </label>
        {hasToolOptions(activeTool) && (
          <button
            className="dz-button"
            aria-expanded={showToolOptions}
            aria-controls="tool-options"
            onClick={() => setShowToolOptions(!showToolOptions)}
          >
            Opções da ferramenta
          </button>
        )}
        {selectedLocationId && (
          <button className="dz-button" onClick={onOpenLocationDetails}>
            Detalhes do local
          </button>
        )}
      </div>
      {hasToolOptions(activeTool) && showToolOptions && (
        <ToolOptions
          tool={activeTool}
          color={color}
          onColor={setColor}
          stroke={stroke}
          onStroke={setStroke}
          fontSize={fontSize}
          onFontSize={setFontSize}
          filled={fill !== "none"}
          onFilled={(value) => setFill(value ? color : "none")}
          material={material}
          onMaterial={setMaterial}
          symbol={symbol}
          onSymbol={setSymbol}
          symbolName={symbolName}
          onSymbolName={setSymbolName}
        />
      )}
      {showGridSettings && (
        <div
          id="grid-settings"
          role="group"
          aria-label="Grade e escala"
          className="flex flex-wrap px-3 py-2 gap-3 text-xs items-center border-b border-[#3d2e22]"
        >
          <label>
            <input
              type="checkbox"
              checked={snap}
              onChange={(e) => setSnap(e.target.checked)}
            />{" "}
            Encaixar na grade
          </label>
          <label>
            Grade{" "}
            <select
              aria-label="Tipo de grade"
              value={project.gridType || "square"}
              onChange={(e) =>
                onUpdateProject(project.id, {
                  gridType: e.target.value as "square" | "hex",
                })
              }
            >
              <option value="square">Quadrada</option>
              <option value="hex">Hexagonal</option>
            </select>
          </label>
          <label>
            Célula (px){" "}
            <input
              aria-label="Tamanho da grade"
              type="number"
              min="5"
              max="1000"
              className="w-16"
              value={project.gridSize}
              onChange={(e) =>
                onUpdateProject(project.id, {
                  gridSize: Math.max(5, Math.min(1000, +e.target.value)),
                })
              }
            />
          </label>
          <label>
            Unidades por célula{" "}
            <input
              aria-label="Escala da grade"
              type="number"
              min=".01"
              max="1000000"
              step=".5"
              className="w-20"
              value={project.unitsPerCell || 1.5}
              onChange={(e) =>
                onUpdateProject(project.id, {
                  unitsPerCell: Math.max(
                    0.01,
                    Math.min(1000000, +e.target.value),
                  ),
                })
              }
            />
          </label>
          <select
            aria-label="Unidade"
            value={project.scaleUnit || "m"}
            onChange={(e) =>
              onUpdateProject(project.id, { scaleUnit: e.target.value })
            }
          >
            <option>m</option>
            <option>km</option>
            <option>ft</option>
          </select>
        </div>
      )}
      <div className="p-1 px-3 text-xs text-stone-400">
        {toolGuidance[activeTool]}
        {snap && " Encaixe na grade ativo."}{" "}
        {measurement && (
          <strong className="text-amber-200">Distância: {measurement}</strong>
        )}
      </div>
      {notice && (
        <div role="alert" className="p-2 bg-red-950">
          {notice}
          <button className="ml-3" onClick={() => setNotice("")}>
            Fechar aviso
          </button>
        </div>
      )}
      {!project.imageUrl && (
        <div className="px-3 py-2 text-sm">
          Desenhe neste mapa vazio ou{" "}
          <label className="text-amber-300 cursor-pointer">
            Selecionar Imagem
            <input
              aria-label="Selecionar Imagem"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                void inputImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          . {busy ? "Convertendo imagem..." : ""}
        </div>
      )}
      <div
        data-map-viewport
        className="flex-1 relative overflow-hidden min-h-[240px]"
        ref={viewer}
      >
        <TransformWrapper
          ref={transform}
          minScale={0.005}
          maxScale={12}
          initialScale={0.5}
          limitToBounds={false}
          centerZoomedOut={false}
          doubleClick={{ disabled: true }}
          panning={{ disabled: activeTool !== "pan" }}
          onTransform={(_, state) =>
            setView({
              scale: state.scale,
              positionX: state.positionX,
              positionY: state.positionY,
            })
          }
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: w, height: h }}
          >
            <div
              ref={surface}
              style={{
                width: w,
                height: h,
                flexShrink: 0,
                position: "relative",
                background: "#172330",
                cursor:
                  activeTool === "pan"
                    ? "grab"
                    : activeTool === "select"
                      ? "default"
                      : "crosshair",
                touchAction: "none",
              }}
              onClick={click}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={() => {
                dragging.current = null;
                setDrag(null);
                drawing.current = null;
                setPath([]);
              }}
              onPointerDown={(e) => {
                if (activeTool === "draw" && !isLocked("desenhos")) {
                  drawing.current = [point(e)];
                  setPath(drawing.current);
                  surface.current?.setPointerCapture(e.pointerId);
                }
              }}
            >
              {project.imageUrl &&
                !project.hiddenLayers?.includes("base") &&
                (w * h > 8000000 ? (
                  <TiledImage
                    src={project.imageUrl}
                    width={w}
                    height={h}
                    view={view}
                    viewport={viewport}
                  />
                ) : (
                  <img
                    alt="Map"
                    src={project.imageUrl}
                    draggable={false}
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  />
                ))}
              <svg
                width={w}
                height={h}
                viewBox={"0 0 " + w + " " + h}
                style={{ position: "absolute", inset: 0, overflow: "hidden" }}
              >
                <MapPatterns />
                {project.gridEnabled && (
                  <g pointerEvents="none">
                    <Grid project={project} />
                  </g>
                )}
                {orderedAnnotations(project.annotations)
                  .filter(
                    (a) =>
                      !a.hidden && !project.hiddenLayers?.includes(layerOf(a)),
                  )
                  .map((a) => {
                    const moving =
                      drag?.kind === "annotation" &&
                      (a.id === drag.id || selected.includes(a.id));
                    const displayed =
                      drag?.kind === "resize" && drag.id === a.id
                        ? resizeAnnotation(
                            a,
                            drag.point.x - drag.origin.x,
                            drag.point.y - drag.origin.y,
                            w,
                            h,
                          )
                        : moving
                          ? moveAnnotation(
                              a,
                              drag.point.x - drag.origin.x,
                              drag.point.y - drag.origin.y,
                            )
                          : a;
                    return (
                      <g
                        key={a.id}
                        data-annotation-id={a.id}
                        style={{
                          cursor: activeTool === "select" ? "move" : undefined,
                          pointerEvents:
                            activeTool === "select" || activeTool === "eraser"
                              ? "all"
                              : "none",
                        }}
                        onClick={(e) => {
                          moved.current = false;
                          if (
                            activeTool === "select" ||
                            activeTool === "eraser"
                          ) {
                            moved.current = false;
                            e.stopPropagation();
                          }
                        }}
                        onPointerDown={(e) => beginDrag(e, "annotation", a.id)}
                      >
                        <AnnotationShape a={displayed} width={w} height={h} />
                        {selected.length === 1 &&
                          selected[0] === a.id &&
                          !isLocked(layerOf(a)) &&
                          resizeHandle(displayed) &&
                          activeTool === "select" &&
                          (() => {
                            const handle = resizeHandle(displayed)!;
                            return (
                              <rect
                                data-resize-id={a.id}
                                aria-label="Redimensionar desenho"
                                x={(handle.x * w) / 100 - 6 / view.scale}
                                y={(handle.y * h) / 100 - 6 / view.scale}
                                width={12 / view.scale}
                                height={12 / view.scale}
                                fill="#ffe6a6"
                                stroke="#332211"
                                strokeWidth={1 / view.scale}
                                style={{ cursor: "nwse-resize" }}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  const p = point(e),
                                    d = {
                                      kind: "resize" as const,
                                      id: a.id,
                                      origin: p,
                                      point: p,
                                    };
                                  dragging.current = d;
                                  setDrag(d);
                                  moved.current = false;
                                  surface.current?.setPointerCapture(
                                    e.pointerId,
                                  );
                                }}
                              >
                                <title>Arraste para redimensionar</title>
                              </rect>
                            );
                          })()}
                        {selected.includes(a.id) && (
                          <circle
                            cx={(displayed.x * w) / 100}
                            cy={(displayed.y * h) / 100}
                            r={8 / view.scale}
                            fill="none"
                            stroke="#ffee99"
                            strokeWidth={1 / view.scale}
                          />
                        )}
                      </g>
                    );
                  })}
                {visibleLocations.map((l) => {
                  const { x, y } = l;
                  return (
                    <g
                      key={l.id}
                      data-location-id={l.id}
                      aria-label={"Selecionar local " + l.name}
                      role="button"
                      tabIndex={activeTool === "select" ? 0 : -1}
                      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectLocation(l.id);
                          setSelected([]);
                        }
                      }}
                      onPointerDown={(e) => beginDrag(e, "location", l.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === "select") onSelectLocation(l.id);
                      }}
                      style={{ cursor: "move" }}
                    >
                      <title>{l.name}</title>
                      <rect
                        x={(x * w) / 100 - 18 / view.scale}
                        y={(y * h) / 100 - 35 / view.scale}
                        width={36 / view.scale}
                        height={38 / view.scale}
                        fill="transparent"
                      />
                      <LocationMarker
                        location={l}
                        x={(x * w) / 100}
                        y={(y * h) / 100}
                        scale={1 / view.scale}
                        label={labelPlacements.get(l.id) || null}
                        selected={selectedLocationId === l.id}
                      />
                    </g>
                  );
                })}
                {project.annotations
                  .filter(
                    (a) =>
                      isFocusSymbol(a) &&
                      !a.hidden &&
                      !project.hiddenLayers?.includes(layerOf(a)),
                  )
                  .map((a) => (
                    <circle
                      key={`focus-${a.id}`}
                      role="button"
                      tabIndex={activeTool === "select" ? 0 : -1}
                      aria-label={`Aproximar mapa em ${a.name || "ponto marcado"}`}
                      cx={(a.x * w) / 100}
                      cy={(a.y * h) / 100 - 8 / view.scale}
                      r={18 / view.scale}
                      fill="transparent"
                      style={{
                        cursor:
                          activeTool === "select" ? "zoom-in" : undefined,
                        pointerEvents:
                          activeTool === "select" ? "all" : "none",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        focusOnLocation(a);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          focusOnLocation(a);
                        }
                      }}
                    >
                      <title>
                        {a.name
                          ? `Aproximar em ${a.name}`
                          : "Aproximar neste ponto"}
                      </title>
                    </circle>
                  ))}
                {start && cursor && shape(cursor) && (
                  <g pointerEvents="none" opacity=".65">
                    <AnnotationShape a={shape(cursor)!} width={w} height={h} />
                  </g>
                )}
                {!!path.length && (
                  <g pointerEvents="none">
                    <AnnotationShape
                      a={{ ...create("path", path[0]), points: path }}
                      width={w}
                      height={h}
                    />
                  </g>
                )}
              </svg>
            </div>
          </TransformComponent>
        </TransformWrapper>
        <div className="absolute bottom-3 right-3 flex gap-1">
          <button
            className="dz-button"
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
            onClick={() => transform.current?.zoomIn(view.scale * 0.25)}
          >
            +
          </button>
          <button
            className="dz-button"
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
            onClick={() => transform.current?.zoomOut(view.scale * 0.2)}
          >
            −
          </button>
          <button
            className="dz-button flex items-center gap-1 text-xs"
            aria-label="Ajustar zoom para ver o mapa geral"
            title="Ajustar zoom para ver o mapa geral"
            onClick={resetView}
          >
            <Maximize2 size={13} />
            <span>Geral</span>
          </button>
          <span className="dz-button">{Math.round(view.scale * 100)}%</span>
        </div>
        <div className="absolute bottom-3 left-3 text-xs bg-black/80 p-2 pointer-events-none">
          {w} × {h} px · {project.gridSize} px por célula
        </div>
        {/* Minimapa ancorado no canto superior esquerdo da área do mapa */}
        <div className="absolute top-2 left-2 flex flex-col gap-2 pointer-events-auto z-20">
          <MiniMap
            project={project}
            visibleLocations={visibleLocations}
            view={view}
            viewport={viewport}
            onCenterAt={centerAt}
          />
        </div>
        {showLayers && (
          <div
            id="map-layers"
            className="absolute top-2 right-48 p-3 bg-[#211911] border border-stone-600 text-xs w-64 max-w-[calc(100%-16px)] max-h-[calc(100%-16px)] overflow-auto z-20"
          >
            <h3>Camadas (baixo → cima)</h3>
            {layers.map((layer) => (
              <div key={layer} className="flex gap-2 py-2">
                <label className="flex-1">
                  <input
                    aria-label={"Mostrar camada " + layer}
                    type="checkbox"
                    checked={!project.hiddenLayers?.includes(layer)}
                    onChange={(e) =>
                      onUpdateProject(project.id, {
                        hiddenLayers: e.target.checked
                          ? (project.hiddenLayers || []).filter(
                              (x) => x !== layer,
                            )
                          : [...(project.hiddenLayers || []), layer],
                      })
                    }
                  />{" "}
                  {layer}
                </label>
                <label>
                  <input
                    aria-label={"Bloquear camada " + layer}
                    type="checkbox"
                    checked={isLocked(layer)}
                    onChange={(e) =>
                      onUpdateProject(project.id, {
                        lockedLayers: e.target.checked
                          ? [...(project.lockedLayers || []), layer]
                          : (project.lockedLayers || []).filter(
                              (x) => x !== layer,
                            ),
                      })
                    }
                  />{" "}
                  Bloquear
                </label>
              </div>
            ))}
          </div>
        )}
        {selectedAnn && !showLayers && activeTool === "select" && (
          <div className="absolute top-2 right-2 bg-[#211911] border border-stone-600 text-xs w-64 max-w-[calc(100%-16px)] max-h-[calc(100%-16px)] overflow-auto">
            <button
              className="w-full p-3 text-left"
              aria-expanded={showObjectProperties}
              aria-controls="object-properties"
              onClick={() => setShowObjectProperties(!showObjectProperties)}
            >
              {showObjectProperties
                ? "Recolher propriedades do desenho"
                : "Abrir propriedades do desenho"}
            </button>
            {showObjectProperties && (
              <fieldset
                id="object-properties"
                disabled={isLocked(layerOf(selectedAnn))}
                className="p-3 pt-0 space-y-2 min-w-0"
              >
                <h3>
                  Editar desenho{" "}
                  {selected.length > 1
                    ? "(" + selected.length + " selecionados)"
                    : ""}{" "}
                  {isLocked(layerOf(selectedAnn)) ? "— bloqueado" : ""}
                </h3>
                {selectedAnn.type === "text" && (
                  <input
                    aria-label="Texto selecionado"
                    value={selectedAnn.text || ""}
                    onChange={(e) =>
                      updateAnn(selectedAnn.id, { text: e.target.value })
                    }
                  />
                )}
                {selectedAnn.type === "symbol" && (
                  <>
                    <label className="block">
                      Símbolo
                      <select
                        aria-label="Símbolo selecionado"
                        value={selectedAnn.text || "🌲"}
                        onChange={(e) => {
                          const definition = getMapSymbol(e.target.value);
                          updateAnn(selectedAnn.id, {
                            text: e.target.value,
                            interaction: definition?.interaction,
                          });
                        }}
                      >
                        {mapSymbolGroups.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.symbols.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.value} {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      Nome/descrição
                      <input
                        aria-label="Nome ou descrição do símbolo selecionado"
                        value={selectedAnn.name || ""}
                        onChange={(e) =>
                          updateAnn(selectedAnn.id, { name: e.target.value })
                        }
                        placeholder="Sem nome, fica fora de Anotações"
                      />
                    </label>
                  </>
                )}
                <label className="block">
                  Cor{" "}
                  <input
                    type="color"
                    aria-label="Cor selecionada"
                    value={selectedAnn.color.slice(0, 7)}
                    onChange={(e) =>
                      updateAnn(selectedAnn.id, { color: e.target.value })
                    }
                  />
                </label>
                {(["x", "y"] as const).map((axis) => (
                  <label key={axis} className="flex justify-between">
                    {axis.toUpperCase()} %
                    <input
                      className="w-20"
                      type="number"
                      aria-label={"Desenho " + axis}
                      min="0"
                      max="100"
                      value={selectedAnn[axis]}
                      onChange={(e) => {
                        const p = moveAnnotation(
                          selectedAnn,
                          axis === "x"
                            ? clamp(+e.target.value) - selectedAnn.x
                            : 0,
                          axis === "y"
                            ? clamp(+e.target.value) - selectedAnn.y
                            : 0,
                        );
                        updateAnn(selectedAnn.id, p);
                      }}
                    />
                  </label>
                ))}
                {(
                  [
                    "strokeWidth",
                    "fontSize",
                    "width",
                    "height",
                    "rotation",
                    "x2",
                    "y2",
                  ] as const
                )
                  .filter((key) =>
                    key === "strokeWidth"
                      ? selectedAnn.type !== "light"
                      : key === "fontSize" || key === "rotation"
                        ? ["text", "symbol"].includes(selectedAnn.type)
                        : key === "width"
                          ? ["rectangle", "circle", "light"].includes(
                              selectedAnn.type,
                            )
                          : key === "height"
                            ? selectedAnn.type === "rectangle"
                            : ["line", "arrow", "wall", "door"].includes(
                                selectedAnn.type,
                              ),
                  )
                  .map((key) => (
                    <label key={key} className="flex justify-between">
                      {
                        {
                          strokeWidth: "Traço",
                          fontSize: "Tamanho",
                          width: "Largura (%)",
                          height: "Altura (%)",
                          rotation: "Rotação",
                          x2: "Final X %",
                          y2: "Final Y %",
                        }[key]
                      }
                      <input
                        className="w-20"
                        type="number"
                        aria-label={"Editar " + key}
                        value={selectedAnn[key] || 0}
                        min={
                          key === "rotation" ? -360 : key === "fontSize" ? 1 : 0
                        }
                        max={
                          key === "rotation"
                            ? 360
                            : key === "fontSize"
                              ? 500
                              : key === "strokeWidth" ||
                                  key === "x2" ||
                                  key === "y2"
                                ? 100
                                : 300
                        }
                        onChange={(e) =>
                          updateAnn(selectedAnn.id, {
                            [key]: Math.max(
                              key === "rotation"
                                ? -360
                                : key === "fontSize"
                                  ? 1
                                  : 0,
                              Math.min(
                                key === "rotation"
                                  ? 360
                                  : key === "fontSize"
                                    ? 500
                                    : key === "strokeWidth" ||
                                        key === "x2" ||
                                        key === "y2"
                                      ? 100
                                      : 300,
                                +e.target.value,
                              ),
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                {["rectangle", "circle", "path"].includes(selectedAnn.type) && (
                  <label className="block">
                    Textura
                    <select
                      aria-label="Material selecionado"
                      value={selectedAnn.material || ""}
                      onChange={(e) =>
                        updateAnn(selectedAnn.id, {
                          material: (e.target.value ||
                            undefined) as MapAnnotation["material"],
                        })
                      }
                    >
                      <option value="">Sem textura</option>
                      <option value="grass">Grama</option>
                      <option value="stone">Pedra</option>
                      <option value="wood">Madeira</option>
                      <option value="water">Água</option>
                    </select>
                  </label>
                )}
                {selectedAnn.type === "path" && (
                  <div className="flex gap-2">
                    {[0.8, 1.2].map((f) => (
                      <button
                        key={f}
                        className="dz-button"
                        onClick={() =>
                          updateAnn(selectedAnn.id, {
                            points: selectedAnn.points?.map((p) => ({
                              x: clamp(
                                selectedAnn.x + (p.x - selectedAnn.x) * f,
                              ),
                              y: clamp(
                                selectedAnn.y + (p.y - selectedAnn.y) * f,
                              ),
                            })),
                          })
                        }
                      >
                        {f < 1 ? "Diminuir" : "Ampliar"} caminho
                      </button>
                    ))}
                  </div>
                )}
                <select
                  aria-label="Camada do desenho"
                  value={layerOf(selectedAnn)}
                  onChange={(e) =>
                    updateAnn(selectedAnn.id, { layer: e.target.value })
                  }
                >
                  {layers
                    .filter((l) => !["base", "locais"].includes(l))
                    .map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    className="dz-button"
                    onClick={() => {
                      const a = selectedAnn;
                      onUpdateProject(project.id, {
                        annotations: project.annotations
                          .filter((x) => x.id !== a.id)
                          .concat(a),
                      });
                    }}
                  >
                    Trazer à frente
                  </button>
                  <button
                    className="dz-button"
                    onClick={() => onDeleteAnnotation?.(selectedAnn.id)}
                  >
                    Remover
                  </button>
                </div>
              </fieldset>
            )}
          </div>
        )}
      </div>
      {modal && start && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            className="p-6 w-[420px] bg-[#211911] border border-amber-900"
          >
            <h2 className="text-lg mb-4">
              {modal === "location" ? "Registrar local" : "Adicionar texto"}
            </h2>
            {modal === "location" && (
              <div className="grid grid-cols-4 gap-1 mb-4">
                {locationTypes.map((type) => {
                  const item = locationIcons[type];
                  const LucideComp = (LucideIcons as any)[type];
                  return (
                    <button
                      title={item.label}
                      aria-label={"Tipo " + item.label}
                      aria-pressed={locationType === type}
                      key={type}
                      onClick={() => setLocationType(type)}
                      className={
                        "p-2 flex flex-col items-center rounded focus-visible:outline focus-visible:outline-amber-300 " +
                        (locationType === type ? "bg-amber-900" : "")
                      }
                    >
                      {LucideComp ? (
                        <LucideComp size={24} />
                      ) : (
                        <LocationIcon
                          location={{
                            iconId: type,
                            icon: item.legacy,
                            color: item.color,
                          }}
                          size={24}
                        />
                      )}
                      <span className="block text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <input
              autoFocus
              className="w-full"
              placeholder={
                modal === "location"
                  ? "Nome do local..."
                  : "Texto da anotação..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-4 flex gap-3">
              <button
                className="dz-button"
                disabled={!text.trim()}
                onClick={() => {
                  if (modal === "location") {
                    const item = locationIcons[locationType];
                    onAddLocation({
                      id: crypto.randomUUID(),
                      name: text.trim(),
                      description: "",
                      notes: "",
                      type: locationType as MapLocation["type"],
                      icon: item.legacy,
                      iconId: locationType,
                      color: item.color,
                      tags: [],
                      ...start,
                    });
                  } else
                    onAddAnnotation({
                      ...create("text", start),
                      text: text.trim(),
                    });
                  setModal(null);
                  setStart(null);
                }}
              >
                {modal === "location" ? "Registrar" : "Adicionar"}
              </button>
              <button
                className="dz-button"
                onClick={() => {
                  setModal(null);
                  setStart(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
