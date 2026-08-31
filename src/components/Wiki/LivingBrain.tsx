import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArcanumGraph from './Graph/ArcanumGraph';
import { getWikiConfig } from '../../store';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';
import { DEFAULT_TYPES, type NodeShape, type WEdge, type WNode } from './Graph/core';
import { Layouts, type VaultPayload } from './Graph/world';
import { TYPE_ORDER } from './Graph/seed';
import { formatWikiConnection, type WikiConnectionDraft } from '../../utils/wikiConnections';
import { useWindowManager } from '../../hooks/useWindowManager';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';
import type { WikiGraphLinkSource, WikiGraphNodeSource } from '../../services/wiki/wikiGraphData';
import { saveMarkdownContent } from '../../utils/githubApi';
import { state } from '../../services/yjs';
import { CodexDocument, normalizeCodex } from './Codex/codexModel';
import { Icone } from './Codex/CodexIcons';

const SHARED_GRAPH_KEY = '__arcanum_graph_v1__';

function readSharedGraph(): VaultPayload | null {
  const raw = state.wiki.get(SHARED_GRAPH_KEY);
  if (!raw || typeof raw !== 'object') return null;
  const graph = raw as Partial<VaultPayload>;
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null;
  return {
    v: typeof graph.v === 'number' ? graph.v : 1,
    nodes: graph.nodes,
    edges: graph.edges,
    customTypes: Array.isArray(graph.customTypes) ? graph.customTypes : [],
    savedViews: Array.isArray(graph.savedViews) ? graph.savedViews : [],
  };
}

