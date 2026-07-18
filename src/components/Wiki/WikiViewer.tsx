import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchRepositoryTree, fetchMarkdownContent, saveMarkdownContent, createFolder, moveFileOrFolder, pushToGithub, initializeWikiTemplate, openLocalFolder } from '../../utils/githubApi';
import { convertImageToWebP } from '../../utils/imageUtils';
import type { GithubTreeItem } from '../../utils/githubApi';
import { 
  Folder, FileText, ChevronRight, ChevronDown, 
  RefreshCw, FolderPlus, FilePlus, UploadCloud, AlertCircle, Save, BookOpen, Edit2, ImagePlus, FolderOpen, Trash2, Eye, EyeOff
} from 'lucide-react';
import { WikiEditor } from './WikiEditor';
import { FrontmatterPanel } from './FrontmatterPanel';
import { FrontmatterSheetViewer } from './FrontmatterSheetViewer';
import { getWikiConfig } from '../../store';
import './wiki.css';

interface TreeNode {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  children: Record<string, TreeNode>;
}

function buildTree(items: GithubTreeItem[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', type: 'tree', children: {} };
  
  items.forEach(item => {
    // Apenas listar .md e pastas
    if (item.type === 'blob' && !item.path.endsWith('.md')) return;

    const parts = item.path.split('/');
    let current = root;
    
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      if (!current.children[part]) {
        current.children[part] = {
          name: part.replace('.md', ''),
          path: parts.slice(0, i + 1).join('/'),
          type: isLast ? item.type : 'tree',
          children: {}
        };
      }
      current = current.children[part];
    });
  });
  
  return root;
}

