import { useEffect, useState } from "react";
import type { FamilyTree, Status } from "../model/tree";
import { copyText, downloadText, fileToWebpPortrait } from "../lib/utils";
import { IconCheck, IconData, IconImage, IconUpload, IconX } from "./icons";

/* ---------------- tipos compartilhados ---------------- */

export type KinshipKind =
  // Ancestrais (Hierarquia Superior)
  | "parent"
  | "grandparent"
  | "great_grandparent"
  | "ancestor"
  | "uncle_aunt"
  // Descendentes (Hierarquia Inferior)
  | "child"
  | "grandchild"
  | "nephew_niece"
  // Mesma Geração
  | "partner"
  | "spouse"
  | "sibling"
  | "cousin"
  // Relações Especiais / Sociais
  | "lover"
  | "friend"
  | "enemy"
  | "rival"
  | "mentor"
  | "apprentice";

export type AddContext =
  | { kind: "root" }
  | { kind: "child"; of: string }
  | { kind: "partner"; of: string }
  | { kind: "parent"; of: string }
  | { kind: "extended"; of: string; relation: KinshipKind };

export interface NewPersonData {
  name: string;
  epithet: string;
  affiliation: string;
  era: string;
  status: Status;
  notes: string;
  portrait: string | null;
  coatOfArms: string | null;
  alsoPartner: boolean;
}
/* ---------------- casca de modal ---------------- */

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-[3px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`panel-enter w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-lg border border-line bg-ink-850 shadow-[0_30px_80px_rgba(0,0,0,0.7)]`}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="font-display text-lg font-bold tracking-wide text-parchment">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs leading-snug text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-sm border border-transparent p-1.5 text-muted transition-colors hover:border-line hover:text-parchment"
          >
            <IconX size={16} />
          </button>
        </header>
        <div className="px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- criar membro ---------------- */

const inputCls =
  "w-full rounded-sm border border-line bg-ink-800/80 px-2.5 py-2 text-sm text-parchment placeholder:text-muted/60 transition-colors focus:border-brass/60 focus:outline-none";

const KINSHIP_LABELS: Record<KinshipKind, { title: string; subtitle: string }> = {
  parent: { title: "Progenitor(a)", subtitle: "Ancestral direto (1ª geração acima)" },
  grandparent: { title: "Avô / Avó", subtitle: "2ª geração acima na linhagem" },
  great_grandparent: { title: "Bisavô / Bisavó", subtitle: "3ª geração acima na linhagem" },
  ancestor: { title: "Tataravô / Ancestral Antigo", subtitle: "4ª geração ou anterior na dinastia" },
  uncle_aunt: { title: "Tio / Tia", subtitle: "Irmão ou irmã de um progenitor" },
  child: { title: "Filho(a)", subtitle: "Descendente direto no atlas" },
  grandchild: { title: "Neto(a)", subtitle: "2ª geração de descendentes abaixo" },
  nephew_niece: { title: "Sobrinho(a)", subtitle: "Filho(a) de irmão ou irmã" },
  partner: { title: "Parceiro(a)", subtitle: "Vínculo de companheirismo" },
  spouse: { title: "Cônjuge / Esposo(a)", subtitle: "Casamento dinástico no mesmo nível" },
  sibling: { title: "Irmão / Irmã", subtitle: "Mesma linhagem e progenitores" },
  cousin: { title: "Primo(a)", subtitle: "Mesma geração por ramo colateral" },
  lover: { title: "Amante / Romance", subtitle: "Vínculo íntimo / romance secreto" },
  friend: { title: "Amigo(a) / Aliado(a)", subtitle: "Aliança juramentada de honra" },
  enemy: { title: "Inimigo(a) / Rival", subtitle: "Inimizade jurada e rixa mortal" },
  rival: { title: "Rival Dinástico", subtitle: "Disputa de sucessão e poder" },
  mentor: { title: "Mentor(a) / Mestre", subtitle: "Orientador e mestre espiritual/marcial" },
  apprentice: { title: "Discípulo(a) / Pupilo", subtitle: "Aprendiz de seus ensinamentos" },
};

