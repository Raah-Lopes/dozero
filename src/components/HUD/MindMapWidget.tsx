import React, { useState, useEffect, useRef } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { 
  Network, Type, Image as ImageIcon, Save, FolderOpen, Trash2, 
  User, MapPin, Calendar, Link as LinkIcon, Book, FileText, 
  Plus, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import { saveMarkdownContent, loadMarkdownFile, ensureWikiFolder } from '../../utils/githubApi';
import { pushChatMessage } from '../../store';

interface MapasMentaisWidgetProps {
  onClose: () => void;
}

export interface MindMapNode {
  id: string;
  type: 'text' | 'note' | 'character' | 'location' | 'event' | 'image' | 'link' | 'wiki';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  description: string;
  color: string;
  imagePath?: string;
  filePath?: string;
  externalUrl?: string;
  links: string[]; // IDs de nós alvo
}

export interface MindMapData {
  id: string;
  name: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  nodes: MindMapNode[];
}

const TYPE_CONFIG = {
  text:      { icon: Type,      color: 'transparent', border: 'none' },
  note:      { icon: FileText,  color: '#f59e0b', border: '#fcd34d' },
  character: { icon: User,      color: '#3b82f6', border: '#93c5fd' },
  location:  { icon: MapPin,    color: '#10b981', border: '#6ee7b7' },
  event:     { icon: Calendar,  color: '#ef4444', border: '#fca5a5' },
  image:     { icon: ImageIcon, color: 'transparent', border: '#94a3b8' },
  link:      { icon: LinkIcon,  color: '#64748b', border: '#cbd5e1' },
  wiki:      { icon: Book,      color: '#a855f7', border: '#d8b4fe' },
};

export const MapasMentaisWidget: React.FC<MapasMentaisWidgetProps> = ({ onClose }) => {
  const [board, setBoard] = useState<MindMapData>({
    id: 'default',
    name: 'Quadro_Principal',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    nodes: []
  });

  const [isPanning, setIsPanning] = useState(false);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CARREGAR MAPA E ESCUTAR WIKI ---
  useEffect(() => {
    handleLoad();

    const handleWikiOpen = (e: Event) => {
      const customE = e as CustomEvent;
      const filePath = customE.detail?.filePath;
      if (filePath) {
        addNode('wiki', { 
          title: filePath.split('/').pop()?.replace('.md', '') || 'Doc Wiki', 
          filePath 
        });
        pushChatMessage(`Arquivo ${filePath} adicionado ao mapa mental.`, true, false);
      }
    };

    window.addEventListener('open-wiki-file', handleWikiOpen);
    return () => window.removeEventListener('open-wiki-file', handleWikiOpen);
  }, []);

  // --- SALVAR / CARREGAR ---
  const handleSave = async () => {
    try {
      const data = JSON.stringify(board, null, 2);
      await ensureWikiFolder('MapasMentais');
      // Salvamos como .md mas com conteúdo JSON para compatibilidade exigida
      await saveMarkdownContent(`MapasMentais/${board.name}.md`, data);
      pushChatMessage('Painel de Investigação salvo na Wiki.', true, false);
    } catch (err) {
      console.error(err);
      pushChatMessage('Erro ao salvar Painel.', false, true);
    }
  };

  const handleLoad = async () => {
    try {
      const content = await loadMarkdownFile(`MapasMentais/${board.name}.md`);
      if (content) {
        try {
          const parsed = JSON.parse(content);
          setBoard(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Conteúdo não é um JSON válido.");
        }
      }
    } catch (err) {
      console.log('Nenhum mapa anterior encontrado.', err);
    }
  };

  // --- COORDENADAS E ZOOM ---
  const screenToCanvas = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - board.offsetX) / board.zoom,
      y: (clientY - rect.top - board.offsetY) / board.zoom
    };
  };

  const centerCanvas = () => setBoard(b => ({ ...b, offsetX: 0, offsetY: 0, zoom: 1 }));
  const changeZoom = (delta: number) => {
    setBoard(b => {
      const newZoom = Math.max(0.2, Math.min(b.zoom + delta, 3));
      return { ...b, zoom: newZoom };
    });
  };

  // --- CRIAÇÃO E DELEÇÃO ---
  const addNode = (type: MindMapNode['type'], extraProps: Partial<MindMapNode> = {}) => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      type,
      x: (-board.offsetX + 150) / board.zoom,
      y: (-board.offsetY + 150) / board.zoom,
      width: type === 'image' ? 200 : 220,
      height: type === 'image' ? 200 : 120,
      title: 'Nova Ideia',
      description: '',
      color: TYPE_CONFIG[type].color,
      links: [],
      ...extraProps
    };
    setBoard(b => ({ ...b, nodes: [...b.nodes, newNode] }));
  };

  const deleteNode = (id: string) => {
    setBoard(b => ({
      ...b,
      nodes: b.nodes
        .filter(n => n.id !== id)
        .map(n => ({ ...n, links: n.links.filter(l => l !== id) }))
    }));
  };

  const deleteLink = (sourceId: string, targetId: string) => {
    setBoard(b => ({
      ...b,
      nodes: b.nodes.map(n => n.id === sourceId ? { ...n, links: n.links.filter(l => l !== targetId) } : n)
    }));
  };

  // --- MOUSE HANDLERS ---
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setBoard(b => ({ ...b, offsetX: b.offsetX + e.movementX, offsetY: b.offsetY + e.movementY }));
      return;
    }

    if (draggingNode) {
      setBoard(b => ({
        ...b,
        nodes: b.nodes.map(n => n.id === draggingNode 
          ? { ...n, x: n.x + e.movementX / b.zoom, y: n.y + e.movementY / b.zoom } 
          : n)
      }));
    }

    if (drawingEdgeFrom) {
      setMousePos(screenToCanvas(e.clientX, e.clientY));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    setDrawingEdgeFrom(null);
  };

  // --- INTEGRAÇÃO WIKI E IMAGENS ---
  const handleNodeDoubleClick = (node: MindMapNode) => {
    if (node.type === 'wiki' && node.filePath) {
      window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { filePath: node.filePath } }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      addNode('image', { imagePath: event.target?.result as string, title: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --- RENDERIZAÇÃO DE CURVAS ---
  const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <DraggableWindow
      title={`Painel de Conspiração: ${board.name.replace('_', ' ')}`}
      id="mapas-mentais-widget"
      onClose={onClose}
      width={1000}
      height={650}
      initialX={window.innerWidth / 2 - 500}
      initialY={window.innerHeight / 2 - 325}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'rgba(2, 6, 23, 0.95)', fontFamily: 'var(--font-body)', color: '#f1f5f9' }}>
        
        {/* TOOLBAR */}
        <div style={{ display: 'flex', gap: '6px', padding: '10px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.character.color }} onClick={() => addNode('character')}><User size={16}/> NPC</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.location.color }} onClick={() => addNode('location')}><MapPin size={16}/> Local</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.event.color }} onClick={() => addNode('event')}><Calendar size={16}/> Evento</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.note.color }} onClick={() => addNode('note')}><FileText size={16}/> Nota</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.wiki.color }} onClick={() => addNode('wiki')}><Book size={16}/> Doc</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.text.border }} onClick={() => addNode('text')}><Type size={16}/> Texto</button>
          
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.image.border }} onClick={() => fileInputRef.current?.click()}><ImageIcon size={16}/> Imagem</button>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          
          <div style={{ flex: 1 }} />
          
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            <button className="cw-icon-btn" onClick={() => changeZoom(-0.1)}><ZoomOut size={18} /></button>
            <button className="cw-icon-btn" onClick={centerCanvas}><Maximize size={18} /></button>
            <button className="cw-icon-btn" onClick={() => changeZoom(0.1)}><ZoomIn size={18} /></button>
          </div>

          <button className="cw-btn" style={{ background: '#22c55e', color: '#fff', border: 'none', marginLeft: '8px' }} onClick={handleSave}><Save size={16}/> Salvar</button>
        </div>

        {/* CANVAS INFINITO */}
        <div 
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isPanning ? 'grabbing' : 'default' }}
          onMouseDown={(e) => { if (e.button === 0 && e.target === containerRef.current) setIsPanning(true); }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Fundo de Grid Dinâmico */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
            backgroundSize: `${40 * board.zoom}px ${40 * board.zoom}px`,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundPosition: `${board.offsetX}px ${board.offsetY}px`
          }} />

          {/* ÁREA DE RENDERIZAÇÃO TRANSFORMADA (ZOOM E PAN) */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transformOrigin: '0 0', transform: `translate(${board.offsetX}px, ${board.offsetY}px) scale(${board.zoom})`
          }}>
            
            {/* LAYER SVG PARA CONEXÕES */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.4)" />
                </marker>
              </defs>

              {/* Linha sendo desenhada */}
              {drawingEdgeFrom && (
                <path
                  d={drawBezier(
                    board.nodes.find(n => n.id === drawingEdgeFrom)!.x + board.nodes.find(n => n.id === drawingEdgeFrom)!.width,
                    board.nodes.find(n => n.id === drawingEdgeFrom)!.y + board.nodes.find(n => n.id === drawingEdgeFrom)!.height / 2,
                    mousePos.x, mousePos.y
                  )}
                  fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="5,5"
                />
              )}

              {/* Linhas Salvas */}
              {board.nodes.flatMap(source => 
                source.links.map(targetId => {
                  const target = board.nodes.find(n => n.id === targetId);
                  if (!target) return null;
                  
                  const startX = source.x + source.width;
                  const startY = source.y + source.height / 2;
                  const endX = target.x;
                  const endY = target.y + target.height / 2;

                  return (
                    <g key={`${source.id}-${target.id}`} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onDoubleClick={() => deleteLink(source.id, target.id)}>
                      <path d={drawBezier(startX, startY, endX, endY)} fill="none" stroke="transparent" strokeWidth="15" />
                      <path d={drawBezier(startX, startY, endX, endY)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" markerEnd="url(#arrowhead)" className="cw-edge" />
                    </g>
                  );
                })
              )}
            </svg>

            {/* LAYER HTML PARA NÓS (CARDS) */}
            {board.nodes.map(node => {
              const NodeIcon = TYPE_CONFIG[node.type].icon;
              const isText = node.type === 'text';
              const isImage = node.type === 'image';

              return (
                <div
                  key={node.id}
                  className="cw-node"
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  style={{
                    position: 'absolute', left: node.x, top: node.y, width: node.width, height: node.height,
                    background: isText ? 'transparent' : (isImage ? 'transparent' : 'rgba(15, 23, 42, 0.95)'),
                    border: isText || isImage ? 'none' : `1px solid ${TYPE_CONFIG[node.type].border}`,
                    borderRadius: '8px',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: isText || isImage ? 'none' : '0 4px 20px rgba(0,0,0,0.5)',
                    overflow: 'visible' // Para os conectores não sumirem
                  }}
                >
                  {/* Cabeçalho de Arrastar */}
                  {(!isText && !isImage) && (
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); setDraggingNode(node.id); }}
                      style={{
                        height: '28px', background: `rgba(0,0,0,0.3)`, cursor: 'grab',
                        borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                        display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px',
                        borderBottom: `1px solid ${TYPE_CONFIG[node.type].border}40`
                      }}
                    >
                      <NodeIcon size={14} color={TYPE_CONFIG[node.type].color} />
                      <input 
                        value={node.title} 
                        onChange={(e) => setBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === node.id ? { ...n, title: e.target.value } : n)}))}
                        style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontWeight: 600, fontSize: '12px', flex: 1, outline: 'none' }}
                      />
                      <button onClick={() => deleteNode(node.id)} className="cw-icon-btn"><Trash2 size={14} color="#ef4444" /></button>
                    </div>
                  )}

                  {/* Arrastador para Texto/Imagem (já que não têm header) */}
                  {(isText || isImage) && (
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); setDraggingNode(node.id); }}
                      style={{ position: 'absolute', top: -20, right: 0, cursor: 'grab', display: 'flex', gap: '4px', opacity: 0.5 }}
                      className="cw-hover-controls"
                    >
                      <button onClick={() => deleteNode(node.id)} className="cw-icon-btn"><Trash2 size={14} color="#ef4444" /></button>
                    </div>
                  )}

                  {/* Corpo do Nó */}
                  <div style={{ flex: 1, padding: isText || isImage ? '0' : '8px', overflow: 'hidden' }}>
                    {isText ? (
                      <textarea
                        value={node.description}
                        onChange={(e) => setBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === node.id ? { ...n, description: e.target.value } : n)}))}
                        style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: '#f1f5f9', resize: 'both', outline: 'none', fontSize: '18px', fontWeight: 600 }}
                        placeholder="Texto livre..."
                      />
                    ) : isImage ? (
                      <div style={{ width: '100%', height: '100%', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', resize: 'both' }}>
                         <img src={node.imagePath} alt={node.title} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      </div>
                    ) : (
                      <textarea
                        value={node.description}
                        onChange={(e) => setBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === node.id ? { ...n, description: e.target.value } : n)}))}
                        style={{ width: '100%', height: '100%', background: 'transparent', border: 'none', color: '#cbd5e1', resize: 'none', outline: 'none', fontSize: '13px' }}
                        placeholder={node.type === 'wiki' ? "Duplo clique para abrir na Wiki..." : "Anotações..."}
                      />
                    )}
                  </div>

                  {/* Conector OUT (Direita) */}
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); setDrawingEdgeFrom(node.id); }}
                    className="cw-connector" title="Arrastar para conectar"
                    style={{ position: 'absolute', right: '-8px', top: 'calc(50% - 8px)', width: '16px', height: '16px', borderRadius: '50%', background: '#a855f7', cursor: 'crosshair', border: '3px solid #0f172a', zIndex: 10 }}
                  />

                  {/* Conector IN (Esquerda Invisível) para dropar a linha */}
                  <div
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      if (drawingEdgeFrom && drawingEdgeFrom !== node.id) {
                        setBoard(b => ({ ...b, nodes: b.nodes.map(n => n.id === drawingEdgeFrom ? { ...n, links: [...new Set([...n.links, node.id])] } : n) }));
                        setDrawingEdgeFrom(null);
                      }
                    }}
                    style={{ position: 'absolute', left: '-10px', top: '0', bottom: '0', width: '20px', zIndex: 5 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .cw-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: rgba(0,0,0,0.3);
        }
        .cw-btn:hover { filter: brightness(1.3); transform: translateY(-1px); background: rgba(255,255,255,0.1); }
        
        .cw-icon-btn {
          background: transparent; border: none; cursor: pointer; opacity: 0.6; transition: opacity 0.2s;
          display: flex; align-items: center; justify-content: center; padding: 4px; color: #f1f5f9;
        }
        .cw-icon-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); border-radius: 4px; }
        
        .cw-node { transition: outline 0.2s; }
        .cw-node:hover { outline: 1px solid rgba(255,255,255,0.5); z-index: 20; }
        
        .cw-connector { transition: transform 0.2s; opacity: 0; }
        .cw-node:hover .cw-connector { opacity: 1; }
        .cw-connector:hover { transform: scale(1.3); }
        
        .cw-edge { transition: stroke 0.2s, stroke-width 0.2s; }
        .cw-edge:hover { stroke: #ef4444 !important; stroke-width: 5 !important; }

        .cw-hover-controls { opacity: 0; transition: opacity 0.2s; }
        .cw-node:hover .cw-hover-controls { opacity: 1; }
      `}</style>
    </DraggableWindow>
  );
};
