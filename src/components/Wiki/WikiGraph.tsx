import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getWikiConfig } from '../../store';
import { Settings, X, Plus, Search } from 'lucide-react';

interface NodeData {
  id: string;
  name: string;
  path: string;
  group: string;
  avatar?: string;
  val?: number;
}

interface LinkData {
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

interface WikiGraphProps {
  onNodeClick: (path: string) => void;
}

interface GraphSettings {
  linkWidth: number;
  linkColor: string;
  particleCount: number;
  repelForce: number;
  linkDistance: number;
  nodeShape: 'circle' | 'square' | 'shield' | 'hexagon';
  nodePrimaryColor: string;
  nodeSecondaryColor: string;
  fontSizeBase: number;
}

const defaultSettings: GraphSettings = {
  linkWidth: 2,
  linkColor: '#a855f7',
  particleCount: 3,
  repelForce: -300,
  linkDistance: 40,
  nodeShape: 'circle',
  nodePrimaryColor: '#d946ef',
  nodeSecondaryColor: '#60a5fa',
  fontSizeBase: 12
};

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export const WikiGraph: React.FC<WikiGraphProps> = ({ onNodeClick }) => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [settings, setSettings] = useState<GraphSettings>(() => {
    const saved = localStorage.getItem('dozero_graph_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [linkingSourceNode, setLinkingSourceNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('dozero_graph_settings', JSON.stringify(settings));
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(settings.repelForce);
      fgRef.current.d3Force('link').distance(settings.linkDistance);
      fgRef.current.d3ReheatSimulation();
    }
  }, [settings]);

