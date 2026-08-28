import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chunkText, indexCampaign } from '../services/ai/ragIndexService';
import { searchContext, hasIndexedContent } from '../services/ai/ragSearchService';
import { supabase } from '../services/supabase';

vi.mock('../services/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
      supabaseUrl: 'https://test-project.supabase.co',
    },
    isSupabaseConfigured: true,
  };
});

describe('RAG Index Service & Semantic Search (F.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).fetch = vi.fn();
  });

  describe('chunkText', () => {
    it('strips YAML frontmatter properly', () => {
      const markdown = `---
title: Reino de Eldoria
tipo: Local
nivel: 5
---
Eldoria e um reino antigo situado alem das montanhas geladas do norte.
Suas muralhas de pedra resistiram a dez cercos ao longo dos seculos.`;

      const chunks = chunkText(markdown, 'reinos/eldoria.md');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].text).not.toContain('title: Reino de Eldoria');
      expect(chunks[0].text).toContain('Eldoria e um reino antigo');
      expect(chunks[0].path).toBe('reinos/eldoria.md');
      expect(chunks[0].index).toBe(0);
    });

    it('ignores texts that are too short (< 30 chars)', () => {
      const shortText = 'Texto curto.';
      const chunks = chunkText(shortText, 'short.md');
      expect(chunks).toEqual([]);
    });

    it('creates multiple overlapping chunks for long documents', () => {
      // 1000 characters
      const longText = 'A'.repeat(300) + 'B'.repeat(300) + 'C'.repeat(300) + 'D'.repeat(200);
      const chunks = chunkText(longText, 'long.md');
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
      // Chunks should have overlap
      expect(chunks[0].text.length).toBeLessThanOrEqual(400);
    });

    it('limits max chunks per document to 20', () => {
      const massiveText = 'Paragrafo de teste longo sobre monstros e masmorras lendarias. '.repeat(200);
      const chunks = chunkText(massiveText, 'massive.md');
      expect(chunks.length).toBeLessThanOrEqual(20);
    });
  });

  describe('indexCampaign', () => {
    it('returns 0 indexed when there are no valid documents', async () => {
      const entries = [{ path: 'empty.md', slug: 'empty' }];
      const getContent = vi.fn().mockResolvedValue('');
      const result = await indexCampaign('mesa-01', entries, getContent);

      expect(result.indexed).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('chunks documents, calls Edge Function embed and reports progress', async () => {
      const entries = [
        { path: 'fichas/heroi.md', slug: 'heroi', metadata: { tipo: 'PC' } },
        { path: 'locais/castelo.md', slug: 'castelo', metadata: { tipo: 'Local' } },
      ];

      const getContent = vi.fn().mockImplementation((path: string) => {
        return Promise.resolve(
          `Documento detalhado sobre ${path} com muitas informacoes sobre a campanha para o mestre poder consultar semanticamente.`
        );
      });

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'fake-jwt-token' } },
      });

      (global as any).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ indexed: 2 }),
      });

      const progressSteps: number[] = [];
      const onProgress = (pct: number) => progressSteps.push(pct);

      const result = await indexCampaign('mesa-01', entries, getContent, onProgress);

      expect(getContent).toHaveBeenCalledTimes(2);
      expect((global as any).fetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/embed',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-jwt-token',
          }),
        })
      );
      expect(result.indexed).toBe(2);
      expect(progressSteps).toContain(100);
    });
  });

  describe('searchContext', () => {
    it('returns empty string if missing apiKey or campaignId', async () => {
      expect(await searchContext('quem e o rei?', '', 'fake-key')).toBe('');
      expect(await searchContext('quem e o rei?', 'mesa-01', '')).toBe('');
    });

    it('retrieves relevant chunks and formats system context', async () => {
      // Mock Gemini embedContent response
      (global as any).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: new Array(768).fill(0.1) },
        }),
      });

      // Mock Supabase RPC match_wiki_chunks
      (supabase.rpc as any).mockResolvedValue({
        data: [
          {
            source_path: 'npcs/valerius.md',
            chunk_text: 'Valerius e o comandante da guarda real e leal a coroa.',
            similarity: 0.85,
          },
          {
            source_path: 'locais/cidadela.md',
            chunk_text: 'A cidadela real abriga o trono e as reservas de ouro.',
            similarity: 0.72,
          },
        ],
        error: null,
      });

      const context = await searchContext('Onde fica o comandante?', 'mesa-01', 'fake-gemini-key');

      expect(context).toContain('### Contexto da campanha (trechos relevantes da wiki):');
      expect(context).toContain('**[valerius]** Valerius e o comandante');
      expect(context).toContain('**[cidadela]** A cidadela real');
    });

    it('filters out chunks with low similarity (< 0.3)', async () => {
      (global as any).fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          embedding: { values: new Array(768).fill(0.1) },
        }),
      });

      (supabase.rpc as any).mockResolvedValue({
        data: [
          {
            source_path: 'random/irrelevant.md',
            chunk_text: 'Texto totalmente desconexo e nao relacionado.',
            similarity: 0.15,
          },
        ],
        error: null,
      });

      const context = await searchContext('Qual a profecia?', 'mesa-01', 'fake-gemini-key');
      expect(context).toBe('');
    });
  });

  describe('hasIndexedContent', () => {
    it('returns true when embeddings count > 0', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 42 }),
        }),
      });

      const hasContent = await hasIndexedContent('mesa-01');
      expect(hasContent).toBe(true);
    });

    it('returns false when embeddings count is 0', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0 }),
        }),
      });

      const hasContent = await hasIndexedContent('mesa-01');
      expect(hasContent).toBe(false);
    });
  });
});
