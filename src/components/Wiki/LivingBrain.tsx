import React, { useCallback, useEffect, useState } from 'react';
import ArcanumGraph from './Graph/ArcanumGraph';
import { getWikiConfig } from '../../store';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';
import { toast } from '../UI/Toast';
import { DEFAULT_TYPES, type NodeShape, type WEdge, type WNode } from './Graph/core';
import { Layouts, Vault } from './Graph/world';
import { TYPE_ORDER } from './Graph/seed';
import { formatWikiConnection, type WikiConnectionDraft } from '../../utils/wikiConnections';
import { useWindowManager } from '../../hooks/useWindowManager';

/**
 * LivingBrain — O Cérebro do Mundo (Arcanum)
 * Integração completa e nativa do Arcanum Cérebro-Grafo com o DOZERO.
 */
export const LivingBrain: React.FC = () => {
  const { setViewMode } = useWindowManager();
  const [wikiNodes, setWikiNodes] = useState<WNode[] | undefined>(undefined);
  const [wikiEdges, setWikiEdges] = useState<WEdge[] | undefined>(undefined);

  const fetchGraphData = useCallback(async () => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl;
      if (!repoPath) return;

      const res = await fetch(`/api/wiki/graph?repoPath=${encodeURIComponent(repoPath)}&t=${Date.now()}`);
      if (!res.ok) return;

      const json = await res.json();
      if (!Array.isArray(json.nodes) || json.nodes.length === 0) return;

      const mappedNodes: WNode[] = json.nodes.map((n: any) => {
        const pathLower = String(n.path || '').toLowerCase();
        const rawGroup = String(n.group || '').toLowerCase();
        const rawEntity = String(n.entityType || '').toLowerCase();

        // Inferência inteligente de camada por metadados e caminho da pasta
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

        const matchedType = DEFAULT_TYPES.find((t) => t.id === detectedType) || DEFAULT_TYPES[0];

        let imageUrl: string | undefined = undefined;
        if (n.avatar) {
          imageUrl = resolveMediaUrl(n.avatar, repoPath);
        }

        const shape: NodeShape = n.shape || matchedType.shape || 'circle';

        return {
          id: n.id || n.name,
          type: "world",
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
              status: n.status || "Ativo",
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
        .map((l: any, i: number) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;

          const resolvedTarget = validNodeIds.has(tgt) ? tgt : nameToId.get(String(tgt).toLowerCase());
          if (validNodeIds.has(src) && resolvedTarget) {
            return {
              id: l.id || `e_${src}_${resolvedTarget}_${i}`,
              source: src,
              target: resolvedTarget,
              type: "world",
              data: {
                label: l.label || '',
                color: l.color || '#d8b45a',
                wikiSourcePath: l.sourcePath,
              },
            };
          }
          return null;
        })
        .filter(Boolean) as WEdge[];

      setWikiNodes(clusteredNodes);
      setWikiEdges(mappedEdges);
    } catch (err) {
      console.warn("Utilizando banco Vault / dados semente do Arcanum:", err);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
    window.addEventListener('wiki-updated', fetchGraphData);
    return () => window.removeEventListener('wiki-updated', fetchGraphData);
  }, [fetchGraphData]);

  // Criação de conexão direta no markdown da Wiki
  const handleCreateWikiRelation = async (sourcePath: string, targetName: string, label: string) => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';

      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(sourcePath)}`);
      if (!res.ok) throw new Error("Falha ao ler arquivo fonte");
      const content = (await res.json()).content;

      const draft: WikiConnectionDraft = { label, isBidirectional: false };
      const linkText = formatWikiConnection(targetName, draft);
      const newContent = content.trim() + `\n${linkText}\n`;

      const saveRes = await fetch('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: sourcePath, content: newContent }),
      });
      if (!saveRes.ok) throw new Error('Falha ao salvar conexão');

      await fetchGraphData();
      toast.success('Relação sincronizada com a Wiki!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar na Wiki: ' + err);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ArcanumGraph
        initialNodes={wikiNodes}
        initialEdges={wikiEdges}
        onClose={() => setViewMode('canvas')}
        onCreateWikiRelation={handleCreateWikiRelation}
      />
    </div>
  );
};

