export interface GraphEdge {
  source: string;
  target: string;
}

export function shortestPath(edges: GraphEdge[], start: string, end: string) {
  if (!start || !end) return [];
  if (start === end) return [start];

  const neighbors = new Map<string, string[]>();
  edges.forEach(({ source, target }) => {
    neighbors.set(source, [...(neighbors.get(source) || []), target]);
    neighbors.set(target, [...(neighbors.get(target) || []), source]);
  });

  const queue = [start];
  const previous = new Map<string, string | null>([[start, null]]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const neighbor of neighbors.get(current) || []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, current);
      if (neighbor === end) {
        const path = [end];
        let cursor: string | null = current;
        while (cursor) {
          path.unshift(cursor);
          cursor = previous.get(cursor) ?? null;
        }
        return path;
      }
      queue.push(neighbor);
    }
  }
  return [];
}
