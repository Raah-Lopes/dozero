import React, { useState } from 'react';
import { useStore } from '../../store';
import { sanitizeHTML } from '../../utils/sanitizer';

export const LoreMachineWidget: React.FC = () => {
  const { addLoreEntry } = useStore();
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    
    // Simulação de geração (substituir pela chamada real à API se houver)
    setTimeout(() => {
      const generatedContent = `<p>História gerada sobre <strong>${topic}</strong>...</p>`;
      
      addLoreEntry({
        id: Date.now().toString(),
        title: topic,
        content: generatedContent,
        lastModified: Date.now(),
      });
      
      setContent(generatedContent);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <h2 className="text-xl font-bold text-purple-400">Máquina de Lore</h2>
      
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Tópico da história..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic}
          className="w-full p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-white font-bold transition-colors"
        >
          {isGenerating ? 'Gerando...' : 'Gerar História'}
        </button>
      </div>

      <div className="flex-1 bg-gray-800 rounded p-4 overflow-y-auto border border-gray-700 prose prose-invert max-w-none">
        {content ? (
          // SEGURANÇA: Sanitização do HTML antes de renderizar
          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }} />
        ) : (
          <p className="text-gray-500 italic">O lore gerado aparecerá aqui...</p>
        )}
      </div>
    </div>
  );
};
