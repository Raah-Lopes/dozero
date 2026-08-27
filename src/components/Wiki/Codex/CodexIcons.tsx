import { ReactNode } from "react";

/* Todos os ícones do Arcanum desenhados à mão em SVG (traço 1.8, 24×24) */

const TRACOS: Record<string, ReactNode> = {
  espada: (
    <>
      <path d="M4.5 19.5 15 9" />
      <path d="M14 4l6 6-2.2 2.2-6-6L14 4Z" />
      <path d="M7 13.5 10.5 17" />
      <path d="M4.5 19.5 6 18" />
    </>
  ),
  mapa: (
    <>
      <path d="M9 4.5 3.5 6.4v13.1L9 17.6l6 1.9 5.5-1.9V4.5L15 6.4 9 4.5Z" />
      <path d="M9 4.5v13.1M15 6.4v13.1" />
    </>
  ),
  ampulheta: (
    <>
      <path d="M7 3.5h10M7 20.5h10" />
      <path d="M8.5 3.5v1.6c0 3.2 7 4.3 7 6.9s-7 3.7-7 6.9v1.6" />
      <path d="M15.5 3.5v1.6c0 3.2-7 4.3-7 6.9s7 3.7 7 6.9v1.6" />
    </>
  ),
  cerebro: (
    <>
      <path d="M9.5 4a3.5 3.5 0 0 0-3.5 3.5c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 4 12a3.5 3.5 0 0 0 2 3.1 3.5 3.5 0 0 0 4 3.9h2V4H9.5Z" />
      <path d="M14.5 4a3.5 3.5 0 0 1 3.5 3.5c0 .5-.1 1-.3 1.4A3.5 3.5 0 0 1 20 12a3.5 3.5 0 0 1-2 3.1 3.5 3.5 0 0 1-4 3.9h-2V4h2.5Z" />
      <path d="M12 4v15M8 9h4M12 14H8M12 9h4M16 14h-4" />
    </>
  ),
  gema: (
    <>
      <path d="M6.5 4h11l3 5-8.5 11L3.5 9l3-5Z" />
      <path d="M3.5 9h17M12 20 8.8 9l3.2-5 3.2 5L12 20" />
    </>
  ),
  pata: (
    <path
      fill="currentColor"
      stroke="none"
      d="M7.2 5.4c1.2 0 2.1 1.2 2.1 2.7S8.4 10.9 7.2 10.9 5.1 9.6 5.1 8.1 6 5.4 7.2 5.4Zm4.8-1.4c1.2 0 2.2 1.2 2.2 2.7s-1 2.7-2.2 2.7-2.2-1.2-2.2-2.7S10.8 4 12 4Zm4.9 1.6c1.2 0 2.1 1.1 2.1 2.6s-.9 2.7-2.1 2.7-2.1-1.2-2.1-2.7.9-2.6 2.1-2.6ZM12 12.3c-3.1 0-5.8 2.6-5.8 5.2 0 1.7 1.3 2.8 2.9 2.8 1 0 1.9-.6 2.9-.6s1.9.6 2.9.6c1.6 0 2.9-1.1 2.9-2.8 0-2.6-2.7-5.2-5.8-5.2ZM20 10.9c1 0 1.9.9 1.9 2.1 0 1.5-1.2 3-2.5 2.7-1.2-.3-1.9-1.5-1.6-2.9.3-1.2 1.2-1.9 2.2-1.9ZM4 10.9c1 0 1.9.7 2.2 1.9.3 1.4-.4 2.6-1.6 2.9-1.3.3-2.5-1.2-2.5-2.7 0-1.2.9-2.1 1.9-2.1Z"
    />
  ),
  olho: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.8 3.4 7.9 7 9.8 3.6-1.9 7-5 7-9.8V5.8L12 3Z" />
      <path d="M12 8v5.5M9.2 10.8h5.6" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M3.2 20c.4-3.4 2.7-5.6 5.8-5.6s5.4 2.2 5.8 5.6" />
      <path d="M15.2 5.4a3.2 3.2 0 0 1 0 5.7M17.4 14.6c2.1.7 3.2 2.6 3.5 5.4" />
    </>
  ),
  livro: (
    <>
      <path d="M4.5 19.5A2.5 2.5 0 0 1 7 17h12.5V3.5H7A2.5 2.5 0 0 0 4.5 6v13.5Z" />
      <path d="M4.5 19.5A2.5 2.5 0 0 0 7 22h12.5v-5" />
      <path d="M9 8h7M9 11.5h5" />
    </>
  ),
  trilha: (
    <>
      <path d="M5 20.5c8.5 0-8-6.5 1.5-9.5 7.5-2.4-3-6.5 3-10" />
      <circle cx="5" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="3.2" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  faiscas: (
    <>
      <path d="M11 2.5l1.6 5.4 5.4 1.6-5.4 1.6L11 16.5l-1.6-5.4L4 9.5l5.4-1.6L11 2.5Z" />
      <path d="M18.5 14.5l.8 2.7 2.7.8-2.7.8-.8 2.7-.8-2.7-2.7-.8 2.7-.8.8-2.7Z" />
    </>
  ),
  raio: <path d="M13 2.5 4.5 13.5H10l-1 8 8.5-11H12l1-8Z" />,
  coroa: (
    <>
      <path d="M4 18.5h16M4.5 16 3.5 7l5 3.5L12 5l3.5 5.5 5-3.5-1 9" />
    </>
  ),
  caveira: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 2.9 1.5 4.9 3 6v3.5h10V17c1.5-1.1 3-3.1 3-6a8 8 0 0 0-8-8Z" />
      <circle cx="9" cy="11" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1.7" fill="currentColor" stroke="none" />
      <path d="M10.5 20.5v-2M13.5 20.5v-2" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  busca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20.5 20.5 16 16" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lixo: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13.5h9l1-13.5" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  pasta: (
    <path d="M3 7a2 2 0 0 1 2-2h4.2l2 2.3H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  ),
  baixar: <path d="M12 3.5v11M7.5 10l4.5 4.5L16.5 10M4 19.5h16" />,
  estrela: (
    <path d="M12 3.2 14.6 8.5l5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.9L12 3.2Z" />
  ),
  lista: (
    <>
      <path d="M8.5 6.5H21M8.5 12H21M8.5 17.5H21" />
      <circle cx="4.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  grade: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  grafo: (
    <>
      <circle cx="5.5" cy="6" r="2.4" />
      <circle cx="18.5" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M7.9 6h8.2M6.7 8.1l4.1 7.6M17.3 8.1l-4.1 7.6" />
    </>
  ),
  stats: (
    <>
      <path d="M4.5 20v-7M10.5 20V5M16.5 20v-10M2.5 20h19" />
    </>
  ),
  coracao: (
    <path d="M12 20.2s-7.1-4.7-9-9C1.7 8 3.8 4.6 7 4.6c2 0 3.4 1.2 5 3.4 1.6-2.2 3-3.4 5-3.4 3.2 0 5.3 3.4 4 6.6-1.9 4.3-9 9-9 9Z" />
  ),
  setaDir: <path d="M5 12h13.5M13.5 6.5 19 12l-5.5 5.5" />,
  setaEsq: <path d="M19 12H5.5M10.5 6.5 5 12l5.5 5.5" />,
  setaBaixo: <path d="M12 5v13.5M6.5 13.5 12 19l5.5-5.5" />,
  troca: <path d="M4 7.5h13.5L14.5 4.5M20 16.5H6.5l3 3" />,
  img: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 15.5l-4.5-4.5-8 8" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.2 4.2 0 0 0 6.3.4l2.6-2.6a4.2 4.2 0 0 0-5.9-5.9l-1.4 1.4" />
      <path d="M14 10a4.2 4.2 0 0 0-6.3-.4l-2.6 2.6a4.2 4.2 0 0 0 5.9 5.9l1.4-1.4" />
    </>
  ),
  pincel: (
    <>
      <path d="M4 20c0-2.8 1.7-4 3.8-4L16 7.8l4 4-8.2 8.2c0 2.1-1.2 3.8-4 3.8H4Z" />
      <path d="M14 6l4 4" />
    </>
  ),
  check: <path d="M5 13l4.2 4.2L19.5 7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5h.01M12 11v5.5" />
    </>
  ),
  etiqueta: (
    <>
      <path d="M3.5 11.5v-8h8l9 9-8 8-9-9Z" />
      <circle cx="7.8" cy="7.8" r="1.3" />
    </>
  ),
  voltar: <path d="M14.5 6l-6 6 6 6" />,
  funil: <path d="M3.5 5h17l-6.5 7.5v6L10 16.5v-4L3.5 5Z" />,
  caldeirao: (
    <>
      <path d="M4.5 9.5h15" />
      <path d="M5.5 9.5c-.5 6 1.5 9.5 6.5 9.5s7-3.5 6.5-9.5" />
      <path d="M7 19.5l-1.2 1.8M17 19.5l1.2 1.8" />
      <path d="M10 6.5c.4-1 1.2-1.6 2-2M13.5 5c.3-.7.8-1.2 1.4-1.5" />
    </>
  ),
  pergaminho: (
    <>
      <path d="M7 4h11.5a1.8 1.8 0 0 1 0 3.6H17" />
      <path d="M7 4a2 2 0 0 0-2 2v12.5A1.8 1.8 0 0 0 6.8 20H17" />
      <path d="M17 7.6V17a3 3 0 0 0 3-3V6.5" />
      <path d="M9 10.5h5.5M9 13.5h5.5" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  bussola: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5 5-2.2Z" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  arvore: (
    <>
      <path d="M12 22v-6M12 16a6 6 0 0 1-6-6c0-3.3 2.7-6 6-6s6 2.7 6 6a6 6 0 0 1-6 6Z" />
      <path d="M8 12c-2 0-3.5-1.5-3.5-3.5 0-1.8 1.4-3.3 3.2-3.5" />
      <path d="M16 12c2 0 3.5-1.5 3.5-3.5 0-1.8-1.4-3.3-3.2-3.5" />
    </>
  ),
  editar: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  olhoFechado: (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  compartilhar: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
};

export function Icone({
  nome,
  tam = 18,
  className = "",
  preenchido = false,
}: {
  nome: string;
  tam?: number;
  className?: string;
  preenchido?: boolean;
}) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill={preenchido ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRACOS[nome] ?? TRACOS.faiscas}
    </svg>
  );
}

export function SeloTipo({
  nome,
  cor,
  icone,
  pequeno = false,
}: {
  nome: string;
  cor: string;
  icone: string;
  pequeno?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-bold uppercase tracking-wider ${
        pequeno ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
      }`}
      style={{ background: cor, color: "#1c1509" }}
    >
      <Icone nome={icone} tam={pequeno ? 10 : 12} />
      {nome}
    </span>
  );
}
