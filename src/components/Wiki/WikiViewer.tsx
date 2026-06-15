import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchRepositoryTree, fetchMarkdownContent, saveMarkdownContent, createFolder, moveFileOrFolder, pushToGithub } from '../../utils/githubApi';
import { convertImageToWebP } from '../../utils/imageUtils';
import type { GithubTreeItem } from '../../utils/githubApi';
import { 
  Folder, FileText, ChevronRight, ChevronDown, 
  RefreshCw, Plus, FilePlus, FolderPlus, UploadCloud, AlertCircle, Save, BookOpen, Edit2, ImagePlus
} from 'lucide-react';
import { WikiEditor } from './WikiEditor';
import { WikiGraph } from './WikiGraph';
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
  onSelect: (path: string) => void;
  onMove: (oldPath: string, newPath: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  onDropExternal: (files: FileList, targetPath: string) => void;
}> = ({ node, level, activePath, onSelect, onMove, onRename, onDropExternal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const isDir = node.type === 'tree';
  const isActive = activePath === node.path;
  const hasChildren = Object.keys(node.children).length > 0;

  if (level === 0) {
    return (
      <div className="wiki-tree-root">
        {Object.values(node.children).map(child => (
          <TreeView key={child.path} node={child} level={level + 1} activePath={activePath} onSelect={onSelect} onMove={onMove} onRename={onRename} onDropExternal={onDropExternal} />
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
      </div>
      
      {isDir && isOpen && hasChildren && (
        <div className="wiki-tree-children">
          {Object.values(node.children).map(child => (
            <TreeView key={child.path} node={child} level={level + 1} activePath={activePath} onSelect={onSelect} onMove={onMove} onRename={onRename} onDropExternal={onDropExternal} />
          ))}
        </div>
      )}
    </div>
  );
};

export const WikiViewer: React.FC = () => {
  const [treeItems, setTreeItems] = useState<GithubTreeItem[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [errorTree, setErrorTree] = useState<string | null>(null);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  
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
      const repoPath = config.repoUrl || 'D:/wikidozero';
      
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
      const repoPath = config.repoUrl || 'D:/wikidozero';

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
    const currentFolder = activeFile ? activeFile.substring(0, activeFile.lastIndexOf('/')) : 'Campanhadozero';
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
    const currentFolder = activeFile ? activeFile.substring(0, activeFile.lastIndexOf('/')) : 'Campanhadozero';
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
      const finalContent = typeof textToSave === 'string' ? textToSave : content;
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
  }, []);

  useEffect(() => {
    if (!activeFile) return;
    const loadContent = async () => {
      setLoadingContent(true);
      try {
        const text = await fetchMarkdownContent(activeFile);
        setContent(text);
      } catch (err: any) {
        setContent(`*Erro ao carregar arquivo:* ${err.message}`);
      } finally {
        setLoadingContent(false);
      }
    };
    loadContent();
  }, [activeFile]);

  const tree = useMemo(() => buildTree(treeItems), [treeItems]);

  return (
    <div className="wiki-container animate-fade-in">
      {/* Sidebar */}
      <div className="wiki-sidebar">
        <div className="wiki-sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <BookOpen size={18} color="var(--accent-primary)" />
              Sua Wiki Local
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn-icon" onClick={handleCreateFolder} title="Nova Pasta">
                <FolderPlus size={16} />
              </button>
              <button className="btn-icon" onClick={handleCreateFile} title="Novo Pergaminho">
                <FilePlus size={16} />
              </button>
              <button className="btn-icon" onClick={handleUploadClick} disabled={syncing} title="Fazer Upload de Arquivo">
                <UploadCloud size={16} className={syncing ? 'spin' : ''} />
              </button>
              <button className="btn-icon" onClick={handlePush} disabled={syncing} title="Sincronizar com GitHub">
                <RefreshCw size={16} className={syncing ? 'spin' : ''} />
              </button>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleFileChange} 
            />
          </div>
          
          <button 
            onClick={() => setShowGraph(!showGraph)} 
            style={{ 
              width: '100%', padding: '0.6rem', 
              background: showGraph ? 'var(--accent-primary)' : 'rgba(168, 85, 247, 0.1)', 
              color: showGraph ? 'white' : 'var(--accent-primary)',
              border: showGraph ? 'none' : '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold',
              transition: 'all 0.2s'
            }}>
            <BookOpen size={16} /> {showGraph ? 'Voltar aos Pergaminhos' : 'Abrir Cérebro (Grafo)'}
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
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
              Repositório vazio ou não configurado. Vá nas configurações do sistema para definir seu repositório.
            </div>
          )}
          {!errorTree && (
            <TreeView 
            node={tree} 
            level={0} 
            activePath={activeFile} 
            onSelect={setActiveFile} 
            onMove={handleMove} 
            onRename={handleRename}
            onDropExternal={handleDropExternal}
          />
          )}
        </div>
      </div>

      {/* Main Content Viewer */}
      <div className="wiki-content-area" style={{ position: 'relative' }}>
        {showGraph ? (
          <WikiGraph onNodeClick={(path) => { setActiveFile(path); setShowGraph(false); }} />
        ) : activeFile ? (
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
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ background: 'var(--accent-secondary)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Save size={14} />
                  {saving ? 'Salvando...' : (justSaved ? '✅ Salvo!' : 'Salvar Local')}
                </button>
              </div>
              <WikiEditor 
                editorRef={editorRef}
                key={activeFile} // Force remount when file changes so Editor gets fresh markdown
                markdown={content} 
                onChange={handleEditorChange} 
                onSave={() => handleSave()} 
                activeFile={activeFile}
              />
              
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
                      <div className="cheat-item" onClick={() => insertCheat('~~Tachado~~ ')} title="Clique para inserir"><code style={{ color: 'var(--text-secondary)' }}>~~Tachado~~</code> → <strike>Tachado</strike></div>
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
            <p>Selecione um pergaminho ou pasta à esquerda para começar a leitura, ou abra o <strong style={{color: 'var(--accent-primary)', cursor: 'pointer'}} onClick={() => setShowGraph(true)}>Cérebro</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
};
