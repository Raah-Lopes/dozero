import { RefObject, useEffect } from "react";

export const CLS_INPUT =
  "w-full rounded-md border border-linha bg-tinta px-3 py-2 text-sm text-papel placeholder:text-papel3 outline-none transition focus:border-ambar/70 focus:ring-2 focus:ring-ambar/20";

export const CLS_ROTULO =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-papel3";

export const CLS_BOTAO_AMBAR =
  "inline-flex items-center justify-center gap-2 rounded-md bg-ambar px-4 py-2 text-sm font-bold text-[#241a06] shadow-[0_2px_14px_rgba(217,164,65,0.25)] transition hover:bg-[#e8b654] hover:shadow-[0_2px_22px_rgba(217,164,65,0.4)] active:scale-[0.98]";

export const CLS_BOTAO_FANTASMA =
  "inline-flex items-center justify-center gap-2 rounded-md border border-linha bg-tinta3 px-3 py-2 text-sm font-medium text-papel2 transition hover:border-linha2 hover:text-papel active:scale-[0.98]";

export function useForaClique(
  ref: RefObject<HTMLElement | null>,
  ativo: boolean,
  aoFechar: () => void
) {
  useEffect(() => {
    if (!ativo) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) aoFechar();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ativo, aoFechar, ref]);
}

export function PontoCor({ cor, tam = 8 }: { cor: string; tam?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: tam, height: tam, background: cor, boxShadow: `0 0 8px ${cor}66` }}
    />
  );
}

export function ChipEtiqueta({
  etiqueta,
  ativo = false,
  aoClicar,
  aoRemover,
}: {
  etiqueta: string;
  ativo?: boolean;
  aoClicar?: () => void;
  aoRemover?: () => void;
}) {
  return (
    <button
      onClick={aoClicar}
      className={`group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
        ativo
          ? "border-ambar/70 bg-ambar/15 text-ambar"
          : "border-linha bg-tinta3 text-papel2 hover:border-linha2 hover:text-papel"
      }`}
    >
      <span className="text-ambar/80">#</span>
      {etiqueta}
      {aoRemover && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            aoRemover();
          }}
          className="ml-0.5 text-papel3 transition hover:text-brasa"
        >
          ×
        </span>
      )}
    </button>
  );
}
