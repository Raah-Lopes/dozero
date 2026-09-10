import type { MapAnnotation } from "../types";

type Point = { x: number; y: number };
export type RouteTerrain = {
  elevation: Float32Array;
  size: number;
  water: number;
  width: number;
  height: number;
};
export function routeElevation(p: Point, terrain: RouteTerrain) {
  const s = terrain.size,
    x = Math.max(0, Math.min(s - 1, p.x)),
    y = Math.max(0, Math.min(s - 1, p.y));
  const ix = Math.min(s - 2, Math.floor(x)),
    iy = Math.min(s - 2, Math.floor(y)),
    fx = x - ix,
    fy = y - iy;
  const at = (dx: number, dy: number) =>
    terrain.elevation[(iy + dy) * s + ix + dx];
  return (
    (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) +
    (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy
  );
}
/** Exact minimum of the bilinear height field along every crossed grid cell. */
export function segmentOnLand(
  a: Point,
  b: Point,
  terrain: RouteTerrain,
  minimum = terrain.water,
) {
  if (
    [a, b].some(
      (p) =>
        p.x < 0 || p.y < 0 || p.x > terrain.size - 1 || p.y > terrain.size - 1,
    )
  )
    return false;
  const times = [0, 1],
    dx = b.x - a.x,
    dy = b.y - a.y;
  for (const axis of ["x", "y"] as const) {
    const delta = b[axis] - a[axis];
    if (delta === 0) continue;
    for (
      let edge = Math.floor(Math.min(a[axis], b[axis])) + 1;
      edge < Math.max(a[axis], b[axis]);
      edge++
    )
      times.push((edge - a[axis]) / delta);
  }
  times.sort((x, y) => x - y);
  const height = (t: number) =>
    routeElevation({ x: a.x + dx * t, y: a.y + dy * t }, terrain);
  for (let i = 1; i < times.length; i++) {
    const t0 = times[i - 1],
      t1 = times[i],
      z0 = height(t0),
      z1 = height(t1),
      zm = height((t0 + t1) / 2);
    if (Math.min(z0, z1, zm) < minimum) return false;
    const q = 2 * (z0 + z1 - 2 * zm),
      linear = z1 - z0 - q;
    if (q > 0) {
      const t = -linear / (2 * q);
      if (t > 0 && t < 1 && q * t * t + linear * t + z0 < minimum) return false;
    }
  }
  return true;
}

export function naturalRoad(
  from: number,
  to: number,
  terrain: RouteTerrain,
): number[] | null {
  const { size: s, elevation, water, width, height } = terrain;
  const costs = new Float64Array(s * s).fill(Infinity),
    parents = new Int32Array(s * s).fill(-1);
  const sx = width / Math.min(width, height),
    sy = height / Math.min(width, height);
  const targetX = to % s,
    targetY = Math.floor(to / s);
  type Node = { id: number; cost: number; score: number };
  const heap: Node[] = [];
  const push = (node: Node) => {
    heap.push(node);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p].score <= node.score) break;
      heap[k] = heap[p];
      k = p;
    }
    heap[k] = node;
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let k = 0;
      while (k * 2 + 1 < heap.length) {
        let child = k * 2 + 1;
        if (
          child + 1 < heap.length &&
          heap[child + 1].score < heap[child].score
        )
          child++;
        if (heap[child].score >= last.score) break;
        heap[k] = heap[child];
        k = child;
      }
      heap[k] = last;
    }
    return first;
  };
  costs[from] = 0;
  parents[from] = from;
  push({ id: from, cost: 0, score: 0 });
  while (heap.length) {
    const node = pop();
    if (node.cost !== costs[node.id]) continue;
    if (node.id === to) {
      const path = [to];
      while (path[path.length - 1] !== from)
        path.push(parents[path[path.length - 1]]);
      return path.reverse();
    }
    const x = node.id % s,
      y = Math.floor(node.id / s);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
        const next = ny * s + nx;
        if (elevation[next] <= water + 0.02) continue;
        // Both adjacent cardinal cells must be dry before crossing a corner.
        if (
          dx &&
          dy &&
          (elevation[y * s + nx] <= water + 0.02 ||
            elevation[ny * s + x] <= water + 0.02)
        )
          continue;
        const cost =
          node.cost +
          Math.hypot(dx * sx, dy * sy) *
            (1 +
              Math.abs(elevation[next] - elevation[node.id]) * 20 +
              Math.max(0, elevation[next] - 0.6) * 0.7);
        if (cost >= costs[next]) continue;
        costs[next] = cost;
        parents[next] = node.id;
        push({
          id: next,
          cost,
          score: cost + Math.hypot((nx - targetX) * sx, (ny - targetY) * sy),
        });
      }
  }
  return null;
}

