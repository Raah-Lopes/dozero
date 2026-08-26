import { useState } from "react";
import type { Person } from "../model/tree";
import type { KinshipKind } from "./Modals";
import {
  IconCrown, IconChild, IconRings, IconUsers, IconHeart,
  IconShield, IconSwords, IconBookOpen, IconX, IconPlus
} from "./icons";

export interface VisualRelationPickerProps {
  person: Person;
  onSelectRelation: (relation: KinshipKind) => void;
  onClose: () => void;
  direction?: "top" | "bottom" | "left" | "right" | "center";
}

type TabKey = "ancestors" | "descendants" | "peers" | "social";

interface RelationOption {
  id: KinshipKind;
  label: string;
  desc: string;
  badge?: string;
  icon: React.ReactNode;
}

export function VisualRelationPicker({
  person,
  onSelectRelation,
  onClose,
}: VisualRelationPickerProps) {
  const [tab, setTab] = useState<TabKey>("ancestors");

  const ANCESTORS: RelationOption[] = [
    { id: "parent", label: "Pai / Mãe", desc: "1ª geração acima (Progenitor direto)", badge: "+1 Gen", icon: <IconCrown size={15} /> },
    { id: "grandparent", label: "Avô / Avó", desc: "2ª geração acima na dinastia", badge: "+2 Gen", icon: <IconCrown size={15} /> },
    { id: "great_grandparent", label: "Bisavô / Bisavó", desc: "3ª geração acima", badge: "+3 Gen", icon: <IconCrown size={15} /> },
    { id: "ancestor", label: "Tataravô / Ancestral", desc: "4ª geração ou fundador ancestral", badge: "+4 Gen", icon: <IconCrown size={15} /> },
    { id: "uncle_aunt", label: "Tio / Tia", desc: "Irmão ou irmã do progenitor", badge: "+1 Gen", icon: <IconUsers size={15} /> },
  ];

  const DESCENDANTS: RelationOption[] = [
    { id: "child", label: "Filho / Filha", desc: "Herdeiro e descendente direto", badge: "-1 Gen", icon: <IconChild size={15} /> },
    { id: "grandchild", label: "Neto / Neta", desc: "2ª geração abaixo no atlas", badge: "-2 Gen", icon: <IconChild size={15} /> },
    { id: "nephew_niece", label: "Sobrinho / Sobrinha", desc: "Descendente de irmão(ã)", badge: "-1 Gen", icon: <IconUsers size={15} /> },
  ];

  const PEERS: RelationOption[] = [
    { id: "spouse", label: "Esposo(a) / Cônjuge", desc: "Casamento dinástico no pergaminho", icon: <IconRings size={15} /> },
    { id: "sibling", label: "Irmão / Irmã", desc: "Mesma geração e pais compartilhados", icon: <IconUsers size={15} /> },
    { id: "cousin", label: "Primo(a)", desc: "Mesma geração por ramo colateral", icon: <IconUsers size={15} /> },
  ];

  const SOCIAL: RelationOption[] = [
    { id: "lover", label: "Amante / Romance", desc: "Pacto de afeto e romance secreto", icon: <IconHeart size={15} /> },
    { id: "friend", label: "Amigo / Aliado", desc: "Pacto de lealdade e armas", icon: <IconShield size={15} /> },
    { id: "enemy", label: "Inimigo / Rival", desc: "Inimizade jurada e rixa de sangue", icon: <IconSwords size={15} /> },
    { id: "mentor", label: "Mentor / Mestre", desc: "Orientador e guia de linhagem", icon: <IconBookOpen size={15} /> },
    { id: "apprentice", label: "Discípulo / Pupilo", desc: "Herdeiro de ensinamentos", icon: <IconBookOpen size={15} /> },
  ];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; list: RelationOption[] }[] = [
    { key: "ancestors", label: "Ancestrais", icon: <IconCrown size={13} />, list: ANCESTORS },
    { key: "descendants", label: "Descendentes", icon: <IconChild size={13} />, list: DESCENDANTS },
    { key: "peers", label: "Parcerias", icon: <IconRings size={13} />, list: PEERS },
    { key: "social", label: "Relações", icon: <IconSwords size={13} />, list: SOCIAL },
  ];

  const currentList = tabs.find((t) => t.key === tab)?.list ?? ANCESTORS;

  return (
    <div
      data-picker
      className="panel-enter relative z-50 w-[310px] rounded-lg border border-brass/50 bg-ink-900/98 p-3 shadow-[0_16px_45px_rgba(0,0,0,0.85),0_0_20px_rgba(201,162,39,0.18)] backdrop-blur-md text-left select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cabeçalho do Balão */}
      <div className="flex items-start justify-between gap-2 border-b border-line/80 pb-2">
        <div>
          <span className="flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-brass-bright">
            <IconPlus size={13} /> Forjar Vínculo
          </span>
          <p className="mt-0.5 text-xs text-parchment">
            Para <strong className="font-semibold text-brass-bright">{person.name}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-sm p-1 text-muted hover:border-line hover:text-parchment"
        >
          <IconX size={14} />
        </button>
      </div>

      {/* Abas */}
      <div className="mt-2 grid grid-cols-4 gap-1 rounded-sm border border-line/60 bg-ink-950/70 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-col items-center gap-1 rounded-sm py-1.5 text-[9.5px] font-bold transition-all ${
              tab === t.key
                ? "bg-brass/20 text-brass-bright shadow-sm"
                : "text-muted hover:text-parchment-dim"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Lista de Opções */}
      <div className="mt-2.5 flex max-h-[220px] flex-col gap-1 overflow-y-auto pr-0.5">
        {currentList.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectRelation(opt.id)}
            className="group flex items-center justify-between gap-2 rounded-sm border border-line/50 bg-ink-800/60 p-2 text-left transition-all hover:border-brass/60 hover:bg-brass/10 hover:translate-x-0.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ink-900 text-brass-bright ring-1 ring-line/80 group-hover:ring-brass/60 group-hover:bg-brass/20">
                {opt.icon}
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-[12px] font-bold text-parchment group-hover:text-brass-bright">
                  {opt.label}
                </div>
                <div className="truncate text-[10px] text-muted group-hover:text-parchment-dim">
                  {opt.desc}
                </div>
              </div>
            </div>
            {opt.badge && (
              <span className="shrink-0 rounded bg-brass/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brass-bright border border-brass/30">
                {opt.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
