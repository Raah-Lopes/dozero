import React, { useEffect, useState } from "react";
import type { NodeShape, RPGFicha, TypeReg, WEdge, WNode } from "./core";
import { EDGE_COLORS, ICON_PRESETS, RELATION_HINTS, RPG_TEMPLATES, extractLinkedNodes, normalizeTag } from "./core";
import type { WorldStats } from "./world";
import { LinkedText, LinkInserter } from "./LinkedText";
import { ITrash, IX } from "./icons";

/* ---------- Casca de Modal Genérica ---------- */
export function ModalShell({
  title,
  onClose,
  children,
  width = 460,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const h = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm fade-in" onClick={onClose} />
      <div
        className="relative rounded-2xl border border-ink-600 bg-ink-900 hud-shadow rise-in w-full shadow-2xl overflow-hidden"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-700 bg-ink-850">
          <h2 className="font-display font-bold text-[15px] tracking-wide text-parchment flex items-center gap-2">
            <span className="text-gold">✦</span> {title}
          </h2>
          <button type="button" onClick={onClose} className="text-fog hover:text-parchment transition-colors p-1 rounded-lg hover:bg-ink-800">
            <IX className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[84vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Modal de Ficha Completa de RPG (Disparado no Duplo Clique) ---------- */
export function FichaModal({
  node,
  nodes,
  edges,
  types,
  onChange,
  onClose,
  onJumpNode,
  onOpenFicha,
}: {
  node: WNode;
  nodes: WNode[];
  edges: WEdge[];
  types: TypeReg[];
  onChange: (id: string, patch: Partial<WNode["data"]>) => void;
  onClose: () => void;
  onJumpNode: (id: string) => void;
  onOpenFicha: (id: string) => void;
}) {
  const d = node.data;
  const type = types.find((t) => t.id === d.typeId) ?? types[0];
  const color = d.tint || type.color;
  const ficha: RPGFicha = d.ficha ?? {};
  const tags = d.tags ?? [];
  const relations = edges.filter((e) => e.source === node.id || e.target === node.id);

  // Extrai todas as fichas mencionadas no texto do resumo, inventário e lore
  const fullText = `${d.summary} ${ficha.inventory ?? ""} ${ficha.gmNotes ?? ""}`;
  const mentionedNodes = extractLinkedNodes(fullText, nodes).filter((n) => n.id !== node.id);

  const [tab, setTab] = useState<"narrativa" | "rpg" | "mestre" | "relacoes">("narrativa");

  return (
    <ModalShell title={`Ficha Completa: ${d.label || "Sem nome"}`} onClose={onClose} width={640}>
      <div className="space-y-4">
        {/* 1. Hero Card do Personagem / Entidade */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-ink-850 border border-ink-700 relative overflow-hidden shadow-md">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(380px 160px at 0% 0%, ${color}, transparent 80%)` }} />
          
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center text-[32px] border shrink-0 shadow-lg"
            style={{ background: `${color}26`, borderColor: color, boxShadow: `0 0 20px ${color}33` }}
          >
            {d.image ? (
              <img src={d.image} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span>{d.icon || "◆"}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                {type.name}
              </span>
              {ficha.level && (
                <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-gold/20 border border-gold-700/60 text-gold">
                  {ficha.level}
                </span>
              )}
              {ficha.status && (
                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-ink-900 border border-ink-600 text-parchment-dim">
                  {ficha.status}
                </span>
              )}
            </div>

            <div className="font-display font-black text-[20px] text-parchment leading-tight mt-1">
              {d.label || "Sem nome"}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => (
                  <span key={t} className="font-mono text-[9px] bg-ink-900 text-parchment-dim px-2 py-0.5 rounded-full border border-ink-700">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Barra de Navegação de Abas */}
        <div className="flex border-b border-ink-700 gap-1 pb-1">
          {(
            [
              { id: "narrativa", label: "📜 Lore & Narrativa" },
              { id: "rpg", label: "⚔️ Atributos RPG" },
              { id: "mestre", label: "👁️ Notas Secretas (GM)" },
              { id: "relacoes", label: `🔗 Relações (${relations.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors ${
                tab === t.id ? "bg-gold text-ink-950 shadow-sm" : "text-fog hover:text-parchment hover:bg-ink-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 3. Conteúdo da Aba */}
        {tab === "narrativa" && (
          <div className="space-y-3 text-[12.5px]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider">História & Lore</label>
                <LinkInserter
                  nodes={nodes}
                  currentNodeId={node.id}
                  onInsert={(link) => onChange(node.id, { summary: `${d.summary || ""} ${link}`.trim() })}
                />
              </div>
              <textarea
                value={d.summary}
                rows={5}
                onChange={(e) => onChange(node.id, { summary: e.target.value })}
                placeholder="Escreva a lore deste fragmento. Use [[Nome do Nó]] para linkar com outros personagens ou locais..."
                className="w-full bg-ink-850 border border-ink-600 rounded-xl p-3 text-parchment leading-relaxed focus:border-gold"
              />
            </div>

            {d.summary && (
              <div className="p-3.5 rounded-xl bg-ink-850/70 border border-ink-700 space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-gold font-bold">Texto Formatado com Links:</span>
                <LinkedText text={d.summary} nodes={nodes} onOpenFicha={onOpenFicha} className="text-parchment text-[12.5px]" />
              </div>
            )}
          </div>
        )}

        {tab === "rpg" && (
          <div className="space-y-3 text-[12px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Nível / ND</label>
                <input
                  value={ficha.level ?? ""}
                  onChange={(e) => onChange(node.id, { ficha: { level: e.target.value } })}
                  placeholder="Ex: Nível 5, ND 10"
                  className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment focus:border-gold"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Status</label>
                <input
                  value={ficha.status ?? ""}
                  onChange={(e) => onChange(node.id, { ficha: { status: e.target.value } })}
                  placeholder="Ex: Ativo, Desaparecido"
                  className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment focus:border-gold"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Tendência / Alinhamento</label>
                <input
                  value={ficha.alignment ?? ""}
                  onChange={(e) => onChange(node.id, { ficha: { alignment: e.target.value } })}
                  placeholder="Ex: Caótico e Bom"
                  className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment focus:border-gold"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Pontos de Vida (HP)</label>
                <input
                  value={ficha.hp ?? ""}
                  onChange={(e) => onChange(node.id, { ficha: { hp: e.target.value } })}
                  placeholder="Ex: 85/85"
                  className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment focus:border-gold"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Defesa / Armadura (CA)</label>
                <input
                  value={ficha.defense ?? ""}
                  onChange={(e) => onChange(node.id, { ficha: { defense: e.target.value } })}
                  placeholder="Ex: CA 17"
                  className="w-full bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1.5 text-parchment focus:border-gold"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider">Inventário & Tesouros</label>
                <LinkInserter
                  nodes={nodes}
                  currentNodeId={node.id}
                  onInsert={(link) => onChange(node.id, { ficha: { inventory: `${ficha.inventory || ""} ${link}`.trim() } })}
                />
              </div>
              <textarea
                value={ficha.inventory ?? ""}
                rows={3}
                onChange={(e) => onChange(node.id, { ficha: { inventory: e.target.value } })}
                placeholder="Armas, relíquias carregadas, tesouros..."
                className="w-full bg-ink-850 border border-ink-600 rounded-xl p-2.5 text-parchment text-[12px] focus:border-gold"
              />
              {ficha.inventory && (
                <div className="p-2.5 rounded-lg bg-ink-950/60 border border-ink-800 mt-1">
                  <LinkedText text={ficha.inventory} nodes={nodes} onOpenFicha={onOpenFicha} className="text-[11.5px] text-parchment" />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "mestre" && (
          <div className="space-y-3 text-[12px]">
            <div className="p-3 rounded-xl bg-ember/10 border border-ember/30 text-ember text-[11.5px] flex items-center gap-2">
              <span>👁️</span> <b>Aviso:</b> Estas notas são secretas e destinam-se ao planejamento narrativo do Mestre.
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-mono text-[10px] uppercase text-fog tracking-wider">Segredos, Motivações & Plot-Twists</label>
                <LinkInserter
                  nodes={nodes}
                  currentNodeId={node.id}
                  onInsert={(link) => onChange(node.id, { ficha: { gmNotes: `${ficha.gmNotes || ""} ${link}`.trim() } })}
                />
              </div>
              <textarea
                value={ficha.gmNotes ?? ""}
                rows={6}
                onChange={(e) => onChange(node.id, { ficha: { gmNotes: e.target.value } })}
                placeholder="Segredos de bastidores, fraquezas ocultas, planos de traição..."
                className="w-full bg-ink-850 border border-ink-600 rounded-xl p-3 text-parchment leading-relaxed focus:border-gold"
              />
              {ficha.gmNotes && (
                <div className="p-2.5 rounded-lg bg-ink-950/60 border border-ink-800 mt-1">
                  <LinkedText text={ficha.gmNotes} nodes={nodes} onOpenFicha={onOpenFicha} className="text-[11.5px] text-parchment" />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "relacoes" && (
          <div className="space-y-2">
            {relations.length === 0 ? (
              <p className="text-[12px] text-fog italic py-4 text-center">Nenhuma relação conectada a este nó.</p>
            ) : (
              relations.map((e) => {
                const isSrc = e.source === node.id;
                const otherId = isSrc ? e.target : e.source;
                const other = nodes.find((n) => n.id === otherId);
                return (
                  <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl bg-ink-850 border border-ink-700 text-[12px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-gold">{isSrc ? "→ Origem para:" : "← Destino de:"}</span>
                      <span className="font-bold text-parchment truncate">{other?.data.label ?? "?"}</span>
                      {e.data?.label && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/40">
                          {e.data.label}
                        </span>
                      )}
                    </div>
                    {other && (
                      <button
                        type="button"
                        onClick={() => {
                          onJumpNode(other.id);
                          onOpenFicha(other.id);
                        }}
                        className="font-mono text-[10px] text-gold hover:underline ml-2"
                      >
                        Abrir Ficha
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {mentionedNodes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-ink-700">
                <span className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-2">
                  Fichas Referenciadas no Texto ({mentionedNodes.length})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {mentionedNodes.map((mn) => (
                    <button
                      key={mn.id}
                      type="button"
                      onClick={() => onOpenFicha(mn.id)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-ink-850 hover:bg-ink-750 border border-ink-700 text-left text-[11.5px] transition-colors"
                    >
                      <span>{mn.data.icon}</span>
                      <span className="font-bold text-parchment truncate flex-1">{mn.data.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-ink-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gold text-ink-950 font-bold text-[12px] hover:bg-gold-300 transition-colors"
          >
            Concluir & Salvar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal de Criação de Nó com Modelos Predefinidos ---------- */
export function NodeCreateModal({
  types,
  onClose,
  onCreate,
}: {
  types: TypeReg[];
  onClose: () => void;
  onCreate: (data: {
    label: string;
    typeId: string;
    summary: string;
    icon?: string;
    shape?: NodeShape;
    tags: string[];
    ficha?: RPGFicha;
  }) => void;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? "conceito");
  const template = RPG_TEMPLATES[typeId];

  const [label, setLabel] = useState("");
  const [summary, setSummary] = useState(template?.templateSummary ?? "");
  const [icon, setIcon] = useState(template?.defaultIcon ?? "◆");
  const [tags, setTags] = useState<string[]>(template?.suggestedTags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [useTemplateFicha, setUseTemplateFicha] = useState(true);

  const handleTypeChange = (newType: string) => {
    setTypeId(newType);
    const tmpl = RPG_TEMPLATES[newType];
    if (tmpl) {
      if (!summary || summary === template?.templateSummary) setSummary(tmpl.templateSummary);
      setIcon(tmpl.defaultIcon);
      setTags(tmpl.suggestedTags);
    }
  };

  const addTag = () => {
    const formatted = normalizeTag(tagInput);
    if (formatted && !tags.includes(formatted)) {
      setTags([...tags, formatted]);
      setTagInput("");
    }
  };

  const submit = () => {
    if (!label.trim()) return;
    const selectedType = types.find((t) => t.id === typeId);
    onCreate({
      label: label.trim(),
      typeId,
      summary: summary.trim(),
      icon,
      shape: selectedType?.shape ?? "circle",
      tags,
      ficha: useTemplateFicha ? template?.defaultFicha : { status: "Ativo" },
    });
  };

  return (
    <ModalShell title="Inscrição de Novo Fragmento" onClose={onClose} width={500}>
      <div className="space-y-4 text-[12px]">
        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Camada do Fragmento</label>
          <div className="grid grid-cols-3 gap-1.5">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTypeChange(t.id)}
                className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all ${
                  typeId === t.id ? "bg-gold/20 border-gold text-gold font-bold shadow-sm" : "bg-ink-850 border-ink-700 text-fog hover:text-parchment"
                }`}
              >
                <span>{t.icon}</span>
                <span className="truncate text-[11px]">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Nome / Rótulo</label>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={template?.placeholder ?? "Nome do personagem, criatura ou local..."}
            className="w-full bg-ink-850 border border-ink-600 rounded-xl px-3 py-2 text-parchment font-bold text-[13px] focus:border-gold"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Resumo & Lore Inicial</label>
          <textarea
            value={summary}
            rows={3}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Breve descrição..."
            className="w-full bg-ink-850 border border-ink-600 rounded-xl p-2.5 text-parchment leading-relaxed focus:border-gold"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Tags Sugeridas</label>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 font-mono text-[10px] bg-ink-800 text-parchment px-2 py-0.5 rounded-full border border-ink-600">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-fog hover:text-ember">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="#adicionar-tag"
              className="flex-1 bg-ink-850 border border-ink-600 rounded-lg px-2.5 py-1 text-[11px] text-parchment"
            />
            <button type="button" onClick={addTag} className="px-2.5 rounded-lg bg-ink-700 hover:bg-gold hover:text-ink-950 font-bold text-[11px]">
              +
            </button>
          </div>
        </div>

        {template?.defaultFicha && (
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-850 border border-ink-700 cursor-pointer">
            <input
              type="checkbox"
              checked={useTemplateFicha}
              onChange={(e) => setUseTemplateFicha(e.target.checked)}
              className="rounded accent-gold"
            />
            <span className="text-[11.5px] text-parchment">Preencher com atributos padrão recomendados para <b>{types.find((t) => t.id === typeId)?.name}</b></span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-700">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-xl bg-ink-800 text-fog hover:text-parchment text-[12px]">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!label.trim()}
            onClick={submit}
            className="px-5 py-1.5 rounded-xl bg-gold text-ink-950 font-bold text-[12px] hover:bg-gold-300 disabled:opacity-40 transition-colors shadow-md"
          >
            Criar Fragmento
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal de Edição de Relação / Laço ---------- */
export function EdgeModal({
  edge,
  fromLabel,
  toLabel,
  onClose,
  onSave,
  onDelete,
}: {
  edge: WEdge;
  fromLabel: string;
  toLabel: string;
  onClose: () => void;
  onSave: (id: string, label: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [label, setLabel] = useState(edge.data?.label ?? "");
  const [color, setColor] = useState(edge.data?.color ?? "#d8b45a");

  return (
    <ModalShell title="Edição da Relação" onClose={onClose} width={420}>
      <div className="space-y-4 text-[12px]">
        <div className="flex items-center justify-between p-3 rounded-xl bg-ink-850 border border-ink-700">
          <div className="text-center flex-1 truncate font-bold text-parchment">{fromLabel}</div>
          <span className="font-mono text-gold px-2">──►</span>
          <div className="text-center flex-1 truncate font-bold text-parchment">{toLabel}</div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Rótulo da Relação</label>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: aliado de, criou, guarda, odeia..."
            className="w-full bg-ink-850 border border-ink-600 rounded-xl px-3 py-2 text-parchment font-bold focus:border-gold mb-2"
          />

          <div className="flex flex-wrap gap-1">
            {RELATION_HINTS.slice(0, 10).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setLabel(h)}
                className="font-mono text-[9.5px] px-2 py-0.5 rounded-full bg-ink-800 hover:bg-gold hover:text-ink-950 text-fog transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Cor do Laço</label>
          <div className="flex items-center gap-2">
            {EDGE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-gold scale-110" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-ink-700">
          <button
            type="button"
            onClick={() => onDelete(edge.id)}
            className="flex items-center gap-1 text-ember hover:underline font-mono text-[11px]"
          >
            <ITrash className="w-3.5 h-3.5" /> Remover laço
          </button>
          <button
            type="button"
            onClick={() => onSave(edge.id, label.trim(), color)}
            className="px-5 py-1.5 rounded-xl bg-gold text-ink-950 font-bold text-[12px] hover:bg-gold-300 transition-colors shadow-md"
          >
            Salvar Relação
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal de Radiografia / Estatísticas ---------- */
export function StatsModal({ stats, onClose }: { stats: WorldStats; onClose: () => void }) {
  return (
    <ModalShell title="Radiografia Cósmica do Grafo" onClose={onClose} width={540}>
      <div className="space-y-4 text-[12px]">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-3 rounded-xl bg-ink-850 border border-ink-700">
            <div className="font-display font-black text-[22px] text-gold">{stats.nodeCount}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fog mt-0.5">Nós / Fragmentos</div>
          </div>
          <div className="p-3 rounded-xl bg-ink-850 border border-ink-700">
            <div className="font-display font-black text-[22px] text-teal">{stats.edgeCount}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fog mt-0.5">Laços Totais</div>
          </div>
          <div className="p-3 rounded-xl bg-ink-850 border border-ink-700">
            <div className="font-display font-black text-[22px] text-parchment">{stats.components}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fog mt-0.5">Constelações</div>
          </div>
          <div className="p-3 rounded-xl bg-ink-850 border border-ink-700">
            <div className="font-display font-black text-[22px] text-ember">{(stats.density * 100).toFixed(1)}%</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fog mt-0.5">Densidade</div>
          </div>
        </div>

        <div>
          <h3 className="font-mono text-[10px] uppercase text-fog tracking-wider mb-2">Distribuição por Camadas</h3>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
            {stats.byType.map(({ type, count }) => (
              <div key={type.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-ink-850 text-[11.5px]">
                <span>{type.icon}</span>
                <span className="w-24 truncate font-bold text-parchment">{type.name}</span>
                <div className="flex-1 bg-ink-950 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / stats.nodeCount) * 100}%`,
                      background: type.color,
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-fog w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-mono text-[10px] uppercase text-fog tracking-wider mb-2">Nós Centrais Mais Conectados</h3>
          <div className="grid grid-cols-2 gap-2">
            {stats.topNodes.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-2 rounded-xl bg-ink-850 border border-ink-700 text-[11.5px]">
                <span className="truncate font-bold text-parchment">{n.label}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/40">
                  {n.deg} laços
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-ink-700">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-xl bg-ink-800 text-parchment hover:bg-gold hover:text-ink-950 font-bold text-[12px]">
            Fechar Radiografia
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal de Salvar Vista / Favoritar ---------- */
export function SaveViewModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <ModalShell title="Salvar Enquadramento de Vista" onClose={onClose} width={400}>
      <div className="space-y-4 text-[12px]">
        <p className="text-fog">
          Grave o zoom, posição da câmera e filtros de visibilidade ativos para retornar instantaneamente com um clique.
        </p>

        <div>
          <label className="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1">Nome da Vista</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
            placeholder="Ex: Foco na Cidadela, Visão Geral..."
            className="w-full bg-ink-850 border border-ink-600 rounded-xl px-3 py-2 text-parchment font-bold focus:border-gold"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-ink-700">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-xl bg-ink-800 text-fog hover:text-parchment">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
            className="px-5 py-1.5 rounded-xl bg-gold text-ink-950 font-bold hover:bg-gold-300 disabled:opacity-40 transition-colors shadow-md"
          >
            Salvar Vista
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------- Toast Notifications Container ---------- */
export interface Toast {
  id: number;
  msg: string;
  kind?: "ok" | "warn" | "err";
}

export function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-[99] space-y-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl rise-in flex items-center gap-2 font-mono text-[11px] font-bold ${
            t.kind === "warn"
              ? "bg-ember/90 border-ember text-parchment"
              : t.kind === "err"
              ? "bg-red-950/90 border-red-500 text-parchment"
              : "bg-ink-900/95 border-gold text-gold shadow-[0_0_20px_rgba(216,180,90,0.3)]"
          }`}
        >
          <span>{t.kind === "warn" ? "⚠️" : t.kind === "err" ? "❌" : "✦"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
