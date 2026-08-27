import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CodexFolder,
  CodexNote,
  CodexRelation,
  CodexSavedView,
  CodexType,
  createCodexNote,
  deleteCodexFolder,
  deleteCodexNote,
  deleteCodexType,
  filterCodexNotes,
  initialFieldValuesForType,
  upsertCodexFolder,
  upsertCodexRelation,
} from './codexModel';
import { useCampaignCodex } from './useCampaignCodex';
import './codex.css';
import { CreatureForge } from './CreatureForge';
import { CodexGraphView } from './CodexGraphView';
import { CodexStatsView } from './CodexStatsView';
import { CodexExportModal } from './CodexExportModal';
import { CodexTypeModal } from './CodexTypeModal';
import {
  migrateMarkdownFiles,
  parseCodexImport,
  parseCodexNoteImport,
  serializeCodex,
  serializeCodexNote,
} from './codexTools';
import { useCodexAccess } from './useCodexAccess';
import { convertImageToWebP } from '../../../utils/imageUtils';
import { uploadToSupabaseStorage } from '../../../services/storageService';
import { state } from '../../../services/yjs';
import { addChronosEvent, getChronosEvents } from '../../../store/world';
import { FamilyTree } from '../../Widgets/GameMaster/Lineage/model/tree';
import { Icone, SeloTipo } from './CodexIcons';
import { useWindowManager } from '../../../hooks/useWindowManager';
import { WorkspaceChrome } from '../../Navigation/WorkspaceChrome';
import {
  CLS_BOTAO_AMBAR,
  CLS_BOTAO_FANTASMA,
  CLS_INPUT,
  CLS_ROTULO,
  PontoCor,
  useForaClique,
} from './CodexUI';

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

type ViewMode = 'grade' | 'lista' | 'grafo' | 'stats' | 'forja';

const SUGESTOES_RELACAO = [
  'Aliado de',
  'Inimigo de',
  'Membro de',
  'Líder de',
  'Localizado em',
  'Originário de',
  'Portador de',
  'Criador de',
  'Servo de',
  'Mestre de',
  'Irmão de',
  'Descendente de',
  'Guardião de',
  'Caçador de',
  'Cultista de',
  'Rival de',
];

const CORES_PRESET = [
  '#e07b4f', '#d05f5f', '#e3b64f', '#f0d98c', '#74b183', '#8f9e63',
  '#5fbfae', '#6fa8d8', '#a78bd8', '#d98fae', '#a9a294', '#c2b49a',
];

const ICONES_TIPO_SELECAO = [
  'espada', 'mapa', 'ampulheta', 'gema', 'pata', 'olho',
  'escudo', 'sol', 'usuarios', 'livro', 'trilha', 'faiscas',
  'raio', 'coroa', 'caveira', 'caldeirao', 'pergaminho', 'bussola',
];

const ROTULO_CAMPO_TIPO: Record<string, string> = {
  text: 'Texto',
  longtext: 'Parágrafo',
  number: 'Número',
  select: 'Escolha',
  url: 'Link',
  list: 'Lista',
};

const OPCOES_COLUNAS: Array<3 | 4 | 5 | 6> = [3, 4, 5, 6];

function formatarDataCurta(isoString: string) {
  try {
    const d = new Date(isoString);
    const dia = d.getDate();
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mes = meses[d.getMonth()] || '';
    return `${dia} de ${mes}.`;
  } catch {
    return '';
  }
}

function MiniColunas({ n }: { n: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const w = 12 / n - 1.4;
        return <rect key={i} x={1 + i * (w + 1.4)} y={2} width={w} height={10} rx={1} />;
      })}
    </svg>
  );
}

