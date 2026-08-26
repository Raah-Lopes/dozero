import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowLeft, BarChart3, Bookmark, BookOpen, Brain, Download, Edit2, ExternalLink, FlaskConical, FolderPlus, Grid3X3, Link2, List, Plus, Search, Settings2, Sparkles, Star, Trash2, Upload, X } from 'lucide-react';
import { deleteCodexFolder, deleteCodexNote, deleteCodexType, filterCodexNotes, upsertCodexFolder, upsertCodexRelation, type CodexFieldKind, type CodexFolder, type CodexNote, type CodexRelation, type CodexSavedView, type CodexType } from './codexModel';
import { useCampaignCodex } from './useCampaignCodex';
import './codex.css';
import { CreatureForge } from './CreatureForge';
import { createCreatureNote, getCodexStats, migrateMarkdownFiles, parseCodexImport, serializeCodex } from './codexTools';
import { useCodexAccess } from './useCodexAccess';
import { convertImageToWebP } from '../../../utils/imageUtils';
import { uploadToSupabaseStorage } from '../../../services/storageService';
import { LoreWorkspaceSwitcher } from '../../Navigation/LoreWorkspaceSwitcher';

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const legacyMarkdownModules = import.meta.glob('../../../../wikidozero/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const legacyCandidates = Object.keys(legacyMarkdownModules).map(path => path.replace('../../../../wikidozero/', '')).filter(path => !/(^|\/)(readme|teste|test|exemplo|quarentena|\[99\])/i.test(path));

const exportNoteCard = (note: CodexNote, type?: CodexType) => {
  const canvas = window.document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 920;
  const context = canvas.getContext('2d');
  if (!context) return;
  const gradient = context.createLinearGradient(0, 0, 1280, 920);
  gradient.addColorStop(0, '#102b2a');
  gradient.addColorStop(1, '#071017');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1280, 920);
  context.fillStyle = type?.color || '#19d987';
  context.fillRect(0, 0, 18, 920);
  context.fillStyle = '#dff8ef';
  context.font = '700 56px Georgia';
  context.fillText(note.name.slice(0, 34), 90, 150);
  context.fillStyle = type?.color || '#19d987';
  context.font = '700 22px Arial';
  context.fillText((type?.name || 'ENTIDADE').toUpperCase(), 92, 95);
  context.fillStyle = '#b7d0c9';
  context.font = '28px Arial';
  const lines = note.description.match(/.{1,65}(?:\s|$)/g) || ['Sem descrição.'];
  lines.slice(0, 9).forEach((line, index) => context.fillText(line.trim(), 92, 230 + index * 42));
  context.fillStyle = '#6da697';
  context.font = '22px Arial';
  context.fillText(note.tags.map(tag => `#${tag}`).join('  '), 92, 700);
  const link = window.document.createElement('a');
  link.href = canvas.toDataURL('image/webp', 0.9);
  link.download = `${note.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'entidade'}.webp`;
  link.click();
};

interface CodexWorkspaceProps {
  initialFile?: string | null;
  onOpenLegacy?: () => void;
  onOpenBrain?: () => void;
  onClose?: () => void;
}

