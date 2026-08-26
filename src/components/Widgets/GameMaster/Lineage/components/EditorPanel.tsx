import { useState } from "react";
import type { FamilyTree, Person, PersonInit, RelationType, Status } from "../model/tree";
import type { AddContext } from "./Modals";
import { fileToWebpPortrait, houseColors, roman } from "../lib/utils";
import { Sigil } from "./Sigil";
import {
  IconChild, IconImage, IconLink, IconPlus, IconTrash, IconX,
} from "./icons";

const inputCls =
  "w-full rounded-sm border border-line bg-ink-800/80 px-2.5 py-1.5 text-sm text-parchment placeholder:text-muted/60 transition-colors focus:border-brass/60 focus:outline-none";

function generationOf(tree: FamilyTree, id: string, trail = new Set<string>()): number {
  if (trail.has(id)) return 1;
  const p = tree.get(id);
  if (!p) return 1;
  trail.add(id);
  const parents = p.parentIds.filter((x) => tree.has(x));
  if (parents.length > 0) {
    return Math.max(...parents.map((x) => generationOf(tree, x, trail))) + 1;
  }
  const partners = p.partnerIds.filter((x) => tree.has(x));
  if (partners.length > 0) {
    return Math.max(...partners.map((x) => generationOf(tree, x, trail)));
  }
  return 1;
}

const STATUS_OPTS: { value: Status; label: string; active: string }[] = [
  { value: "vivo", label: "Vivo", active: "border-moss/60 bg-moss/15 text-moss" },
  { value: "falecido", label: "Falecido", active: "border-blood/60 bg-blood/15 text-blood" },
  { value: "desconhecido", label: "Incerto", active: "border-slate-400/60 bg-slate-400/10 text-slate-300" },
];

export interface EditorPanelProps {
  tree: FamilyTree;
  personId: string;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<PersonInit>) => void;
  onLinkParent: (childId: string, parentId: string) => void;
  onUnlinkParent: (childId: string, parentId: string) => void;
  onLinkPartner: (a: string, b: string) => void;
  onUnlinkPartner: (a: string, b: string) => void;
  onLinkChild: (parentId: string, childId: string) => void;
  onLinkRelation: (sourceId: string, targetId: string, type: RelationType) => void;
  onUnlinkRelation: (sourceId: string, targetId: string) => void;
  onRequestAdd: (ctx: AddContext) => void;
  onRequestDelete: (id: string) => void;
  onToast: (msg: string) => void;
  onNavigate: (id: string) => void;
}

export function EditorPanel(props: EditorPanelProps) {
  const { tree, personId } = props;
  const person = tree.get(personId);
  if (!person) return null;
  return <PanelBody key={personId} {...props} person={person} />;
}

