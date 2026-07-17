import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { getWikiConfig } from '../../store';
import { Settings, X, Plus, Search } from 'lucide-react';

interface NodeData {
  id: string;
  name: string;
  path: string;
  group: string;
  avatar?: string;
  val?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  __bckgDimensions?: number[];
  img?: any;
}

interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
  label?: string;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

interface GraphSettings {
  nodePrimaryColor: string;
  nodeSecondaryColor: string;
  linkColor: string;
  linkWidth: number;
  fontSizeBase: number;
}

const defaultSettings: GraphSettings = {
  nodePrimaryColor: '#a855f7',
  nodeSecondaryColor: '#ec4899',
  linkColor: 'rgba(255, 255, 255, 0.2)',
  linkWidth: 1.5,
  fontSizeBase: 12
};

const imageCache = new Map<string, { img: HTMLImageElement; loaded: boolean }>();

const normalizeString = (name: string) => {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

interface WikiGraphProps {
  onNodeClick?: (node: NodeData) => void;
}

export const WikiGraph: React.FC<WikiGraphProps> = ({ onNodeClick }) => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [settings, setSettings] = useState<GraphSettings>(() => {
    const saved = localStorage.getItem('dozero_graph_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [linkingSourceNode, setLinkingSourceNode] = useState<NodeData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  const visualStateRef = useRef({ isSearching, searchResults, settings, linkingSourceNode });
  useEffect(() => {
    visualStateRef.current = { isSearching, searchResults, settings, linkingSourceNode };
    if (simulationRef.current && simulationRef.current.alpha() < 0.05) {
      simulationRef.current.alpha(0.02).restart();
    }
  }, [isSearching, searchResults, settings, linkingSourceNode]);

  useEffect(() => {
    localStorage.setItem('dozero_graph_settings', JSON.stringify(settings));
  }, [settings]);

  const fetchGraph = useCallback(async () => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const res = await fetch(`/api/wiki/graph?repoPath=${encodeURIComponent(repoPath)}&t=${Date.now()}`);
      
      if (!res.ok) throw new Error('Falha ao buscar arquivos do grafo');
      const json = await res.json();
      
      const nodes: NodeData[] = json.nodes.map((n: any) => ({
        ...n,
        x: n.x, y: n.y, fx: n.fx, fy: n.fy, vx: n.vx, vy: n.vy
      }));
      
      const nodeIds = new Set(nodes.map(n => n.id));
      const links: LinkData[] = json.links
        .filter((l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return nodeIds.has(s) && nodeIds.has(t);
        })
        .map((l: any) => ({ ...l }));

      // Load images
      for (const node of nodes) {
        if (node.avatar) {
          if (!imageCache.has(node.avatar)) {
            const img = new Image();
            img.src = node.avatar;
            img.crossOrigin = 'anonymous';
            imageCache.set(node.avatar, { img, loaded: false });
            img.onload = () => {
              const cached = imageCache.get(node.avatar!);
              if (cached) cached.loaded = true;
              if (simulationRef.current) simulationRef.current.alpha(0.1).restart();
            };
          }
        }
      }

      setData({ nodes, links });
    } catch (err) {
      console.error('Erro ao buscar wiki graph:', err);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions(prev => {
          if (prev.width === containerRef.current!.clientWidth && prev.height === containerRef.current!.clientHeight) return prev;
          return {
            width: containerRef.current!.clientWidth,
            height: containerRef.current!.clientHeight
          };
        });
      }
    };
    
    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);


  // Main D3 Setup
  useEffect(() => {
    if (!canvasRef.current || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const width = dimensions.width;
    const height = dimensions.height;
    
    // Scale for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    
    const nodes = data.nodes;
    const links = data.links.map(d => Object.assign({}, d));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));
      
    simulationRef.current = simulation as any;

    const render = () => {
      const vs = visualStateRef.current;
      context.save();
      context.clearRect(0, 0, width, height);
      context.translate(transformRef.current.x, transformRef.current.y);
      context.scale(transformRef.current.k, transformRef.current.k);
      
      const globalScale = transformRef.current.k;

      // Draw Links
      context.globalAlpha = vs.isSearching ? 0.4 : 1.0;
      links.forEach((d: any) => {
        context.beginPath();
        context.moveTo(d.source.x, d.source.y);
        context.lineTo(d.target.x, d.target.y);
        context.strokeStyle = vs.settings.linkColor;
        context.lineWidth = vs.settings.linkWidth / globalScale;
        context.stroke();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const size = node.val || 10;
        
        context.save(); // Save global transform state for this node
        context.globalAlpha = 1.0;
        if (vs.searchResults && !vs.searchResults.includes(node.id)) {
          context.globalAlpha = 0.2;
        }

        context.beginPath();
        if (node.avatar && imageCache.has(node.avatar)) {
          const cached = imageCache.get(node.avatar);
          if (cached && cached.loaded) {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
            context.lineWidth = node.id === vs.linkingSourceNode?.id ? 4 : 2;
            context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#facc15' : 'rgba(255,255,255,0.8)';
            context.stroke();
            context.clip();
            context.drawImage(cached.img, node.x! - size, node.y! - size, size * 2, size * 2);
          } else {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
            context.fillStyle = node.group === '.' ? vs.settings.nodePrimaryColor : vs.settings.nodeSecondaryColor;
            context.fill();
          }
        } else {
          // No avatar
          if (node.group === '.') {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
          } else {
            context.rect(node.x! - size, node.y! - size, size * 2, size * 2);
          }
          context.fillStyle = node.group === '.' ? vs.settings.nodePrimaryColor : vs.settings.nodeSecondaryColor;
          context.fill();
          context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#facc15' : 'rgba(255,255,255,0.2)';
          context.lineWidth = node.id === vs.linkingSourceNode?.id ? 4 : 1.5;
          context.stroke();
        }
        
        context.restore(); // Restore to remove any clip masks applied above
        
        // Draw Label
        if (globalScale >= 1.2 || nodes.length < 50) {
          context.save(); // Push global transform again to draw text
          if (vs.searchResults && !vs.searchResults.includes(node.id)) {
            context.globalAlpha = 0.2;
          }

          const label = node.name;
          const fontSize = vs.settings.fontSizeBase / globalScale;
          context.font = `${fontSize}px Inter, sans-serif`;
          
          const textWidth = context.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          context.fillStyle = 'rgba(15, 23, 42, 0.8)';
          context.fillRect(node.x! - bckgDimensions[0] / 2, node.y! + size + 2, bckgDimensions[0], bckgDimensions[1]);

          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = 'rgba(255, 255, 255, 0.9)';
          context.fillText(label, node.x!, node.y! + size + 2 + bckgDimensions[1] / 2);
          node.__bckgDimensions = bckgDimensions;
          context.restore(); // Pop text state
        }
      });
      
      context.restore(); // Final restore (pops the global translation/scale applied at the top of render)
    };

    simulation.on("tick", render);

    // D3 Zoom & Pan
    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        render();
      });
      
    d3.select(canvas).call(zoom);

    // Node hit detection
    const getNodeAt = (x: number, y: number) => {
      const transform = transformRef.current;
      const invX = transform.invertX(x);
      const invY = transform.invertY(y);
      let found: NodeData | null = null;
      
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const size = node.val || 10;
        const dx = invX - node.x!;
        const dy = invY - node.y!;
        if (dx * dx + dy * dy < size * size) {
          found = node;
          break;
        }
      }
      return found;
    };

    // D3 Drag
    const drag = d3.drag<HTMLCanvasElement, unknown>()
      .subject((event) => {
        const node = getNodeAt(event.x, event.y);
        if (node) {
          return { x: event.x, y: event.y, node: node };
        }
        return null;
      })
      .on("start", (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        const subject = event.subject as any;
        const node = subject.node;
        node.fx = node.x;
        node.fy = node.y;
      })
      .on("drag", (event) => {
        const subject = event.subject as any;
        const node = subject.node;
        if (node) {
          node.fx = transformRef.current.invertX(event.x);
          node.fy = transformRef.current.invertY(event.y);
        }
      })
      .on("end", (event) => {
        if (!event.active) simulation.alphaTarget(0);
        // Comentamos a liberação das coordenadas para que o nó permaneça ancorado
        // onde o usuário o soltou no drag-and-drop.
        // const subject = event.subject as any;
        // const node = subject.node;
        // if (node) {
        //   node.fx = null;
        //   node.fy = null;
        // }
      });

    d3.select(canvas).call(drag);

    // Click / Right Click
    const handleClick = (e: MouseEvent) => {
      const vs = visualStateRef.current;
      const node = getNodeAt(e.offsetX, e.offsetY);
      if (node && !vs.linkingSourceNode) {
        window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: node.path }));
        if (onNodeClick) onNodeClick(node);
      }
    };
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const vs = visualStateRef.current;
      const node = getNodeAt(e.offsetX, e.offsetY);
      if (node) {
        if (!vs.linkingSourceNode) {
          setLinkingSourceNode(node);
        } else if (vs.linkingSourceNode.id !== node.id) {
          linkNodes(vs.linkingSourceNode, node);
          setLinkingSourceNode(null);
        } else {
          setLinkingSourceNode(null); // Cancel
        }
      } else {
        setLinkingSourceNode(null);
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      simulation.stop();
      d3.select(canvas).on(".zoom", null);
      d3.select(canvas).on(".drag", null);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [data, dimensions, onNodeClick]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const query = normalizeString(searchQuery);
    const results = data.nodes.filter(n => {
      return normalizeString(n.name).includes(query) || normalizeString(n.path).includes(query);
    }).map(n => n.id);
    setSearchResults(results);
  };

  const linkNodes = async (source: NodeData, target: NodeData) => {
    try {
      const { repoUrl } = getWikiConfig();
      const repoPath = repoUrl;
      if (!repoPath) return;

      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(source.path)}`);
      if (!res.ok) return;

      const raw = await res.text();
      let updatedRaw = raw;

      const hasFrontmatter = raw.startsWith('---');
      if (hasFrontmatter) {
        const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const fm = fmMatch[1];
          const linksMatch = fm.match(/links:\s*\[(.*?)\]/);
          if (linksMatch) {
            const links = linksMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''));
            if (!links.includes(target.name)) {
              links.push(target.name);
              const newLinksStr = `links: [${links.map(s => `"${s}"`).join(', ')}]`;
              updatedRaw = raw.replace(linksMatch[0], newLinksStr);
            }
          } else {
            const newFm = fm.trim() + `\nlinks: ["${target.name}"]\n`;
            updatedRaw = raw.replace(fm, newFm);
          }
        }
      } else {
        updatedRaw = `---\nlinks: ["${target.name}"]\n---\n\n${raw}`;
      }

      await fetch(`/api/wiki/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: source.path,
          content: updatedRaw,
          repoPath: repoPath
        })
      });

      fetchGraph();
    } catch (err) {
      console.error("Erro ao linkar", err);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      {/* HUD de Controles */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-icon theme-violet glass-panel" title="Configurações do Grafo">
          <Settings size={20} />
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-wiki'))} className="btn-icon theme-gray glass-panel" title="Voltar para Pastas">
          <X size={20} />
        </button>
      </div>

      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.85)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.4)', backdropFilter: 'blur(8px)', width: '90%', maxWidth: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <Search size={18} color="var(--text-secondary)" />
        <form onSubmit={handleSearch} style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Pesquisar arquivos e conexões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.9rem' }}
          />
        </form>
        {isSearching && (
          <button onClick={() => { setSearchQuery(''); setSearchResults(null); setIsSearching(false); }} className="btn-icon theme-gray" style={{ width: 24, height: 24, minWidth: 24, padding: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {linkingSourceNode && (
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(234, 179, 8, 0.9)', padding: '0.8rem 1.5rem', borderRadius: '12px', color: '#1a1a1a', fontWeight: 'bold', boxShadow: '0 5px 20px rgba(234, 179, 8, 0.4)' }}>
          <span>Linkando: {linkingSourceNode.name}</span>
          <button onClick={() => setLinkingSourceNode(null)} className="btn-icon" style={{ background: 'rgba(0,0,0,0.2)', color: 'black' }}>
            <X size={18} />
          </button>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Clique com botão direito no alvo</div>
        </div>
      )}

      {showSettings && (
        <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: '4.5rem', left: '1.5rem', zIndex: 10, padding: '1.5rem', width: '90%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} /> Aparência
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem' }}>Cores dos Nós</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="color" value={settings.nodePrimaryColor} onChange={(e) => setSettings({...settings, nodePrimaryColor: e.target.value})} style={{ cursor: 'pointer', border: 'none', width: '25px', height: '25px', borderRadius: '4px', padding: 0 }} title="Raiz" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Raiz</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="color" value={settings.nodeSecondaryColor} onChange={(e) => setSettings({...settings, nodeSecondaryColor: e.target.value})} style={{ cursor: 'pointer', border: 'none', width: '25px', height: '25px', borderRadius: '4px', padding: 0 }} title="Pastas" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pastas</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem' }}>Cor das Ligações</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="color" value={settings.linkColor} onChange={(e) => setSettings({...settings, linkColor: e.target.value})} style={{ cursor: 'pointer', border: 'none', width: '30px', height: '30px', borderRadius: '4px', padding: 0 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>{settings.linkColor}</span>
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className="wiki-graph-container" style={{ width: '100%', height: '100%', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.3s', touchAction: 'none', position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'grab' }} />
      </div>
    </div>
  );
};
