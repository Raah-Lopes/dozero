import { useState } from "react";
import { GlossaryEntry, MapLocation } from "../types";
import LocationIcon from "./LocationIcon";
import { BookOpen, Plus, Search, X, Edit2, Save, Trash2, MapPin } from "lucide-react";

interface GlossaryProps {
  entries: GlossaryEntry[];
  onAddEntry: (entry: GlossaryEntry) => void;
  onUpdateEntry: (id: string, updates: Partial<GlossaryEntry>) => void;
  onDeleteEntry: (id: string) => void;
  locations: MapLocation[];
  onLocateLocation?: (id: string) => void;
}

export default function Glossary({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  locations,
  onLocateLocation,
}: GlossaryProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    term: "",
    definition: "",
    category: "geral",
  });

  const filteredEntries = entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.description.toLowerCase().includes(search.toLowerCase()) ||
      entry.type.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddEntry = () => {
    if (newEntry.term.trim() && newEntry.definition.trim()) {
      onAddEntry({
        id: crypto.randomUUID(),
        name: newEntry.term.trim(),
        description: newEntry.definition.trim(),
        type: newEntry.category as any,
        tags: [],
      });
      setNewEntry({ term: "", definition: "", category: "geral" });
      setShowAddModal(false);
    }
  };

  const categories = [
    "geral",
    "personagem",
    "local",
    "item",
    "magia",
    "criatura",
    "organização",
    "evento",
  ];

  return (
    <div
      className="flex-1 min-h-0 overflow-auto"
      style={{
        background: `
          radial-gradient(ellipse at top, rgba(200, 149, 74, 0.03) 0%, transparent 60%),
          var(--dz-ink)
        `,
      }}
    >
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:p-8 lg:p-10">
        {/* Cabeçalho */}
        <div
          className="flex flex-wrap items-end justify-between gap-5 mb-8 lg:mb-10 pb-6 border-b"
          style={{ borderColor: "var(--dz-stone)" }}
        >
          <div>
            <span
              className="label-caps block mb-2"
              style={{ color: "var(--dz-amber)" }}
            >
              Conhecimento · Sabedoria
            </span>
            <h2
              className="font-display text-3xl tracking-[0.08em]"
              style={{ color: "var(--dz-parchment)" }}
            >
              CÓDICE
            </h2>
            <p
              className="font-lore italic text-[15px] mt-2"
              style={{ color: "var(--dz-parchment-3)" }}
            >
              O registro de todos os saberes e mistérios do mundo.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] border transition-all"
            style={{
              background: "var(--dz-amber)",
              color: "var(--dz-ink)",
              borderColor: "var(--dz-copper)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--dz-amber-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--dz-amber)";
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nova Entrada
          </button>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--dz-ash)" }}
          />
          <input
            type="text"
            placeholder="Buscar no códice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>

        {/* Lista de entradas */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--dz-copper)" }}
              strokeWidth={1}
            />
            <h3
              className="font-display text-xl tracking-wider mb-3"
              style={{ color: "var(--dz-parchment)" }}
            >
              CÓDICE VAZIO
            </h3>
            <p
              className="font-lore italic text-[15px] mb-6 max-w-md mx-auto"
              style={{ color: "var(--dz-parchment-3)" }}
            >
              Nenhum registro encontrado. Adicione entradas ao códice para
              preservar o conhecimento.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors"
              style={{
                background: "transparent",
                color: "var(--dz-amber-2)",
                borderColor: "var(--dz-amber)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(200, 149, 74, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Primeira Entrada
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const isEditing = editingId === entry.id;
              const linkedLocation = locations.find(
                (l) => l.id === entry.locationId,
              );
              return (
                <article
                  key={entry.id}
                  className="p-5 transition-all"
                  style={{
                    background: "var(--dz-graphite)",
                    border: `1px solid ${isEditing ? "var(--dz-amber)" : "var(--dz-stone)"}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, { name: e.target.value })
                            }
                            className="w-full font-display text-lg"
                            placeholder="Nome"
                          />
                          <textarea
                            value={entry.description}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                description: e.target.value,
                              })
                            }
                            className="w-full resize-none"
                            rows={3}
                            placeholder="Descrição"
                          />
                          <select
                            value={entry.type}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                type: e.target.value as any,
                              })
                            }
                            className="w-full"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            {linkedLocation && (
                              <LocationIcon
                                location={linkedLocation}
                                size={32}
                              />
                            )}
                            <h3
                              className="font-display text-lg tracking-wide"
                              style={{ color: "var(--dz-amber-2)" }}
                            >
                              {entry.name}
                            </h3>
                            <span
                              className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                              style={{
                                background: "rgba(200, 149, 74, 0.1)",
                                color: "var(--dz-amber)",
                                border: "1px solid var(--dz-copper)",
                              }}
                            >
                              {entry.type}
                            </span>
                            {linkedLocation && onLocateLocation && (
                              <button
                                type="button"
                                onClick={() => onLocateLocation(linkedLocation.id)}
                                className="dz-button ml-auto inline-flex items-center gap-1.5 text-[11px]"
                                aria-label={`Localizar ${entry.name} no mapa`}
                              >
                                <MapPin size={13} />
                                Ver no mapa
                              </button>
                            )}
                          </div>
                          <p
                            className="font-lore italic text-[14px] leading-relaxed"
                            style={{ color: "var(--dz-parchment-2)" }}
                          >
                            {entry.description}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      {isEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          aria-label="Salvar"
                          title="Salvar"
                          className="p-2 transition-colors"
                          style={{ color: "var(--dz-success-2)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--dz-success)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--dz-success-2)";
                          }}
                        >
                          <Save size={14} strokeWidth={1.5} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(entry.id)}
                          aria-label="Editar"
                          title="Editar"
                          className="p-2 transition-colors"
                          style={{ color: "var(--dz-ash)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--dz-amber-2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--dz-ash)";
                          }}
                        >
                          <Edit2 size={14} strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label="Excluir"
                        title="Excluir"
                        className="p-2 transition-colors"
                        style={{ color: "var(--dz-ash)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--dz-danger-2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--dz-ash)";
                        }}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de adição */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: "rgba(5, 4, 3, 0.85)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md"
            style={{
              background: "var(--dz-graphite)",
              border: "1px solid var(--dz-copper)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "var(--dz-stone)" }}
            >
              <div>
                <span
                  className="label-caps block mb-1"
                  style={{ color: "var(--dz-amber)" }}
                >
                  Nova Entrada
                </span>
                <h3
                  className="font-display text-lg tracking-wider"
                  style={{ color: "var(--dz-parchment)" }}
                >
                  REGISTRAR SABER
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Fechar"
                className="p-1.5 transition-colors"
                style={{ color: "var(--dz-ash)" }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label-caps block mb-2">Termo</label>
                <input
                  type="text"
                  value={newEntry.term}
                  onChange={(e) =>
                    setNewEntry((prev) => ({ ...prev, term: e.target.value }))
                  }
                  placeholder="Ex.: Valória"
                  autoFocus
                  className="w-full"
                />
              </div>
              <div>
                <label className="label-caps block mb-2">Definição</label>
                <textarea
                  value={newEntry.definition}
                  onChange={(e) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      definition: e.target.value,
                    }))
                  }
                  placeholder="Uma descrição detalhada..."
                  rows={4}
                  className="w-full resize-none"
                />
              </div>
              <div>
                <label className="label-caps block mb-2">Categoria</label>
                <select
                  value={newEntry.category}
                  onChange={(e) =>
                    setNewEntry((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className="flex items-center gap-3 px-6 py-4 border-t"
              style={{
                borderColor: "var(--dz-stone)",
                background: "var(--dz-graphite-2)",
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors"
                style={{
                  background: "transparent",
                  color: "var(--dz-parchment-3)",
                  borderColor: "var(--dz-stone-2)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddEntry}
                disabled={!newEntry.term.trim() || !newEntry.definition.trim()}
                className="flex-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--dz-amber)",
                  color: "var(--dz-ink)",
                  borderColor: "var(--dz-copper)",
                }}
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
