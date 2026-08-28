// src/services/ai/ragIndexService.ts
// Indexacao semantica da wiki de campanha para o Mestre IA (RAG).
// Chunka documentos Markdown e envia para a Edge Function `embed`.

import { supabase } from '../supabase';

const MAX_CHUNKS_PER_CAMPAIGN = 1000;
const CHUNK_SIZE = 400;   // chars (~100 tokens)
const OVERLAP    = 80;

export interface IndexStats {
  total: number;
  lastIndexed: string | null;
}

/** Divide texto em chunks com overlap */
export function chunkText(text: string, path: string): { path: string; index: number; text: string }[] {
  const chunks: { path: string; index: number; text: string }[] = [];
  const clean = text.replace(/^---[\s\S]*?---\n?/, '').replace(/\r\n/g, '\n').trim();
  if (clean.length < 30) return [];
  let i = 0; let idx = 0;
  while (i < clean.length && idx < 20) {
    const slice = clean.slice(i, i + CHUNK_SIZE);
    if (slice.trim().length > 20) chunks.push({ path, index: idx, text: slice.trim() });
    i += CHUNK_SIZE - OVERLAP; idx++;
  }
  return chunks;
}

/** Indexa a wiki de uma campanha via Edge Function embed */
export async function indexCampaign(
  campaignId: string,
  entries: { path: string; slug: string; metadata?: Record<string, unknown> }[],
  getContent: (path: string) => Promise<string | null>,
  onProgress?: (pct: number) => void,
): Promise<{ indexed: number; skipped: number }> {
  const allChunks: { path: string; index: number; text: string; metadata?: Record<string, unknown> }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    onProgress?.(Math.round((i / entries.length) * 60));
    try {
      const content = await getContent(entry.path);
      if (!content) continue;
      const chunks = chunkText(content, entry.path);
      chunks.forEach(c => allChunks.push({ ...c, metadata: entry.metadata }));
    } catch { /* ponytail: ignora erros individuais */ }
    if (allChunks.length >= MAX_CHUNKS_PER_CAMPAIGN) break;
  }

  if (allChunks.length === 0) return { indexed: 0, skipped: entries.length };

  const BATCH = 100; let indexed = 0;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    onProgress?.(60 + Math.round((i / allChunks.length) * 38));
    const batch = allChunks.slice(i, i + BATCH);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sessao expirada — faca login novamente.');

    const supabaseUrl = (supabase as any).supabaseUrl as string;
    const resp = await fetch(`${supabaseUrl}/functions/v1/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ campaign_id: campaignId, chunks: batch }),
    });

    if (!resp.ok) { const err = await resp.text(); throw new Error(`Embed Edge Function: ${err}`); }
    const result = await resp.json() as { indexed: number };
    indexed += result.indexed;
  }

  onProgress?.(100);
  return { indexed, skipped: entries.length - allChunks.length };
}

/** Estatisticas da indexacao de uma campanha */
export async function getIndexStats(campaignId: string): Promise<IndexStats> {
  const { count, data } = await supabase
    .from('wiki_embeddings')
    .select('created_at', { count: 'exact', head: false })
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1);
  return { total: count ?? 0, lastIndexed: (data as any)?.[0]?.created_at ?? null };
}

/** Remove todos os embeddings (para re-indexar do zero) */
export async function clearCampaignIndex(campaignId: string): Promise<void> {
  await supabase.from('wiki_embeddings').delete().eq('campaign_id', campaignId);
}
