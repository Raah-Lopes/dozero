import React, { useState } from "react";
import type { MapProject, MapLocation } from "../types";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

interface MiniMapProps {
  project: MapProject;
  visibleLocations: MapLocation[];
  view: { scale: number; positionX: number; positionY: number };
  viewport: { width: number; height: number };
  onCenterAt: (x: number, y: number) => void;
  className?: string;
}

export default function MiniMap({
  project,
  visibleLocations,
  view,
  viewport,
  onCenterAt,
  className = "",
}: MiniMapProps) {
  const [collapsed, setCollapsed] = useState(false);
  const w = project.imageWidth || 1000;
  const h = project.imageHeight || 1000;

  const mapWidth = 160 * Math.min(1, w / h);
  const mapHeight = 160 * Math.min(1, h / w);

  return (
    <aside
      aria-label="Minimapa de navegação"
      className={`rounded border shadow-lg overflow-hidden flex flex-col transition-all select-none ${className}`}
      style={{
        background: "var(--dz-graphite-2)",
        borderColor: "var(--dz-stone)",
        zIndex: 20,
      }}
    >
      <header className="flex items-center justify-between px-2 py-1 bg-stone-900 border-b border-stone-800 text-[11px] text-amber-200">
        <span className="font-medium flex items-center gap-1">
          <MapPin size={12} className="text-amber-400" />
          Minimapa
        </span>
        <button
          aria-label={collapsed ? "Expandir minimapa" : "Recolher minimapa"}
          onClick={() => setCollapsed(!collapsed)}
          className="text-stone-400 hover:text-amber-200 p-0.5 rounded transition-colors"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </header>

      {!collapsed && (
        <button
          type="button"
          aria-label="Navegar clicando no minimapa"
          title="Clique para centralizar a visualização no ponto desejado"
          className="relative cursor-crosshair group overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
          style={{
            width: mapWidth,
            height: mapHeight,
            background: "#172330",
          }}
          onClick={(e) => {
            const bounds = e.currentTarget.getBoundingClientRect();
            onCenterAt(
              ((e.clientX - bounds.left) / bounds.width) * 100,
              ((e.clientY - bounds.top) / bounds.height) * 100
            );
          }}
        >
          {project.imageUrl && (
            <img
              src={
                project.thumbnailUrl ||
                (w * h <= 8000000 ? project.imageUrl : undefined)
              }
              alt="Pré-visualização do minimapa"
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${w} ${h}`}
            aria-hidden="true"
          >
            {/* Marcadores de locais */}
            {visibleLocations.map((l) => (
              <circle
                key={l.id}
                data-minimap-location={l.id}
                cx={(l.x * w) / 100}
                cy={(l.y * h) / 100}
                r={Math.max(w, h) / 70}
                fill={l.color || "#ffd56d"}
                stroke="#111"
                strokeWidth={Math.max(w, h) / 250}
              />
            ))}

            {/* Caixa de visualização (Viewport indicator) */}
            <rect
              data-minimap-viewport
              x={-view.positionX / view.scale}
              y={-view.positionY / view.scale}
              width={viewport.width / view.scale}
              height={viewport.height / view.scale}
              fill="rgba(255, 240, 172, 0.15)"
              stroke="#ffd56d"
              strokeWidth={Math.max(w, h) / 90}
            />
          </svg>
        </button>
      )}
    </aside>
  );
}
