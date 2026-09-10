import React from 'react';

interface CodexSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
}

export default function CodexSearch({ query, onQueryChange }: CodexSearchProps) {
  return (
    <div className="p-2 border-b" style={{ borderColor: 'var(--dz-stone)' }}>
      <input
        type="text"
        placeholder="Buscar no Códice..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full rounded-sm px-2 py-1 text-sm"
        style={{
          background: 'var(--dz-graphite-3)',
          color: 'var(--dz-parchment-3)',
          border: '1px solid var(--dz-stone)',
        }}
      />
    </div>
  );
}
