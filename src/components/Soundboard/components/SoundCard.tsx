import { useEffect, useRef, useState, type DragEvent, type PointerEvent, type CSSProperties } from "react";
import type { Category, Sound } from "../types";
import { engine } from "../audio/engine";
import { fmtDur, useApp, useUI } from "../store";
import { Icon } from "../data/icons";

interface Props {
  sound: Sound;
  cat: Category;
  hotkey?: number; // 1..9
  isPlaying: boolean;
  index: number;
  dnd: {
    draggable: boolean;
    onDragStart: (e: DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
  draftMode: boolean;
  isDrafted: boolean;
}

export function SoundCard({ sound, cat, hotkey, isPlaying, index, dnd, draftMode, isDrafted }: Props) {
  const { toggleSound, toggleFavorite, updateSound, setLayerVolume, data } = useApp();
  const ui = useUI();
  const isFav = data.favorites.includes(sound.id);
  const [previewing, setPreviewing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const previewRef = useRef(false);
  const downAt = useRef(0);

  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (previewRef.current) engine.stopVoice("pv:" + sound.id, 60);
    };
  }, [sound.id]);

  const startPreview = () => {
    previewRef.current = true;
    setPreviewing(true);
    const pv = { volume: 38, loop: sound.loop, fadeIn: 120, onEnded: () => {} };
    if (sound.synth.startsWith("file:")) {
      if (sound.fileUrl) void engine.playFile("pv:" + sound.id, sound.fileUrl, pv);
    } else {
      engine.play("pv:" + sound.id, sound.synth, pv);
    }
  };
  const stopPreview = () => {
    previewRef.current = false;
    setPreviewing(false);
    engine.stopVoice("pv:" + sound.id, 80);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    downAt.current = Date.now();
    pressTimer.current = window.setTimeout(startPreview, 420);
  };
  const onPointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (previewRef.current) {
      stopPreview();
      return;
    }
    if (Date.now() - downAt.current < 420) toggleSound(sound.id);
  };
  const onPointerLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (previewRef.current) stopPreview();
  };

  const glow = cat.color;
  const broken = sound.synth.startsWith("file:") && !sound.fileUrl;

  return (
    <div
      className={`reveal relative ${isPlaying ? "playing-glow" : ""}`}
      style={{
        animationDelay: `${Math.min(index, 14) * 35}ms`,
        ...(isPlaying ? ({ "--glow": glow + "aa" } as CSSProperties) : {}),
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") toggleSound(sound.id);
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={() => {
          if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
          }
          if (previewRef.current) stopPreview();
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          ui.openEditor(sound.id);
        }}
        {...dnd}
        className={[
          "group relative flex h-full flex-col gap-2 border border-line bg-ink-800/95 p-3 chamfer-sm",
          "cursor-pointer select-none outline-none transition-all duration-200",
          isPlaying ? "border-transparent" : "hover:-translate-y-1 hover:bg-ink-700/90",
          isDrafted ? "-translate-y-1 outline-2 outline-moss-400" : "",
          previewing ? "outline-2 outline-gold-400" : "",
          draftMode && !isDrafted ? "outline-1 outline-dashed outline-ink-500 hover:outline-moss-500" : "",
        ].join(" ")}
        style={{ borderColor: isPlaying ? glow + "88" : undefined }}
      >
      {/* topo: ícone + ações */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center border chamfer-sm transition-transform duration-200 group-hover:scale-105"
          style={{ color: glow, borderColor: glow + "44", background: glow + "14" }}
        >
          <Icon name={sound.icon} size={20} sw={1.6} />
        </div>
        <div className="flex items-center gap-1" onPointerUp={(e) => e.stopPropagation()}>
          {(sound.hotkey || hotkey) && (
            <span 
              title={`Atalho do Mestre: [ ${sound.hotkey || hotkey} ]`}
              className="mr-1 border border-gold-400/40 bg-ink-900/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gold-300 shadow-sm chamfer-xs"
            >
              {sound.hotkey || hotkey}
            </span>
          )}
          <button
            aria-label="Favoritar"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(sound.id);
            }}
            className={`p-1 transition-all hover:scale-125 ${
              isFav ? "text-blood-400" : "text-fog-dim opacity-0 group-hover:opacity-100 hover:text-blood-400"
            }`}
          >
            <Icon name={isFav ? "heartFill" : "heart"} size={15} />
          </button>
          <button
            aria-label="Editar som"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              ui.openEditor(sound.id);
            }}
            className="p-1 text-fog-dim opacity-0 transition-all hover:scale-125 hover:text-gold-400 group-hover:opacity-100"
          >
            <Icon name="pencil" size={15} />
          </button>
        </div>
      </div>

      {/* nome + equalizer */}
      <div className="flex items-center gap-2">
        <h3 className="truncate text-[13px] font-semibold leading-tight text-parch" title={sound.name}>{sound.name}</h3>
        {isPlaying && (
          <span className="eq shrink-0" style={{ color: glow }}>
            <i /><i /><i /><i />
          </span>
        )}
      </div>

      {/* metadados */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider">
        <span className="border border-line px-1.5 py-0.5 text-fog">{sound.type}</span>
        <span className="border px-1.5 py-0.5" style={{ borderColor: glow + "55", color: glow }}>
          {cat.name}
        </span>
        <span className="ml-auto flex items-center gap-1 text-fog-dim">
          {sound.loop && <Icon name="hourglass" size={10} />}
          {fmtDur(sound)}
        </span>
      </div>

      {/* volume individual */}
      <div
        className="flex items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <Icon name="volume" size={13} className={isPlaying ? "text-fog" : "text-fog-dim"} />
        <input
          type="range"
          min={0}
          max={100}
          value={sound.volume}
          aria-label={`Volume de ${sound.name}`}
          onChange={(e) => {
            const v = Number(e.target.value);
            updateSound(sound.id, { volume: v });
            if (engine.hasVoice(sound.id)) setLayerVolume(sound.id, v);
          }}
          className="w-full"
          style={{ "--thumb": glow } as CSSProperties}
        />
        <span className="w-7 text-right font-mono text-[10px] text-fog">{sound.volume}</span>
      </div>

      {/* estados */}
      {previewing && (
        <div className="pointer-events-none absolute inset-x-0 -top-2.5 flex justify-center">
          <span className="bg-gold-400 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ink-950">
            preview
          </span>
        </div>
      )}
      {broken && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-ink-950/70">
          <span className="border border-blood-400/50 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-blood-400">
            re-upload necessário
          </span>
        </div>
      )}
        {draftMode && !isDrafted && (
          <div className="pointer-events-none absolute right-2 bottom-2 text-moss-400 opacity-0 transition-opacity group-hover:opacity-100">
            <Icon name="link" size={16} />
          </div>
        )}
      </div>
    </div>
  );
}
