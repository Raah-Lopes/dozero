-- ==========================================================================
-- DOZERO F.1 — RAG Semantic Search & Vector Embeddings for Game Master AI
-- Applied: 2026-08-27
-- Features:
--   1. pgvector extension for high-dimensional vector embeddings
--   2. wiki_embeddings table for chunked campaign documents (768-dim Gemini embeddings)
--   3. HNSW index for cosine distance similarity
--   4. RLS policies: campaign members can read, GMs can manage embeddings
--   5. match_wiki_chunks RPC function for semantic retrieval
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.wiki_embeddings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL,
  source_path text NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  chunk_text  text NOT NULL,
  embedding   vector(768),
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (campaign_id, source_path, chunk_index)
);

ALTER TABLE public.wiki_embeddings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS wiki_embeddings_hnsw_idx
  ON public.wiki_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_wiki_embeddings_campaign
  ON public.wiki_embeddings (campaign_id);

CREATE POLICY "wiki_embeddings_select" ON public.wiki_embeddings
  FOR SELECT TO authenticated
  USING (private.can_view_campaign(campaign_id));

CREATE POLICY "wiki_embeddings_insert" ON public.wiki_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (private.is_campaign_manager(campaign_id));

CREATE POLICY "wiki_embeddings_update" ON public.wiki_embeddings
  FOR UPDATE TO authenticated
  USING (private.is_campaign_manager(campaign_id))
  WITH CHECK (private.is_campaign_manager(campaign_id));

CREATE POLICY "wiki_embeddings_delete" ON public.wiki_embeddings
  FOR DELETE TO authenticated
  USING (private.is_campaign_manager(campaign_id));

CREATE OR REPLACE FUNCTION public.match_wiki_chunks(
  query_embedding vector(768),
  p_campaign_id   text,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  source_path text,
  chunk_text  text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.id,
    e.source_path,
    e.chunk_text,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM wiki_embeddings e
  WHERE e.campaign_id = p_campaign_id
    AND private.can_view_campaign(p_campaign_id)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_wiki_chunks(vector, text, int) FROM anon, PUBLIC;
