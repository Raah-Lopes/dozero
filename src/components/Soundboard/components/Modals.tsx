import { useMemo, useState, type ReactNode } from "react";
import type { Scene, Sound, SoundType } from "../types";
import { SYNTHS } from "../audio/engine";
import { useApp } from "../store";
import { Icon, SOUND_ICONS } from "../data/icons";

/* ---------------- shell ---------------- */
export function ModalShell({
  title, icon, onClose, children, wide,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`fade-up relative flex max-h-[88vh] w-full flex-col border border-line bg-ink-850 chamfer ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
          <h2 className="flex items-center gap-2.5 font-display text-base font-bold tracking-wide text-parch">
            <span className="text-gold-400">
              <Icon name={icon} size={18} />
            </span>
            {title}
          </h2>
          <button onClick={onClose} className="p-1 text-fog-dim transition-all hover:scale-110 hover:text-blood-400">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-fog-dim">{label}</p>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-line bg-ink-800 px-3 py-2 text-sm text-parch outline-none transition-colors focus:border-moss-500/60 chamfer-sm";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-5 w-10 border transition-colors chamfer-sm ${on ? "border-moss-500/60 bg-moss-500/25" : "border-line bg-ink-800"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 transition-all ${
          on ? "left-[22px] bg-moss-400 shadow-[0_0_8px_#2fd48c]" : "left-[5px] bg-fog-dim"
        }`}
      />
    </button>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid max-h-36 grid-cols-10 gap-1 overflow-y-auto border border-line-soft bg-ink-900/60 p-2">
      {SOUND_ICONS.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`flex h-8 items-center justify-center border transition-all ${
            value === n
              ? "border-gold-400/70 bg-gold-400/15 text-gold-300"
              : "border-transparent text-fog-dim hover:border-line hover:text-parch"
          }`}
        >
          <Icon name={n} size={16} />
        </button>
      ))}
    </div>
  );
}