function ArteMarcador({ nota, cor, icone }: { nota: CodexNote; cor: string; icone: string }) {
  const iniciais = nota.name
    .replace(/[^a-zA-ZÀ-ú0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(150deg, ${cor}30, rgba(21,18,14,0.1) 65%), #272117` }}
    >
      <span
        className="font-display pointer-events-none absolute -bottom-7 -right-2 select-none text-[110px] font-black leading-none"
        style={{ color: `${cor}1f` }}
      >
        {iniciais || '?'}
      </span>
      <span style={{ color: cor }} className="drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]">
        <Icone nome={nota.icon || icone} tam={46} />
      </span>
    </div>
  );
}

function readLineagePeople() {
  const raw = state.lineage.get('atlas');
  if (typeof raw !== 'string') return [];
  try {
    return FamilyTree.from(JSON.parse(raw)).all();
  } catch {
    return [];
  }
}

interface CodexWorkspaceProps {
  initialFile?: string | null;
  onOpenLegacy?: () => void;
  onOpenBrain?: () => void;
  onOpenLineage?: () => void;
  onOpenChronicle?: () => void;
  onClose?: () => void;
}

export function CodexWorkspace({
  initialFile,
  onOpenLegacy,
  onOpenBrain,
  onOpenLineage,
  onOpenChronicle,
  onClose,
}: CodexWorkspaceProps) {
  const { document, update } = useCampaignCodex();
  const roomCode = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
  const { canEdit } = useCodexAccess(roomCode);
  const { toggleWindow, setViewMode: setAppViewMode } = useWindowManager();

  const handleOpenBrain = () => {
    if (onOpenBrain) onOpenBrain();
    else setAppViewMode('brain');
  };

  const handleOpenLineage = () => {
    if (onOpenLineage) onOpenLineage();
    else toggleWindow('lineage');
  };

  const handleOpenChronicle = () => {
    if (onOpenChronicle) onOpenChronicle();
    else toggleWindow('chronicle');
  };

  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState<string>('all');
  const [folderId, setFolderId] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grade');
  const [columns, setColumns] = useState<3 | 4 | 5 | 6>(() => {
    const saved = Number(window.localStorage.getItem('dozero:codex-columns'));
    return (saved >= 3 && saved <= 6 ? saved : 3) as 3 | 4 | 5 | 6;
  });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [exportingNote, setExportingNote] = useState<CodexNote | null>(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<CodexType | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<CodexFolder | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCol, setMenuCol] = useState(false);
  const [menuVista, setMenuVista] = useState(false);
  const [nomeVista, setNomeVista] = useState('');
  const [notificacao, setNotificacao] = useState<{ texto: string; tom: 'amber' | 'ember' | 'green' } | null>(null);

  const [migrationOpen, setMigrationOpen] = useState(false);
  const [legacyCandidates, setLegacyCandidates] = useState<string[]>([]);
  const [pendingInitialFile, setPendingInitialFile] = useState(initialFile || null);

  const refNovo = useRef<HTMLDivElement>(null);
  const refVista = useRef<HTMLDivElement>(null);
  const refCol = useRef<HTMLDivElement>(null);
  const refMenu = useRef<HTMLDivElement>(null);

  useForaClique(refNovo, typePickerOpen, () => setTypePickerOpen(false));
  useForaClique(refVista, menuVista, () => setMenuVista(false));
  useForaClique(refCol, menuCol, () => setMenuCol(false));
  useForaClique(refMenu, menuOpen, () => setMenuOpen(false));

  const avisar = (texto: string, tom: 'amber' | 'ember' | 'green' = 'amber') => {
    setNotificacao({ texto, tom });
    window.setTimeout(() => setNotificacao(null), 3800);
  };

  useEffect(() => {
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingNoteId(null);
        setExportingNote(null);
        setTypePickerOpen(false);
        setTypeModalOpen(false);
        setFolderModalOpen(false);
        setMigrationOpen(false);
        setMenuOpen(false);
        setMenuCol(false);
        setMenuVista(false);
      }
    };
    window.addEventListener('keydown', closeOverlay);
    return () => window.removeEventListener('keydown', closeOverlay);
  }, []);

  useEffect(() => {
    setPendingInitialFile(initialFile || null);
  }, [initialFile]);

  useEffect(() => {
    if (!pendingInitialFile) return;
    const candidates = [
      pendingInitialFile,
      pendingInitialFile.replace(/\\/g, '/'),
      pendingInitialFile.replace(/\\/g, '/').replace(/\.md$/i, ''),
    ];
    const note = document.notes.find((item) => {
      const normalizedId = item.id.toLocaleLowerCase('pt-BR');
      const normalizedPath = `legacy_${pendingInitialFile.replace(/\\/g, '/')}`.toLocaleLowerCase('pt-BR');
      const normalizedPathNoExt = `legacy_${pendingInitialFile.replace(/\\/g, '/').replace(/\.md$/i, '')}`.toLocaleLowerCase('pt-BR');
      return (
        candidates.some((candidate) => normalizedId === candidate.toLocaleLowerCase('pt-BR')) ||
        normalizedId === normalizedPath ||
        normalizedId === normalizedPathNoExt
      );
    });

    if (note) {
      setEditingNoteId(note.id);
      setPendingInitialFile(null);
    }
  }, [document.notes, pendingInitialFile]);

  const handleSetColumns = (value: 3 | 4 | 5 | 6) => {
    setColumns(value);
    window.localStorage.setItem('dozero:codex-columns', String(value));
    setMenuCol(false);
  };

  const typeMap = useMemo(() => new Map(document.types.map((t) => [t.id, t])), [document.types]);
  const getType = (tId: string) =>
    typeMap.get(tId) || { id: tId, name: tId, color: '#d9a441', icon: 'faiscas', fields: [] };

  const notes = useMemo(
    () =>
      filterCodexNotes(document.notes, {
        search,
        typeIds: typeId === 'all' ? [] : [typeId],
        folderId: folderId === 'all' ? undefined : folderId === 'none' ? null : folderId,
        favoritesOnly,
        tags: selectedTags,
      }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [document.notes, search, typeId, folderId, favoritesOnly, selectedTags]
  );

  const allTags = useMemo(
    () => Array.from(new Set(document.notes.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [document.notes]
  );

  const createNoteOfType = (selectedType: CodexType) => {
    setTypePickerOpen(false);
    if (selectedType.id === 'criatura') {
      setViewMode('forja');
      return;
    }
    const targetFolder = folderId === 'all' || folderId === 'none' ? null : folderId;
    const newNote = createCodexNote(selectedType, targetFolder);
    update((current) => ({
      ...current,
      notes: [newNote, ...current.notes],
    }));
    setEditingNoteId(newNote.id);
  };

  const updateNote = (note: CodexNote) => {
    update((current) => ({
      ...current,
      notes: current.notes.some((item) => item.id === note.id)
        ? current.notes.map((item) => (item.id === note.id ? { ...note, updatedAt: now() } : item))
        : [{ ...note, updatedAt: now() }, ...current.notes],
    }));
  };

  const toggleFavorite = (noteId: string) => {
    update((current) => ({
      ...current,
      notes: current.notes.map((n) => (n.id === noteId ? { ...n, favorite: !n.favorite, updatedAt: now() } : n)),
    }));
  };

  const moveNote = (noteId: string, destinationFolderId: string | null) => {
    if (!noteId) return;
    update((current) => ({
      ...current,
      notes: current.notes.map((n) => (n.id === noteId ? { ...n, folderId: destinationFolderId, updatedAt: now() } : n)),
    }));
    const destName = destinationFolderId ? document.folders.find((f) => f.id === destinationFolderId)?.name || 'Pasta' : 'Sem pasta';
    avisar(`Nota movida para ${destName}.`, 'amber');
  };

  const saveFolder = (folder: CodexFolder) => {
    update((current) => upsertCodexFolder(current, folder));
    setFolderModalOpen(false);
    setFolderToEdit(null);
    avisar(`Pasta "${folder.name}" gravada.`, 'green');
  };

  const removeFolder = (folder: CodexFolder) => {
    if (!window.confirm(`Dissolver a pasta "${folder.name}"? Suas anotações serão preservadas em "Sem pasta".`)) return;
    update((current) => deleteCodexFolder(current, folder.id));
    if (folderId === folder.id) setFolderId('all');
    avisar(`Pasta "${folder.name}" dissolvida.`, 'amber');
  };

  const saveType = (typeToSave: CodexType) => {
    update((current) => ({
      ...current,
      types: current.types.some((t) => t.id === typeToSave.id)
        ? current.types.map((t) => (t.id === typeToSave.id ? typeToSave : t))
        : [...current.types, typeToSave],
    }));
    setTypeModalOpen(false);
    setTypeToEdit(null);
  };

  const deleteType = (typeIdToDelete: string) => {
    update((current) => deleteCodexType(current, typeIdToDelete));
    if (typeId === typeIdToDelete) setTypeId('all');
    avisar('Tipo de nota removido.', 'amber');
  };

  const saveView = () => {
    if (!nomeVista.trim()) return;
    const view: CodexSavedView = {
      id: id('view'),
      name: nomeVista.trim(),
      search,
      typeIds: typeId === 'all' ? [] : [typeId],
      tags: selectedTags,
      folderId: folderId === 'all' ? null : folderId === 'none' ? '__none__' : folderId,
      favoritesOnly,
    };
    update((current) => ({ ...current, savedViews: [...current.savedViews, view] }));
    setNomeVista('');
    setMenuVista(false);
    avisar(`Vista "${view.name}" salva nos favoritos.`, 'green');
  };

  const applyView = (view: CodexSavedView) => {
    setSearch(view.search);
    setTypeId(view.typeIds[0] || 'all');
    setSelectedTags(view.tags);
    setFolderId(view.folderId === '__none__' ? 'none' : view.folderId || 'all');
    setFavoritesOnly(view.favoritesOnly);
    avisar(`Vista "${view.name}" aplicada.`, 'amber');
  };

  const downloadCodex = () => {
    const blob = new Blob([serializeCodex(document)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'dozero-arcanum-codex.json';
    link.click();
    URL.revokeObjectURL(url);
    avisar('Códice completo exportado em JSON.', 'green');
  };

  const importCodex = async (file: File) => {
    try {
      const imported = parseCodexImport(await file.text());
      update(() => imported);
      avisar('Códice importado com sucesso.', 'green');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível importar o Códice.');
    }
  };

  const downloadNote = (note: CodexNote) => {
    const blob = new Blob([serializeCodexNote(note)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${note.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'nota'}.dozero-note.json`;
    link.click();
    URL.revokeObjectURL(url);
    avisar(`Nota "${note.name}" exportada.`, 'green');
  };

  const importNote = async (file: File) => {
    try {
      const imported = parseCodexNoteImport(await file.text());
      update((current) => {
        const exists = current.notes.some((n) => n.id === imported.id);
        const noteToAdd = exists ? { ...imported, id: id('note'), updatedAt: now(), createdAt: now() } : imported;
        return { ...current, notes: [noteToAdd, ...current.notes] };
      });
      avisar(`Nota "${imported.name}" importada com sucesso.`, 'green');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível importar a nota.');
    }
  };

  const openMigration = async () => {
    try {
      const response = await fetch('/api/wiki/tree');
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { tree?: Array<{ path?: string; type?: string }> };
      setLegacyCandidates(
        (payload.tree || [])
          .filter((item) => item.type === 'blob' && item.path?.endsWith('.md'))
          .map((item) => item.path!)
          .filter((path) => !/(^|\/)(readme|teste|test|exemplo|quarentena|\[99\])/i.test(path))
      );
      setMigrationOpen(true);
    } catch {
      window.alert('Não foi possível listar o acervo Markdown legado.');
    }
  };

  const currentEditingNote = useMemo(
    () => (editingNoteId ? document.notes.find((n) => n.id === editingNoteId) || null : null),
    [document.notes, editingNoteId]
  );

  const tituloVista = useMemo(() => {
    if (favoritesOnly) return 'Favoritas';
    if (folderId === 'none') return 'Sem pasta';
    if (folderId !== 'all') {
      const f = document.folders.find((x) => x.id === folderId);
      if (f) return f.name;
    }
    if (typeId !== 'all') {
      const t = document.types.find((x) => x.id === typeId);
      if (t) return t.plural || t.name;
    }
    return 'Todas as notas';
  }, [favoritesOnly, folderId, typeId, document.folders, document.types]);

  return (
    <main className="codex-workspace">
      {/* barra superior oficial Arcanum */}
      <WorkspaceChrome
        className="codex-workspace-chrome"
        title="Códice"
        subtitle={`${tituloVista} · ${notes.length} notas · ${document.relations.length} relações`}
        icon={<Icone nome="livro" tam={22} />}
      >
        <div className="codex-workspace-chrome-content">
          {onClose && (
            <button
              onClick={onClose}
              className="codex-back-button"
              title="Voltar para a mesa de jogo"
            >
              <Icone nome="voltar" tam={14} /> Voltar à mesa
            </button>
          )}

          {/* busca */}
          <div className="relative hidden w-64 md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7660]">
              <Icone nome="busca" tam={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no códice…"
              className="w-full rounded-md border border-[#3b3222] bg-[#15120e] py-1.5 pr-3 text-xs text-[#ede4d0] placeholder:text-[#7f7660] outline-none transition focus:border-[#d9a441] focus:ring-1 focus:ring-[#d9a441]/30"
              style={{ paddingLeft: '34px' }}
            />
          </div>

          {/* seletor de vistas */}
          <div className="flex items-center gap-1 rounded-lg border border-linha bg-tinta p-1">
            {(
              [
                { id: 'grade', icone: 'grade', rotulo: 'Grade' },
                { id: 'lista', icone: 'lista', rotulo: 'Lista' },
                { id: 'grafo', icone: 'grafo', rotulo: 'Grafo' },
                { id: 'stats', icone: 'stats', rotulo: 'Estatísticas' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                title={`Vista: ${m.rotulo}`}
                onClick={() => setViewMode(m.id)}
                className={`rounded-md px-2.5 py-1.5 transition ${
                  viewMode === m.id
                    ? 'bg-ambar/20 text-ambar shadow-[inset_0_0_0_1px_rgba(217,164,65,0.4)]'
                    : 'text-papel3 hover:text-papel'
                }`}
              >
                <Icone nome={m.icone} tam={17} />
              </button>
            ))}
          </div>

          {/* alternador de colunas quando em grade */}
          {viewMode === 'grade' && (
            <div className="relative" ref={refCol}>
              <button
                title="Quantidade de colunas na grade"
                onClick={() => setMenuCol((v) => !v)}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-bold transition ${
                  menuCol ? 'border-ambar/60 bg-ambar/15 text-ambar' : 'border-linha bg-tinta text-papel3 hover:text-ambar'
                }`}
              >
                <MiniColunas n={columns} />
                <span className="whitespace-nowrap">Colunas: {columns}</span>
                <Icone nome="setaBaixo" tam={12} />
              </button>
              {menuCol && (
                <div className="animar-modal absolute right-0 top-11 z-40 w-48 rounded-lg border border-linha2 bg-tinta2 p-1.5 shadow-2xl shadow-black/60">
                  <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-papel3">
                    Colunas da grade
                  </p>
                  {OPCOES_COLUNAS.map((op) => (
                    <button
                      key={String(op)}
                      onClick={() => handleSetColumns(op)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
                        columns === op ? 'bg-ambar/15 font-bold text-ambar' : 'text-papel2 hover:bg-tinta3 hover:text-papel'
                      }`}
                    >
                      <MiniColunas n={op} />
                      {op} colunas
                      {columns === op && (
                        <span className="ml-auto">
                          <Icone nome="check" tam={14} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* gravar vista */}
          {canEdit && (
            <div className="relative" ref={refVista}>
              <button
                title="Salvar filtros atuais como vista"
                onClick={() => {
                  setMenuVista((v) => !v);
                  setNomeVista('');
                }}
                className={`rounded-md border px-2.5 py-2 transition ${
                  menuVista ? 'border-ambar/60 bg-ambar/15 text-ambar' : 'border-linha bg-tinta text-papel3 hover:text-ambar'
                }`}
              >
                <Icone nome="estrela" tam={16} />
              </button>
              {menuVista && (
                <div className="animar-modal absolute right-0 top-11 z-40 w-64 rounded-lg border border-linha2 bg-tinta2 p-3 shadow-2xl shadow-black/60">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-papel3">
                    Gravar vista atual
                  </p>
                  <input
                    autoFocus
                    value={nomeVista}
                    onChange={(e) => setNomeVista(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && nomeVista.trim()) saveView();
                    }}
                    placeholder="Ex.: Vilões da campanha"
                    className={CLS_INPUT}
                  />
                  <button
                    disabled={!nomeVista.trim()}
                    onClick={saveView}
                    className={`${CLS_BOTAO_AMBAR} mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <Icone nome="check" tam={14} /> Salvar filtros e vista
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Navegador de Módulos Arcanum (4-em-1): Códice / Cérebro / Linhagem / Linha do Tempo */}
          <div className="flex items-center gap-1 rounded-lg border border-[#3b3222] bg-[#15120e] p-1 shadow-sm">
            <button
              title="Códice (Wiki Arcanum)"
              className="rounded-md border border-[#d9a441]/80 bg-[#d9a441]/20 px-2.5 py-1.5 text-[#d9a441] shadow-[inset_0_0_0_1px_rgba(217,164,65,0.4)]"
            >
              <Icone nome="livro" tam={17} />
            </button>
            <button
              title="Cérebro do Mundo (Grafo Semântico 3D)"
              onClick={handleOpenBrain}
              className="rounded-md px-2.5 py-1.5 text-[#7f7660] transition hover:bg-[#272117] hover:text-[#ede4d0]"
            >
              <Icone nome="cerebro" tam={17} />
            </button>
            <button
              title="Árvore Genealógica (Linhagem)"
              onClick={handleOpenLineage}
              className="rounded-md px-2.5 py-1.5 text-[#7f7660] transition hover:bg-[#272117] hover:text-[#ede4d0]"
            >
              <Icone nome="coroa" tam={17} />
            </button>
            <button
              title="Linha do Tempo & Eras (Chronica)"
              onClick={handleOpenChronicle}
              className="rounded-md px-2.5 py-1.5 text-[#7f7660] transition hover:bg-[#272117] hover:text-[#ede4d0]"
            >
              <Icone nome="ampulheta" tam={17} />
            </button>
          </div>

          {/* menu de opções adicionais (Import/Export/Legado) */}
          <div className="relative" ref={refMenu}>
            <button
              title="Opções do Códice"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md border border-linha bg-tinta p-2 text-papel3 transition hover:text-papel"
            >
              <Icone nome="bussola" tam={16} />
            </button>
            {menuOpen && (
              <div className="animar-modal absolute right-0 top-11 z-40 w-60 rounded-lg border border-linha2 bg-tinta2 p-2 shadow-2xl shadow-black/60">
                <button
                  onClick={() => {
                    downloadCodex();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-papel2 transition hover:bg-tinta3 hover:text-papel"
                >
                  <Icone nome="baixar" tam={14} /> Exportar Códice (.json)
                </button>
                {canEdit && (
                  <label className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-papel2 transition hover:bg-tinta3 hover:text-papel">
                    <Icone nome="mais" tam={14} /> Importar Códice (.json)
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void importCodex(file);
                        e.currentTarget.value = '';
                        setMenuOpen(false);
                      }}
                    />
                  </label>
                )}
                {canEdit && (
                  <label className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-papel2 transition hover:bg-tinta3 hover:text-papel">
                    <Icone nome="livro" tam={14} /> Importar Nota (.dozero-note.json)
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void importNote(file);
                        e.currentTarget.value = '';
                        setMenuOpen(false);
                      }}
                    />
                  </label>
                )}
                {onOpenLegacy && (
                  <>
                    <div className="my-1 border-t border-linha" />
                    <button
                      onClick={() => {
                        onOpenLegacy();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-papel2 transition hover:bg-tinta3 hover:text-papel"
                    >
                      <Icone nome="pergaminho" tam={14} /> Acervo legado Markdown
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => {
                          void openMigration();
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-papel2 transition hover:bg-tinta3 hover:text-papel"
                      >
                        <Icone nome="troca" tam={14} /> Migrar Markdown para o Códice
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* botão principal "+ Nova nota" com grid de 12 tipos */}
          {canEdit && (
            <div className="relative" ref={refNovo}>
              <button
                onClick={() => setTypePickerOpen((v) => !v)}
                className={`${CLS_BOTAO_AMBAR} !px-3.5`}
              >
                <Icone nome="mais" tam={16} /> Nova nota
              </button>
              {typePickerOpen && (
                <div className="animar-modal absolute right-0 top-11 z-50 w-96 rounded-xl border border-linha2 bg-tinta2 p-3.5 shadow-2xl shadow-black/80">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-papel3">
                    Que página abrir no códice?
                  </p>
                  <div className="grid max-h-80 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                    {document.types.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => createNoteOfType(t)}
                        className="flex items-center gap-2.5 rounded-lg border border-transparent bg-tinta3 p-2 text-left text-xs font-semibold text-papel transition hover:border-linha2 hover:bg-tinta4"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                          style={{ background: `${t.color}22`, color: t.color }}
                        >
                          <Icone nome={t.icon} tam={15} />
                        </span>
                        <span className="flex-1 truncate">{t.name}</span>
                        {t.id === 'criatura' && (
                          <span className="text-brasa" title="Abre a Forja de Criaturas">
                            <Icone nome="faiscas" tam={12} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setTypePickerOpen(false);
                      setTypeToEdit(null);
                      setTypeModalOpen(true);
                    }}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-linha2 px-3 py-2 text-xs font-bold text-ambar transition hover:bg-ambar/10"
                  >
                    <Icone nome="pincel" tam={14} /> Inventar tipo personalizado…
                  </button>
                </div>
              )}
            </div>
          )}
        {/* chips de filtros ativos */}
        {(selectedTags.length > 0 || typeId !== 'all' || folderId !== 'all' || favoritesOnly || search.trim()) && (
            <div className="codex-active-filters flex flex-wrap items-center gap-2 pt-1">
            {typeId !== 'all' && (
              <button
                onClick={() => setTypeId('all')}
                className="animar-aparecer flex items-center gap-1.5 rounded-full border border-ambar/40 bg-ambar/10 px-2.5 py-1 text-[11px] font-semibold text-ambar transition hover:border-brasa/60 hover:bg-brasa/10 hover:text-brasa"
              >
                <PontoCor cor={getType(typeId).color} />
                {getType(typeId).name}
                <Icone nome="x" tam={11} />
              </button>
            )}
            {folderId !== 'all' && (
              <button
                onClick={() => setFolderId('all')}
                className="animar-aparecer flex items-center gap-1.5 rounded-full border border-ambar/40 bg-ambar/10 px-2.5 py-1 text-[11px] font-semibold text-ambar transition hover:border-brasa/60 hover:bg-brasa/10 hover:text-brasa"
              >
                <Icone nome="pasta" tam={11} />
                {folderId === 'none' ? 'Sem pasta' : document.folders.find((f) => f.id === folderId)?.name || 'Pasta'}
                <Icone nome="x" tam={11} />
              </button>
            )}
            {favoritesOnly && (
              <button
                onClick={() => setFavoritesOnly(false)}
                className="animar-aparecer flex items-center gap-1.5 rounded-full border border-ambar/40 bg-ambar/10 px-2.5 py-1 text-[11px] font-semibold text-ambar transition hover:border-brasa/60 hover:bg-brasa/10 hover:text-brasa"
              >
                <Icone nome="estrela" tam={11} preenchido />
                Favoritas
                <Icone nome="x" tam={11} />
              </button>
            )}
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTags((tags) => tags.filter((t) => t !== tag))}
                className="animar-aparecer flex items-center gap-1.5 rounded-full border border-ambar/40 bg-ambar/10 px-2.5 py-1 text-[11px] font-semibold text-ambar transition hover:border-brasa/60 hover:bg-brasa/10 hover:text-brasa"
              >
                #{tag}
                <Icone nome="x" tam={11} />
              </button>
            ))}
            <button
              onClick={() => {
                setSearch('');
                setTypeId('all');
                setFolderId('all');
                setFavoritesOnly(false);
                setSelectedTags([]);
              }}
              className="text-[11px] font-semibold text-papel3 underline decoration-dotted underline-offset-4 transition hover:text-papel"
            >
              limpar filtros
            </button>
          </div>
        )}
        </div>
      </WorkspaceChrome>

      {/* corpo principal com Sidebar e Área de Conteúdo */}
      <section className="codex-body relative flex min-h-0 flex-1 overflow-hidden">
        {/* barra lateral */}
        <aside className="relative z-20 flex h-full w-72 shrink-0 flex-col border-r border-[#3b3222] bg-[#1d1913]">
          {/* marca Arcanum */}
          <div className="flex items-center gap-3 border-b border-linha px-5 py-4">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-ambar/50 bg-ambar/10 text-ambar">
              <Icone nome="bussola" tam={22} />
              <span className="animar-girar absolute inset-0 rounded-full border border-dashed border-ambar/30" />
            </span>
            <div>
              <p className="font-display texto-gravado text-lg font-extrabold leading-none tracking-[0.14em] text-papel">
                ARCANUM
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-ambar/80">
                códice de campanha
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-6">
            {canEdit && (
              <button
                onClick={() => setTypePickerOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ambar px-4 py-2.5 text-sm font-bold text-[#241a06] shadow-[0_2px_14px_rgba(217,164,65,0.25)] transition hover:bg-[#e8b654] active:scale-[0.98]"
              >
                <Icone nome="mais" tam={16} /> Abrir nova página
              </button>
            )}

            {/* biblioteca */}
            <p className="mb-1.5 mt-5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-papel3">
              Biblioteca
            </p>
            <button
              onClick={() => {
                setFolderId('all');
                setFavoritesOnly(false);
                setTypeId('all');
                setSelectedTags([]);
              }}
              className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                folderId === 'all' && !favoritesOnly && typeId === 'all' && selectedTags.length === 0
                  ? 'bg-ambar/15 text-ambar shadow-[inset_2px_0_0_var(--color-ambar)]'
                  : 'text-papel2 hover:bg-tinta3 hover:text-papel'
              }`}
            >
              <span className="flex flex-1 items-center gap-2 truncate">
                <Icone nome="livro" tam={15} /> Todas as notas
              </span>
              <span className="text-[11px] text-papel3">{document.notes.length}</span>
            </button>

            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                favoritesOnly
                  ? 'bg-ambar/15 text-ambar shadow-[inset_2px_0_0_var(--color-ambar)]'
                  : 'text-papel2 hover:bg-tinta3 hover:text-papel'
              }`}
            >
              <span className="flex flex-1 items-center gap-2 truncate">
                <Icone nome="estrela" tam={15} preenchido={favoritesOnly} /> Favoritas
              </span>
              <span className="text-[11px] text-papel3">{document.notes.filter((n) => n.favorite).length}</span>
            </button>

            {/* Sem pasta com drag target */}
            <div
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('text/arcanum-nota') || e.dataTransfer.types.includes('text/codex-note') || e.dataTransfer.types.includes('text/plain')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverFolder('__none__');
                }
              }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolder(null);
                const nId = e.dataTransfer.getData('text/arcanum-nota') || e.dataTransfer.getData('text/codex-note') || e.dataTransfer.getData('text/plain');
                if (nId) moveNote(nId, null);
              }}
              className={`relative rounded-md transition-all duration-150 ${
                dragOverFolder === '__none__'
                  ? 'scale-[1.03] bg-ambar/10 shadow-[inset_0_0_0_1px_rgba(217,164,65,0.7),0_0_18px_rgba(217,164,65,0.25)]'
                  : ''
              }`}
            >
              <button
                onClick={() => setFolderId(folderId === 'none' ? 'all' : 'none')}
                className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                  folderId === 'none'
                    ? 'bg-ambar/15 text-ambar shadow-[inset_2px_0_0_var(--color-ambar)]'
                    : 'text-papel2 hover:bg-tinta3 hover:text-papel'
                }`}
              >
                <span className="flex flex-1 items-center gap-2 truncate">
                  <Icone nome="pasta" tam={15} /> Sem pasta
                </span>
                <span className="text-[11px] text-papel3">{document.notes.filter((n) => !n.folderId).length}</span>
              </button>
            </div>

            {/* pastas com drag target */}
            <div className="mb-1.5 mt-5 flex items-center justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-papel3">Pastas</p>
              {canEdit && (
                <button
                  title="Criar nova pasta"
                  onClick={() => {
                    setFolderToEdit({ id: id('folder'), name: '', color: '#d9a441' });
                    setFolderModalOpen(true);
                  }}
                  className="text-papel3 transition hover:text-ambar"
                >
                  <Icone nome="mais" tam={14} />
                </button>
              )}
            </div>

            {document.folders.map((folder) => {
              const count = document.notes.filter((n) => n.folderId === folder.id).length;
              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('text/arcanum-nota') || e.dataTransfer.types.includes('text/codex-note') || e.dataTransfer.types.includes('text/plain')) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverFolder(folder.id);
                    }
                  }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverFolder(null);
                    const nId = e.dataTransfer.getData('text/arcanum-nota') || e.dataTransfer.getData('text/codex-note') || e.dataTransfer.getData('text/plain');
                    if (nId) moveNote(nId, folder.id);
                  }}
                  className={`relative rounded-md transition-all duration-150 ${
                    dragOverFolder === folder.id
                      ? 'scale-[1.03] bg-ambar/10 shadow-[inset_0_0_0_1px_rgba(217,164,65,0.7),0_0_18px_rgba(217,164,65,0.25)]'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => setFolderId(folderId === folder.id ? 'all' : folder.id)}
                    className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                      folderId === folder.id
                        ? 'bg-ambar/15 text-ambar shadow-[inset_2px_0_0_var(--color-ambar)]'
                        : 'text-papel2 hover:bg-tinta3 hover:text-papel'
                    }`}
                  >
                    <span className="flex flex-1 items-center gap-2 truncate">
                      <Icone nome="pasta" tam={15} className="text-ambar/70" />
                      {folder.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] text-papel3">{count}</span>
                      {canEdit && (
                        <span
                          role="button"
                          title="Dissolver pasta"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFolder(folder);
                          }}
                          className="hidden text-papel3 transition hover:text-brasa group-hover:inline"
                        >
                          <Icone nome="lixo" tam={13} />
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}

            {/* tipos de nota */}
            <div className="mb-1.5 mt-5 flex items-center justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-papel3">Tipos de nota</p>
              {canEdit && (
                <button
                  title="Inventar novo tipo"
                  onClick={() => {
                    setTypeToEdit(null);
                    setTypeModalOpen(true);
                  }}
                  className="text-papel3 transition hover:text-ambar"
                >
                  <Icone nome="pincel" tam={14} />
                </button>
              )}
            </div>

            {document.types.map((t) => {
              const count = document.notes.filter((n) => n.typeId === t.id).length;
              const ativo = typeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTypeId(ativo ? 'all' : t.id)}
                  className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                    ativo
                      ? 'bg-ambar/15 text-ambar shadow-[inset_2px_0_0_var(--color-ambar)]'
                      : 'text-papel2 hover:bg-tinta3 hover:text-papel'
                  }`}
                >
                  <span className="flex flex-1 items-center gap-2 truncate">
                    <span style={{ color: t.color }}>
                      <Icone nome={t.icon} tam={15} />
                    </span>
                    {t.plural || t.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] text-papel3">{count}</span>
                    {canEdit && !t.standard && (
                      <span
                        role="button"
                        title="Editar tipo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTypeToEdit(t);
                          setTypeModalOpen(true);
                        }}
                        className="hidden text-papel3 transition hover:text-ambar group-hover:inline"
                      >
                        <Icone nome="editar" tam={12} />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            {/* etiquetas */}
            {allTags.length > 0 && (
              <>
                <p className="mb-1.5 mt-5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-papel3">
                  Etiquetas
                </p>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {allTags.map((tag) => {
                    const ativo = selectedTags.includes(tag);
                    const count = document.notes.filter((n) => n.tags.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        onClick={() =>
                          setSelectedTags((tags) =>
                            ativo ? tags.filter((t) => t !== tag) : [...tags, tag]
                          )
                        }
                        className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                          ativo
                            ? 'border-ambar/70 bg-ambar/15 text-ambar'
                            : 'border-linha bg-tinta3 text-papel2 hover:border-linha2 hover:text-papel'
                        }`}
                      >
                        <span className="text-ambar/70">#</span>
                        {tag} <span className="text-papel3">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* vistas salvas */}
            {document.savedViews.length > 0 && (
              <>
                <p className="mb-1.5 mt-5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-papel3">
                  Vistas Salvas
                </p>
                {document.savedViews.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => applyView(view)}
                    className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-papel2 transition hover:bg-tinta3 hover:text-papel"
                  >
                    <span className="flex flex-1 items-center gap-2 truncate">
                      <Icone nome="estrela" tam={14} className="text-ambar/80" />
                      {view.name}
                    </span>
                    {canEdit && (
                      <span
                        role="button"
                        title="Apagar vista"
                        onClick={(e) => {
                          e.stopPropagation();
                          update((current) => ({
                            ...current,
                            savedViews: current.savedViews.filter((v) => v.id !== view.id),
                          }));
                        }}
                        className="hidden text-papel3 transition hover:text-brasa group-hover:inline"
                      >
                        <Icone nome="lixo" tam={13} />
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* área de visualização e conteúdo */}
        <div className={`codex-content flex min-h-0 flex-1 flex-col ${viewMode === 'grafo' ? 'overflow-hidden p-4' : 'overflow-y-auto p-6'}`}>
          {viewMode === 'grade' && (
            <>
              {notes.length === 0 ? (
                <div className="animar-aparecer flex flex-col items-center justify-center py-24 text-center">
                  <span className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-linha2 bg-tinta2 text-ambar/70">
                    <Icone nome="bussola" tam={38} />
                    <span className="animar-girar absolute inset-0 rounded-full border border-dashed border-ambar/25" />
                  </span>
                  <h3 className="font-display text-xl font-bold text-papel">
                    O códice aguarda sua próxima página
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-papel2">
                    Nenhuma nota corresponde aos filtros atuais. Abra uma nova página ou limpe os filtros.
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => setTypePickerOpen(true)}
                      className={`${CLS_BOTAO_AMBAR} mt-4`}
                    >
                      <Icone nome="mais" tam={16} /> Abrir primeira página
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {notes.map((note) => {
                    const tipo = getType(note.typeId);
                    const camposVisiveis = tipo.fields
                      .filter((c) => {
                        const val = note.fields[c.id];
                        return Array.isArray(val) ? val.length > 0 : val !== '' && val !== undefined && val !== null;
                      })
                      .slice(0, 2);

                    return (
                      <article
                        key={note.id}
                        draggable
                        title="Arraste para uma pasta na barra lateral"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/arcanum-nota', note.id);
                          e.dataTransfer.setData('text/codex-note', note.id);
                          e.dataTransfer.setData('text/plain', note.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => setEditingNoteId(note.id)}
                        className="codex-card group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-linha bg-tinta2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)]"
                        style={{
                          ['--codex-color' as string]: tipo.color,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${tipo.color}aa`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '';
                        }}
                      >
                        {/* banner com imagem ou marcador */}
                        <div className="relative h-44 shrink-0 overflow-hidden">
                          {note.imageUrl ? (
                            <img
                              src={note.imageUrl}
                              alt={note.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <ArteMarcador nota={note} cor={tipo.color} icone={tipo.icon} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-tinta2 via-tinta2/40 to-transparent" />
                          <div className="absolute left-2.5 top-2.5">
                            <SeloTipo nome={tipo.name} cor={tipo.color} icone={tipo.icon} pequeno />
                          </div>
                          <button
                            title={note.favorite ? 'Remover das favoritas' : 'Marcar como favorita'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(note.id);
                            }}
                            className={`absolute right-2.5 top-2.5 rounded-full bg-tinta/80 p-1.5 backdrop-blur transition hover:scale-110 ${
                              note.favorite ? 'text-ambar' : 'text-papel3 hover:text-ambar'
                            }`}
                          >
                            <Icone nome="estrela" tam={15} preenchido={note.favorite} />
                          </button>
                          <h3 className="font-display texto-gravado absolute bottom-2.5 left-3.5 right-3.5 truncate text-[16px] font-bold text-papel tracking-wide">
                            {note.name}
                          </h3>
                        </div>

                        {/* corpo do cartão */}
                        <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                          {note.description && (
                            <p className="line-clamp-2 text-[12.5px] leading-relaxed text-papel2">
                              {note.description}
                            </p>
                          )}
                          {camposVisiveis.length > 0 && (
                            <div className="space-y-1">
                              {camposVisiveis.map((c) => {
                                const val = note.fields[c.id];
                                const strVal = Array.isArray(val) ? val.join(', ') : String(val || '');
                                return (
                                  <p key={c.id} className="flex items-baseline gap-2 text-[11.5px]">
                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-papel3">
                                      {c.label}
                                    </span>
                                    <span className="truncate text-papel2 font-medium">{strVal}</span>
                                  </p>
                                );
                              })}
                            </div>
                          )}
                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {note.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-linha bg-tinta3/60 px-2 py-0.5 text-[10px] text-papel3"
                                >
                                  #{t}
                                </span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="text-[10px] text-papel3 ml-0.5">+{note.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                          <div className="mt-auto flex items-center justify-end border-t border-linha/40 pt-2 text-[11px] text-papel3">
                            <span className="flex items-center gap-1" title="Última revisão">
                              <Icone nome="relogio" tam={12} /> {formatarDataCurta(note.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {viewMode === 'lista' && (
            <div className="overflow-hidden rounded-lg border border-linha bg-tinta2">
              <div className="hidden grid-cols-[2.4rem_1fr_9.5rem_10rem_6rem_5rem_2.5rem] gap-3 border-b border-linha px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-papel3 md:grid">
                <span />
                <span>Nome</span>
                <span>Tipo</span>
                <span>Pasta</span>
                <span>Relações</span>
                <span>Revisão</span>
                <span />
              </div>
              {notes.map((n) => {
                const tipo = getType(n.typeId);
                const pasta = document.folders.find((f) => f.id === n.folderId);
                const grauRel = document.relations.filter((r) => r.sourceId === n.id || r.targetId === n.id).length;
                return (
                  <button
                    key={n.id}
                    draggable
                    title="Arraste para uma pasta na barra lateral"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/arcanum-nota', n.id);
                      e.dataTransfer.setData('text/codex-note', n.id);
                      e.dataTransfer.setData('text/plain', n.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => setEditingNoteId(n.id)}
                    className="animar-aparecer group grid w-full grid-cols-[2.4rem_1fr_auto] items-center gap-3 border-b border-linha/60 px-4 py-3 text-left transition last:border-0 hover:bg-tinta3 md:grid-cols-[2.4rem_1fr_9.5rem_10rem_6rem_5rem_2.5rem]"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ background: `${tipo.color}1e`, color: tipo.color }}
                    >
                      <Icone nome={n.icon || tipo.icon} tam={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-display truncate text-[14px] font-bold text-papel transition group-hover:text-ambar">
                          {n.name}
                        </span>
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(n.id);
                          }}
                          className={n.favorite ? 'text-ambar' : 'text-papel3 opacity-0 transition group-hover:opacity-100 hover:text-ambar'}
                        >
                          <Icone nome="estrela" tam={13} preenchido={n.favorite} />
                        </span>
                      </span>
                      <span className="block truncate text-[11px] text-papel3">
                        {n.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
                            }}
                            className="mr-1.5 transition hover:text-ambar"
                          >
                            #{t}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="hidden md:block">
                      <SeloTipo nome={tipo.name} cor={tipo.color} icone={tipo.icon} pequeno />
                    </span>
                    <span className="hidden truncate text-[12px] text-papel2 md:block">
                      {pasta ? pasta.name : '—'}
                    </span>
                    <span className="hidden items-center gap-1 text-[12px] text-papel2 md:flex">
                      <PontoCor cor={tipo.color} tam={6} /> {grauRel}
                    </span>
                    <span className="hidden text-[12px] text-papel3 md:block">
                      {formatarDataCurta(n.updatedAt)}
                    </span>
                    <span className="text-papel3 opacity-0 transition group-hover:opacity-100">
                      <Icone nome="setaDir" tam={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'grafo' && (
            <CodexGraphView
              notes={notes}
              types={document.types}
              relations={document.relations}
              onOpenNote={(note) => setEditingNoteId(note.id)}
            />
          )}

          {viewMode === 'stats' && (
            <CodexStatsView
              notes={document.notes}
              types={document.types}
              folders={document.folders}
              relations={document.relations}
              onOpenNote={(note) => setEditingNoteId(note.id)}
            />
          )}
        </div>
      </section>

      {/* modal de exportação WebP fiel */}
      {exportingNote && (
        <CodexExportModal
          note={exportingNote}
          types={document.types}
          folders={document.folders}
          relations={document.relations}
          notes={document.notes}
          onClose={() => setExportingNote(null)}
          onNotify={avisar}
        />
      )}

      {/* gaveta do Editor de Notas */}
      {currentEditingNote && (
        <NoteEditorDrawer
          note={currentEditingNote}
          types={document.types}
          folders={document.folders}
          relations={document.relations}
          notes={document.notes}
          roomCode={roomCode}
          readOnly={!canEdit}
          onClose={() => setEditingNoteId(null)}
          onUpdate={updateNote}
          onOpenExport={() => setExportingNote(currentEditingNote)}
          onExportJson={() => downloadNote(currentEditingNote)}
          onDelete={
            canEdit
              ? () => {
                  update((current) => deleteCodexNote(current, currentEditingNote.id));
                  setEditingNoteId(null);
                  avisar(`Nota "${currentEditingNote.name}" excluída.`, 'ember');
                }
              : undefined
          }
          onOpenOtherNote={(otherId) => setEditingNoteId(otherId)}
          onSaveRelation={(rel) => update((current) => upsertCodexRelation(current, rel))}
          onDeleteRelation={(relId) =>
            update((current) => ({ ...current, relations: current.relations.filter((r) => r.id !== relId) }))
          }
          onNotify={avisar}
        />
      )}

      {/* modal da Forja de Criaturas */}
      {viewMode === 'forja' && (
        <CreatureForge
          onClose={() => setViewMode('grade')}
          onCreate={(forgedNote) => {
            update((current) => ({ ...current, notes: [forgedNote, ...current.notes] }));
            setViewMode('grade');
            setEditingNoteId(forgedNote.id);
            avisar(`Criatura "${forgedNote.name}" forjada no Códice.`, 'green');
          }}
        />
      )}

      {/* modal de Forjar/Editar Tipo */}
      {typeModalOpen && (
        <CodexTypeModal
          type={typeToEdit}
          onClose={() => {
            setTypeModalOpen(false);
            setTypeToEdit(null);
          }}
          onSave={saveType}
          onDelete={deleteType}
          onNotify={avisar}
        />
      )}

      {/* modal de Criar/Editar Pasta */}
      {folderModalOpen && folderToEdit && (
        <FolderModal
          folder={folderToEdit}
          onClose={() => {
            setFolderModalOpen(false);
            setFolderToEdit(null);
          }}
          onSave={saveFolder}
        />
      )}

      {/* toast de notificação */}
      {notificacao && (
        <div
          className={`animar-aparecer fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${
            notificacao.tom === 'green'
              ? 'border-emerald-500/50 bg-[#12241b] text-emerald-300'
              : notificacao.tom === 'ember'
              ? 'border-brasa/50 bg-[#291712] text-brasa'
              : 'border-ambar/50 bg-[#241c10] text-ambar'
          }`}
        >
          <Icone nome="check" tam={16} />
          {notificacao.texto}
        </div>
      )}
    </main>
  );
}

function NoteEditorDrawer({
  note,
  types,
  folders,
  relations,
  notes,
  roomCode,
  readOnly = false,
  onClose,
  onUpdate,
  onOpenExport,
  onExportJson,
  onDelete,
  onOpenOtherNote,
  onSaveRelation,
  onDeleteRelation,
  onNotify,
}: {
  note: CodexNote;
  types: CodexType[];
  folders: CodexFolder[];
  relations: CodexRelation[];
  notes: CodexNote[];
  roomCode: string;
  readOnly?: boolean;
  onClose: () => void;
  onUpdate: (note: CodexNote) => void;
  onOpenExport: () => void;
  onExportJson: () => void;
  onDelete?: () => void;
  onOpenOtherNote: (noteId: string) => void;
  onSaveRelation: (rel: CodexRelation) => void;
  onDeleteRelation: (relId: string) => void;
  onNotify: (texto: string, tom?: 'amber' | 'ember' | 'green') => void;
}) {
  const [entradaTag, setEntradaTag] = useState('');
  const [listaAberta, setListaAberta] = useState<string | null>(null);
  const [valorLista, setValorLista] = useState('');
  const [uploading, setUploading] = useState(false);
  const [arrastandoImg, setArrastandoImg] = useState(false);
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  const [formRel, setFormRel] = useState<{
    id: string | null;
    alvoId: string;
    label: string;
    color: string;
    icon: string;
    bid: boolean;
  } | null>(null);

  const [chronosEvents, setChronosEvents] = useState(getChronosEvents);
  const [lineagePeople, setLineagePeople] = useState(() => readLineagePeople());
  const arquivoRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const tipo = types.find((t) => t.id === note.typeId) || types[0] || {
    id: 'conceito',
    name: 'Conceito',
    color: '#d9a441',
    icon: 'faiscas',
    fields: [],
  };

  const relacoesNota = relations.filter((r) => r.sourceId === note.id || r.targetId === note.id);
  const outrasNotas = useMemo(
    () => notes.filter((n) => n.id !== note.id).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [notes, note.id]
  );

  useEffect(() => {
    const refresh = () => {
      setChronosEvents(getChronosEvents());
      setLineagePeople(readLineagePeople());
    };
    state.chronos.observe(refresh);
    state.lineage.observe(refresh);
    return () => {
      state.chronos.unobserve(refresh);
      state.lineage.unobserve(refresh);
    };
  }, []);

  const salvar = (patch: Partial<CodexNote>) => {
    onUpdate({ ...note, ...patch, updatedAt: now() });
  };

  const definirImagemCapa = async (arquivo?: File) => {
    if (!arquivo || !arquivo.type.startsWith('image/')) {
      onNotify('Envie um arquivo de imagem válido.', 'ember');
      return;
    }
    setUploading(true);
    try {
      const converted = await convertImageToWebP(arquivo, 0.86, 1400);
      const cloudUrl = await uploadToSupabaseStorage(converted.base64, `${roomCode}/wiki_${converted.filename}`);
      const imageUrl = cloudUrl || converted.base64;
      salvar({ imageUrl });
      onNotify('Imagem de capa convertida para WebP e adicionada.', 'green');
    } catch {
      onNotify('Não foi possível processar a imagem de capa.', 'ember');
    } finally {
      setUploading(false);
    }
  };

  const adicionarImagemGaleria = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    setUploading(true);
    try {
      const novasUrls: string[] = [];
      for (const arquivo of Array.from(arquivos)) {
        if (!arquivo.type.startsWith('image/')) continue;
        const converted = await convertImageToWebP(arquivo, 0.85, 1200);
        const cloudUrl = await uploadToSupabaseStorage(converted.base64, `${roomCode}/wiki_${converted.filename}`);
        novasUrls.push(cloudUrl || converted.base64);
      }
      salvar({ gallery: [...(note.gallery || []), ...novasUrls] });
      onNotify(`${novasUrls.length} imagem(ns) adicionada(s) à galeria.`, 'green');
    } finally {
      setUploading(false);
    }
  };

  const trocarTipo = (novoTipoId: string) => {
    const t = types.find((x) => x.id === novoTipoId);
    if (!t || novoTipoId === note.typeId) return;
    const novosCampos = { ...initialFieldValuesForType(t), ...note.fields };
    salvar({
      typeId: novoTipoId,
      icon: t.icon,
      fields: novosCampos,
    });
    onNotify(`Página reclassificada como ${t.name}.`, 'amber');
  };

  const adicionarTag = () => {
    const t = entradaTag.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
    if (!t) return;
    if (!note.tags.includes(t)) salvar({ tags: [...note.tags, t] });
    setEntradaTag('');
  };

  const criarEventoCalendario = () => {
    const event = addChronosEvent(note.name, undefined, {
      layer: note.typeId === 'personagem' ? 'character' : 'world',
      wikiPath: `codex://${note.id}`,
    });
    if (event) {
      salvar({
        chronosEventIds: [...new Set([...(note.chronosEventIds || []), event.id])],
      });
      onNotify(`Evento "${event.title}" criado no calendário Chronos.`, 'green');
    }
  };

  const gravarRelacao = () => {
    if (!formRel) return;
    if (!formRel.alvoId || !formRel.label.trim()) {
      onNotify('Escolha o alvo e o rótulo da relação.', 'ember');
      return;
    }
    const relacao: CodexRelation = {
      id: formRel.id || id('relation'),
      sourceId: note.id,
      targetId: formRel.alvoId,
      label: formRel.label.trim(),
      color: formRel.color,
      icon: formRel.icon,
      bidirectional: formRel.bid,
    };
    onSaveRelation(relacao);
    setFormRel(null);
    onNotify('Relação tecida no códice.', 'green');
  };

  const renderCampo = (c: { id: string; label: string; kind: string; options?: string[] }) => {
    const val = note.fields[c.id];
    const strVal = Array.isArray(val) ? val.join(', ') : String(val ?? '');

    if (c.kind === 'longtext') {
      return (
        <textarea
          readOnly={readOnly}
          rows={3}
          value={strVal}
          onChange={(e) => salvar({ fields: { ...note.fields, [c.id]: e.target.value } })}
          className={CLS_INPUT}
        />
      );
    }

    if (c.kind === 'select') {
      return (
        <select
          disabled={readOnly}
          value={strVal}
          onChange={(e) => salvar({ fields: { ...note.fields, [c.id]: e.target.value } })}
          className={CLS_INPUT}
        >
          <option value="">— escolher —</option>
          {(c.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (c.kind === 'list') {
      const items = Array.isArray(val) ? val : [];
      return (
        <div className="rounded-md border border-linha bg-tinta p-2">
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="flex items-center gap-1 rounded-full border border-linha2 bg-tinta3 px-2 py-0.5 text-[11px] text-papel2"
              >
                {item}
                {!readOnly && (
                  <button
                    onClick={() =>
                      salvar({ fields: { ...note.fields, [c.id]: items.filter((_, j) => j !== i) } })
                    }
                    className="text-papel3 transition hover:text-brasa"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {items.length === 0 && listaAberta !== c.id && (
              <span className="text-[11px] italic text-papel3">lista vazia</span>
            )}
          </div>
          {!readOnly && (
            <>
              {listaAberta === c.id ? (
                <form
                  className="mt-2 flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (valorLista.trim()) {
                      salvar({ fields: { ...note.fields, [c.id]: [...items, valorLista.trim()] } });
                      setValorLista('');
                    }
                  }}
                >
                  <input
                    autoFocus
                    value={valorLista}
                    onChange={(e) => setValorLista(e.target.value)}
                    placeholder="Digite e pressione Enter"
                    className={`${CLS_INPUT} !py-1.5 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => setListaAberta(null)}
                    className="px-2 text-papel3 hover:text-papel"
                  >
                    <Icone nome="x" tam={14} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setListaAberta(c.id)}
                  className="mt-2 flex items-center gap-1 text-[11px] font-bold text-ambar transition hover:text-[#e8b654]"
                >
                  <Icone nome="mais" tam={12} /> adicionar item
                </button>
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <input
        readOnly={readOnly}
        type={c.kind === 'number' ? 'number' : c.kind === 'url' ? 'url' : 'text'}
        value={strVal}
        onChange={(e) =>
          salvar({
            fields: {
              ...note.fields,
              [c.id]: c.kind === 'number' ? Number(e.target.value) : e.target.value,
            },
          })
        }
        className={CLS_INPUT}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/55 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="animar-gaveta flex h-full w-full max-w-[760px] flex-col border-l border-linha2 bg-tinta2 shadow-2xl shadow-black/70"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Editor da página"
      >
        {/* cabeçalho com imagem de capa WebP */}
        <div
          className={`relative shrink-0 overflow-hidden border-b border-linha transition ${
            arrastandoImg ? 'ring-2 ring-inset ring-ambar' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastandoImg(true);
          }}
          onDragLeave={() => setArrastandoImg(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastandoImg(false);
            void definirImagemCapa(e.dataTransfer.files?.[0]);
          }}
        >
          {note.imageUrl ? (
            <div className="group relative h-48">
              <img src={note.imageUrl} alt={note.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-tinta2 via-transparent to-tinta2/40" />
              {!readOnly && (
                <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => arquivoRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-md bg-tinta/85 px-2.5 py-1.5 text-[11px] font-bold text-papel backdrop-blur transition hover:text-ambar"
                  >
                    <Icone nome="img" tam={13} /> Trocar
                  </button>
                  <button
                    onClick={() => salvar({ imageUrl: null })}
                    className="flex items-center gap-1.5 rounded-md bg-tinta/85 px-2.5 py-1.5 text-[11px] font-bold text-papel backdrop-blur transition hover:text-brasa"
                  >
                    <Icone nome="lixo" tam={13} /> Remover
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => !readOnly && arquivoRef.current?.click()}
              className={`flex h-32 w-full flex-col items-center justify-center gap-2 border-b border-dashed border-linha2 text-papel3 transition ${
                readOnly ? 'cursor-default' : 'hover:bg-tinta3 hover:text-ambar'
              }`}
            >
              <Icone nome="img" tam={26} />
              <span className="text-xs font-semibold">
                {uploading ? 'Convertendo para WebP…' : <>Arraste uma imagem ou clique — será convertida para <b className="text-ambar">WebP</b></>}
              </span>
            </button>
          )}
          <input
            ref={arquivoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void definirImagemCapa(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
        </div>

        {/* barra de ações sob a imagem */}
        <div className="flex shrink-0 items-center gap-2 border-b border-linha px-5 py-2.5">
          <button
            onClick={onClose}
            className={`${CLS_BOTAO_FANTASMA} !px-2.5`}
            title="Voltar ao códice"
          >
            <Icone nome="voltar" tam={15} />
          </button>
          <SeloTipo nome={tipo.name} cor={tipo.color} icone={tipo.icon} pequeno />
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">
            <span className="animar-pulso h-1.5 w-1.5 rounded-full bg-emerald-400" /> salvo automático
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              title={note.favorite ? 'Remover das favoritas' : 'Marcar favorita'}
              onClick={() => salvar({ favorite: !note.favorite })}
              className={`rounded-md border px-2.5 py-2 transition ${
                note.favorite
                  ? 'border-ambar/70 bg-ambar/15 text-ambar'
                  : 'border-linha text-papel3 hover:text-ambar'
              }`}
            >
              <Icone nome="estrela" tam={15} preenchido={note.favorite} />
            </button>
            <button
              title="Exportar como imagem WebP"
              onClick={onOpenExport}
              className={`${CLS_BOTAO_FANTASMA} !px-2.5`}
            >
              <Icone nome="baixar" tam={15} />
            </button>
            {!readOnly && onDelete && (
              <>
                {confirmaExcluir ? (
                  <button
                    onClick={onDelete}
                    onMouseLeave={() => setConfirmaExcluir(false)}
                    className="flex items-center gap-1.5 rounded-md bg-brasa px-3 py-2 text-xs font-bold text-[#2a0f08] transition hover:brightness-110"
                  >
                    <Icone nome="lixo" tam={13} /> Confirmar?
                  </button>
                ) : (
                  <button
                    title="Excluir nota"
                    onClick={() => setConfirmaExcluir(true)}
                    className={`${CLS_BOTAO_FANTASMA} !px-2.5 hover:!border-brasa/60 hover:!text-brasa`}
                  >
                    <Icone nome="lixo" tam={15} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* corpo do formulário rolável */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <label className={CLS_ROTULO}>Nome da página</label>
          <input
            autoFocus
            readOnly={readOnly}
            value={note.name}
            onChange={(e) => salvar({ name: e.target.value })}
            className="font-display texto-gravado w-full border-0 bg-transparent text-3xl font-extrabold tracking-wide text-papel outline-none placeholder:text-papel3"
            placeholder="Sem nome…"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={CLS_ROTULO}>Tipo de nota</label>
              <select
                disabled={readOnly}
                value={note.typeId}
                onChange={(e) => trocarTipo(e.target.value)}
                className={CLS_INPUT}
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={CLS_ROTULO}>Pasta</label>
              <select
                disabled={readOnly}
                value={note.folderId ?? ''}
                onChange={(e) => salvar({ folderId: e.target.value || null })}
                className={CLS_INPUT}
              >
                <option value="">— sem pasta —</option>
                {folders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={CLS_ROTULO}>Ícone da ficha</label>
              <div className="flex items-center gap-2">
                <select
                  disabled={readOnly}
                  value={note.icon || tipo.icon}
                  onChange={(e) => salvar({ icon: e.target.value })}
                  className={CLS_INPUT}
                >
                  {ICONES_TIPO_SELECAO.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  style={{ background: `${tipo.color}22`, color: tipo.color }}
                >
                  <Icone nome={note.icon || tipo.icon} tam={17} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className={CLS_ROTULO}>Etiquetas (#)</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-linha bg-tinta p-2">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full border border-ambar/40 bg-ambar/10 px-2.5 py-0.5 text-[11px] font-semibold text-ambar"
                >
                  #{t}
                  {!readOnly && (
                    <button
                      onClick={() => salvar({ tags: note.tags.filter((x) => x !== t) })}
                      className="transition hover:text-brasa"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <input
                  value={entradaTag}
                  onChange={(e) => setEntradaTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      adicionarTag();
                    }
                  }}
                  onBlur={adicionarTag}
                  placeholder={note.tags.length ? 'outra etiqueta…' : 'ex.: campanha, vilão, ato-2…'}
                  className="min-w-28 flex-1 bg-transparent px-1 text-xs text-papel outline-none placeholder:text-papel3"
                />
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className={CLS_ROTULO}>Descrição / anotações do mestre</label>
            <textarea
              readOnly={readOnly}
              rows={4}
              value={note.description}
              onChange={(e) => salvar({ description: e.target.value })}
              placeholder="Segredos, motivações, ganchos… tudo que só o mestre precisa saber."
              className={`${CLS_INPUT} leading-relaxed`}
            />
          </div>

          {/* atributos específicos do tipo com estilo visual fiel */}
          <section className="mt-6">
            <h4
              className="font-display mb-3 flex items-center gap-2 border-l-4 pl-3 text-sm font-bold uppercase tracking-[0.14em]"
              style={{ borderColor: tipo.color, color: tipo.color }}
            >
              <Icone nome={tipo.icon} tam={15} /> Atributos de {tipo.name.toLowerCase()}
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tipo.fields.map((c) => (
                <div key={c.id} className={c.kind === 'longtext' || c.kind === 'list' ? 'sm:col-span-2' : ''}>
                  <label className={CLS_ROTULO}>
                    {c.label}
                    <span className="ml-2 normal-case tracking-normal text-papel3/70 font-normal">
                      {ROTULO_CAMPO_TIPO[c.kind] || c.kind}
                    </span>
                  </label>
                  {renderCampo(c)}
                </div>
              ))}
              {tipo.fields.length === 0 && (
                <p className="text-sm italic text-papel3">Este tipo não tem atributos próprios.</p>
              )}
            </div>
          </section>

          {/* mini galeria */}
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className={CLS_ROTULO}>Mini Galeria de Imagens</label>
              {!readOnly && (
                <button
                  onClick={() => galeriaRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] font-bold text-ambar transition hover:text-[#e8b654]"
                >
                  <Icone nome="mais" tam={12} /> Adicionar imagens
                </button>
              )}
            </div>
            <input
              ref={galeriaRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void adicionarImagemGaleria(e.target.files);
                e.currentTarget.value = '';
              }}
            />
            {(note.gallery || []).length > 0 ? (
              <div className="grid grid-cols-4 gap-2.5">
                {note.gallery!.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="group relative aspect-square overflow-hidden rounded-md border border-linha bg-tinta"
                  >
                    <img src={imgUrl} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                    {!readOnly && (
                      <button
                        onClick={() =>
                          salvar({ gallery: (note.gallery || []).filter((_, i) => i !== idx) })
                        }
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/75 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-brasa"
                        title="Remover imagem"
                      >
                        <Icone nome="x" tam={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-papel3">Nenhuma imagem extra na galeria.</p>
            )}
          </section>

          {/* links externos fiel à imagem 2 */}
          <section className="mt-6">
            <h4 className="font-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-papel">
              <Icone nome="link" tam={15} className="text-ambar" /> Links externos
            </h4>
            <div className="space-y-2">
              {note.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate rounded-md border border-linha bg-tinta px-3 py-2 text-[12px] text-papel2 transition hover:border-ambar/50 hover:text-ambar"
                    title={l.url}
                  >
                    <b className="text-papel">{l.label || l.url}</b>
                    <span className="ml-2 text-papel3">{l.url}</span>
                  </a>
                  {!readOnly && (
                    <button
                      onClick={() => salvar({ links: note.links.filter((_, j) => j !== i) })}
                      className="text-papel3 transition hover:text-brasa"
                    >
                      <Icone nome="lixo" tam={15} />
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  onClick={() => salvar({ links: [...note.links, { label: '', url: '' }] })}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-ambar transition hover:text-[#e8b654]"
                >
                  <Icone nome="mais" tam={12} /> + adicionar link
                </button>
              )}
              {!readOnly && note.links.some((l) => !l.url || !l.label) && (
                <div className="rounded-md border border-linha bg-tinta p-2.5">
                  {note.links.map(
                    (l, i) =>
                      (!l.url || !l.label) && (
                        <div key={i} className="mb-2 grid grid-cols-2 gap-2 last:mb-0">
                          <input
                            value={l.label}
                            placeholder="Rótulo"
                            onChange={(e) => {
                              const links = [...note.links];
                              links[i] = { ...links[i], label: e.target.value };
                              salvar({ links });
                            }}
                            className={`${CLS_INPUT} !py-1.5 text-xs`}
                          />
                          <input
                            value={l.url}
                            placeholder="https://…"
                            onChange={(e) => {
                              const links = [...note.links];
                              links[i] = { ...links[i], url: e.target.value };
                              salvar({ links });
                            }}
                            className={`${CLS_INPUT} !py-1.5 text-xs`}
                          />
                        </div>
                      )
                  )}
                </div>
              )}
            </div>
          </section>

          {/* relações fiel à imagem 2 */}
          <section className="mt-6 pb-4">
            <h4 className="font-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-papel">
              <Icone nome="grafo" tam={15} className="text-ambar" /> Relações com outras páginas
              <span className="rounded bg-tinta3 px-1.5 py-0.5 text-[10px] text-papel3">{relacoesNota.length}</span>
            </h4>

            <div className="space-y-1.5">
              {relacoesNota.map((r) => {
                const saida = r.sourceId === note.id;
                const outroId = r.sourceId === note.id ? r.targetId : r.sourceId;
                const outra = notes.find((n) => n.id === outroId);
                if (!outra) return null;
                const tipoOutra = types.find((t) => t.id === outra.typeId) || types[0];
                return (
                  <div
                    key={r.id}
                    className="group flex items-center justify-between rounded-md border border-linha bg-tinta3/70 px-3 py-2 text-xs"
                  >
                    <button
                      onClick={() => onOpenOtherNote(outra.id)}
                      className="flex min-w-0 items-center gap-2 text-left"
                    >
                      <span style={{ color: r.color || '#d9a441' }}>
                        <Icone nome={r.bidirectional ? 'troca' : saida ? 'setaDir' : 'setaEsq'} tam={13} />
                      </span>
                      <span className="font-bold" style={{ color: r.color || '#d9a441' }}>
                        {r.label}
                      </span>
                      <SeloTipo nome={tipoOutra.name} cor={tipoOutra.color} icone={tipoOutra.icon} pequeno />
                      <span className="truncate text-papel font-bold">{outra.name}</span>
                    </button>
                    {!readOnly && (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() =>
                            setFormRel({
                              id: r.id,
                              alvoId: outroId,
                              label: r.label,
                              color: r.color || '#d9a441',
                              icon: r.icon || 'link',
                              bid: r.bidirectional,
                            })
                          }
                          className="p-1 text-papel3 hover:text-ambar"
                          title="Editar relação"
                        >
                          <Icone nome="editar" tam={12} />
                        </button>
                        <button
                          onClick={() => onDeleteRelation(r.id)}
                          className="p-1 text-papel3 hover:text-brasa"
                          title="Desfazer relação"
                        >
                          <Icone nome="x" tam={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <>
                {formRel ? (
                  <div className="animar-aparecer mt-3 rounded-lg border border-ambar/40 bg-tinta p-3.5">
                    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ambar">
                      {formRel.id ? 'Editar relação' : 'Tecer nova relação'}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className={CLS_ROTULO}>Página alvo</label>
                        <select
                          value={formRel.alvoId}
                          onChange={(e) => setFormRel({ ...formRel, alvoId: e.target.value })}
                          className={CLS_INPUT}
                        >
                          <option value="">— escolher página —</option>
                          {outrasNotas.map((on) => (
                            <option key={on.id} value={on.id}>
                              {on.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={CLS_ROTULO}>Tipo de relação</label>
                        <input
                          list="sugestoes-relacao"
                          value={formRel.label}
                          onChange={(e) => setFormRel({ ...formRel, label: e.target.value })}
                          placeholder="Ex.: Guardião de, Inimigo de..."
                          className={CLS_INPUT}
                        />
                        <datalist id="sugestoes-relacao">
                          {SUGESTOES_RELACAO.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <label className={CLS_ROTULO}>Cor da linha</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formRel.color}
                              onChange={(e) => setFormRel({ ...formRel, color: e.target.value })}
                              className="h-8 w-10 cursor-pointer"
                            />
                            <div className="flex gap-1">
                              {CORES_PRESET.slice(0, 6).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setFormRel({ ...formRel, color: c })}
                                  className="h-5 w-5 rounded-full border border-black/40"
                                  style={{ background: c }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-xs text-papel2 pt-4">
                          <input
                            type="checkbox"
                            checked={formRel.bid}
                            onChange={(e) => setFormRel({ ...formRel, bid: e.target.checked })}
                            className="accent-[#d9a441]"
                          />
                          Mão dupla (⇄)
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button onClick={gravarRelacao} className={`${CLS_BOTAO_AMBAR} !py-1.5 text-xs`}>
                          <Icone nome="check" tam={13} /> {formRel.id ? 'Atualizar relação' : 'Tecer relação'}
                        </button>
                        <button
                          onClick={() => setFormRel(null)}
                          className={`${CLS_BOTAO_FANTASMA} !py-1.5 text-xs`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setFormRel({
                        id: null,
                        alvoId: outrasNotas[0]?.id || '',
                        label: '',
                        color: '#d9a441',
                        icon: 'link',
                        bid: false,
                      })
                    }
                    className="mt-3 flex items-center gap-1.5 rounded-md border border-dashed border-linha2 bg-tinta3/40 px-3 py-2 text-xs font-bold text-ambar transition hover:bg-ambar/10"
                  >
                    <Icone nome="mais" tam={13} /> + tecer nova relação
                  </button>
                )}
              </>
            )}
          </section>

          {/* integração com Calendário (Chronos) */}
          <section className="mt-6 rounded-lg border border-linha bg-tinta/60 p-4">
            <div className="flex items-center justify-between border-b border-linha pb-2">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-papel">
                <Icone nome="calendario" tam={15} className="text-ambar" /> Calendário Chronos
              </h4>
              {!readOnly && (
                <button
                  type="button"
                  onClick={criarEventoCalendario}
                  className="flex items-center gap-1 text-[11px] font-bold text-ambar transition hover:text-[#e8b654]"
                >
                  <Icone nome="mais" tam={12} /> Criar evento desta nota
                </button>
              )}
            </div>
            {chronosEvents.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                {chronosEvents.map((evt) => (
                  <label
                    key={evt.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-papel2 hover:bg-tinta3"
                  >
                    <input
                      disabled={readOnly}
                      type="checkbox"
                      checked={(note.chronosEventIds || []).includes(evt.id)}
                      onChange={(e) =>
                        salvar({
                          chronosEventIds: e.target.checked
                            ? [...new Set([...(note.chronosEventIds || []), evt.id])]
                            : (note.chronosEventIds || []).filter((idItem) => idItem !== evt.id),
                        })
                      }
                      className="accent-[#d9a441]"
                    />
                    <span className="flex-1 truncate">{evt.title}</span>
                    <span className="text-[10px] text-papel3">
                      {evt.day}/{evt.month}/{evt.year}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-papel3 pt-2">Nenhum evento registrado no Chronos ainda.</p>
            )}
          </section>

          {/* integração com Linhagem para personagens */}
          {note.typeId === 'personagem' && (
            <section className="mt-6 rounded-lg border border-linha bg-tinta/60 p-4">
              <div className="flex items-center justify-between border-b border-linha pb-2">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-papel">
                  <Icone nome="arvore" tam={15} className="text-ambar" /> Árvore Genealógica (Linhagem)
                </h4>
              </div>
              <div className="pt-2">
                <select
                  disabled={readOnly}
                  value={note.lineagePersonId || ''}
                  onChange={(e) => salvar({ lineagePersonId: e.target.value || undefined })}
                  className={CLS_INPUT}
                >
                  <option value="">Sem pessoa vinculada</option>
                  {lineagePeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name} {person.epithet ? `— ${person.epithet}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-papel3">
                  {lineagePeople.length
                    ? 'Esta nota referencia a entidade genealógica no atlas dinástico.'
                    : 'Abra a Linhagem no DOZERO e crie uma pessoa para vinculá-la.'}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* rodapé oficial fixo da gaveta fiel à imagem 2 */}
        <div className="shrink-0 border-t border-linha px-6 py-3 text-[10px] uppercase tracking-wider text-papel3">
          CRIADA EM {new Date(note.createdAt).toLocaleDateString('pt-BR')} · ÚLTIMA REVISÃO{' '}
          {new Date(note.updatedAt).toLocaleString('pt-BR')}
        </div>
      </aside>
    </div>
  );
}

function FolderModal({
  folder,
  onClose,
  onSave,
}: {
  folder: CodexFolder;
  onClose: () => void;
  onSave: (folder: CodexFolder) => void;
}) {
  const [draft, setDraft] = useState(folder);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="animar-modal borda-ornada w-full max-w-md rounded-xl border border-linha2 bg-tinta2 p-6 shadow-2xl shadow-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-papel">
            {folder.name ? 'Editar Pasta' : 'Nova Pasta'}
          </h3>
          <button onClick={onClose} className="text-papel3 transition hover:text-papel">
            <Icone nome="x" tam={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={CLS_ROTULO}>Nome da Pasta</label>
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex.: Locais Importantes, Fatos Históricos"
              className={CLS_INPUT}
            />
          </div>
          <div>
            <label className={CLS_ROTULO}>Cor da Pasta</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="h-8 w-10 cursor-pointer"
              />
              <div className="flex gap-1.5">
                {CORES_PRESET.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, color: c })}
                    className="h-6 w-6 rounded-full border border-black/40"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-linha pt-4">
          <button onClick={onClose} className={CLS_BOTAO_FANTASMA}>
            Cancelar
          </button>
          <button
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
            disabled={!draft.name.trim()}
            className={`${CLS_BOTAO_AMBAR} disabled:opacity-40`}
          >
            <Icone nome="check" tam={14} /> Salvar pasta
          </button>
        </div>
      </div>
    </div>
  );
}
