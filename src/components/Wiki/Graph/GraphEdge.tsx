import React, { type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import type { WEdge } from "./core";

/**
 * Relação direta e organizada entre fragmentos do mundo.
 * Ligações retas elegantes com setas direcionais limpas e rótulos minimalistas,
 * conectando perfeitamente a borda do nó de origem à borda do nó de destino.
 */
export default function GraphEdge(props: EdgeProps<WEdge>) {
  const { sourceX, sourceY, targetX, targetY, markerEnd, data, id } = props;

  const color = data?.color || "#d8b45a";
  const onPath = !!data?.onPath;
  const dim = !!data?.dim;
  const label = data?.label ?? "";

  // Cálculo da linha reta da borda do orbe de origem à borda do orbe de destino
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

  // Raios dos orbes (58px de diâmetro -> 29px de raio + 4px de margem)
  const nodeRadius = 32;
  const targetOffset = 34;

  const sx = sourceX + (dx / dist) * nodeRadius;
  const sy = sourceY + (dy / dist) * nodeRadius;
  const tx = targetX - (dx / dist) * targetOffset;
  const ty = targetY - (dy / dist) * targetOffset;

  // Linha reta limpa
  const edgePath = `M ${sx} ${sy} L ${tx} ${ty}`;
  const labelX = (sx + tx) / 2;
  const labelY = (sy + ty) / 2;

  const openEditor = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    window.dispatchEvent(new CustomEvent("arcanum:edit-edge", { detail: id }));
  };

  return (
    <>
      {/* Linha da conexão */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={dim ? "dimmed" : ""}
        style={{
          stroke: color,
          strokeWidth: onPath ? 2.8 : 1.6,
          opacity: dim ? 0.06 : onPath ? 1 : 0.75,
          cursor: "pointer",
        }}
        interactionWidth={24}
      />

      {/* Halo animado quando o caminho está iluminado */}
      {onPath && (
        <BaseEdge
          id={`${id}-halo`}
          path={edgePath}
          className="edge-path-live"
          style={{ stroke: "#d8b45a", strokeWidth: 3, pointerEvents: "none" }}
        />
      )}

      {/* Rótulo minimalista e limpo da relação */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={
              {
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                pointerEvents: "all",
                opacity: dim ? 0.05 : 1,
                zIndex: onPath ? 30 : 10,
              } as CSSProperties
            }
            className="nodrag nopan"
          >
            <button
              type="button"
              onClick={openEditor}
              title="Clique para editar este laço"
              className="px-2 py-0.5 rounded font-mono text-[9.5px] font-medium tracking-tight text-parchment-dim hover:text-gold bg-ink-950/85 hover:bg-ink-900 border border-ink-700/60 hover:border-gold/80 transition-all shadow-sm backdrop-blur-xs select-none"
              style={{
                color: onPath ? "#ecd9a0" : undefined,
                borderColor: onPath ? "#d8b45a" : undefined,
              }}
            >
              {label}
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
