import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  ChevronDown,
  Copy,
  Crown,
  Hourglass,
  LayoutGrid,
  Shield,
  Sparkles,
  Trash2,
  Network,
} from "lucide-react";
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
import { useWindowManager } from "../../../hooks/useWindowManager";
import { auditCharacter, normalizeCharacter } from "../../../services/characterAudit";
import {
  Sigil,
  Download,
  Upload,
  Printer,
  RenewIcon,
  Check,
  Close,
} from "./icons";

const MOVEMENT_ITEMS = [
  { id: "status", label: "Status" },
  { id: "magias", label: "Magias" },
  { id: "macros", label: "Macros" },
  { id: "inventario", label: "Inventário" },
  { id: "historia", label: "História" },
  { id: "galeria", label: "Galeria" },
] as const;

interface ArcanumSheetProps {
  initialCharacter?: Character;
  wikiPath?: string;
  personagens?: { nome: string; caminhoArquivo: string }[];
  onUpdateWikiLink?: (wikiPath: string) => void;
  onSpawnToken?: () => void;
  onDuplicateToVault?: () => void;
  onIntegrateEverywhere?: () => void;
  onDelete?: () => void;
  onSave?: (character: Character) => void | Promise<void>;
  onClose?: () => void;
  onExitToCanvas?: () => void;
  onNew?: () => void;
  onRoll?: (roll: RollResult) => void;
  onAudit?: () => void;
}

