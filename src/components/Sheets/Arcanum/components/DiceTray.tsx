import { useState } from "react";
import type { RollResult } from "../lib";
import { rollFormula } from "../lib";
import { Close, DiceD20, Sparkle } from "../icons";

export default function DiceTray({
  rolls,
  onRoll,
  onClear,
}: {
  rolls: RollResult[];
  onRoll: (r: RollResult) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const last = rolls[0];

  const quick = (formula: string) => {
    const r = rollFormula(`d${formula.split("d")[1] || "20"}`, formula);
    if (r) onRoll(r);
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="dice-pop w-[19rem] overflow-hidden rounded-lg border border-line bg-ink-900/97 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-line-soft bg-ink-800/70 px-4 py-2.5">
            <span className="font-display text-[12px] font-black uppercase tracking-[0.2em] text-gold-300">
              Mesa de dados
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] font-bold uppercase tracking-wider text-dim transition-colors hover:text-ember-300"
              >
                limpar
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="text-fog hover:text-parch-100">
                <Close size={14} />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 border-b border-line-soft px-3 py-2.5">
            {["1d4", "1d6", "1d8", "1d10", "1d12", "1d20", "1d100"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => quick(f)}
                className="flex-1 rounded border border-line-soft bg-ink-800 py-1.5 text-center font-display text-[11px] font-bold text-fog transition-all hover:border-gold-500/60 hover:text-gold-200 hover:shadow-[0_0_10px_rgba(205,151,60,0.2)] active:scale-90"
              >
                {f.replace("1d", "")}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto p-3">
            {rolls.length === 0 ? (
              <p className="py-4 text-center text-[13px] italic text-dim">
                Nenhum dado rolado ainda.<br />A sorte espera sua ordem.
              </p>
            ) : (
              <ul className="space-y-2">
                {rolls.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-md border px-3 py-2 ${
                      r.kind === "crit"
                        ? "border-gold-400/60 bg-gold-500/10"
                        : r.kind === "fumble"
                          ? "border-ember-400/60 bg-ember-900/30"
                          : "border-line-soft bg-ink-850"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] font-bold text-parch-200">{r.label}</span>
                      <span className="shrink-0 font-display text-[11px] font-bold text-fog">{r.formula}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="flex flex-wrap gap-1">
                        {r.rolls.slice(0, 12).map((d, i) => (
                          <span
                            key={i}
                            className={`grid min-w-[20px] place-items-center rounded border px-0.5 text-[11px] font-bold ${
                              d === r.sides && r.sides >= 6
                                ? "border-gold-400/70 text-gold-200"
                                : d === 1 && r.sides === 20
                                  ? "border-ember-400/70 text-ember-300"
                                  : "border-line-soft text-fog"
                            }`}
                          >
                            {d}
                          </span>
                        ))}
                        {r.rolls.length > 12 && <span className="text-[11px] text-dim">+{r.rolls.length - 12}</span>}
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        {r.kind === "crit" && <Sparkle size={12} className="text-gold-300" />}
                        <span
                          className={`font-display text-lg font-black leading-none ${
                            r.kind === "crit" ? "text-gold-200" : r.kind === "fumble" ? "text-ember-300" : "text-parch-100"
                          }`}
                        >
                          {r.total}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir mesa de dados"
        className="group relative grid h-14 w-14 place-items-center rounded-full border-2 border-gold-500/70 bg-ink-850 text-gold-300 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_22px_rgba(205,151,60,0.25)] transition-all duration-300 hover:scale-110 hover:border-gold-300 hover:text-gold-200 hover:shadow-[0_10px_34px_rgba(0,0,0,0.7),0_0_30px_rgba(205,151,60,0.45)] active:scale-95"
      >
        <span className="sigil-glow absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(224,176,84,0.18),transparent_70%)]" />
        <DiceD20 size={26} className="relative transition-transform duration-500 group-hover:rotate-[72deg]" />
        {last && (
          <span
            key={last.id}
            className={`dice-pop absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full border px-1 font-display text-[12px] font-black ${
              last.kind === "crit"
                ? "border-gold-300 bg-gold-500 text-ink-950"
                : last.kind === "fumble"
                  ? "border-ember-300 bg-ember-500 text-parch-100"
                  : "border-line bg-ink-700 text-parch-100"
            }`}
          >
            {last.total}
          </span>
        )}
      </button>
    </div>
  );
}
