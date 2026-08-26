import React, { useMemo, useState } from "react";
import type { WNode } from "./core";

/**
 * Renderiza texto com links wiki [[Nome do Nó]] clicáveis.
 * Ao clicar no link, abre instantaneamente a Ficha do nó correspondente.
 */
export function LinkedText({
  text,
  nodes,
  onOpenFicha,
  className = "",
}: {
  text: string;
  nodes: WNode[];
  onOpenFicha: (id: string) => void;
  className?: string;
}) {
  const parts = useMemo(() => {
    if (!text) return [];
    // Divide o texto mantendo as tags [[...]]
    const regex = /(\[\[.*?\]\])/g;
    return text.split(regex);
  }, [text]);

  if (!text) return null;

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {parts.map((part, i) => {
        if (part.startsWith("[[") && part.endsWith("]]")) {
          const target = part.slice(2, -2).trim();
          const targetLower = target.toLowerCase();
          const matchedNode = nodes.find(
            (n) => n.id.toLowerCase() === targetLower || n.data.label.toLowerCase() === targetLower
          );

          if (matchedNode) {
            const color = matchedNode.data.tint || "#d8b45a";
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFicha(matchedNode.id);
                }}
                className="inline-flex items-center gap-1 font-bold rounded px-1.5 py-0.5 mx-0.5 border transition-all text-[11.5px] hover:scale-105 shadow-sm"
                style={{
                  color: color,
                  backgroundColor: `${color}18`,
                  borderColor: `${color}55`,
                }}
                title={`Abrir ficha de: ${matchedNode.data.label}`}
              >
                <span>{matchedNode.data.icon || "🔗"}</span>
                <span className="underline underline-offset-2">{matchedNode.data.label}</span>
              </button>
            );
          }

          // Se não encontrou o nó, exibe como texto destacado
          return (
            <span key={i} className="text-gold/70 font-mono text-[11px] px-1 bg-ink-800 rounded">
              {target}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

/**
 * Menu/Botão para inserir link para outro nó dentro de qualquer campo de texto
 */
export function LinkInserter({
  nodes,
  currentNodeId,
  onInsert,
}: {
  nodes: WNode[];
  currentNodeId: string;
  onInsert: (linkText: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const availableNodes = useMemo(() => {
    const s = search.toLowerCase().trim();
    return nodes
      .filter((n) => n.id !== currentNodeId)
      .filter((n) => (n.data.label || "").toLowerCase().includes(s))
      .slice(0, 8);
  }, [nodes, currentNodeId, search]);

  const handlePick = (node: WNode) => {
    onInsert(`[[${node.data.label}]]`);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-gold hover:text-gold-300 bg-gold/10 hover:bg-gold/20 border border-gold-700/60 rounded px-2 py-1 transition-colors"
        title="Inserir link para abrir outra ficha neste texto"
      >
        <span>🔗</span> Inserir Link de Ficha
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-1.5 w-[240px] rounded-xl border border-ink-600 bg-ink-900 shadow-2xl p-2 z-50 rise-in">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nó para linkar..."
            className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1 text-[11.5px] text-parchment placeholder:text-ink-400 focus:border-gold mb-1.5"
          />

          <div className="max-h-[150px] overflow-y-auto space-y-0.5">
            {availableNodes.length === 0 && (
              <p className="text-[11px] text-fog italic px-2 py-1">Nenhum nó encontrado.</p>
            )}
            {availableNodes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handlePick(n)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-lg hover:bg-ink-800 transition-colors"
              >
                <span className="text-[14px]">{n.data.icon}</span>
                <span className="text-[11.5px] font-bold text-parchment truncate flex-1">{n.data.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-ink-700 mt-1 pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-fog hover:text-parchment px-2 py-0.5"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