  const fetchGraph = useCallback(async () => {
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      const res = await fetch(`/api/wiki/graph?repoPath=${encodeURIComponent(repoPath)}&t=${Date.now()}`);
      const json = await res.json();

      if (!res.ok || !json.nodes) {
        console.error('Erro na API do Grafo:', json);
        return;
      }

      const nameToId: Record<string, string> = {};
      json.nodes.forEach((n: NodeData) => {
        nameToId[normalizeName(n.name)] = n.id;
      });

      const validLinks: LinkData[] = [];
      json.links.forEach((l: LinkData) => {
        let targetClean = normalizeName(l.target);
        if (targetClean.endsWith('.md')) {
          targetClean = targetClean.slice(0, -3);
        }
        const targetId = nameToId[targetClean];
        if (targetId) {
          validLinks.push({ source: l.source, target: targetId, label: l.label });
        }
      });

      const connections: Record<string, number> = {};
      validLinks.forEach(l => {
        connections[l.source] = (connections[l.source] || 0) + 1;
        connections[l.target] = (connections[l.target] || 0) + 1;
      });

      const processedNodes = json.nodes.map((n: NodeData) => ({
        ...n,
        val: Math.max(1.5, Math.min(10, (connections[n.id] || 0) * 0.5 + 1.5))
      }));

      setData({ nodes: processedNodes, links: validLinks });
    } catch (err) {
      console.error("Erro ao carregar grafo", err);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const config = getWikiConfig();
        const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
        const res = await fetch(`/api/wiki/search?repoPath=${encodeURIComponent(repoPath)}&q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.results) setSearchResults(json.results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredData = useMemo(() => {
    if (!searchResults) return data;
    const allowedNodes = new Set(searchResults);
    
    const filteredNodes = data.nodes.filter(n => allowedNodes.has(n.id));
    const filteredLinks = data.links.filter(l => {
       const sid = typeof l.source === 'object' ? (l.source as any).id : l.source;
       const tid = typeof l.target === 'object' ? (l.target as any).id : l.target;
       return allowedNodes.has(sid) && allowedNodes.has(tid);
    });
    
    return { nodes: filteredNodes, links: filteredLinks };
  }, [data, searchResults]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateDimensions();
    setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      fgRef.current.d3Force('charge').strength(settings.repelForce);
      fgRef.current.d3Force('link').distance(settings.linkDistance);
      fgRef.current.d3ReheatSimulation();
    }
  }, [data, settings.repelForce, settings.linkDistance]);

  const handleNodeRightClick = useCallback(async (node: any) => {
    const newName = window.prompt(`Renomear nó: ${node.name}\nIsso atualizará todas as ligações em outros arquivos!`, node.name);
    if (!newName || newName.trim() === '' || newName === node.name) return;

    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      
      const res = await fetch(`/api/wiki/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, oldPath: node.id, newName: newName.trim() })
      });
      
      if (!res.ok) throw new Error('Falha ao renomear');
      
      alert(`Nó renomeado para ${newName} com sucesso!`);
      await fetchGraph();
    } catch (err) {
      console.error(err);
      alert('Erro ao renomear o nó e atualizar ligações.');
    }
  }, [fetchGraph]);

  const handleLinkRightClick = useCallback(async (link: any) => {
    if (!link || !link.source || !link.source.id) return;
    const newLabel = window.prompt(`Novo nome para a relação de ${link.source.name} com ${link.target.name}:\n(Deixe vazio para remover o nome da linha)`, link.label || '');
    if (newLabel === null) return;

    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      
      const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(link.source.id)}&t=${Date.now()}`);
      if (!res.ok) throw new Error("Erro ao ler arquivo");
      const fileData = await res.json();
      let content = fileData.content;

      const targetNameEscaped = link.target.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:[^\\n\\[\\]]+?::\\s*)?(?:\\\\?\\[){2}(${targetNameEscaped}(?:\\|.*?)?)(?:\\\\?\\]){2}`, 'g');
      
      let modified = false;
      content = content.replace(regex, (match: string, innerTarget: string) => {
        modified = true;
        const innerBracket = match.startsWith('\\[') ? `\\[\\[${innerTarget}\\]\\]` : `[[${innerTarget}]]`;
        if (newLabel.trim() !== '') {
          return `${newLabel.trim()}:: ${innerBracket}`;
        } else {
          return innerBracket;
        }
      });

      if (modified) {
        await fetch(`/api/wiki/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoPath, path: link.source.id, content })
        });
        await fetchGraph();
      } else {
        alert('Não foi possível encontrar a linha exata no arquivo de origem.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar a relação.');
    }
  }, [fetchGraph]);

  const handleCreateNode = useCallback(async () => {
    const input = window.prompt("Criar Nova Nota\n\nDigite o nome da nota.\nDica: Para criar dentro de uma pasta, digite o caminho. Exemplo: Faccoes/OsMercenarios");
    if (!input || input.trim() === '') return;
    
    let targetPath = input.trim();
    if (!targetPath.endsWith('.md')) targetPath += '.md';
    
    const baseName = input.split('/').pop()?.replace('.md', '') || 'Nova Nota';
    
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      
      await fetch(`/api/wiki/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath, path: targetPath, content: `# ${baseName}\n\n` })
      });
      
      await fetchGraph();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar a nota.');
    }
  }, [fetchGraph]);

  const handleNodeClick = useCallback(async (node: any, event: MouseEvent) => {
    if (event.shiftKey) {
      if (!linkingSourceNode) {
        setLinkingSourceNode(node);
      } else {
        if (linkingSourceNode.id !== node.id) {
          try {
            const config = getWikiConfig();
            const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
            
            const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(linkingSourceNode.id)}&t=${Date.now()}`);
            const fileData = await res.json();
            
            const relLabel = window.prompt(`Qual a relação de ${linkingSourceNode.name} com ${node.name}? (Ex: Pai de, Aliado). Deixe em branco se for só um link.`);
            
            let linkText = `[[${node.name}]]`;
            if (relLabel && relLabel.trim() !== '') {
              linkText = `\n\n${relLabel}:: [[${node.name}]]`;
            } else {
              linkText = `\n\n[[${node.name}]]`;
            }

            const newContent = fileData.content + linkText;
            
            await fetch(`/api/wiki/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repoPath, path: linkingSourceNode.id, content: newContent })
            });

            await fetchGraph();
          } catch (err) {
            console.error("Erro ao criar link visual", err);
            alert("Falha ao criar ligação.");
          }
        }
        setLinkingSourceNode(null);
      }
      return;
    }

    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(4, 2000);
    }
    setTimeout(() => {
      onNodeClick(node.path);
    }, 800);
  }, [onNodeClick, linkingSourceNode, fetchGraph]);

  return (
    <div ref={containerRef} style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: 'transparent',
      backgroundImage: 'radial-gradient(rgba(128, 128, 128, 0.4) 1.5px, transparent 1.5px)',
      backgroundSize: '24px 24px',
      position: 'relative' 
    }}>
      
      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.85)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.4)', backdropFilter: 'blur(8px)', width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <Search size={18} color="var(--accent-primary)" />
        <input 
          type="text" 
          placeholder="Buscar dentro das fichas..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '0.95rem' }}
        />
        {isSearching && <span className="spin" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>⌛</span>}
      </div>

      {linkingSourceNode && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'rgba(250, 204, 21, 0.2)', color: '#facc15', border: '1px solid #facc15', padding: '0.8rem 1.2rem', borderRadius: '8px', backdropFilter: 'blur(4px)', animation: 'pulse 2s infinite' }}>
          <strong>Modo de Ligação:</strong> Selecione o Destino para <strong>{linkingSourceNode.name}</strong><br/>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Clique em outro nó segurando Shift, ou recarregue a página para cancelar)</span>
        </div>
      )}

      <div style={{ position: 'absolute', top: '5rem', right: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
        <button 
          onClick={handleCreateNode}
          title="Nova Nota"
          style={{
            background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
          <Plus size={20} />
        </button>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          title="Configurações do Cérebro"
          style={{
            background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute', top: '4rem', right: '1rem', zIndex: 10,
          width: '280px', padding: '1.5rem', borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(168, 85, 247, 0.3)',
          display: 'flex', flexDirection: 'column', gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>Física do Cérebro</h3>
            <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowSettings(false)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem' }}>Formato dos Nós</label>
            <select 
              value={settings.nodeShape} 
              onChange={(e) => setSettings({...settings, nodeShape: e.target.value as any})}
              style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem', borderRadius: '4px' }}
            >
              <option value="circle">Círculo</option>
              <option value="square">Quadrado</option>
              <option value="shield">Escudo</option>
              <option value="hexagon">Hexágono</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
              Força de Repulsão <span>{settings.repelForce}</span>
            </label>
            <input type="range" min="-1000" max="-50" step="10" value={settings.repelForce} onChange={(e) => setSettings({...settings, repelForce: parseInt(e.target.value)})} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
              Distância dos Links <span>{settings.linkDistance}</span>
            </label>
            <input type="range" min="10" max="200" step="5" value={settings.linkDistance} onChange={(e) => setSettings({...settings, linkDistance: parseInt(e.target.value)})} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
              Espessura da Linha <span>{settings.linkWidth}</span>
            </label>
            <input type="range" min="0.5" max="10" step="0.5" value={settings.linkWidth} onChange={(e) => setSettings({...settings, linkWidth: parseFloat(e.target.value)})} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
              Partículas de Energia <span>{settings.particleCount}</span>
            </label>
            <input type="range" min="0" max="10" step="1" value={settings.particleCount} onChange={(e) => setSettings({...settings, particleCount: parseInt(e.target.value)})} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
              Tamanho das Letras <span>{settings.fontSizeBase}</span>
            </label>
            <input type="range" min="8" max="30" step="1" value={settings.fontSizeBase} onChange={(e) => setSettings({...settings, fontSizeBase: parseInt(e.target.value)})} />
          </div>

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

      <div style={{ width: '100%', height: '100%', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.3s' }}>
        {filteredData.nodes.length > 0 || data.nodes.length === 0 ? (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={filteredData}
          nodeLabel="name"
          nodeColor={(node: any) => node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor}
          linkColor={() => settings.linkColor}
          linkWidth={settings.linkWidth}
          backgroundColor="transparent"
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onLinkRightClick={handleLinkRightClick}
          linkDirectionalParticles={settings.particleCount}
          linkDirectionalParticleWidth={settings.linkWidth * 1.5}
          linkDirectionalParticleSpeed={0.008}
          
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            if (!link.label) return;
            const start = link.source;
            const end = link.target;
            
            if (typeof start !== 'object' || typeof end !== 'object') return;

            const textPos = {
              x: start.x + (end.x - start.x) / 2,
              y: start.y + (end.y - start.y) / 2
            } as any;
            
            const relLink = { x: end.x - start.x, y: end.y - start.y };
            let textAngle = Math.atan2(relLink.y, relLink.x);
            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

            const fontSize = (settings.fontSizeBase * 0.8) / globalScale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(link.label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.save();
            ctx.translate(textPos.x, textPos.y);
            ctx.rotate(textAngle);
            
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(link.label, 0, 0);
            ctx.restore();
          }}

          nodeCanvasObject={(node: any, ctx, globalScale) => {
            // Usa o renderTrigger silenciosamente para re-renderizar
                        const _trigger = renderTrigger;
            const size = 16; // Base radius/size

            // Função para desenhar o shape atual
            const drawShape = () => {
              ctx.beginPath();
              if (settings.nodeShape === 'square') {
                ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
              } else if (settings.nodeShape === 'shield') {
                const x = node.x; const y = node.y;
                ctx.moveTo(x - size, y - size);
                ctx.lineTo(x + size, y - size);
                ctx.lineTo(x + size, y + size * 0.2);
                ctx.quadraticCurveTo(x + size, y + size, x, y + size);
                ctx.quadraticCurveTo(x - size, y + size, x - size, y + size * 0.2);
                ctx.lineTo(x - size, y - size);
                ctx.closePath();
              } else if (settings.nodeShape === 'hexagon') {
                const x = node.x; const y = node.y;
                ctx.moveTo(x, y - size);
                ctx.lineTo(x + size * 0.866, y - size * 0.5);
                ctx.lineTo(x + size * 0.866, y + size * 0.5);
                ctx.lineTo(x, y + size);
                ctx.lineTo(x - size * 0.866, y + size * 0.5);
                ctx.lineTo(x - size * 0.866, y - size * 0.5);
                ctx.closePath();
              } else {
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
              }
            };

            if (node.avatar) {
              if (!node.img) {
                const img = new Image();
                let avatarUrl = node.avatar;
                // Strip localhost to avoid cross-origin canvas issues
                if (avatarUrl.includes('localhost:5174')) {
                  avatarUrl = avatarUrl.substring(avatarUrl.indexOf('/api/'));
                }
                
                if (avatarUrl.startsWith('http') || avatarUrl.startsWith('/api/')) {
                  img.src = avatarUrl;
                } else {
                  const config = getWikiConfig();
                  const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
                  img.src = `/api/wiki/media?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(avatarUrl)}`;
                }
                node.img = img;
                node.imgStatus = 'loading';
                
                img.onload = () => {
                   node.imgStatus = 'loaded';
                   setRenderTrigger(t => t + 1);
                };
                img.onerror = () => {
                   node.imgStatus = 'error';
                   setRenderTrigger(t => t + 1);
                };
              }

              if (node.imgStatus === 'loaded' && node.img.naturalWidth !== 0) {
                ctx.save();
                drawShape();
                ctx.strokeStyle = node.id === linkingSourceNode?.id ? '#facc15' : (node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor);
                ctx.lineWidth = node.id === linkingSourceNode?.id ? 4 : 2;
                ctx.stroke();
                ctx.clip();
                ctx.drawImage(node.img, node.x - size, node.y - size, size * 2, size * 2);
                ctx.restore();
              } else {
                drawShape();
                if (node.imgStatus === 'error') {
                   ctx.fillStyle = '#ff0000'; // RED = ERROR
                } else if (node.imgStatus === 'loading') {
                   ctx.fillStyle = '#ff9900'; // ORANGE = LOADING
                } else {
                   ctx.fillStyle = node.id === linkingSourceNode?.id ? '#facc15' : (node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor);
                }
                ctx.fill();
              }
            } else {
              drawShape();
              ctx.fillStyle = node.id === linkingSourceNode?.id ? '#facc15' : (node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor);
              ctx.fill();
            }

            const label = node.name;
            const fontSize = settings.fontSizeBase / globalScale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + size + 2, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.id === linkingSourceNode?.id ? '#facc15' : (node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor);
            ctx.fillText(label, node.x, node.y + size + 2 + bckgDimensions[1]/2);

            node.__bckgDimensions = [bckgDimensions[0], bckgDimensions[1] + size + 2];
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            const size = 16;
            const bckgDimensions = node.__bckgDimensions;
            if (bckgDimensions) {
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - size, bckgDimensions[0], bckgDimensions[1] + size);
            }
          }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
          Nenhum nó encontrado no Cérebro.
        </div>
      )}
      </div>
    </div>
  );
};
