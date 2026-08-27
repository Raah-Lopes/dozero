import { useState } from "react";
import type { Character, InvItem } from "../lib";
import { ITEM_KINDS, uid } from "../lib";
import { Backpack, Coin, Plus, Scale, Trash } from "../icons";
import { Field, Section, Stepper } from "./ui";

const fmtW = (n: number) => (Number.isInteger(n) ? n : n.toFixed(2).replace(".", ","));

export default function InventorySection({
  c,
  set,
}: {
  c: Character;
  set: (patch: Partial<Character>) => void;
}) {
  const [form, setForm] = useState({ name: "", kind: ITEM_KINDS[0], qty: 1, weight: 0.5 });

  const totalWeight = c.inventory.reduce((a, i) => a + i.qty * i.weight, 0);
  const totalItems = c.inventory.reduce((a, i) => a + i.qty, 0);

  const add = () => {
    if (!form.name.trim()) return;
    const item: InvItem = {
      id: uid(),
      name: form.name.trim(),
      kind: form.kind,
      qty: Math.max(1, form.qty),
      weight: Math.max(0, form.weight),
    };
    set({ inventory: [...c.inventory, item] });
    setForm({ name: "", kind: ITEM_KINDS[0], qty: 1, weight: 0.5 });
  };

  const upd = (id: string, patch: Partial<InvItem>) =>
    set({ inventory: c.inventory.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  return (
    <Section
      id="inventario"
      icon={<Backpack size={19} />}
      kicker="Tudo que o bolso e a mochila carregam"
      title="Inventário & Tesouro"
      accent="#e0705a"
      actions={
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-gold-300">
            <Coin size={16} />
            <input
              type="number"
              value={c.gold}
              onChange={(e) => set({ gold: Math.max(0, Number(e.target.value) || 0) })}
              className="num-input !w-16 !text-gold-200"
              aria-label="Peças de ouro"
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-fog">PO</span>
          </span>
          <span className="hidden items-center gap-1.5 font-bold text-parch-200 sm:flex">
            <Scale size={16} className="text-ember-300" />
            {fmtW(totalWeight)} <span className="text-[11px] uppercase tracking-wider text-fog">kg</span>
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line-soft text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
              <th className="pb-2.5 pr-3">Item</th>
              <th className="pb-2.5 pr-3">Tipo</th>
              <th className="pb-2.5 pr-3 text-center">Qtd.</th>
              <th className="pb-2.5 pr-3 text-right">Peso unit.</th>
              <th className="pb-2.5 text-right">Total</th>
              <th className="no-print pb-2.5" />
            </tr>
          </thead>
          <tbody>
            {c.inventory.map((i) => (
              <tr
                key={i.id}
                className="group border-b border-line-soft/60 transition-colors hover:bg-ink-800/50"
              >
                <td className="py-2.5 pr-3">
                  <input
                    value={i.name}
                    onChange={(e) => upd(i.id, { name: e.target.value })}
                    className="w-full bg-transparent font-bold text-parch-100 outline-none transition-colors focus:text-gold-200"
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <select
                    value={i.kind}
                    onChange={(e) => upd(i.id, { kind: e.target.value })}
                    className="field !w-auto !border-0 !bg-transparent !px-1 !py-0.5 text-[13px] !text-fog"
                  >
                    {ITEM_KINDS.map((k) => <option key={k} value={k} className="bg-ink-900">{k}</option>)}
                  </select>
                </td>
                <td className="py-2.5 pr-3 text-center">
                  <Stepper value={i.qty} min={0} onChange={(v) => upd(i.id, { qty: v })} />
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <input
                    type="number"
                    step="0.25"
                    value={i.weight}
                    onChange={(e) => upd(i.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                    className="num-input !w-16"
                  />
                </td>
                <td className="py-2.5 text-right font-bold text-ember-300">{fmtW(i.qty * i.weight)} kg</td>
                <td className="no-print py-2.5 pl-3 text-right">
                  <button
                    type="button"
                    onClick={() => set({ inventory: c.inventory.filter((x) => x.id !== i.id) })}
                    aria-label={`Descartar ${i.name}`}
                    className="text-dim opacity-0 transition-all hover:text-ember-400 group-hover:opacity-100"
                  >
                    <Trash size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {c.inventory.length === 0 && (
        <p className="rounded-md border border-dashed border-line-soft p-6 text-center font-tale italic text-dim">
          A mochila está vazia — nem uma migalha de ração.
        </p>
      )}

      <div className="no-print mt-5 grid gap-3 rounded-md border border-ember-500/35 bg-ink-900/70 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_7rem_8rem_auto]">
        <Field label="Nome do item">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} className="field" placeholder="Ex.: Corda de seda (15 m)" />
        </Field>
        <Field label="Tipo">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="field">
            {ITEM_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Quantidade">
          <input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Math.max(1, Number(e.target.value) || 1) })} className="field" />
        </Field>
        <Field label="Peso unit. (kg)">
          <input type="number" step="0.25" min={0} value={form.weight} onChange={(e) => setForm({ ...form, weight: Math.max(0, Number(e.target.value) || 0) })} className="field" />
        </Field>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center justify-center gap-1.5 self-end rounded-md border border-ember-400/55 bg-ember-500/15 px-4 py-2 text-sm font-bold text-ember-300 transition-all hover:bg-ember-500/28 hover:shadow-[0_0_16px_rgba(193,78,57,0.28)] active:scale-95"
        >
          <Plus size={13} /> Guardar
        </button>
      </div>

      <p className="mt-3 text-right text-[13px] text-fog">
        {totalItems} {totalItems === 1 ? "item" : "itens"} na bagagem · carga total{" "}
        <b className="text-ember-300">{fmtW(totalWeight)} kg</b>
      </p>
    </Section>
  );
}
