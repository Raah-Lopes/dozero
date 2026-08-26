import { useEffect, useMemo, useRef, useState } from "react";
import { FamilyTree, Person } from "./model/tree";
import type { PersonInit } from "./model/tree";
import { buildSample } from "./model/sample";
import { loadSavedTree, saveTree, uid } from "./lib/utils";
import { TreeView } from "./components/TreeView";
import { EditorPanel } from "./components/EditorPanel";
import { AddMemberModal, ConfirmModal, DataModal } from "./components/Modals";
import type { AddContext, NewPersonData } from "./components/Modals";
import { Embers, HintBar, StatsBar, Toasts, Toolbar } from "./components/Chrome";
import type { ToastItem } from "./components/Chrome";

interface ConfirmState {
  title: string;
  body: string;
  label: string;
  tone: "danger" | "brass";
  action: () => void;
}

interface AppProps {
  roomCode?: string;
  initialTree?: FamilyTree;
  onTreeChange?: (tree: FamilyTree) => void;
  onClose?: () => void;
  syncLabel?: string;
}

export default function App({ roomCode, initialTree, onTreeChange, onClose, syncLabel }: AppProps) {
  /* ---------- estado raiz ---------- */
  const [boot] = useState(() => {
    const saved = initialTree ?? loadSavedTree(roomCode);
    return { tree: saved ?? buildSample(), fresh: saved === null };
  });
  const [tree, setTree] = useState<FamilyTree>(boot.tree);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addCtx, setAddCtx] = useState<AddContext | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [dataOpen, setDataOpen] = useState<false | "export" | "import">(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  const toastId = useRef(0);

  /* ---------- toasts ---------- */
  const toast = (msg: string, tone: ToastItem["tone"] = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  };

  /* ---------- histórico + commit ---------- */
  const commit = (next: FamilyTree) => {
    setPast((p) => [...p.slice(-49), tree.serialize()]);
    setFuture([]);
    setTree(next);
  };

  const undo = () => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [tree.serialize(), ...f.slice(0, 49)]);
      setTree(FamilyTree.from(JSON.parse(prev)));
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setPast((p) => [...p.slice(-49), tree.serialize()]);
      setTree(FamilyTree.from(JSON.parse(next)));
      return rest;
    });
  };

  /* ---------- persistência ---------- */
  useEffect(() => {
    saveTree(tree, roomCode);
    onTreeChange?.(tree);
  }, [tree, roomCode, onTreeChange]);

  useEffect(() => {
    if (boot.fresh) {
      toast("A Casa Valdris foi carregada como exemplo — edite à vontade.", "info");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- busca ---------- */
  const q = query.trim().toLowerCase();
  const matchedIds = useMemo(() => {
    if (!q) return null;
    const set = new Set<string>();
    for (const p of tree.all()) {
      const hay = `${p.name} ${p.epithet} ${p.affiliation} ${p.notes} ${p.era}`.toLowerCase();
      if (hay.includes(q)) set.add(p.id);
    }
    return set;
  }, [tree, q]);

  const focusFirst = () => {
    if (!matchedIds || matchedIds.size === 0) return;
    setFocus({ id: matchedIds.values().next().value as string, n: Date.now() });
  };

  /* ---------- mutações de domínio ---------- */
  const createPerson = (data: NewPersonData, ctx: AddContext) => {
    const init: PersonInit = {
      id: uid(),
      name: data.name,
      epithet: data.epithet,
      affiliation: data.affiliation,
      era: data.era,
      status: data.status,
      notes: data.notes,
      portrait: data.portrait,
      coatOfArms: data.coatOfArms,
    };
    let next: FamilyTree = tree;
    const newPerson = new Person(init);

    switch (ctx.kind) {
      case "root":
        next = tree.add(newPerson);
        break;

      case "child": {
        const parentIds = [ctx.of];
        if (data.alsoPartner) {
          const partner = tree.partnersOf(ctx.of)[0];
          if (partner) parentIds.push(partner.id);
        }
        next = tree.add(new Person({ ...init, parentIds }));
        break;
      }

      case "partner":
        next = tree.add(newPerson).linkPartner(ctx.of, init.id);
        break;

      case "parent":
        next = tree.add(newPerson).linkParent(ctx.of, init.id);
        break;

      case "extended": {
        const ofPerson = tree.get(ctx.of);
        if (!ofPerson) {
          next = tree.add(newPerson);
          break;
        }

        switch (ctx.relation) {
          // --- Ancestrais (Hierarquia Superior) ---
          case "parent":
            next = tree.add(newPerson).linkParent(ctx.of, init.id);
            break;

          case "grandparent": {
            // Se a pessoa tiver pais, vincula ao primeiro pai. Se não tiver, cria o progenitor intermediário ou liga diretamente
            const parents = tree.parentsOf(ctx.of);
            if (parents.length > 0) {
              next = tree.add(newPerson).linkParent(parents[0].id, init.id);
            } else {
              // Cria progenitor intermediário para manter a cadeia geracional correta
              const intermediateParentId = uid("gen");
              const interPerson = new Person({
                id: intermediateParentId,
                name: `Linhagem de ${ofPerson.name}`,
                affiliation: ofPerson.affiliation,
                notes: "Progenitor elo da linhagem",
              });
              next = tree
                .add(interPerson)
                .linkParent(ctx.of, intermediateParentId)
                .add(newPerson)
                .linkParent(intermediateParentId, init.id);
            }
            break;
          }

          case "great_grandparent": {
            const parents = tree.parentsOf(ctx.of);
            let targetForGreat = ctx.of;
            if (parents.length > 0) {
              const grandparents = tree.parentsOf(parents[0].id);
              if (grandparents.length > 0) {
                targetForGreat = grandparents[0].id;
              } else {
                targetForGreat = parents[0].id;
              }
            }
            next = tree.add(newPerson).linkParent(targetForGreat, init.id);
            break;
          }

          case "ancestor": {
            // Conecta no topo mais alto da linhagem encontrada
            let current = ofPerson;
            while (true) {
              const pList = tree.parentsOf(current.id);
              if (pList.length > 0) {
                current = pList[0];
              } else {
                break;
              }
            }
            next = tree.add(newPerson).linkParent(current.id, init.id);
            break;
          }

          case "uncle_aunt": {
            // Tio: Irmão de um dos pais
            const parents = tree.parentsOf(ctx.of);
            if (parents.length > 0) {
              const grandParents = tree.parentsOf(parents[0].id);
              const parentIds = grandParents.map((g) => g.id);
              next = tree.add(new Person({ ...init, parentIds }));
            } else {
              const parentId = uid("gen");
              const parentObj = new Person({
                id: parentId,
                name: `Casa de ${ofPerson.name}`,
                affiliation: ofPerson.affiliation,
              });
              next = tree
                .add(parentObj)
                .linkParent(ctx.of, parentId)
                .add(new Person({ ...init, parentIds: [parentId] }));
            }
            break;
          }

          // --- Descendentes (Hierarquia Inferior) ---
          case "child":
            next = tree.add(new Person({ ...init, parentIds: [ctx.of] }));
            break;

          case "grandchild": {
            const children = tree.childrenOf(ctx.of);
            if (children.length > 0) {
              next = tree.add(new Person({ ...init, parentIds: [children[0].id] }));
            } else {
              // Cria filho intermediário
              const childId = uid("gen");
              const interChild = new Person({
                id: childId,
                name: `Herdeiro de ${ofPerson.name}`,
                affiliation: ofPerson.affiliation,
                parentIds: [ctx.of],
              });
              next = tree
                .add(interChild)
                .add(new Person({ ...init, parentIds: [childId] }));
            }
            break;
          }

          case "nephew_niece": {
            const siblings = tree.siblingsOf(ctx.of);
            if (siblings.length > 0) {
              next = tree.add(new Person({ ...init, parentIds: [siblings[0].id] }));
            } else {
              // Cria um irmão primeiro
              const siblingId = uid("gen");
              const sibObj = new Person({
                id: siblingId,
                name: `Irmão de ${ofPerson.name}`,
                affiliation: ofPerson.affiliation,
                parentIds: [...ofPerson.parentIds],
              });
              next = tree
                .add(sibObj)
                .add(new Person({ ...init, parentIds: [siblingId] }));
            }
            break;
          }

          // --- Mesma Geração ---
          case "partner":
          case "spouse":
            next = tree.add(newPerson).linkPartner(ctx.of, init.id);
            break;

          case "sibling":
            next = tree.add(new Person({ ...init, parentIds: [...ofPerson.parentIds] }));
            break;

          case "cousin": {
            // Primo: filho de um tio
            const parents = tree.parentsOf(ctx.of);
            if (parents.length > 0) {
              const uncle = tree.siblingsOf(parents[0].id)[0];
              if (uncle) {
                next = tree.add(new Person({ ...init, parentIds: [uncle.id] }));
                break;
              }
            }
            next = tree.add(newPerson);
            break;
          }

          // --- Relações Sociais / Especiais ---
          case "lover":
            next = tree.add(newPerson).linkRelation(ctx.of, init.id, "amante", "Romance");
            break;

          case "friend":
            next = tree.add(newPerson).linkRelation(ctx.of, init.id, "amigo", "Aliança jurada");
            break;

          case "enemy":
            next = tree.add(newPerson).linkRelation(ctx.of, init.id, "inimigo", "Rivalidade de sangue");
            break;

          case "rival":
            next = tree.add(newPerson).linkRelation(ctx.of, init.id, "rival", "Disputa dinástica");
            break;

          case "mentor":
            next = tree.add(newPerson).linkRelation(init.id, ctx.of, "mentor", "Mestre e orientador");
            break;

          case "apprentice":
            next = tree.add(newPerson).linkRelation(ctx.of, init.id, "mentor", "Discípulo");
            break;
        }
        break;
      }
    }
    commit(next);
    setSelectedId(init.id);
    setFocus({ id: init.id, n: Date.now() });
    setAddCtx(null);
    toast(`${new Person(init).name} entrou para a linhagem.`);
  };

  const patchPerson = (id: string, patch: Partial<PersonInit>) => {
    commit(tree.update(id, patch));
  };

  const requestDelete = (id: string) => {
    const p = tree.get(id);
    if (!p) return;
    setConfirm({
      title: "Excluir membro",
      body: `“${p.name}” será removido do atlas e todos os seus vínculos desfeitos. Descendentes passam a formar raízes próprias.`,
      label: "Excluir",
      tone: "danger",
      action: () => {
        commit(tree.remove(id));
        setSelectedId(null);
        toast("Membro removido — Ctrl+Z desfaz.", "err");
      },
    });
  };

  const loadSample = () => {
    commit(buildSample());
    setSelectedId(null);
    toast("A saga da Casa Valdris renasceu no pergaminho.", "info");
  };

  const newTree = () => {
    setConfirm({
      title: "Nova árvore em branco",
      body: `O atlas atual (${tree.size} membros) será substituído por um pergaminho em branco. Exporte o JSON antes, se quiser guardá-lo — e Ctrl+Z ainda desfaz.`,
      label: "Começar do zero",
      tone: "brass",
      action: () => {
        commit(FamilyTree.empty());
        setSelectedId(null);
        setQuery("");
        toast("Pergaminho em branco pronto.", "info");
      },
    });
  };

  const importJson = (json: string): string | null => {
    try {
      const imported = FamilyTree.from(JSON.parse(json));
      commit(imported);
      setSelectedId(null);
      setDataOpen(false);
      toast(`Linhagem importada: ${imported.size} membros.`);
      return null;
    } catch (err) {
      if (err instanceof SyntaxError) return "JSON inválido — verifique o texto colado.";
      return err instanceof Error ? err.message : "Falha ao importar.";
    }
  };

  /* ---------- atalhos de teclado ---------- */
  const kb = useRef({ undo, redo, requestDelete, selectedId, modalOpen: false, clearSelection: () => {} });
  useEffect(() => {
    kb.current = {
      undo,
      redo,
      requestDelete,
      selectedId,
      modalOpen: addCtx !== null || confirm !== null || dataOpen !== false,
      clearSelection: () => setSelectedId(null),
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const editable =
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
      if (e.key === "Escape") {
        // modais fecham a si mesmos; sem modal aberto, Esc limpa a seleção
        if (kb.current.modalOpen) return;
        kb.current.clearSelection();
        return;
      }
      if (editable || kb.current.modalOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) kb.current.redo();
        else kb.current.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        kb.current.redo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && kb.current.selectedId) {
        e.preventDefault();
        kb.current.requestDelete(kb.current.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stats = useMemo(() => tree.stats(), [tree]);

  /* ---------- render ---------- */
  return (
    <div className="relative flex h-full flex-col">
      <Embers />

      <Toolbar
        query={query}
        onQuery={setQuery}
        matchCount={matchedIds?.size ?? 0}
        onFocusFirst={focusFirst}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onNew={newTree}
        onData={() => setDataOpen("export")}
        onAddRoot={() => setAddCtx({ kind: "root" })}
        onClose={onClose}
        syncLabel={syncLabel}
      />

      <main className="relative z-10 min-h-0 flex-1">
        <TreeView
          tree={tree}
          selectedId={selectedId}
          matchedIds={matchedIds}
          focus={focus}
          onSelect={setSelectedId}
          onEdit={(id) => setSelectedId(id)}
          onAddChild={(id) => setAddCtx({ kind: "child", of: id })}
          onAddPartner={(id) => setAddCtx({ kind: "partner", of: id })}
          onAddExtendedRelation={(sourceId, relation) => {
            setAddCtx({ kind: "extended", of: sourceId, relation });
          }}
          onAddFounder={() => setAddCtx({ kind: "root" })}
          onLoadSample={loadSample}
        />

        {selectedId && (
          <EditorPanel
            key={selectedId}
            tree={tree}
            personId={selectedId}
            onClose={() => setSelectedId(null)}
            onPatch={patchPerson}
            onLinkParent={(childId, parentId) => {
              commit(tree.linkParent(childId, parentId));
              toast("Vínculo de linhagem registrado.");
            }}
            onUnlinkParent={(childId, parentId) => {
              commit(tree.unlinkParent(childId, parentId));
              toast("Vínculo de linhagem desfeito.", "info");
            }}
            onLinkPartner={(a, b) => {
              commit(tree.linkPartner(a, b));
              toast("Parceria selada diante dos deuses.");
            }}
            onUnlinkPartner={(a, b) => {
              commit(tree.unlinkPartner(a, b));
              toast("Parceria dissolvida.", "info");
            }}
            onLinkChild={(parentId, childId) => {
              commit(tree.linkParent(childId, parentId));
              toast("Descendente vinculado.");
            }}
            onLinkRelation={(sourceId, targetId, type) => {
              commit(tree.linkRelation(sourceId, targetId, type));
              toast("Pacto registrado nos dois lados da linhagem.");
            }}
            onUnlinkRelation={(sourceId, targetId) => {
              commit(tree.unlinkRelation(sourceId, targetId));
              toast("Pacto desfeito nos dois lados.", "info");
            }}
            onRequestAdd={setAddCtx}
            onRequestDelete={requestDelete}
            onToast={(msg) => toast(msg, "info")}
            onNavigate={(id) => {
              setSelectedId(id);
              setFocus({ id, n: Date.now() });
            }}
          />
        )}

        {tree.size > 0 && <StatsBar stats={stats} />}
        <HintBar />
      </main>

      <Toasts toasts={toasts} />

      {addCtx && (
        <AddMemberModal
          context={addCtx}
          tree={tree}
          onClose={() => setAddCtx(null)}
          onCreate={(data) => createPerson(data, addCtx)}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.label}
          tone={confirm.tone}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.action();
            setConfirm(null);
          }}
        />
      )}

      {dataOpen && (
        <DataModal
          tree={tree}
          initialMode={dataOpen}
          onClose={() => setDataOpen(false)}
          onImport={importJson}
        />
      )}
    </div>
  );
}
