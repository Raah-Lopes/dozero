import { useState } from "react";
import type { Attr, Character } from "../lib";
import { fmtMod, modOf, uid } from "../lib";
import { CrossedSwords, Plus, Trash } from "../icons";
import { Section, Stepper } from "./ui";

export default function StatusSection({
  c,
  set,
}: {
  c: Character;
  set: (patch: Partial<Character>) => void;
}) {
  const [newAttr, setNewAttr] = useState("");

  const upd = (id: string, patch: Partial<Attr>) =>
    set({ attributes: c.attributes.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const addAttr = () => {
    const name = newAttr.trim() || `Atributo ${c.attributes.length + 1}`;
    set({ attributes: [...c.attributes, { id: uid(), name, value: 10 }] });
    setNewAttr("");
  };

  return (
    <Section
      id="status"
      icon={<CrossedSwords size={19} />}
      kicker="O que o corpo e a mente sustentam"
      title="Atributos & Status"
      accent="#e0b054"
      actions={
        <div className="no-print flex items-center gap-2">
          <input
            value={newAttr}
            onChange={(e) => setNewAttr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAttr()}
            placeholder="Novo atributo…"
            className="field !w-36 !py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addAttr}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold-600/50 bg-gold-900/30 px-3 py-1.5 text-sm font-bold text-gold-200 transition-all hover:border-gold-400 hover:bg-gold-900/60 hover:shadow-[0_0_16px_rgba(205,151,60,0.25)] active:scale-95"
          >
            <Plus size={13} /> Atributo
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {c.attributes.map((a, i) => (
          <div
            key={a.id}
            className="group relative overflow-hidden rounded-md border border-line-soft bg-ink-900/60 p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold-600/60 hover:shadow-[0_10px_28px_rgba(0,0,0,0.45),0_0_18px_rgba(205,151,60,0.12)]"
            style={{ transitionDelay: `${i * 20}ms` }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-[radial-gradient(120px_36px_at_50%_-10px,rgba(224,176,84,0.14),transparent)]" />
            <button
              type="button"
              onClick={() => set({ attributes: c.attributes.filter((x) => x.id !== a.id) })}
              aria-label={`Remover ${a.name}`}
              className="no-print absolute right-1.5 top-1.5 text-dim opacity-0 transition-opacity hover:text-ember-400 group-hover:opacity-100"
            >
              <Trash size={13} />
            </button>
            <input
              value={a.name}
              onChange={(e) => upd(a.id, { name: e.target.value })}
              className="w-full bg-transparent text-center text-[11px] font-bold uppercase tracking-[0.14em] text-fog outline-none transition-colors focus:text-gold-200"
            />
            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <Stepper value={a.value} onChange={(v) => upd(a.id, { value: v })} />
            </div>
            <p className="mt-2 font-display text-lg font-black text-gold-300">
              {fmtMod(modOf(a.value))}
              <span className="ml-1 font-body text-[10px] font-bold uppercase tracking-widest text-dim">mod</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line-soft pt-3.5 text-[13px] text-fog">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-gold-500">Leitura rápida</span>
        <span>
          Iniciativa <b className="text-parch-100">{fmtMod(modOf(c.attributes[1]?.value ?? 10))}</b>
        </span>
        <span>
          Percepção <b className="text-parch-100">{fmtMod(modOf(c.attributes[4]?.value ?? 10))}</b>
        </span>
        <span className="italic text-dim">modificadores calculados na escala d20 (valor − 10) ÷ 2</span>
      </div>
    </Section>
  );
}
