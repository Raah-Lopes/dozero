import { RefObject, useEffect } from "react";

export const CLS_INPUT =
  "w-full rounded-md border border-[#3b3222] bg-[#15120e] px-3 py-2 text-sm text-[#ede4d0] placeholder:text-[#7f7660] outline-none transition focus:border-[#d9a441] focus:ring-1 focus:ring-[#d9a441]/30";

export const CLS_ROTULO =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#7f7660]";

export const CLS_BOTAO_AMBAR =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[#d9a441] px-4 py-2 text-sm font-bold text-[#241a06] shadow-[0_2px_14px_rgba(217,164,65,0.25)] transition hover:bg-[#e8b654] hover:shadow-[0_2px_22px_rgba(217,164,65,0.4)] active:scale-[0.98]";

export const CLS_BOTAO_FANTASMA =
  "inline-flex items-center justify-center gap-2 rounded-md border border-[#3b3222] bg-[#272117] px-3 py-2 text-sm font-medium text-[#b3a78c] transition hover:border-[#4f4329] hover:text-[#ede4d0] active:scale-[0.98]";

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
          ? "border-[#d9a441]/70 bg-[#d9a441]/15 text-[#d9a441]"
          : "border-[#3b3222] bg-[#272117] text-[#b3a78c] hover:border-[#4f4329] hover:text-[#ede4d0]"
      }`}
    >
      <span className="text-[#d9a441]/80">#</span>
      {etiqueta}
      {aoRemover && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation();
            aoRemover();
          }}
          className="ml-0.5 text-[#7f7660] transition hover:text-[#e07b4f]"
        >
          ×
        </span>
      )}
    </button>
  );
}
