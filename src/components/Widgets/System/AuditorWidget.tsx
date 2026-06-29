import React, { useState } from 'react';
import { useWiki } from '../../../hooks/useWiki';
import { generateAI } from '../../../services/ai/AIProvider';
import { fetchMarkdownContent, saveMarkdownContent } from '../../../utils/githubApi';
import { ShieldAlert, RefreshCw, Wand2, X, AlertTriangle, Search } from 'lucide-react';

interface AuditorWidgetProps {
  onClose: () => void;
}

export const AuditorWidget: React.FC<AuditorWidgetProps> = ({ onClose }) => {
  const { index } = useWiki();
  const [requiredKeys, setRequiredKeys] = useState<string>('hp, nivel, classe, raca');
  const [folderFilter, setFolderFilter] = useState<string>('');
  const [problematicFiles, setProblematicFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const handleScan = () => {
    setIsScanning(true);
    setProblematicFiles([]);
    setSelectedFiles([]);
    setLogs([]);
    
    setTimeout(() => {
      const keys = requiredKeys.split(',').map(k => k.trim().toLowerCase());
      
      const filesToScan = index.filter(f => 
        !folderFilter || f.path.toLowerCase().includes(folderFilter.toLowerCase())
      );

      const flagged: any[] = [];

      filesToScan.forEach(file => {
        const meta = file.metadata || {};
        const missingKeys = keys.filter(k => meta[k] === undefined || meta[k] === null || meta[k] === '');
        
        if (missingKeys.length > 0) {
          flagged.push({
            ...file,
            missing: missingKeys
          });
        }
      });

      setProblematicFiles(flagged);
      setSelectedFiles(flagged.map(f => f.path)); // Seleciona todos por padrão
      setIsScanning(false);
    }, 500);
  };

  const handleFixSelected = async () => {
    const filesToFix = problematicFiles.filter(f => selectedFiles.includes(f.path));
    if (filesToFix.length === 0) return;
    
    setIsFixing(true);
    setProgress({ current: 0, total: filesToFix.length });
    
    for (let i = 0; i < filesToFix.length; i++) {
      const file = filesToFix[i];
      setProgress({ current: i + 1, total: filesToFix.length });
      
      try {
        setLogs(prev => [`[${file.path}] Baixando arquivo...`, ...prev]);
        const content = await fetchMarkdownContent(file.path);
        
        setLogs(prev => [`[${file.path}] Analisando com Inteligência Artificial...`, ...prev]);
        
        const systemPrompt = `Você é um linter estrito de YAML Frontmatter de RPG. O usuário fornecerá o conteúdo de um arquivo Markdown de ficha de personagem.
Seu objetivo é:
1. Extrair o Frontmatter atual (que pode ter chaves com nomes velhos como 'PV', 'Life', 'Level', 'Raça').
2. Renomear e estruturar as chaves para garantir que EXATAMENTE as seguintes chaves existam e sejam preenchidas com coerência: ${requiredKeys}.
3. Não invente valores se não houver contexto, mas tente deduzir (ex: se tiver PV: 10, mude para hp: 10). Se não der para deduzir, coloque 0 ou "Desconhecido".
4. Retorne APENAS o documento inteiro atualizado, começando com --- e terminando com o resto do markdown original. Não diga "Aqui está o documento". RETORNE APENAS TEXTO CRU DO ARQUIVO.`;

        const result = await generateAI({
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          systemPrompt: systemPrompt,
          userPrompt: `Crie a versão padronizada deste arquivo garantindo as chaves ${requiredKeys}:\n\n${content}`,
          temperature: 0.1 // Baixa temperatura para não alucinar no markdown
        });

        const newContent = result.text.trim();
        
        if (newContent.startsWith('---')) {
           await saveMarkdownContent(file.path, newContent);
           setLogs(prev => [`[${file.path}] ✅ Corrigido e salvo!`, ...prev]);
        } else {
           setLogs(prev => [`[${file.path}] ❌ Falha: A IA não retornou um formato válido.`, ...prev]);
        }

      } catch (err: any) {
        setLogs(prev => [`[${file.path}] ❌ Erro: ${err.message}`, ...prev]);
      }
    }
    
    setIsFixing(false);
    setLogs(prev => [`Auditoria e Correção concluídas!`, ...prev]);
  };

  return (
    <div style={{
      position: 'fixed', top: '10vh', left: '50%', transform: 'translateX(-50%)',
      width: '90vw', maxWidth: '700px', height: '80vh',
      background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(147, 51, 234, 0.3)',
      borderRadius: '12px', display: 'flex', flexDirection: 'column', zIndex: 99999,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(16px)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e879f9' }}>
          <ShieldAlert size={20} />
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Auditor de Sistema (Linter)</h2>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Chaves Obrigatórias (Padrão Ouro)</label>
            <input 
              value={requiredKeys}
              onChange={e => setRequiredKeys(e.target.value)}
              disabled={isScanning || isFixing}
              style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '6px', color: '#fff' }}
              placeholder="Ex: hp, estamina, raca"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Pasta Alvo (Opcional)</label>
            <input 
              value={folderFilter}
              onChange={e => setFolderFilter(e.target.value)}
              disabled={isScanning || isFixing}
              style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '6px', color: '#fff' }}
              placeholder="Ex: Personagens"
            />
          </div>
        </div>

        <button 
          onClick={handleScan}
          disabled={isScanning || isFixing}
          style={{ width: '100%', padding: '1rem', background: '#9333ea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          {isScanning ? <RefreshCw size={18} className="spin" /> : <Search size={18} />}
          {isScanning ? 'Escaneando a Base...' : 'Escanear Inconsistências'}
        </button>

        {problematicFiles.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#fca5a5', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                {problematicFiles.length} Documentos fora do Padrão
              </h3>
              <button 
                onClick={() => setSelectedFiles(selectedFiles.length === problematicFiles.length ? [] : problematicFiles.map(f => f.path))}
                style={{ background: 'transparent', border: '1px solid #fca5a5', color: '#fca5a5', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                {selectedFiles.length === problematicFiles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {problematicFiles.map((file, i) => (
                <label key={i} style={{ background: 'rgba(0,0,0,0.4)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedFiles.includes(file.path)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedFiles(prev => [...prev, file.path]);
                      else setSelectedFiles(prev => prev.filter(p => p !== file.path));
                    }}
                    style={{ accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                    <span>{file.path}</span>
                    <span style={{ color: '#f87171', fontSize: '0.75rem' }}>Falta: {file.missing.join(', ')}</span>
                  </div>
                </label>
              ))}
            </div>

            <button 
              onClick={handleFixSelected}
              disabled={isFixing || selectedFiles.length === 0}
              style={{ marginTop: '1rem', width: '100%', padding: '1rem', background: selectedFiles.length > 0 ? '#10b981' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', transition: 'background 0.2s' }}
            >
              {isFixing ? <RefreshCw size={18} className="spin" /> : <Wand2 size={18} />}
              {isFixing ? `Corrigindo com IA (${progress.current}/${progress.total})...` : `Corrigir ${selectedFiles.length} selecionados (IA)`}
            </button>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div style={{ flex: 1, background: '#000', borderRadius: '8px', padding: '1rem', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', color: '#10b981' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '0.25rem', opacity: i === 0 ? 1 : 0.6 }}>{log}</div>
            ))}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}
      </style>
    </div>
  );
};
