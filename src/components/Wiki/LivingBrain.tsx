import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGameStore, getWikiConfig } from '../../store';
import { resolveMediaUrl } from '../../services/wiki/mediaResolver';
import { Settings, Search, X, Map as MapIcon, Share2, GitMerge, Trash2, Edit2 } from 'lucide-react';

import { toast } from '../UI/Toast';
import { ConnectionEditor } from './ConnectionEditor';
import { escapeRegExp, formatWikiConnection, type WikiConnectionDraft } from '../../utils/wikiConnections';
interface NodeData extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  path: string;
  group: string;
  avatar: string | null;
  val?: number;
  depth?: number;
  isFolder?: boolean;
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  source: string | NodeData;
  target: string | NodeData;
  label?: string;
  description?: string;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

export const LivingBrain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [layoutMode, setLayoutMode] = useState<'organic' | 'tree'>('organic');
  const [isLinkMode, setIsLinkMode] = useState(false);
  const isLinkModeRef = useRef(false);
  useEffect(() => {
    isLinkModeRef.current = isLinkMode;
  }, [isLinkMode]);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, link?: LinkData, node?: NodeData } | null>(null);
  const [connectionEditor, setConnectionEditor] = useState<{ source: NodeData; target: NodeData; link?: LinkData } | null>(null);

  const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  
  const visualStateRef = useRef({
    searchResults: null as string[] | null,
    linkingSourceNode: null as NodeData | null,
    mousePos: { x: 0, y: 0 }
  });

  const fetchGraph = async () => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl;
      if (!repoPath) return;
      const res = await fetch(`/api/wiki/graph?repoPath=${encodeURIComponent(repoPath)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      
      const depthMap = new Map<string, number>();
      const adj = new Map<string, string[]>();
      json.nodes.forEach((n: any) => adj.set(n.id, []));
      json.links.forEach((l: any) => {
        if (adj.has(l.source)) adj.get(l.source)!.push(l.target);
      });
      
      const inDegree = new Map<string, number>();
      json.nodes.forEach((n: any) => inDegree.set(n.id, 0));
      json.links.forEach((l: any) => {
        if (inDegree.has(l.target)) inDegree.set(l.target, inDegree.get(l.target)! + 1);
      });
      
      let roots = json.nodes.filter((n: any) => inDegree.get(n.id) === 0);
      if (roots.length === 0) roots = [json.nodes[0]];
      
      if (roots[0]) {
        let queue = roots.map((r: any) => ({ id: r.id, depth: 1 }));
        const visited = new Set<string>();
        
        while (queue.length > 0) {
          const { id, depth } = queue.shift()!;
          if (!visited.has(id)) {
            visited.add(id);
            depthMap.set(id, depth);
            const neighbors = adj.get(id) || [];
            neighbors.forEach(n => queue.push({ id: n, depth: depth + 1 }));
          }
        }
      }

      const nodes = json.nodes.map((n: any) => ({
        ...n,
        val: 15,
        depth: depthMap.get(n.id) || 1
      }));
      
      setData({ nodes, links: json.links });
    } catch (err) {
      console.warn("Wiki API indisponível (provável Vercel). Gerando grafo vivo da Campanha...");
      try {
        const { state } = await import('../../services/yjs');
        const fallbackNodes: NodeData[] = [];
        const fallbackLinks: LinkData[] = [];
        
        fallbackNodes.push({ id: 'campaign', name: 'Mesa DoZero', group: 'root', path: '', avatar: null, val: 30, depth: 0 });
        
        const factions = state.world?.get('factions') as any[] || [];
        factions.forEach(f => {
          fallbackNodes.push({ id: `faction_${f.id}`, name: f.name, group: 'faction', path: '', avatar: null, val: 20, depth: 1 });
          fallbackLinks.push({ source: 'campaign', target: `faction_${f.id}` });
        });

        const tokens = Array.from(state.tokens.values() as Iterable<any>);
        tokens.forEach(t => {
          fallbackNodes.push({ id: `token_${t.id}`, name: t.name || 'Desconhecido', group: 'token', path: '', avatar: t.avatar || null, val: 15, depth: 2 });
          // Link to faction if any, else root
          if (t.factionId && factions.find(f => f.id === t.factionId)) {
            fallbackLinks.push({ source: `faction_${t.factionId}`, target: `token_${t.id}` });
          } else {
            fallbackLinks.push({ source: 'campaign', target: `token_${t.id}` });
          }
        });

        setData({ nodes: fallbackNodes, links: fallbackLinks });
      } catch (fallbackErr) {
        console.error("Erro no fallback do grafo:", fallbackErr);
        setData({ nodes: [], links: [] });
      }
    }
  };

  useEffect(() => {
    fetchGraph();
    window.addEventListener('wiki-updated', fetchGraph);
    return () => window.removeEventListener('wiki-updated', fetchGraph);
  }, []);

  useEffect(() => {
    visualStateRef.current.searchResults = searchResults;
  }, [searchResults]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions(prev => {
          const w = containerRef.current!.clientWidth;
          const h = containerRef.current!.clientHeight;
          if (prev.width === w && prev.height === h) return prev;
          return { width: w, height: h };
        });
      }
    };
    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || data.nodes.length === 0 || dimensions.width === 0) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    
    const oldNodes = new Map(simulationRef.current?.nodes().map(n => [n.id, n]) || []);
    
    const nodes = data.nodes.map(d => {
      const old = oldNodes.get(d.id);
      if (old && old.x !== undefined && old.y !== undefined) {
        return { ...d, x: old.x, y: old.y, vx: old.vx, vy: old.vy, fx: old.fx, fy: old.fy };
      }
      // If no old position, spawn in center to avoid flying from 0,0
      return { ...d, x: width / 2 + (Math.random() - 0.5) * 50, y: height / 2 + (Math.random() - 0.5) * 50 };
    });
    
    const validNodeIds = new Set(nodes.map(n => n.id));
    const nameToId = new Map(nodes.map(n => [n.name.toLowerCase(), n.id]));
    
    const links = data.links.map(l => {
       let targetStr = l.target as string;
       let resolvedTarget = validNodeIds.has(targetStr) ? targetStr : nameToId.get(targetStr.toLowerCase());
       if (validNodeIds.has(l.source as string) && resolvedTarget) {
           return { ...l, target: resolvedTarget };
       }
       return null;
    }).filter(Boolean) as LinkData[];

    const imageCache = new Map<string, { img: HTMLImageElement, loaded: boolean }>();
    nodes.forEach(n => {
      if (n.avatar && !imageCache.has(n.avatar)) {
        const img = new Image();
        const config = getWikiConfig();
        let url = n.avatar;
        if (n.avatar) {
          url = resolveMediaUrl(n.avatar, config.repoUrl || '');
        }
        img.src = url;
        const entry = { img, loaded: false };
        imageCache.set(n.avatar, entry);
        img.onload = () => { entry.loaded = true; };
      }
    });

    const simulation = d3.forceSimulation<NodeData>(nodes)
      .force("link", d3.forceLink<NodeData, LinkData>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40))
      .alphaDecay(0.05); // Optimize: stabilize more than 2x faster than default 0.0228

    if (layoutMode === 'tree') {
      simulation.force("y", d3.forceY<NodeData>(d => (d.depth || 1) * 150).strength(0.8));
      simulation.force("x", d3.forceX<NodeData>(width / 2).strength(0.05));
    }

    simulationRef.current = simulation;

    const render = () => {
      const vs = visualStateRef.current;
      context.save();
      context.clearRect(0, 0, width, height);
      context.translate(transformRef.current.x, transformRef.current.y);
      context.scale(transformRef.current.k, transformRef.current.k);
      
      context.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      context.lineWidth = 1 / transformRef.current.k;
      const gridSize = 100;
      const boundX = width / transformRef.current.k;
      const boundY = height / transformRef.current.k;
      const ox = -transformRef.current.x / transformRef.current.k;
      const oy = -transformRef.current.y / transformRef.current.k;
      
      context.beginPath();
      for (let x = ox - (ox % gridSize) - gridSize; x < ox + boundX + gridSize; x += gridSize) {
        context.moveTo(x, oy - gridSize);
        context.lineTo(x, oy + boundY + gridSize);
      }
      for (let y = oy - (oy % gridSize) - gridSize; y < oy + boundY + gridSize; y += gridSize) {
        context.moveTo(ox - gridSize, y);
        context.lineTo(ox + boundX + gridSize, y);
      }
      context.stroke();

      links.forEach((link: any) => {
        context.beginPath();
        context.moveTo(link.source.x, link.source.y);
        context.lineTo(link.target.x, link.target.y);
        
        let alpha = 0.4;
        if (vs.searchResults && (!vs.searchResults.includes(link.source.id) && !vs.searchResults.includes(link.target.id))) {
          alpha = 0.05;
        }
        
        context.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
        context.lineWidth = 2 / transformRef.current.k;
        context.stroke();
        
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const angle = Math.atan2(dy, dx);
        const targetRadius = link.target.val || 15;
        const arrowX = link.target.x - Math.cos(angle) * (targetRadius + 5);
        const arrowY = link.target.y - Math.sin(angle) * (targetRadius + 5);
        
        context.beginPath();
        context.moveTo(arrowX, arrowY);
        context.lineTo(arrowX - 8 * Math.cos(angle - Math.PI/6), arrowY - 8 * Math.sin(angle - Math.PI/6));
        context.lineTo(arrowX - 8 * Math.cos(angle + Math.PI/6), arrowY - 8 * Math.sin(angle + Math.PI/6));
        context.fillStyle = `rgba(168, 85, 247, ${alpha + 0.3})`;
        context.fill();

        if (link.label && transformRef.current.k >= 0.5) {
          const midX = (link.source.x + link.target.x) / 2;
          const midY = (link.source.y + link.target.y) / 2;
          const fontSize = 10 / transformRef.current.k;
          context.font = `${fontSize}px Inter`;
          context.fillStyle = `rgba(255,255,255, ${alpha + 0.4})`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          
          const w = context.measureText(link.label).width;
          const h = fontSize + 4;
          context.fillStyle = `rgba(15, 23, 42, ${alpha + 0.5})`;
          context.fillRect(midX - w/2 - 2, midY - h/2, w + 4, h);
          
          context.fillStyle = `rgba(255,255,255, ${alpha + 0.5})`;
          context.fillText(link.label, midX, midY);
        }
      });

      if (isLinkModeRef.current && vs.linkingSourceNode) {
        context.beginPath();
        context.moveTo(vs.linkingSourceNode.x!, vs.linkingSourceNode.y!);
        const pointerX = transformRef.current.invertX(vs.mousePos.x);
        const pointerY = transformRef.current.invertY(vs.mousePos.y);
        context.lineTo(pointerX, pointerY);
        context.strokeStyle = '#facc15';
        context.lineWidth = 3 / transformRef.current.k;
        context.setLineDash([5, 5]);
        context.stroke();
        context.setLineDash([]);
      }

      nodes.forEach((node) => {
        const size = node.val || 15;
        
        context.save();
        context.globalAlpha = 1.0;
        if (vs.searchResults && !vs.searchResults.includes(node.id)) {
          context.globalAlpha = 0.2;
        }

        // Optimization: Native shadowBlur is extremely slow in canvas (causes requestAnimationFrame violations).
        // Instead, we draw a fake glow using a simple larger circle with low alpha.
        const isHovered = node.id === (vs as any).hoveredNode?.id;
        const isLinking = node.id === (vs as any).linkingSourceNode?.id;
        const glowColor = isLinking ? 'rgba(250, 204, 21, 0.3)' : 'rgba(168, 85, 247, 0.2)';
        
        if (isHovered || isLinking || node.isFolder) {
           context.beginPath();
           if (node.isFolder) {
              const fsize = size * 1.3;
              context.roundRect(node.x! - fsize - 4, node.y! - fsize/1.5 - 4, (fsize*2) + 8, (fsize*1.5) + 8, 8);
           } else {
              context.arc(node.x!, node.y!, size + 5, 0, 2 * Math.PI, false);
           }
           context.fillStyle = glowColor;
           context.fill();
        }
        
        context.beginPath();
        if (node.isFolder) {
           const fsize = size * 1.3;
           context.roundRect(node.x! - fsize, node.y! - fsize/1.5, fsize*2, fsize*1.5, 6);
           context.fillStyle = 'rgba(250, 204, 21, 0.2)';
           context.fill();
           context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#f8fafc' : '#facc15';
           context.lineWidth = node.id === vs.linkingSourceNode?.id ? 4 : 2;
           context.stroke();
        } else if (node.avatar && imageCache.has(node.avatar)) {
          const cached = imageCache.get(node.avatar);
          if (cached && cached.loaded) {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
            context.lineWidth = node.id === vs.linkingSourceNode?.id ? 4 : 2;
            context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#facc15' : '#a855f7';
            context.stroke();
            context.clip();
            context.drawImage(cached.img, node.x! - size, node.y! - size, size * 2, size * 2);
          } else {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
            context.fillStyle = '#1e293b';
            context.fill();
            context.strokeStyle = '#a855f7';
            context.stroke();
          }
        } else {
          context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
          context.fillStyle = '#1e293b';
          context.fill();
          context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#facc15' : '#a855f7';
          context.lineWidth = 2;
          context.stroke();
        }
        context.restore();

        if (transformRef.current.k >= 0.5 || nodes.length < 50) {
          context.save();
          if (vs.searchResults && !vs.searchResults.includes(node.id)) {
            context.globalAlpha = 0.2;
          }
          const fontSize = 12 / transformRef.current.k;
          context.font = `bold ${fontSize}px Inter, sans-serif`;
          const textWidth = context.measureText(node.name).width;
          
          context.fillStyle = 'rgba(15, 23, 42, 0.8)';
          context.fillRect(node.x! - textWidth/2 - 4, node.y! + size + 4, textWidth + 8, fontSize + 4);
          
          context.textAlign = 'center';
          context.textBaseline = 'top';
          context.fillStyle = '#f8fafc';
          context.fillText(node.name, node.x!, node.y! + size + 6);
          context.restore();
        }
      });
      
      context.restore();
    };

    simulation.on("tick", render);

    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        render();
      });

    const getNodeAt = (x: number, y: number) => {
      const transform = transformRef.current;
      const invertX = transform.invertX(x);
      const invertY = transform.invertY(y);
      return nodes.find(n => {
        const dx = n.x! - invertX;
        const dy = n.y! - invertY;
        const radius = (n.val || 15) + 5; // Extra padding for easier clicking
        return dx * dx + dy * dy < (radius * radius);
      });
    };

    const getLinkAt = (x: number, y: number) => {
      const transform = transformRef.current;
      const ix = transform.invertX(x);
      const iy = transform.invertY(y);
      return links.find((l: any) => {
        const sx = l.source.x, sy = l.source.y;
        const tx = l.target.x, ty = l.target.y;
        const l2 = (tx - sx) ** 2 + (ty - sy) ** 2;
        if (l2 === 0) return false;
        let t = ((ix - sx) * (tx - sx) + (iy - sy) * (ty - sy)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = sx + t * (tx - sx);
        const projY = sy + t * (ty - sy);
        const dist2 = (ix - projX) ** 2 + (iy - projY) ** 2;
        return dist2 < (10 / transform.k) ** 2;
      });
    };

    // --- EVENT HANDLING ---
    // Bypass d3.drag and native click conflicts by writing a bulletproof pointer state machine
    let draggingNode: NodeData | null = null;
    let dragStartPos = { x: 0, y: 0 };
    let hasDragged = false;

    d3.select(canvas)
      .on("mousedown", (event: MouseEvent) => {
        if (event.button !== 0) return; // Only left click
        const [x, y] = d3.pointer(event);
        const node = getNodeAt(x, y);

        if (node) {
          // If we clicked a node, STOP d3.zoom from panning the canvas
          event.stopImmediatePropagation();
          
          if (isLinkModeRef.current) {
            // No modo de ligação, mousedown já seleciona o nó
            const vs = visualStateRef.current;
            if (!vs.linkingSourceNode) {
              vs.linkingSourceNode = node;
              render();
            } else {
              const source = vs.linkingSourceNode;
              const target = node;
              vs.linkingSourceNode = null;
              
              if (source.id !== target.id) {
                setConnectionEditor({ source, target });
              }
              render();
            }
          } else {
            // Modo normal: preparar para drag ou click
            draggingNode = node;
            dragStartPos = { x, y };
            hasDragged = false;
            
            draggingNode.fx = draggingNode.x;
            draggingNode.fy = draggingNode.y;
            simulation.alphaTarget(0.3).restart();
          }
        } else {
           // Clicou no vazio no modo de ligação? Cancela a ligação atual
           if (isLinkModeRef.current) {
              visualStateRef.current.linkingSourceNode = null;
              render();
           } else {
              setContextMenu(null);
           }
        }
      })
      .on("mousemove", (event: MouseEvent) => {
        const [x, y] = d3.pointer(event);
        visualStateRef.current.mousePos = { x, y };

        if (draggingNode) {
          // Check if moved enough to be considered a drag
          if (Math.abs(x - dragStartPos.x) > 3 || Math.abs(y - dragStartPos.y) > 3) {
            hasDragged = true;
          }
          draggingNode.fx = transformRef.current.invertX(x);
          draggingNode.fy = transformRef.current.invertY(y);
          return; // Skip other mousemove logic
        }

        if (visualStateRef.current.linkingSourceNode && isLinkModeRef.current) {
          render();
        }
      });

    const handleGlobalMouseUp = () => {
        if (draggingNode) {
           const node = draggingNode;
           
           // Ponytail: unpin the node so it doesn't freeze or stay stuck forever
           node.fx = null;
           node.fy = null;
           draggingNode = null;
           
           simulation.alphaTarget(0);
           
           // Se não arrastou (foi só um click rápido)
           if (!hasDragged && !isLinkModeRef.current) {
             if (!node.isFolder) {
               window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: node.path } }));
             }
           }
        }
    };
    
    window.addEventListener("mouseup", handleGlobalMouseUp);

    d3.select(canvas)
      .on("contextmenu", (event: MouseEvent) => {
        event.preventDefault();
        const [x, y] = d3.pointer(event);
        const node = getNodeAt(x, y);
        if (node) {
           setContextMenu({ x: event.offsetX, y: event.offsetY, node });
           return;
        }
        
        const link = getLinkAt(x, y) as LinkData;
        if (link) {
          setContextMenu({ x: event.offsetX, y: event.offsetY, link });
        } else {
          setContextMenu(null);
        }
      });

    // Zoom must be called AFTER mousedown so our stopImmediatePropagation can prevent it
    d3.select(canvas).call(zoom);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      simulation.stop();
      d3.select(canvas).on(".zoom", null);
      d3.select(canvas).on("mousedown", null);
      d3.select(canvas).on("mousemove", null);
      d3.select(canvas).on("mouseup", null);
      d3.select(canvas).on("contextmenu", null);
    };
  }, [data, dimensions, layoutMode]);

  const createRelation = async (sourcePath: string, targetName: string, draft: WikiConnectionDraft) => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(sourcePath)}`);
      if (!res.ok) throw new Error("Failed to read source");
      const content = (await res.json()).content;
      
      const linkText = formatWikiConnection(targetName, draft);
      const newContent = content.trim() + `\n${linkText}\n`;
      
      const saveResponse = await fetch('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: sourcePath, content: newContent })
      });
      if (!saveResponse.ok) throw new Error('Falha ao salvar conexão');
      
      await fetchGraph();
      toast.success('Conexão criada.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar conexão.');
    }
  };

  const editRelation = async (link: LinkData, draft: WikiConnectionDraft) => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const sourceNode = link.source as NodeData;
      
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(sourceNode.path)}`);
      if (!res.ok) throw new Error("Failed to read source");
      let content = (await res.json()).content as string;
      
      const targetName = (link.target as NodeData).name;
      const linkRegex = new RegExp(`^.*?\\[\\[${escapeRegExp(targetName)}(?:\\|[^\\]]+)?\\]\\].*$`, 'gm');
      const linkText = formatWikiConnection(targetName, draft);
      content = content.replace(linkRegex, linkText);
      
      await fetch('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: sourceNode.path, content })
      });
      
      setContextMenu(null);
      await fetchGraph();
      toast.success('Conexão atualizada.');
    } catch (err) {
      console.error(err);
      toast.error("Erro ao editar relação: " + err);
    }
  };

  const deleteRelation = async (link: LinkData) => {
    if (!confirm(`Tem certeza que deseja excluir a relação entre ${(link.source as NodeData).name} e ${(link.target as NodeData).name}?`)) return;
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const sourceNode = link.source as NodeData;
      
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(sourceNode.path)}`);
      if (!res.ok) throw new Error("Failed to read source");
      let content = (await res.json()).content as string;
      
      // Remover a linha da ligação
      // Se não tem rótulo, é só [[Target]], se tem, é Label:: [[Target]]
      const targetName = (link.target as NodeData).name;
      const regex = new RegExp(`^.*?\\[\\[${targetName}(\\|[^\\]]+)?\\]\\].*?\\n?`, 'gm');
      content = content.replace(regex, '');
      
      await fetch('/api/wiki/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: sourceNode.path, content })
      });
      
      setContextMenu(null);
      await fetchGraph();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir relação: " + err);
    }
  };

  const deleteFile = async (node: NodeData) => {
    if (!confirm(`Tem certeza que deseja excluir o arquivo ${node.name}? Esta ação não pode ser desfeita.`)) return;
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      
      const res = await fetch('/api/wiki/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: node.path })
      });
      
      if (!res.ok) throw new Error("Failed to delete file");
      
      setContextMenu(null);
      await fetchGraph();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir arquivo.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const results = data.nodes.filter(n => {
      return n.name.toLowerCase().includes(query) || n.path.toLowerCase().includes(query);
    }).map(n => n.id);
    setSearchResults(results);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' }}>
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
        <button 
           onClick={() => setLayoutMode(layoutMode === 'organic' ? 'tree' : 'organic')} 
           className="glass-panel hover-glow" 
           style={{ padding: '0.6rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(15,23,42,0.8)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '8px', cursor: 'pointer' }}>
          <Share2 size={16} />
          {layoutMode === 'organic' ? 'Rede Orgânica' : 'Árvore Genealógica'}
        </button>
        
        <button 
           onClick={() => { setIsLinkMode(!isLinkMode); visualStateRef.current.linkingSourceNode = null; }} 
           className="glass-panel hover-glow" 
           style={{ padding: '0.6rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: isLinkMode ? '#facc15' : 'rgba(15,23,42,0.8)', color: isLinkMode ? '#000' : 'var(--text-primary)', border: `1px solid ${isLinkMode ? '#facc15' : 'rgba(255,255,255,0.2)'}`, borderRadius: '8px', cursor: 'pointer' }}>
          <GitMerge size={16} />
          {isLinkMode ? 'Modo de Ligação' : 'Criar Ligações'}
        </button>
      </div>

      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.85)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.4)', backdropFilter: 'blur(8px)', width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <Search size={18} color="var(--text-secondary)" />
        <form onSubmit={handleSearch} style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Pesquisar entidades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
          />
        </form>
        {isSearching && (
          <button onClick={() => { setSearchQuery(''); setSearchResults(null); setIsSearching(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-wiki'))} className="glass-panel hover-glow" style={{ padding: '0.6rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(15,23,42,0.8)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
          <X size={16} /> Voltar para Wiki
        </button>
      </div>

      {isLinkMode && (
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: 'rgba(250, 204, 21, 0.2)', border: '1px solid #facc15', color: '#facc15', padding: '0.8rem 1.5rem', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
           <strong>Modo Ligação:</strong> Clique em um nó de origem e depois no alvo para criar uma relação.
        </div>
      )}

      {contextMenu && (
        <div style={{ 
          position: 'absolute', top: contextMenu.y, left: contextMenu.x, zIndex: 50,
          background: 'var(--bg-panel)', border: '1px solid var(--glass-border)', 
          borderRadius: '8px', padding: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column'
        }}>
           {contextMenu.link && (
             <>
               <div style={{ fontSize: '0.8rem', padding: '0.5rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.5rem' }}>
                  De {(contextMenu.link.source as NodeData).name} para {(contextMenu.link.target as NodeData).name}
               </div>
               <button 
                 onClick={() => {
                   const link = contextMenu.link!;
                   setConnectionEditor({ source: link.source as NodeData, target: link.target as NodeData, link });
                   setContextMenu(null);
                 }}
                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                 onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                 onMouseOut={e => e.currentTarget.style.background = 'transparent'}
               >
                 <Edit2 size={14} /> Editar Ligação
               </button>
               <button 
                 onClick={() => deleteRelation(contextMenu.link!)}
                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                 onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                 onMouseOut={e => e.currentTarget.style.background = 'transparent'}
               >
                 <Trash2 size={14} /> Excluir Ligação
               </button>
             </>
           )}
           {contextMenu.node && (
             <>
               <div style={{ fontSize: '0.8rem', padding: '0.5rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.5rem' }}>
                  Arquivo: {contextMenu.node.name}
               </div>
               <button 
                 onClick={() => deleteFile(contextMenu.node!)}
                 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'left', borderRadius: '4px' }}
                 onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                 onMouseOut={e => e.currentTarget.style.background = 'transparent'}
               >
                 <Trash2 size={14} /> Excluir Arquivo
               </button>
             </>
           )}
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }} onClick={() => setContextMenu(null)}>
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: isLinkMode ? 'crosshair' : 'grab' }} />
      </div>
      {connectionEditor && <ConnectionEditor
        sourceName={connectionEditor.source.name}
        targetName={connectionEditor.target.name}
        initial={connectionEditor.link ? { type: connectionEditor.link.label || '', description: connectionEditor.link.description || '' } : undefined}
        onCancel={() => setConnectionEditor(null)}
        onSave={async draft => {
          if (connectionEditor.link) await editRelation(connectionEditor.link, draft);
          else await createRelation(connectionEditor.source.path, connectionEditor.target.name, draft);
          setConnectionEditor(null);
        }}
      />}
    </div>
  );
};
