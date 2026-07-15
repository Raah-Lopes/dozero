import React, { useState, useEffect, useRef } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { state } from '../../../services/yjs';
import { Plus, Trash2, Link, X } from 'lucide-react';

interface BoardNode {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  color?: string;
}

interface BoardConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export const ConspiracyBoardWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);

  // Load from Yjs
  useEffect(() => {
    const observer = () => {
      const data = state.conspiracy.get('board') as { nodes: BoardNode[], connections: BoardConnection[] } || { nodes: [], connections: [] };
      setNodes(data.nodes || []);
      setConnections(data.connections || []);
    };
    state.conspiracy.observe(observer);
    observer(); // initial load
    return () => state.conspiracy.unobserve(observer);
  }, []);

  const saveBoard = (newNodes: BoardNode[], newConns: BoardConnection[]) => {
    state.conspiracy.set('board', { nodes: newNodes, connections: newConns });
  };

  const addNode = () => {
    const newNode: BoardNode = {
      id: `node_${Date.now()}`,
      x: 100,
      y: 100,
      title: 'Nova Pista',
      content: 'Detalhes...',
      color: '#ef4444' // Red pin
    };
    saveBoard([...nodes, newNode], connections);
  };

  const updateNode = (id: string, updates: Partial<BoardNode>) => {
    const newNodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    saveBoard(newNodes, connections);
  };

  const deleteNode = (id: string) => {
    const newNodes = nodes.filter(n => n.id !== id);
    const newConns = connections.filter(c => c.sourceId !== id && c.targetId !== id);
    saveBoard(newNodes, newConns);
  };

  const handleNodeClick = (id: string) => {
    if (linkingFrom) {
      if (linkingFrom !== id) {
        const newConn: BoardConnection = {
          id: `conn_${Date.now()}`,
          sourceId: linkingFrom,
          targetId: id
        };
        saveBoard(nodes, [...connections, newConn]);
      }
      setLinkingFrom(null);
    }
  };

  return (
    <DraggableWindow id="conspiracyBoard" title="Mural de Investigação" initialX={100} initialY={100} width={800} height={600} onClose={onClose}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#111', borderRadius: '0 0 8px 8px' }}>
        
        {/* Toolbar */}
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px' }}>
          <button onClick={addNode} className="btn-icon theme-red" title="Adicionar Pista"><Plus size={16} /></button>
          {linkingFrom && (
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
              Selecione o alvo para conectar...
              <button onClick={() => setLinkingFrom(null)} style={{ background: 'transparent', border: 'none', color: '#fff', marginLeft: '8px', cursor: 'pointer' }}><X size={14}/></button>
            </div>
          )}
        </div>

        {/* Connections Layer (SVG) */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          {connections.map(c => {
            const src = nodes.find(n => n.id === c.sourceId);
            const tgt = nodes.find(n => n.id === c.targetId);
            if (!src || !tgt) return null;
            return (
              <line 
                key={c.id} 
                x1={src.x + 75} y1={src.y + 50} 
                x2={tgt.x + 75} y2={tgt.y + 50} 
                stroke="#ef4444" strokeWidth="3" strokeDasharray="5,5" opacity="0.6"
              />
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
          <div 
            key={node.id}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: 150,
              background: '#222',
              border: `2px solid ${node.color}`,
              borderRadius: '6px',
              padding: '8px',
              cursor: 'grab',
              zIndex: 5,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
            onMouseDown={(e) => {
              // Simple drag
              const startX = e.clientX;
              const startY = e.clientY;
              const initialX = node.x;
              const initialY = node.y;
              
              const onMouseMove = (moveE: MouseEvent) => {
                const dx = moveE.clientX - startX;
                const dy = moveE.clientY - startY;
                updateNode(node.id, { x: initialX + dx, y: initialY + dy });
              };
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <input 
                value={node.title} 
                onChange={(e) => updateNode(node.id, { title: e.target.value })}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', width: '100%' }}
                onMouseDown={e => e.stopPropagation()} // prevent drag
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setLinkingFrom(node.id)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }} onMouseDown={e => e.stopPropagation()}><Link size={14}/></button>
                <button onClick={() => deleteNode(node.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} onMouseDown={e => e.stopPropagation()}><Trash2 size={14}/></button>
              </div>
            </div>
            <textarea 
              value={node.content}
              onChange={(e) => updateNode(node.id, { content: e.target.value })}
              style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', border: 'none', color: '#ccc', resize: 'none', fontSize: '0.8rem', padding: '4px' }}
              onMouseDown={e => e.stopPropagation()}
            />
          </div>
        ))}

      </div>
    </DraggableWindow>
  );
}
