import React from 'react';
import type { MapLocation, MapAnnotation } from "../types";
import CodexToolbar from "./CodexToolbar";
import CodexSearch from "./CodexSearch";

interface CodexHeaderProps {
  onAddLocation: (location: MapLocation) => void;
  onAddAnnotation?: (annotation: MapAnnotation) => void;
  onExport: () => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export default function CodexHeader({
  onAddLocation,
  onAddAnnotation,
  onExport,
  query,
  onQueryChange,
}: CodexHeaderProps) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--dz-stone)' }}>
      <CodexToolbar
        onAddLocation={onAddLocation}
        onAddAnnotation={onAddAnnotation}
        onExport={onExport}
      />
      <CodexSearch query={query} onQueryChange={onQueryChange} />
    </div>
  );
}