function contextTitle(ctx: AddContext, tree: FamilyTree): { title: string; subtitle: string } {
  const name = (id: string) => tree.get(id)?.name ?? "—";
  switch (ctx.kind) {
    case "root":
      return {
        title: "Novo fundador",
        subtitle: "Uma nova raiz para a floresta de linhagens.",
      };
    case "child":
      return {
        title: `Filho(a) de ${name(ctx.of)}`,
        subtitle: "O novo card entra como descendente direto.",
      };
    case "partner":
      return {
        title: `Par de ${name(ctx.of)}`,
        subtitle: "Vínculo conjugal ou de parceria, lado a lado no pergaminho.",
      };
    case "parent":
      return {
        title: `Progenitor(a) de ${name(ctx.of)}`,
        subtitle: "O novo card entra como ancestral direto.",
      };
    case "extended": {
      const meta = KINSHIP_LABELS[ctx.relation] ?? { title: "Parente / Vínculo", subtitle: "" };
      return {
        title: `${meta.title} de ${name(ctx.of)}`,
        subtitle: meta.subtitle,
      };
    }
  }
}

export function AddMemberModal({
  context,
  tree,
  onClose,
  onCreate,
}: {
  context: AddContext;
  tree: FamilyTree;
  onClose: () => void;
  onCreate: (data: NewPersonData) => void;
}) {
  const [name, setName] = useState("");
  const [epithet, setEpithet] = useState("");
  const [affiliation, setAffiliation] = useState(
    context.kind !== "root" ? tree.get(context.of)?.affiliation ?? "" : "",
  );
  const [era, setEra] = useState("");
  const [status, setStatus] = useState<Status>("vivo");
  const [notes, setNotes] = useState("");
  const [portrait, setPortrait] = useState<string | null>(null);
  const [coatOfArms, setCoatOfArms] = useState<string | null>(null);
  const [alsoPartner, setAlsoPartner] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const { title, subtitle } = contextTitle(context, tree);
  const partner =
    context.kind === "child" ? tree.partnersOf(context.of)[0] ?? null : null;

  const handleFile = async (file: File | undefined, isCoat = false) => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fileToWebpPortrait(file);
      if (isCoat) setCoatOfArms(res);
      else setPortrait(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao ler a imagem.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, epithet, affiliation, era, status, notes, portrait, coatOfArms, alsoPartner });
  };

  return (
    <ModalShell title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex gap-3">
          <label
            className="group relative flex h-[88px] w-[72px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-dashed border-line bg-ink-800/60 transition-colors hover:border-brass/50"
            title="Enviar retrato (convertido para WebP)"
          >
            {portrait ? (
              <img src={portrait} alt="Retrato" className="h-full w-full object-cover object-top" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted/70">
                <IconImage size={18} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {busy ? "…" : "Retrato"}
                </span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0], false);
                e.target.value = "";
              }}
            />
            {portrait && (
              <span className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-0.5 text-center text-[9px] font-bold text-brass-bright opacity-0 transition-opacity group-hover:opacity-100">
                Trocar
              </span>
            )}
          </label>

          {/* Brasão opcional no modal */}
          <label
            className="group relative flex h-[88px] w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-dashed border-line bg-ink-800/60 transition-colors hover:border-brass/50"
            title="Enviar brasão heráldico da família"
          >
            {coatOfArms ? (
              <img src={coatOfArms} alt="Brasão" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted/70">
                <span className="text-base">🛡️</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-center">
                  {busy ? "…" : "Brasão"}
                </span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0], true);
                e.target.value = "";
              }}
            />
            {coatOfArms && (
              <span className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-0.5 text-center text-[8px] font-bold text-brass-bright opacity-0 transition-opacity group-hover:opacity-100">
                Trocar
              </span>
            )}
          </label>
          <div className="flex flex-1 flex-col gap-2">
            <input
              autoFocus
              className={`${inputCls} font-display text-[15px] font-bold`}
              placeholder="Nome *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Epíteto — “o Príncipe Pálido”"
              value={epithet}
              onChange={(e) => setEpithet(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="Afiliação / casa"
                list="afiliacoes-modal"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
              />
              <input
                className={`${inputCls} w-[42%]`}
                placeholder="Era"
                value={era}
                onChange={(e) => setEra(e.target.value)}
              />
            </div>
            <datalist id="afiliacoes-modal">
              {tree.affiliations().map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {(["vivo", "falecido", "desconhecido"] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-sm border px-2 py-1.5 text-[11px] font-bold capitalize transition-all ${
                status === s
                  ? "border-brass/60 bg-brass/15 text-brass-bright"
                  : "border-line bg-ink-800/60 text-muted hover:text-parchment-dim"
              }`}
            >
              {s === "desconhecido" ? "Incerto" : s}
            </button>
          ))}
        </div>

        <textarea
          rows={2}
          className={`${inputCls} resize-none font-hand text-[16px]`}
          placeholder="Nota do cronista…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {partner && (
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-ink-800/60 px-2.5 py-2 text-[12px] text-parchment-dim">
            <input
              type="checkbox"
              checked={alsoPartner}
              onChange={(e) => setAlsoPartner(e.target.checked)}
              className="accent-[#c9a227]"
            />
            Também descendente de <strong className="text-parchment">{partner.name}</strong>
          </label>
        )}

        {err && <p className="text-[11px] font-medium text-blood">{err}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-line px-3.5 py-2 text-xs font-bold text-muted transition-colors hover:text-parchment"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="rounded-sm bg-brass px-4 py-2 font-display text-xs font-bold tracking-wide text-ink-950 transition-all enabled:hover:bg-brass-bright disabled:opacity-40"
          >
            Forjar membro
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------- confirmação ---------------- */

export function ConfirmModal({
  title,
  body,
  confirmLabel,
  tone = "danger",
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  tone?: "danger" | "brass";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-parchment-dim">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-line px-3.5 py-2 text-xs font-bold text-muted transition-colors hover:text-parchment"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-sm px-4 py-2 font-display text-xs font-bold tracking-wide transition-all ${
            tone === "danger"
              ? "bg-blood text-parchment hover:brightness-110"
              : "bg-brass text-ink-950 hover:bg-brass-bright"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------------- dados: importar / exportar ---------------- */

export function DataModal({
  tree,
  initialMode,
  onClose,
  onImport,
}: {
  tree: FamilyTree;
  initialMode: "export" | "import";
  onClose: () => void;
  onImport: (json: string) => string | null;
}) {
  const [mode, setMode] = useState(initialMode);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const exported = JSON.stringify(tree.toJSON(), null, 2);

  const runImport = (json: string) => {
    const err = onImport(json);
    setError(err ?? "");
  };

  return (
    <ModalShell
      title="Dados da linhagem"
      subtitle="Leve sua dinastia para outra mesa — ou traga uma de volta."
      onClose={onClose}
      wide
    >
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-sm border border-line bg-ink-900/70 p-1">
        {(["export", "import"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError("");
            }}
            className={`rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-all ${
              mode === m
                ? "bg-brass/15 text-brass-bright"
                : "text-muted hover:text-parchment-dim"
            }`}
          >
            {m === "export" ? "Exportar" : "Importar"}
          </button>
        ))}
      </div>

      {mode === "export" ? (
        <>
          <textarea
            readOnly
            value={exported}
            rows={10}
            spellCheck={false}
            className="w-full rounded-sm border border-line bg-ink-950/80 p-2.5 font-mono text-[10.5px] leading-relaxed text-parchment-dim focus:outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                void copyText(exported).then((ok) => {
                  setCopied(ok);
                  setTimeout(() => setCopied(false), 1600);
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-2 text-xs font-bold text-parchment-dim transition-colors hover:border-brass/50 hover:text-brass-bright"
            >
              {copied ? <IconCheck size={13} /> : <IconData size={13} />}
              {copied ? "Copiado!" : "Copiar JSON"}
            </button>
            <button
              type="button"
              onClick={() => downloadText("linhagem.json", exported)}
              className="rounded-sm bg-brass px-4 py-2 font-display text-xs font-bold tracking-wide text-ink-950 transition-all hover:bg-brass-bright"
            >
              Baixar .json
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            spellCheck={false}
            placeholder="Cole aqui o JSON de um atlas exportado…"
            className="w-full rounded-sm border border-line bg-ink-950/80 p-2.5 font-mono text-[10.5px] leading-relaxed text-parchment placeholder:text-muted/50 focus:border-brass/60 focus:outline-none"
          />
          {error && <p className="mt-2 text-[11px] font-medium text-blood">{error}</p>}
          <div className="mt-3 flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-line px-3 py-2 text-xs font-bold text-parchment-dim transition-colors hover:border-brass/50 hover:text-brass-bright">
              <IconUpload size={13} /> Arquivo .json
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  void f.text().then((t) => {
                    setText(t);
                    runImport(t);
                  });
                }}
              />
            </label>
            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => runImport(text)}
              className="rounded-sm bg-brass px-4 py-2 font-display text-xs font-bold tracking-wide text-ink-950 transition-all enabled:hover:bg-brass-bright disabled:opacity-40"
            >
              Importar linhagem
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
