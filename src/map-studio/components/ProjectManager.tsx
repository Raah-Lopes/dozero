import { useState } from "react";
import { createPortal } from "react-dom";
import { MapProject } from "../types";
import {
  Plus,
  Map as MapIcon,
  Trash2,
  ScrollText,
  X,
  Compass,
  FileText,
} from "lucide-react";

interface ProjectManagerProps {
  projects: MapProject[];
  activeProjectId: string | null;
  onCreateProject: (name: string, description: string) => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export default function ProjectManager({
  projects,
  activeProjectId,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
}: ProjectManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const handleCreate = () => setShowCreateModal(true);

  const handleSubmitCreate = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim(), newProjectDescription.trim());
      setNewProjectName("");
      setNewProjectDescription("");
      setShowCreateModal(false);
    }
  };

  const handleCancelCreate = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setShowCreateModal(false);
  };

  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        background: `
          radial-gradient(ellipse at top, rgba(200, 149, 74, 0.03) 0%, transparent 60%),
          #0a0806
        `,
      }}
    >
      <div className="max-w-6xl mx-auto p-10">
        {/* ───── Cabeçalho ───── */}
        <div
          className="flex items-end justify-between mb-10 pb-6 border-b"
          style={{ borderColor: "#3d2e22" }}
        >
          <div>
            <span
              className="block mb-2"
              style={{
                color: "#c8954a",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
              }}
            >
              Arquivo · Pergaminhos
            </span>
            <h2
              className="text-3xl tracking-[0.08em]"
              style={{
                color: "#e8dcc4",
                fontFamily: "'Cinzel', serif",
                fontWeight: 500,
              }}
            >
              SEUS MAPAS
            </h2>
            <p
              className="italic text-[15px] mt-2"
              style={{
                color: "#b8a88c",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Cada pergaminho é um mundo aguardando ser desvelado.
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] border transition-all"
            style={{
              background: "#c8954a",
              color: "#0a0806",
              borderColor: "#b8863a",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#d4a55c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#c8954a";
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Novo Pergaminho
          </button>
        </div>

        {/* ───── Estado vazio ───── */}
        {projects.length === 0 ? (
          <div className="text-center py-24">
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
              style={{
                background: "#1a1512",
                border: "1px solid #3d2e22",
              }}
            >
              <ScrollText
                size={40}
                style={{ color: "#b8863a" }}
                strokeWidth={1}
              />
            </div>
            <h3
              className="text-xl tracking-[0.12em] mb-3"
              style={{
                color: "#e8dcc4",
                fontFamily: "'Cinzel', serif",
                fontWeight: 500,
              }}
            >
              O ARQUIVO ESTÁ VAZIO
            </h3>
            <p
              className="italic text-[15px] mb-8 max-w-md mx-auto leading-relaxed"
              style={{
                color: "#b8a88c",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              Nenhum pergaminho foi registrado ainda. Crie seu primeiro mapa
              para começar a traçar os contornos de seu mundo.
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] border transition-all"
              style={{
                background: "transparent",
                color: "#d4a55c",
                borderColor: "#c8954a",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(200, 149, 74, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Compass size={14} strokeWidth={1.5} />
              Forjar Primeiro Pergaminho
            </button>
          </div>
        ) : (
          /* ───── Grid de projetos ───── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const isActive = activeProjectId === project.id;
              return (
                <article
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="group relative cursor-pointer transition-all"
                  style={{
                    background: "#1a1512",
                    border: `1px solid ${isActive ? "#c8954a" : "#3d2e22"}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.borderColor = "#b8863a";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.borderColor = "#3d2e22";
                  }}
                >
                  {/* Preview */}
                  <div
                    className="h-40 relative overflow-hidden"
                    style={{ background: "#050403" }}
                  >
                    {project.imageUrl ? (
                      <img
                        src={project.thumbnailUrl || project.imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: `
                            repeating-linear-gradient(45deg, var(--dz-graphite-2) 0, var(--dz-graphite-2) 2px, transparent 2px, transparent 12px),
                            var(--dz-graphite)
                          `,
                        }}
                      >
                        <MapIcon
                          size={44}
                          style={{ color: "var(--dz-stone-2)" }}
                          strokeWidth={1}
                        />
                      </div>
                    )}

                    {/* Selo de estilo */}
                    <div
                      className="absolute top-2 right-2 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                      style={{
                        background: "rgba(10, 8, 6, 0.85)",
                        color: "#d4a55c",
                        border: "1px solid #b8863a",
                      }}
                    >
                      {project.style}
                    </div>

                    {/* Indicador ativo */}
                    {isActive && (
                      <div
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                        style={{
                          background: "#c8954a",
                          color: "#0a0806",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "#0a0806" }}
                        />
                        Aberto
                      </div>
                    )}
                  </div>

                  {/* Corpo */}
                  <div className="p-4">
                    <h3
                      className="text-[15px] tracking-wide mb-1 transition-colors"
                      style={{
                        color: "#e8dcc4",
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 500,
                      }}
                    >
                      {project.name}
                    </h3>
                    <p
                      className="italic text-[13px] leading-snug mb-3 line-clamp-2"
                      style={{
                        color: "#b8a88c",
                        fontFamily: "'Cormorant Garamond', serif",
                      }}
                    >
                      {project.description || "— sem descrição —"}
                    </p>

                    {/* Métricas */}
                    <div
                      className="flex items-center gap-4 pt-3 border-t"
                      style={{ borderColor: "#3d2e22" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <MapIcon
                          size={11}
                          style={{ color: "#b8863a" }}
                          strokeWidth={1.5}
                        />
                        <span
                          className="text-[11px]"
                          style={{
                            color: "#d4c4a8",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {project.locations.length}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase" as const,
                            color: "#7a6f5c",
                          }}
                        >
                          locais
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText
                          size={11}
                          style={{ color: "#b8863a" }}
                          strokeWidth={1.5}
                        />
                        <span
                          className="text-[11px]"
                          style={{
                            color: "#d4c4a8",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {project.annotations.length}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase" as const,
                            color: "#7a6f5c",
                          }}
                        >
                          notas
                        </span>
                      </div>
                      <div className="ml-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                          aria-label="Excluir pergaminho"
                          title="Excluir pergaminho"
                          className="p-1.5 transition-colors"
                          style={{ color: "#7a6f5c" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#c45a48";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#7a6f5c";
                          }}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Data */}
                    <div className="mt-3">
                      <span
                        className="text-[10px]"
                        style={{
                          color: "#7a6f5c",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {project.updatedAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ───── Modal de criação (via portal) ───── */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
              background: "rgba(5, 4, 3, 0.85)",
              backdropFilter: "blur(4px)",
            }}
            onClick={handleCancelCreate}
          >
            <div
              className="relative w-full max-w-md"
              style={{
                background: "var(--dz-graphite)",
                border: "1px solid var(--dz-copper)",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--dz-ink)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do modal */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: "var(--dz-stone)" }}
              >
                <div>
                  <span
                    className="label-caps block mb-1"
                    style={{ color: "var(--dz-amber)" }}
                  >
                    Novo Pergaminho
                  </span>
                  <h3
                    className="font-display text-lg tracking-wider"
                    style={{ color: "var(--dz-parchment)" }}
                  >
                    FORJAR MAPA
                  </h3>
                </div>
                <button
                  onClick={handleCancelCreate}
                  aria-label="Fechar"
                  className="p-1.5 transition-colors"
                  style={{ color: "var(--dz-ash)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--dz-parchment)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--dz-ash)";
                  }}
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>

              {/* Corpo */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="label-caps block mb-2">Nome do Reino</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex.: As Terras de Valória"
                    autoFocus
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitCreate();
                    }}
                  />
                </div>

                <div>
                  <label className="label-caps block mb-2">
                    Crônica (opcional)
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Uma breve descrição do mundo que deseja forjar..."
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
              </div>

              {/* Rodapé */}
              <div
                className="flex items-center gap-3 px-6 py-4 border-t"
                style={{
                  borderColor: "var(--dz-stone)",
                  background: "var(--dz-graphite-2)",
                }}
              >
                <button
                  onClick={handleCancelCreate}
                  className="flex-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors"
                  style={{
                    background: "transparent",
                    color: "var(--dz-parchment-3)",
                    borderColor: "var(--dz-stone-2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--dz-parchment-3)";
                    e.currentTarget.style.color = "var(--dz-parchment)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--dz-stone-2)";
                    e.currentTarget.style.color = "var(--dz-parchment-3)";
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitCreate}
                  disabled={!newProjectName.trim()}
                  className="flex-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--dz-amber)",
                    color: "var(--dz-ink)",
                    borderColor: "var(--dz-copper)",
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.background = "var(--dz-amber-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--dz-amber)";
                  }}
                >
                  Forjar Pergaminho
                </button>
              </div>

              {/* Ornamento */}
              <div
                className="absolute -top-px left-0 right-0 h-px"
                style={{ background: "var(--dz-amber)" }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