/* ---------------- editor de som ---------------- */
export function SoundEditorModal({ soundId, onClose }: { soundId: string; onClose: () => void }) {
  const app = useApp();
  const existing = soundId !== "new" ? app.data.sounds[soundId] : undefined;
  const isFile = existing?.synth.startsWith("file:") ?? false;
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<SoundType>(existing?.type ?? "Ambiente");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? app.data.categories[0].id);
  const [icon, setIcon] = useState(existing?.icon ?? "dice");
  const [synth, setSynth] = useState(existing?.synth ?? "rain");
  const [volume, setVolume] = useState(existing?.volume ?? 70);
  const [hotkey, setHotkey] = useState(existing?.hotkey ?? "");
  const [loop, setLoop] = useState(existing?.loop ?? true);
  const [fadeIn, setFadeIn] = useState(existing?.fadeIn ?? 700);
  const [fadeOut, setFadeOut] = useState(existing?.fadeOut ?? 900);
  const [padId, setPadId] = useState(
    app.view.kind === "pad" ? app.view.padId : app.data.pads[0]?.id ?? ""
  );
  const cat = app.data.categories.find((c) => c.id === categoryId);
  const synthMeta = SYNTHS.find((s) => s.id === synth);

  const save = () => {
    if (!name.trim()) return;
    if (existing) {
      app.updateSound(existing.id, { 
        name: name.trim(), 
        type, 
        categoryId, 
        icon, 
        volume, 
        loop, 
        fadeIn, 
        fadeOut,
        hotkey: hotkey.trim() || undefined
      });
      app.toast(`"${name.trim()}" atualizado`);
    } else {
      const id = "snd" + Date.now();
      const sound: Sound = {
        id,
        name: name.trim(),
        icon,
        categoryId,
        type,
        synth,
        duration: synthMeta?.oneShot ? 2 : 0,
        loop: synthMeta?.oneShot ? false : loop,
        volume,
        fadeIn: synthMeta?.oneShot ? 30 : fadeIn,
        fadeOut: synthMeta?.oneShot ? 150 : fadeOut,
        hotkey: hotkey.trim() || undefined,
        createdAt: Date.now(),
      };
      app.addSound(sound, padId || undefined);
      app.toast(`"${name.trim()}" adicionado ao soundpad`);
    }
    onClose();
  };

  return (
    <ModalShell title={existing ? "Editar Som" : "Novo Som"} icon="pencil" onClose={onClose}>
      <Field label="Nome do som">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="ex: Cripta em Chamas" />
      </Field>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <div className="flex border border-line chamfer-sm">
            {(["SFX", "Música", "Ambiente"] as SoundType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 px-2 py-2 font-mono text-[10px] uppercase transition-colors ${
                  type === t ? "bg-moss-500/15 text-moss-300" : "text-fog-dim hover:text-parch"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Categoria / cor">
          <div className="relative">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls + " appearance-none pr-8"}>
              {app.data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45"
              style={{ background: cat?.color }}
            />
          </div>
        </Field>
      </div>

      <Field label="Ícone temático">
        <IconPicker value={icon} onChange={setIcon} />
      </Field>

      {!isFile && (
        <Field label="Motor sonoro (síntese ao vivo)">
          <div className="relative">
            <select value={synth} onChange={(e) => setSynth(e.target.value)} className={inputCls + " appearance-none pr-8"}>
              {(["Ambiente", "Música", "SFX"] as const).map((grp) => (
                <optgroup key={grp} label={grp}>
                  {SYNTHS.filter((s) => s.group === grp).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fog-dim">
              <Icon name="chevronR" size={13} className="rotate-90" />
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[9.5px] text-fog-dim">
            {synthMeta?.oneShot ? "one-shot · toca uma vez e termina" : "contínuo · loops infinitos sem arquivo"}
          </p>
        </Field>
      )}
      {isFile && (
        <div className="mb-4 border border-line-soft bg-ink-900/60 p-3 chamfer-sm">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fog">
            <Icon name="mic" size={13} className="text-moss-400" />
            Áudio próprio · {existing?.duration ? `${existing.duration.toFixed(1)}s` : "duração desconhecida"}
          </p>
          {existing?.ephemeral && (
            <p className="mt-1 text-[11px] text-gold-300">Arquivo grande: mantido apenas nesta sessão.</p>
          )}
        </div>
      )}

      <Field label={`Volume individual — ${volume}%`}>
        <input
          type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full" style={{ "--thumb": cat?.color } as React.CSSProperties}
        />
      </Field>

      <div className="mb-4 flex items-center justify-between border border-line-soft bg-ink-900/60 px-3 py-2.5 chamfer-sm">
        <span className="text-xs text-fog">Loop contínuo</span>
        <Toggle on={loop} onChange={setLoop} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label={`Fade in — ${(fadeIn / 1000).toFixed(1)}s`}>
          <input type="range" min={0} max={5000} step={100} value={fadeIn} onChange={(e) => setFadeIn(Number(e.target.value))} className="w-full" />
        </Field>
        <Field label={`Fade out — ${(fadeOut / 1000).toFixed(1)}s`}>
          <input type="range" min={0} max={5000} step={100} value={fadeOut} onChange={(e) => setFadeOut(Number(e.target.value))} className="w-full" />
        </Field>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Atalho do Mestre (1-9 / Tecla)">
          <input
            value={hotkey}
            onChange={(e) => setHotkey(e.target.value.slice(0, 4))}
            className={inputCls}
            placeholder="ex: 1, 2, Q, E..."
          />
        </Field>
        {!existing && (
          <Field label="Adicionar ao soundpad">
            <div className="relative">
              <select value={padId} onChange={(e) => setPadId(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                {app.data.pads.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fog-dim">
                <Icon name="chevronR" size={13} className="rotate-90" />
              </span>
            </div>
          </Field>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-line-soft pt-4">
        {existing ? (
          <button
            onClick={() => {
              app.deleteSound(existing.id);
              app.toast(`"${existing.name}" removido da biblioteca`, "warn");
              onClose();
            }}
            className="flex items-center gap-1.5 border border-blood-400/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-blood-400 transition-colors hover:bg-blood-500/15 chamfer-sm"
          >
            <Icon name="trash" size={13} /> Excluir
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-fog transition-colors hover:text-parch chamfer-sm">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="border border-moss-500/60 bg-moss-500/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-moss-300 transition-all enabled:hover:bg-moss-500/30 disabled:opacity-40 chamfer-sm"
          >
            {existing ? "Salvar" : "Criar som"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- cena ---------------- */
export function SceneModal({
  presetIds, sceneId, onClose,
}: {
  presetIds: string[];
  sceneId?: string;
  onClose: () => void;
}) {
  const app = useApp();
  const existing = sceneId ? app.data.scenes.find((s) => s.id === sceneId) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? "layers");
  const [fadeMs, setFadeMs] = useState(existing?.fadeMs ?? 2500);
  const [layerVolumes, setLayerVolumes] = useState<Record<string, number>>(() => {
    if (existing) return Object.fromEntries(existing.layers.map((l) => [l.soundId, l.volume]));
    return Object.fromEntries(presetIds.map((id) => [id, app.data.sounds[id]?.volume ?? 70]));
  });
  const [pickerQuery, setPickerQuery] = useState("");
  const layerIds = useMemo(() => Object.keys(layerVolumes), [layerVolumes]);

  const allSounds = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return Object.values(app.data.sounds).filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [app.data.sounds, pickerQuery]);

  const catOf = (id: string) => {
    const s = app.data.sounds[id];
    return app.data.categories.find((c) => c.id === s?.categoryId);
  };

  const save = () => {
    if (!name.trim() || layerIds.length === 0) return;
    const scene: Scene = {
      id: existing?.id ?? "scn" + Date.now(),
      name: name.trim(),
      icon,
      fadeMs,
      layers: layerIds
        .filter((id) => app.data.sounds[id])
        .map((id) => ({ soundId: id, volume: layerVolumes[id] })),
    };
    app.saveScene(scene);
    app.toast(existing ? `Cena "${scene.name}" atualizada` : `Cena "${scene.name}" criada — ative no painel`);
    onClose();
  };

  return (
    <ModalShell title={existing ? "Editar Cena" : "Nova Cena Sonora"} icon="layers" onClose={onClose} wide>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Field label="Nome da cena">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="ex: Taverna + Chuva + Fogueira" />
          </Field>
          <Field label="Ícone">
            <IconPicker value={icon} onChange={setIcon} />
          </Field>
          <Field label="Fade de transição">
            <div className="flex border border-line chamfer-sm">
              {[500, 1000, 2500, 5000, 8000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setFadeMs(ms)}
                  className={`flex-1 px-1 py-2 font-mono text-[10px] transition-colors ${
                    fadeMs === ms ? "bg-arc-500/15 text-arc-300" : "text-fog-dim hover:text-parch"
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Camadas (${layerIds.length})`}>
            <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto border border-line-soft bg-ink-900/60 p-2">
              {layerIds.length === 0 && (
                <p className="p-2 text-center text-[11px] text-fog-dim">Adicione sons pela lista ao lado →</p>
              )}
              {layerIds.map((id) => {
                const s = app.data.sounds[id];
                if (!s) return null;
                const c = catOf(id);
                return (
                  <div key={id} className="flex items-center gap-2 border border-line bg-ink-800 px-2 py-1.5 chamfer-sm">
                    <span className="flex" style={{ color: c?.color }}>
                      <Icon name={s.icon} size={14} />
                    </span>
                    <span className="w-24 truncate text-[11.5px] font-medium text-parch">{s.name}</span>
                    <input
                      type="range" min={0} max={100} value={layerVolumes[id]}
                      onChange={(e) => setLayerVolumes((v) => ({ ...v, [id]: Number(e.target.value) }))}
                      className="flex-1" style={{ "--thumb": c?.color } as React.CSSProperties}
                    />
                    <span className="w-7 text-right font-mono text-[9.5px] text-fog">{layerVolumes[id]}</span>
                    <button
                      onClick={() =>
                        setLayerVolumes((v) => {
                          const n = { ...v };
                          delete n[id];
                          return n;
                        })
                      }
                      className="text-fog-dim hover:text-blood-400"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Field>
        </div>

        <div>
          <Field label="Biblioteca — clique para adicionar">
            <input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} className={inputCls + " mb-2"} placeholder="Filtrar sons…" />
            <div className="flex max-h-[380px] flex-col gap-1 overflow-y-auto border border-line-soft bg-ink-900/60 p-2">
              {allSounds.map((s) => {
                const c = catOf(s.id);
                const on = layerIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setLayerVolumes((v) => {
                        if (on) {
                          const n = { ...v };
                          delete n[s.id];
                          return n;
                        }
                        return { ...v, [s.id]: s.volume };
                      })
                    }
                    className={`flex items-center gap-2 border px-2 py-1.5 text-left transition-all chamfer-sm ${
                      on ? "border-moss-500/50 bg-moss-500/10" : "border-transparent hover:border-line hover:bg-ink-800"
                    }`}
                  >
                    <span className={`flex h-3.5 w-3.5 items-center justify-center border ${on ? "border-moss-400 bg-moss-500/30" : "border-line"}`}>
                      {on && <Icon name="check" size={9} className="text-moss-300" />}
                    </span>
                    <span className="flex" style={{ color: c?.color }}>
                      <Icon name={s.icon} size={14} />
                    </span>
                    <span className="flex-1 truncate text-[11.5px] text-parch">{s.name}</span>
                    <span className="font-mono text-[8.5px] uppercase text-fog-dim">{s.type}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-line-soft pt-4">
        <button onClick={onClose} className="border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-fog hover:text-parch chamfer-sm">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={!name.trim() || layerIds.length === 0}
          className="border border-arc-500/60 bg-arc-500/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-arc-300 transition-all enabled:hover:bg-arc-500/30 disabled:opacity-40 chamfer-sm"
        >
          {existing ? "Salvar cena" : "Criar cena"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------------- categoria ---------------- */
const SWATCHES = ["#ef4444", "#fb923c", "#f6c453", "#4ade80", "#2dd4bf", "#22d3ee", "#3b82f6", "#a855f7", "#e879f9", "#fb7185", "#94a3b8", "#eab308"];

export function CategoryModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[6]);

  const save = () => {
    if (!name.trim()) return;
    app.addCategory({ id: "cat" + Date.now(), name: name.trim(), color, custom: true });
    app.toast(`Categoria "${name.trim()}" criada`);
    onClose();
  };

  return (
    <ModalShell title="Nova Categoria" icon="sparkle" onClose={onClose}>
      <Field label="Nome da tag">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="ex: Steampunk, Submarino…" />
      </Field>
      <Field label="Cor de classificação">
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-7 w-7 rotate-45 border-2 transition-transform hover:scale-110 ${color === c ? "border-parch" : "border-transparent"}`}
              style={{ background: c }}
              aria-label={`Cor ${c}`}
            />
          ))}
          <label className="ml-2 flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase text-fog-dim">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-9 cursor-pointer border border-line bg-ink-800" />
            custom
          </label>
        </div>
      </Field>
      <div className="mt-2 border border-line-soft bg-ink-900/60 p-3 chamfer-sm">
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-fog-dim">Prévia do card</p>
        <div className="flex items-center gap-2.5 border p-2.5 chamfer-sm" style={{ borderColor: color + "66", background: color + "10" }}>
          <span className="flex h-8 w-8 items-center justify-center border chamfer-sm" style={{ color, borderColor: color + "55", background: color + "18" }}>
            <Icon name="dice" size={16} />
          </span>
          <div>
            <p className="text-xs font-semibold text-parch">{name.trim() || "Som de exemplo"}</p>
            <span className="border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider" style={{ borderColor: color + "66", color }}>
              {name.trim() || "categoria"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-fog hover:text-parch chamfer-sm">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={!name.trim()}
          className="border border-moss-500/60 bg-moss-500/15 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-moss-300 enabled:hover:bg-moss-500/30 disabled:opacity-40 chamfer-sm"
        >
          Criar categoria
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------------- ajuda ---------------- */
export function HelpModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Clique no card", "Toca / para o som"],
    ["Clique longo (≈0,4s)", "Preview rápido — solte para parar"],
    ["Duplo clique ou ✏️", "Edita propriedades (volume, loop, fade, cor, ícone)"],
    ["Shift + arrastar entre cards", "Vincula sons e cria uma Cena ao soltar"],
    ["Arrastar card", "Reordena o soundpad"],
    ["1 – 9", "Dispara os sons numerados da vista atual"],
    ["Espaço", "Pausa / retoma tudo (sessão)"],
    ["Esc", "Fecha janelas"],
  ];
  return (
    <ModalShell title="Atalhos do Mestre" icon="keyboard" onClose={onClose}>
      <div className="flex flex-col gap-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 border border-line-soft bg-ink-900/50 px-3 py-2 chamfer-sm">
            <span className="font-mono text-[11px] text-gold-300">{k}</span>
            <span className="text-right text-xs text-fog">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 border border-arc-500/25 bg-arc-500/5 p-3 text-xs leading-relaxed text-fog chamfer-sm">
        <p className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-arc-300">Dica de mestre</p>
        Monte uma <strong className="text-parch">Cena</strong> (taverna + chuva + fogueira) e dispare-a com um clique no
        painel <strong className="text-parch">Tocando Agora</strong> — o crossfade cuida da transição. Configure{" "}
        <strong className="text-parch">triggers VTT</strong> para o combate começar sozinho quando a iniciativa rolar.
      </div>
    </ModalShell>
  );
}
