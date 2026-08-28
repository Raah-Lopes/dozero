import { useApp, useUI } from "../store";
import { Icon } from "../data/icons";

export function ScenesView() {
  const app = useApp();
  const ui = useUI();
  const { data } = app;

  return (
    <div className="flex h-full flex-col">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center border border-arc-400/50 bg-arc-500/10 text-arc-300 chamfer">
            <Icon name="layers" size={28} sw={1.5} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-dim">combinações simultâneas</p>
            <h1 className="font-display text-2xl font-bold tracking-wide text-parch md:text-3xl">Cenas Sonoras</h1>
          </div>
          <span className="ml-2 border border-line bg-ink-800 px-2 py-1 font-mono text-[11px] text-fog">
            {data.scenes.length} cena{data.scenes.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden max-w-[260px] text-right text-[11px] leading-snug text-fog-dim md:block">
            Dica: segure <span className="font-mono text-moss-300">Shift</span> e arraste entre cards no soundpad para
            criar uma cena na hora.
          </p>
          <button
            onClick={() => ui.openSceneFrom([])}
            className="flex items-center gap-1.5 border border-arc-500/60 bg-arc-500/10 px-4 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-arc-300 transition-colors hover:bg-arc-500/25 chamfer-sm"
          >
            <Icon name="plus" size={13} /> Nova cena
          </button>
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto pb-8 pr-1">
        {data.scenes.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 border border-dashed border-line chamfer">
            <span className="floaty text-fog-dim"><Icon name="layers" size={48} sw={1} /></span>
            <p className="text-sm text-fog-dim">Nenhuma cena — combine sons simultâneos para criar atmosferas.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {data.scenes.map((sc, i) => {
              const active = app.activeSceneId === sc.id;
              return (
                <div
                  key={sc.id}
                  className={`reveal relative ${active ? "playing-glow" : ""}`}
                  style={{
                    animationDelay: `${i * 60}ms`,
                    ...(active ? ({ "--glow": "#b78cff88" } as React.CSSProperties) : {}),
                  }}
                >
                <div
                  className={`group flex h-full flex-col border bg-ink-800/90 p-4 transition-all chamfer ${
                    active ? "border-transparent" : "border-line hover:-translate-y-1 hover:border-arc-400/40"
                  }`}
                  style={{ borderColor: active ? "#b78cff88" : undefined }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center border chamfer-sm ${
                          active ? "text-arc-300 border-arc-400/60 bg-arc-500/15" : "text-arc-300/80 border-line bg-ink-900"
                        }`}
                      >
                        <Icon name={sc.icon} size={22} sw={1.6} />
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-bold leading-tight text-parch">{sc.name}</h3>
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog-dim">
                          {sc.layers.length} camadas · fade {sc.fadeMs / 1000}s
                        </p>
                      </div>
                    </div>
                    {active && (
                      <span className="eq text-arc-300"><i /><i /><i /><i /></span>
                    )}
                  </div>

                  <ul className="mt-3 flex flex-col gap-1.5">
                    {sc.layers.map((l) => {
                      const s = data.sounds[l.soundId];
                      if (!s) return null;
                      const c = data.categories.find((x) => x.id === s.categoryId);
                      return (
                        <li key={l.soundId} className="flex items-center gap-2 border border-line-soft bg-ink-900/50 px-2.5 py-1.5">
                          <span className="h-2 w-2 rotate-45" style={{ background: c?.color }} />
                          <span className="flex" style={{ color: c?.color }}><Icon name={s.icon} size={13} /></span>
                          <span className="flex-1 truncate text-xs text-parch">{s.name}</span>
                          <span className="font-mono text-[9.5px] text-fog-dim">{l.volume}%</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => (active ? app.stopAll() : app.activateScene(sc.id))}
                      className={`flex flex-1 items-center justify-center gap-1.5 border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.98] chamfer-sm ${
                        active
                          ? "border-blood-400/50 text-blood-400 hover:bg-blood-500/15"
                          : "border-moss-500/50 bg-moss-500/10 text-moss-300 hover:bg-moss-500/25"
                      }`}
                    >
                      <Icon name={active ? "stop" : "play"} size={12} />
                      {active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => ui.openSceneEdit(sc.id)}
                      className="flex items-center gap-1 border border-line px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fog transition-colors hover:border-gold-400/50 hover:text-gold-300 chamfer-sm"
                    >
                      <Icon name="pencil" size={12} /> Editar
                    </button>
                    <button
                      onClick={() => {
                        app.deleteScene(sc.id);
                        app.toast(`Cena "${sc.name}" excluída`, "warn");
                      }}
                      className="flex items-center border border-line px-2.5 py-2 text-fog-dim transition-colors hover:border-blood-400/50 hover:text-blood-400 chamfer-sm"
                      aria-label="Excluir cena"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
