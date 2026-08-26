import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeShape, WNode } from "./core";

/**
 * Nó do Arcanum — Orbe Geométrico Arcano do Grafo de RPG.
 * Visual nítido, limpo e altamente legível para o mapa fechado.
 */
function GraphNode({ id, data, selected }: NodeProps<WNode>) {
  const color = data.tint || data.typeColor || "#d8b45a";
  const dim = !!data.dim;
  const onPath = !!data.onPath;
  const isSource = !!data.isSource;
  const isNeighbor = !!data.isNeighbor;
  const shape: NodeShape = data.shape || (
    data.typeId === "divindade" || data.typeId === "evento" || data.typeId === "conceito" ? "diamond" :
    data.typeId === "organizacao" ? "shield" :
    data.typeId === "local" || data.typeId === "racas" ? "hexagon" :
    data.typeId === "rota" || data.typeId === "resumo" ? "square" :
    "circle"
  );

  // Formas geométricas CSS
  const shapeClasses = {
    circle: "rounded-full",
    diamond: "rotate-45 rounded-xl",
    hexagon: "rounded-2xl",
    shield: "rounded-t-2xl rounded-b-lg",
    square: "rounded-2xl",
  }[shape];

  return (
    <div
      data-node-id={id}
      className={`group relative flex flex-col items-center select-none cursor-pointer transition-[opacity,transform,filter] duration-200 ${
        dim ? "opacity-10 saturate-0 scale-90" : isNeighbor ? "scale-105" : "hover:scale-110"
      }`}
      style={{ minWidth: "110px" }}
    >
      {/* Handles centralizados no meio do orbe para conexões retas perfeitas */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ top: "29px", left: "50%", transform: "translate(-50%, -50%)" }}
        className="!opacity-0 !w-1 !h-1 !pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ top: "29px", left: "50%", transform: "translate(-50%, -50%)" }}
        className="!opacity-0 !w-1 !h-1 !pointer-events-none"
      />

      {/* Orbe / Forma Geométrica do Nó */}
      <div className="relative flex items-center justify-center">
        {/* Glow exterior da cor do nó */}
        {(selected || onPath || isNeighbor || isSource) && (
          <div
            className={`absolute inset-0 ${shapeClasses} blur-sm transition-opacity duration-200 pointer-events-none`}
            style={{
              background: color,
              opacity: selected || onPath ? 0.75 : 0.55,
              transform: shape === "diamond" ? "rotate(45deg) scale(1.18)" : "scale(1.18)",
            }}
          />
        )}

        {/* Corpo do Orbe */}
        <div
          className={`w-[58px] h-[58px] ${shapeClasses} flex items-center justify-center border-2 transition-[transform,border-color,box-shadow] duration-200 shadow-xl ${
            onPath ? "path-pulse ring-2 ring-gold" : ""
          } ${isSource ? "connect-source-ring ring-2 ring-teal" : ""} ${
            selected && !onPath
              ? "ring-4 ring-gold -translate-y-0.5 shadow-[0_0_36px_rgba(216,180,90,0.7)]"
              : isNeighbor
              ? "ring-2 ring-gold/80 border-gold shadow-[0_0_24px_rgba(216,180,90,0.45)]"
              : ""
          }`}
          style={{
            backgroundColor: "#0a0f1d",
            borderColor: selected ? "#ecd9a0" : isNeighbor ? "#d8b45a" : color,
            boxShadow: `0 8px 24px -4px rgba(0,0,0,0.9), inset 0 0 16px ${color}26`,
          }}
        >
          {/* Conteúdo interno: Ícone ou Imagem redonda */}
          <div className={`flex items-center justify-center ${shape === "diamond" ? "-rotate-45" : ""}`}>
            {data.image ? (
              <img
                src={data.image}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full object-cover pointer-events-none shadow-inner"
                onError={(ev) => ((ev.target as HTMLElement).style.display = "none")}
              />
            ) : (
              <span className="text-[25px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                {data.icon || "◆"}
              </span>
            )}
          </div>

          {/* Indicador de Ficha/Nível no topo direito */}
          {data.ficha?.level && (
            <span
              className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full font-mono text-[8px] font-bold bg-ink-950 border text-gold shadow-md ${
                shape === "diamond" ? "-rotate-45" : ""
              }`}
              style={{ borderColor: color }}
            >
              {data.ficha.level}
            </span>
          )}
        </div>
      </div>

      {/* Rótulo e Nome com Tipografia Elegante e Alto Contraste */}
      <div className="mt-2 flex flex-col items-center text-center max-w-[140px] pointer-events-none transition-transform duration-200">
        <div
          className={`px-2.5 py-1 rounded-lg border shadow-md transition-[color,border-color,box-shadow,background-color] duration-150 ${
            selected
              ? "bg-ink-950 border-gold ring-1 ring-gold shadow-[0_0_14px_rgba(216,180,90,0.4)]"
              : isNeighbor
              ? "bg-ink-950/95 border-gold/70 shadow-[0_0_10px_rgba(216,180,90,0.25)]"
              : "bg-ink-950/90 border-ink-700/80 group-hover:border-gold/60"
          }`}
        >
          <span
            className={`text-[12px] font-display font-bold leading-snug line-clamp-2 transition-colors ${
              selected ? "text-gold" : isNeighbor ? "text-parchment" : "text-parchment group-hover:text-gold"
            }`}
          >
            {data.label || "Sem nome"}
          </span>
        </div>

        {/* Tipo da Camada com Formato de Pílula Discreta */}
        <span
          className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] mt-1 px-1.5 py-0.2 rounded bg-ink-950/80 border border-ink-800/90 shadow-sm"
          style={{ color }}
        >
          {data.typeName || data.typeId}
        </span>
      </div>
    </div>
  );
}

export default React.memo(GraphNode);
