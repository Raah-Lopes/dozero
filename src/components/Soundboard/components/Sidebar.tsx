import { useRef, useState } from "react";
import { exportJSON, useApp, useUI } from "../store";
import { Icon } from "../data/icons";

const PAD_COLORS = ["#f6c453", "#4ce6a5", "#b78cff", "#fb7185", "#22d3ee", "#fb923c", "#ef4444", "#94a3b8"];
const PAD_ICONS = ["crown", "castle", "skull", "tree", "rocket", "city", "ship", "compass", "flame", "mountain", "book", "d20"];

function Item({
  active, onClick, icon, label, count, color,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-all ${
        active ? "bg-moss-500/10 text-parch" : "text-fog hover:bg-ink-800 hover:text-parch"
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 bg-moss-400 shadow-[0_0_8px_#2fd48c]" />}
      <span className="flex" style={{ color: active ? color ?? "#4ce6a5" : undefined }}>
        <Icon name={icon} size={16} sw={active ? 2 : 1.6} />
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      {count !== undefined && (
        <span className={`font-mono text-[10px] ${active ? "text-moss-300" : "text-fog-dim"}`}>{count}</span>
      )}
    </button>
  );
}

export function Sidebar({ onNewCategory }: { onNewCategory: () => void }) {
  const app = useApp();
  const ui = useUI();
  const { data, view } = app;
  const [newPad, setNewPad] = useState(false);
  const [padName, setPadName] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const uploads = Object.values(data.sounds).filter((s) => s.synth.startsWith("file:")).length;

  const createPad = () => {
    if (!padName.trim()) return;
    const id = "pad" + Date.now();
    app.addPad({
      id,
      name: padName.trim(),
      icon: PAD_ICONS[data.pads.length % PAD_ICONS.length],
      color: PAD_COLORS[data.pads.length % PAD_COLORS.length],
      soundIds: [],
    });
    app.setView({ kind: "pad", padId: id });
    app.toast(`Soundpad "${padName.trim()}" criado`);
    setPadName("");
    setNewPad(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ===== marca ===== */}
      <div className="relative border-b border-line-soft px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute -inset-1.5 rounded-full border border-dashed border-gold-400/30 spin-slow" />
            <span className="flex h-11 w-11 items-center justify-center border border-gold-400/50 bg-gold-400/10 text-gold-400 chamfer-sm">
              <Icon name="d20" size={24} sw={1.5} />
            </span>
          </div>
          <div>
            <h1 className="font-display text-lg font-black leading-none tracking-[0.22em] text-parch">
              ARCANUM
            </h1>
            <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.18em] text-fog-dim">
              Central Soundboard do Mestre
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* ===== navegação ===== */}
        <p className="px-4 pb-1 pt-4 font-mono text-[9px] uppercase tracking-[0.25em] text-fog-dim">Navegação</p>
        <nav className="flex flex-col">
          <Item active={view.kind === "all"} onClick={() => app.setView({ kind: "all" })} icon="dice" label="Todos os Sons" count={Object.keys(data.sounds).length} />
          <Item active={view.kind === "favorites"} onClick={() => app.setView({ kind: "favorites" })} icon="heart" label="Favoritos" count={data.favorites.length} color="#ff6161" />
          <Item active={view.kind === "scenes"} onClick={() => app.setView({ kind: "scenes" })} icon="layers" label="Cenas" count={data.scenes.length} color="#b78cff" />
          <Item active={view.kind === "uploads"} onClick={() => app.setView({ kind: "uploads" })} icon="upload" label="Meus Áudios" count={uploads} color="#4ce6a5" />
          <Item active={view.kind === "vtt"} onClick={() => app.setView({ kind: "vtt" })} icon="zap" label="Integração VTT" color="#e6c15c" />
        </nav>

        {/* ===== soundpads ===== */}
        <div className="mt-4 flex items-center justify-between px-4 pb-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-fog-dim">Soundpads</p>
          <button
            onClick={() => setNewPad((v) => !v)}
            className="p-1 text-fog-dim transition-colors hover:text-moss-300"
            aria-label="Novo soundpad"
          >
            <Icon name="plus" size={13} />
          </button>
        </div>
        {newPad && (
          <div className="fade-up mx-3 mb-2 flex items-center gap-1.5 border border-moss-600/40 bg-ink-800 p-1.5 chamfer-sm">
            <input
              autoFocus
              value={padName}
              onChange={(e) => setPadName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPad()}
              placeholder="Nome da campanha…"
              className="w-full bg-transparent px-1.5 text-xs text-parch outline-none placeholder:text-fog-dim"
            />
            <button onClick={createPad} className="text-moss-400 hover:text-moss-300">
              <Icon name="check" size={14} />
            </button>
            <button onClick={() => setNewPad(false)} className="text-fog-dim hover:text-blood-400">
              <Icon name="x" size={13} />
            </button>
          </div>
        )}
        <nav className="flex flex-col">
          {data.pads.map((p) => (
            <Item
              key={p.id}
              active={view.kind === "pad" && view.padId === p.id}
              onClick={() => app.setView({ kind: "pad", padId: p.id })}
              icon={p.icon}
              label={p.name}
              count={p.soundIds.length}
              color={p.color}
            />
          ))}
        </nav>

        {/* ===== vistas ===== */}
        <div className="mt-4 flex items-center justify-between px-4 pb-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-fog-dim">Vistas salvas</p>
        </div>
        {data.vistas.length === 0 ? (
          <p className="px-4 text-[11px] text-fog-dim">Salve um preset de filtros do soundpad.</p>
        ) : (
          <nav className="flex flex-col">
            {data.vistas.map((v) => (
              <div key={v.id} className="group flex items-center">
                <button
                  onClick={() => app.applyVista(v.id)}
                  className="flex flex-1 items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] text-fog transition-all hover:bg-ink-800 hover:text-gold-300"
                >
                  <Icon name="star" size={13} sw={1.5} />
                  <span className="flex-1 truncate">{v.name}</span>
                  <span className="font-mono text-[9px] uppercase text-fog-dim">
                    {v.typeFilter === "Todos" ? "todos" : v.typeFilter}
                  </span>
                </button>
                <button
                  onClick={() => app.deleteVista(v.id)}
                  className="mr-2 p-1 text-fog-dim opacity-0 transition-all hover:text-blood-400 group-hover:opacity-100"
                  aria-label={`Excluir vista ${v.name}`}
                >
                  <Icon name="x" size={11} />
                </button>
              </div>
            ))}
          </nav>
        )}

        {/* ===== categorias ===== */}
        <button
          onClick={onNewCategory}
          className="mx-3 mt-4 flex w-[calc(100%-24px)] items-center justify-center gap-1.5 border border-dashed border-line px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-fog-dim transition-colors hover:border-arc-400/50 hover:text-arc-300"
        >
          <Icon name="sparkle" size={12} /> nova categoria / tag
        </button>
      </div>

      {/* ===== rodapé ===== */}
      <div className="border-t border-line-soft p-3">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => {
              exportJSON(data);
              app.toast("Pacote .json exportado — compartilhe com outros mestres");
            }}
            className="flex items-center justify-center gap-1.5 border border-line bg-ink-800 px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-fog transition-colors hover:border-arc-400/50 hover:text-arc-300 chamfer-sm"
          >
            <Icon name="download" size={12} /> Exportar
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center justify-center gap-1.5 border border-line bg-ink-800 px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-fog transition-colors hover:border-moss-500/50 hover:text-moss-300 chamfer-sm"
          >
            <Icon name="upload" size={12} /> Importar
          </button>
          <button
            onClick={app.importCommunity}
            className="flex items-center justify-center gap-1.5 border border-line bg-ink-800 px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-fog transition-colors hover:border-gold-400/50 hover:text-gold-300 chamfer-sm"
            title="Importa o pacote comunitário Eldritch"
          >
            <Icon name="sparkle" size={12} /> Comunitário
          </button>
          <button
            onClick={ui.openHelp}
            className="flex items-center justify-center gap-1.5 border border-line bg-ink-800 px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-fog transition-colors hover:border-gold-400/50 hover:text-gold-300 chamfer-sm"
          >
            <Icon name="keyboard" size={12} /> Atalhos
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const ok = app.importJSON(await f.text());
            app.toast(ok ? "Biblioteca importada" : "Arquivo inválido", ok ? "ok" : "err");
            e.target.value = "";
          }}
        />
        <p className="mt-2.5 text-center font-mono text-[8.5px] uppercase tracking-[0.2em] text-fog-dim/70">
          v1.0 · módulo de imersão auditiva
        </p>
      </div>
    </div>
  );
}