export default function App({
  initialCharacter,
  wikiPath = "",
  personagens = [],
  onUpdateWikiLink,
  onSpawnToken,
  onDuplicateToVault,
  onIntegrateEverywhere,
  onDelete,
  onSave,
  onClose,
  onExitToCanvas,
  onNew,
  onRoll: onExternalRoll,
  onAudit,
}: ArcanumSheetProps) {
  const [c, setC] = useState<Character>(() => structuredClone(initialCharacter || DEFAULT_CHARACTER));
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [rolls, setRolls] = useState<RollResult[]>([]);
  const [saved, setSaved] = useState(true);
  const [showEcosystem, setShowEcosystem] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const onSaveRef = useRef(onSave);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  const isFirstMount = useRef(true);

  /* autosave com debounce (apenas quando houver alterações não salvas) */
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (saved) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      Promise.resolve(onSaveRef.current?.(c))
        .then(() => setSaved(true))
        .catch(() => notify("Não foi possível salvar a ficha — exporte uma cópia em JSON", "ember"));
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [c, saved]);

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

  const [activeSection, setActiveSection] = useState<string>("status");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = sheetRef.current?.querySelector<HTMLElement>(`#${id}`);
    const container = sheetRef.current?.closest<HTMLElement>(".arcanum-editor-scroll");
    if (!element || !container) return;

    const sectionTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    const headerHeight = sheetRef.current?.querySelector("header")?.getBoundingClientRect().height ?? 0;
    container.scrollTo({ top: Math.max(0, sectionTop - headerHeight - 12), behavior: "smooth" });
  };

  return (
    <div ref={sheetRef} className="arcanum-sheet-workspace bg-arcane relative min-h-screen">
      <div className="noise-veil" />
      <Embers />

      {/* ================= CABEÇALHO PERMANENTE COM NAVEGAÇÃO DOZERO E MENU DE MOVIMENTAÇÃO ================= */}
      <header className="no-print sticky top-0 z-50 border-b border-line bg-ink-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1520px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-6">
          {/* Lado esquerdo: Retorno à Mesa, Dropdown DOZERO e Marca Arcanum */}
          <div className="relative z-50 flex items-center gap-2.5 shrink-0">
            {onExitToCanvas && (
              <button
                type="button"
                onClick={onExitToCanvas}
                title="Voltar ao Mapa / Mesa"
                className="workspace-chrome-button"
              >
                <LayoutGrid size={14} /> Mesa
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEcosystem((prev) => !prev)}
                className="workspace-chrome-button"
                title="Navegar pelo Ecossistema DOZERO"
              >
                <Sparkles size={13} className="text-gold-400" />
                <span className="hidden sm:inline">DOZERO</span>
                <ChevronDown size={11} className={`transition-transform duration-200 ${showEcosystem ? "rotate-180" : ""}`} />
              </button>

              {showEcosystem && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEcosystem(false)} />
                  <div className="absolute left-0 top-full mt-2 z-50 w-60 rounded-lg border border-gold-600/40 bg-ink-900/95 p-1.5 shadow-2xl backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEcosystem(false);
                        const { closeWindow, setViewMode } = useWindowManager.getState();
                        closeWindow("lineage");
                        closeWindow("chronicle");
                        setViewMode("wiki");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                    >
                      <BookOpen size={14} className="text-gold-400" /> Códice (Wiki)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEcosystem(false);
                        const { closeWindow, setViewMode } = useWindowManager.getState();
                        closeWindow("lineage");
                        closeWindow("chronicle");
                        setViewMode("brain");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                    >
                      <Brain size={14} className="text-gold-400" /> Cérebro Grafo (Arcanum)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEcosystem(false);
                        const { closeWindow, openWindow, setViewMode } = useWindowManager.getState();
                        closeWindow("chronicle");
                        setViewMode("canvas");
                        openWindow("lineage");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                    >
                      <Crown size={14} className="text-gold-400" /> Linhagem (Casas & Dinastias)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEcosystem(false);
                        const { closeWindow, openWindow, setViewMode } = useWindowManager.getState();
                        closeWindow("lineage");
                        setViewMode("canvas");
                        openWindow("chronicle");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                    >
                      <Hourglass size={14} className="text-gold-400" /> Chronica (Linha do Tempo)
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="hidden xl:flex items-center gap-2 border-l border-line-soft pl-2.5">
              <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-gold-600/50 bg-ink-850 text-gold-300 shadow-[0_0_12px_rgba(205,151,60,0.18)]">
                <Sigil size={18} />
              </span>
              <div className="leading-none">
                <span className="block font-display text-[15px] font-black tracking-[0.08em] text-parch-100">
                  ARCANUM
                </span>
                <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.25em] text-gold-500">
                  Forja de Fichas
                </span>
              </div>
            </div>
          </div>

          {/* Centro: Menu de Movimentação Permanente (Status | Magias | Macros | Inventário | História | Galeria) */}
          <nav
            aria-label="Navegação da ficha"
            className="arcanum-movement-nav relative z-50 order-3 flex w-full items-center gap-4 overflow-x-auto whitespace-nowrap py-1 sm:gap-7 2xl:order-none 2xl:w-auto 2xl:flex-1"
          >
            <div className="arcanum-movement-nav__items">
              {MOVEMENT_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`arcanum-movement-item ${activeSection === item.id ? "active" : ""}`}
                  aria-current={activeSection === item.id ? "location" : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Lado direito: Ações da Ficha, Sistema, Salvamento e Utilitários */}
          <div className="relative z-50 ml-auto flex items-center gap-2 shrink-0">
            {onAudit && (
              <button type="button" onClick={() => setShowAudit(true)} title="Auditar ficha e macros" className="workspace-chrome-button">
                <Shield size={13} className="text-gold-400" /><span className="hidden md:inline">Auditar</span>
              </button>
            )}
            {(onSpawnToken || onDuplicateToVault || onIntegrateEverywhere || onDelete || onAudit || (personagens.length > 0 && onUpdateWikiLink)) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowActions((prev) => !prev)}
                  className="workspace-chrome-button"
                  title="Ações do personagem no DOZERO"
                >
                  <Shield size={13} className="text-gold-400" />
                  <span className="hidden md:inline">Ações</span>
                  <ChevronDown size={11} className={`transition-transform duration-200 ${showActions ? "rotate-180" : ""}`} />
                </button>

                {showActions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-gold-600/40 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-md space-y-1">
                      {onIntegrateEverywhere && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowActions(false);
                            onIntegrateEverywhere();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                        >
                          <Network size={14} className="text-gold-400" /> Integrar no Códice, Linhagem e Chronos
                        </button>
                      )}
                      {onAudit && (
                        <button type="button" onClick={() => { setShowActions(false); setShowAudit(true); }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200">
                          <Shield size={14} className="text-gold-400" /> Auditar e normalizar ficha
                        </button>
                      )}
                      {onSpawnToken && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowActions(false);
                            onSpawnToken();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                        >
                          <Shield size={14} className="text-gold-400" /> Criar Token no Mapa
                        </button>
                      )}
                      {onDuplicateToVault && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowActions(false);
                            onDuplicateToVault();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-fog transition-colors hover:bg-ink-800 hover:text-gold-200"
                        >
                          <Copy size={14} className="text-gold-400" /> Salvar Cópia no Vault
                        </button>
                      )}
                      {personagens.length > 0 && onUpdateWikiLink && (
                        <div className="border-t border-line-soft pt-1.5 px-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-dim mb-1">
                            Vínculo com Códice
                          </label>
                          <select
                            value={wikiPath}
                            onChange={(e) => {
                              onUpdateWikiLink(e.target.value);
                            }}
                            className="w-full rounded bg-ink-950 px-2 py-1.5 text-xs text-gold-200 border border-line-soft outline-none"
                          >
                            <option value="">Sem vínculo no Códice</option>
                            {personagens.map((p) => (
                              <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {onDelete && (
                        <div className="border-t border-line-soft pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowActions(false);
                              onDelete();
                            }}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-ember-400 transition-colors hover:bg-ember-950/40 hover:text-ember-300"
                          >
                            <Trash2 size={14} /> Excluir esta ficha
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <label className="flex items-center gap-1.5 rounded-md border border-line-soft bg-ink-900/80 px-2 py-1 transition-colors hover:border-gold-600/50">
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-dim sm:inline">Sistema</span>
              <select
                value={c.system}
                onChange={(e) => applySystem(e.target.value)}
                className="field !w-auto !border-0 !bg-transparent !p-0 !text-xs !font-bold !text-gold-200 focus:!shadow-none"
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
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-widest transition-colors sm:flex ${
                saved ? "border-jade-500/40 bg-jade-500/10 text-jade-300" : "border-gold-600/40 bg-gold-900/20 text-gold-300"
              }`}
              title="Salvamento automático"
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
              className="grid h-8 w-8 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-steel-400/60 hover:text-steel-300 active:scale-90"
            >
              <Upload size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJSON(c);
                notify("Ficha exportada em JSON", "jade");
              }}
              title="Exportar ficha (JSON)"
              className="grid h-8 w-8 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-gold-500/60 hover:text-gold-300 active:scale-90"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              title="Imprimir ficha"
              className="hidden h-8 w-8 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-gold-500/60 hover:text-gold-300 active:scale-90 sm:grid"
            >
              <Printer size={14} />
            </button>
            <button
              type="button"
              onClick={newSheet}
              title="Nova ficha"
              className="grid h-8 w-8 place-items-center rounded-md border border-ember-500/40 bg-ember-900/20 text-ember-300 transition-all hover:border-ember-400 hover:bg-ember-900/40 active:scale-90"
            >
              <RenewIcon size={14} />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Voltar para a lista de fichas"
                className="grid h-8 w-8 place-items-center rounded-md border border-line-soft bg-ink-900/70 text-fog transition-all hover:border-gold-500/60 hover:text-gold-300 active:scale-90"
              >
                <Close size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {(showEcosystem || showActions) && (
        <button
          type="button"
          aria-label="Fechar menu aberto"
          className="fixed inset-0 z-40 cursor-default border-0 bg-transparent p-0"
          onClick={() => {
            setShowEcosystem(false);
            setShowActions(false);
          }}
        />
      )}

      {/* ================= CORPO DA FICHA EM GRID DE 2 COLUNAS CENTRALIZADO ================= */}
      <main className="relative z-10 mx-auto grid max-w-[1520px] grid-cols-1 items-start gap-6 px-4 pb-24 pt-6 sm:px-6 xl:grid-cols-[380px_1fr]">
        <div className="xl:sticky xl:top-[86px] 2xl:top-[68px]">
          <Identity c={c} set={set} notify={notify} />
        </div>

        <div className="space-y-6 min-w-0">
          <StatusSection c={c} set={set} />
          <SpellsSection c={c} set={set} />
          <MacrosSection c={c} set={set} onRoll={onRoll} notify={notify} />
          <InventorySection c={c} set={set} />
          <StorySection c={c} set={set} />
          <NotesSection c={c} set={set} />
          <GallerySection c={c} set={set} notify={notify} />
        </div>
      </main>

      {/* ================= RODAPÉ ================= */}
      <footer className="relative z-10 border-t border-line-soft bg-ink-950/70">
        <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
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
      {showAudit && <SheetAuditDialog character={c} onClose={() => setShowAudit(false)} onNormalize={() => { setC(normalizeCharacter(c)); setSaved(false); setShowAudit(false); notify("Ficha normalizada para a mesa", "jade"); }} />}
    </div>
  );
}

function SheetAuditDialog({ character, onClose, onNormalize }: { character: Character; onClose: () => void; onNormalize: () => void }) {
  const report = auditCharacter(character);
  return <div role="dialog" aria-modal="true" aria-label="Auditoria da ficha" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4">
    <section className="w-full max-w-lg rounded-xl border border-gold-600/40 bg-ink-900 p-5 shadow-2xl">
      <header className="flex items-start gap-3"><Shield size={20} className="mt-0.5 text-gold-400" /><div className="flex-1"><h2 className="font-display text-lg font-black text-parch-100">Auditoria da ficha</h2><p className="text-xs text-fog">Confere recursos, classe, atributos e as mesmas macros usadas na mesa.</p></div><button type="button" onClick={onClose} aria-label="Fechar auditoria" className="text-fog hover:text-parch-100"><Close size={17} /></button></header>
      <div className="mt-4 space-y-2">{report.issues.length ? report.issues.map((issue, index) => <div key={`${issue.field}-${index}`} className={`rounded-md border p-3 text-xs ${issue.severity === "error" ? "border-ember-500/40 bg-ember-950/30 text-ember-200" : "border-gold-600/40 bg-gold-900/20 text-gold-200"}`}><b>{issue.field}:</b> {issue.message}</div>) : <div className="rounded-md border border-jade-500/40 bg-jade-950/30 p-3 text-xs text-jade-200">Ficha pronta: dados e macros estão coerentes com a mesa.</div>}</div>
      <footer className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="workspace-chrome-button">Cancelar</button><button type="button" onClick={onNormalize} className="workspace-chrome-button"><RenewIcon size={14} /> Normalizar ficha</button></footer>
    </section>
  </div>;
}
