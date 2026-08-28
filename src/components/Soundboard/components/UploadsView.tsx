import { useEffect, useRef, useState, type DragEvent } from "react";
import { get, set } from "idb-keyval";
import type { Sound } from "../types";
import { useApp } from "../store";
import { Icon } from "../data/icons";

const readAsDataURL = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const probeDuration = (url: string) =>
  new Promise<number>((res) => {
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.src = url;
    const done = () => res(Number.isFinite(a.duration) ? a.duration : 0);
    a.onloadedmetadata = done;
    a.onerror = done;
    window.setTimeout(done, 4000);
  });

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;
const LEGACY_PAD_ID = "pad-legacy-audio";

type DirectoryPermission = "granted" | "denied" | "prompt";
type AudioFileEntry = { kind: "file"; name: string; getFile: () => Promise<File> };
type AudioDirectoryHandle = {
  name: string;
  values: () => AsyncIterable<AudioFileEntry>;
  queryPermission?: (options: { mode: "read" }) => Promise<DirectoryPermission>;
  requestPermission?: (options: { mode: "read" }) => Promise<DirectoryPermission>;
};
type FileSystemWindow = Window & { showDirectoryPicker?: () => Promise<AudioDirectoryHandle> };

const safeId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "audio";

async function soundFromFile(file: File, id: string): Promise<Sound> {
  let fileUrl: string;
  let ephemeral = false;
  if (file.size < 2_000_000) {
    fileUrl = await readAsDataURL(file);
  } else {
    fileUrl = URL.createObjectURL(file);
    ephemeral = true;
  }
  const duration = await probeDuration(fileUrl);
  return {
    id,
    name: file.name.replace(/\.[^.]+$/, ""),
    icon: "note",
    categoryId: "musica",
    type: duration > 20 ? "Música" : "SFX",
    synth: "file:" + id,
    duration,
    loop: duration > 20,
    volume: 70,
    fadeIn: 300,
    fadeOut: 500,
    ephemeral,
    fileUrl,
    createdAt: Date.now(),
  };
}

