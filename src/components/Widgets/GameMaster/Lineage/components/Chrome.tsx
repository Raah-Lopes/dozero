import { useMemo } from "react";
import type { TreeStats } from "../model/tree";
import {
  BrandSigil, IconFile, IconData, IconGenerations, IconHouse, IconLink,
  IconPlus, IconRedo, IconSearch, IconUndo, IconUsers, IconX,
} from "./icons";
import { LoreWorkspaceSwitcher } from "../../../../Navigation/LoreWorkspaceSwitcher";
import { WorkspaceChrome } from "../../../../Navigation/WorkspaceChrome";

/* ---------------- barra superior ---------------- */

export interface ToolbarProps {
  query: string;
  onQuery: (q: string) => void;
  matchCount: number;
  onFocusFirst: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onData: () => void;
  onAddRoot: () => void;
  onClose?: () => void;
  syncLabel?: string;
}

export function Toolbar(p: ToolbarProps) {
  return (
    <WorkspaceChrome
      title="Linhagem"
      subtitle="Atlas de casas & dinastias"
      icon={<BrandSigil size={27} />}
      navigation={<LoreWorkspaceSwitcher current="lineage" />}
      search={(
        <div className="relative">
          <IconSearch size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") p.onFocusFirst();
            }}
            placeholder="Buscar nome, casa, nota…"
            className="workspace-chrome-search-input pl-8 pr-14"
          />
          {p.query && (
            <span className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              <button
                type="button"
                onClick={p.onFocusFirst}
                title="Localizar no mapa (Enter)"
                className="rounded-sm bg-brass/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brass-bright transition-colors hover:bg-brass/30"
              >
                {p.matchCount}
              </button>
              <button
                type="button"
                onClick={() => p.onQuery("")}
                aria-label="Limpar busca"
                className="rounded-sm p-1 text-muted transition-colors hover:text-parchment"
              >
                <IconX size={12} />
              </button>
            </span>
          )}
        </div>
      )}
      actions={(
      <div className="flex items-center gap-1">
        {p.syncLabel && (
          <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-line bg-ink-800/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-moss shadow-[0_0_8px_rgba(111,161,115,0.8)]" />
            {p.syncLabel}
          </span>
        )}
        <ToolBtn label="Desfazer (Ctrl+Z)" disabled={!p.canUndo} onClick={p.onUndo}>
          <IconUndo size={15} />
        </ToolBtn>
        <ToolBtn label="Refazer (Ctrl+Shift+Z)" disabled={!p.canRedo} onClick={p.onRedo}>
          <IconRedo size={15} />
        </ToolBtn>
        <span className="workspace-chrome__divider" />
        <ToolBtn label="Nova árvore em branco" onClick={p.onNew}>
          <IconFile size={15} />
        </ToolBtn>
        <ToolBtn label="Importar / exportar JSON" onClick={p.onData}>
          <IconData size={15} />
        </ToolBtn>
        <span className="workspace-chrome__divider" />
        <button
          type="button"
          onClick={p.onAddRoot}
          className="workspace-chrome-button workspace-chrome-button--primary"
        >
          <IconPlus size={14} /> Membro
        </button>
        {p.onClose && (
          <ToolBtn label="Fechar Linhagem (Esc)" onClick={p.onClose}>
            <IconX size={16} />
          </ToolBtn>
        )}
      </div>
      )}
    />
  );
}

function ToolBtn({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="workspace-chrome-icon-button rounded-sm border-transparent text-parchment-dim enabled:hover:text-brass-bright"
    >
      {children}
    </button>
  );
}

/* ---------------- estatísticas ---------------- */

export function StatsBar({ stats }: { stats: TreeStats }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-1.5">
      <Pill icon={<IconUsers size={12} />} label="Membros" value={stats.members} />
      <Pill icon={<IconLink size={12} />} label="Vínculos" value={stats.bonds} />
      <Pill icon={<IconHouse size={12} />} label="Casas" value={stats.houses} />
      <Pill icon={<IconGenerations size={12} />} label="Gerações" value={stats.generations} />
    </div>
  );
}

function Pill({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 rounded-md border border-line bg-ink-900/90 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted shadow-lg backdrop-blur-sm">
      <span className="text-brass/80">{icon}</span>
      {label}
      <strong className="font-display text-[12px] tracking-normal text-parchment">{value}</strong>
    </span>
  );
}

/* ---------------- legenda + dica ---------------- */

export function HintBar() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-4 rounded-md border border-line/70 bg-ink-900/80 px-3.5 py-1.5 text-[10.5px] text-muted backdrop-blur-sm lg:flex">
      <span>Arraste para navegar</span>
      <Dot className="bg-brass/50" />
      <span>Role para zoom</span>
      <Dot className="bg-brass/50" />
      <span>Clique duplo edita</span>
      <Dot className="bg-brass/50" />
      <span className="flex items-center gap-1.5">
        <Dot className="bg-moss" /> vivo
        <Dot className="ml-1 bg-blood" /> falecido
        <Dot className="ml-1 bg-slate-400" /> incerto
      </span>
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />;
}

/* ---------------- toasts ---------------- */

export interface ToastItem {
  id: number;
  msg: string;
  tone: "ok" | "err" | "info";
}

const TONE_COLOR: Record<ToastItem["tone"], string> = {
  ok: "#c9a227",
  err: "#b0432f",
  info: "#3f8f7d",
};

export function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter rounded-md border border-line bg-ink-900/95 px-4 py-2 text-[12px] font-medium text-parchment-dim shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-sm"
          style={{ borderLeft: `3px solid ${TONE_COLOR[t.tone]}` }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ---------------- brasas ambientes ---------------- */

export function Embers() {
  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        dur: `${11 + ((i * 53) % 12)}s`,
        delay: `${-((i * 31) % 14)}s`,
        peak: 0.25 + ((i * 17) % 10) / 22,
        dx: `${((i % 5) - 2) * 26}px`,
        size: 2 + (i % 3),
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {embers.map((e, index) => (
        <span
          key={`${e.id}-${index}`}
          className="ember"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            ["--dur" as string]: e.dur,
            ["--delay" as string]: e.delay,
            ["--peak" as string]: String(e.peak),
            ["--dx" as string]: e.dx,
          }}
        />
      ))}
    </div>
  );
}
