import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sanitizeHTML } from '../utils/sanitizer';
import { CombatLogEntry } from '../utils/types';

export const CombatLog: React.FC = () => {
  const { combatLog } = useStore();
  const endRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [combatLog, autoScroll]);

  const getEntryColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'damage': return 'text-red-400';
      case 'heal': return 'text-green-400';
      case 'roll': return 'text-blue-400';
      case 'turn': return 'text-yellow-400 font-bold';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <span className="font-bold text-gray-200">Registro de Combate</span>
        <label className="flex items-center text-xs text-gray-400 cursor-pointer">
          <input 
            type="checkbox" 
            checked={autoScroll} 
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="mr-2"
          />
          Auto-scroll
        </label>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
        {combatLog.map((entry: CombatLogEntry) => (
          <div key={entry.id} className={`border-l-2 pl-2 py-1 ${getEntryColor(entry.type)} border-opacity-50 ${
            entry.type === 'damage' ? 'border-red-500' : 
            entry.type === 'heal' ? 'border-green-500' : 
            entry.type === 'roll' ? 'border-blue-500' : 'border-gray-500'
          }`}>
            <span className="text-xs opacity-50 mr-2">
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {/* SEGURANÇA: Sanitização do HTML antes de renderizar */}
            <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(entry.message) }} />
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