function PanelBody({
  tree,
  person,
  onClose,
  onPatch,
  onLinkParent,
  onUnlinkParent,
  onLinkPartner,
  onUnlinkPartner,
  onLinkChild,
  onLinkRelation,
  onUnlinkRelation,
  onRequestAdd,
  onRequestDelete,
  onToast,
  onNavigate,
}: EditorPanelProps & { person: Person }) {
  const [busy, setBusy] = useState(false);
  const { accent } = houseColors(person.affiliation || person.name);
  const gen = generationOf(tree, person.id);

  const parents = tree.parentsOf(person.id);
  const partners = tree.partnersOf(person.id);
  const children = tree.childrenOf(person.id);
  const siblings = tree.siblingsOf(person.id);

  const patch = (p: Partial<PersonInit>) => onPatch(person.id, p);

  const handlePortrait = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToWebpPortrait(file);
      patch({ portrait: dataUrl });
      onToast("Retrato convertido para WebP e anexado.");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Falha ao processar a imagem.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="panel-enter absolute right-0 top-0 z-30 flex h-full w-[356px] max-w-[92vw] flex-col border-l border-line bg-ink-900/95 shadow-[-24px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {/* cabeçalho */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm ring-1 ring-line">
          <Sigil person={person} className="h-full w-full text-[19px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-[16px] font-bold leading-tight text-parchment">
            {person.name}
          </h2>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            <span className="truncate" style={{ color: accent }}>
              {person.affiliation || "Sem casa"}
            </span>
            <span>·</span>
            <span>Geração {roman(gen)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="rounded-sm border border-transparent p-1.5 text-muted transition-colors hover:border-line hover:text-parchment"
        >
          <IconX size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-6">
          {/* retrato & brasão */}
          <Section title="Retrato & Brasão da Família">
            <div className="flex flex-col gap-3">
              {/* Retrato */}
              <div className="flex items-start gap-3">
                <div className="h-[96px] w-[80px] shrink-0 overflow-hidden rounded-sm ring-1 ring-line">
                  <Sigil person={person} className="h-full w-full text-[20px]" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Foto / Retrato</span>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-line bg-ink-800 px-2 py-1.5 text-[11px] font-bold text-parchment-dim transition-colors hover:border-brass/50 hover:text-brass-bright">
                    <IconImage size={13} />
                    {busy ? "Convertendo…" : person.portrait ? "Substituir foto" : "Enviar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        void handlePortrait(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {person.portrait && (
                    <button
                      type="button"
                      onClick={() => patch({ portrait: null })}
                      className="rounded-sm border border-line px-2 py-1 text-[11px] font-bold text-muted transition-colors hover:border-blood/50 hover:text-blood"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              {/* Brasão da Família */}
              <div className="flex items-center justify-between gap-2 rounded-sm border border-line/60 bg-ink-800/40 p-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brass/50 bg-ink-950">
                    {person.coatOfArms ? (
                      <img src={person.coatOfArms} alt="Brasão" className="h-full w-full object-contain p-0.5 rounded-full" />
                    ) : (
                      <span className="text-xs">🛡️</span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <div className="text-[11px] font-bold text-parchment">Brasão Heráldico</div>
                    <div className="text-[10px] text-muted">Símbolo / Emblema da casa</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer rounded-sm border border-line bg-ink-800 px-2 py-1 text-[10.5px] font-bold text-brass-bright transition-colors hover:border-brass/50">
                    {person.coatOfArms ? "Trocar" : "Adicionar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        try {
                          const dataUrl = await fileToWebpPortrait(file);
                          patch({ coatOfArms: dataUrl });
                          onToast("Brasão da família anexado.");
                        } catch {
                          onToast("Falha ao ler o brasão.");
                        }
                      }}
                    />
                  </label>
                  {person.coatOfArms && (
                    <button
                      type="button"
                      onClick={() => patch({ coatOfArms: null })}
                      className="rounded-sm p-1 text-muted hover:text-blood"
                      title="Remover brasão"
                    >
                      <IconX size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* identidade */}
          <Section title="Identidade">
            <div className="flex flex-col gap-3">
              <Field label="Nome">
                <input
                  className={inputCls}
                  value={person.name}
                  placeholder="Nome do indivíduo"
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Field label="Epíteto / título">
                <input
                  className={inputCls}
                  value={person.epithet}
                  placeholder="ex.: a Rainha Diplomata"
                  onChange={(e) => patch({ epithet: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Afiliação / casa">
                  <input
                    className={inputCls}
                    value={person.affiliation}
                    list="afiliacoes"
                    placeholder="Casa, ordem…"
                    onChange={(e) => patch({ affiliation: e.target.value })}
                  />
                </Field>
                <Field label="Era / datas">
                  <input
                    className={inputCls}
                    value={person.era}
                    placeholder="n. 142 · T.E."
                    onChange={(e) => patch({ era: e.target.value })}
                  />
                </Field>
              </div>
              <datalist id="afiliacoes">
                {tree.affiliations().map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
              <div className="grid grid-cols-[1fr_84px] gap-2.5">
                <Field label="Estado">
                  <div className="grid grid-cols-3 gap-1">
                    {STATUS_OPTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => patch({ status: s.value })}
                        className={`rounded-sm border px-1 py-1.5 text-[11px] font-bold transition-all ${
                          person.status === s.value
                            ? s.active
                            : "border-line bg-ink-800/60 text-muted hover:text-parchment-dim"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Ordem">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={person.birthOrder}
                    title="Ordem de nascimento entre irmãos"
                    onChange={(e) => patch({ birthOrder: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* notas */}
          <Section title="Notas do cronista">
            <textarea
              rows={4}
              className={`${inputCls} resize-y font-hand text-[17px] leading-snug`}
              value={person.notes}
              placeholder="Segredos, ganchos de campanha, rumores…"
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Section>

          {/* progenitores */}
          <Section title="Progenitores">
            <RelationList
              people={parents}
              emptyText="Linhagem desconhecida."
              onRemove={(pid) => onUnlinkParent(person.id, pid)}
              onNavigate={onNavigate}
            />
            <LinkRow
              label="Vincular existente"
              options={tree
                .all()
                .filter(
                  (o) =>
                    o.id !== person.id &&
                    !parents.some((x) => x.id === o.id) &&
                    !tree.isDescendant(o.id, person.id) &&
                    !children.some((x) => x.id === o.id),
                )}
              onPick={(oid) => onLinkParent(person.id, oid)}
            />
            <GhostAdd label="Criar progenitor" onClick={() => onRequestAdd({ kind: "parent", of: person.id })} />
          </Section>

          {/* parceiros */}
          <Section title="Parceiros & cônjuges">
            <RelationList
              people={partners}
              emptyText="Nenhum vínculo conjugal."
              onRemove={(pid) => onUnlinkPartner(person.id, pid)}
              onNavigate={onNavigate}
            />
            <LinkRow
              label="Vincular existente"
              options={tree
                .all()
                .filter(
                  (o) =>
                    o.id !== person.id &&
                    !partners.some((x) => x.id === o.id) &&
                    !parents.some((x) => x.id === o.id) &&
                    !children.some((x) => x.id === o.id),
                )}
              onPick={(oid) => onLinkPartner(person.id, oid)}
            />
            <GhostAdd label="Criar parceiro(a)" onClick={() => onRequestAdd({ kind: "partner", of: person.id })} />
          </Section>

          {/* filhos */}
          <Section title="Descendentes">
            <RelationList
              people={children}
              emptyText="Sem descendentes registrados."
              onRemove={(cid) => onUnlinkParent(cid, person.id)}
              onNavigate={onNavigate}
            />
            <LinkRow
              label="Vincular existente"
              options={tree
                .all()
                .filter(
                  (o) =>
                    o.id !== person.id &&
                    !children.some((x) => x.id === o.id) &&
                    !parents.some((x) => x.id === o.id) &&
                    !tree.isDescendant(person.id, o.id),
                )}
              onPick={(cid) => onLinkChild(person.id, cid)}
            />
            <GhostAdd label="Adicionar filho(a)" onClick={() => onRequestAdd({ kind: "child", of: person.id })} primary />
          </Section>

          {/* relações sociais e pactos */}
          <Section title="Pactos & Relações">
            <SocialRelationList
              tree={tree}
              person={person}
              onRemove={(targetId) => {
                onUnlinkRelation(person.id, targetId);
              }}
              onNavigate={onNavigate}
            />
            <LinkSocialRow
              tree={tree}
              person={person}
              onPick={(targetId, type) => {
                onLinkRelation(person.id, targetId, type);
              }}
            />
          </Section>

          {/* irmãos */}
          {siblings.length > 0 && (
            <Section title="Irmãos">
              <div className="flex flex-wrap gap-1.5">
                {siblings.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onNavigate(s.id)}
                    className="rounded-sm border border-line bg-ink-800/70 px-2 py-1 text-[11px] font-medium text-parchment-dim transition-colors hover:border-brass/50 hover:text-brass-bright"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* zona de perigo */}
          <div className="rounded-md border border-blood/25 bg-blood/5 p-3">
            <p className="text-[11px] leading-snug text-muted">
              Excluir remove o card e desfaz seus vínculos — descendentes passam a
              raíz própria. Você pode desfazer com Ctrl+Z.
            </p>
            <button
              type="button"
              onClick={() => onRequestDelete(person.id)}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-blood/50 px-3 py-2 text-xs font-bold text-blood transition-all hover:bg-blood/15"
            >
              <IconTrash size={14} /> Excluir membro
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- auxiliares ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2.5 flex items-center gap-2 font-display text-[10.5px] font-bold uppercase tracking-[0.22em] text-brass/85">
        {title}
        <span className="h-px flex-1 bg-line" />
      </h4>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function RelationList({
  people,
  emptyText,
  onRemove,
  onNavigate,
}: {
  people: Person[];
  emptyText: string;
  onRemove: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  if (people.length === 0) {
    return <p className="mb-2 text-[11px] italic text-muted/80">{emptyText}</p>;
  }
  return (
    <div className="mb-2 flex flex-col gap-1">
      {people.map((p) => (
        <div
          key={p.id}
          className="group flex items-center gap-2 rounded-sm border border-line bg-ink-800/70 px-2 py-1.5"
        >
          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-sm">
            <Sigil person={p} className="h-full w-full text-[9px]" />
          </div>
          <button
            type="button"
            onClick={() => onNavigate(p.id)}
            className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-parchment-dim transition-colors hover:text-brass-bright"
            title="Abrir este membro"
          >
            {p.name}
          </button>
          <button
            type="button"
            aria-label={`Desvincular ${p.name}`}
            onClick={() => onRemove(p.id)}
            className="rounded-sm p-1 text-muted opacity-0 transition-all hover:text-blood group-hover:opacity-100"
          >
            <IconX size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function LinkRow({
  label,
  options,
  onPick,
}: {
  label: string;
  options: Person[];
  onPick: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="mb-2 flex gap-1.5">
      <select
        className={`${inputCls} flex-1 appearance-none text-[12px]`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">{label}…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.affiliation ? ` · ${o.affiliation}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!value}
        onClick={() => {
          onPick(value);
          setValue("");
        }}
        className="inline-flex items-center gap-1 rounded-sm border border-line px-2.5 text-[11px] font-bold text-parchment-dim transition-colors enabled:hover:border-brass/50 enabled:hover:text-brass-bright disabled:opacity-40"
      >
        <IconLink size={12} /> Unir
      </button>
    </div>
  );
}

function GhostAdd({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-sm border px-2 py-1.5 text-[11px] font-bold transition-all ${
        primary
          ? "border-brass/50 bg-brass/10 text-brass-bright hover:bg-brass hover:text-ink-950"
          : "border-dashed border-line text-muted hover:border-brass/40 hover:text-brass-bright"
      }`}
    >
      {primary ? <IconChild size={13} /> : <IconPlus size={13} />}
      {label}
    </button>
  );
}

const RELATION_TAGS: Record<string, { label: string; bg: string; text: string }> = {
  amante: { label: "Amante", bg: "bg-rose-950/60 border-rose-600/40", text: "text-rose-300" },
  amigo: { label: "Aliado", bg: "bg-emerald-950/60 border-emerald-600/40", text: "text-emerald-300" },
  inimigo: { label: "Inimigo", bg: "bg-red-950/60 border-red-600/40", text: "text-red-300" },
  rival: { label: "Rival", bg: "bg-amber-950/60 border-amber-600/40", text: "text-amber-300" },
  mentor: { label: "Mentor", bg: "bg-blue-950/60 border-blue-600/40", text: "text-blue-300" },
  discipulo: { label: "Discípulo", bg: "bg-cyan-950/60 border-cyan-600/40", text: "text-cyan-300" },
  jurado: { label: "Jurado", bg: "bg-purple-950/60 border-purple-600/40", text: "text-purple-300" },
};

function SocialRelationList({
  tree,
  person,
  onRemove,
  onNavigate,
}: {
  tree: FamilyTree;
  person: Person;
  onRemove: (targetId: string) => void;
  onNavigate: (id: string) => void;
}) {
  const relations: { target: Person; type: string }[] = [];
  for (const r of person.relations) {
    const target = tree.get(r.targetId);
    if (target) {
      relations.push({ target, type: r.type });
    }
  }

  if (relations.length === 0) {
    return <p className="mb-2 text-[11px] italic text-muted/80">Nenhum pacto, romance ou rivalidade registrada.</p>;
  }

  return (
    <div className="mb-2 flex flex-col gap-1">
      {relations.map(({ target, type }) => {
        const tag = RELATION_TAGS[type] ?? { label: type, bg: "bg-ink-800", text: "text-parchment" };
        return (
          <div
            key={target.id}
            className="group flex items-center gap-2 rounded-sm border border-line bg-ink-800/70 px-2 py-1.5"
          >
            <span
              className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${tag.bg} ${tag.text}`}
            >
              {tag.label}
            </span>
            <button
              type="button"
              onClick={() => onNavigate(target.id)}
              className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-parchment-dim transition-colors hover:text-brass-bright"
            >
              {target.name}
            </button>
            <button
              type="button"
              aria-label={`Desvincular relação com ${target.name}`}
              onClick={() => onRemove(target.id)}
              className="rounded-sm p-1 text-muted opacity-0 transition-all hover:text-blood group-hover:opacity-100"
            >
              <IconX size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LinkSocialRow({
  tree,
  person,
  onPick,
}: {
  tree: FamilyTree;
  person: Person;
  onPick: (targetId: string, type: RelationType) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState<RelationType>("amigo");

  const candidates = tree
    .all()
    .filter((o) => o.id !== person.id && !person.relations.some((r) => r.targetId === o.id));

  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <select
          className={`${inputCls} flex-1 appearance-none text-[11px]`}
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Selecionar indivíduo…</option>
          {candidates.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          className={`${inputCls} w-[100px] appearance-none text-[11px] font-bold text-brass-bright`}
          value={type}
          onChange={(e) => setType(e.target.value as RelationType)}
        >
          <option value="amante">Amante</option>
          <option value="amigo">Aliado</option>
          <option value="inimigo">Inimigo</option>
          <option value="rival">Rival</option>
          <option value="mentor">Mentor</option>
          <option value="discipulo">Discípulo</option>
        </select>
      </div>
      <button
        type="button"
        disabled={!targetId}
        onClick={() => {
          onPick(targetId, type);
          setTargetId("");
        }}
        className="inline-flex items-center justify-center gap-1 rounded-sm border border-line py-1 text-[11px] font-bold text-parchment-dim transition-colors enabled:hover:border-brass/50 enabled:hover:text-brass-bright disabled:opacity-40"
      >
        <IconLink size={12} /> Selar Pacto / Vínculo
      </button>
    </div>
  );
}
