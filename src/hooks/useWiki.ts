import { useState, useEffect, useMemo } from 'react';
import { WikiIndexer } from '../services/wiki/WikiIndexer';
import { WikiQuery } from '../services/wiki/WikiQuery';
import type { WikiEntry } from '../services/wiki/WikiQuery';

export function useWiki() {
  const [index, setIndex] = useState<WikiEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const builtIndex = await WikiIndexer.buildIndex();
        setIndex(builtIndex);
        setError(null);
      } catch (err) {
        console.error('Erro ao inicializar índice da Wiki:', err);
        setError('Falha ao carregar o banco de dados da Wiki.');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Expondo uma função construtora do motor de buscas memoizada
  const query = useMemo(() => {
    return () => new WikiQuery(index);
  }, [index]);

  return {
    index,       // Todos os arquivos puros para exibir listas não filtradas
    query,       // Motor de busca (ex: query().where('tipo', 'magia').get())
    isLoading,   // Estado de carregamento do índice
    error
  };
}

export function useWikiFile(path: string) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!path) return;
      setIsLoading(true);
      const text = await WikiIndexer.loadFileContent(path);
      setContent(text);
      setIsLoading(false);
    }
    load();
  }, [path]);

  return { content, isLoading };
}
