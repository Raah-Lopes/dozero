import { describe, expect, it } from 'vitest';
import { shortestPath } from './graphPaths';

describe('shortestPath', () => {
  it('finds the shortest undirected route and reports disconnected nodes', () => {
    const edges = [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'a', target: 'd' }, { source: 'd', target: 'c' }];
    expect(shortestPath(edges, 'a', 'c')).toHaveLength(3);
    expect(shortestPath(edges, 'a', 'missing')).toEqual([]);
  });
});