export function UploadsView() {
  const app = useApp();
  const { data, layers } = app;
  const inputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [savedDirectory, setSavedDirectory] = useState<AudioDirectoryHandle | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState<"google-tts" | "eleven-sfx" | "stable-audio">("google-tts");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("pollinations_api_key") ?? "");
  const [generating, setGenerating] = useState(false);
  const [webUrl, setWebUrl] = useState("");

  const uploads = Object.values(data.sounds)
    .filter((s) => s.synth.startsWith("file:"))
    .sort((a, b) => b.createdAt - a.createdAt);

  const ingest = async (files: FileList | File[], prefix = "upl") => {
    const list = Array.from(files).filter((f) => f.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(f.name));
    if (list.length === 0) {
      app.toast("Nenhum arquivo de áudio reconhecido", "err");
      return;
    }
    setBusy(true);
    for (const [index, file] of list.entries()) {
      const id = `${prefix}-${Date.now()}-${index}-${safeId(file.name)}`;
      app.addSound(await soundFromFile(file, id), prefix === "dir" ? LEGACY_PAD_ID : undefined);
    }
    setBusy(false);
    app.toast(`${list.length} áudio(s) adicionado(s) à sua biblioteca`);
  };

  const loadDirectory = async (directory: AudioDirectoryHandle) => {
    setDirectoryBusy(true);
    let imported = 0;
    try {
      for await (const entry of directory.values()) {
        if (entry.kind !== "file" || !AUDIO_EXTENSIONS.test(entry.name)) continue;
        const file = await entry.getFile();
        const id = `dir-${safeId(`${directory.name}-${entry.name}`)}`;
        const sound = await soundFromFile(file, id);
        app.addSound(sound, LEGACY_PAD_ID);
        imported += 1;
      }
      if (imported > 0) app.toast(`${imported} áudio(s) da pasta legada restaurado(s)`);
      else app.toast("A pasta não contém áudios reconhecidos", "warn");
    } catch {
      app.toast("Não foi possível ler a pasta de áudio", "err");
    } finally {
      setDirectoryBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const directory = await get<AudioDirectoryHandle>("dozero_audio_dir");
        if (!active || !directory) return;
        const permission = await directory.queryPermission?.({ mode: "read" });
        if (permission === "granted") await loadDirectory(directory);
        else if (active) {
          setSavedDirectory(directory);
          setNeedsPermission(true);
        }
      } catch {
        /* IndexedDB or File System Access is unavailable in this browser. */
      }
    })();
    return () => { active = false; };
    // The provider identity is stable for the lifetime of this view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadFolder = async () => {
    const picker = (window as FileSystemWindow).showDirectoryPicker;
    if (picker) {
      try {
        const directory = await picker();
        await set("dozero_audio_dir", directory);
        setSavedDirectory(directory);
        setNeedsPermission(false);
        await loadDirectory(directory);
      } catch {
        /* User cancelled the picker. */
      }
      return;
    }
    directoryInputRef.current?.click();
  };

  const restoreFolder = async () => {
    if (!savedDirectory) return;
    try {
      const permission = await savedDirectory.requestPermission?.({ mode: "read" });
      if (permission === "granted") {
        setNeedsPermission(false);
        await loadDirectory(savedDirectory);
      }
    } catch {
      app.toast("Permissão da pasta não concedida", "warn");
    }
  };

  const handleGenerateAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setGenerating(true);
    try {
      if (apiKey) localStorage.setItem("pollinations_api_key", apiKey);
      const query = encodeURIComponent(prompt);
      const url = aiModel === "google-tts"
        ? `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt&client=tw-ob&q=${query}`
        : `https://gen.pollinations.ai/audio/${query}?model=${aiModel}${apiKey ? `&key=${encodeURIComponent(apiKey)}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro ${response.status} ao gerar áudio`);
      const objectUrl = URL.createObjectURL(await response.blob());
      const id = `ai-${Date.now()}`;
      app.addSound({
        id,
        name: `[IA] ${prompt.slice(0, 32)}`,
        icon: aiModel === "google-tts" ? "mic" : "sparkle",
        categoryId: aiModel === "google-tts" ? "musica" : "horror",
        type: aiModel === "google-tts" ? "SFX" : "Ambiente",
        synth: `file:${id}`,
        duration: 0,
        loop: aiModel !== "google-tts",
        volume: 70,
        fadeIn: 250,
        fadeOut: 500,
        ephemeral: true,
        fileUrl: objectUrl,
        createdAt: Date.now(),
      }, LEGACY_PAD_ID);
      setAiPrompt("");
      app.toast("Áudio gerado e adicionado à Biblioteca DOZERO");
    } catch (error) {
      app.toast(error instanceof Error ? error.message : "Não foi possível gerar o áudio", "err");
    } finally {
      setGenerating(false);
    }
  };

  const broadcast = (url: string, isPlaying: boolean) => {
    const trimmed = url.trim();
    if (isPlaying) {
      try {
        const parsed = new URL(trimmed);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      } catch {
        app.toast("Informe um link HTTP/HTTPS válido", "err");
        return;
      }
    }
    window.dispatchEvent(new CustomEvent("dozero-soundboard-broadcast", {
      detail: { url: trimmed, isPlaying, ts: Date.now() },
    }));
    app.toast(isPlaying ? "Faixa transmitida para a mesa" : "Transmissão pausada");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="fade-up flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center border border-moss-500/50 bg-moss-500/10 text-moss-300 chamfer">
            <Icon name="mic" size={28} sw={1.5} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog-dim">biblioteca pessoal de uploads</p>
            <h1 className="font-display text-2xl font-bold tracking-wide text-parch md:text-3xl">Meus Áudios</h1>
          </div>
          <span className="ml-2 border border-line bg-ink-800 px-2 py-1 font-mono text-[11px] text-fog">{uploads.length}</span>
        </div>
      </div>

      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-5 flex cursor-pointer flex-col items-center gap-2.5 border-2 border-dashed px-6 py-9 text-center transition-all chamfer ${
          dragging ? "border-moss-400 bg-moss-500/10 scale-[1.005]" : "border-line bg-ink-850/60 hover:border-moss-600/60 hover:bg-ink-800/60"
        }`}
      >
        <span className={`transition-transform ${dragging ? "scale-110 text-moss-300" : "text-fog-dim"}`}>
          <Icon name="upload" size={34} sw={1.3} />
        </span>
        <p className="text-sm font-semibold text-parch">
          {busy ? "Decodificando áudios…" : dragging ? "Solte para importar" : "Arraste arquivos de áudio ou clique aqui"}
        </p>
        <p className="max-w-md text-[11.5px] leading-relaxed text-fog-dim">
          MP3, WAV, OGG, M4A… arquivos até 2&nbsp;MB ficam salvos no navegador; maiores valem só para esta sessão.
          Uploads aparecem na biblioteca e podem entrar em <span className="text-arc-300">Cenas</span>.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="border border-gold-400/25 bg-gold-400/5 p-3 chamfer-sm">
          <div className="flex items-center gap-2 text-gold-300">
            <Icon name="folder" size={16} />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Biblioteca legada</p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-fog-dim">
            Reabra a pasta usada pelo soundboard antigo. Os arquivos entram na Biblioteca DOZERO e ficam disponíveis nas cenas.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void handleLoadFolder()}
              disabled={directoryBusy}
              className="flex items-center gap-1.5 border border-gold-400/40 bg-gold-400/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-gold-300 transition-colors hover:bg-gold-400/20 disabled:opacity-50 chamfer-sm"
            >
              <Icon name="folder" size={12} /> {directoryBusy ? "lendo…" : "importar pasta"}
            </button>
            {needsPermission && (
              <button
                type="button"
                onClick={() => void restoreFolder()}
                className="border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fog transition-colors hover:text-parch chamfer-sm"
              >
                restaurar acesso
              </button>
            )}
          </div>
          <input
            ref={(node) => {
              directoryInputRef.current = node;
              node?.setAttribute("webkitdirectory", "");
              node?.setAttribute("directory", "");
            }}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void ingest(e.target.files, "dir");
              e.target.value = "";
            }}
          />
        </div>

        <div className="border border-arc-400/25 bg-arc-500/5 p-3 chamfer-sm">
          <div className="flex items-center gap-2 text-arc-300">
            <Icon name="sparkle" size={16} />
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Áudio por IA</p>
          </div>
          <div className="mt-2 grid gap-1.5">
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleGenerateAI()}
              placeholder="Ex.: sino distante em uma cripta…"
              className="border border-line bg-ink-900/80 px-2.5 py-1.5 text-xs text-parch outline-none placeholder:text-fog-dim focus:border-arc-400/60"
            />
            <div className="flex gap-1.5">
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value as typeof aiModel)}
                className="min-w-0 flex-1 border border-line bg-ink-900 px-2 py-1.5 font-mono text-[10px] text-fog outline-none"
                aria-label="Modelo de áudio por IA"
              >
                <option value="google-tts">narração / TTS</option>
                <option value="eleven-sfx">efeito sonoro</option>
                <option value="stable-audio">ambiente musical</option>
              </select>
              <button
                type="button"
                onClick={() => void handleGenerateAI()}
                disabled={generating || !aiPrompt.trim()}
                className="flex items-center gap-1 border border-arc-400/40 bg-arc-500/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-arc-300 transition-colors hover:bg-arc-500/20 disabled:opacity-50 chamfer-sm"
              >
                <Icon name="sparkle" size={12} /> {generating ? "gerando…" : "gerar"}
              </button>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="chave Pollinations (opcional)"
              className="border border-line bg-ink-900/80 px-2.5 py-1.5 font-mono text-[10px] text-fog outline-none placeholder:text-fog-dim focus:border-arc-400/60"
              aria-label="Chave opcional da API Pollinations"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 border border-moss-500/25 bg-moss-500/5 p-3 chamfer-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="link" size={16} className="text-moss-300" />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-moss-300">Transmitir para a mesa</p>
          <span className="text-[10px] text-fog-dim">YouTube ou MP3 direto</span>
        </div>
        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
          <input
            value={webUrl}
            onChange={(e) => setWebUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && broadcast(webUrl, true)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="min-w-0 flex-1 border border-line bg-ink-900/80 px-2.5 py-1.5 text-xs text-parch outline-none placeholder:text-fog-dim focus:border-moss-400/60"
            aria-label="URL de música ou vídeo para transmitir"
          />
          <button
            type="button"
            onClick={() => broadcast(webUrl, true)}
            className="flex items-center justify-center gap-1.5 border border-moss-400/40 bg-moss-500/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-moss-300 transition-colors hover:bg-moss-500/20 chamfer-sm"
          >
            <Icon name="play" size={12} /> transmitir
          </button>
          <button
            type="button"
            onClick={() => broadcast(webUrl, false)}
            className="flex items-center justify-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fog transition-colors hover:text-parch chamfer-sm"
          >
            <Icon name="pause" size={12} /> pausar
          </button>
          <button
            type="button"
            onClick={() => { broadcast("", false); setWebUrl(""); }}
            className="flex items-center justify-center gap-1.5 border border-blood-400/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-blood-400 transition-colors hover:bg-blood-500/10 chamfer-sm"
          >
            <Icon name="stop" size={12} /> parar
          </button>
        </div>
      </div>

      {/* lista */}
      <div className="mt-5 flex-1 overflow-y-auto pb-8 pr-1">
        {uploads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="floaty text-fog-dim"><Icon name="note" size={44} sw={1} /></span>
            <p className="text-sm text-fog-dim">Sua biblioteca pessoal está vazia — traga suas trilhas e efeitos.</p>
          </div>
        ) : (
          <ul className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {uploads.map((s, i) => {
              const playing = layers.some((l) => l.soundId === s.id);
              const cat = data.categories.find((c) => c.id === s.categoryId);
              const broken = !s.fileUrl;
              return (
                <li
                  key={s.id}
                  className={`reveal flex items-center gap-3 border bg-ink-800/90 p-3 transition-all chamfer-sm ${
                    playing ? "border-moss-500/50" : "border-line hover:border-line hover:bg-ink-700/80"
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <button
                    onClick={() => app.toggleSound(s.id)}
                    disabled={broken}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-all active:scale-95 chamfer-sm disabled:opacity-40 ${
                      playing ? "border-moss-400/70 bg-moss-500/15 text-moss-300" : "border-line bg-ink-900 text-fog hover:text-moss-300"
                    }`}
                    aria-label={playing ? `Parar ${s.name}` : `Tocar ${s.name}`}
                  >
                    <Icon name={playing ? "stop" : "play"} size={17} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-parch">{s.name}</p>
                    <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-wider text-fog-dim">
                      <span>{s.duration ? `${s.duration.toFixed(1)}s` : "—"}</span>
                      <span>·</span>
                      <span style={{ color: cat?.color }}>{cat?.name}</span>
                      {s.ephemeral && (
                        <>
                          <span>·</span>
                          <span className="text-gold-300">só esta sessão</span>
                        </>
                      )}
                      {broken && (
                        <>
                          <span>·</span>
                          <span className="text-blood-400">expirado</span>
                        </>
                      )}
                    </p>
                    {playing && (
                      <span className="eq mt-1 text-moss-400"><i /><i /><i /></span>
                    )}
                  </div>
                  <button
                    onClick={() => app.toggleFavorite(s.id)}
                    className={`p-1.5 transition-all hover:scale-110 ${
                      data.favorites.includes(s.id) ? "text-blood-400" : "text-fog-dim hover:text-blood-400"
                    }`}
                    aria-label="Favoritar"
                  >
                    <Icon name={data.favorites.includes(s.id) ? "heartFill" : "heart"} size={15} />
                  </button>
                  <button
                    onClick={() => {
                      app.deleteSound(s.id);
                      app.toast(`"${s.name}" removido`, "warn");
                    }}
                    className="p-1.5 text-fog-dim transition-all hover:scale-110 hover:text-blood-400"
                    aria-label="Excluir"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
