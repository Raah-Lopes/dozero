import { useEffect, useRef, useState } from "react";
import { engine } from "../audio/engine";
import { useApp, useUI } from "../store";
import { Icon } from "../data/icons";

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

export function NowPlaying() {
  const app = useApp();
  const ui = useUI();
  const { data, layers, paused } = app;
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [, setTick] = useState(0);
  const [scenePick, setScenePick] = useState("");

  /* VU meter real (analyser do master) */
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const lv = engine.getLevels(10);
      lv.forEach((v, i) => {
        const el = barsRef.current[i];
        if (el) el.style.height = `${Math.max(7, v * 100)}%`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* relógio das camadas */
  useEffect(() => {
    if (layers.length === 0) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [layers.length]);

  const activeScene = data.scenes.find((s) => s.id === app.activeSceneId);

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-ink-900/85 backdrop-blur-sm">
      {/* cabeçalho */}
      <div className="border-b border-line-soft px-4 py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-gold-300">
            Tocando agora
          </h2>
          <span
            className={`border px-2 py-0.5 font-mono text-[10px] ${
              layers.length > 0 ? "border-moss-500/50 text-moss-300" : "border-line text-fog-dim"
            }`}
          >
            {layers.length} camada{layers.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* VU meter */}
        <div className="mt-3 flex h-12 items-end justify-between gap-[3px] border border-line-soft bg-ink-950/60 px-2.5 py-1.5 chamfer-sm">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="relative h-full w-full overflow-hidden">
              <div
                ref={(el) => {
                  barsRef.current[i] = el;
                }}
                className="absolute bottom-0 w-full rounded-[1px] transition-[height] duration-75"
                style={{
                  height: "7%",
                  background: i > 7 ? "#e64545" : i > 5 ? "#e6c15c" : "#2fd48c",
                  boxShadow: `0 0 6px ${i > 7 ? "#e6454566" : i > 5 ? "#e6c15c66" : "#2fd48c66"}`,
                }}
              />
            </div>
          ))}
        </div>

        {/* master */}
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-widest text-fog">
            <Icon name="volume" size={13} className="text-gold-400" /> Master
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={data.master}
            onChange={(e) => app.setMaster(Number(e.target.value))}
            className="flex-1"
            style={{ "--thumb": "#e6c15c" } as React.CSSProperties}
            aria-label="Volume master"
          />
          <span className="w-10 text-right font-mono text-xs text-gold-300">{data.master}%</span>
        </div>

        {/* ações globais */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={app.stopAll}
            className="group flex flex-1 items-center justify-center gap-2 border border-blood-400/50 bg-blood-500/10 px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-blood-400 transition-all hover:bg-blood-500 hover:text-ink-950 active:scale-[0.98] chamfer-sm"
            title="Corta todo o áudio instantaneamente"
          >
            <Icon name="power" size={14} sw={2.2} />
            Parar tudo
          </button>
          <button
            onClick={app.togglePause}
            className={`flex items-center justify-center gap-1.5 border px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider transition-all chamfer-sm ${
              paused
                ? "blink-soft border-gold-400/60 bg-gold-400/10 text-gold-300"
                : "border-line bg-ink-800 text-fog hover:border-gold-400/50 hover:text-gold-300"
            }`}
            title="Espaço = pausar/retomar geral"
          >
            <Icon name={paused ? "play" : "pause"} size={13} />
            {paused ? "Retomar" : "Pausar"}
          </button>
        </div>
        {paused && (
          <p className="mt-2 text-center font-mono text-[9.5px] uppercase tracking-[0.3em] text-gold-400">
            · sessão pausada ·
          </p>
        )}
      </div>

      {/* cena ativa + controle de cenas */}
      <div className="border-b border-line-soft px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog-dim">
          <Icon name="layers" size={12} className="text-arc-400" /> Cenas rápidas
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={scenePick}
              onChange={(e) => setScenePick(e.target.value)}
              className="w-full appearance-none border border-line bg-ink-800 px-2.5 py-2 pr-7 font-mono text-[11px] text-parch outline-none transition-colors focus:border-arc-400/60 chamfer-sm"
            >
              <option value="">selecionar cena…</option>
              {data.scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fog-dim">
              <Icon name="chevronR" size={12} className="rotate-90" />
            </span>
          </div>
          <button
            onClick={() => scenePick && app.activateScene(scenePick)}
            disabled={!scenePick}
            className="border border-arc-500/50 bg-arc-500/10 px-3 py-2 font-mono text-[10.5px] uppercase tracking-wider text-arc-300 transition-all enabled:hover:bg-arc-500/25 disabled:opacity-35 chamfer-sm"
          >
            ativar
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex border border-line chamfer-sm">
            {[1000, 2500, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => app.setSceneFadeMs(ms)}
                className={`px-2 py-1 font-mono text-[9.5px] uppercase transition-colors ${
                  app.sceneFadeMs === ms ? "bg-arc-500/15 text-arc-300" : "text-fog-dim hover:text-parch"
                }`}
                title="Duração do fade entre cenas"
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-fog-dim">fade de cena</span>
        </div>
        {activeScene && (
          <div className="playing-glow mt-2.5" style={{ "--glow": "#b78cff66" } as React.CSSProperties}>
          <div
            className="flex items-center gap-2 border bg-ink-800 px-2.5 py-2 chamfer-sm"
            style={{ borderColor: "#b78cff77" }}
          >
            <span className="flex text-arc-300">
              <Icon name={activeScene.icon} size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-parch">{activeScene.name}</p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-arc-300">cena ativa · {activeScene.layers.length} camadas</p>
            </div>
            <span className="eq text-arc-300">
              <i /><i /><i />
            </span>
          </div>
          </div>
        )}
        {layers.length > 0 && (
          <button
            onClick={() => ui.openSceneFrom(layers.map((l) => l.soundId))}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 border border-dashed border-line px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-fog-dim transition-colors hover:border-moss-500/50 hover:text-moss-300"
          >
            <Icon name="plus" size={11} /> salvar mix atual como cena
          </button>
        )}
      </div>

      {/* camadas */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog-dim">Camadas ativas</p>
        {layers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="floaty text-fog-dim/60">
              <Icon name="ghost" size={44} sw={1.1} />
            </span>
            <p className="text-sm text-fog-dim">
              Silêncio absoluto…
              <br />
              <span className="text-[12px]">clique num card para invocar som</span>
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {layers.map((l) => {
              const snd = data.sounds[l.soundId];
              if (!snd) return null;
              const cat = data.categories.find((c) => c.id === snd.categoryId);
              const color = cat?.color ?? "#4ce6a5";
              return (
                <li
                  key={l.soundId}
                  className="border border-line bg-ink-800/80 p-2.5 transition-colors hover:bg-ink-700/70 chamfer-sm"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex" style={{ color }}>
                      <Icon name={snd.icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-parch">{snd.name}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-fog-dim">
                        {cat?.name} · {snd.type}
                        {l.sceneId && <span className="text-arc-300"> · cena</span>}
                      </p>
                    </div>
                    <span className="font-mono text-[10.5px] text-fog">{fmtClock(Date.now() - l.startedAt)}</span>
                    <span className="eq" style={{ color }}>
                      <i /><i /><i />
                    </span>
                    <button
                      onClick={() => app.stopLayer(l.soundId)}
                      className="p-1 text-fog-dim transition-all hover:scale-110 hover:text-blood-400"
                      aria-label={`Parar ${snd.name}`}
                    >
                      <Icon name="stop" size={13} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={l.volume}
                      onChange={(e) => app.setLayerVolume(l.soundId, Number(e.target.value))}
                      className="flex-1"
                      style={{ "--thumb": color } as React.CSSProperties}
                      aria-label={`Volume da camada ${snd.name}`}
                    />
                    <span className="w-7 text-right font-mono text-[10px] text-fog">{l.volume}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* rodapé */}
      <div className="border-t border-line-soft px-4 py-2.5">
        <p className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-fog-dim">
          <span>Web Audio · síntese procedural</span>
          <span className={layers.length > 0 ? "text-moss-400" : ""}>{layers.length > 0 ? "● ao vivo" : "○ ocioso"}</span>
        </p>
      </div>
    </aside>
  );
}
