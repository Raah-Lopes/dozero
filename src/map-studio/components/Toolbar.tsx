import { MapProject, Tool } from "../types";
import { useRef, useState } from "react";
import { importMapImage } from "../utils/importImage";
import {
  MousePointer2,
  Hand,
  MapPin,
  Type,
  Pencil,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Grid3x3,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
} from "lucide-react";
import { LucideIcons } from "../icons/LucideIcons";

interface ToolbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  project: MapProject;
  onUpdateProject: (id: string, updates: Partial<MapProject>) => void;
  onOpenHelp?: () => void;
}

export default function Toolbar({
  sidebarCollapsed,
  onToggleSidebar,
  activeTool,
  onToolChange,
  project,
  onUpdateProject,
  onOpenHelp,
}: ToolbarProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);

  const categories: {
    name: string;
    tools: {
      id: Tool;
      label: string;
      icon: React.ReactNode;
      hint: string;
    }[];
  }[] = [
    {
      name: "Navegação",
      tools: [
        {
          id: "select",
          label: "Selecionar",
          icon: <MousePointer2 size={15} />,
          hint: "V",
        },
        { id: "pan", label: "Mover", icon: <Hand size={15} />, hint: "H" },
      ],
    },
    {
      name: "Locais",
      tools: [
        {
          id: "addLocation",
          label: "Local",
          icon: <MapPin size={15} />,
          hint: "L",
        },
        {
          id: "addSymbol",
          label: "Símbolos",
          icon: LucideIcons["addSymbol"],
          hint: "Símbolos",
        },
      ],
    },
    {
      name: "Desenho",
      tools: [
        { id: "draw", label: "Desenhar", icon: <Pencil size={15} />, hint: "D" },
        { id: "addLine", label: "Linha", icon: <Minus size={15} />, hint: "N" },
        {
          id: "addArrow",
          label: "Seta",
          icon: <ArrowUpRight size={15} />,
          hint: "A",
        },
        {
          id: "addRectangle",
          label: "Retângulo",
          icon: <Square size={15} />,
          hint: "R",
        },
        {
          id: "addCircle",
          label: "Círculo",
          icon: <Circle size={15} />,
          hint: "C",
        },
        { id: "addText", label: "Texto", icon: <Type size={15} />, hint: "T" },
      ],
    },
    {
      name: "Especial",
      tools: [
        {
          id: "addWall",
          label: "Parede",
          icon: LucideIcons["addWall"],
          hint: "Parede",
        },
        {
          id: "addDoor",
          label: "Porta",
          icon: LucideIcons["addDoor"],
          hint: "Porta",
        },
        {
          id: "addLight",
          label: "Luz",
          icon: LucideIcons["addLight"],
          hint: "Luz",
        },
        {
          id: "eraser",
          label: "Borracha",
          icon: LucideIcons["eraser"],
          hint: "Borracha",
        },
        {
          id: "measure",
          label: "Medir",
          icon: LucideIcons["measure"],
          hint: "Medir",
        },
      ],
    },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      onUpdateProject(
        project.id,
        await importMapImage(file, controller.current.signal),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b shrink-0"
      style={{
        background: "var(--dz-graphite)",
        borderColor: "var(--dz-stone)",
      }}
    >
      {error && (
        <div role="alert" className="w-full text-red-300">
          {error}
          <button onClick={() => setError("")}> Fechar aviso</button>
        </div>
      )}
      {busy && (
        <span>
          Convertendo...{" "}
          <button onClick={() => controller.current?.abort()}>
            Cancelar importação
          </button>
        </span>
      )}
      <button
        className="dz-button flex items-center gap-2"
        onClick={onToggleSidebar}
        aria-label={
          sidebarCollapsed
            ? "Abrir painel de locais"
            : "Recolher painel de locais"
        }
        aria-expanded={!sidebarCollapsed}
        aria-controls="editor-sidebar"
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen size={16} />
        ) : (
          <PanelLeftClose size={16} />
        )}{" "}
        <span className="hidden sm:inline">Locais</span>
      </button>

      {/* Ferramentas agrupadas por categorias */}
      <div
        role="group"
        aria-label="Ferramentas do mapa"
        className="flex flex-wrap items-center gap-1.5 min-w-0"
      >
        {categories.map((category) => (
          <div
            key={category.name}
            role="group"
            aria-label={category.name}
            className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-stone-800 bg-stone-950/40"
          >
            <span className="text-[9px] uppercase font-semibold text-stone-500 px-1 select-none hidden lg:inline">
              {category.name}
            </span>
            {category.tools.map((tool) => {
              const active = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  aria-label={tool.label}
                  aria-pressed={active}
                  title={`${tool.label} (${tool.hint})`}
                  className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded transition-colors focus-visible:ring"
                  style={{
                    color: active ? "var(--dz-amber-2)" : "var(--dz-parchment-3)",
                    background: active ? "rgba(200, 149, 74, 0.16)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "var(--dz-graphite-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {tool.icon}
                  {active && (
                    <span
                      className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded-full"
                      style={{ background: "var(--dz-amber)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Separador */}
      <div className="h-6 w-px hidden sm:block" style={{ background: "var(--dz-stone)" }} />

      {/* Grid toggle */}
      <button
        onClick={() =>
          onUpdateProject(project.id, { gridEnabled: !project.gridEnabled })
        }
        aria-label="Alternar grade"
        aria-pressed={project.gridEnabled}
        title={`Grade ${project.gridEnabled ? "ativa" : "inativa"}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase tracking-wider transition-colors"
        style={{
          color: project.gridEnabled
            ? "var(--dz-amber-2)"
            : "var(--dz-parchment-3)",
          background: project.gridEnabled
            ? "rgba(200, 149, 74, 0.12)"
            : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!project.gridEnabled)
            e.currentTarget.style.background = "var(--dz-graphite-2)";
        }}
        onMouseLeave={(e) => {
          if (!project.gridEnabled)
            e.currentTarget.style.background = "transparent";
        }}
      >
        <Grid3x3 size={13} strokeWidth={1.5} />
        <span>Grade</span>
      </button>

      {/* Separador */}
      <div className="h-6 w-px" style={{ background: "var(--dz-stone)" }} />

      {/* Upload de imagem */}
      <label
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase tracking-wider cursor-pointer transition-colors"
        style={{ color: "var(--dz-parchment-3)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--dz-amber-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--dz-parchment-3)";
        }}
      >
        <Upload size={13} strokeWidth={1.5} />
        <span>Importar</span>
        <input
          type="file"
          disabled={busy}
          accept="image/png,image/webp,image/jpeg"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>

      {/* Botão de Ajuda (F1) */}
      {onOpenHelp && (
        <button
          onClick={onOpenHelp}
          aria-label="Guia de atalhos e ajuda (F1)"
          title="Ajuda e atalhos (F1)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase tracking-wider rounded transition-colors text-stone-400 hover:text-amber-200 hover:bg-stone-800/60 focus-visible:ring"
        >
          <HelpCircle size={14} />
          <span className="hidden md:inline">Ajuda</span>
        </button>
      )}

      {/* Info do projeto */}
      <div className="ml-auto hidden xl:flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="label-caps">Dimensões</span>
          <span
            className="font-mono text-[11px]"
            style={{ color: "var(--dz-parchment-2)" }}
          >
            {project.imageWidth} × {project.imageHeight}
          </span>
        </div>
        {project.imageUrl && (
          <div
            className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "rgba(107, 142, 78, 0.15)",
              color: "var(--dz-success-2)",
              border: "1px solid var(--dz-success)",
            }}
          >
            WebP
          </div>
        )}
      </div>
    </div>
  );
}
