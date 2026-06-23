import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import {
  Type, Image as ImageIcon, Save, Trash2,
  User, MapPin, Calendar, Link as LinkIcon, Book, FileText,
  ZoomIn, ZoomOut, Maximize, Grid, Palette, FilePlus, GripHorizontal, Move
} from 'lucide-react';
import { saveMarkdownContent, loadMarkdownFile, ensureWikiFolder } from '../../../utils/githubApi';
import { pushChatMessage } from '../../../store';

interface MapasMentaisWidgetProps {
  onClose: () => void;
}

export interface MindMapNode {
  id: string;
  type: 'text' | 'note' | 'character' | 'location' | 'event' | 'image' | 'link' | 'wiki' | 'md';
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
  links: string[];
}

export interface MindMapData {
  id: string;
  name: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  bgColor: string;
  nodes: MindMapNode[];
}

const GRID_SIZE = 40;

const BG_PRESETS = [
  { label: 'Preto', value: 'rgba(2, 6, 23, 0.98)' },
  { label: 'Azul Noite', value: 'rgba(7, 14, 38, 0.98)' },
  { label: 'Ardósia', value: 'rgba(15, 20, 30, 0.98)' },
  { label: 'Sépia', value: 'rgba(30, 20, 10, 0.98)' },
  { label: 'Floresta', value: 'rgba(5, 20, 12, 0.98)' },
  { label: 'Vinho', value: 'rgba(25, 5, 15, 0.98)' },
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

  const [isPanning, setIsPanning] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [resizingNode, setResizingNode] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showMdModal, setShowMdModal] = useState(false);
  const [mdPathInput, setMdPathInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customColorRef = useRef<HTMLInputElement>(null);

  // --- LOAD / SAVE ---
  const handleLoad = useCallback(async () => {
    try {
      const content = await loadMarkdownFile(`MapasMentais/Quadro_Principal.md`);
      if (content) {
        try {
          const parsed = JSON.parse(content);
          setBoard(prev => ({ ...prev, ...parsed }));
        } catch {
          console.error('Conteúdo não é JSON válido.');
        }
      }
    } catch {
      console.log('Nenhum mapa anterior encontrado.');
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
  }, []);

  const handleSave = async () => {
    try {
      await ensureWikiFolder('MapasMentais');
      await saveMarkdownContent(`MapasMentais/${board.name}.md`, JSON.stringify(board, null, 2));
      pushChatMessage('Painel de Investigação salvo na Wiki.', true, false);
    } catch {
      pushChatMessage('Erro ao salvar Painel.', false, true);
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
    setBoard(b => ({ ...b, zoom: Math.max(0.2, Math.min(b.zoom + delta, 3)) }));

  // --- NODES CRUD ---
  const addNode = (type: MindMapNode['type'], extraProps: Partial<MindMapNode> = {}) => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      type,
      x: (-board.offsetX + 160) / board.zoom,
      y: (-board.offsetY + 100) / board.zoom,
      width: type === 'image' ? 220 : (type === 'text' ? 200 : 240),
      height: type === 'image' ? 180 : (type === 'text' ? 90 : 130),
      title: type === 'md' ? 'Arquivo .md' : 'Nova Ideia',
      description: '',
      color: TYPE_CONFIG[type].color,
      links: [],
      ...extraProps,
    };
    setBoard(b => ({ ...b, nodes: [...b.nodes, newNode] }));
  };

  const deleteNode = (id: string) =>
    setBoard(b => ({
      ...b,
      nodes: b.nodes.filter(n => n.id !== id).map(n => ({ ...n, links: n.links.filter(l => l !== id) })),
    }));

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
      setBoard(b => ({
        ...b,
        nodes: b.nodes.map(n =>
          n.id === draggingNode
            ? { ...n, x: n.x + e.movementX / b.zoom, y: n.y + e.movementY / b.zoom }
            : n
        ),
      }));
      return;
    }
    if (resizingNode) {
      const dx = (e.clientX - resizingNode.startX) / board.zoom;
      const dy = (e.clientY - resizingNode.startY) / board.zoom;
      const newW = Math.max(120, resizingNode.startW + dx);
      const newH = Math.max(80, resizingNode.startH + dy);
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
    // Snap to grid on drag release
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
  };

  // --- IMAGE UPLOAD ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => addNode('image', { imagePath: ev.target?.result as string, title: file.name });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --- MD CARD ---
  const handleAddMdCard = () => {
    if (!mdPathInput.trim()) return;
    const path = mdPathInput.trim();
    addNode('md', {
      title: path.split('/').pop()?.replace('.md', '') || 'Arquivo',
      filePath: path,
      description: `📄 ${path}`,
    });
    setMdPathInput('');
    setShowMdModal(false);
  };

  // --- BEZIER ---
  const drawBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  const handleNodeDoubleClick = (node: MindMapNode) => {
    if ((node.type === 'wiki' || node.type === 'md') && node.filePath) {
      window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { filePath: node.filePath } }));
    }
  };

  return (
    <DraggableWindow
      title={`🕵️ Painel de Conspiração: ${board.name.replace(/_/g, ' ')}`}
      id="mapas-mentais-widget"
      onClose={onClose}
      width={1050}
      height={670}
      initialX={window.innerWidth / 2 - 525}
      initialY={window.innerHeight / 2 - 335}
      dragAnywhere={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: board.bgColor, fontFamily: 'var(--font-body)', color: '#f1f5f9', position: 'relative' }}>

        {/* TOOLBAR */}
        <div style={{ display: 'flex', gap: '5px', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginRight: '4px' }}>CARDS</span>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.character.border }} onClick={() => addNode('character')}><User size={14}/> NPC</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.location.border }} onClick={() => addNode('location')}><MapPin size={14}/> Local</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.event.border }} onClick={() => addNode('event')}><Calendar size={14}/> Evento</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.note.border }} onClick={() => addNode('note')}><FileText size={14}/> Nota</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.wiki.border }} onClick={() => addNode('wiki')}><Book size={14}/> Wiki</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.text.border }} onClick={() => addNode('text')}><Type size={14}/> Texto</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.md.border }} onClick={() => setShowMdModal(true)}><FilePlus size={14}/> .md</button>
          <button className="cw-btn" style={{ borderColor: TYPE_CONFIG.image.border }} onClick={() => fileInputRef.current?.click()}><ImageIcon size={14}/> Imagem</button>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

          <div style={{ flex: 1 }} />

          {/* Snap to Grid Toggle */}
          <button
            className={`cw-icon-btn ${snapEnabled ? 'cw-active' : ''}`}
            title={snapEnabled ? 'Snap: ON (clique para desligar)' : 'Snap: OFF (clique para ligar grid)'}
            onClick={() => setSnapEnabled(v => !v)}
            style={{ color: snapEnabled ? '#06b6d4' : undefined }}
          >
            <Grid size={16} />
          </button>

          {/* BG Color Picker */}
          <div style={{ position: 'relative' }}>
            <button className="cw-icon-btn" title="Cor de Fundo" onClick={() => setShowBgPicker(v => !v)}>
              <Palette size={16} />
            </button>
            {showBgPicker && (
              <div style={{
                position: 'absolute', top: '110%', right: 0, zIndex: 999,
                background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>COR DE FUNDO</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {BG_PRESETS.map(p => (
                    <button key={p.value} title={p.label} onClick={() => { setBoard(b => ({ ...b, bgColor: p.value })); setShowBgPicker(false); }}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', background: p.value, border: board.bgColor === p.value ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Custom:</span>
                  <input
                    ref={customColorRef}
                    type="color"
                    defaultValue="#020617"
                    style={{ width: '32px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                    onChange={e => setBoard(b => ({ ...b, bgColor: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '7px' }}>
            <button className="cw-icon-btn" onClick={() => changeZoom(-0.1)}><ZoomOut size={15} /></button>
            <button className="cw-icon-btn" title="Centralizar" onClick={centerCanvas}><Maximize size={15} /></button>
            <button className="cw-icon-btn" onClick={() => changeZoom(0.1)}><ZoomIn size={15} /></button>
            <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center', paddingLeft: '4px', minWidth: '32px' }}>{Math.round(board.zoom * 100)}%</span>
          </div>

          <button className="cw-btn" style={{ background: '#22c55e20', borderColor: '#22c55e', color: '#4ade80', marginLeft: '6px' }} onClick={handleSave}>
            <Save size={14}/> Salvar
          </button>
        </div>

        {/* MD CARD MODAL */}
        {showMdModal && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }} onClick={() => setShowMdModal(false)}>
            <div style={{
              background: 'rgba(15,23,42,0.99)', border: '1px solid rgba(6,182,212,0.4)',
              borderRadius: '12px', padding: '24px', minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '14px',
              boxShadow: '0 0 40px rgba(6,182,212,0.2)'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: 0, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilePlus size={18} /> Adicionar Card de Arquivo .md
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Cole o caminho relativo do arquivo na Wiki (ex: <code style={{ color: '#67e8f9' }}>wiki/npcs/Valdur.md</code>)
              </p>
              <input
                autoFocus
                value={mdPathInput}
                onChange={e => setMdPathInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMdCard(); if (e.key === 'Escape') setShowMdModal(false); }}
                placeholder="wiki/npcs/Valdur.md"
                style={{
                  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px',
                  padding: '10px 12px', color: '#f1f5f9', fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="cw-btn" onClick={() => setShowMdModal(false)} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                <button className="cw-btn" onClick={handleAddMdCard} style={{ background: 'rgba(6,182,212,0.2)', borderColor: '#06b6d4', color: '#67e8f9' }}>
                  Adicionar Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANVAS AREA */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isPanning ? 'grabbing' : (draggingNode || resizingNode ? 'grabbing' : 'default') }}
          onMouseDown={e => {
            setShowBgPicker(false);
            const target = e.target as HTMLElement;
            if (e.button === 0 && (target === containerRef.current || target.id === 'cw-inner-canvas' || target.id === 'cw-svg-layer')) {
              setIsPanning(true);
              setSelectedNode(null); // deselect when clicking empty canvas
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={e => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            setBoard(b => ({ ...b, zoom: Math.max(0.2, Math.min(b.zoom + delta, 3)) }));
          }}
        >
          {/* Dynamic grid background */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
            backgroundSize: `${GRID_SIZE * board.zoom}px ${GRID_SIZE * board.zoom}px`,
            backgroundImage: snapEnabled
              ? `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`
              : 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundPosition: `${board.offsetX}px ${board.offsetY}px`,
            transition: 'background-image 0.3s'
          }} />

          {/* Transform Layer */}
          <div id="cw-inner-canvas" style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transformOrigin: '0 0',
            transform: `translate(${board.offsetX}px, ${board.offsetY}px) scale(${board.zoom})`,
          }}>
            {/* SVG edges layer */}
            <svg id="cw-svg-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.35)" />
                </marker>
              </defs>

              {drawingEdgeFrom && (() => {
                const src = board.nodes.find(n => n.id === drawingEdgeFrom);
                if (!src) return null;
                return (
                  <path
                    d={drawBezier(src.x + src.width, src.y + src.height / 2, mousePos.x, mousePos.y)}
                    fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="6,4"
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
                      <path d={drawBezier(startX, startY, endX, endY)} fill="none" stroke="transparent" strokeWidth="14" />
                      <path d={drawBezier(startX, startY, endX, endY)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" markerEnd="url(#arrowhead)" className="cw-edge" />
                    </g>
                  );
                })
              )}
            </svg>

            {/* HTML Nodes */}
            {board.nodes.map(node => {
              const NodeIcon = TYPE_CONFIG[node.type].icon;
              const isImage = node.type === 'image';

              const isSelected = selectedNode === node.id;

              return (
                // OUTER: overflow:visible so connectors outside card boundary remain clickable
                <div
                  key={node.id}
                  className="cw-node"
                  onDoubleClick={() => handleNodeDoubleClick(node)}
                  onMouseDown={e => {
                    e.stopPropagation();
                    setSelectedNode(node.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: node.x, top: node.y,
                    width: node.width, height: node.height,
                    overflow: 'visible',
                    userSelect: 'none',
                  }}
                >
                  {/* Floating DELETE button above card when selected */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: '-36px', left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', gap: '6px', alignItems: 'center',
                      background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(239,68,68,0.4)',
                      borderRadius: '20px', padding: '4px 10px', zIndex: 50,
                      boxShadow: '0 4px 20px rgba(239,68,68,0.25)',
                      whiteSpace: 'nowrap',
                    }}>
                      <Trash2 size={13} color="#ef4444" />
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => { deleteNode(node.id); setSelectedNode(null); }}
                        style={{
                          background: 'transparent', border: 'none', color: '#fca5a5',
                          fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: 600,
                        }}
                      >
                        Excluir card
                      </button>
                    </div>
                  )}

                  {/* INNER CARD: overflow:hidden for content clipping only */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: isImage ? 'transparent' : 'rgba(10, 18, 38, 0.97)',
                    border: isSelected
                      ? `1.5px solid ${TYPE_CONFIG[node.type].border}`
                      : isImage ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${TYPE_CONFIG[node.type].border}55`,
                    borderRadius: '9px',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${TYPE_CONFIG[node.type].border}66, 0 8px 30px rgba(0,0,0,0.6)`
                      : isImage ? '0 4px 20px rgba(0,0,0,0.4)' : `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${TYPE_CONFIG[node.type].border}11`,
                    overflow: 'hidden',
                  }}>
                  {/* Header (drag handle) — ALL types including image */}
                  <div
                    onMouseDown={e => { e.stopPropagation(); setDraggingNode(node.id); }}
                    style={{
                      height: isImage ? '26px' : '30px',
                      background: isImage ? 'rgba(0,0,0,0.5)' : `linear-gradient(135deg, ${TYPE_CONFIG[node.type].color}22, rgba(0,0,0,0.4))`,
                      cursor: 'grab',
                      borderBottom: `1px solid ${TYPE_CONFIG[node.type].border}33`,
                      display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px',
                      borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <GripHorizontal size={12} color={TYPE_CONFIG[node.type].color} style={{ opacity: 0.6, flexShrink: 0 }} />
                    <NodeIcon size={13} color={TYPE_CONFIG[node.type].color} style={{ flexShrink: 0 }} />
                    {!isImage ? (
                      <input
                        value={node.title}
                        onChange={e => updateNode(node.id, { title: e.target.value })}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontWeight: 600, fontSize: '12px', flex: 1, outline: 'none', cursor: 'text' }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {node.title}
                      </span>
                    )}
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => deleteNode(node.id)}
                      className="cw-icon-btn"
                      style={{ padding: '2px', flexShrink: 0 }}
                    >
                      <Trash2 size={12} color="#ef4444" />
                    </button>
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
                      <div style={{ padding: '8px', height: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '10px', color: TYPE_CONFIG.md.color, fontFamily: 'var(--font-mono)', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📄 {node.filePath}
                        </div>
                        <textarea
                          value={node.description}
                          onChange={e => updateNode(node.id, { description: e.target.value })}
                          onMouseDown={e => e.stopPropagation()}
                          placeholder="Anotações sobre este arquivo..."
                          style={{ flex: 1, background: 'transparent', border: 'none', color: '#cbd5e1', resize: 'none', outline: 'none', fontSize: '12px', lineHeight: 1.5 }}
                        />
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => node.filePath && window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { filePath: node.filePath } }))}
                          style={{ background: `${TYPE_CONFIG.md.color}22`, border: `1px solid ${TYPE_CONFIG.md.border}55`, borderRadius: '5px', color: TYPE_CONFIG.md.color, fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}
                        >
                          Abrir na Wiki →
                        </button>
                      </div>
                    ) : (
                      <textarea
                        value={node.description}
                        onChange={e => updateNode(node.id, { description: e.target.value })}
                        onMouseDown={e => e.stopPropagation()}
                        placeholder={node.type === 'wiki' ? 'Duplo clique para abrir na Wiki...' : 'Anotações...'}
                        style={{
                          width: '100%', height: '100%', background: 'transparent', border: 'none',
                          color: '#cbd5e1', resize: 'none', outline: 'none',
                          fontSize: node.type === 'text' ? '14px' : '13px',
                          padding: '8px', boxSizing: 'border-box', lineHeight: 1.5,
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                    )}
                  </div>
                  </div>{/* end inner card */}

                  {/* Resize handle — on OUTER wrapper so not clipped */}
                  <div
                    onMouseDown={e => {
                      e.stopPropagation();
                      setResizingNode({ id: node.id, startX: e.clientX, startY: e.clientY, startW: node.width, startH: node.height });
                    }}
                    style={{
                      position: 'absolute', bottom: -3, right: -3,
                      width: '18px', height: '18px', cursor: 'nwse-resize', zIndex: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Redimensionar"
                    className="cw-resize-handle"
                  >
                    <Move size={10} color="rgba(255,255,255,0.35)" />
                  </div>

                  {/* Connector OUT — on OUTER wrapper, fully visible */}
                  <div
                    onMouseDown={e => { e.stopPropagation(); setDrawingEdgeFrom(node.id); }}
                    className="cw-connector"
                    title="Arrastar para conectar"
                    style={{
                      position: 'absolute', right: '-10px', top: 'calc(50% - 9px)',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#a855f7', cursor: 'crosshair',
                      border: '3px solid #0f172a', zIndex: 25,
                    }}
                  />

                  {/* Connector IN — wide invisible drop zone on OUTER wrapper */}
                  <div
                    onMouseUp={e => {
                      e.stopPropagation();
                      if (drawingEdgeFrom && drawingEdgeFrom !== node.id) {
                        setBoard(b => ({
                          ...b,
                          nodes: b.nodes.map(n =>
                            n.id === drawingEdgeFrom ? { ...n, links: [...new Set([...n.links, node.id])] } : n
                          ),
                        }));
                        setDrawingEdgeFrom(null);
                      }
                    }}
                    style={{ position: 'absolute', left: '-14px', top: 0, bottom: 0, width: '28px', zIndex: 15 }}
                  />
                </div>
              );
            })}
          </div>

          {/* Snap indicator */}
          {snapEnabled && (
            <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#06b6d4', pointerEvents: 'none' }}>
              ⊞ Snap-to-Grid: ON ({GRID_SIZE}px)
            </div>
          )}
        </div>
      </div>

      <style>{`
        .cw-btn {
          display: flex; align-items: center; gap: 5px; padding: 5px 10px;
          border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9;
          font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s;
          background: rgba(0,0,0,0.35); white-space: nowrap;
        }
        .cw-btn:hover { filter: brightness(1.4); transform: translateY(-1px); background: rgba(255,255,255,0.08); }

        .cw-icon-btn {
          background: transparent; border: none; cursor: pointer; opacity: 0.55;
          transition: opacity 0.15s; display: flex; align-items: center;
          justify-content: center; padding: 5px; color: #f1f5f9; border-radius: 5px;
        }
        .cw-icon-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
        .cw-icon-btn.cw-active { opacity: 1; background: rgba(6,182,212,0.15); color: #06b6d4; }

        .cw-node { transition: box-shadow 0.2s; }
        .cw-node:hover { box-shadow: 0 6px 30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.15) !important; z-index: 20; }

        .cw-connector { transition: transform 0.2s, opacity 0.2s; opacity: 0; }
        .cw-node:hover .cw-connector { opacity: 1; }
        .cw-connector:hover { transform: scale(1.4); }

        .cw-resize-handle { opacity: 0; transition: opacity 0.2s; }
        .cw-node:hover .cw-resize-handle { opacity: 1; }

        .cw-edge { transition: stroke 0.2s, stroke-width 0.2s; }
        .cw-edge:hover { stroke: #ef4444 !important; stroke-width: 5 !important; }
      `}</style>
    </DraggableWindow>
  );
};
