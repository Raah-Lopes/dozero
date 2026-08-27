import { useState } from "react";
import type { Character, Spell } from "../lib";
import { SCHOOLS, uid } from "../lib";
import { Eye, EyeOff, Plus, ScrollSpell, Trash, Close } from "../icons";
import { Field, Section } from "./ui";

const levelName = (l: number) =>
  l === 0 ? "Truque" : `${l}º círculo`;

export default function SpellsSection({
  c,
  set,
}: {
  c: Character;
  set: (patch: Partial<Character>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todas" | "preparadas">("todas");
  const [form, setForm] = useState({ name: "", level: 1, school: SCHOOLS[0], cost: "", desc: "" });

  const add = () => {
    if (!form.name.trim()) return;
    const s: Spell = {
      id: uid(),
      name: form.name.trim(),
      level: form.level,
      school: form.school,
      cost: form.cost.trim() || "—",
      desc: form.desc.trim(),
      prepared: true,
    };
    set({ spells: [...c.spells, s] });
    setForm({ name: "", level: 1, school: SCHOOLS[0], cost: "", desc: "" });
    setOpen(false);
  };

  const visible = c.spells.filter((s) => {
    const okQ = s.name.toLowerCase().includes(query.toLowerCase());
    const okF = filter === "todas" || s.prepared;
    return okQ && okF;
  });

  return (
    <Section
      id="magias"
      icon={<ScrollSpell size={19} />}
      kicker="O grimório aberto"
      title="Magias & Poderes"
      accent="#8aa4cc"
      actions={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="no-print inline-flex items-center gap-1.5 rounded-md border border-steel-500/50 bg-steel-500/10 px-3 py-1.5 text-sm font-bold text-steel-300 transition-all hover:border-steel-300 hover:bg-steel-500/25 hover:shadow-[0_0_16px_rgba(107,135,179,0.25)] active:scale-95"
        >
          {open ? <Close size={13} /> : <Plus size={13} />} {open ? "Fechar" : "Nova magia"}
        </button>
      }
    >
      {open && (
        <div className="dice-pop mb-5 rounded-md border border-steel-500/40 bg-ink-900/70 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nome" className="sm:col-span-2">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" placeholder="Ex.: Corrente de Relâmpagos" autoFocus />
            </Field>
            <Field label="Nível / Círculo">
              <select value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} className="field">
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? "Truque (0)" : `${i}º círculo`}</option>
                ))}
              </select>
            </Field>
            <Field label="Escola">
              <select value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} className="field">
                {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[10rem_1fr_auto]">
            <Field label="Custo">
              <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="field" placeholder="Ex.: 6 PM" />
            </Field>
            <Field label="Descrição">
              <input
                value={form.desc}
                onChange={(e) => setForm({ ...form, desc: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && add()}
                className="field"
                placeholder="Efeito, alcance, duração…"
              />
            </Field>
            <button
              type="button"
              onClick={add}
              className="self-end rounded-md border border-gold-500/60 bg-gold-500/15 px-5 py-2 text-sm font-bold text-gold-200 transition-all hover:bg-gold-500/25 hover:shadow-[0_0_18px_rgba(205,151,60,0.3)] active:scale-95"
            >
              Inscrever no grimório
            </button>
          </div>
        </div>
      )}

      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar no grimório…"
          className="field !w-56 !py-1.5 text-sm"
        />
        {(["todas", "preparadas"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1 text-[13px] font-bold capitalize transition-all ${
              filter === f
                ? "border-steel-400 bg-steel-500/20 text-steel-300 shadow-[0_0_12px_rgba(107,135,179,0.2)]"
                : "border-line-soft text-fog hover:border-steel-500/50 hover:text-steel-300"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-sm text-dim">
          {c.spells.filter((s) => s.prepared).length} de {c.spells.length} preparadas
        </span>
      </div>

      <ul className="grid gap-3 lg:grid-cols-2">
        {visible.map((s) => (
          <li
            key={s.id}
            className={`group relative rounded-md border p-4 transition-all duration-300 hover:-translate-y-0.5 ${
              s.prepared
                ? "border-steel-500/40 bg-ink-900/60 hover:border-steel-400/70 hover:shadow-[0_10px_26px_rgba(0,0,0,0.4),0_0_16px_rgba(107,135,179,0.14)]"
                : "border-line-soft bg-ink-900/30 opacity-70 hover:opacity-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-md border font-display text-sm font-black ${
                  s.level === 0
                    ? "border-jade-400/50 bg-jade-500/10 text-jade-300"
                    : "border-steel-500/50 bg-steel-500/10 text-steel-300"
                }`}
              >
                {s.level === 0 ? "✶" : s.level}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <h3 className="font-display text-[16px] font-bold text-parch-100">{s.name}</h3>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-steel-400">{levelName(s.level)}</span>
                  <span className="text-[11px] uppercase tracking-wider text-fog">{s.school}</span>
                </div>
                {s.desc && <p className="mt-1 font-tale text-[14.5px] leading-snug text-parch-300/90">{s.desc}</p>}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="rounded border border-gold-600/40 bg-gold-900/25 px-2 py-0.5 text-[12px] font-bold text-gold-300">
                    {s.cost}
                  </span>
                  <div className="no-print ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        set({ spells: c.spells.map((x) => (x.id === s.id ? { ...x, prepared: !x.prepared } : x)) })
                      }
                      className={`grid h-8 w-8 place-items-center rounded-md border transition-all active:scale-90 ${
                        s.prepared
                          ? "border-jade-400/50 bg-jade-500/15 text-jade-300 hover:bg-jade-500/25"
                          : "border-line-soft text-dim hover:border-jade-500/50 hover:text-jade-300"
                      }`}
                      title={s.prepared ? "Preparada — clique para esquecer" : "Esquecida — clique para preparar"}
                    >
                      {s.prepared ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => set({ spells: c.spells.filter((x) => x.id !== s.id) })}
                      className="grid h-8 w-8 place-items-center rounded-md border border-line-soft text-dim transition-all hover:border-ember-400/60 hover:text-ember-300 active:scale-90"
                      title="Rasgar a página"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="rounded-md border border-dashed border-line-soft p-6 text-center font-tale italic text-dim">
          Nenhuma magia encontrada — o grimório aguarda novos encantamentos.
        </p>
      )}
    </Section>
  );
}
