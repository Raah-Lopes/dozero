import { useState } from "react";
import type { Character, Macro, RollResult } from "../lib";
import { uid, rollFormula } from "../lib";
import { DiceD20, MacroBraces, Plus, Trash, Flame, Sparkle } from "../icons";
import { Field, Section } from "./ui";

interface Props {
  c: Character;
  set: (patch: Partial<Character>) => void;
  onRoll: (r: RollResult) => void;
  notify: (t: string, tone?: "gold" | "ember" | "jade") => void;
}

export default function MacrosSection({ c, set, onRoll, notify }: Props) {
  const [form, setForm] = useState({ name: "", formula: "", note: "" });
  const [lastRoll, setLastRoll] = useState<Record<string, RollResult>>({});

  const add = () => {
    if (!form.name.trim() || !form.formula.trim()) return;
    if (!rollFormula("teste", form.formula)) {
      notify("Fórmula inválida — use formatos como 2d6+3", "ember");
      return;
    }
    const m: Macro = { id: uid(), name: form.name.trim(), formula: form.formula.trim(), note: form.note.trim() };
    set({ macros: [...c.macros, m] });
    setForm({ name: "", formula: "", note: "" });
  };

  const roll = (m: Macro) => {
    const r = rollFormula(m.name, m.formula);
    if (!r) {
      notify(`Fórmula inválida: ${m.formula}`, "ember");
      return;
    }
    onRoll(r);
    setLastRoll((prev) => ({ ...prev, [m.id]: r }));
  };

  return (
    <Section
      id="macros"
      icon={<MacroBraces size={19} />}
      kicker="Fórmulas prontas para a mesa"
      title="Macros de Rolagem"
      accent="#6db58d"
    >
      <div className="no-print mb-5 grid gap-3 rounded-md border border-jade-500/35 bg-ink-900/70 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_9rem_1fr_auto]">
        <Field label="Nome do macro">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" placeholder="Ex.: Rajada de Flechas" />
        </Field>
        <Field label="Fórmula">
          <input value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} className="field font-bold text-jade-300" placeholder="1d20+5" />
        </Field>
        <Field label="Observação">
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="field" placeholder="Quando usar…" />
        </Field>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center justify-center gap-1.5 self-end rounded-md border border-jade-400/50 bg-jade-500/15 px-4 py-2 text-sm font-bold text-jade-300 transition-all hover:bg-jade-500/25 hover:shadow-[0_0_16px_rgba(109,181,141,0.25)] active:scale-95"
        >
          <Plus size={13} /> Forjar
        </button>
      </div>

      <ul className="space-y-2.5">
        {c.macros.map((m) => {
          const lr = lastRoll[m.id];
          const invalid = !rollFormula("x", m.formula);
          return (
            <li key={m.id} className="rounded-md border border-line-soft bg-ink-900/60 transition-all duration-200 hover:border-jade-500/45 hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <DiceD20 size={20} className="shrink-0 text-jade-400" />
                <div className="min-w-0 flex-1">
                  <input
                    value={m.name}
                    onChange={(e) => set({ macros: c.macros.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })}
                    className="w-full bg-transparent font-body text-[15px] font-bold text-parch-100 outline-none"
                  />
                  <p className="text-[12px] text-fog">
                    {m.note || <span className="italic text-dim">sem observação</span>}
                  </p>
                </div>
                <input
                  value={m.formula}
                  onChange={(e) => set({ macros: c.macros.map((x) => (x.id === m.id ? { ...x, formula: e.target.value } : x)) })}
                  className={`w-24 rounded-md border px-2 py-1.5 text-center font-display text-[15px] font-black tracking-wide outline-none transition-colors ${
                    invalid
                      ? "border-ember-500/60 bg-ember-900/30 text-ember-300"
                      : "border-jade-500/40 bg-jade-500/10 text-jade-300 focus:border-jade-300"
                  }`}
                  aria-label="Fórmula"
                />
                <button
                  type="button"
                  onClick={() => roll(m)}
                  className="no-print inline-flex items-center gap-2 rounded-md border border-jade-400/60 bg-jade-500/15 px-4 py-2 text-sm font-black uppercase tracking-wider text-jade-300 transition-all hover:bg-jade-500/30 hover:shadow-[0_0_18px_rgba(109,181,141,0.35)] active:scale-90"
                >
                  <DiceD20 size={16} /> Rolar
                </button>
                <button
                  type="button"
                  onClick={() => set({ macros: c.macros.filter((x) => x.id !== m.id) })}
                  aria-label={`Remover ${m.name}`}
                  className="no-print grid h-8 w-8 place-items-center rounded-md border border-line-soft text-dim transition-all hover:border-ember-400/60 hover:text-ember-300 active:scale-90"
                >
                  <Trash size={15} />
                </button>
              </div>

              {lr && (
                <div className="dice-pop flex flex-wrap items-center gap-2 border-t border-line-soft bg-ink-950/50 px-4 py-2.5">
                  {lr.kind === "crit" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/60 bg-gold-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-gold-200">
                      <Sparkle size={11} /> Crítico!
                    </span>
                  )}
                  {lr.kind === "fumble" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ember-400/60 bg-ember-900/40 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-ember-300">
                      <Flame size={11} /> Falha crítica
                    </span>
                  )}
                  <span className="flex flex-wrap items-center gap-1.5">
                    {lr.rolls.map((r, i) => (
                      <span
                        key={i}
                        className={`grid min-w-[26px] place-items-center rounded border px-1 py-0.5 text-[13px] font-bold ${
                          r === lr.sides
                            ? "border-gold-400/70 bg-gold-500/15 text-gold-200"
                            : r === 1 && lr.sides === 20
                              ? "border-ember-400/70 bg-ember-900/40 text-ember-300"
                              : "border-line-soft bg-ink-800 text-parch-200"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </span>
                  {lr.mod !== 0 && (
                    <span className="text-sm font-bold text-fog">{lr.mod > 0 ? `+ ${lr.mod}` : `− ${Math.abs(lr.mod)}`}</span>
                  )}
                  <span className="text-sm text-fog">=</span>
                  <span className={`font-display text-2xl font-black leading-none ${
                    lr.kind === "crit" ? "text-gold-200" : lr.kind === "fumble" ? "text-ember-300" : "text-parch-100"
                  }`}>
                    {lr.total}
                  </span>
                  <span className="ml-auto text-[11px] uppercase tracking-widest text-dim">
                    resultado imediato
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {c.macros.length === 0 && (
        <p className="rounded-md border border-dashed border-line-soft p-6 text-center font-tale italic text-dim">
          Nenhum macro forjado — crie fórmulas como <b className="not-italic text-jade-300">2d6+3</b> e role com um clique.
        </p>
      )}
    </Section>
  );
}
