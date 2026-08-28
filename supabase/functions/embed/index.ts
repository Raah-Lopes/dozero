// supabase/functions/embed/index.ts
// Edge Function: gera embeddings via Gemini text-embedding-004 e upserta em wiki_embeddings.
// Chamada pelo ragIndexService.ts do frontend (JWT de usuário autenticado).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const EMBED_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents'

interface EmbedRequest {
  campaign_id: string
  chunks: { path: string; index: number; text: string; metadata?: Record<string, unknown> }[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  const body: EmbedRequest = await req.json()
  const { campaign_id, chunks } = body

  if (!campaign_id || !chunks?.length) {
    return new Response(JSON.stringify({ error: 'campaign_id and chunks required' }), { status: 400 })
  }
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured in Edge Function secrets' }), { status: 500 })
  }

  // Lotes de até 100 (limite Gemini batchEmbedContents)
  const BATCH = 100
  const rows: { campaign_id: string; source_path: string; chunk_index: number; chunk_text: string; embedding: number[]; metadata: unknown }[] = []

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const geminiBody = {
      requests: batch.map(c => ({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: c.text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }))
    }
    const resp = await fetch(`${EMBED_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    })
    if (!resp.ok) {
      const err = await resp.text()
      return new Response(JSON.stringify({ error: `Gemini error: ${err}` }), { status: 502 })
    }
    const { embeddings } = await resp.json() as { embeddings: { values: number[] }[] }
    batch.forEach((c, j) => {
      rows.push({
        campaign_id,
        source_path: c.path,
        chunk_index: c.index,
        chunk_text: c.text,
        embedding: embeddings[j].values,
        metadata: c.metadata ?? {},
      })
    })
  }

  // Upsert usando service_role via supabaseAdmin para contornar RLS no write em massa
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verifica se o usuário é GM da campanha antes de escrever
  const { data: isMgr } = await supabase.rpc('match_wiki_chunks', {
    query_embedding: rows[0].embedding, p_campaign_id: campaign_id, match_count: 0
  }).maybeSingle()
  // ponytail: usamos uma query simples para checar GM
  const { data: playerRow } = await supabase
    .from('players')
    .select('role')
    .eq('campaign_id', campaign_id)
    .eq('user_id', user.id)
    .maybeSingle()
  const { data: ownerRow } = await supabase
    .from('campaigns')
    .select('owner_id')
    .eq('id', campaign_id)
    .maybeSingle()

  const isGM = ownerRow?.owner_id === user.id || playerRow?.role === 'gm'
  if (!isGM) return new Response('Forbidden', { status: 403 })

  const { error: upsertErr } = await supabaseAdmin
    .from('wiki_embeddings')
    .upsert(rows, { onConflict: 'campaign_id,source_path,chunk_index' })

  if (upsertErr) {
    return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ indexed: rows.length }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
