import type { Person } from "../model/tree";
import { houseColors, roman } from "../lib/utils";
import { Sigil } from "./Sigil";
import { IconChild, IconQuill, IconRings, IconDagger, IconPlus } from "./icons";
import { ScrollText } from 'lucide-react';
import { useWindowManager } from '../../../../../hooks/useWindowManager';

export interface CardActions {
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddPartner: (id: string) => void;
  onOpenRelationPicker?: (id: string, direction?: "top" | "bottom" | "left" | "right") => void;
}
const STATUS_META: Record<Person["status"], { dot: string; label: string }> = {
  vivo: { dot: "bg-moss", label: "Vivo" },
  falecido: { dot: "bg-blood", label: "† Falecido" },
  desconhecido: { dot: "bg-slate-400", label: "Destino incerto" },
};

export function PersonCard({
  person,
  generation,
  partnerCount,
  childCount,
  selected,
  dimmed,
  matched,
  enterDelay,
  actions,
}: {
  person: Person;
  generation: number;
  partnerCount: number;
  childCount: number;
  selected: boolean;
  dimmed: boolean;
  matched: boolean;
  enterDelay: number;
  actions: CardActions;
}) {
  const { accent } = houseColors(person.affiliation || person.name);
  const status = STATUS_META[person.status];

  return (
    <div
      data-card
      className={`group relative h-[330px] w-[224px] cursor-pointer rounded-md border bg-gradient-to-b from-ink-800 to-ink-850 text-left shadow-[0_10px_26px_rgba(0,0,0,0.45)] transition-all duration-200 card-enter
        ${selected
          ? "border-brass/80 shadow-[0_0_0_1px_rgba(201,162,39,0.5),0_16px_40px_rgba(0,0,0,0.6)]"
          : matched
            ? "border-brass/60"
            : "border-line hover:-translate-y-1 hover:border-brass/40 hover:shadow-[0_18px_38px_rgba(0,0,0,0.6)]"
        }
        ${dimmed ? "opacity-20 saturate-50" : ""}
        ${person.isDead ? "opacity-90" : ""}`}
      style={{ animationDelay: `${enterDelay}ms` }}
      onClick={(e) => {
        e.stopPropagation();
        actions.onSelect(person.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        actions.onEdit(person.id);
      }}
    >
      {/* retrato */}
      <div className="relative h-[148px] overflow-hidden rounded-t-[5px]">
        <Sigil person={person} className="h-full w-full text-[26px] transition-transform duration-300 group-hover:scale-[1.04]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ink-850 to-transparent" />

        {/* geração */}
        <span className="absolute left-2 top-2 rounded-sm border border-line/80 bg-ink-950/70 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-widest text-parchment-dim backdrop-blur-sm">
          {roman(generation)}ª
        </span>

        {/* status */}
        <span className="absolute right-2 top-2 flex items-center gap-1.5 rounded-sm border border-line/80 bg-ink-950/70 px-1.5 py-0.5 text-[10px] font-medium text-parchment-dim backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        {person.isDead && (
          <span className="absolute bottom-1.5 right-2 font-display text-xl text-blood/90">
            <IconDagger size={16} />
          </span>
        )}
      </div>

      {/* corpo */}
      <div className="flex h-[182px] flex-col gap-1 overflow-hidden px-3 pb-2.5 pt-2">
        <h3
          className="font-display text-[15px] font-bold leading-tight text-parchment"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {person.name || <span className="italic text-muted">Sem nome</span>}
          {person.isDead && <span className="text-blood"> †</span>}
        </h3>

        {person.epithet && (
          <p
            className="text-[11.5px] italic leading-snug text-muted"
            style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            “{person.epithet}”
          </p>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          <span
            className="inline-flex max-w-full items-center truncate rounded-sm px-1.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ backgroundColor: `${accent}1f`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}44` }}
          >
            {person.affiliation || "Sem casa"}
          </span>
          {person.era && (
            <span className="truncate text-[10px] text-muted/90">{person.era}</span>
          )}
        </div>

        <p
          className="mt-0.5 flex-1 font-hand text-[16px] leading-[1.15] text-parchment-dim"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {person.notes || (
            <span className="italic text-muted/70">Sem registros…</span>
          )}
        </p>

        {/* rodapé: vínculos + ações rápidas */}
        <div className="flex items-center justify-between border-t border-line/70 pt-1.5">
          <span className="flex items-center gap-2 text-[10px] font-medium text-muted">
            <span className="inline-flex items-center gap-1">
              <IconRings size={12} /> {partnerCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <IconChild size={12} /> {childCount}
            </span>
          </span>

          <span
            className={`flex items-center gap-0.5 transition-opacity duration-150 ${
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <QuickBtn title="Adicionar filho(a)" onClick={() => actions.onAddChild(person.id)}>
              <IconChild size={14} />
            </QuickBtn>
            <QuickBtn title="Adicionar parceiro(a)" onClick={() => actions.onAddPartner(person.id)}>
              <IconRings size={14} />
            </QuickBtn>
            {person.characterId ? (
              <QuickBtn
                title="Abrir ficha na Forja"
                onClick={() => {
                  const manager = useWindowManager.getState();
                  manager.setActiveCharacterId(person.characterId || null);
                  manager.setSheetScope(person.characterScope || 'campaign');
                  manager.setViewMode('sheets');
                }}
              >
                <ScrollText size={14} />
              </QuickBtn>
            ) : null}
            <QuickBtn title="Editar membro" accent onClick={() => actions.onEdit(person.id)}>
              <IconQuill size={14} />
            </QuickBtn>
          </span>
        </div>
      </div>

      {/* Pontos de conexão visual ao passar o mouse nas 4 bordas */}
      <AnchorBtn
        position="top"
        title="Adicionar Ancestral (Pai, Avô, Bisa, Tio...)"
        onClick={() => actions.onOpenRelationPicker?.(person.id, "top")}
      />
      <AnchorBtn
        position="bottom"
        title="Adicionar Descendente (Filho, Neto, Sobrinho...)"
        onClick={() => actions.onOpenRelationPicker?.(person.id, "bottom")}
      />
      <AnchorBtn
        position="left"
        title="Adicionar Parceria / Cônjuge"
        onClick={() => actions.onOpenRelationPicker?.(person.id, "left")}
      />
      <AnchorBtn
        position="right"
        title="Adicionar Relação (Amante, Amigo, Inimigo, Mentor...)"
        onClick={() => actions.onOpenRelationPicker?.(person.id, "right")}
      />

      {selected && (
        <span className="pointer-events-none absolute -inset-[3px] rounded-lg border border-brass/30 pulse-ring" />
      )}
    </div>
  );
}

function AnchorBtn({
  position,
  title,
  onClick,
}: {
  position: "top" | "bottom" | "left" | "right";
  title: string;
  onClick: () => void;
}) {
  const posCls = {
    top: "-top-3.5 left-1/2 -translate-x-1/2",
    bottom: "-bottom-3.5 left-1/2 -translate-x-1/2",
    left: "top-1/2 -left-3.5 -translate-y-1/2",
    right: "top-1/2 -right-3.5 -translate-y-1/2",
  }[position];

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute z-20 flex h-7 w-7 items-center justify-center rounded-full border border-brass/80 bg-ink-950 text-brass-bright shadow-[0_0_12px_rgba(201,162,39,0.5)] opacity-0 transition-all duration-200 hover:scale-125 hover:bg-brass hover:text-ink-950 group-hover:opacity-100 ${posCls}`}
    >
      <IconPlus size={14} />
    </button>
  );
}

function QuickBtn({
  title,
  onClick,
  accent = false,
  children,
}: {
  title: string;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-sm border p-1 transition-colors duration-150 ${
        accent
          ? "border-brass/50 bg-brass/15 text-brass-bright hover:bg-brass hover:text-ink-950"
          : "border-line bg-ink-900/80 text-parchment-dim hover:border-brass/50 hover:text-brass-bright"
      }`}
    >
      {children}
    </button>
  );
}
