import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import {
  Type, Image as ImageIcon, Save, Trash2,
  User, MapPin, Calendar, Link as LinkIcon, Book, FileText,
  ZoomIn, ZoomOut, Maximize, Grid, Palette, FilePlus, Move,
  FolderOpen, MousePointer2, Box
} from 'lucide-react';
import { saveMarkdownContent, loadMarkdownFile, ensureWikiFolder } from '../../../utils/githubApi';
import { pushChatMessage } from '../../../store';
import { useWiki } from '../../../hooks/useWiki';

interface MapasMentaisWidgetProps {
  onClose: () => void;
}

export interface MindMapNode {
  id: string;
  type: 'text' | 'note' | 'character' | 'location' | 'event' | 'image' | 'link' | 'wiki' | 'md' | 'zone';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  description: string;
  color: string;
  imagePath?: string;
  filePath?: string;
  links: string[];
}

export interface MindMapData {
  id: string;
  name: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  bgColor: string;
  gridColor?: string;
  nodes: MindMapNode[];
}

const GRID_SIZE = 40;

const BG_PRESETS = [
  { label: 'Obsidian', value: 'rgba(5, 5, 10, 0.98)' },
  { label: 'Dark Navy', value: 'rgba(7, 12, 28, 0.98)' },
  { label: 'Deep Forest', value: 'rgba(5, 16, 12, 0.98)' },
  { label: 'Burgundy', value: 'rgba(20, 5, 10, 0.98)' },
];

const TYPE_CONFIG: Record<MindMapNode['type'], { icon: React.ElementType; color: string; border: string }> = {
  text:      { icon: Type,      color: '#cbd5e1', border: '#475569' },
  note:      { icon: FileText,  color: '#f59e0b', border: '#fcd34d' },
  character: { icon: User,      color: '#3b82f6', border: '#93c5fd' },
  location:  { icon: MapPin,    color: '#10b981', border: '#6ee7b7' },
  event:     { icon: Calendar,  color: '#ef4444', border: '#fca5a5' },
  image:     { icon: ImageIcon, color: '#94a3b8', border: '#475569' },
  link:      { icon: LinkIcon,  color: '#64748b', border: '#cbd5e1' },
  wiki:      { icon: Book,      color: '#a855f7', border: '#d8b4fe' },
  md:        { icon: FilePlus,  color: '#06b6d4', border: '#67e8f9' },
  zone:      { icon: Box,       color: '#6366f1', border: '#818cf8' },
};

const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

