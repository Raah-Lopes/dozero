import React, { useMemo, useState } from "react";
import type { WNode } from "./core";
import { ICluster, IDownload, IFit, IFlow, ILink, IPlus, ISearch, IStats, Sigil } from "./icons";
import { LoreWorkspaceSwitcher } from "../../Navigation/LoreWorkspaceSwitcher";

interface TopBarProps {
  nodes: WNode[];
  edgeCount: number;
  connectMode: boolean;
  physicsOn: boolean;
  onToggleConnect: () => void;
  onTogglePhysics: () => void;
  onNewNode: () => void;
  onCluster: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExport: () => void;
  onStats: () => void;
  onFocusNode: (id: string) => void;
  onClose?: () => void;
}

export default function TopBar(p: TopBarProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return p.nodes
      .filter((n) => {
        const text = `${n.data.label} ${n.data.summary} ${(n.data.tags ?? []).join(" ")}`.toLowerCase();
        return text.includes(s);
      })
      .slice(0, 8);
  }, [q, p.nodes]);

  const pick = (id: string) => {
    p.onFocusNode(id);
    setOpen(false);
    setQ("");
  };

  return (
    <header className="h-[54px] shrink-0 relative z-40 flex items-center justify-between px-4 border-b border-ink-700 bg-ink-900/98 backdrop-blur-md">
      {/* 1. Identidade RPG */}
      <div className="flex items-center gap-3 pr-4 border-r border-ink-700 h-8">
        <Sigil className="w-7 h-7 drop-shadow-[0_0_10px_rgba(216,180,90,0.5)]" />
        <div className="leading-none hidden sm:block">
          <div className="font-display font-black text-[16px] tracking-[0.14em] text-parchment">ARCANUM</div>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-gold font-bold">cérebro-grafo rpg</div>
        </div>
      </div>

      <div className="mx-2 hidden sm:block">
        <LoreWorkspaceSwitcher current="brain" />
      </div>

      {/* 2. Busca Inteligente Centralizada */}
      <div className="relative flex-1 max-w-[320px] mx-2">
        <ISearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(ev) => {
            setQ(ev.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          placeholder="Buscar personagem, #tag, local..."
          className="w-full bg-ink-850 border border-ink-600 rounded-lg pl-8 pr-3 h-8 text-[12px] text-parchment placeholder:text-ink-400 focus:border-gold transition-colors"
        />
        {open && results.length > 0 && (
          <div className="absolute top-10 left-0 right-0 rounded-xl border border-ink-600 bg-ink-850 shadow-2xl overflow-hidden rise-in z-50">
            {results.map((n) => (
              <button
                key={n.id}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(n.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] text-parchment hover:bg-ink-700 transition-colors border-b border-ink-800 last:border-0"
              >
                <span className="text-[15px]">{n.data.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-[12.5px]">{n.data.label}</div>
                  {n.data.summary && <div className="text-[10px] text-fog truncate">{n.data.summary}</div>}
                </div>
                <span className="font-mono text-[8.5px] uppercase tracking-wider text-gold px-1.5 py-0.5 rounded bg-ink-900 border border-ink-700">
                  {String(n.data.typeName ?? "")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Barra de Ferramentas Organizada em Blocos */}
      <div className="flex items-center gap-2">
        {/* Bloco de Criação */}
        <button
          type="button"
          onClick={p.onNewNode}
          className="flex items-center gap-1.5 rounded-lg bg-gold text-ink-950 px-3 h-8 text-[11.5px] font-bold hover:bg-gold-300 transition-colors shadow-sm"
          title="Criar novo nó"
        >
          <IPlus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Novo Nó</span>
        </button>

        <button
          type="button"
          onClick={p.onToggleConnect}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-[11.5px] font-bold transition-all border ${
            p.connectMode
              ? "bg-teal text-ink-950 border-teal shadow-[0_0_12px_rgba(95,208,197,0.5)]"
              : "bg-ink-800 border-ink-600 text-parchment hover:border-gold"
          }`}
          title="Modo Conectar (ou use Shift+arraste)"
        >
          <ILink className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Conectar</span>
        </button>

        <div className="w-px h-5 bg-ink-700 mx-0.5 hidden sm:block" />

        {/* Bloco de Layout & Física */}
        <button
          type="button"
          onClick={p.onCluster}
          className="flex items-center gap-1 rounded-lg bg-ink-800 border border-ink-600 px-2.5 h-8 text-[11.5px] text-parchment hover:border-gold transition-colors"
          title="Organizar em Constelações por Camada"
        >
          <ICluster className="w-3.5 h-3.5 text-gold" />
          <span className="hidden lg:inline">Constelações</span>
        </button>

        <button
          type="button"
          onClick={p.onTogglePhysics}
          className={`flex items-center gap-1 rounded-lg px-2.5 h-8 text-[11.5px] transition-all border ${
            p.physicsOn
              ? "bg-teal/20 border-teal text-teal font-bold"
              : "bg-ink-800 border-ink-600 text-fog hover:text-parchment hover:border-gold"
          }`}
          title="Alternar Física Orgânica"
        >
          <IFlow className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Física</span>
        </button>

        <button
          type="button"
          onClick={p.onFit}
          className="p-1.5 rounded-lg bg-ink-800 border border-ink-600 text-fog hover:text-parchment hover:border-gold h-8 w-8 grid place-items-center transition-colors"
          title="Enquadrar todos os nós"
        >
          <IFit className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-ink-700 mx-0.5 hidden sm:block" />

        {/* Bloco de Exportação & Stats */}
        <button
          type="button"
          onClick={p.onExport}
          className="flex items-center gap-1 rounded-lg bg-ink-800 border border-ink-600 px-2.5 h-8 text-[11.5px] text-fog hover:text-parchment hover:border-gold transition-colors"
          title="Exportar Imagem em Alta Resolução (.webp)"
        >
          <IDownload className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Exportar</span>
        </button>

        <button
          type="button"
          onClick={p.onStats}
          className="p-1.5 rounded-lg bg-ink-800 border border-ink-600 text-teal hover:border-teal h-8 w-8 grid place-items-center transition-colors"
          title="Radiografia / Estatísticas"
        >
          <IStats className="w-3.5 h-3.5" />
        </button>

        {p.onClose && (
          <>
            <div className="w-px h-5 bg-ink-700 mx-0.5" />
            <button
              type="button"
              onClick={p.onClose}
              className="flex items-center gap-1.5 rounded-lg bg-ember/20 hover:bg-ember text-ember hover:text-ink-950 border border-ember/40 px-3 h-8 text-[11.5px] font-bold transition-all shadow-sm"
              title="Voltar para a Mesa de RPG"
            >
              <span>✕</span>
              <span className="hidden sm:inline">Voltar à Mesa</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
