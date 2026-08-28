import { useEffect, useMemo, useRef, useState } from "react";
import { AppProvider, selectVisible, UIContext, useApp, type UIHooks } from "./store";
import { Sidebar } from "./components/Sidebar";
import { SoundGrid } from "./components/SoundGrid";
import { NowPlaying } from "./components/NowPlaying";
import { ScenesView } from "./components/ScenesView";
import { UploadsView } from "./components/UploadsView";
import { VttView } from "./components/VttView";
import { CategoryModal, HelpModal, SceneModal, SoundEditorModal } from "./components/Modals";
import { Icon } from "./data/icons";

/* ---------- fundo ambiente ---------- */
function RuneRing({ className = "", slower = false }: { className?: string; slower?: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className={`${slower ? "spin-slower" : "spin-slow"} ${className}`}
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeOpacity="0.28" strokeDasharray="4 10" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeOpacity="0.16" strokeDasharray="34 16" />
      <circle cx="100" cy="100" r="46" stroke="currentColor" strokeOpacity="0.12" />
      <path d="M100 4v22M100 174v22M4 100h22M174 100h22" stroke="currentColor" strokeOpacity="0.22" />
      <path d="M100 54 140 123H60Z" stroke="currentColor" strokeOpacity="0.14" />
    </svg>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 12% 0%, rgba(47,212,140,0.07) 0%, transparent 60%)," +
            "radial-gradient(50% 40% at 95% 15%, rgba(183,140,255,0.075) 0%, transparent 60%)," +
            "radial-gradient(55% 50% at 70% 100%, rgba(230,193,92,0.05) 0%, transparent 60%)," +
            "linear-gradient(180deg, #070c0a 0%, #0a100e 55%, #081009 100%)",
        }}
      />
      <div className="grid-layer absolute inset-0" />
      <div className="noise-layer absolute inset-0" />
      <RuneRing className="absolute -right-40 -top-40 h-[520px] w-[520px] text-moss-500" />
      <RuneRing className="absolute -bottom-52 -left-52 h-[620px] w-[620px] text-arc-500" slower />
      <div
        className="scanline absolute inset-x-0 top-0 h-28"
        style={{ background: "linear-gradient(180deg, transparent, rgba(76,230,165,0.03), transparent)" }}
      />
      <div className="vignette absolute inset-0" />
    </div>
  );
}

