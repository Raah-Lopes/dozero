import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { WikiEditor } from '../../Wiki/WikiEditor';
import { saveMarkdownContent } from '../../../utils/githubApi';
import { Plus, X, Save, FileText, Trash2 } from 'lucide-react';

interface NoteTab {
  id: string;
  title: string;
  content: string;
}

interface GMNotesWidgetProps {
  onClose?: () => void;
}

export const GMNotesWidget: React.FC<GMNotesWidgetProps> = ({ onClose }) => {
  const [tabs, setTabs] = useState<NoteTab[]>(() => {
    try {
      const saved = localStorage.getItem('dozero_gm_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Erro ao carregar notas salvas", e);
    }
    return [{ id: Date.now().toString(), title: 'Rascunho 1', content: '' }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('dozero_gm_notes', JSON.stringify(tabs));
  }, [tabs]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleContentChange = (content: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content } : t));
  };

  const handleAddTab = () => {
    const newId = Date.now().toString();
    setTabs(prev => [...prev, { id: newId, title: `Rascunho ${prev.length + 1}`, content: '' }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close the last tab
    
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  const handleClearTab = () => {
    if (confirm('Tem certeza que deseja apagar este rascunho?')) {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: '' } : t));
    }
  };

  const handleSaveToWiki = async () => {
    if (!activeTab) return;
    
    let filename = activeTab.title;
    if (filename.startsWith('Rascunho')) {
      const res = prompt('Nome do arquivo para salvar na Wiki (sem .md):');
      if (!res) return;
      filename = res;
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: filename } : t));
    }

    try {
      setIsSaving(true);
      const path = `Mestre/Notas/${filename}.md`;
      await saveMarkdownContent(path, activeTab.content);
      alert(`Nota salva com sucesso em: ${path}`);
    } catch (e: any) {
      alert(`Erro ao salvar na Wiki: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameTab = (id: string, currentTitle: string) => {
    const res = prompt('Renomear Aba:', currentTitle);
    if (res && res.trim() !== '') {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, title: res.trim() } : t));
    }
  };

  return (
    <DraggableWindow 
      id="gmNotes" 
      title="Bloco de Notas do Mestre" 
      initialX={200} 
      initialY={100} 
      width={600} 
      height={500} 
      onClose={onClose}
    >
      <div className="flex flex-col h-full bg-slate-900 text-slate-200">
        
        {/* Toolbar de Abas */}
        <div className="flex bg-slate-950 border-b border-slate-800 overflow-x-auto select-none no-scrollbar">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              onDoubleClick={() => handleRenameTab(tab.id, tab.title)}
              className={`group flex items-center gap-2 px-4 py-2 border-r border-slate-800 cursor-pointer min-w-[120px] max-w-[200px] shrink-0
                ${activeTabId === tab.id ? 'bg-slate-800 border-t-2 border-t-indigo-500 text-indigo-300' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <FileText size={14} className={activeTabId === tab.id ? 'text-indigo-400' : ''} />
              <span className="truncate flex-1 text-sm font-medium">{tab.title}</span>
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded-md transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={handleAddTab}
            className="p-2 px-4 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors flex items-center justify-center"
            title="Nova Nota"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="text-xs text-slate-500 italic">
            * Notas são salvas localmente no navegador como rascunhos.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearTab}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 transition-all border border-slate-700 hover:border-red-500/50"
              title="Apagar conteúdo atual"
            >
              <Trash2 size={14} />
              Limpar Rascunho
            </button>
            <button
              onClick={handleSaveToWiki}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-900/20 disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? 'Salvando...' : 'Salvar na Wiki'}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto bg-slate-900">
          {activeTab ? (
            <div className="h-full">
              {/* @mdxeditor/editor precisa de um container que force ele a pegar o tamanho todo. 
                  Como o WikiEditor já é estilizado, apenas passamos o valor. */}
              <WikiEditor 
                key={activeTab.id} // força recarregar o editor interno se mudar de aba
                markdown={activeTab.content} 
                onChange={handleContentChange} 
                onSave={handleSaveToWiki}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Nenhuma nota aberta.
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