const key = (p: Point) => `${p.x.toFixed(7)}:${p.y.toFixed(7)}`;
const same = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-8;
const mix = (a: Point, b: Point, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export function smoothRoutes(
  annotations: MapAnnotation[],
  terrain: RouteTerrain,
): MapAnnotation[] {
  const factor = (terrain.size - 1) / 100;
  const routes = annotations.filter(
    (a) => a.type === "path" && a.points && a.points.length > 1,
  );
  const protectedPoints = new Set<string>(),
    adjacency = new Map<string, Set<string>>();
  // Keep true junctions, starts and mouths fixed, including shared river tails.
  for (const route of routes) {
    const points = route.points!,
      group = route.text === "Rio" ? "river:" : "road:";
    protectedPoints.add(group + key(points[0]));
    protectedPoints.add(group + key(points[points.length - 1]));
    for (let i = 0; i < points.length; i++) {
      const id = group + key(points[i]),
        edges = adjacency.get(id) || new Set<string>();
      if (i) edges.add(key(points[i - 1]));
      if (i + 1 < points.length) edges.add(key(points[i + 1]));
      adjacency.set(id, edges);
    }
  }
  adjacency.forEach((edges, id) => {
    if (edges.size > 2) protectedPoints.add(id);
  });
  return annotations.map((route) => {
    if (!routes.includes(route)) return route;
    const river = route.text === "Rio",
      group = river ? "river:" : "road:";
    const raw = route.points!,
      locked = (p: Point) => protectedPoints.has(group + key(p));
    // Discard only collinear interior points; junctions always survive.
    const points = raw
      .filter((p, i) => {
        if (!i || i === raw.length - 1 || locked(p)) return true;
        const a = raw[i - 1],
          b = raw[i + 1];
        return (
          Math.abs((p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x)) >
            1e-10 || (p.x - a.x) * (b.x - p.x) + (p.y - a.y) * (b.y - p.y) < 0
        );
      })
      .map((p) => ({ x: p.x * factor, y: p.y * factor }));
    const output: Point[] = [points[0]];
    const append = (p: Point) => {
      if (!same(output[output.length - 1], p)) output.push(p);
    };
    for (let i = 1; i < points.length - 1; i++) {
      if (output.length > 95000) return route;
      const a = points[i - 1],
        b = points[i],
        c = points[i + 1];
      const original = { x: b.x / factor, y: b.y / factor };
      if (
        locked(original) ||
        (river &&
          [a, b, c].some((p) => routeElevation(p, terrain) <= terrain.water))
      ) {
        append(b);
        continue;
      }
      const ab = Math.hypot(b.x - a.x, b.y - a.y),
        bc = Math.hypot(c.x - b.x, c.y - b.y);
      const distance = Math.min(river ? 1.2 : 1.8, ab * 0.35, bc * 0.35);
      if (distance < 1e-8) {
        append(b);
        continue;
      }
      const enter = mix(b, a, distance / ab),
        leave = mix(b, c, distance / bc);
      const steps = Math.min(
        40,
        Math.max(
          6,
          Math.ceil(
            (distance * Math.max(terrain.width, terrain.height)) /
              (terrain.size - 1) /
              3,
          ),
        ),
      );
      const curve = [enter];
      for (let j = 1; j <= steps; j++) {
        const t = j / steps;
        curve.push(mix(mix(enter, b, t), mix(b, leave, t), t));
      }
      const safe = curve.every(
        (p, j) =>
          !j ||
          segmentOnLand(
            curve[j - 1],
            p,
            terrain,
            terrain.water + (river ? 0 : 0.001),
          ),
      );
      if (safe) curve.forEach(append);
      else append(b);
    }
    append(points[points.length - 1]);
    const originals = new Map(raw.map((p) => [key(p), p]));
    const converted = output.map((p) => {
      const v = { x: p.x / factor, y: p.y / factor };
      return { ...(originals.get(key(v)) || v) };
    });
    // Restore exact saved endpoint coordinates (avoid round-trip float drift).
    converted[0] = { ...raw[0] };
    converted[converted.length - 1] = { ...raw[raw.length - 1] };
    return { ...route, points: converted };
  });
}