const getBundledWikiFiles = async (): Promise<Record<string, string>> => {
  const modules = import.meta.glob('../../../wikidozero/**/*.md', {
    query: '?raw',
    import: 'default',
  });
  const entries = await Promise.all(
    Object.entries(modules).map(async ([path, loader]) => {
      try {
        const content = (await loader()) as string;
        const cleanPath = path.replace('../../../wikidozero/', '').replace(/^\.\//, '');
        return [cleanPath, content] as [string, string];
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null));
};

function buildGraphFromCodex(codex: CodexDocument, repoPath: string): { nodes: WNode[]; edges: WEdge[] } {
  if (!codex || codex.notes.length === 0) return { nodes: [], edges: [] };
  const typeAliases: Record<string, string> = {
    person: 'personagem',
    place: 'local',
    faction: 'organizacao',
    item: 'item',
    event: 'evento',
    creature: 'criatura',
    lore: 'conceito',
  };

  const mappedNodes: WNode[] = codex.notes.map((note) => {
    const rawType = String(note.typeId || '').toLowerCase();
    const matchedType = DEFAULT_TYPES.find((t) => t.id === (typeAliases[rawType] || rawType)) || DEFAULT_TYPES[0];
    const shape: NodeShape = (matchedType.shape || 'circle') as NodeShape;

    return {
      id: note.id,
      type: 'world',
      position: { x: 0, y: 0 },
      data: {
        label: note.name || note.id,
        typeId: matchedType.id,
        summary: note.description || '',
        icon: matchedType.icon,
        image: note.imageUrl ? resolveMediaUrl(note.imageUrl, repoPath) : undefined,
        shape,
        tags: note.tags || [],
        ficha: {
          status: String(note.fields.status || 'Ativo'),
          level: note.fields.level as string | number | undefined,
          gmNotes: note.description || '',
          inventory: '',
        },
        wikiPath: note.id,
      },
    };
  });

  const clusteredNodes = Layouts.clusterByType(mappedNodes, TYPE_ORDER);
  const validNodeIds = new Set(clusteredNodes.map((cn) => cn.id));
  const nameToId = new Map(clusteredNodes.map((cn) => [cn.data.label.toLowerCase(), cn.id]));

  const mappedEdges: WEdge[] = codex.relations
    .map((r, i) => {
      const src = r.sourceId;
      const tgt = validNodeIds.has(r.targetId) ? r.targetId : nameToId.get(String(r.targetId).toLowerCase());
      if (validNodeIds.has(src) && tgt) {
        return {
          id: r.id || `e_${src}_${tgt}_${i}`,
          source: src,
          target: tgt,
          type: 'world',
          data: {
            label: r.label || '',
            color: r.color || '#d8b45a',
            wikiSourcePath: r.sourceId,
          },
        };
      }
      return null;
    })
    .filter(Boolean) as WEdge[];

  return { nodes: clusteredNodes, edges: mappedEdges };
}

/** Mantém o layout manual do grafo, mas nunca esconde entidades novas do Códice. */
function mergeCodexIntoGraph(saved: VaultPayload, codex: CodexDocument, repoPath: string): VaultPayload {
  const fromCodex = buildGraphFromCodex(codex, repoPath);
  const nodeIds = new Set(saved.nodes.map((node) => node.id));
  const edgeIds = new Set(saved.edges.map((edge) => edge.id));
  return {
    ...saved,
    nodes: [...saved.nodes, ...fromCodex.nodes.filter((node) => !nodeIds.has(node.id))],
    edges: [...saved.edges, ...fromCodex.edges.filter((edge) => !edgeIds.has(edge.id))],
  };
}

/**
 * LivingBrain — O Cérebro do Mundo (Arcanum)
 * Integração imediata (0ms) do Grafo Semântico com o Códice e Wiki.
 */
export const LivingBrain: React.FC = () => {
  const { setViewMode } = useWindowManager();
  const initialSharedGraph = useMemo(() => readSharedGraph(), []);

  // Carregamento síncrono instantâneo a partir do Códice em memória
  const initialData = useMemo(() => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const codex = normalizeCodex(state.wiki.get('__codex_v1__'));
      if (initialSharedGraph) {
        const merged = mergeCodexIntoGraph(initialSharedGraph, codex, repoPath);
        return { nodes: merged.nodes, edges: merged.edges };
      }
      return buildGraphFromCodex(codex, repoPath);
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [initialSharedGraph]);

  const [wikiNodes, setWikiNodes] = useState<WNode[]>(initialData.nodes);
  const [wikiEdges, setWikiEdges] = useState<WEdge[]>(initialData.edges);
  const [sharedGraph, setSharedGraph] = useState<VaultPayload | null>(initialSharedGraph);
  const [isLoading, setIsLoading] = useState(initialData.nodes.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [graphVersion, setGraphVersion] = useState(0);
  const graphSerialized = useRef(initialSharedGraph ? JSON.stringify(initialSharedGraph) : '');

  const fetchGraphData = useCallback(async (isBackgroundRefresh = false) => {
    try {
      const shared = readSharedGraph();
      if (shared) {
        const config = getWikiConfig();
        const merged = mergeCodexIntoGraph(shared, normalizeCodex(state.wiki.get('__codex_v1__')), config.repoUrl || 'D:/DOZERO/wikidozero');
        const serialized = JSON.stringify(merged);
        if (serialized !== graphSerialized.current) {
          graphSerialized.current = serialized;
          setSharedGraph(merged);
          setWikiNodes(merged.nodes);
          setWikiEdges(merged.edges);
          if (!isBackgroundRefresh) setGraphVersion((v) => v + 1);
        }
        setIsLoading(false);
        return;
      }

      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const codex = normalizeCodex(state.wiki.get('__codex_v1__'));

      if (!isBackgroundRefresh && codex.notes.length === 0 && wikiNodes.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      if (codex.notes.length > 0) {
        const { nodes, edges } = buildGraphFromCodex(codex, repoPath);
        setWikiNodes(nodes);
        setWikiEdges(edges);
        if (!isBackgroundRefresh) setGraphVersion((v) => v + 1);
        setIsLoading(false);
        return;
      }

      // Se o códice estiver vazio, busca da Wiki Markdown empacotada
      let json: { nodes: WikiGraphNodeSource[]; links: WikiGraphLinkSource[] };
      try {
        const bundledWikiFiles = await getBundledWikiFiles();
        json = await WikiIndexer.buildGraph(bundledWikiFiles);
      } catch {
        json = { nodes: [], links: [] };
      }

      if (json.nodes.length === 0) {
        setWikiNodes([]);
        setWikiEdges([]);
        setIsLoading(false);
        return;
      }

      const typeAliases: Record<string, string> = {
        person: 'personagem',
        place: 'local',
        faction: 'organizacao',
        item: 'item',
        event: 'evento',
        creature: 'criatura',
        lore: 'conceito',
      };

      const mappedNodes: WNode[] = json.nodes.map((n: WikiGraphNodeSource) => {
        const pathLower = String(n.path || '').toLowerCase();
        const rawGroup = String(n.group || '').toLowerCase();
        const rawEntity = String(n.entityType || '').toLowerCase();

        let detectedType = rawEntity || rawGroup;
        if (!detectedType || detectedType === 'conceito') {
          if (pathLower.includes('personag') || pathLower.includes('npc') || pathLower.includes('jogador')) {
            detectedType = 'personagem';
          } else if (pathLower.includes('criatur') || pathLower.includes('monstro') || pathLower.includes('bestiar')) {
            detectedType = 'criatura';
          } else if (pathLower.includes('loca') || pathLower.includes('cidade') || pathLower.includes('reino') || pathLower.includes('lugar')) {
            detectedType = 'local';
          } else if (pathLower.includes('item') || pathLower.includes('artefato') || pathLower.includes('equip')) {
            detectedType = 'item';
          } else if (pathLower.includes('facc') || pathLower.includes('organiza') || pathLower.includes('guild')) {
            detectedType = 'organizacao';
          } else if (pathLower.includes('divin') || pathLower.includes('deus') || pathLower.includes('panta')) {
            detectedType = 'divindade';
          } else if (pathLower.includes('evento') || pathLower.includes('histor') || pathLower.includes('cronolog')) {
            detectedType = 'evento';
          } else if (pathLower.includes('sessa') || pathLower.includes('sessao') || pathLower.includes('resumo') || pathLower.includes('diario')) {
            detectedType = 'resumo';
          } else if (pathLower.includes('rota') || pathLower.includes('viagem') || pathLower.includes('mapa')) {
            detectedType = 'rota';
          } else if (pathLower.includes('raca') || pathLower.includes('povo') || pathLower.includes('especie')) {
            detectedType = 'racas';
          }
        }

        const matchedType = DEFAULT_TYPES.find((t) => t.id === (typeAliases[detectedType] || detectedType)) || DEFAULT_TYPES[0];
        const imageUrl = n.avatar ? resolveMediaUrl(n.avatar, repoPath) : undefined;
        const shape: NodeShape = n.shape || matchedType.shape || 'circle';

        return {
          id: n.id || n.name,
          type: 'world',
          position: { x: 0, y: 0 },
          data: {
            label: n.name || n.id,
            typeId: matchedType.id,
            summary: n.description || '',
            icon: matchedType.icon,
            image: imageUrl,
            shape,
            tags: n.tags || [],
            ficha: {
              status: n.status || 'Ativo',
              level: n.level || n.nd,
              gmNotes: n.gmNotes || '',
              inventory: n.inventory || '',
            },
            wikiPath: n.path || '',
          },
        };
      });

      const clusteredNodes = Layouts.clusterByType(mappedNodes, TYPE_ORDER);
      const validNodeIds = new Set(clusteredNodes.map((cn) => cn.id));
      const nameToId = new Map(clusteredNodes.map((cn) => [cn.data.label.toLowerCase(), cn.id]));

      const mappedEdges: WEdge[] = (json.links || [])
        .map((l: WikiGraphLinkSource, i: number) => {
          const src = l.source;
          const tgt = l.target;
          const resolvedTarget = validNodeIds.has(tgt) ? tgt : nameToId.get(String(tgt).toLowerCase());
          if (validNodeIds.has(src) && resolvedTarget) {
            return {
              id: l.id || `e_${src}_${resolvedTarget}_${i}`,
              source: src,
              target: resolvedTarget,
              type: 'world',
              data: {
                label: l.label || '',
                color: l.color || '#d8b45a',
                wikiSourcePath: l.sourcePath || src,
              },
            };
          }
          return null;
        })
        .filter(Boolean) as WEdge[];

      setWikiNodes(clusteredNodes);
      setWikiEdges(mappedEdges);
      if (!isBackgroundRefresh) {
        setGraphVersion((version) => version + 1);
      }
    } catch (err) {
      console.warn('[LivingBrain] Aviso ao atualizar dados do Grafo:', err);
    } finally {
      setIsLoading(false);
    }
  }, [wikiNodes.length]);

  useEffect(() => {
    void fetchGraphData(false);

    const refresh = () => void fetchGraphData(true);
    let debounceTimer: number;
    const refreshFromSharedState = (event: { keysChanged?: Set<string> }) => {
      if (event.keysChanged?.has(SHARED_GRAPH_KEY)) {
        const shared = readSharedGraph();
        if (!shared) return;
        const config = getWikiConfig();
        const merged = mergeCodexIntoGraph(shared, normalizeCodex(state.wiki.get('__codex_v1__')), config.repoUrl || 'D:/DOZERO/wikidozero');
        const serialized = JSON.stringify(merged);
        if (serialized === graphSerialized.current) return;
        graphSerialized.current = serialized;
        setSharedGraph(merged);
        setWikiNodes(merged.nodes);
        setWikiEdges(merged.edges);
        setIsLoading(false);
        setGraphVersion((v) => v + 1);
        return;
      }
      if (event.keysChanged && !event.keysChanged.has('__codex_v1__')) return;
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => fetchGraphData(true), 1200);
    };

    state.wiki.observe(refreshFromSharedState);
    window.addEventListener('wiki-updated', refresh);
    window.addEventListener('codex-updated', refresh);

    return () => {
      window.clearTimeout(debounceTimer);
      window.removeEventListener('wiki-updated', refresh);
      window.removeEventListener('codex-updated', refresh);
      state.wiki.unobserve(refreshFromSharedState);
    };
  }, [fetchGraphData]);

  const persistGraph = useCallback((payload: VaultPayload) => {
    const serialized = JSON.stringify(payload);
    if (serialized === graphSerialized.current) return;
    graphSerialized.current = serialized;
    state.wiki.set(SHARED_GRAPH_KEY, payload);
  }, []);

  const graphPayload = useMemo<VaultPayload>(() => ({
    v: sharedGraph?.v || 1,
    nodes: wikiNodes,
    edges: wikiEdges,
    customTypes: sharedGraph?.customTypes || [],
    savedViews: sharedGraph?.savedViews || [],
  }), [sharedGraph, wikiNodes, wikiEdges]);

  // Criação de conexão direta no markdown da Wiki ou Códice
  const handleCreateWikiRelation = async (sourcePath: string, targetName: string, label: string) => {
    try {
      const codex = normalizeCodex(state.wiki.get('__codex_v1__'));
      const source = codex.notes.find((note) => note.id === sourcePath);
      const target = codex.notes.find(
        (note) => note.id === targetName || note.name.toLocaleLowerCase('pt-BR') === targetName.toLocaleLowerCase('pt-BR')
      );
      if (source && target) {
        if (!codex.relations.some((relation) => relation.sourceId === source.id && relation.targetId === target.id)) {
          codex.relations.push({
            id: `relation_${crypto.randomUUID()}`,
            sourceId: source.id,
            targetId: target.id,
            label: label || 'Relacionado a',
            color: '#d8b45a',
            icon: 'link',
            bidirectional: false,
          });
          state.wiki.set('__codex_v1__', { ...codex, updatedAt: new Date().toISOString() });
          window.dispatchEvent(new CustomEvent('codex-updated'));
        }
        return;
      }
      if (!sourcePath.toLowerCase().endsWith('.md')) throw new Error('A origem da relação não é um artigo da Wiki.');
      const content = await WikiIndexer.loadRawFileContent(sourcePath);
      if (content == null) throw new Error('Não foi possível ler o artigo de origem.');

      const draft: WikiConnectionDraft = { type: label || 'Relacionado a', description: '' };
      const linkText = formatWikiConnection(targetName, draft);
      const newContent = content.includes(linkText) ? content : `${content.trimEnd()}\n${linkText}\n`;
      await saveMarkdownContent(sourcePath, newContent);
    } catch (error) {
      console.error('[LivingBrain] Erro ao registrar relação:', error);
      throw error;
    }
  };

  if (isLoading && wikiNodes.length === 0) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#15120e] text-[#ede4d0]" role="status" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#3b3222] border-t-[#d9a441]" />
          <strong className="font-display text-lg text-[#d9a441]">Abrindo o Cérebro do Mundo…</strong>
          <p className="mt-2 text-sm text-[#7f7660]">Lendo entidades e relações da Wiki da campanha.</p>
        </div>
      </div>
    );
  }

  // Estado vazio gracioso sem travar o usuário nem disparar exceção
  if (wikiNodes.length === 0) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#15120e] px-6 text-[#ede4d0]">
        <div className="max-w-md rounded-2xl border border-[#3b3222] bg-[#1d1913] p-8 text-center shadow-2xl shadow-black/80">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#d9a441]/40 bg-[#d9a441]/10 text-[#d9a441]">
            <Icone nome="cerebro" tam={30} />
          </span>
          <h3 className="font-display text-xl font-bold text-[#ede4d0]">O Cérebro do Mundo aguarda entidades</h3>
          <p className="mt-2 text-sm text-[#b3a78c]">
            Nenhuma página ou relação foi encontrada nesta mesa ainda. Abra o Códice para criar personagens, locais e tecer histórias.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setViewMode('wiki')}
              className="rounded-lg bg-[#d9a441] px-5 py-2.5 text-xs font-bold text-[#241a06] transition hover:bg-[#e8b654]"
            >
              Abrir Códice Arcanum
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className="rounded-lg border border-[#3b3222] px-4 py-2.5 text-xs font-bold text-[#b3a78c] transition hover:text-[#ede4d0]"
            >
              Voltar à Mesa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ArcanumGraph
        key={graphVersion}
        initialPayload={graphPayload}
        onPersist={persistGraph}
        onClose={() => setViewMode('canvas')}
        onCreateWikiRelation={handleCreateWikiRelation}
      />
    </div>
  );
};
