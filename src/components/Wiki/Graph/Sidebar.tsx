import React, { useRef, useState } from "react";
import type { SavedView, TypeReg } from "./core";
import { ICON_PRESETS } from "./core";
import { IBookmark, IDownload, IEye, IEyeOff, IPlus, IRestore, IStats, ITarget, ITrash, IUpload } from "./icons";

interface SidebarProps {
  types: TypeReg[];
  counts: Map<string, number>;
  tags: { tag: string; count: number }[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  hidden: Set<string>;
  isolate: string | null;
  onToggleVisible: (id: string) => void;
  onIsolate: (id: string | null) => void;
  onAddCustom: (name: string, color: string, icon: string) => void;
  onRemoveCustom: (id: string) => void;
  savedViews: SavedView[];
  onApplyView: (v: SavedView) => void;
  onDeleteView: (id: string) => void;
  onSaveView: () => void;
  onRestore: () => void;
  onOpenStats: () => void;
  onExportDB: () => void;
  onImportDB: (file: File) => void;
  attraction?: number;
  onSetAttraction?: (val: number) => void;
  idealDistance?: number;
  onSetIdealDistance?: (val: number) => void;
  physicsOn?: boolean;
  onTogglePhysics?: () => void;
  onReheatPhysics?: () => void;
}

type TabKey = "camadas" | "tags" | "vistas" | "fisica" | "cofre";

export default function Sidebar(p: SidebarProps) {
  const [tab, setTab] = useState<TabKey>("camadas");
  const [collapsed, setCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#e8a86b");
  const [icon, setIcon] = useState("🗝️");
  const [searchTag, setSearchTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitCustom = () => {
    if (!name.trim()) return;
    p.onAddCustom(name.trim(), color, icon);
    setName("");
    setFormOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      p.onImportDB(file);
      e.target.value = "";
    }
  };

  const filteredTags = p.tags.filter((t) =>
    t.tag.toLowerCase().includes(searchTag.toLowerCase().trim())
  );

  if (collapsed) {
    return (
      <div className="w-[48px] shrink-0 h-full flex flex-col items-center py-3 border-r border-ink-700 bg-ink-900/95 backdrop-blur-md z-20 select-none justify-between">
        <div className="space-y-3 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="w-8 h-8 rounded-lg grid place-items-center text-gold bg-ink-800 hover:bg-gold hover:text-ink-950 transition-colors"
            title="Expandir Barra Lateral"
          >
            ❯
          </button>
          <div className="w-6 h-px bg-ink-700" />
          <button
            type="button"
            onClick={() => { setTab("camadas"); setCollapsed(false); }}
            className={`w-8 h-8 rounded-lg grid place-items-center text-[15px] ${tab === "camadas" ? "bg-gold/20 text-gold" : "text-fog hover:text-parchment"}`}
            title="Camadas"
          >
            🔮
          </button>
          <button
            type="button"
            onClick={() => { setTab("tags"); setCollapsed(false); }}
            className={`w-8 h-8 rounded-lg grid place-items-center text-[13px] ${tab === "tags" ? "bg-gold/20 text-gold font-bold" : "text-fog hover:text-parchment font-mono"}`}
            title="Tags #"
          >
            #
          </button>
          <button
            type="button"
            onClick={() => { setTab("vistas"); setCollapsed(false); }}
            className={`w-8 h-8 rounded-lg grid place-items-center ${tab === "vistas" ? "bg-gold/20 text-gold" : "text-fog hover:text-parchment"}`}
            title="Vistas Salvas"
          >
            <IBookmark className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setTab("fisica"); setCollapsed(false); }}
            className={`w-8 h-8 rounded-lg grid place-items-center text-[13px] ${tab === "fisica" ? "bg-gold/20 text-gold" : "text-fog hover:text-parchment"}`}
            title="Física & Atração"
          >
            ⚡
          </button>
        </div>
        <button
          type="button"
          onClick={p.onOpenStats}
          className="w-8 h-8 rounded-lg grid place-items-center text-teal hover:bg-ink-800 transition-colors"
          title="Radiografia / Estatísticas"
        >
          <IStats className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-[280px] shrink-0 h-full flex flex-col border-r border-ink-700 bg-ink-900/98 backdrop-blur-xl z-20 select-none">
      {/* 1. Header com Abas */}
      <div className="p-3 border-b border-ink-700 bg-ink-850 flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          {(
            [
              { id: "camadas", label: "🔮 Camadas" },
              { id: "tags", label: "🏷️ Tags" },
              { id: "vistas", label: "📌 Vistas" },
              { id: "fisica", label: "⚡ Física" },
              { id: "cofre", label: "💾 Cofre" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-2 py-1 rounded-lg font-mono text-[10.5px] font-bold transition-colors ${
                tab === t.id ? "bg-gold text-ink-950 shadow-sm" : "text-fog hover:text-parchment hover:bg-ink-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-fog hover:text-parchment p-1 rounded-lg hover:bg-ink-800"
          title="Recolher Barra"
        >
          ❮
        </button>
      </div>

      {/* 2. Conteúdo da Aba */}
      <div className="flex-1 overflow-y-auto p-3 text-[12px]">
        {tab === "camadas" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="font-mono text-[10px] uppercase text-fog tracking-wider">Filtro de Visibilidade</span>
              {p.isolate && (
                <button
                  type="button"
                  onClick={() => p.onIsolate(null)}
                  className="font-mono text-[9px] uppercase text-gold hover:underline"
                >
                  Limpar Destaque
                </button>
              )}
            </div>

            {p.types.map((t) => {
              const count = p.counts.get(t.id) ?? 0;
              const isHidden = p.hidden.has(t.id);
              const isIsolated = p.isolate === t.id;

              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                    isIsolated
                      ? "bg-gold/15 border-gold shadow-md"
                      : isHidden
                      ? "opacity-40 bg-ink-950/40 border-ink-800"
                      : "bg-ink-850 border-ink-700/80 hover:border-ink-600"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[15px]">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-parchment truncate text-[12px]">{t.name}</span>
                        {t.custom && (
                          <span className="font-mono text-[8px] uppercase px-1 rounded bg-ink-800 text-gold">custom</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-fog">{count} nós</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => p.onIsolate(isIsolated ? null : t.id)}
                      className={`p-1 rounded-lg ${isIsolated ? "text-gold bg-gold/20" : "text-fog hover:text-gold"}`}
                      title={isIsolated ? "Remover destaque desta camada" : "Destacar somente esta camada"}
                    >
                      <ITarget className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => p.onToggleVisible(t.id)}
                      className={`p-1 rounded-lg ${isHidden ? "text-ember" : "text-fog hover:text-parchment"}`}
                      title={isHidden ? "Exibir camada" : "Ocultar camada"}
                    >
                      {isHidden ? <IEyeOff className="w-3.5 h-3.5" /> : <IEye className="w-3.5 h-3.5" />}
                    </button>
                    {t.custom && (
                      <button
                        type="button"
                        onClick={() => p.onRemoveCustom(t.id)}
                        className="p-1 text-fog hover:text-ember"
                        title="Remover camada personalizada"
                      >
                        <ITrash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Criar Nova Camada Personalizada */}
            {!formOpen ? (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="w-full mt-3 flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-ink-600 hover:border-gold text-fog hover:text-gold font-mono text-[11px] transition-colors"
              >
                <IPlus className="w-3.5 h-3.5" /> Criar Nova Camada
              </button>
            ) : (
              <div className="mt-3 p-3 rounded-xl bg-ink-850 border border-ink-600 space-y-2.5 rise-in">
                <div className="font-bold text-gold text-[11.5px]">Nova Camada RPG</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome (ex: Frentes de Batalha)"
                  className="w-full bg-ink-900 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment text-[11.5px] focus:border-gold"
                />

                <div className="flex items-center gap-1.5 flex-wrap">
                  {ICON_PRESETS.slice(0, 10).map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-6 h-6 rounded text-[13px] grid place-items-center ${icon === ic ? "bg-gold/30 border border-gold" : "hover:bg-ink-800"}`}
                    >
                      {ic}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    aria-label="Cor da nova camada"
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-ink-600 p-0"
                  />
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  <button type="button" onClick={() => setFormOpen(false)} className="px-2.5 py-1 rounded bg-ink-800 text-fog text-[11px]">
                    Cancelar
                  </button>
                  <button type="button" onClick={submitCustom} className="px-3 py-1 rounded bg-gold text-ink-950 font-bold text-[11px]">
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "tags" && (
          <div className="space-y-2">
            <input
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              placeholder="Filtrar #tags..."
              className="w-full bg-ink-850 border border-ink-600 rounded-xl px-3 py-1.5 text-parchment text-[11.5px] focus:border-gold"
            />

            {p.selectedTag && (
              <button
                type="button"
                onClick={() => p.onSelectTag(null)}
                className="w-full py-1 rounded-lg bg-ember/20 text-ember border border-ember/40 font-mono text-[10px] font-bold"
              >
                Limpar Filtro Ativo ({p.selectedTag})
              </button>
            )}

            <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
              {filteredTags.length === 0 ? (
                <p className="text-[11px] text-fog italic py-4 text-center">Nenhuma tag encontrada.</p>
              ) : (
                filteredTags.map(({ tag, count }) => {
                  const isSelected = p.selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => p.onSelectTag(isSelected ? null : tag)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-gold text-ink-950 font-bold border-gold shadow-md"
                          : "bg-ink-850 border-ink-700 hover:border-gold/60 text-parchment"
                      }`}
                    >
                      <span className="font-mono text-[11.5px]">{tag}</span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-ink-950 text-gold" : "bg-ink-900 text-fog"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === "vistas" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={p.onSaveView}
              className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-gold text-ink-950 font-bold text-[11.5px] hover:bg-gold-300 transition-colors shadow-md mb-3"
            >
              <IBookmark className="w-3.5 h-3.5" /> Salvar Vista Atual
            </button>

            <div className="space-y-1.5">
              {p.savedViews.length === 0 ? (
                <p className="text-[11px] text-fog italic py-4 text-center">Nenhuma vista salva ainda.</p>
              ) : (
                p.savedViews.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ink-850 border border-ink-700">
                    <button
                      type="button"
                      onClick={() => p.onApplyView(v)}
                      className="text-left flex-1 min-w-0 hover:text-gold"
                    >
                      <div className="font-bold text-parchment truncate text-[12px]">{v.name}</div>
                      <div className="font-mono text-[9px] text-fog">Zoom: {v.viewport.zoom.toFixed(2)}x</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => p.onDeleteView(v.id)}
                      className="p-1 text-fog hover:text-ember"
                      title="Excluir vista"
                    >
                      <ITrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "fisica" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-ink-850 border border-ink-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-gold font-bold">Força de Atração</span>
                <span className="font-mono text-[10px] text-parchment font-bold">{(p.attraction ?? 1.0).toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={p.attraction ?? 1.0}
                onChange={(e) => p.onSetAttraction?.(parseFloat(e.target.value))}
                className="w-full accent-[#d9a441] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-fog font-mono">
                <span>Espalhado (0.3x)</span>
                <span>Compacto (2.5x)</span>
              </div>
              <p className="text-[10.5px] text-fog leading-tight">
                Controla a força gravitacional que atrai os nós para perto uns dos outros.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-ink-850 border border-ink-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-gold font-bold">Distância entre Nós</span>
                <span className="font-mono text-[10px] text-parchment font-bold">{p.idealDistance ?? 120}px</span>
              </div>
              <input
                type="range"
                min="70"
                max="250"
                step="10"
                value={p.idealDistance ?? 120}
                onChange={(e) => p.onSetIdealDistance?.(parseInt(e.target.value, 10))}
                className="w-full accent-[#d9a441] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-fog font-mono">
                <span>Bem Próximos (70px)</span>
                <span>Amplo (250px)</span>
              </div>
              <p className="text-[10.5px] text-fog leading-tight">
                Espaçamento ideal entre os fragmentos conectados por laços.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-ink-850 border border-ink-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-gold font-bold">Gravidade Orgânica</span>
                <button
                  type="button"
                  onClick={p.onTogglePhysics}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-colors ${
                    p.physicsOn
                      ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/50"
                      : "bg-ink-700 text-fog hover:text-parchment"
                  }`}
                >
                  {p.physicsOn ? "Ativada" : "Pausada"}
                </button>
              </div>
              <button
                type="button"
                onClick={p.onReheatPhysics}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-gold text-ink-950 font-bold text-[11px] hover:bg-gold-300 transition-colors shadow-sm mt-1"
              >
                ⚡ Reagrupar Nós
              </button>
            </div>
          </div>
        )}

        {tab === "cofre" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-ink-850 border border-ink-700 space-y-2">
              <span className="font-mono text-[10px] uppercase text-gold font-bold block">Banco Local & Backup</span>
              <p className="text-[11px] text-fog leading-relaxed">
                Exporte todo o mundo do grafo, nós, relações, fichas RPG e camadas para um arquivo JSON portável.
              </p>
              <button
                type="button"
                onClick={p.onExportDB}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-ink-800 hover:bg-gold hover:text-ink-950 text-parchment font-bold text-[11.5px] transition-colors"
              >
                <IDownload className="w-3.5 h-3.5" /> Baixar Backup JSON
              </button>
            </div>

            <div className="p-3 rounded-xl bg-ink-850 border border-ink-700 space-y-2">
              <span className="font-mono text-[10px] uppercase text-teal font-bold block">Importar Grafo</span>
              <p className="text-[11px] text-fog leading-relaxed">
                Carregue um arquivo de backup `.json` do Arcanum para restaurar um mundo salvo.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-ink-800 hover:bg-teal hover:text-ink-950 text-parchment font-bold text-[11.5px] transition-colors"
              >
                <IUpload className="w-3.5 h-3.5" /> Carregar Arquivo JSON
              </button>
            </div>

            <div className="p-3 rounded-xl bg-ink-850 border border-ink-700 space-y-2">
              <span className="font-mono text-[10px] uppercase text-ember font-bold block">Mundo de Exemplo</span>
              <button
                type="button"
                onClick={p.onRestore}
                className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-ink-800 hover:bg-ember hover:text-parchment text-fog font-bold text-[11px] transition-colors"
              >
                <IRestore className="w-3.5 h-3.5" /> Restaurar "A Mácula de Valdris"
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Rodapé com Botão de Radiografia */}
      <div className="p-3 border-t border-ink-700 bg-ink-850 shrink-0">
        <button
          type="button"
          onClick={p.onOpenStats}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-gradient-to-r from-teal/15 via-teal/25 to-teal/15 border border-teal text-teal font-bold text-[11.5px] hover:brightness-110 transition-all shadow-md"
        >
          <IStats className="w-4 h-4" /> Radiografia do Mundo
        </button>
      </div>
    </aside>
  );
}