/* ---------- toasts ---------- */
function Toasts() {
  const app = useApp();
  const cls = {
    ok: "border-moss-500/50 text-moss-300",
    warn: "border-gold-400/50 text-gold-300",
    err: "border-blood-400/60 text-blood-400",
  };
  const icon = { ok: "check", warn: "zap", err: "x" };
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[300px] flex-col gap-2">
      {app.toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in flex items-center gap-2.5 border bg-ink-900/95 px-3.5 py-2.5 backdrop-blur-md chamfer-sm ${cls[t.kind]}`}
        >
          <Icon name={icon[t.kind]} size={14} sw={2.2} />
          <span className="flex-1 text-xs font-medium text-parch">{t.msg}</span>
          <button onClick={() => app.dismissToast(t.id)} className="text-fog-dim hover:text-parch">
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- shell ---------- */
export function SoundboardCompact({ onExpand }: { onExpand: () => void }) {
  const app = useApp();
  const sounds = app.data.favorites.map((id) => app.data.sounds[id]).filter(Boolean);
  const playing = new Set(app.layers.map((layer) => layer.soundId));

  return (
    <div className="dozero-soundboard-compact-surface">
      <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center border border-gold-400/50 bg-gold-400/10 text-gold-300 chamfer-sm">
          <Icon name="headphones" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xs font-bold uppercase tracking-[0.14em] text-parch">Soundboard</p>
          <p className="truncate font-mono text-[9px] uppercase tracking-wider text-fog-dim">favoritos da mesa</p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-fog-dim">{app.layers.length} ao vivo</span>
      </div>
      <div className="grid max-h-[min(52vh,420px)] grid-cols-3 gap-1.5 overflow-y-auto p-2.5">
        {sounds.length > 0 ? sounds.map((sound, idx) => {
            const hotkeyBadge = sound.hotkey || (idx < 9 ? String(idx + 1) : null);
            return (
              <button
                key={sound.id}
                type="button"
                onClick={() => app.toggleSound(sound.id)}
                className={`relative flex min-h-20 flex-col items-center justify-center gap-1 border px-1.5 py-2 text-center transition-all chamfer-sm ${
                  playing.has(sound.id) ? "border-moss-400/70 bg-moss-500/15 text-moss-300" : "border-line bg-ink-800 text-fog hover:border-gold-400/60 hover:text-parch"
                }`}
                aria-label={`${playing.has(sound.id) ? "Parar" : "Tocar"} ${sound.name}`}
                aria-pressed={playing.has(sound.id)}
                title={`${playing.has(sound.id) ? "Parar" : "Tocar"} ${sound.name}${hotkeyBadge ? ` [Atalho: ${hotkeyBadge}]` : ""}`}
              >
                {hotkeyBadge && (
                  <span className="absolute top-1 right-1 font-mono text-[9px] font-bold text-gold-300/80 bg-ink-950/80 px-1 rounded-sm border border-gold-400/30">
                    {hotkeyBadge}
                  </span>
                )}
                <Icon name={sound.icon} size={18} />
                <span className="line-clamp-2 text-[10px] leading-tight">{sound.name}</span>
              </button>
            );
          }) : (
            <p className="col-span-3 px-2 py-5 text-center text-[11px] leading-relaxed text-fog-dim">
              Nenhum favorito fixado. Abra a mesa completa e use os corações para montar este atalho.
            </p>
          )}
      </div>
      <button
        type="button"
        onClick={onExpand}
        className="mx-2.5 mb-2.5 flex w-[calc(100%-20px)] items-center justify-center gap-1.5 border border-gold-400/40 bg-gold-400/5 px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-gold-300 transition-colors hover:bg-gold-400/15 chamfer-sm"
      >
        <Icon name="layers" size={12} /> abrir mesa completa
      </button>
    </div>
  );
}

function Shell({ embedded = false }: { embedded?: boolean }) {
  const app = useApp();
  const [editor, setEditor] = useState<string | null>(null);
  const [sceneModal, setSceneModal] = useState<{ ids: string[]; sceneId?: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCats, setShowCats] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const ui = useMemo<UIHooks>(
    () => ({
      openEditor: (id) => setEditor(id),
      openSceneFrom: (ids) => setSceneModal({ ids }),
      openSceneEdit: (sceneId) => setSceneModal({ ids: [], sceneId }),
      openHelp: () => setShowHelp(true),
    }),
    []
  );

  /* relógio de sessão */
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* atalhos de teclado do mestre */
  const visibleRef = useRef<ReturnType<typeof selectVisible>>([]);
  const visible = selectVisible(app.data, app.view, app.filters);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) {
        if (e.key === "Escape") (t as HTMLInputElement).blur();
        return;
      }

      // Parada de emergência (Panic Stop / Fade rápido)
      if ((e.shiftKey && e.key === "Escape") || (e.altKey && (e.key.toLowerCase() === "m" || e.key.toLowerCase() === "s"))) {
        e.preventDefault();
        app.stopAll(600);
        app.toast("Todos os sons foram silenciados");
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        app.togglePause();
        return;
      }

      // Atalhos numéricos (1-9, Numpad 1-9) e atalhos customizados
      const keyVal = e.code.startsWith("Numpad") && e.code.length === 7 ? e.code.slice(6) : e.key;

      // 1) Procura som com atalho customizado no banco de dados
      const customSound = Object.values(app.data.sounds).find(
        (s) => s.hotkey && s.hotkey.toLowerCase() === keyVal.toLowerCase()
      );

      if (customSound) {
        e.preventDefault();
        app.toggleSound(customSound.id);
        return;
      }

      // 2) Fallback para a posição na grade visível
      if (keyVal >= "1" && keyVal <= "9") {
        const s = visibleRef.current[Number(keyVal) - 1];
        if (s) {
          e.preventDefault();
          app.toggleSound(s.id);
          return;
        }
      }

      if (e.key === "Escape") {
        setEditor(null);
        setSceneModal(null);
        setShowHelp(false);
        setShowCats(false);
        setSideOpen(false);
        setMixerOpen(false);
      } else if (e.key === "?") {
        setShowHelp(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [app]);

  const currentPadId = app.view.kind === "pad" ? app.view.padId : null;
  const viewLabel =
    currentPadId
      ? app.data.pads.find((p) => p.id === currentPadId)?.name ?? "Soundpad"
      : app.view.kind === "favorites"
        ? "Favoritos"
        : app.view.kind === "scenes"
          ? "Cenas"
          : app.view.kind === "uploads"
            ? "Meus Áudios"
            : app.view.kind === "vtt"
              ? "Integração VTT"
              : "Biblioteca";

  const sessionClock = `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`;

  return (
    <UIContext.Provider value={ui}>
      <div className={`relative flex ${embedded ? "h-full min-h-0" : "h-screen"} overflow-hidden text-parch`}>
        <AmbientBackground />

        {/* ===== sidebar (desktop) ===== */}
        <div className="relative z-10 hidden w-[262px] shrink-0 border-r border-line bg-ink-900/80 backdrop-blur-md md:block">
          <Sidebar onNewCategory={() => setShowCats(true)} />
        </div>

        {/* ===== sidebar (mobile drawer) ===== */}
        {sideOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[272px] border-r border-line bg-ink-900">
              <Sidebar onNewCategory={() => { setShowCats(true); setSideOpen(false); }} />
            </div>
          </div>
        )}

        {/* ===== coluna central ===== */}
        <main className="relative z-10 flex min-w-0 flex-1 flex-col">
          {/* barra de status */}
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-ink-900/60 px-4 backdrop-blur-md">
            <button onClick={() => setSideOpen(true)} className="text-fog hover:text-parch md:hidden" aria-label="Abrir menu">
              <Icon name="drag" size={18} />
            </button>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-fog-dim">
              arcanum <span className="text-fog-dim/50">/</span>{" "}
              <span className="text-moss-300">{viewLabel.toLowerCase()}</span>
            </p>
            <div className="ml-auto flex items-center gap-3">
              {app.paused && (
                <span className="blink-soft border border-gold-400/60 bg-gold-400/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold-300">
                  pausado
                </span>
              )}
              <span className="hidden items-center gap-1.5 font-mono text-[10px] text-fog sm:flex">
                <Icon name="clock" size={12} className="text-gold-400" />
                sessão {sessionClock}
              </span>
              <span className="hidden items-center gap-1.5 font-mono text-[10px] text-fog sm:flex">
                <Icon name="layers" size={12} className="text-arc-400" />
                {app.layers.length} ativa{app.layers.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-fog">
                <Icon name="volume" size={12} className="text-moss-400" />
                {app.data.master}%
              </span>
              <button
                onClick={ui.openHelp}
                className="hidden border border-line px-2 py-1 font-mono text-[10px] text-fog-dim transition-colors hover:border-gold-400/50 hover:text-gold-300 sm:block"
                title="Atalhos (?)"
              >
                ?
              </button>
              <button
                onClick={() => setMixerOpen(true)}
                className="relative flex items-center gap-1.5 border border-line bg-ink-800 px-2.5 py-1.5 font-mono text-[10px] uppercase text-fog transition-colors hover:text-moss-300 lg:hidden"
              >
                <Icon name="headphones" size={13} />
                mixer
                {app.layers.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center bg-moss-500 font-mono text-[9px] font-bold text-ink-950">
                    {app.layers.length}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* conteúdo */}
          <div className="min-h-0 flex-1 px-4 py-5 md:px-6">
            {app.view.kind === "scenes" ? (
              <ScenesView />
            ) : app.view.kind === "uploads" ? (
              <UploadsView />
            ) : app.view.kind === "vtt" ? (
              <VttView />
            ) : (
              <SoundGrid />
            )}
          </div>
        </main>

        {/* ===== painel Tocando Agora (desktop) ===== */}
        <div className="relative z-10 hidden w-[320px] shrink-0 lg:block">
          <NowPlaying />
        </div>

        {/* ===== mixer (mobile drawer) ===== */}
        {mixerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setMixerOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-[320px] max-w-[88vw]">
              <NowPlaying />
            </div>
          </div>
        )}

        {/* ===== modais ===== */}
        {editor && <SoundEditorModal soundId={editor} onClose={() => setEditor(null)} />}
        {sceneModal && (
          <SceneModal
            presetIds={sceneModal.ids}
            sceneId={sceneModal.sceneId}
            onClose={() => setSceneModal(null)}
          />
        )}
        {showCats && <CategoryModal onClose={() => setShowCats(false)} />}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

        <Toasts />

        {/* aviso de pausa */}
        {app.paused && (
          <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center">
            <p className="border border-gold-400/40 bg-ink-900/90 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-gold-300 backdrop-blur chamfer-sm">
              áudio suspenso — espaço para retomar
            </p>
          </div>
        )}
      </div>
    </UIContext.Provider>
  );
}

export function SoundboardWorkspace() {
  return <Shell embedded />;
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
