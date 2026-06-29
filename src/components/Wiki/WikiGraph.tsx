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

const imageCache: Record<string, { img: HTMLImageElement, status: 'loading' | 'loaded' | 'error' }> = {};

export const WikiGraph: React.FC<WikiGraphProps> = ({ onNodeClick }) => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [settings, setSettings] = useState<GraphSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [linkingSourceNode, setLinkingSourceNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  // Load Settings from GraphSettings.md
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = getWikiConfig();
        const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
        const res = await fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent('GraphSettings.md')}`);
        if (res.ok) {
          const fileData = await res.json();
          if (fileData && fileData.content) {
            const parsed = JSON.parse(fileData.content);
            setSettings({ ...defaultSettings, ...parsed });
          }
        }
      } catch (err) {
        console.log('Nenhuma configuração salva encontrada no repositório. Usando padrão.');
      }
    };
    loadSettings();
  }, []);

  // Save Settings to GraphSettings.md when panel closes
  const handleCloseSettings = async () => {
    setShowSettings(false);
    try {
      const config = getWikiConfig();
      const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
      await fetch(`/api/wiki/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoPath, 
          path: 'GraphSettings.md', 
          content: JSON.stringify(settings, null, 2) 
        })
      });
    } catch (err) {
      console.error('Erro ao salvar as configurações no servidor.', err);
    }
  };

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

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    if (event.shiftKey) {
      if (!linkingSourceNode) {
        setLinkingSourceNode(node);
      } else {
        if (linkingSourceNode.id !== node.id) {
          const confirmLink = window.confirm(`Criar ligação de ${linkingSourceNode.name} para ${node.name}?`);
          if (confirmLink) {
            try {
              const config = getWikiConfig();
              const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
              fetch(`/api/wiki/file?repoPath=${encodeURIComponent(repoPath)}&path=${encodeURIComponent(linkingSourceNode.id)}`)
                .then(res => res.json())
                .then(fileData => {
                  const relLabel = window.prompt(`Qual a relação de ${linkingSourceNode.name} com ${node.name}? (Ex: Pai de, Aliado). Deixe em branco se for só um link.`);
                  let linkText = `[[${node.name}]]`;
                  if (relLabel && relLabel.trim() !== '') linkText = `\n\n${relLabel}:: [[${node.name}]]`;
                  else linkText = `\n\n[[${node.name}]]`;

                  const newContent = fileData.content + linkText;
                  return fetch(`/api/wiki/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repoPath, path: linkingSourceNode.id, content: newContent })
                  });
                })
                .then(() => fetchGraph())
                .catch(err => {
                  console.error("Erro ao criar link visual", err);
                  alert("Falha ao criar ligação.");
                });
            } catch (err) {
              console.error("Erro", err);
            }
          }
          setLinkingSourceNode(null);
        }
      }
      return;
    }

    if (linkingSourceNode) {
      setLinkingSourceNode(null); // Cancel link mode on normal click
    }

    // Se o nó estava fixo (pinned), um clique solta ele para a física agir novamente
    if (node.fx != null || node.fy != null) {
      node.fx = null;
      node.fy = null;
      if (fgRef.current) fgRef.current.d3ReheatSimulation();
    }

    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(4, 2000);
    }
    setTimeout(() => {
      onNodeClick(node.path);
    }, 800);
  }, [onNodeClick, linkingSourceNode, fetchGraph]);

  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0) {
      fgRef.current.d3Force('charge').strength((node: any) => settings.repelForce * (node.val || 1.5));
      fgRef.current.d3Force('link').distance((link: any) => settings.linkDistance);
      fgRef.current.d3ReheatSimulation();
    }
  }, [settings.repelForce, settings.linkDistance, data]);

  const [activeTab, setActiveTab] = useState<'physics' | 'visuals'>('physics');

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
          width: '320px', padding: '1.2rem', borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(168, 85, 247, 0.3)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Cérebro
            </h3>
            <X size={18} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={handleCloseSettings} />
          </div>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            <button onClick={() => setActiveTab('physics')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: activeTab === 'physics' ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: activeTab === 'physics' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'all 0.2s' }}>Física</button>
            <button onClick={() => setActiveTab('visuals')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: activeTab === 'visuals' ? 'rgba(168, 85, 247, 0.2)' : 'transparent', color: activeTab === 'visuals' ? 'var(--accent-primary)' : 'var(--text-secondary)', transition: 'all 0.2s' }}>Visual</button>
          </div>

          {activeTab === 'physics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  Força de Repulsão <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{settings.repelForce}</span>
                </label>
                <input type="range" min="-1000" max="-50" step="10" value={settings.repelForce} onChange={(e) => setSettings({...settings, repelForce: parseInt(e.target.value)})} style={{ accentColor: 'var(--accent-primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  Distância dos Links <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{settings.linkDistance}</span>
                </label>
                <input type="range" min="10" max="200" step="5" value={settings.linkDistance} onChange={(e) => setSettings({...settings, linkDistance: parseInt(e.target.value)})} style={{ accentColor: 'var(--accent-primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  Partículas de Energia <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{settings.particleCount}</span>
                </label>
                <input type="range" min="0" max="10" step="1" value={settings.particleCount} onChange={(e) => setSettings({...settings, particleCount: parseInt(e.target.value)})} style={{ accentColor: 'var(--accent-primary)' }} />
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Formato dos Nós</label>
                <select 
                  value={settings.nodeShape} 
                  onChange={(e) => setSettings({...settings, nodeShape: e.target.value as any})}
                  style={{ background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="circle">Círculo</option>
                  <option value="square">Quadrado</option>
                  <option value="shield">Escudo</option>
                  <option value="hexagon">Hexágono</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  Tamanho das Letras <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{settings.fontSizeBase}</span>
                </label>
                <input type="range" min="8" max="30" step="1" value={settings.fontSizeBase} onChange={(e) => setSettings({...settings, fontSizeBase: parseInt(e.target.value)})} style={{ accentColor: 'var(--accent-primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                  Espessura da Linha <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{settings.linkWidth}</span>
                </label>
                <input type="range" min="0.5" max="10" step="0.5" value={settings.linkWidth} onChange={(e) => setSettings({...settings, linkWidth: parseFloat(e.target.value)})} style={{ accentColor: 'var(--accent-primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Cores Personalizadas</label>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    <input type="color" value={settings.nodePrimaryColor} onChange={(e) => setSettings({...settings, nodePrimaryColor: e.target.value})} style={{ cursor: 'pointer', border: 'none', width: '20px', height: '20px', borderRadius: '4px', padding: 0 }} title="Raiz" />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Raiz</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    <input type="color" value={settings.nodeSecondaryColor} onChange={(e) => setSettings({...settings, nodeSecondaryColor: e.target.value})} style={{ cursor: 'pointer', border: 'none', width: '20px', height: '20px', borderRadius: '4px', padding: 0 }} title="Pastas" />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pastas</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
                    <input type="color" value={settings.linkColor} onChange={(e) => setSettings({...settings, linkColor: e.target.value})} style={{ cursor: 'pointer', border: 'none', width: '20px', height: '20px', borderRadius: '4px', padding: 0 }} title="Links" />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Links</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="wiki-graph-container" style={{ width: '100%', height: '100%', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.3s' }}>
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
              if (!imageCache[node.id]) {
                const img = new Image();
                let avatarUrl = node.avatar;
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
                
                imageCache[node.id] = { img, status: 'loading' };
                
                img.onload = () => {
                   if (imageCache[node.id]) imageCache[node.id].status = 'loaded';
                };
                img.onerror = () => {
                   if (imageCache[node.id]) imageCache[node.id].status = 'error';
                };
              }

              const cached = imageCache[node.id];
              if (cached && cached.status === 'loaded' && cached.img.naturalWidth !== 0) {
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
                ctx.fillStyle = node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor;
                ctx.fill();
                ctx.strokeStyle = node.id === linkingSourceNode?.id ? '#facc15' : 'rgba(255,255,255,0.2)';
                ctx.lineWidth = node.id === linkingSourceNode?.id ? 4 : 1.5;
                ctx.stroke();
              }
            } else {
              drawShape();
              ctx.fillStyle = node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor;
              ctx.fill();
              ctx.strokeStyle = node.id === linkingSourceNode?.id ? '#facc15' : 'rgba(255,255,255,0.2)';
              ctx.lineWidth = node.id === linkingSourceNode?.id ? 4 : 1.5;
              ctx.stroke();
            }

            // Text Label
            if (globalScale >= 1.2 || data.nodes.length < 50) {
              const label = node.name;
              const fontSize = settings.fontSizeBase / globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

              ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + size + 2, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.fillText(label, node.x, node.y + size + 2 + bckgDimensions[1] / 2);
              
              node.__bckgDimensions = bckgDimensions;
            } else {
              node.__bckgDimensions = null;
            }
          }}
          onNodeDragEnd={(node: any) => {
            // Pin the node in place after dragging so it doesn't fly away
            node.fx = node.x;
            node.fy = node.y;
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