export const MapasMentaisWidget: React.FC<MapasMentaisWidgetProps> = ({ onClose }) => {
  const [board, setBoard] = useState<MindMapData>({
    id: 'default',
    name: 'Quadro_Principal',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    bgColor: BG_PRESETS[0].value,
    nodes: [],
  });

  const { index: wikiIndex } = useWiki();
  const availableMaps = wikiIndex.filter(i => i.path.startsWith('MapasMentais/'));

  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  const [isPanning, setIsPanning] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [resizingNode, setResizingNode] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showLoadPicker, setShowLoadPicker] = useState(false);
  const [showMdModal, setShowMdModal] = useState(false);
  const [mdPathInput, setMdPathInput] = useState('');
  
  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);

  // Alignment lines state
  const [alignmentLines, setAlignmentLines] = useState<{ x?: number, y?: number }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customColorRef = useRef<HTMLInputElement>(null);

  // --- LOAD / SAVE ---
  const handleLoad = useCallback(async (mapPath: string = 'MapasMentais/Quadro_Principal.md', explicit = false) => {
    if (!explicit && loadedRef.current) return;
    loadedRef.current = true;
    setIsLoading(true);
    try {
      const content = await loadMarkdownFile(mapPath);
      if (content) {
        try {
          const parsed = JSON.parse(content);
          setBoard({
            id: parsed.id || 'default',
            name: parsed.name || mapPath.replace('MapasMentais/', '').replace('.md', ''),
            zoom: parsed.zoom || 1,
            offsetX: parsed.offsetX || 0,
            offsetY: parsed.offsetY || 0,
            bgColor: parsed.bgColor || BG_PRESETS[0].value,
            gridColor: parsed.gridColor,
            nodes: parsed.nodes || [],
          });
        } catch {
          console.error('Conteúdo não é JSON válido.');
        }
      }
    } catch {
      console.log('Nenhum mapa anterior encontrado em', mapPath);
    } finally {
      setIsLoading(false);
      setShowLoadPicker(false);
    }
  }, []);

  useEffect(() => {
    handleLoad();
    const handleWikiOpen = (e: Event) => {
      const filePath = (e as CustomEvent).detail?.filePath;
      if (filePath) {
        addNode('wiki', {
          title: filePath.split('/').pop()?.replace('.md', '') || 'Doc Wiki',
          filePath,
        });
      }
    };
    window.addEventListener('open-wiki-file', handleWikiOpen);
    return () => window.removeEventListener('open-wiki-file', handleWikiOpen);
  }, [handleLoad]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' && selectedNode) {
        deleteNode(selectedNode);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  const handleSave = async () => {
    try {
      await ensureWikiFolder('MapasMentais');
      await saveMarkdownContent(`MapasMentais/${board.name}.md`, JSON.stringify(board, null, 2));
      pushChatMessage('Mapa Mental atualizado com sucesso.', true, false);
    } catch {
      pushChatMessage('Erro ao salvar Mapa Mental.', false, true);
    }
  };

  // --- CANVAS UTILS ---
  const screenToCanvas = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - board.offsetX) / board.zoom,
      y: (clientY - rect.top - board.offsetY) / board.zoom,
    };
  };

  const centerCanvas = () => setBoard(b => ({ ...b, offsetX: 0, offsetY: 0, zoom: 1 }));
  const changeZoom = (delta: number) =>
    setBoard(b => ({ ...b, zoom: Math.max(0.15, Math.min(b.zoom + delta, 4)) }));

  // --- NODES CRUD ---
  const addNode = (type: MindMapNode['type'], extraProps: Partial<MindMapNode> = {}) => {
    const isZone = type === 'zone';
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      type,
      x: (-board.offsetX + 300) / board.zoom,
      y: (-board.offsetY + 200) / board.zoom,
      width: isZone ? 400 : (type === 'image' ? 220 : (type === 'text' ? 200 : 240)),
      height: isZone ? 300 : (type === 'image' ? 180 : (type === 'text' ? 80 : 120)),
      title: type === 'md' ? 'Arquivo .md' : (isZone ? 'Nova Zona' : 'Nova Ideia'),
      description: '',
      color: TYPE_CONFIG[type].color,
      links: [],
      ...extraProps,
    };
    setBoard(b => ({ ...b, nodes: [...b.nodes, newNode] }));
  };

  const deleteNode = (id: string) => {
    setBoard(b => ({
      ...b,
      nodes: b.nodes.filter(n => n.id !== id).map(n => ({ ...n, links: n.links.filter(l => l !== id) })),
    }));
    setContextMenu(null);
  };

  const deleteLink = (sourceId: string, targetId: string) =>
    setBoard(b => ({
      ...b,
      nodes: b.nodes.map(n =>
        n.id === sourceId ? { ...n, links: n.links.filter(l => l !== targetId) } : n
      ),
    }));

  const updateNode = (id: string, changes: Partial<MindMapNode>) =>
    setBoard(b => ({ ...b, nodes: b.nodes.map(n => (n.id === id ? { ...n, ...changes } : n)) }));

  // --- MOUSE HANDLERS ---
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setBoard(b => ({ ...b, offsetX: b.offsetX + e.movementX, offsetY: b.offsetY + e.movementY }));
      return;
    }
    if (draggingNode) {
      const node = board.nodes.find(n => n.id === draggingNode);
      if (!node) return;
      
      let newX = node.x + e.movementX / board.zoom;
      let newY = node.y + e.movementY / board.zoom;
      const lines: {x?: number, y?: number}[] = [];
      const SNAP = 8 / board.zoom;

      if (!snapEnabled) {
        for (const other of board.nodes) {
          if (other.id === draggingNode) continue;
          
          // X snapping
          if (Math.abs(newX - other.x) < SNAP) { newX = other.x; lines.push({ x: other.x }); }
          else if (Math.abs((newX + node.width) - (other.x + other.width)) < SNAP) { newX = other.x + other.width - node.width; lines.push({ x: other.x + other.width }); }
          else if (Math.abs((newX + node.width/2) - (other.x + other.width/2)) < SNAP) { newX = other.x + other.width/2 - node.width/2; lines.push({ x: other.x + other.width/2 }); }

          // Y snapping
          if (Math.abs(newY - other.y) < SNAP) { newY = other.y; lines.push({ y: other.y }); }
          else if (Math.abs((newY + node.height) - (other.y + other.height)) < SNAP) { newY = other.y + other.height - node.height; lines.push({ y: other.y + other.height }); }
          else if (Math.abs((newY + node.height/2) - (other.y + other.height/2)) < SNAP) { newY = other.y + other.height/2 - node.height/2; lines.push({ y: other.y + other.height/2 }); }
        }
      }

      setAlignmentLines(lines);

      setBoard(b => ({
        ...b,
        nodes: b.nodes.map(n => n.id === draggingNode ? { ...n, x: newX, y: newY } : n)
      }));
      return;
    }
    if (resizingNode) {
      const dx = (e.clientX - resizingNode.startX) / board.zoom;
      const dy = (e.clientY - resizingNode.startY) / board.zoom;
      const newW = Math.max(100, resizingNode.startW + dx);
      const newH = Math.max(60, resizingNode.startH + dy);
      setBoard(b => ({
        ...b,
        nodes: b.nodes.map(n =>
          n.id === resizingNode.id ? { ...n, width: newW, height: newH } : n
        ),
      }));
      return;
    }
    if (drawingEdgeFrom) {
      setMousePos(screenToCanvas(e.clientX, e.clientY));
    }
  };

  const handleMouseUp = () => {
    if (draggingNode && snapEnabled) {
      setBoard(b => ({
        ...b,
        nodes: b.nodes.map(n =>
          n.id === draggingNode ? { ...n, x: snapToGrid(n.x), y: snapToGrid(n.y) } : n
        ),
      }));
    }
    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
    setDrawingEdgeFrom(null);
    setAlignmentLines([]);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === containerRef.current || target.id === 'cw-svg-layer') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      addNode('text', { x: pos.x - 100, y: pos.y - 40 });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => addNode('image', { imagePath: ev.target?.result as string, title: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    setSelectedNode(nodeId);
  };

  // --- BEZIER ---
  const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <DraggableWindow
      title={`🧠 Mapa Mental: ${board.name.replace(/_/g, ' ')}`}
      id="mapas-mentais-widget"
      onClose={onClose}
      width={1200}
      height={750}
      initialX={Math.max(0, window.innerWidth / 2 - 600)}
      initialY={Math.max(0, window.innerHeight / 2 - 375)}
      dragAnywhere={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: board.bgColor, fontFamily: 'var(--font-body)', color: '#f1f5f9', position: 'relative' }}>
        
        {isLoading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <span className="spin" style={{ fontSize: '32px' }}>⏳</span>
          </div>
        )}

        {/* MD CARD MODAL */}
        {showMdModal && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
          }} onClick={() => setShowMdModal(false)}>
            <div style={{
              background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(6,182,212,0.4)',
              borderRadius: '16px', padding: '24px', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px',
              boxShadow: '0 16px 50px rgba(0,0,0,0.8)'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: 0, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilePlus size={20} /> Importar Arquivo Wiki
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Caminho na Wiki (ex: <code style={{ color: '#67e8f9', background: 'rgba(6,182,212,0.1)', padding: '2px 4px', borderRadius: '4px' }}>wiki/npcs/Valdur.md</code>)
              </p>
              <input
                autoFocus
                value={mdPathInput}
                onChange={e => setMdPathInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { addNode('md', { filePath: mdPathInput, title: mdPathInput.split('/').pop()?.replace('.md', '') || 'Arquivo' }); setShowMdModal(false); } if (e.key === 'Escape') setShowMdModal(false); }}
                style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px',
                  padding: '12px 14px', color: '#f1f5f9', fontSize: '14px', outline: 'none', fontFamily: 'var(--font-mono)'
                }}
              />
            </div>
          </div>
        )}

        {/* CANVAS AREA */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isPanning ? 'grabbing' : (draggingNode || resizingNode ? 'grabbing' : 'default') }}
          onMouseDown={e => {
            setShowBgPicker(false);
            setContextMenu(null);
            const target = e.target as HTMLElement;
            if (e.button === 0 && (target === containerRef.current || target.id === 'cw-inner-canvas' || target.id === 'cw-svg-layer')) {
              setIsPanning(true);
              setSelectedNode(null);
            }
          }}
          onDoubleClick={handleCanvasDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={e => {
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            setBoard(b => ({ ...b, zoom: Math.max(0.15, Math.min(b.zoom + delta, 4)) }));
          }}
        >
          {/* Dynamic grid background */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundSize: `${GRID_SIZE * board.zoom}px ${GRID_SIZE * board.zoom}px`,
            backgroundImage: snapEnabled
              ? `linear-gradient(${board.gridColor || 'rgba(255,255,255,0.03)'} 1px, transparent 1px), linear-gradient(90deg, ${board.gridColor || 'rgba(255,255,255,0.03)'} 1px, transparent 1px)`
              : `radial-gradient(circle, ${board.gridColor || 'rgba(255,255,255,0.04)'} 1px, transparent 1px)`,
            backgroundPosition: `${board.offsetX}px ${board.offsetY}px`,
            transition: 'background-image 0.3s'
          }} />

          {/* Transform Layer */}
          <div id="cw-inner-canvas" style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transformOrigin: '0 0',
            transform: `translate(${board.offsetX}px, ${board.offsetY}px) scale(${board.zoom})`,
          }}>
            {/* Alignment Lines */}
            {alignmentLines.map((line, i) => (
              <div key={i} style={{
                position: 'absolute',
                background: '#0ea5e9',
                zIndex: 5,
                opacity: 0.6,
                ...(line.x !== undefined 
                  ? { left: line.x, top: -10000, bottom: -10000, width: '1px' } 
                  : { top: line.y, left: -10000, right: -10000, height: '1px' })
              }} />
            ))}

            {/* SVG edges layer */}
            <svg id="cw-svg-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 10 }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.25)" />
                </marker>
                <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
              </defs>

              {drawingEdgeFrom && (() => {
                const src = board.nodes.find(n => n.id === drawingEdgeFrom);
                if (!src) return null;
                return (
                  <path
                    d={drawBezier(src.x + src.width, src.y + src.height / 2, mousePos.x, mousePos.y)}
                    fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="6,4"
                  />
                );
              })()}

              {board.nodes.flatMap(source =>
                source.links.map(targetId => {
                  const target = board.nodes.find(n => n.id === targetId);
                  if (!target) return null;
                  const startX = source.x + source.width;
                  const startY = source.y + source.height / 2;
                  const endX = target.x;
                  const endY = target.y + target.height / 2;
                  return (
                    <g key={`${source.id}-${target.id}`} style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                      onDoubleClick={() => deleteLink(source.id, target.id)}>
                      <path d={drawBezier(startX, startY, endX, endY)} fill="none" stroke="transparent" strokeWidth="20" />
                      <path d={drawBezier(startX, startY, endX, endY)} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" markerEnd="url(#arrowhead)" className="cw-edge" />
                    </g>
                  );
                })
              )}
            </svg>

            {/* HTML Nodes */}
            {/* Sort zones first so they render underneath everything */}
            {board.nodes.slice().sort((a,b) => (a.type === 'zone' ? -1 : 1) - (b.type === 'zone' ? -1 : 1)).map(node => {
              const NodeIcon = TYPE_CONFIG[node.type].icon;
              const isImage = node.type === 'image';
              const isZone = node.type === 'zone';
              const isSelected = selectedNode === node.id;

              return (
                <div
                  key={node.id}
                  className={`cw-node ${isZone ? 'cw-zone' : ''}`}
                  onDoubleClick={() => {
                    if ((node.type === 'wiki' || node.type === 'md') && node.filePath) {
                      window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { filePath: node.filePath } }));
                    }
                  }}
                  onMouseDown={e => {
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    setSelectedNode(node.id);
                  }}
                  onContextMenu={e => handleNodeContextMenu(e, node.id)}
                  onMouseUp={e => {
                    if (drawingEdgeFrom && drawingEdgeFrom !== node.id) {
                      e.stopPropagation();
                      setBoard(b => ({
                        ...b,
                        nodes: b.nodes.map(n =>
                          n.id === drawingEdgeFrom ? { ...n, links: [...new Set([...n.links, node.id])] } : n
                        ),
                      }));
                      setDrawingEdgeFrom(null);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: node.x, top: node.y,
                    width: node.width, height: node.height,
                    zIndex: isSelected ? 50 : (isZone ? 1 : 20),
                  }}
                >
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: isImage ? 'transparent' : (isZone ? `${node.color}15` : 'rgba(15, 23, 42, 0.45)'),
                    backdropFilter: isImage || isZone ? 'none' : 'blur(16px)',
                    border: isSelected
                      ? `2px solid ${node.color}`
                      : isImage ? '1px solid rgba(255,255,255,0.05)' : (isZone ? `2px dashed ${node.color}66` : `1px solid rgba(255,255,255,0.08)`),
                    borderRadius: isZone ? '24px' : '12px',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: isSelected
                      ? `0 0 40px ${node.color}33, 0 8px 30px rgba(0,0,0,0.5)`
                      : isImage ? '0 4px 20px rgba(0,0,0,0.3)' : (isZone ? 'none' : '0 8px 32px rgba(0,0,0,0.4)'),
                    overflow: 'hidden',
                    transition: 'border 0.2s, box-shadow 0.2s',
                  }}>
                    {/* Header (drag handle) */}
                    <div
                      onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); setDraggingNode(node.id); setSelectedNode(node.id); }}
                      style={{
                        height: isImage ? '24px' : (isZone ? '36px' : '32px'),
                        background: isImage ? 'rgba(0,0,0,0.5)' : (isZone ? 'transparent' : `linear-gradient(180deg, rgba(255,255,255,0.05), transparent)`),
                        cursor: 'grab',
                        display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      <NodeIcon size={isZone ? 16 : 14} color={node.color} style={{ opacity: isZone ? 0.6 : 0.8 }} />
                      {!isImage ? (
                        <input
                          value={node.title}
                          onChange={e => updateNode(node.id, { title: e.target.value })}
                          onMouseDown={e => e.stopPropagation()}
                          style={{ 
                            background: 'transparent', border: 'none', 
                            color: isZone ? node.color : '#f8fafc', 
                            fontWeight: isZone ? 700 : 600, 
                            fontSize: isZone ? '16px' : '13px', 
                            flex: 1, outline: 'none', cursor: 'text',
                            textShadow: isZone ? `0 2px 10px rgba(0,0,0,0.5)` : 'none'
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.title}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                      {isImage ? (
                        <img
                          src={node.imagePath}
                          alt={node.title}
                          draggable={false}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', display: 'block' }}
                        />
                      ) : node.type === 'md' ? (
                        <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '11px', color: TYPE_CONFIG.md.color, fontFamily: 'var(--font-mono)', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📄 {node.filePath}
                          </div>
                          <textarea
                            value={node.description}
                            onChange={e => updateNode(node.id, { description: e.target.value })}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="Anotações..."
                            style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', resize: 'none', outline: 'none', fontSize: '13px', lineHeight: 1.5 }}
                          />
                        </div>
                      ) : !isZone ? (
                        <textarea
                          value={node.description}
                          onChange={e => updateNode(node.id, { description: e.target.value })}
                          onMouseDown={e => e.stopPropagation()}
                          placeholder={node.type === 'wiki' ? 'Duplo clique para abrir na Wiki...' : 'Anotações...'}
                          style={{
                            width: '100%', height: '100%', background: 'transparent', border: 'none',
                            color: '#e2e8f0', resize: 'none', outline: 'none',
                            fontSize: node.type === 'text' ? '15px' : '13px',
                            padding: '0 12px 12px 12px', boxSizing: 'border-box', lineHeight: 1.6,
                            fontFamily: 'var(--font-body)',
                          }}
                        />
                      ) : null}
                    </div>
                  </div>{/* end inner card */}

                  {/* Resize handle */}
                  <div
                    onMouseDown={e => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setResizingNode({ id: node.id, startX: e.clientX, startY: e.clientY, startW: node.width, startH: node.height });
                    }}
                    style={{
                      position: 'absolute', bottom: 4, right: 4,
                      width: '20px', height: '20px', cursor: 'nwse-resize', zIndex: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Redimensionar"
                    className="cw-resize-handle"
                  >
                    <Move size={12} color="rgba(255,255,255,0.2)" />
                  </div>

                  {/* Connector OUT */}
                  {!isZone && (
                    <div
                      onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); setDrawingEdgeFrom(node.id); }}
                      className="cw-connector"
                      title="Arrastar para conectar"
                      style={{
                        position: 'absolute', right: '-12px', top: 'calc(50% - 10px)',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: node.color, cursor: 'crosshair',
                        border: '4px solid #0f172a', zIndex: 25,
                        boxShadow: `0 0 10px ${node.color}88`
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Minimap (Simplified) */}
          <div style={{
            position: 'absolute', bottom: '24px', left: '24px',
            width: '180px', height: '120px', background: 'rgba(10,15,30,0.8)',
            backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', zIndex: 100, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', pointerEvents: 'none'
          }}>
            <div style={{ position: 'absolute', top: '6px', left: '10px', fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>MINIMAPA</div>
            <div style={{ position: 'relative', width: '100%', height: '100%', transform: 'scale(0.04) translate(800px, 800px)' }}>
              {board.nodes.map(n => (
                <div key={`mini-${n.id}`} style={{
                  position: 'absolute', left: n.x, top: n.y, width: n.width, height: n.height,
                  background: n.type === 'zone' ? `${n.color}44` : n.color,
                  borderRadius: n.type === 'zone' ? '24px' : '12px',
                  border: n.type === 'zone' ? `10px solid ${n.color}` : 'none'
                }} />
              ))}
            </div>
          </div>

          {/* Context Menu */}
          {contextMenu && (
            <div
              style={{
                position: 'fixed', left: contextMenu.x, top: contextMenu.y,
                background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
                padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
                zIndex: 999999, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', minWidth: '150px'
              }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: '10px', color: '#64748b', padding: '4px 8px', fontWeight: 600 }}>AÇÕES DO NÓ</div>
              <button className="cw-ctx-btn" onClick={() => { deleteNode(contextMenu.nodeId); }}>
                <Trash2 size={14} color="#ef4444" /> Excluir Nó
              </button>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
              <div style={{ fontSize: '10px', color: '#64748b', padding: '4px 8px', fontWeight: 600 }}>MUDAR COR</div>
              <div style={{ display: 'flex', gap: '6px', padding: '4px 8px', flexWrap: 'wrap' }}>
                {['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#cbd5e1'].map(c => (
                  <button key={c} onClick={() => { updateNode(contextMenu.nodeId, { color: c }); setContextMenu(null); }}
                    style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                ))}
              </div>
            </div>
          )}

          {/* Snap indicator */}
          {snapEnabled && (
            <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', color: '#06b6d4', pointerEvents: 'none', backdropFilter: 'blur(8px)' }}>
              ⊞ Snap-to-Grid Ativado
            </div>
          )}
        </div>

        {/* FLOATING ACTION BAR (FAB) */}
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 100
        }}>
          <button className="cw-fab-btn" title="Novo Personagem" onClick={() => addNode('character')}><User size={16} color={TYPE_CONFIG.character.color} /></button>
          <button className="cw-fab-btn" title="Novo Local" onClick={() => addNode('location')}><MapPin size={16} color={TYPE_CONFIG.location.color} /></button>
          <button className="cw-fab-btn" title="Novo Evento" onClick={() => addNode('event')}><Calendar size={16} color={TYPE_CONFIG.event.color} /></button>
          <button className="cw-fab-btn" title="Nova Nota" onClick={() => addNode('note')}><FileText size={16} color={TYPE_CONFIG.note.color} /></button>
          <button className="cw-fab-btn" title="Nova Região/Zona" onClick={() => addNode('zone')}><Box size={16} color={TYPE_CONFIG.zone.color} /></button>
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          
          <button className="cw-fab-btn" title="Importar Wiki .md" onClick={() => setShowMdModal(true)}><FilePlus size={16} color={TYPE_CONFIG.md.color} /></button>
          <button className="cw-fab-btn" title="Importar Imagem" onClick={() => fileInputRef.current?.click()}><ImageIcon size={16} color={TYPE_CONFIG.image.color} /></button>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          
          <div style={{ position: 'relative' }}>
            <button className="cw-fab-btn" title="Cor de Fundo" onClick={() => setShowBgPicker(v => !v)}>
              <Palette size={16} color="#cbd5e1" />
            </button>
            {showBgPicker && (
              <div style={{
                position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)', zIndex: 999,
                background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>COR DE FUNDO</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {BG_PRESETS.map(p => (
                    <button key={p.value} title={p.label} onClick={() => setBoard(b => ({ ...b, bgColor: p.value }))}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', background: p.value, border: board.bgColor === p.value ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Fundo livre:</span>
                  <input
                    ref={customColorRef}
                    type="color"
                    defaultValue="#020617"
                    style={{ width: '32px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                    onChange={e => setBoard(b => ({ ...b, bgColor: e.target.value }))}
                  />
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>COR DO GRID</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['rgba(255,255,255,0.04)', 'rgba(6,182,212,0.15)', 'rgba(16,185,129,0.15)', 'rgba(239,68,68,0.15)'].map(c => (
                    <button key={c} title="Grid" onClick={() => setBoard(b => ({ ...b, gridColor: c }))}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', background: c, border: (board.gridColor || 'rgba(255,255,255,0.04)') === c ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Grid livre:</span>
                  <input
                    type="color"
                    defaultValue="#06b6d4"
                    style={{ width: '32px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                    onChange={e => {
                      // Converte hex pra rgba com opacidade 0.15
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1,3), 16);
                      const g = parseInt(hex.slice(3,5), 16);
                      const b = parseInt(hex.slice(5,7), 16);
                      setBoard(bd => ({ ...bd, gridColor: `rgba(${r},${g},${b},0.15)` }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <button className={`cw-fab-btn ${snapEnabled ? 'active' : ''}`} title="Snap to Grid" onClick={() => setSnapEnabled(v => !v)}>
            <Grid size={16} color={snapEnabled ? '#06b6d4' : '#64748b'} />
          </button>
          <button className="cw-fab-btn" title="Centralizar Visão" onClick={centerCanvas}><Maximize size={16} color="#64748b" /></button>
          
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          <input
            value={board.name}
            onChange={e => setBoard(b => ({ ...b, name: e.target.value.replace(/[^a-zA-Z0-9_\-\s]/g, '') }))}
            placeholder="Nome do Quadro"
            style={{ 
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', 
              padding: '6px 12px', borderRadius: '12px', width: '140px', fontSize: '13px', outline: 'none' 
            }}
          />

          <button className="cw-fab-btn save-btn" title="Salvar Quadro" onClick={handleSave}>
            <Save size={16} /> <span style={{ fontSize: '13px', fontWeight: 600 }}>Salvar</span>
          </button>

          <button 
            className="cw-fab-btn" 
            title="Novo Quadro em Branco" 
            onClick={() => setBoard({ id: `board-${Date.now()}`, name: 'Novo_Quadro', zoom: 1, offsetX: 0, offsetY: 0, bgColor: BG_PRESETS[0].value, nodes: [] })}
          >
            <FilePlus size={16} color="#10b981" />
          </button>

          <div style={{ position: 'relative' }}>
            <button className="cw-fab-btn load-btn" title="Carregar Quadros" onClick={() => setShowLoadPicker(v => !v)}>
              <FolderOpen size={16} /> <span style={{ fontSize: '13px', fontWeight: 600 }}>Abrir</span>
            </button>
            {showLoadPicker && (
              <div style={{
                position: 'absolute', bottom: '120%', right: '0', zIndex: 999,
                background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxHeight: '300px', overflowY: 'auto'
              }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, paddingBottom: '8px', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>MEUS QUADROS MENTAIS</span>
                {availableMaps.length === 0 && <span style={{ fontSize: '12px', color: '#94a3b8', padding: '8px 0' }}>Nenhum mapa encontrado.</span>}
                {availableMaps.map(m => (
                  <button 
                    key={m.path}
                    onClick={() => handleLoad(m.path, true)}
                    style={{ 
                      background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '13px', 
                      textAlign: 'left', padding: '8px', borderRadius: '6px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <FolderOpen size={14} color="#3b82f6" />
                    {m.path.replace('MapasMentais/', '').replace('.md', '')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .cw-fab-btn {
          background: rgba(255,255,255,0.03); border: 1px solid transparent;
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; alignItems: center; justify-content: center;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cw-fab-btn:hover {
          background: rgba(255,255,255,0.1); transform: translateY(-2px);
          border-color: rgba(255,255,255,0.2);
        }
        .cw-fab-btn.active {
          background: rgba(6,182,212,0.15); border-color: rgba(6,182,212,0.3);
        }
        .cw-fab-btn.save-btn {
          width: auto; padding: 0 16px; border-radius: 18px; gap: 8px;
          background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);
        }
        .cw-fab-btn.save-btn:hover {
          background: rgba(16,185,129,0.25); border-color: #10b981; color: white;
        }

        .cw-fab-btn.load-btn {
          width: auto; padding: 0 16px; border-radius: 18px; gap: 8px;
          background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3);
        }
        .cw-fab-btn.load-btn:hover {
          background: rgba(59,130,246,0.25); border-color: #3b82f6; color: white;
        }

        .cw-ctx-btn {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: transparent; border: none; color: #e2e8f0; font-size: 13px;
          border-radius: 6px; cursor: pointer; text-align: left; transition: background 0.1s;
        }
        .cw-ctx-btn:hover { background: rgba(255,255,255,0.1); }

        .cw-resize-handle { opacity: 0; transition: opacity 0.2s; }
        .cw-node:hover .cw-resize-handle { opacity: 1; }

        .cw-connector { transition: transform 0.2s, opacity 0.2s; opacity: 0; }
        .cw-node:hover .cw-connector { opacity: 1; }
        .cw-connector:hover { transform: scale(1.4); }

        .cw-edge { transition: stroke 0.2s; }
        .cw-edge:hover { stroke: #ef4444 !important; marker-end: url(#arrowhead-hover) !important; }
      `}</style>
    </DraggableWindow>
  );
};
