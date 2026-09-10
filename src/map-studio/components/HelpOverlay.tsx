import React, { useEffect } from "react";
import { X, Keyboard, Compass } from "lucide-react";

interface HelpOverlayProps {
  visible: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  items: { key: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navegação",
    items: [
      { key: "V", description: "Ferramenta de seleção" },
      { key: "H", description: "Mover mapa (Pan)" },
      { key: "+ / −", description: "Aumentar / Diminuir zoom" },
      { key: "F1", description: "Abrir / Fechar esta ajuda" },
      { key: "Esc", description: "Fechar diálogos e detalhes" },
    ],
  },
  {
    title: "Locais & Símbolos",
    items: [
      { key: "L", description: "Adicionar novo ponto/local" },
      { key: "Clique duplo", description: "Abrir detalhes do local" },
    ],
  },
  {
    title: "Desenho & Formas",
    items: [
      { key: "D", description: "Desenho livre com lápis" },
      { key: "N", description: "Adicionar linha reta" },
      { key: "A", description: "Adicionar seta de direção" },
      { key: "R", description: "Adicionar retângulo" },
      { key: "C", description: "Adicionar círculo" },
      { key: "T", description: "Adicionar rótulo de texto" },
    ],
  },
  {
    title: "Histórico & Edição",
    items: [
      { key: "Ctrl + Z", description: "Desfazer última alteração" },
      { key: "Ctrl + Shift + Z / Ctrl + Y", description: "Refazer alteração" },
      { key: "Del / Backspace", description: "Excluir elemento selecionado" },
    ],
  },
];

export default function HelpOverlay({ visible, onClose }: HelpOverlayProps) {
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border shadow-2xl p-6"
        style={{
          background: "var(--dz-graphite)",
          borderColor: "var(--dz-stone)",
          color: "var(--dz-parchment)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: "var(--dz-stone)" }}>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" />
            <h2 id="help-modal-title" className="text-lg font-semibold tracking-wide text-amber-200">
              Guia de Atalhos & Navegação (F1)
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar ajuda"
            className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800 transition-colors focus-visible:ring"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shortcutGroups.map((group) => (
            <div
              key={group.title}
              className="p-3 rounded border"
              style={{
                background: "var(--dz-graphite-2)",
                borderColor: "rgba(120, 95, 65, 0.3)",
              }}
            >
              <div className="flex items-center gap-1.5 font-medium text-amber-300 text-sm mb-2.5 pb-1 border-b border-stone-800">
                <Keyboard size={15} />
                <span>{group.title}</span>
              </div>
              <ul className="space-y-2 text-xs">
                {group.items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-stone-300">{item.description}</span>
                    <kbd className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-200 font-mono text-[11px] shadow-sm whitespace-nowrap">
                      {item.key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-stone-400" style={{ borderColor: "var(--dz-stone)" }}>
          <span>Dica: Pressione <kbd className="px-1.5 py-0.5 bg-stone-900 border border-stone-700 rounded text-amber-300 font-mono text-[10px]">F1</kbd> a qualquer momento para abrir ou fechar esta janela.</span>
          <button
            onClick={onClose}
            className="dz-button px-4 py-1.5 text-xs text-amber-200"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
