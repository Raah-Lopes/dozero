import { useMemo, useRef, useState, type DragEvent } from "react";
import { engine } from "../audio/engine";
import { exportJSON, exportWebp, selectVisible, useApp, useUI } from "../store";
import { Icon } from "../data/icons";
import { SoundCard } from "./SoundCard";
import type { SoundType } from "../types";

const TYPE_FILTERS: (SoundType | "Todos")[] = ["Todos", "SFX", "Música", "Ambiente"];

export function SoundGrid() {
  const app = useApp();
  const ui = useUI();
  const { data, view, filters, layers } = app;
  const importRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [showVista, setShowVista] = useState(false);
  const [vistaName, setVistaName] = useState("");
  const drafting = draftIds.length > 0;

  const sounds = useMemo(() => selectVisible(data, view, filters), [data, view, filters]);
  const playingSet = useMemo(() => new Set(layers.map((l) => l.soundId)), [layers]);
  const catById = useMemo(() => Object.fromEntries(data.categories.map((c) => [c.id, c])), [data.categories]);

  /* contagem por categoria (respeita tipo + busca, antes do filtro de categoria) */
  const baseForCounts = useMemo(
    () => selectVisible(data, view, { ...filters, categoryFilter: "all" }),
    [data, view, filters]
  );
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    baseForCounts.forEach((s) => (m[s.categoryId] = (m[s.categoryId] ?? 0) + 1));
    return m;
  }, [baseForCounts]);

  /* cabeçalho da vista */
  const header = useMemo(() => {
    if (view.kind === "favorites") return { icon: "heart", color: "#ff6161", name: "Favoritos", sub: "coleção fixa do mestre" };
    if (view.kind === "all") return { icon: "dice", color: "#e6c15c", name: "Biblioteca Completa", sub: "todos os sons de todas as campanhas" };
    if (view.kind !== "pad") return { icon: "dice", color: "#e6c15c", name: "ARCANUM", sub: "central soundboard" };
    const pad = data.pads.find((p) => p.id === view.padId);
    return { icon: pad?.icon ?? "dice", color: pad?.color ?? "#e6c15c", name: pad?.name ?? "Soundpad", sub: "soundpad de campanha" };
  }, [view, data.pads]);

  const favoriteSounds = data.favorites.map((id) => data.sounds[id]).filter(Boolean);

  /* ---------- DnD ---------- */
  const onDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    if (e.shiftKey) {
      setDraftIds([id]);
    } else {
      setDragId(id);
    }
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (drafting && !draftIds.includes(id)) setDraftIds((d) => [...d, id]);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (drafting) {
      const ids = draftIds.includes(id) ? draftIds : [...draftIds, id];
      setDraftIds([]);
      if (ids.length > 0) ui.openSceneFrom(ids);
      return;
    }
    if (dragId && dragId !== id && view.kind === "pad") {
      app.reorderInPad(view.padId, dragId, id);
    }
    setDragId(null);
  };
  const onDragEnd = () => {
    setDragId(null);
    setDraftIds([]);
  };

  const saveCurrentVista = () => {
    if (!vistaName.trim()) return;
    const padId = view.kind === "pad" ? view.padId : view.kind === "favorites" ? "favorites" : "all";
    app.saveVista({
      id: "vis" + Date.now(),
      name: vistaName.trim(),
      padId,
      typeFilter: filters.typeFilter,
      categoryId: filters.categoryFilter,
      search: filters.search,
    });
    app.toast(`Vista "${vistaName.trim()}" salva`);
    setVistaName("");
    setShowVista(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* ===== cabeçalho ===== */}
      <div className="fade-up flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-14 w-14 items-center justify-center border chamfer"
            style={{ color: header.color, borderColor: header.color + "55", background: header.color + "12" }}
          >
            <Icon name={header.icon} size={28} sw={1.5} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-dim">{header.sub}</p>
            <h1 className="font-display text-2xl font-bold tracking-wide text-parch md:text-3xl">{header.name}</h1>
          </div>
          <span className="ml-2 border border-line bg-ink-800 px-2 py-1 font-mono text-[11px] text-fog">
            {sounds.length} {sounds.length === 1 ? "som" : "sons"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 border border-line bg-ink-800 px-3 py-2 transition-colors focus-within:border-moss-500/60 chamfer-sm">
            <Icon name="search" size={14} className="text-fog-dim" />
            <input
              value={filters.search}
              onChange={(e) => app.setSearch(e.target.value)}
              placeholder="Buscar som…"
              className="w-36 bg-transparent text-sm text-parch outline-none placeholder:text-fog-dim"
            />
            {filters.search && (
              <button onClick={() => app.setSearch("")} className="text-fog-dim hover:text-blood-400">
                <Icon name="x" size={12} />
              </button>
            )}
          </label>

          <button
            onClick={() => setShowVista((v) => !v)}
            className="flex items-center gap-1.5 border border-line bg-ink-800 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-fog transition-colors hover:border-gold-400/60 hover:text-gold-300 chamfer-sm"
          >
            <Icon name="star" size={13} /> Salvar vista
          </button>
          <button
            onClick={() => ui.openEditor("new")}
            className="flex items-center gap-1.5 border border-moss-600/50 bg-moss-500/10 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-moss-300 transition-colors hover:bg-moss-500/20 chamfer-sm"
          >
            <Icon name="plus" size={13} /> Novo som
          </button>
          <button
            onClick={() => {
              exportJSON(data);
              app.toast("Soundboard exportado (.json)");
            }}
            className="flex items-center gap-1.5 border border-line bg-ink-800 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-fog transition-colors hover:border-arc-400/60 hover:text-arc-300 chamfer-sm"
            title="Exportar pacote .json"
          >
            <Icon name="download" size={13} /> .json
          </button>
          <button
            onClick={() => {
              const scene = data.scenes.find((s) => s.id === app.activeSceneId);
              exportWebp(layers, data, scene?.name ?? null);
              app.toast("Painel exportado como imagem");
            }}
            className="flex items-center gap-1.5 border border-line bg-ink-800 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-fog transition-colors hover:border-arc-400/60 hover:text-arc-300 chamfer-sm"
            title="Exportar cena atual como imagem"
          >
            <Icon name="image" size={13} /> .webp
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 border border-line bg-ink-800 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-fog transition-colors hover:border-moss-500/60 hover:text-moss-300 chamfer-sm"
          >
            <Icon name="upload" size={13} /> Importar
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const ok = app.importJSON(await f.text());
              app.toast(ok ? "Biblioteca importada com sucesso" : "Arquivo inválido", ok ? "ok" : "err");
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* ===== vista modal ===== */}
      {showVista && (
        <div className="fade-up mt-3 flex items-center gap-2 border border-gold-400/30 bg-gold-400/5 px-3 py-2 chamfer-sm">
          <Icon name="star" size={14} className="text-gold-400" />
          <input
            autoFocus
            value={vistaName}
            onChange={(e) => setVistaName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveCurrentVista()}
            placeholder="Nome da vista (ex: Boss Fight Cave)…"
            className="flex-1 bg-transparent text-sm text-parch outline-none placeholder:text-fog-dim"
          />
          <button onClick={saveCurrentVista} className="font-mono text-[10.5px] uppercase tracking-wider text-gold-300 hover:text-gold-400">
            salvar
          </button>
          <button onClick={() => setShowVista(false)} className="text-fog-dim hover:text-blood-400">
            <Icon name="x" size={13} />
          </button>
        </div>
      )}

      {/* ===== filtros ===== */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex border border-line bg-ink-800 chamfer-sm">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => app.setTypeFilter(t)}
              className={`px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors ${
                filters.typeFilter === t ? "bg-moss-500/15 text-moss-300" : "text-fog-dim hover:text-parch"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => app.setCategoryFilter("all")}
            className={`shrink-0 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all chamfer-sm ${
              filters.categoryFilter === "all"
                ? "border-parch/40 bg-parch/10 text-parch"
                : "border-line bg-ink-800 text-fog-dim hover:text-parch"
            }`}
          >
            Todas
          </button>
          {data.categories.map((c) => {
            const active = filters.categoryFilter === c.id;
            const count = catCounts[c.id] ?? 0;
            if (count === 0 && !active) return null;
            return (
              <button
                key={c.id}
                onClick={() => app.setCategoryFilter(active ? "all" : c.id)}
                className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all chamfer-sm ${
                  active ? "text-parch" : "border-line bg-ink-800 text-fog-dim hover:text-parch"
                }`}
                style={active ? { borderColor: c.color + "88", background: c.color + "18" } : undefined}
              >
                <span className="inline-block h-2 w-2 rotate-45" style={{ background: c.color }} />
                {c.name}
                <span className="opacity-60">{count}</span>
              </button>
            );
          })}
          <button
            onClick={() => ui.openEditor("new")}
            className="shrink-0 border border-dashed border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fog-dim transition-colors hover:border-arc-400/50 hover:text-arc-300"
            title="Novas categorias são criadas na barra lateral"
          >
            + som
          </button>
        </div>
      </div>

      {/* ===== faixa de favoritos ===== */}
      {view.kind === "pad" && favoriteSounds.length > 0 && (
        <div className="mt-4 border border-line-soft bg-ink-850/70 p-2.5 chamfer-sm">
          <p className="mb-2 flex items-center gap-1.5 px-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog-dim">
            <Icon name="heartFill" size={11} className="text-blood-400" /> Favoritos
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favoriteSounds.map((s) => {
              const cat = catById[s.categoryId];
              const playing = playingSet.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => app.toggleSound(s.id)}
                  className={`group/fav flex shrink-0 items-center gap-2 border px-2.5 py-1.5 transition-all chamfer-sm ${
                    playing ? "border-transparent" : "border-line bg-ink-800 hover:-translate-y-0.5"
                  }`}
                  style={playing ? { borderColor: (cat?.color ?? "#fff") + "88", background: (cat?.color ?? "#fff") + "14" } : undefined}
                >
                  <span className="flex" style={{ color: cat?.color }}>
                    <Icon name={s.icon} size={14} />
                  </span>
                  <span className="text-xs font-medium text-parch">{s.name}</span>
                  {playing && (
                    <span className="eq" style={{ color: cat?.color }}>
                      <i /><i /><i />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== banner de cena via shift+arrastar ===== */}
      {drafting && (
        <div className="fade-up mt-4 flex items-center gap-2 border border-moss-500/50 bg-moss-500/10 px-3 py-2 chamfer-sm">
          <Icon name="link" size={15} className="text-moss-400" />
          <p className="text-xs text-moss-300">
            Modo cena: passe sobre outros cards para vincular · solte para criar a cena
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-moss-400">{draftIds.length} selecionado(s)</span>
          </p>
        </div>
      )}

      {/* ===== grade ===== */}
      <div className="mt-4 flex-1 overflow-y-auto pb-8 pr-1">
        {sounds.length === 0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 border border-dashed border-line text-center chamfer">
            <span className="floaty text-fog-dim">
              <Icon name="d20" size={56} sw={1} />
            </span>
            <div>
              <p className="font-display text-lg text-fog">Nenhum som invocado</p>
              <p className="mt-1 text-sm text-fog-dim">Ajuste os filtros ou crie um novo som para este soundpad.</p>
            </div>
            <button
              onClick={() => {
                app.setTypeFilter("Todos");
                app.setCategoryFilter("all");
                app.setSearch("");
              }}
              className="border border-line px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-fog transition-colors hover:border-moss-500/60 hover:text-moss-300 chamfer-sm"
            >
              limpar filtros
            </button>
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(168px, max(140px, calc((100% - 30px) / 4))), 1fr))",
            }}
          >
            {sounds.map((s, i) => (
              <SoundCard
                key={s.id}
                sound={s}
                cat={catById[s.categoryId] ?? data.categories[0]}
                hotkey={i < 9 ? i + 1 : undefined}
                isPlaying={playingSet.has(s.id)}
                index={i}
                draftMode={drafting}
                isDrafted={draftIds.includes(s.id)}
                dnd={{
                  draggable: true,
                  onDragStart: (e) => onDragStart(e, s.id),
                  onDragOver: (e) => onDragOver(e, s.id),
                  onDrop: (e) => onDrop(e, s.id),
                  onDragEnd,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