const TreeView: React.FC<{ 
  node: TreeNode; 
  level: number; 
  activePath: string | null;
  ignoredFolders: string[];
  onSelect: (path: string) => void;
  onMove: (oldPath: string, newPath: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDropExternal: (files: FileList, targetPath: string) => void;
  onToggleIgnore: (path: string) => void;
}> = ({ node, level, activePath, ignoredFolders, onSelect, onMove, onRename, onDropExternal, onToggleIgnore }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const isDir = node.type === 'tree';
  const isActive = activePath === node.path;
  const hasChildren = Object.keys(node.children).length > 0;

  if (level === 0) {
    return (
      <div className="wiki-tree-root">
        {Object.values(node.children).map(child => (
          <TreeView key={child.path} node={child} level={level + 1} activePath={activePath} ignoredFolders={ignoredFolders} onSelect={onSelect} onMove={onMove} onRename={onRename} onDropExternal={onDropExternal} onToggleIgnore={onToggleIgnore} />
        ))}
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path);
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // Check if dragging external OS files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropExternal(e.dataTransfer.files, node.path);
      return;
    }

    const draggedPath = e.dataTransfer.getData('text/plain');
    if (draggedPath && draggedPath !== node.path && !draggedPath.startsWith(node.path + '/')) {
      onMove(draggedPath, node.path);
    }
  };

  return (
    <div className="wiki-tree-node" style={{ marginLeft: level === 1 ? 0 : '1rem' }}>
      <div 
        className={`wiki-tree-item ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (isDir) setIsOpen(!isOpen);
          else onSelect(node.path);
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', gap: '0.3rem' }}>
          {isDir ? (
            <>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} color="var(--accent-secondary)" />
            </>
          ) : (
            <FileText size={14} color="var(--text-secondary)" style={{ marginLeft: '14px' }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
        </div>
        
        {/* Rename Button */}
        <button 
          className="wiki-tree-rename-btn"
          onClick={(e) => {
            e.stopPropagation();
            const newName = prompt("Renomear para:", node.name);
            if (newName && newName !== node.name) {
              onRename(node.path, newName);
            }
          }}
          title="Renomear"
        >
          <Edit2 size={12} />
        </button>
        {/* Toggle Ignore Button */}
        <button 
          className="wiki-tree-rename-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleIgnore(node.path);
          }}
          title={ignoredFolders.includes(node.path) ? "Mostrar no Cérebro" : "Ocultar do Cérebro"}
          style={{ color: ignoredFolders.includes(node.path) ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {ignoredFolders.includes(node.path) ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </div>
      
      {isDir && isOpen && hasChildren && (
        <div className="wiki-tree-children">
          {Object.values(node.children).map(child => (
            <TreeView key={child.path} node={child} level={level + 1} activePath={activePath} ignoredFolders={ignoredFolders} onSelect={onSelect} onMove={onMove} onRename={onRename} onDropExternal={onDropExternal} onToggleIgnore={onToggleIgnore} />
          ))}
        </div>
      )}
    </div>
  );
};

interface WikiViewerProps {
  /** Arquivo a abrir imediatamente (ex: enviado pelo CampaignManagerWidget) */
  initialFile?: string | null;
}

export const WikiViewer: React.FC<WikiViewerProps> = ({ initialFile }) => {
  const [treeItems, setTreeItems] = useState<GithubTreeItem[]>([]);
  const [ignoredFolders, setIgnoredFolders] = useState<string[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [errorTree, setErrorTree] = useState<string | null>(null);

  const [activeFile, setActiveFile] = useState<string | null>(initialFile || null);
  const [content, setContent] = useState<string>('');
  const [frontmatter, setFrontmatter] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSyncing(true);
      
      const { base64, filename } = await convertImageToWebP(file);

      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      
      const res = await fetch('/api/wiki/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, filename: filename, base64 })
      });
      
      if (!res.ok) throw new Error("Erro ao salvar imagem localmente");
      await loadTree();
    } catch (err: any) {
      console.error(err);
      alert("Falha ao importar imagem: " + err.message);
    } finally {
      setSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDropExternal = async (files: FileList, targetFolder: string) => {
    setSyncing(true);
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.name.endsWith('.md')) {
          const text = await file.text();
          await saveMarkdownContent(`${targetFolder}/${file.name}`, text);
        } 
        else if (file.type.startsWith('image/')) {
          const { base64, filename } = await convertImageToWebP(file);
          
          // O save-image salva no ANEXOS sempre. 
          // Se quiseríamos salvar na pasta atual, teríamos que mudar a API.
          // Por enquanto, enviamos normal:
          const res = await fetch('/api/wiki/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoPath, filename, base64 })
          });
          if (!res.ok) throw new Error(`Falha ao salvar ${filename}`);
        } else {
          console.warn(`Tipo de arquivo não suportado: ${file.name}`);
        }
      }
      await loadTree();
    } catch (err: any) {
      alert("Erro ao importar arquivos: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const insertCheat = (md: string) => {
    if (editorRef.current) {
      editorRef.current.insertMarkdown(md);
      // force auto-save after injection by artificially triggering onChange
      const currentMarkdown = editorRef.current.getMarkdown();
      handleEditorChange(currentMarkdown);
    }
  };

  const loadIgnored = async () => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const res = await fetch(`/api/wiki/ignored?repoPath=${encodeURIComponent(repoPath)}`);
      if (res.ok) {
         const data = await res.json();
         setIgnoredFolders(data.ignored || []);
      }
    } catch {}
  };

  const toggleIgnore = async (path: string) => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const res = await fetch('/api/wiki/toggle-ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path })
      });
      if (res.ok) {
         const data = await res.json();
         setIgnoredFolders(data.ignored || []);
      }
    } catch {}
  };

  const loadTree = async () => {
    setLoadingTree(true);
    setErrorTree(null);
    try {
      const items = await fetchRepositoryTree();
      setTreeItems(items);
    } catch (err: any) {
      setErrorTree(err.message);
    } finally {
      setLoadingTree(false);
    }
  };

  const handleMove = async (oldPath: string, newFolderPath: string) => {
    const filename = oldPath.split('/').pop() || '';
    const newPath = newFolderPath ? `${newFolderPath}/${filename}` : filename;
    try {
      await moveFileOrFolder(oldPath, newPath);
      if (activeFile === oldPath) setActiveFile(newPath);
      loadTree();
    } catch (e: any) {
      alert("Erro ao mover: " + e.message);
    }
  };

  const handleRename = async (oldPath: string, newName: string) => {
    const folder = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const isMd = oldPath.endsWith('.md');
    // limpa extensao caso o usuario tenha digitado no prompt
    const cleanName = newName.replace('.md', ''); 
    const newPath = folder ? `${folder}/${cleanName}${isMd ? '.md' : ''}` : `${cleanName}${isMd ? '.md' : ''}`;
    try {
      await moveFileOrFolder(oldPath, newPath);
      if (activeFile === oldPath) setActiveFile(newPath);
      loadTree();
    } catch (e: any) {
      alert("Erro ao renomear: " + e.message);
    }
  };

  const handleCreateFile = async () => {
    const name = prompt("Nome do novo arquivo (sem .md):");
    if (!name) return;
    const currentFolder = activeFile ? activeFile.substring(0, activeFile.lastIndexOf('/')) : '[1] 🏕️ Campanha Principal';
    const newPath = currentFolder ? `${currentFolder}/${name}.md` : `${name}.md`;
    try {
      await saveMarkdownContent(newPath, `# ${name}\n\nEscreva sua lore aqui...`);
      await loadTree();
      setActiveFile(newPath);
    } catch (e: any) {
      alert("Erro ao criar arquivo: " + e.message);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt("Nome da nova pasta:");
    if (!name) return;
    const currentFolder = activeFile ? activeFile.substring(0, activeFile.lastIndexOf('/')) : '[1] 🏕️ Campanha Principal';
    const newPath = currentFolder ? `${currentFolder}/${name}` : `${name}`;
    try {
      await createFolder(newPath);
      await loadTree();
    } catch (e: any) {
      alert("Erro ao criar pasta: " + e.message);
    }
  };

  const handlePush = async () => {
    setSyncing(true);
    try {
      await pushToGithub();
      alert("Sincronizado com o GitHub com sucesso!");
    } catch (e: any) {
      alert("Erro ao sincronizar: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async (textToSave?: string | any) => {
    if (!activeFile) return;
    setSaving(true);
    try {
      const mdContent = typeof textToSave === 'string' ? textToSave : content;
      const finalContent = frontmatter ? `---\n${frontmatter}\n---\n${mdContent}` : mdContent;
      await saveMarkdownContent(activeFile, finalContent);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e: any) {
      console.error("Erro no auto-save: ", e);
    } finally {
      setSaving(false);
    }
  };

  const saveTimeoutRef = useRef<number | null>(null);

  const handleEditorChange = (md: string) => {
    setContent(md);
    
    // Auto-save debounce (salva automaticamente 1 segundo após o usuário parar de digitar)
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSave(md);
    }, 1000);
  };

  useEffect(() => {
    loadTree();
    loadIgnored();
  }, []);

  // Escuta eventos de navegação do CampaignManagerWidget (quando já montado)
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path || (e as CustomEvent).detail?.filePath;
      if (path) setActiveFile(path);
    };
    window.addEventListener('open-wiki-file', handler);
    return () => {
      window.removeEventListener('open-wiki-file', handler);
    };
  }, []);

  // Se initialFile mudar (ou WikiViewer for remontado com arquivo via CampaignManager)
  useEffect(() => {
    if (initialFile) {
      setActiveFile(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    if (!activeFile) return;
    const loadContent = async () => {
      setLoadingContent(true);
      try {
        const text = await fetchMarkdownContent(activeFile);
        const match = text.trim().match(/^(?:---|[*]{3,}|[-]{3,})[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|[*]{3,}|[-]{3,})[ \t]*\r?\n([\s\S]*)$/);
        if (match) {
          setFrontmatter(match[1]);
          setContent(match[2]);
        } else {
          setFrontmatter('');
          setContent(text);
        }
      } catch (err: any) {
        setContent(`*Erro ao carregar arquivo:* ${err.message}`);
        setFrontmatter('');
      } finally {
        setLoadingContent(false);
      }
    };
    loadContent();
  }, [activeFile]);

  const filteredTreeItems = useMemo(() => {
    if (!searchQuery.trim()) return treeItems;
    const lowerQuery = searchQuery.toLowerCase();
    
    const matchedBlobs = treeItems.filter(item => item.type === 'blob' && item.path.toLowerCase().includes(lowerQuery));
    
    const matchedPaths = new Set<string>();
    matchedBlobs.forEach(blob => {
       const parts = blob.path.split('/');
       let current = '';
       parts.forEach(part => {
         current += (current ? '/' : '') + part;
         matchedPaths.add(current);
       });
    });
    
    const matchedFolders = treeItems.filter(item => item.type === 'tree' && item.path.toLowerCase().includes(lowerQuery));
    matchedFolders.forEach(folder => {
       matchedPaths.add(folder.path);
       treeItems.forEach(item => {
          if (item.path.startsWith(folder.path + '/')) matchedPaths.add(item.path);
       });
    });

    return treeItems.filter(item => matchedPaths.has(item.path));
  }, [treeItems, searchQuery]);

  const tree = useMemo(() => buildTree(filteredTreeItems), [filteredTreeItems]);

  const parsedMeta = useMemo(() => {
    if (!frontmatter) return null;
    try {
      const lines = frontmatter.split('\n').filter(l => l.trim().length > 0);
      const meta: any = {};
      lines.forEach(line => {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          meta[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
        }
      });
      return Object.keys(meta).length > 0 ? meta : null;
    } catch (e) {
      return null;
    }
  }, [frontmatter]);

  return (
    <div className="wiki-container animate-fade-in" style={{ position: 'relative' }}>
      {/* Mobile Sidebar Toggle Button */}
      {isMobile && !isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute', top: '10px', left: '10px', zIndex: 10,
            background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--glass-border)',
            color: 'white', padding: '8px 12px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}
        >
          <Folder size={18} /> <span>Índice</span>
        </button>
      )}

      {/* Sidebar Overlay on Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className="wiki-sidebar" 
        style={isMobile ? { 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          height: '100%', 
          width: '85%', 
          maxWidth: '350px', 
          zIndex: 101, 
          background: 'var(--bg-secondary)', 
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          boxShadow: isSidebarOpen ? '5px 0 20px rgba(0,0,0,0.5)' : 'none'
        } : {}}
      >
        <div className="wiki-sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <BookOpen size={18} color="var(--accent-primary)" />
              Sua Wiki Local
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button className="btn-icon" onClick={handlePush} disabled={syncing} title="Sincronizar Arquivos" style={{ padding: '0.3rem', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px' }}>
                <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              </button>
              {isMobile && (
                <button className="btn-icon" onClick={() => setIsSidebarOpen(false)} style={{ padding: '0.3rem', color: 'var(--text-secondary)' }}>
                  <EyeOff size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn-icon" onClick={handleCreateFile} title="Novo Pergaminho" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                <FilePlus size={16} />
              </button>
              <button className="btn-icon" onClick={handleCreateFolder} title="Nova Pasta" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                <FolderPlus size={16} />
              </button>
              <button className="btn-icon" onClick={handleUploadClick} disabled={syncing} title="Upload de Imagem" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                <UploadCloud size={16} />
              </button>
            </div>
            <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0.2rem 0' }}></div>
            <button className="btn-icon" onClick={() => openLocalFolder()} title="Abrir Pasta no Windows" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem', color: 'var(--text-secondary)' }}>
              <FolderOpen size={16} />
            </button>
          </div>
          
          <input 
            type="text" 
            placeholder="Pesquisar fichas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />

          <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleFileChange} 
            />
          
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-graph'))} 
            style={{ 
              width: '100%', padding: '0.6rem', 
              background: 'rgba(168, 85, 247, 0.1)', 
              color: 'var(--accent-primary)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold',
              transition: 'all 0.2s'
            }}>
            <BookOpen size={16} /> Abrir Cérebro (Grafo)
          </button>
        </div>
        <div className="wiki-sidebar-content">
          {errorTree && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', padding: '1rem', display: 'flex', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{errorTree}</span>
            </div>
          )}
          {!errorTree && !loadingTree && treeItems.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>O seu cérebro de campanha está vazio.</p>
              <button 
                onClick={async () => {
                  try {
                    setSyncing(true);
                    await initializeWikiTemplate();
                    await loadTree();
                  } catch (e: any) {
                    alert("Erro ao inicializar template: " + e.message);
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
                className="glass-panel hover-glow"
                style={{ padding: '0.5rem', cursor: 'pointer', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.5)', color: '#c084fc', borderRadius: '6px', fontWeight: 'bold' }}
              >
                Inicializar Template Padrão
              </button>
            </div>
          )}
          {!errorTree && (
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.2rem', marginTop: '0.5rem' }}>
              <TreeView 
                node={tree} 
                level={0} 
                activePath={activeFile} 
                ignoredFolders={ignoredFolders}
                onSelect={(path) => setActiveFile(path)}
                onMove={handleMove}
                onRename={handleRename}
                onDropExternal={handleDropExternal}
                onToggleIgnore={toggleIgnore}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Viewer */}
      <div className="wiki-content-area" style={{ position: 'relative', width: '100%', paddingTop: isMobile ? '50px' : '0' }}>
        {activeFile ? (
          activeFile.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
            <div className="wiki-empty-state">
              <ImagePlus size={64} color="var(--glass-border)" />
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Visualização de Imagem Indisponível</h2>
              <p>O arquivo <strong>{activeFile}</strong> é uma imagem e já está salvo no seu HD.</p>
              <p>Para usá-lo, crie um arquivo de texto e use o botão de Inserir Imagem do editor para selecioná-lo!</p>
            </div>
          ) : loadingContent ? (
            <div className="wiki-empty-state">
              <RefreshCw size={32} className="spin" color="var(--accent-primary)" />
              <p>Carregando Pergaminho...</p>
            </div>
          ) : (
            <div className="wiki-markdown" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Editando: {activeFile}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={async () => {
                      if (!confirm(`Tem certeza que deseja excluir ${activeFile}?`)) return;
                      try {
                        const config = getWikiConfig();
                        const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
                        const res = await fetch('/api/wiki/file', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ repoPath, path: activeFile })
                        });
                        if (!res.ok) throw new Error("Failed to delete file");
                        setActiveFile(null);
                        await loadTree();
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao excluir arquivo.");
                      }
                    }}
                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Trash2 size={14} /> Excluir
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    style={{ background: 'var(--accent-secondary)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Save size={14} />
                    {saving ? 'Salvando...' : (justSaved ? '✅ Salvo!' : 'Salvar Local')}
                  </button>
                </div>
              </div>
              
              <FrontmatterPanel 
                rawYaml={frontmatter} 
                onChange={(newYaml) => {
                  setFrontmatter(newYaml);
                  // Auto-save when frontmatter changes
                  if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = window.setTimeout(() => handleSave(), 500);
                }} 
              />

              {/* Injetor Automático de Cabeçalho (Profile Header) */}
              {(() => {
                 try {
                   if (!parsedMeta) return null;

                   if (parsedMeta.nome && (parsedMeta.imagem || parsedMeta.avatar)) {
                     let imgUrlRaw = parsedMeta.imagem || parsedMeta.avatar;
                     let imgUrl = imgUrlRaw.replace(/[\[\]!]/g, "").split("|")[0].trim();
                     if (!imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('/')) {
                       // Force HMR reload
                       const repoPath = (window as any).config?.repoUrl || 'D:/DOZERO/wikidozero';
                       imgUrl = `/api/wiki/media?path=${encodeURIComponent(imgUrl)}&repoPath=${encodeURIComponent(repoPath)}&t=${Date.now()}`;
                     }
                     return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px', paddingTop: '10px' }}>
                          <img 
                            src={imgUrl} 
                            alt={parsedMeta.nome} 
                            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(168,85,247,0.3)', marginBottom: '10px' }} 
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150/333333/FFFFFF?text=👤'; }}
                          />
                          <h1 style={{ margin: 0, fontSize: '2.5em', fontWeight: 'bold', color: 'var(--text-primary)', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {parsedMeta.nome}
                          </h1>
                        </div>
                     );
                   }
                   return null;
                 } catch(e) {
                   return null;
                 }
              })()}

              <WikiEditor 
                editorRef={editorRef}
                key={activeFile} // Force remount when file changes so Editor gets fresh markdown
                markdown={content} 
                onChange={handleEditorChange} 
                onSave={() => handleSave()} 
                activeFile={activeFile}
              />

              {/* Injetor da Ficha de Propriedades na Base */}
              {parsedMeta && (
                <div style={{ marginTop: '20px' }}>
                  <FrontmatterSheetViewer parsedMeta={parsedMeta} />
                </div>
              )}
              
              {/* Dicas de Formatação Markdown (Cheat Sheet) */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                <button 
                  onClick={() => setShowCheatSheet(!showCheatSheet)}
                  className="glass-panel hover-glow"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', background: 'transparent', borderRadius: '4px', fontSize: '0.85rem' }}
                >
                  <FileText size={14} />
                  {showCheatSheet ? 'Esconder Dicas de Formatação' : 'Mostrar Dicas de Formatação (Markdown)'}
                </button>
                
                {showCheatSheet && (
                  <div className="glass-panel animate-fade-in" style={{ marginTop: '1rem', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div className="cheat-sheet-col">
                      <h4 style={{ color: 'var(--accent-primary)', marginTop: 0, marginBottom: '1rem' }}>Títulos & Textos</h4>
                      <div className="cheat-item" onClick={() => insertCheat('# Título 1\n')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}># Título 1</code> → <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Título 1</span></div>
                      <div className="cheat-item" onClick={() => insertCheat('## Título 2\n')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>## Título 2</code> → <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Título 2</span></div>
                      <div className="cheat-item" onClick={() => insertCheat('**Negrito** ')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>**Negrito**</code> → <b>Negrito</b></div>
                      <div className="cheat-item" onClick={() => insertCheat('*Itálico* ')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>*Itálico*</code> → <i>Itálico</i></div>
                      <div className="cheat-item" onClick={() => insertCheat('~~Tachado~~ ')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>~~Tachado~~</code> → <del>Tachado</del></div>
                    </div>
                    <div className="cheat-sheet-col">
                      <h4 style={{ color: 'var(--accent-primary)', marginTop: 0, marginBottom: '1rem' }}>Listas & Outros</h4>
                      <div className="cheat-item" onClick={() => insertCheat('- Item de lista\n')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>- Item de lista</code> → • Item de lista</div>
                      <div className="cheat-item" onClick={() => insertCheat('1. Item numerado\n')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>1. Item numerado</code> → 1. Item numerado</div>
                      <div className="cheat-item" onClick={() => insertCheat('[Link](http...) ')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>[Link](http...)</code> → <span style={{ color: 'var(--accent-secondary)' }}>Link</span></div>
                      <div className="cheat-item" onClick={() => insertCheat('![Imagem](url)\n')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>![Imagem](url)</code> → (Insere Imagem)</div>
                      <div className="cheat-item" onClick={() => insertCheat('[[Link da Wiki]] ')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>[[Nome da Nota]]</code> → Link para o Cérebro</div>
                      <div className="cheat-item" onClick={() => insertCheat('> Citação\n')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>&gt; Citação</code> → <span style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '0.5rem', color: 'var(--text-secondary)' }}>Citação</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="wiki-empty-state">
            <BookOpen size={64} color="var(--glass-border)" />
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Bem-vindo ao Conhecimento</h2>
            <p>Selecione um pergaminho ou pasta à esquerda para começar a leitura, ou abra o <strong style={{color: 'var(--accent-primary)', cursor: 'pointer'}} onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-graph'))}>Cérebro</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
};
