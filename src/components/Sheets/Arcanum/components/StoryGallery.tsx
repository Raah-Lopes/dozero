import { useCallback, useEffect, useRef, useState } from "react";
import type { Character, GalleryImg } from "../lib";
import { readFileAsDataURL, uid } from "../lib";
import { ChevronL, ChevronR, Close, FrameGallery, OpenBook, Quill, Trash, Upload } from "../icons";
import { Section } from "./ui";

/* ---------------- história + anotações ---------------- */

export function StorySection({
  c,
  set,
}: {
  c: Character;
  set: (patch: Partial<Character>) => void;
}) {
  const words = c.story.trim() ? c.story.trim().split(/\s+/).length : 0;
  return (
    <Section
      id="historia"
      icon={<OpenBook size={19} />}
      kicker="De onde veio e o que procura"
      title="História do Personagem"
      accent="#eec777"
      actions={
        <span className="text-[12px] font-bold uppercase tracking-widest text-dim">
          {words} {words === 1 ? "palavra" : "palavras"}
        </span>
      }
    >
      <textarea
        value={c.story}
        onChange={(e) => set({ story: e.target.value })}
        rows={10}
        placeholder="Era uma noite de tempestade quando…"
        className="field min-h-56 resize-y font-tale !text-[16px] !leading-relaxed !text-parch-200"
      />
      <p className="mt-2 flex items-center gap-1.5 text-[12px] italic text-dim">
        <Quill size={13} className="text-gold-500" />
        Escreva em prosa — esta página pertence ao passado do seu personagem.
      </p>
    </Section>
  );
}

export function NotesSection({
  c,
  set,
}: {
  c: Character;
  set: (patch: Partial<Character>) => void;
}) {
  return (
    <Section
      id="anotacoes"
      icon={<Quill size={19} />}
      kicker="Rabiscos de sessão, dívidas e pistas"
      title="Anotações da Mesa"
      accent="#a9c0e2"
    >
      <textarea
        value={c.notes}
        onChange={(e) => set({ notes: e.target.value })}
        rows={6}
        placeholder="• NPCs importantes&#10;• Missões pendentes&#10;• Segredos que o mestre ainda não revelou…"
        className="field min-h-36 resize-y font-body !text-[15px] !leading-relaxed"
      />
    </Section>
  );
}

/* ---------------- galeria ---------------- */

export function GallerySection({
  c,
  set,
  notify,
}: {
  c: Character;
  set: (patch: Partial<Character>) => void;
  notify: (t: string, tone?: "gold" | "ember" | "jade") => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imgs: GalleryImg[] = [];
    for (const f of Array.from(files).slice(0, 12)) {
      if (!f.type.startsWith("image/")) continue;
      imgs.push({ id: uid(), src: await readFileAsDataURL(f) });
    }
    if (imgs.length) {
      set({ gallery: [...c.gallery, ...imgs] });
      notify(`${imgs.length} ${imgs.length === 1 ? "imagem pendurada" : "imagens penduradas"} na galeria`, "jade");
    }
  };

  const remove = (id: string) => {
    set({ gallery: c.gallery.filter((g) => g.id !== id) });
    setLightbox(null);
  };

  const nav = useCallback(
    (dir: 1 | -1) => {
      setLightbox((cur) => {
        if (cur === null || c.gallery.length === 0) return cur;
        return (cur + dir + c.gallery.length) % c.gallery.length;
      });
    },
    [c.gallery.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") nav(1);
      if (e.key === "ArrowLeft") nav(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, nav]);

  return (
    <Section
      id="galeria"
      icon={<FrameGallery size={19} />}
      kicker="Retratos, mapas e lembranças"
      title="Galeria de Imagens"
      accent="#e0b054"
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="no-print inline-flex items-center gap-1.5 rounded-md border border-gold-600/50 bg-gold-900/30 px-3 py-1.5 text-sm font-bold text-gold-200 transition-all hover:border-gold-400 hover:bg-gold-900/60 hover:shadow-[0_0_16px_rgba(205,151,60,0.25)] active:scale-95"
          >
            <Upload size={14} /> Adicionar imagens
          </button>
        </>
      }
    >
      {c.gallery.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="no-print grid w-full place-items-center rounded-md border-2 border-dashed border-line-soft p-10 text-center transition-all hover:border-gold-600/60 hover:bg-gold-900/10"
        >
          <FrameGallery size={34} className="mb-2 text-dim" />
          <span className="font-tale italic text-fog">Pendure aqui mapas, retratos e cenas marcantes da campanha.</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {c.gallery.map((g, idx) => (
            <figure
              key={g.id}
              className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-md border border-line-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold-600/60 hover:shadow-[0_14px_34px_rgba(0,0,0,0.5),0_0_20px_rgba(205,151,60,0.14)]"
              onClick={() => setLightbox(idx)}
            >
              <img
                src={g.src}
                alt={`Imagem ${idx + 1} da galeria`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-ink-950/95 via-ink-950/60 to-transparent px-3 pb-2 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
                  Nº {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(g.id);
                  }}
                  aria-label="Remover imagem"
                  className="no-print grid h-7 w-7 place-items-center rounded border border-ember-400/50 bg-ink-900/80 text-ember-300 transition-all hover:bg-ember-900 active:scale-90"
                >
                  <Trash size={13} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* lightbox */}
      {lightbox !== null && c.gallery[lightbox] && (
        <div
          className="no-print fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/95 p-4 sm:p-10"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="dice-pop relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={c.gallery[lightbox].src}
              alt="Imagem ampliada"
              className="max-h-[82vh] w-auto max-w-full rounded-md border-2 border-gold-600/50 object-contain shadow-[0_0_60px_rgba(205,151,60,0.15),0_30px_80px_rgba(0,0,0,0.8)]"
            />
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-ink-900/95 px-4 py-2 shadow-xl">
              <button type="button" onClick={() => nav(-1)} aria-label="Anterior" className="text-fog transition-colors hover:text-gold-300 active:scale-90">
                <ChevronL size={17} />
              </button>
              <span className="font-display text-xs font-bold tracking-[0.2em] text-gold-300">
                {lightbox + 1} / {c.gallery.length}
              </span>
              <button type="button" onClick={() => nav(1)} aria-label="Próxima" className="text-fog transition-colors hover:text-gold-300 active:scale-90">
                <ChevronR size={17} />
              </button>
              <span className="h-4 w-px bg-line-soft" />
              <button
                type="button"
                onClick={() => remove(c.gallery[lightbox].id)}
                className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-ember-300 transition-colors hover:text-ember-400"
              >
                <Trash size={13} /> Remover
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Fechar"
              className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-line bg-ink-900 text-fog shadow-lg transition-all hover:border-gold-500 hover:text-gold-300 active:scale-90"
            >
              <Close size={16} />
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
