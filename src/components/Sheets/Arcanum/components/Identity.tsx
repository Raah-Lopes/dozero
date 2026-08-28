import React, { useRef } from "react";
import type { Character } from "../lib";
import { readFileAsDataURL } from "../lib";
import { Camera, Flame, Plus, Close, Sigil, Sparkle } from "../icons";
import { Field, Reveal, Stepper, VitalBar } from "./ui";

interface Props {
  c: Character;
  set: (patch: Partial<Character>) => void;
  notify: (text: string, tone?: "gold" | "ember" | "jade") => void;
}

export default function Identity({ c, set, notify }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [newAff, setNewAff] = React.useState("");

  const onAvatar = async (f: File | undefined) => {
    if (!f) return;
    const src = await readFileAsDataURL(f);
    set({ avatar: src });
    notify("Retrato atualizado", "gold");
  };

  const addAff = () => {
    const v = newAff.trim();
    if (!v) return;
    if (c.affiliations.includes(v)) {
      notify("Afiliação já registrada", "ember");
      return;
    }
    set({ affiliations: [...c.affiliations, v] });
    setNewAff("");
  };

  const xpPct = c.xpNext > 0 ? Math.min(100, (c.xp / c.xpNext) * 100) : 0;

  return (
    <Reveal>
      <div className="panel ornate-corners p-5 sm:p-6 space-y-5">
        {/* ---------- retrato ---------- */}
        <div className="relative mx-auto w-fit pb-3 pt-1">
          <div className="group relative">
            <div className="absolute -inset-2.5 rounded-xl border border-gold-600/30" />
            <div className="sigil-glow absolute -inset-2.5 rounded-xl bg-[radial-gradient(circle_at_50%_0%,rgba(224,176,84,0.22),transparent_70%)]" />
            <div className="relative h-44 w-44 overflow-hidden rounded-lg border-2 border-gold-500/70 shadow-[0_10px_36px_rgba(0,0,0,0.6),0_0_24px_rgba(205,151,60,0.18)]">
              <img
                src={c.avatar}
                alt={`Retrato de ${c.name || "personagem"}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 grid place-items-center bg-ink-950/70 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
                aria-label="Trocar retrato"
              >
                <span className="flex flex-col items-center gap-1.5 text-gold-200">
                  <Camera size={26} />
                  <span className="text-xs font-bold uppercase tracking-widest">Trocar retrato</span>
                </span>
              </button>
            </div>
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-gold-600/60 bg-ink-900 px-3.5 py-0.5 font-display text-[11px] font-bold tracking-[0.18em] text-gold-300 shadow-md whitespace-nowrap z-10">
              NÍVEL {c.level}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatar(e.target.files?.[0])}
          />
        </div>

        {/* ---------- identidade ---------- */}
        <div>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-fog/80">
              <Sparkle size={12} className="text-gold-400" /> Nome do personagem
            </span>
            <input
              value={c.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Nome verdadeiro…"
              className="field font-display !text-2xl !font-bold text-gold-200 placeholder:text-base placeholder:not-italic"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <Field label="Raça">
              <input value={c.race} onChange={(e) => set({ race: e.target.value })} className="field" placeholder="Ex.: Meio-elfa" />
            </Field>
            <Field label="Classe / Tipo">
              <input value={c.klass} onChange={(e) => set({ klass: e.target.value })} className="field" placeholder="Ex.: Lâmina Arcana" />
            </Field>
            <Field label="Alinhamento">
              <input value={c.alignment} onChange={(e) => set({ alignment: e.target.value })} className="field" placeholder="Ex.: Caótica e Boa" />
            </Field>
            <Field label="Jogador(a)">
              <input value={c.player} onChange={(e) => set({ player: e.target.value })} className="field" placeholder="Quem conduz" />
            </Field>
          </div>

          {/* ---------- nível & xp ---------- */}
          <div className="rounded-md border border-line-soft bg-ink-900/60 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-fog/80">Nível</span>
                <Stepper value={c.level} min={0} max={99} onChange={(v) => set({ level: v })} />
              </div>
              <span className="font-display text-xs font-bold tracking-widest text-gold-400">
                {Math.round(xpPct)}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full border border-line-soft bg-ink-950">
              <div
                className="bar-shine relative h-full overflow-hidden rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300 transition-[width] duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-fog">
              <label className="flex items-center gap-1.5">
                XP
                <input
                  type="number"
                  value={c.xp}
                  onChange={(e) => set({ xp: Math.max(0, Number(e.target.value) || 0) })}
                  className="num-input !w-20"
                />
              </label>
              <label className="flex items-center gap-1.5">
                próximo nível
                <input
                  type="number"
                  value={c.xpNext}
                  onChange={(e) => set({ xpNext: Math.max(1, Number(e.target.value) || 1) })}
                  className="num-input !w-20"
                />
              </label>
            </div>
          </div>

          {/* ---------- vitais ---------- */}
          <div className="space-y-3.5">
            {c.vitals.map((v) => (
              <VitalBar
                key={v.id}
                label={v.label}
                value={v.value}
                max={v.max}
                color={v.color}
                onValue={(val) =>
                  set({ vitals: c.vitals.map((x) => (x.id === v.id ? { ...x, value: val } : x)) })
                }
                onMax={(m) =>
                  set({ vitals: c.vitals.map((x) => (x.id === v.id ? { ...x, max: m } : x)) })
                }
              />
            ))}
          </div>

          {/* ---------- afiliações ---------- */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-fog/80">
              <Flame size={12} className="text-ember-400" /> Afiliações & juramentos
            </p>
            <div className="flex flex-wrap gap-2">
              {c.affiliations.map((a) => (
                <span
                  key={a}
                  className="group/chip inline-flex items-center gap-1.5 rounded-full border border-ember-500/40 bg-ember-900/30 px-3 py-1 text-[13px] font-bold text-ember-300 transition-all duration-200 hover:border-ember-400 hover:bg-ember-900/60"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => set({ affiliations: c.affiliations.filter((x) => x !== a) })}
                    aria-label={`Remover ${a}`}
                    className="text-ember-400/60 transition-colors hover:text-parch-100"
                  >
                    <Close size={11} />
                  </button>
                </span>
              ))}
              {c.affiliations.length === 0 && (
                <span className="text-sm italic text-dim">Sem guildas, facções ou juramentos…</span>
              )}
            </div>
            <div className="mt-2.5 flex gap-2">
              <input
                value={newAff}
                onChange={(e) => setNewAff(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAff()}
                placeholder="Nova guilda, facção, ordem…"
                className="field !py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addAff}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-ember-400/60 hover:text-ember-300 active:scale-90"
                aria-label="Adicionar afiliação"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-line-soft pt-3.5 text-fog">
            <Sigil size={14} className="text-gold-500" />
            <span className="font-display text-[11px] font-bold tracking-[0.2em] uppercase">
              Ficha de {c.system}
            </span>
            <Sigil size={14} className="text-gold-500" />
          </div>
        </div>
      </Reveal>
  );
}
