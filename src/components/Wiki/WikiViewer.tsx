import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchRepositoryTree, fetchMarkdownContent, saveMarkdownContent, createFolder, pushToGithub } from '../../utils/githubApi';
import type { GithubTreeItem } from '../../utils/githubApi';
import { Folder, FileText, ChevronRight, ChevronDown, RefreshCw, AlertCircle, BookOpen, FilePlus, FolderPlus, UploadCloud, Save } from 'lucide-react';
import { WikiEditor } from './WikiEditor';
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
  onSelect: (path: string) => void 
}> = ({ node, level, activePath, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === 'tree';
  const isActive = activePath === node.path;

  // Render children se for root (level = 0) ou se a pasta estiver aberta
  const hasChildren = Object.keys(node.children).length > 0;

  if (level === 0) {
    return (
      <div className="wiki-tree-root">
        {Object.values(node.children).map(child => (
          <TreeView key={child.path} node={child} level={level + 1} activePath={activePath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="wiki-tree-node" style={{ marginLeft: level === 1 ? 0 : '1rem' }}>
      <div 
        className={`wiki-tree-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (isDir) setIsOpen(!isOpen);
          else onSelect(node.path);
        }}
      >
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
      
      {isDir && isOpen && hasChildren && (
        <div className="wiki-tree-children">
          {Object.values(node.children).map(child => (
            <TreeView key={child.path} node={child} level={level + 1} activePath={activePath} onSelect={onSelect} />
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

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    try {
      await saveMarkdownContent(activeFile, content);
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
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
        <div className="wiki-sidebar-header" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <BookOpen size={18} color="var(--accent-primary)" />
              Sua Wiki Local
            </div>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              <button className="btn-icon" onClick={handleCreateFile} title="Novo Arquivo">
                <FilePlus size={14} />
              </button>
              <button className="btn-icon" onClick={handleCreateFolder} title="Nova Pasta">
                <FolderPlus size={14} />
              </button>
              <button className="btn-icon" onClick={loadTree} title="Recarregar Pasta">
                <RefreshCw size={14} className={loadingTree ? 'spin' : ''} />
              </button>
            </div>
          </div>
          <button 
            onClick={handlePush} 
            disabled={syncing}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <UploadCloud size={16} className={syncing ? 'spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Fazer Push para o Git'}
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
            <TreeView node={tree} level={0} activePath={activeFile} onSelect={setActiveFile} />
          )}
        </div>
      </div>

      {/* Main Content Viewer */}
      <div className="wiki-content-area">
        {activeFile ? (
          loadingContent ? (
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
                  {saving ? 'Salvando...' : 'Salvar Local'}
                </button>
              </div>
              <WikiEditor 
                key={activeFile} // Force remount when file changes so Editor gets fresh markdown
                markdown={content} 
                onChange={(md) => setContent(md)} 
                onSave={handleSave} 
              />
            </div>
          )
        ) : (
          <div className="wiki-empty-state">
            <BookOpen size={64} color="var(--glass-border)" />
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Bem-vindo à Biblioteca</h2>
            <p>Selecione um documento na barra lateral para começar a ler.</p>
          </div>
        )}
      </div>
    </div>
  );
};