export function CodexWorkspace({ onOpenLegacy, onOpenBrain, onClose }: CodexWorkspaceProps) {
  const { document, update } = useCampaignCodex();
  const roomCode = new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2';
  const { canEdit } = useCodexAccess(roomCode);
  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState<string>('all');
  const [folderId, setFolderId] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [columns, setColumns] = useState<3 | 4 | 5 | 6>(() => {
    const saved = Number(window.localStorage.getItem('dozero:codex-columns'));
    return (saved >= 3 && saved <= 6 ? saved : 3) as 3 | 4 | 5 | 6;
  });
  const [sort, setSort] = useState<'updated' | 'name' | 'type'>('updated');
  const [editing, setEditing] = useState<CodexNote | null>(null);
  const [manager, setManager] = useState<'types' | 'relations' | 'stats' | 'forge' | null>(null);
  const [editingFolder, setEditingFolder] = useState<CodexFolder | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditing(null);
        setManager(null);
        setEditingFolder(null);
        setMigrationOpen(false);
      }
    };
    window.addEventListener('keydown', closeOverlay);
    return () => window.removeEventListener('keydown', closeOverlay);
  }, []);

  const handleSetColumns = (value: 3 | 4 | 5 | 6) => {
    setColumns(value);
    window.localStorage.setItem('dozero:codex-columns', String(value));
  };

  const notes = useMemo(() => filterCodexNotes(document.notes, {
    search,
    typeIds: typeId === 'all' ? [] : [typeId],
    folderId: folderId === 'all' ? undefined : folderId === 'none' ? null : folderId,
    favoritesOnly,
    tags: selectedTags,
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : sort === 'type' ? a.typeId.localeCompare(b.typeId, 'pt-BR') : b.updatedAt.localeCompare(a.updatedAt)), [document.notes, search, typeId, folderId, favoritesOnly, selectedTags, sort]);

  const allTags = useMemo(() => Array.from(new Set(document.notes.flatMap(note => note.tags))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [document.notes]);

  const createNote = () => {
    if (!canEdit) return;
    const timestamp = now();
    setEditing({ id: id('note'), name: 'Nova anotação', description: '', typeId: typeId === 'all' ? 'lore' : typeId, folderId: folderId === 'all' || folderId === 'none' ? null : folderId, tags: [], fields: {}, favorite: false, createdAt: timestamp, updatedAt: timestamp });
  };

  const saveNote = (note: CodexNote) => {
    update(current => ({ ...current, notes: current.notes.some(item => item.id === note.id) ? current.notes.map(item => item.id === note.id ? { ...note, updatedAt: now() } : item) : [{ ...note, updatedAt: now() }, ...current.notes] }));
    setEditing(null);
  };

  const startCreateFolder = () => {
    if (!canEdit) return;
    setEditingFolder({ id: id('folder'), name: '', color: '#10b981' });
  };

  const saveFolder = (folder: CodexFolder) => {
    update(current => upsertCodexFolder(current, folder));
    setEditingFolder(null);
  };

  const removeFolder = (folder: CodexFolder) => {
    if (!window.confirm(`Dissolver a pasta �S${folder.name}⬝? Suas anotações serão preservadas em �SSem pasta⬝.`)) return;
    update(current => deleteCodexFolder(current, folder.id));
    if (folderId === folder.id) setFolderId('all');
  };

  const saveView = () => {
    if (!canEdit) return;
    const name = window.prompt('Nome da vista');
    if (!name?.trim()) return;
    const view: CodexSavedView = { id: id('view'), name: name.trim(), search, typeIds: typeId === 'all' ? [] : [typeId], tags: selectedTags, folderId: folderId === 'all' ? null : folderId === 'none' ? '__none__' : folderId, favoritesOnly };
    update(current => ({ ...current, savedViews: [...current.savedViews, view] }));
  };

  const applyView = (view: CodexSavedView) => {
    setSearch(view.search);
    setTypeId(view.typeIds[0] || 'all');
    setSelectedTags(view.tags);
    setFolderId(view.folderId === '__none__' ? 'none' : view.folderId || 'all');
    setFavoritesOnly(view.favoritesOnly);
  };

  const downloadCodex = () => {
    const blob = new Blob([serializeCodex(document)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'dozero-codex.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCodex = async (file: File) => {
    try {
      const imported = parseCodexImport(await file.text());
      update(() => imported);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível importar o Códice.');
    }
  };

  const moveNote = (noteId: string, destinationFolderId: string | null) => {
    if (!noteId) return;
    update(current => ({
      ...current,
      notes: current.notes.map(note => note.id === noteId ? { ...note, folderId: destinationFolderId, updatedAt: now() } : note)
    }));
  };

  return (
    <main className="codex-workspace">
      <header className="codex-header">
        {onClose && (
          <button className="codex-back-button" onClick={onClose} title="Voltar à mesa de jogo">
            <ArrowLeft size={16} /> Voltar à mesa
          </button>
        )}
        <div className="codex-brand">
          <span><BookOpen size={20} /></span>
          <div>
            <strong>Códice Arcanum</strong>
            <small>Wiki viva da campanha</small>
          </div>
        </div>
        <LoreWorkspaceSwitcher current="wiki" />
        <nav aria-label="Vistas da Wiki" className="flex flex-1 flex-wrap items-center justify-end gap-2 overflow-visible min-w-0">
          <div className="flex items-center gap-1 rounded-lg border border-[#1d493c] bg-[#0b251d] p-1">
            <button title="Visualizar em Grade" className={`!border-0 !m-0 !px-2.5 !py-1.5 ${layout === 'grid' ? '!bg-[#102721] !text-[#19d987]' : ''}`} onClick={() => setLayout('grid')}><Grid3X3 size={16} /></button>
            <button title="Visualizar em Lista" className={`!border-0 !m-0 !px-2.5 !py-1.5 ${layout === 'list' ? '!bg-[#102721] !text-[#19d987]' : ''}`} onClick={() => setLayout('list')}><List size={16} /></button>
          </div>
          {layout === 'grid' && (
            <label className="codex-density" title="Quantidade de colunas">
              <select value={columns} onChange={event => handleSetColumns(Number(event.target.value) as 3 | 4 | 5 | 6)}>
                <option value={3}>3 colunas</option>
                <option value={4}>4 colunas</option>
                <option value={5}>5 colunas</option>
                <option value={6}>6 colunas</option>
              </select>
            </label>
          )}
          <label className="codex-density" title="Ordenar lista">
            <select value={sort} onChange={event => setSort(event.target.value as 'updated' | 'name' | 'type')}>
              <option value="updated">Por data</option>
              <option value="name">Por nome</option>
              <option value="type">Por tipo</option>
            </select>
          </label>
          <button onClick={onOpenBrain} title="Abrir Cérebro Gráfico Arcanum"><Brain size={16} /> Cérebro</button>
          {canEdit && <button className="codex-primary" onClick={() => setManager('forge')}><FlaskConical size={16} /> Forja</button>}
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className={menuOpen ? 'active' : ''}><Settings2 size={16} /> Mais</button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 flex flex-col gap-1 rounded-xl border border-[#1e6a51] bg-[#0b251d] p-2 shadow-2xl z-[100]">
                <button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setManager('relations'); setMenuOpen(false); }}><Link2 size={16} /> Relações</button>
                {canEdit && <button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setManager('types'); setMenuOpen(false); }}><Settings2 size={16} /> Tipos</button>}
                <button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setManager('stats'); setMenuOpen(false); }}><BarChart3 size={16} /> Estatísticas</button>
                <hr className="my-1 border-[#163a2d]" />
                <button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { downloadCodex(); setMenuOpen(false); }}><Download size={16} /> Exportar</button>
                {canEdit && (
                  <label className="codex-import-button" style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 11px', color: '#91a8a2', gap: '7px', cursor: 'pointer', borderRadius: '8px' }}>
                    <Upload size={16} /> Importar
                    <input type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void importCodex(file); event.currentTarget.value = ''; setMenuOpen(false); }} />
                  </label>
                )}
                {onOpenLegacy && (
                  <>
                    <hr className="my-1 border-[#163a2d]" />
                    <button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { onOpenLegacy(); setMenuOpen(false); }}><Archive size={16} /> Acervo legado</button>
                    {canEdit && <button style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { setMigrationOpen(true); setMenuOpen(false); }}><Upload size={16} /> Migrar Markdown</button>}
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
        {!canEdit && <span className="codex-readonly">Somente leitura</span>}
      </header>

      <section className="codex-body">
        <aside className="codex-sidebar flex flex-col gap-1.5 p-3 overflow-y-auto overflow-x-hidden border-r border-[#162b29]">
          {canEdit && <button className="codex-new-page !h-auto !py-2.5 !shrink-0" onClick={createNote}><Plus size={16} /> Abrir nova página</button>}
          <label className="codex-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar no Códice⬦" /></label>
          
          <div className="codex-section-title">Biblioteca</div>
          <button className={favoritesOnly ? 'selected' : ''} onClick={() => setFavoritesOnly(value => !value)}><Star size={16} /> Favoritos <span>{document.notes.filter(note => note.favorite).length}</span></button>
          
          <div className="codex-section-title">Tipos</div>
          <button className={typeId === 'all' ? 'selected' : ''} onClick={() => setTypeId('all')}>Todos <span>{document.notes.length}</span></button>
          {document.types.map(type => (
            <button key={type.id} className={typeId === type.id ? 'selected' : ''} onClick={() => setTypeId(type.id)}>
              <i style={{ background: type.color }} />{type.name}<span>{document.notes.filter(note => note.typeId === type.id).length}</span>
            </button>
          ))}
          
          <div className="codex-section-title">
            <span>Pastas</span>
            {canEdit && <button title="Criar pasta" onClick={startCreateFolder}><FolderPlus size={15} /></button>}
          </div>
          <button className={folderId === 'all' ? 'selected' : ''} onClick={() => setFolderId('all')}>Todas</button>
          <div
            className={`codex-folder-target ${dragOverFolder === '__none__' ? 'drag-over' : ''}`}
            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOverFolder('__none__'); }}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={event => { event.preventDefault(); setDragOverFolder(null); moveNote(event.dataTransfer.getData('text/codex-note') || event.dataTransfer.getData('text/plain'), null); }}
          >
            <button className={folderId === 'none' ? 'selected' : ''} onClick={() => setFolderId('none')}>
              Sem pasta <span>{document.notes.filter(note => !note.folderId).length}</span>
            </button>
          </div>
          {document.folders.map(folder => (
            <div
              key={folder.id}
              className={`codex-folder-target ${dragOverFolder === folder.id ? 'drag-over' : ''}`}
              onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOverFolder(folder.id); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={event => { event.preventDefault(); setDragOverFolder(null); moveNote(event.dataTransfer.getData('text/codex-note') || event.dataTransfer.getData('text/plain'), folder.id); }}
            >
              <div className="codex-folder-row">
                <button className={folderId === folder.id ? 'selected' : ''} onClick={() => setFolderId(folder.id)}>
                  <i style={{ background: folder.color }} />{folder.name}<span>{document.notes.filter(note => note.folderId === folder.id).length}</span>
                </button>
                {canEdit && (
                  <div className="codex-folder-actions">
                    <button aria-label={`Editar pasta ${folder.name}`} title="Editar pasta" onClick={() => setEditingFolder(folder)}><Edit2 size={12} /></button>
                    <button aria-label={`Dissolver pasta ${folder.name}`} title="Dissolver pasta" onClick={() => removeFolder(folder)}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {allTags.length > 0 && (
            <>
              <div className="codex-section-title">Tags</div>
              <div className="codex-filter-tags">
                {allTags.map(tag => (
                  <button key={tag} className={selectedTags.includes(tag) ? 'selected' : ''} onClick={() => setSelectedTags(tags => tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag])}>
                    #{tag}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="codex-section-title">
            <span>Vistas</span>
            {canEdit && <button title="Salvar filtros atuais" onClick={saveView}><Bookmark size={15} /></button>}
          </div>
          {document.savedViews.map(view => (
            <div className="codex-saved-view" key={view.id}>
              <button onClick={() => applyView(view)}>{view.name}</button>
              <button aria-label={`Excluir vista ${view.name}`} onClick={() => update(current => ({ ...current, savedViews: current.savedViews.filter(item => item.id !== view.id) }))}><X size={13} /></button>
            </div>
          ))}
        </aside>

        <div className="codex-content">
          <div className="codex-content-head">
            <div>
              <h1>{typeId === 'all' ? 'Todas as notas' : document.types.find(type => type.id === typeId)?.name}</h1>
              <p>{notes.length} na vista · {document.notes.length} no Códice · {document.relations.length} relações tecidas</p>
            </div>
            {canEdit && (
              <button className="codex-primary" onClick={createNote} title="Criar nova nota ou entidade no Códice">
                <Plus size={16} /> Nova nota
              </button>
            )}
          </div>
          {!notes.length ? (
            <div className="codex-empty">
              <BookOpen size={42} />
              <h2>Este Códice começa limpo</h2>
              <p>Nenhum arquivo de teste foi carregado nesta campanha. {canEdit ? 'Crie a primeira entidade ou importe o acervo da Mesa 0 quando quiser.' : 'Aguarde um Mestre adicionar o primeiro conteúdo.'}</p>
              {canEdit && <button className="codex-primary" onClick={createNote}><Plus size={17} /> Criar primeira entidade</button>}
            </div>
          ) : (
            <div className={`codex-notes ${layout}`} style={layout === 'grid' ? { '--codex-columns': columns } as React.CSSProperties : undefined}>
              {notes.map(note => {
                const type = document.types.find(item => item.id === note.typeId);
                return (
                  <article
                    key={note.id}
                    className="codex-card"
                    draggable
                    onDragStart={event => {
                      event.dataTransfer.setData('text/codex-note', note.id);
                      event.dataTransfer.setData('text/plain', note.id);
                    }}
                    onClick={() => setEditing(note)}
                    style={{ '--codex-color': type?.color || '#64748b' } as React.CSSProperties}
                  >
                    {note.imageUrl ? (
                        <img className="codex-card-image" src={note.imageUrl} alt="" loading="lazy" />
                      ) : (
                        <div className="codex-card-placeholder" style={{ background: `linear-gradient(150deg, ${type?.color || '#64748b'}30, rgba(21,18,14,0.1) 65%), #272117` }}>
                          <span style={{ color: `${type?.color || '#64748b'}1f` }}>
                            {note.name.replace(/[^a-zA-Zì-ú0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"}
                          </span>
                        </div>
                      )}
                    <div className="codex-card-top">
                      <span>{type?.name || 'Entidade'}</span>
                      {note.favorite && <Star size={15} fill="currentColor" />}
                    </div>
                    <h2>{note.name}</h2>
                    <p>{note.description || 'Sem descrição.'}</p>
                    <div className="codex-card-fields">
                      {Object.entries(note.fields).slice(0, 2).map(([key, value]) => (
                        <span key={key}><b>{key}</b> {Array.isArray(value) ? value.join(', ') : String(value)}</span>
                      ))}
                    </div>
                    <div className="codex-tags">
                      {note.tags.slice(0, 4).map(tag => <span key={tag}>#{tag}</span>)}
                    </div>
                    <div className="codex-card-footer">
                      <span>{document.folders.find(folder => folder.id === note.folderId)?.name || 'Sem pasta'}</span>
                      <span>{document.relations.filter(relation => relation.sourceId === note.id || relation.targetId === note.id).length} conexões</span>
                      <span>{new Date(note.updatedAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <button
                      className="codex-card-export"
                      aria-label={`Exportar ${note.name} como imagem`}
                      onClick={event => {
                        event.stopPropagation();
                        exportNoteCard(note, type);
                      }}
                    >
                      <Download size={13} /> WebP
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editing && (
        <NoteEditor
          note={editing}
          types={document.types}
          folders={document.folders}
          relations={document.relations}
          notes={document.notes}
          roomCode={roomCode}
          readOnly={!canEdit}
          onClose={() => setEditing(null)}
          onSave={saveNote}
          onDelete={document.notes.some(note => note.id === editing.id) && canEdit ? () => { update(current => deleteCodexNote(current, editing.id)); setEditing(null); } : undefined}
        />
      )}

      {editingFolder && (
        <FolderEditorModal
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onSave={saveFolder}
        />
      )}

      {manager === 'types' && (
        <TypeManager
          types={document.types}
          onClose={() => setManager(null)}
          onSave={type => update(current => ({ ...current, types: current.types.some(item => item.id === type.id) ? current.types.map(item => item.id === type.id ? type : item) : [...current.types, type] }))}
          onDelete={typeIdToDelete => update(current => deleteCodexType(current, typeIdToDelete))}
        />
      )}

      {manager === 'relations' && (
        <RelationManager
          notes={document.notes}
          relations={document.relations}
          readOnly={!canEdit}
          onClose={() => setManager(null)}
          onSave={relation => update(current => upsertCodexRelation(current, relation))}
          onDelete={relationId => update(current => ({ ...current, relations: current.relations.filter(item => item.id !== relationId) }))}
        />
      )}

      {manager === 'stats' && (
        <StatsPanel
          document={document}
          onClose={() => setManager(null)}
          onOpenNote={note => {
            setManager(null);
            setEditing(note);
          }}
        />
      )}

      {manager === 'forge' && (
        <CreatureForge
          onClose={() => setManager(null)}
          onCreate={note => {
            update(current => ({ ...current, notes: [note, ...current.notes] }));
            setManager(null);
          }}
        />
      )}

      {migrationOpen && (
        <MarkdownMigration
          paths={legacyCandidates}
          onClose={() => setMigrationOpen(false)}
          onImport={async selected => {
            const selectedFiles = await Promise.all(selected.map(async path => [path, await legacyMarkdownModules[`../../../../wikidozero/${path}`]()] as [string, string]));
            const migrated = migrateMarkdownFiles(selectedFiles);
            update(current => ({
              ...current,
              notes: [...current.notes, ...migrated.notes.filter(note => !current.notes.some(existing => existing.id === note.id))],
              relations: [...current.relations, ...migrated.relations.filter(relation => !current.relations.some(existing => existing.id === relation.id))]
            }));
            setMigrationOpen(false);
          }}
        />
      )}
    </main>
  );
}

function FolderEditorModal({ folder, onClose, onSave }: { folder: CodexFolder; onClose: () => void; onSave: (folder: CodexFolder) => void }) {
  const [draft, setDraft] = useState(folder);
  const PRESET_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#64748b'];

  return (
    <div className="codex-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="codex-drawer codex-modal-dialog" role="dialog" aria-modal="true" aria-label="Gerenciar Pasta">
        <header>
          <div>
            <small>Organização</small>
            <h2>{folder.name ? 'Editar Pasta' : 'Nova Pasta'}</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <label>
          Nome da Pasta
          <input
            autoFocus
            value={draft.name}
            onChange={event => setDraft({ ...draft, name: event.target.value })}
            placeholder="Ex.: Locais Importantes, Fatos Históricos"
          />
        </label>
        <div className="codex-row">
          <label>
            Cor da Pasta
            <input type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })} />
          </label>
          <div className="codex-folder-palette">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                style={{ background: c }}
                className={draft.color === c ? 'selected' : ''}
                onClick={() => setDraft({ ...draft, color: c })}
              />
            ))}
          </div>
        </div>
        <footer>
          <button onClick={onClose}>Cancelar</button>
          <span />
          <button
            className="codex-primary"
            disabled={!draft.name.trim()}
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
          >
            Salvar pasta
          </button>
        </footer>
      </aside>
    </div>
  );
}

function NoteEditor({ note, types, folders, relations, notes, roomCode, readOnly = false, onClose, onSave, onDelete }: { note: CodexNote; types: CodexType[]; folders: ReturnType<typeof useCampaignCodex>['document']['folders']; relations: CodexRelation[]; notes: CodexNote[]; roomCode: string; readOnly?: boolean; onClose: () => void; onSave: (note: CodexNote) => void; onDelete?: () => void }) {
  const [draft, setDraft] = useState(note);
  const [uploading, setUploading] = useState(false);
  const selectedType = types.find(type => type.id === draft.typeId);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const converted = await convertImageToWebP(file, 0.86, 1400);
      const cloudUrl = await uploadToSupabaseStorage(converted.base64, `${roomCode}/wiki_${converted.filename}`);
      setDraft(current => ({ ...current, imageUrl: cloudUrl || converted.base64 }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="codex-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="codex-drawer" role="dialog" aria-modal="true" aria-label="Editor de entidade">
        <header>
          <div>
            <small>{selectedType?.name || 'Entidade'}</small>
            <h2>Editar registro</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <label>
          Nome
          <input readOnly={readOnly} autoFocus value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <div className="codex-row">
          <label>
            Tipo
            <select disabled={readOnly} value={draft.typeId} onChange={event => setDraft({ ...draft, typeId: event.target.value })}>
              {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </label>
          <label>
            Pasta
            <select disabled={readOnly} value={draft.folderId || ''} onChange={event => setDraft({ ...draft, folderId: event.target.value || null })}>
              <option value="">Sem pasta</option>
              {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
            </select>
          </label>
        </div>
        <label>
          Descrição
          <textarea readOnly={readOnly} rows={7} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} />
        </label>
        <label>
          Tags
          <input readOnly={readOnly} value={draft.tags.join(', ')} onChange={event => setDraft({ ...draft, tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} placeholder="reino, segredo, aliado" />
        </label>
        <div className="codex-row">
          <label>
            Imagem
            <input readOnly={readOnly} type="url" value={draft.imageUrl || ''} onChange={event => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="https://⬦" />
            {draft.imageUrl && <img className="codex-editor-preview" src={draft.imageUrl} alt={`Prévia de ${draft.name}`} />}
            {!readOnly && (
              <>
                <input className="codex-file-input" type="file" accept="image/*" onChange={event => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                <small>{uploading ? 'Processando e enviando⬦' : 'Ou escolha uma imagem para converter em WebP'}</small>
              </>
            )}
          </label>
          <label>
            Links externos
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draft.links?.map((link, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input readOnly={readOnly} style={{ flex: 1 }} type="text" value={link.label} onChange={event => { const newLinks = [...(draft.links || [])]; newLinks[idx] = { ...newLinks[idx], label: event.target.value }; setDraft({ ...draft, links: newLinks }); }} placeholder="Rótulo" />
                  <input readOnly={readOnly} style={{ flex: 2 }} type="url" value={link.url} onChange={event => { const newLinks = [...(draft.links || [])]; newLinks[idx] = { ...newLinks[idx], url: event.target.value }; setDraft({ ...draft, links: newLinks }); }} placeholder="https://⬦" />
                  {!readOnly && (
                    <button type="button" onClick={() => { const newLinks = draft.links?.filter((_, i) => i !== idx); setDraft({ ...draft, links: newLinks || [] }); }} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                  )}
                  {link.url && <a href={link.url} target="_blank" rel="noreferrer" style={{ color: '#d9a441' }}><ExternalLink size={14} /></a>}
                </div>
              ))}
              {!readOnly && (
                <button type="button" onClick={() => setDraft({ ...draft, links: [...(draft.links || []), { label: '', url: '' }] })} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed #525252', color: '#d9a441', fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Adicionar link</button>
              )}
            </div>
          </label>
        </div>
        {selectedType?.fields.map(field => (
          <label key={field.id}>
            {field.label}
            {field.kind === 'select' ? (
              <select disabled={readOnly} value={String(draft.fields[field.id] || '')} onChange={event => setDraft({ ...draft, fields: { ...draft.fields, [field.id]: event.target.value } })}>
                <option value="">�</option>
                {field.options?.map(option => <option key={option}>{option}</option>)}
              </select>
            ) : field.kind === 'longtext' ? (
              <textarea readOnly={readOnly} rows={4} value={String(draft.fields[field.id] || '')} onChange={event => setDraft({ ...draft, fields: { ...draft.fields, [field.id]: event.target.value } })} />
            ) : (
              <input
                readOnly={readOnly}
                type={field.kind === 'number' ? 'number' : field.kind === 'url' ? 'url' : 'text'}
                value={Array.isArray(draft.fields[field.id]) ? (draft.fields[field.id] as string[]).join(', ') : String(draft.fields[field.id] || '')}
                onChange={event => setDraft({
                  ...draft,
                  fields: {
                    ...draft.fields,
                    [field.id]: field.kind === 'number' ? Number(event.target.value) : field.kind === 'list' ? event.target.value.split(',').map(value => value.trim()).filter(Boolean) : event.target.value
                  }
                })}
              />
            )}
          </label>
        ))}
        <label className="codex-check">
          <input disabled={readOnly} type="checkbox" checked={draft.favorite} onChange={event => setDraft({ ...draft, favorite: event.target.checked })} /> Favorito
        </label>
        {relations.some(relation => relation.sourceId === note.id || relation.targetId === note.id) && (
          <section className="codex-related">
            <strong>Conexões</strong>
            {relations.filter(relation => relation.sourceId === note.id || relation.targetId === note.id).map(relation => {
              const otherId = relation.sourceId === note.id ? relation.targetId : relation.sourceId;
              return (
                <span key={relation.id}>
                  <Link2 size={13} /> {relation.label}: {notes.find(item => item.id === otherId)?.name || 'Entidade removida'} {relation.bidirectional ? '� ' : '� '}
                </span>
              );
            })}
          </section>
        )}
        <footer>
          {onDelete && <button className="danger" onClick={onDelete}><Trash2 size={16} /> Excluir</button>}
          <span />
          <button onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
          {!readOnly && <button className="codex-primary" disabled={!draft.name.trim()} onClick={() => onSave(draft)}>Salvar</button>}
        </footer>
      </aside>
    </div>
  );
}

const FIELD_KINDS: Array<{ value: CodexFieldKind; label: string }> = [
  { value: 'text', label: 'Texto' },
  { value: 'longtext', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção' },
  { value: 'url', label: 'URL' },
  { value: 'list', label: 'Lista' },
];

function TypeManager({ types, onClose, onSave, onDelete }: { types: CodexType[]; onClose: () => void; onSave: (type: CodexType) => void; onDelete: (typeId: string) => void }) {
  const blank = (): CodexType => ({ id: id('type'), name: '', color: '#8b5cf6', icon: 'sparkles', fields: [] });
  const [draft, setDraft] = useState<CodexType>(blank);

  return (
    <div className="codex-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="codex-drawer" role="dialog" aria-modal="true" aria-label="Gerenciar tipos">
        <header>
          <div>
            <small>Estrutura do mundo</small>
            <h2>Tipos de entidade</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <div className="codex-manager-list">
          {types.map(type => (
            <button key={type.id} onClick={() => setDraft(structuredClone(type))}>
              <i style={{ background: type.color }} />{type.name}{type.standard && <small>Padrão</small>}
            </button>
          ))}
        </div>
        <hr />
        <label>
          Nome
          <input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Divindade" />
        </label>
        <div className="codex-row">
          <label>
            Cor
            <input type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })} />
          </label>
          <label>
            Ícone
            <input value={draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value })} placeholder="star" />
          </label>
        </div>
        <div className="codex-section-head">
          <strong>Campos personalizados</strong>
          <button onClick={() => setDraft({ ...draft, fields: [...draft.fields, { id: id('field'), label: 'Novo campo', kind: 'text' }] })}>
            <Plus size={14} /> Campo
          </button>
        </div>
        {draft.fields.map((field, index) => (
          <div className="codex-field-row" key={field.id}>
            <input aria-label={`Nome do campo ${index + 1}`} value={field.label} onChange={event => setDraft({ ...draft, fields: draft.fields.map(item => item.id === field.id ? { ...item, label: event.target.value } : item) })} />
            <select aria-label={`Tipo do campo ${index + 1}`} value={field.kind} onChange={event => setDraft({ ...draft, fields: draft.fields.map(item => item.id === field.id ? { ...item, kind: event.target.value as CodexFieldKind } : item) })}>
              {FIELD_KINDS.map(kind => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
            </select>
            {field.kind === 'select' && (
              <input aria-label={`Opções do campo ${index + 1}`} value={field.options?.join(', ') || ''} onChange={event => setDraft({ ...draft, fields: draft.fields.map(item => item.id === field.id ? { ...item, options: event.target.value.split(',').map(value => value.trim()).filter(Boolean) } : item) })} placeholder="Opções separadas por vírgula" />
            )}
            <button aria-label={`Excluir campo ${field.label}`} onClick={() => setDraft({ ...draft, fields: draft.fields.filter(item => item.id !== field.id) })}><Trash2 size={14} /></button>
          </div>
        ))}
        <footer>
          {!draft.standard && types.some(type => type.id === draft.id) && (
            <button className="danger" onClick={() => { if (window.confirm(`Excluir o tipo ${draft.name}? As entidades serão movidas para Conhecimento.`)) { onDelete(draft.id); setDraft(blank()); } }}>
              <Trash2 size={16} /> Excluir
            </button>
          )}
          <span />
          <button onClick={() => setDraft(blank())}>Novo tipo</button>
          <button className="codex-primary" disabled={!draft.name.trim() || draft.standard} title={draft.standard ? 'Tipos padrão são protegidos' : undefined} onClick={() => { onSave({ ...draft, name: draft.name.trim() }); setDraft(blank()); }}>
            Salvar tipo
          </button>
        </footer>
      </aside>
    </div>
  );
}

function RelationManager({ notes, relations, readOnly = false, onClose, onSave, onDelete }: { notes: CodexNote[]; relations: CodexRelation[]; readOnly?: boolean; onClose: () => void; onSave: (relation: CodexRelation) => void; onDelete: (relationId: string) => void }) {
  const blank = (): CodexRelation => ({ id: id('relation'), sourceId: notes[0]?.id || '', targetId: notes[1]?.id || '', label: 'Relacionado a', color: '#d8b45a', icon: 'link', bidirectional: true });
  const [draft, setDraft] = useState<CodexRelation>(blank);
  const [error, setError] = useState('');
  const noteName = (noteId: string) => notes.find(note => note.id === noteId)?.name || 'Entidade removida';
  const save = () => {
    try {
      onSave({ ...draft, label: draft.label.trim() || 'Relacionado a' });
      setDraft(blank());
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a relação.');
    }
  };

  return (
    <div className="codex-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="codex-drawer" role="dialog" aria-modal="true" aria-label="Gerenciar relações">
        <header>
          <div>
            <small>Ecossistema conectado</small>
            <h2>Relações</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        {notes.length < 2 ? (
          <div className="codex-empty compact">
            <Link2 size={32} />
            <p>Crie ao menos duas entidades para conectá-las.</p>
          </div>
        ) : readOnly ? (
          <p className="codex-readonly-copy">Você pode consultar as conexões. Apenas Mestres e gerentes podem alterá-las.</p>
        ) : (
          <>
            <div className="codex-row">
              <label>
                Origem
                <select value={draft.sourceId} onChange={event => setDraft({ ...draft, sourceId: event.target.value })}>
                  {notes.map(note => <option key={note.id} value={note.id}>{note.name}</option>)}
                </select>
              </label>
              <label>
                Destino
                <select value={draft.targetId} onChange={event => setDraft({ ...draft, targetId: event.target.value })}>
                  {notes.map(note => <option key={note.id} value={note.id}>{note.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              Rótulo
              <input value={draft.label} onChange={event => setDraft({ ...draft, label: event.target.value })} placeholder="Aliado de, governa, pertence a⬦" />
            </label>
            <div className="codex-row">
              <label>
                Cor
                <input type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })} />
              </label>
              <label className="codex-check">
                <input type="checkbox" checked={draft.bidirectional} onChange={event => setDraft({ ...draft, bidirectional: event.target.checked })} /> Bidirecional
              </label>
            </div>
            {error && <p className="codex-error" role="alert">{error}</p>}
            <button className="codex-primary" onClick={save}><Plus size={15} /> Salvar relação</button>
          </>
        )}
        <div className="codex-section-head">
          <strong>Relações existentes</strong>
          <span>{relations.length}</span>
        </div>
        <div className="codex-relation-list">
          {relations.map(relation => (
            <div key={relation.id}>
              <button onClick={() => { if (!readOnly) { setDraft(relation); setError(''); } }}>
                <i style={{ background: relation.color }} />
                <strong>{noteName(relation.sourceId)}</strong> {relation.bidirectional ? '� ' : '� '} <strong>{noteName(relation.targetId)}</strong>
                <small>{relation.label}</small>
              </button>
              {!readOnly && <button aria-label={`Excluir relação ${relation.label}`} onClick={() => onDelete(relation.id)}><Trash2 size={15} /></button>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function StatsPanel({ document, onClose, onOpenNote }: { document: ReturnType<typeof useCampaignCodex>['document']; onClose: () => void; onOpenNote: (note: CodexNote) => void }) {
  const stats = getCodexStats(document);
  const maxTagCount = Math.max(1, ...stats.tags.map(item => item.count));
  const getType = (typeId: string) => document.types.find(t => t.id === typeId);

  return (
    <div className="codex-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="codex-drawer codex-stats-drawer" role="dialog" aria-modal="true" aria-label="Estatísticas do Códice">
        <header>
          <div>
            <small>Radiografia do mundo</small>
            <h2>Estatísticas & Teia Semântica</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}><X /></button>
        </header>

        {/* Numerais principais */}
        <div className="codex-stat-grid">
          <div>
            <strong>{stats.favorites}</strong>
            <span>Favoritas</span>
          </div>
          <div>
            <strong>{stats.notes}</strong>
            <span>Entidades</span>
          </div>
          <div>
            <strong>{stats.relations}</strong>
            <span>Relações</span>
          </div>
          <div>
            <strong>{stats.folders}</strong>
            <span>Pastas</span>
          </div>
        </div>

        {/* Coração da Teia (Centralidade) */}
        {stats.topConnected && (
          <div className="codex-heart-card" onClick={() => onOpenNote(stats.topConnected!.note)}>
            <div className="codex-heart-eyebrow">
              <Sparkles size={13} /> Coração da Teia
            </div>
            <h3>{stats.topConnected.note.name}</h3>
            <p>
              {stats.topConnected.degree} {stats.topConnected.degree === 1 ? 'relação gravita' : 'relações gravitam'} em torno desta entidade � o epicentro da história.
            </p>
            <div className="codex-heart-badge">
              <i style={{ background: getType(stats.topConnected.note.typeId)?.color || '#10b981' }} />
              {getType(stats.topConnected.note.typeId)?.name || 'Entidade'}
            </div>
          </div>
        )}

        {/* Mais conectadas & Recentes */}
        <div className="codex-stats-dual-col">
          <div>
            <div className="codex-section-head">
              <strong>Mais conectadas</strong>
              <span>Grau</span>
            </div>
            <div className="codex-stat-ranking">
              {stats.centrality.slice(0, 6).map((item, index) => {
                const type = getType(item.note.typeId);
                return (
                  <button key={item.note.id} className="codex-rank-item" onClick={() => onOpenNote(item.note)}>
                    <span className="codex-rank-index">{index + 1}</span>
                    <i style={{ background: type?.color || '#10b981' }} />
                    <span className="codex-rank-name">{item.note.name}</span>
                    <span className="codex-rank-count">{item.degree}</span>
                  </button>
                );
              })}
              {stats.centrality.length === 0 && <p className="codex-empty-hint">Nenhuma nota criada.</p>}
            </div>
          </div>

          <div>
            <div className="codex-section-head">
              <strong>Revisões recentes</strong>
              <span>Data</span>
            </div>
            <div className="codex-stat-ranking">
              {stats.recent.slice(0, 6).map(note => {
                const type = getType(note.typeId);
                return (
                  <button key={note.id} className="codex-rank-item" onClick={() => onOpenNote(note)}>
                    <i style={{ background: type?.color || '#10b981' }} />
                    <span className="codex-rank-name">{note.name}</span>
                    <span className="codex-rank-date">{new Date(note.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Relações mais tecidas */}
        {stats.byRelation.length > 0 && (
          <>
            <div className="codex-section-head">
              <strong>Relações mais tecidas</strong>
            </div>
            <div className="codex-stat-relations">
              {stats.byRelation.map(rel => (
                <span key={rel.label} className="codex-relation-badge">
                  <Link2 size={12} /> {rel.label} <b>{rel.count}</b>
                </span>
              ))}
            </div>
          </>
        )}

        {/* Entidades por tipo */}
        <div className="codex-section-head">
          <strong>Entidades por tipo</strong>
        </div>
        {stats.byType.map(item => {
          const type = getType(item.typeId);
          return (
            <div className="codex-bar" key={item.typeId}>
              <span>{type?.name || item.typeId}</span>
              <b style={{ width: `${Math.max(5, (item.count / Math.max(1, stats.notes)) * 100)}%`, background: type?.color || '#0b8c5a' }}>
                {item.count}
              </b>
            </div>
          );
        })}

        {/* Distribuição por pastas */}
        {stats.byFolder.length > 0 && (
          <>
            <div className="codex-section-head">
              <strong>Distribuição por pastas</strong>
            </div>
            <div className="codex-folder-bars">
              {stats.byFolder.map(folder => (
                <div key={folder.folderId} className="codex-folder-bar-item">
                  <div className="codex-folder-bar-label">
                    <span>{folder.name}</span>
                    <small>{folder.count} ({folder.percentage}%)</small>
                  </div>
                  <div className="codex-folder-bar-track">
                    <div style={{ width: `${folder.percentage}%`, background: folder.color }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Constelação de tags */}
        {stats.tags.length > 0 && (
          <>
            <div className="codex-section-head">
              <strong>Constelação de etiquetas</strong>
            </div>
            <div className="codex-stat-cloud" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'baseline', paddingTop: 8 }}>
              {stats.tags.slice(0, 24).map(item => {
                const weight = item.count / maxTagCount;
                return (
                  <span 
                    key={item.tag} 
                    style={{ 
                      fontSize: `${12 + weight * 18}px`, 
                      fontWeight: 500 + Math.round(weight * 3) * 100,
                      opacity: 0.55 + weight * 0.45,
                      color: '#d9a441',
                      cursor: 'default',
                      transition: 'color 0.2s',
                      background: 'none',
                      border: 'none',
                      padding: 0
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff1ce')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#d9a441')}
                  >
                    #{item.tag}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

const FRASES_FORJA = [
  "Invocando a essência⬦",
  "Moldando carne, escamas ou engrenagens⬦",
  "Afiando garras e intenções⬦",
  "Consultando os dados do destino⬦",
  "Gravando o nome no códice⬦",
];

function MarkdownMigration({ paths, onClose, onImport }: { paths: string[]; onClose: () => void; onImport: (paths: string[]) => void | Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (path: string) => setSelected(current => current.includes(path) ? current.filter(item => item !== path) : [...current, path]);

  return (
    <div className="codex-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="codex-drawer" role="dialog" aria-modal="true" aria-label="Migrar acervo Markdown">
        <header>
          <div>
            <small>Mesa 0 · migração segura</small>
            <h2>Migrar Markdown</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <p className="codex-forge-intro">Selecione os artigos que devem virar entidades. Os arquivos originais não serão modificados nem removidos.</p>
        <div className="codex-migration-actions">
          <button onClick={() => setSelected(paths)}>Selecionar todos</button>
          <button onClick={() => setSelected([])}>Limpar seleção</button>
        </div>
        <div className="codex-migration-list">{paths.length === 0 ? <p>Nenhum Markdown elegível encontrado.</p> : paths.map(path => <label key={path}><input type="checkbox" checked={selected.includes(path)} onChange={() => toggle(path)} /> <span>{path}</span></label>)}</div>
        <footer>
          <span>{busy ? 'Lendo arquivos⬦' : `${selected.length} selecionado(s)`}</span>
          <button onClick={onClose}>Cancelar</button>
          <button className="codex-primary" disabled={!selected.length || busy} onClick={async () => { setBusy(true); try { await onImport(selected); } finally { setBusy(false); } }}>Converter em entidades</button>
        </footer>
      </aside>
    </div>
  );
}
