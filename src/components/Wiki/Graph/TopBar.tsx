import React, { useMemo, useState } from "react";
import type { WNode } from "./core";
import { ICluster, IDownload, IFit, IFlow, ILink, IPlus, ISearch, IStats, Sigil } from "./icons";
import { LoreWorkspaceSwitcher } from "../../Navigation/LoreWorkspaceSwitcher";
import { WorkspaceChrome } from "../../Navigation/WorkspaceChrome";

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
    <WorkspaceChrome
      title="Arcanum"
      subtitle="Cérebro-grafo RPG"
      icon={<Sigil />}
      navigation={<LoreWorkspaceSwitcher current="brain" />}
      search={(
        <div className="relative">
          <ISearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog" />
          <input
            value={q}
            onChange={(ev) => {
              setQ(ev.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            placeholder="Buscar personagem, #tag, local..."
            className="workspace-chrome-search-input pl-8 pr-3"
          />
          {open && results.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-lg border border-line bg-ink-850 shadow-2xl rise-in">
              {results.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pick(n.id)}
                  className="flex w-full items-center gap-2.5 border-b border-ink-800 px-3 py-2 text-left text-[12px] text-parchment transition-colors last:border-0 hover:bg-ink-700"
                >
                  <span className="text-[15px]">{n.data.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold">{n.data.label}</div>
                    {n.data.summary && <div className="truncate text-[10px] text-fog">{n.data.summary}</div>}
                  </div>
                  <span className="rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-gold">
                    {String(n.data.typeName ?? "")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      actions={(
      <div className="flex items-center gap-1">
        {/* Bloco de Criação */}
        <button
          type="button"
          onClick={p.onNewNode}
          className="workspace-chrome-button workspace-chrome-button--primary"
          title="Criar novo nó"
        >
          <IPlus className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Novo Nó</span>
        </button>

        <button
          type="button"
          onClick={p.onToggleConnect}
          className={`workspace-chrome-button ${p.connectMode ? "workspace-chrome-button--active" : ""}`}
          title="Modo Conectar (ou use Shift+arraste)"
        >
          <ILink className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Conectar</span>
        </button>

        <div className="workspace-chrome__divider hidden sm:block" />

        {/* Bloco de Layout & Física */}
        <button
          type="button"
          onClick={p.onCluster}
          className="workspace-chrome-button"
          title="Organizar em Constelações por Camada"
        >
          <ICluster className="h-3.5 w-3.5 text-gold" />
          <span className="hidden lg:inline">Constelações</span>
        </button>

        <button
          type="button"
          onClick={p.onTogglePhysics}
          className={`workspace-chrome-button ${p.physicsOn ? "workspace-chrome-button--active" : ""}`}
          title="Alternar Física Orgânica"
        >
          <IFlow className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Física</span>
        </button>

        <button
          type="button"
          onClick={p.onFit}
          className="workspace-chrome-icon-button"
          title="Enquadrar todos os nós"
        >
          <IFit className="h-3.5 w-3.5" />
        </button>

        <div className="workspace-chrome__divider hidden sm:block" />

        {/* Bloco de Exportação & Stats */}
        <button
          type="button"
          onClick={p.onExport}
          className="workspace-chrome-button"
          title="Exportar Imagem em Alta Resolução (.webp)"
        >
          <IDownload className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Exportar</span>
        </button>

        <button
          type="button"
          onClick={p.onStats}
          className="workspace-chrome-icon-button"
          title="Radiografia / Estatísticas"
        >
          <IStats className="h-3.5 w-3.5" />
        </button>

        {p.onClose && (
          <>
            <div className="workspace-chrome__divider" />
            <button
              type="button"
              onClick={p.onClose}
              className="workspace-chrome-button workspace-chrome-button--danger"
              title="Voltar para a Mesa de RPG"
            >
              <span>✕</span>
              <span className="hidden sm:inline">Voltar à Mesa</span>
            </button>
          </>
        )}
      </div>
      )}
    />
  );
}
