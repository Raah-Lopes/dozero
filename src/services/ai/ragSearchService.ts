// src/services/ai/ragSearchService.ts
// Busca semantica (RAG) para o Mestre IA: gera embedding da query
// e recupera chunks relevantes da wiki via match_wiki_chunks().

import { supabase } from '../supabase';

const EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
const MAX_CTX_CHARS = 3000;

/** Gera embedding de uma query via Gemini text-embedding-004 (chave do usuario) */
async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(`${EMBED_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
    }),
  });
  if (!resp.ok) throw new Error(`Gemini embed: ${await resp.text()}`);
  const { embedding } = await resp.json() as { embedding: { values: number[] } };
  return embedding.values;
}

export interface RagChunk {
  source_path: string;
  chunk_text: string;
  similarity: number;
}

/**
 * Busca contexto semantico relevante para uma query.
 * Retorna string formatada pronta para injetar no systemPrompt,
 * ou '' se nao houver embeddings ou chave Gemini.
 */
export async function searchContext(
  query: string,
  campaignId: string,
  geminiApiKey: string,
  matchCount = 5,
): Promise<string> {
  if (!geminiApiKey || !campaignId) return '';

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(query, geminiApiKey);
  } catch {
    // ponytail: sem embedding, degrada graciosamente para contexto vazio
    return '';
  }

  const { data, error } = await supabase.rpc('match_wiki_chunks', {
    query_embedding: queryEmbedding,
    p_campaign_id: campaignId,
    match_count: matchCount,
  });

  if (error || !data?.length) return '';

  const chunks = data as RagChunk[];
  // Filtra por similaridade minima (0.3) e monta contexto
  const relevant = chunks.filter(c => c.similarity >= 0.3);
  if (!relevant.length) return '';

  let ctx = '### Contexto da campanha (trechos relevantes da wiki):\n';
  let total = 0;
  for (const chunk of relevant) {
    const filename = chunk.source_path.split('/').pop()?.replace('.md', '') ?? chunk.source_path;
    const line = `\n**[${filename}]** ${chunk.chunk_text}\n`;
    if (total + line.length > MAX_CTX_CHARS) break;
    ctx += line;
    total += line.length;
  }
  return ctx;
}

/** Verifica se ha embeddings indexados para a campanha */
export async function hasIndexedContent(campaignId: string): Promise<boolean> {
  const { count } = await supabase
    .from('wiki_embeddings')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  return (count ?? 0) > 0;
}
