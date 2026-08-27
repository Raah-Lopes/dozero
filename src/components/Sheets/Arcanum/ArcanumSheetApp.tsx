import React, { useEffect, useRef, useState } from "react";
import type { Character, RollResult } from "./lib";
import {
  DEFAULT_CHARACTER,
  SYSTEMS,
  downloadJSON,
  uid,
} from "./lib";
import "./index.css";
import Identity from "./components/Identity";
import StatusSection from "./components/StatusSection";
import SpellsSection from "./components/SpellsSection";
import MacrosSection from "./components/MacrosSection";
import InventorySection from "./components/InventorySection";
import { NotesSection, StorySection, GallerySection } from "./components/StoryGallery";
import DiceTray from "./components/DiceTray";
import { Embers, Toasts, type ToastMsg } from "./components/ui";
import {
  Sigil,
  Download,
  Upload,
  Printer,
  RenewIcon,
  Check,
  DiceD20,
  HeartPulse,
  Close,
} from "./icons";

interface ArcanumSheetProps {
  initialCharacter?: Character;
  onSave?: (character: Character) => void | Promise<void>;
  onClose?: () => void;
  onNew?: () => void;
  onRoll?: (roll: RollResult) => void;
}

export default function App({ initialCharacter, onSave, onClose, onNew, onRoll: onExternalRoll }: ArcanumSheetProps) {
  const [c, setC] = useState<Character>(() => structuredClone(initialCharacter || DEFAULT_CHARACTER));
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const [saved, setSaved] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const set = (patch: Partial<Character>) => {
    setC((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const notify = (text: string, tone: ToastMsg["tone"] = "gold") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  };

  /* autosave com debounce */
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      Promise.resolve(onSaveRef.current?.(c))
        .then(() => setSaved(true))
        .catch(() => notify("Não foi possível salvar a ficha — exporte uma cópia em JSON", "ember"));
    }, 600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [c]);

  const applySystem = (sys: string) => {
    const preset = SYSTEMS[sys];
    set({
      system: sys,
      attributes: preset.attrs.map((name) => ({ id: uid(), name, value: 10 })),
      vitals: preset.vitals.map((v) => ({ id: uid(), label: v.label, color: v.color, value: v.max, max: v.max })),
    });
    notify(`Modelo de ${sys} aplicado aos status`, "jade");
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as Partial<Character>;
      if (!parsed || typeof parsed.name !== "string") throw new Error("inválido");
      setC({ ...DEFAULT_CHARACTER, ...parsed });
      notify(`Ficha "${parsed.name}" importada`, "jade");
    } catch {
      notify("Arquivo inválido — importe um JSON do Arcanum", "ember");
    }
  };

  const newSheet = () => {
    if (!window.confirm("Forjar uma nova ficha? As alterações atuais já foram salvas.")) return;
    if (onNew) onNew();
    else setC(structuredClone(DEFAULT_CHARACTER));
  };

  const onRoll = (r: RollResult) => {
    setRolls((prev) => [r, ...prev].slice(0, 10));
    onExternalRoll?.(r);
  };

  const navItems = [
    { href: "#status", label: "Status" },
    { href: "#magias", label: "Magias" },
    { href: "#macros", label: "Macros" },
    { href: "#inventario", label: "Inventário" },
    { href: "#historia", label: "História" },
    { href: "#galeria", label: "Galeria" },
  ];

  return (
    <div className="arcanum-sheet-workspace bg-arcane relative min-h-screen">
      <div className="noise-veil" />
      <Embers />

      {/* ================= topo ================= */}
      <header className="no-print sticky top-0 z-50 border-b border-line bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
          <a href="#" className="group flex items-center gap-3">
            <span className="relative grid h-11 w-11 place-items-center rounded-lg border border-gold-600/50 bg-ink-850 text-gold-300 shadow-[0_0_18px_rgba(205,151,60,0.18)]">
              <Sigil size={26} className="transition-transform duration-700 group-hover:rotate-180" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[22px] font-black tracking-[0.08em] text-parch-100">
                ARCANUM
              </span>
              <span className="mt-1 block text-[10.5px] font-bold uppercase tracking-[0.3em] text-gold-500">
                Forja de Fichas de RPG
              </span>
            </span>
          </a>

          <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-0.5 lg:order-none lg:mx-0 lg:w-auto lg:flex-1 lg:justify-center">
            {navItems.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-bold text-fog transition-all hover:bg-ink-800 hover:text-gold-200"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Voltar para a lista de fichas"
                className="grid h-9 w-9 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-gold-500/60 hover:text-gold-300 active:scale-90"
              >
                <Close size={16} />
              </button>
            )}
            <label className="flex items-center gap-2 rounded-md border border-line-soft bg-ink-900/70 px-2.5 py-1.5 transition-colors hover:border-gold-600/50">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-dim">Sistema</span>
              <select
                value={c.system}
                onChange={(e) => applySystem(e.target.value)}
                className="field !w-auto !border-0 !bg-transparent !p-0 !text-sm !font-bold !text-gold-200 focus:!shadow-none"
                aria-label="Sistema de regras"
              >
                {Object.keys(SYSTEMS).map((s) => (
                  <option key={s} value={s} className="bg-ink-900 text-parch-100">
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <span
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors sm:flex ${
                saved ? "border-jade-500/40 bg-jade-500/10 text-jade-300" : "border-gold-600/40 bg-gold-900/20 text-gold-300"
              }`}
              title="Salvamento automático no navegador"
            >
              {saved ? <Check size={11} /> : <span className="h-1.5 w-1.5 animate-ping rounded-full bg-gold-300" />}
              {saved ? "Salvo" : "Salvando"}
            </span>

            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                void onImport(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              title="Importar ficha (JSON)"
              className="grid h-9 w-9 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-steel-400/60 hover:text-steel-300 active:scale-90"
            >
              <Upload size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJSON(c);
                notify("Ficha exportada em JSON", "jade");
              }}
              title="Exportar ficha (JSON)"
              className="grid h-9 w-9 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-gold-500/60 hover:text-gold-300 active:scale-90"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              title="Imprimir ficha"
              className="hidden h-9 w-9 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-gold-500/60 hover:text-gold-300 active:scale-90 sm:grid"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={newSheet}
              title="Nova ficha"
              className="grid h-9 w-9 place-items-center rounded-md border border-ember-500/40 bg-ember-900/20 text-ember-300 transition-all hover:border-ember-400 hover:bg-ember-900/40 active:scale-90"
            >
              <RenewIcon size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ================= letreiro ================= */}
      <div className="relative mx-auto max-w-[1480px] px-4 pb-2 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.3em] text-ember-400">
              <span className="h-px w-8 bg-ember-500/60" />
              Crônica em andamento
            </p>
            <h1 className="mt-2 font-display text-4xl font-black leading-[1.02] text-parch-100 sm:text-5xl">
              {c.name || "Sem nome"}
              <span className="text-gold-500">.</span>
            </h1>
            <p className="mt-2 max-w-xl font-tale text-[15.5px] italic leading-snug text-fog">
              {c.race || "…"} {c.klass ? `· ${c.klass}` : ""} — ficha viva para{" "}
              <b className="not-italic font-bold text-gold-300">{c.system}</b>, pronta para qualquer mesa.
            </p>
          </div>
          <div className="no-print hidden items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-dim md:flex">
            <HeartPulse size={15} className="text-ember-400" />
            tudo é salvo automaticamente
            <span className="mx-1 text-gold-600">✦</span>
            <DiceD20 size={15} className="text-jade-400" />
            macros rolam de verdade
          </div>
        </div>
      </div>

      {/* ================= corpo ================= */}
      <main className="relative z-10 mx-auto grid max-w-[1480px] grid-cols-1 items-start gap-6 px-4 pb-24 pt-6 sm:px-6 xl:grid-cols-[390px_1fr]">
        <div className="xl:sticky xl:top-[86px]">
          <Identity c={c} set={set} notify={notify} />
        </div>

        <div className="space-y-6">
          <StatusSection c={c} set={set} />
          <SpellsSection c={c} set={set} />
          <MacrosSection c={c} set={set} onRoll={onRoll} notify={notify} />
          <InventorySection c={c} set={set} />
          <StorySection c={c} set={set} />
          <NotesSection c={c} set={set} />
          <GallerySection c={c} set={set} notify={notify} />
        </div>
      </main>

      {/* ================= rodapé ================= */}
      <footer className="relative z-10 border-t border-line-soft bg-ink-950/70">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p className="flex items-center gap-2.5 font-display text-[12px] font-bold uppercase tracking-[0.22em] text-fog">
            <Sigil size={17} className="text-gold-500" />
            Arcanum — forjado para qualquer sistema
          </p>
          <p className="font-tale text-[13.5px] italic text-dim">
            "Que os dados rolem a seu favor e a história nunca termine."
          </p>
        </div>
      </footer>

      <DiceTray rolls={rolls} onRoll={onRoll} onClear={() => setRolls([])} />
      <Toasts toasts={toasts} />
    </div>
  );
}
