import React, { useState } from "react";
import type { NodeShape, TypeReg, WEdge, WNode } from "./core";
import { ICON_PRESETS, NODE_TINTS, extractLinkedNodes, normalizeTag } from "./core";
import { LinkedText, LinkInserter } from "./LinkedText";
import { IPencil, IRoute, ITarget, ITrash, IX } from "./icons";

interface InspectorProps {
  node: WNode;
  nodes: WNode[];
  edges: WEdge[];
  types: TypeReg[];
  onChange: (id: string, patch: Partial<WNode["data"]>) => void;
  onDelete: (id: string) => void;
  onFocusCenter: (id: string) => void;
  onStartPath: (id: string) => void;
  onEditEdge: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onJumpNode: (id: string) => void;
  onHighlightGroup: (typeId: string) => void;
  onOpenFicha: (id: string) => void;
  onClose: () => void;
}

export default function Inspector(p: InspectorProps) {
  const { node } = p;
  const d = node.data;
  const type = p.types.find((t) => t.id === d.typeId) ?? p.types[0];
  const color = d.tint || type.color;
  const tags = d.tags ?? [];
  const [newTag, setNewTag] = useState("");

  const relations = p.edges.filter((e) => e.source === node.id || e.target === node.id);
  const mentionedNodes = extractLinkedNodes(d.summary || "", p.nodes).filter((n) => n.id !== node.id);

  const addTag = () => {
    const formatted = normalizeTag(newTag);
    if (formatted && !tags.includes(formatted)) {
      p.onChange(node.id, { tags: [...tags, formatted] });
      setNewTag("");
    }
  };

  const removeTag = (t: string) => {
    p.onChange(node.id, { tags: tags.filter((x) => x !== t) });
  };

  const shapes: { id: NodeShape; label: string; icon: string }[] = [
    { id: "circle", label: "Círculo", icon: "●" },
    { id: "diamond", label: "Losango", icon: "◆" },
    { id: "hexagon", label: "Hexágono", icon: "⬡" },
    { id: "shield", label: "Escudo", icon: "🛡" },
    { id: "square", label: "Quadrado", icon: "■" },
  ];

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[330px] z-30 border-l border-ink-700 bg-ink-900/98 backdrop-blur-xl flex flex-col rise-in hud-shadow shadow-2xl">
      {/* 1. Cabeçalho de Destaque */}
      <div className="p-4 border-b border-ink-700 relative overflow-hidden shrink-0 bg-ink-850">
        <div className="absolute inset-0 opacity-[0.14]" style={{ background: `radial-gradient(320px 140px at 0% 0%, ${color}, transparent 80%)` }} />
        
        <div className="relative flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center text-[24px] border shrink-0 shadow-md"
            style={{
              background: `${color}22`,
              borderColor: `${color}66`,
              boxShadow: `0 0 16px ${color}33`,
            }}
          >
            {d.image ? (
              <img src={d.image} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span>{d.icon || "◆"}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
              {type.name}
            </span>
            <div className="font-display font-black text-[16px] leading-tight text-parchment break-words mt-0.5">
              {d.label || "Sem nome"}
            </div>
          </div>

          <button
            type="button"
            onClick={p.onClose}
            className="text-fog hover:text-parchment p-1 rounded-lg hover:bg-ink-800 transition-colors"
            title="Fechar painel"
          >
            <IX className="w-4 h-4" />
          </button>
        </div>

        {/* Botão de Destaque: Abrir Ficha Completa */}
        <button
          type="button"
          onClick={() => p.onOpenFicha(node.id)}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold/15 via-gold/30 to-gold/15 border border-gold text-gold py-2 text-[11.5px] font-bold hover:brightness-110 transition-all shadow-md"
        >
          <span>📜</span> Abrir Ficha Completa RPG
        </button>
      </div>

      {/* 2. Conteúdo em Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12px]">
        {/* Rótulo & Camada */}
        <div className="space-y-3">
          <div>
            <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Nome / Rótulo</label>
            <input
              value={d.label}
              onChange={(e) => p.onChange(node.id, { label: e.target.value })}
              className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment font-bold focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Camada</label>
              <select
                value={d.typeId}
                onChange={(e) => {
                  const nt = p.types.find((t) => t.id === e.target.value);
                  p.onChange(node.id, {
                    typeId: e.target.value,
                    icon: nt?.icon ?? d.icon,
                    shape: nt?.shape ?? d.shape,
                  });
                }}
                className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2 py-1.5 text-parchment text-[11px]"
              >
                {p.types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Forma</label>
              <select
                value={d.shape || "circle"}
                onChange={(e) => p.onChange(node.id, { shape: e.target.value as NodeShape })}
                className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2 py-1.5 text-parchment text-[11px]"
              >
                {shapes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tags / Hashtags */}
        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Tags / Classificação</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 font-mono text-[10px] bg-ink-800 text-parchment px-2 py-0.5 rounded-full border border-ink-600">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="text-fog hover:text-ember">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="#nova-tag"
              className="flex-1 bg-ink-850 border border-ink-600 rounded-lg px-2 py-1 text-[11px] text-parchment placeholder:text-ink-400"
            />
            <button type="button" onClick={addTag} className="px-2.5 rounded-lg bg-ink-700 hover:bg-gold hover:text-ink-950 font-bold text-[11px] transition-colors">
              +
            </button>
          </div>
        </div>

        {/* Resumo com suporte a Links Wiki */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-mono text-[10px] uppercase text-fog tracking-wider">Resumo & Lore</label>
            <LinkInserter
              nodes={p.nodes}
              currentNodeId={node.id}
              onInsert={(link) => p.onChange(node.id, { summary: `${d.summary || ""} ${link}`.trim() })}
            />
          </div>
          <textarea
            value={d.summary}
            rows={3}
            onChange={(e) => p.onChange(node.id, { summary: e.target.value })}
            placeholder="Breve descrição narrativa deste fragmento..."
            className="w-full bg-ink-850 border border-ink-600 rounded-lg p-2 text-parchment text-[11.5px] leading-relaxed resize-none focus:border-gold mb-1"
          />
          {d.summary && (
            <div className="p-2 rounded-lg bg-ink-950/60 border border-ink-800 text-[11px] text-fog">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-400 block mb-0.5">Pré-visualização:</span>
              <LinkedText text={d.summary} nodes={p.nodes} onOpenFicha={p.onOpenFicha} />
            </div>
          )}
        </div>

        {/* Menções Automáticas */}
        {mentionedNodes.length > 0 && (
          <div>
            <label className="font-mono text-[10px] uppercase text-gold tracking-wider block mb-1">Fichas Mencionadas</label>
            <div className="space-y-1">
              {mentionedNodes.map((mn) => (
                <div key={mn.id} className="flex items-center justify-between p-1.5 rounded-lg bg-ink-850 border border-ink-700 text-[11px]">
                  <span className="truncate flex-1 font-bold text-parchment">
                    {mn.data.icon} {mn.data.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => p.onOpenFicha(mn.id)}
                    className="font-mono text-[9.5px] text-gold hover:underline ml-2"
                  >
                    Ver Ficha
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Laços / Relações Conectadas */}
        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">
            Relações ({relations.length})
          </label>
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {relations.length === 0 ? (
              <p className="text-[11px] text-fog italic">Nenhum laço conectado ainda.</p>
            ) : (
              relations.map((e) => {
                const isSrc = e.source === node.id;
                const otherId = isSrc ? e.target : e.source;
                const other = p.nodes.find((n) => n.id === otherId);
                return (
                  <div key={e.id} className="flex items-center justify-between p-1.5 rounded-lg bg-ink-850 border border-ink-700 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-mono text-[9px] text-fog">{isSrc ? "→" : "←"}</span>
                      <span className="truncate font-bold text-parchment">{other?.data.label ?? "?"}</span>
                      {e.data?.label && (
                        <span className="font-mono text-[9px] px-1 rounded bg-ink-950 text-gold truncate">
                          {e.data.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => p.onEditEdge(e.id)}
                        className="p-1 text-fog hover:text-gold"
                        title="Editar laço"
                      >
                        <IPencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => p.onDeleteEdge(e.id)}
                        className="p-1 text-fog hover:text-ember"
                        title="Remover laço"
                      >
                        <ITrash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Personalização Visual Rápida */}
        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Ícone e Brilho</label>
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {ICON_PRESETS.slice(0, 14).map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => p.onChange(node.id, { icon: ic })}
                className={`w-6 h-6 rounded text-[13px] grid place-items-center ${d.icon === ic ? "bg-gold/30 border border-gold" : "hover:bg-ink-800"}`}
              >
                {ic}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-fog">Brilho:</span>
            {NODE_TINTS.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => p.onChange(node.id, { tint: t })}
                className={`w-4 h-4 rounded-full border ${d.tint === t ? "ring-2 ring-gold" : ""}`}
                style={{ background: t || type.color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Rodapé de Ações Estratégicas */}
      <div className="p-3 border-t border-ink-700 bg-ink-850 grid grid-cols-3 gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => p.onFocusCenter(node.id)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-ink-800 hover:bg-gold hover:text-ink-950 text-parchment font-mono text-[9px] uppercase tracking-wider transition-colors"
          title="Centralizar o mundo neste nó"
        >
          <ITarget className="w-3.5 h-3.5" />
          Foco Radial
        </button>

        <button
          type="button"
          onClick={() => p.onStartPath(node.id)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-ink-800 hover:bg-teal hover:text-ink-950 text-parchment font-mono text-[9px] uppercase tracking-wider transition-colors"
          title="Traçar rota a partir deste nó"
        >
          <IRoute className="w-3.5 h-3.5" />
          Traçar Rota
        </button>

        <button
          type="button"
          onClick={() => p.onDelete(node.id)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-ink-800 hover:bg-ember hover:text-parchment text-fog font-mono text-[9px] uppercase tracking-wider transition-colors"
          title="Remover nó"
        >
          <ITrash className="w-3.5 h-3.5" />
          Excluir
        </button>
      </div>
    </div>
  );
}
