import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { WikiEditor } from '../../Wiki/WikiEditor';
import { saveMarkdownContent } from '../../../utils/githubApi';
import { Plus, X, Save, FileText, Trash2 } from 'lucide-react';
import { state } from '../../../store';
import { toast } from '../../UI/Toast';

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
      const shared = state.gmNotes.get('tabs') as NoteTab[];
      if (shared && shared.length > 0) return shared;
      
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

  // Inscrever para sincronização Yjs em tempo real
  useEffect(() => {
    const observer = () => {
      const shared = state.gmNotes.get('tabs') as NoteTab[];
      if (shared && Array.isArray(shared) && shared.length > 0) {
        setTabs(shared);
      }
    };
    state.gmNotes.observe(observer);
    return () => state.gmNotes.unobserve(observer);
  }, []);

  useEffect(() => {
    localStorage.setItem('dozero_gm_notes', JSON.stringify(tabs));
    try {
      const currentShared = JSON.stringify(state.gmNotes.get('tabs'));
      const newLocal = JSON.stringify(tabs);
      if (currentShared !== newLocal) {
        state.gmNotes.set('tabs', tabs);
      }
    } catch (e) {}
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
      toast.success(`Nota salva com sucesso em: ${path}`);
    } catch (e: any) {
      toast.success(`Erro ao salvar na Wiki: ${e.message}`);
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
      width={650} 
      height={550} 
      onClose={onClose}
    >
      <div className="flex flex-col h-full theme-bg-secondary theme-text-primary font-sans border-t border-[var(--glass-border)] shadow-2xl">
        
        {/* Toolbar de Abas (Estilo Pills Modernos) */}
        <div className="flex theme-bg-primary border-b border-[var(--glass-border)] overflow-x-auto select-none no-scrollbar p-2 gap-2 items-center">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              onDoubleClick={() => handleRenameTab(tab.id, tab.title)}
              className={`group flex items-center gap-2 px-4 py-1.5 rounded-full cursor-pointer min-w-[120px] max-w-[200px] shrink-0 transition-all duration-300 border
                ${activeTabId === tab.id 
                  ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-sm' 
                  : 'bg-white/5 border-transparent hover:bg-white/10 text-[var(--text-secondary)]'}`}
            >
              <FileText size={14} className={activeTabId === tab.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'} />
              <span className="truncate flex-1 text-sm font-medium tracking-wide">{tab.title}</span>
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 p-1 rounded-full transition-all duration-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={handleAddTab}
            className="p-1.5 ml-1 rounded-full bg-white/5 hover:bg-[var(--accent-primary)]/20 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-transparent hover:border-[var(--glass-border)] transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95"
            title="Nova Nota"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center px-4 py-2.5 theme-bg-tertiary border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse"></div>
            Salvo localmente
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClearTab}
              className="group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/5 hover:bg-red-500/15 text-[var(--text-secondary)] hover:text-red-400 transition-all duration-300 border border-[var(--glass-border)]"
              title="Apagar conteúdo atual"
            >
              <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
              Limpar
            </button>
            <button
              onClick={handleSaveToWiki}
              disabled={isSaving}
              className="group flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-full bg-[var(--accent-primary)] hover:brightness-110 text-white transition-all duration-300 shadow-md border border-white/10 disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              <Save size={14} className="group-hover:scale-110 transition-transform" />
              {isSaving ? 'Salvando...' : 'Salvar na Wiki'}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto bg-transparent relative">
          {activeTab ? (
            <div className="h-full absolute inset-0 animate-fade-in">
              <WikiEditor 
                key={activeTab.id} 
                markdown={activeTab.content} 
                onChange={handleContentChange} 
                onSave={handleSaveToWiki}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-[var(--glass-border)] shadow-inner">
                <FileText size={32} />
              </div>
              <p className="text-sm font-medium tracking-wide">Nenhuma nota aberta.</p>
              <button 
                onClick={handleAddTab}
                className="mt-4 px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-primary)] border border-[var(--glass-border)] transition-all text-sm font-medium"
              >
                Criar Rascunho
              </button>
            </div>
          )}
        </div>
      </div>
    </DraggableWindow>
  );
};
