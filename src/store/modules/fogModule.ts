/**
 * CENTRALIZED FOG OF WAR MANAGEMENT MODULE
 * 
 * Single source of truth for all fog of war operations.
 * Handles fog geometry (circle, square, polygon, path) and visibility calculations.
 * 
 * Usage:
 *   import { FogOfWar } from '../../store/modules/fogModule';
 *   
 *   FogOfWar.getOps()
 *   FogOfWar.createCircle(x, y, r, 'reveal')
 *   FogOfWar.removeOp(opId)
 *   FogOfWar.clear()
 */

import { state } from '../../services/yjs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Circular fog operation
 * Used for token vision radius or area reveals
 */
export interface FogGeomCircle {
  x: number;
  y: number;
  r: number;
}

/**
 * Square/rectangular fog operation
 */
export interface FogGeomSquare {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Polygon fog operation
 * Useful for irregular room shapes
 */
export interface FogGeomPolygon {
  points: { x: number; y: number }[];
}

/**
 * Path fog operation (for freehand drawing)
 */
export interface FogGeomPath {
  points: { x: number; y: number }[];
  width: number;
}

/**
 * Union type for all supported geometries
 */
export type FogGeometry = FogGeomCircle | FogGeomSquare | FogGeomPolygon | FogGeomPath;

/**
 * Fog operation type
 */
export type FogOpType = 'circle' | 'square' | 'polygon' | 'path';

/**
 * Fog operation mode
 * - 'reveal': Permanently removes fog (shows area to all players)
 * - 'hide': Adds invisible wall (blocks vision but invisible to GM for debugging)
 */
export type FogOpMode = 'reveal' | 'hide';

/**
 * Complete fog operation
 * Synced via Yjs to all connected players
 */
export interface FogOp {
  id: string;
  type: FogOpType;
  mode: FogOpMode;
  geom: FogGeometry;
}

/**
 * Fog of War configuration (stored in MapConfig)
 * This is the actual rendered state of FOW
 */
export interface FogConfig {
  enabled: boolean;              // Master on/off switch
  radius: number;                // Vision radius in grid squares
  shape: 'circle' | 'square' | 'hexagon';  // Vision shape for tokens
  color: string;                 // Hex color of fog overlay
  hideTokens: boolean;           // Hide non-vision-source tokens
  visionMode: 'dynamic' | 'static' | 'none';  // How vision is calculated
}

// ============================================================================
// PUBLIC API - NAMESPACE PATTERN
// ============================================================================

/**
 * Primary interface for all fog of war operations
 * Organized by use case: getters, creators, mutations
 */
export const FogOfWar = {
  // ========================================================================
  // GETTERS - Pure functions
  // ========================================================================

  /**
   * Get all fog operations
   * @returns Array of all fog ops from Yjs store
   */
  getOps(): FogOp[] {
    return Array.from(state.fogOps.values());
  },

  /**
   * Get a specific fog operation by ID
   * @param id - Fog operation ID
   * @returns FogOp or undefined if not found
   */
  getById(id: string): FogOp | undefined {
    return state.fogOps.get(id) as FogOp | undefined;
  },

  /**
   * Get all reveal operations (areas that show to all players)
   * @returns Array of reveal fog ops
   */
  getReveals(): FogOp[] {
    return this.getOps().filter(op => op.mode === 'reveal');
  },

  /**
   * Get all hide operations (invisible walls)
   * @returns Array of hide fog ops
   */
  getHides(): FogOp[] {
    return this.getOps().filter(op => op.mode === 'hide');
  },

  /**
   * Get fog operations of specific type
   * @param type - Type to filter by
   * @returns Array of fog ops matching type
   */
  getByType(type: FogOpType): FogOp[] {
    return this.getOps().filter(op => op.type === type);
  },

  /**
   * Count total fog operations
   */
  getCount(): number {
    return this.getOps().length;
  },

  /**
   * Check if fog operations exist
   */
  isEmpty(): boolean {
    return this.getCount() === 0;
  },

  // ========================================================================
  // CREATORS - Factory functions for common shapes
  // ========================================================================

  /**
   * Create a circular fog operation
   * Most common: token vision radius or area reveal
   * 
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param radius - Radius in pixels
   * @param mode - 'reveal' or 'hide'
   * @returns Created FogOp
   * 
   * @example
   *   FogOfWar.createCircle(512, 256, 100, 'reveal')  // Reveal circle
   *   FogOfWar.createCircle(512, 256, 150, 'hide')    // Invisible wall
   */
  createCircle(
    x: number,
    y: number,
    radius: number,
    mode: FogOpMode = 'reveal'
  ): FogOp {
    const op: FogOp = {
      id: `fog_circle_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'circle',
      mode,
      geom: { x, y, r: radius },
    };
    this.addOp(op);
    return op;
  },

  /**
   * Create a square/rectangular fog operation
   * Useful for rooms, buildings, or areas
   * 
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @param mode - 'reveal' or 'hide'
   * @returns Created FogOp
   * 
   * @example
   *   FogOfWar.createSquare(512, 256, 200, 150, 'reveal')  // Reveal room
   */
  createSquare(
    x: number,
    y: number,
    width: number,
    height: number,
    mode: FogOpMode = 'reveal'
  ): FogOp {
    const op: FogOp = {
      id: `fog_square_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'square',
      mode,
      geom: { x, y, w: width, h: height },
    };
    this.addOp(op);
    return op;
  },

  /**
   * Create a polygon fog operation
   * For irregular shapes: rooms, dungeons, obstacles
   * 
   * @param points - Array of {x, y} points defining polygon
   * @param mode - 'reveal' or 'hide'
   * @returns Created FogOp
   * 
   * @example
   *   FogOfWar.createPolygon([
   *     {x: 100, y: 100},
   *     {x: 300, y: 100},
   *     {x: 300, y: 300},
   *     {x: 100, y: 300},
   *   ], 'reveal')
   */
  createPolygon(
    points: { x: number; y: number }[],
    mode: FogOpMode = 'reveal'
  ): FogOp {
    if (points.length < 3) {
      console.warn('[FogOfWar] Polygon must have at least 3 points');
      return null as any;
    }

    const op: FogOp = {
      id: `fog_poly_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'polygon',
      mode,
      geom: { points },
    };
    this.addOp(op);
    return op;
  },

  /**
   * Create a path fog operation (freehand drawing)
   * Rendered as a line with given width
   * 
   * @param points - Array of {x, y} points defining path
   * @param width - Width of the path in pixels
   * @param mode - 'reveal' or 'hide'
   * @returns Created FogOp
   * 
   * @example
   *   FogOfWar.createPath(
   *     [{x: 100, y: 100}, {x: 200, y: 150}, {x: 300, y: 100}],
   *     10,
   *     'reveal'
   *   )
   */
  createPath(
    points: { x: number; y: number }[],
    width: number = 4,
    mode: FogOpMode = 'reveal'
  ): FogOp {
    if (points.length < 2) {
      console.warn('[FogOfWar] Path must have at least 2 points');
      return null as any;
    }

    const op: FogOp = {
      id: `fog_path_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'path',
      mode,
      geom: { points, width },
    };
    this.addOp(op);
    return op;
  },

  // ========================================================================
  // MUTATIONS - Modify or remove operations
  // ========================================================================

  /**
   * Add a fog operation to the game
   * Syncs to all players via Yjs
   * 
   * @param op - FogOp to add
   */
  addOp(op: FogOp): void {
    state.fogOps.set(op.id, op);
    window.dispatchEvent(new Event('fog-changed'));
  },

  /**
   * Update a fog operation (partial update)
   * 
   * @param id - Fog operation ID
   * @param props - Properties to update
   */
  updateOp(id: string, props: Partial<FogOp>): void {
    const op = this.getById(id);
    if (!op) {
      console.warn(`[FogOfWar] Fog op ${id} not found`);
      return;
    }
    state.fogOps.set(id, { ...op, ...props });
    window.dispatchEvent(new Event('fog-changed'));
  },

  /**
   * Remove a fog operation by ID
   * 
   * @param id - Fog operation ID
   */
  removeOp(id: string): void {
    state.fogOps.delete(id);
    window.dispatchEvent(new Event('fog-changed'));
  },

  /**
   * Remove multiple fog operations
   * 
   * @param ids - Array of fog operation IDs
   */
  removeOps(ids: string[]): void {
    ids.forEach(id => state.fogOps.delete(id));
    window.dispatchEvent(new Event('fog-changed'));
  },

  /**
   * Clear all fog operations
   * Useful for resetting a map or encounter
   */
  clear(): void {
    state.fogOps.clear();
    window.dispatchEvent(new Event('fog-changed'));
  },

  /**
   * Remove all reveal operations (keep walls)
   * Useful for "re-fogging" a previously explored area
   */
  clearReveals(): void {
    const hides = this.getHides();
    state.fogOps.clear();
    hides.forEach(op => state.fogOps.set(op.id, op));
    window.dispatchEvent(new Event('fog-changed'));
  },

  /**
   * Remove all hide operations (invisible walls)
   * Keep all area reveals
   */
  clearHides(): void {
    const reveals = this.getReveals();
    state.fogOps.clear();
    reveals.forEach(op => state.fogOps.set(op.id, op));
    window.dispatchEvent(new Event('fog-changed'));
  },

  // ========================================================================
  // TOGGLE OPERATIONS
  // ========================================================================

  /**
   * Toggle fog operation mode between 'reveal' and 'hide'
   * 
   * @param id - Fog operation ID
   */
  toggleMode(id: string): void {
    const op = this.getById(id);
    if (!op) return;

    const newMode = op.mode === 'reveal' ? 'hide' : 'reveal';
    this.updateOp(id, { mode: newMode });
  },

  // ========================================================================
  // BATCH OPERATIONS
  // ========================================================================

  /**
   * Create multiple circles at once
   * Useful for creating circular obstacles or room outlines
   * 
   * @param circles - Array of {x, y, radius, mode?}
   * @returns Array of created FogOps
   */
  createCircles(
    circles: Array<{ x: number; y: number; radius: number; mode?: FogOpMode }>
  ): FogOp[] {
    return circles.map(c => this.createCircle(c.x, c.y, c.radius, c.mode));
  },

  /**
   * Create grid of squares (like dungeon tiles)
   * 
   * @param startX - Top-left X
   * @param startY - Top-left Y
   * @param rows - Number of rows
   * @param cols - Number of columns
   * @param squareSize - Size of each square
   * @param mode - 'reveal' or 'hide'
   * @returns Array of created FogOps
   * 
   * @example
   *   FogOfWar.createGrid(0, 0, 5, 5, 50, 'hide')  // 5x5 grid of invisible walls
   */
  createGrid(
    startX: number,
    startY: number,
    rows: number,
    cols: number,
    squareSize: number,
    mode: FogOpMode = 'hide'
  ): FogOp[] {
    const ops: FogOp[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * squareSize;
        const y = startY + r * squareSize;
        ops.push(this.createSquare(x, y, squareSize, squareSize, mode));
      }
    }
    return ops;
  },

  /**
   * Delete multiple fog operations at once
   * 
   * @param ids - Array of fog operation IDs
   */
  deleteMultiple(ids: string[]): void {
    this.removeOps(ids);
  },

  // ========================================================================
  // GEOMETRY HELPERS
  // ========================================================================

  /**
   * Check if a point is inside a fog operation
   * Useful for visibility calculations
   * 
   * @param opId - Fog operation ID
   * @param px - Point X
   * @param py - Point Y
   * @returns true if point is inside geometry
   */
  pointInOp(opId: string, px: number, py: number): boolean {
    const op = this.getById(opId);
    if (!op) return false;

    if (op.type === 'circle') {
      const c = op.geom as FogGeomCircle;
      const dx = px - c.x;
      const dy = py - c.y;
      return dx * dx + dy * dy <= c.r * c.r;
    }

    if (op.type === 'square') {
      const s = op.geom as FogGeomSquare;
      return (
        px >= s.x - s.w / 2 &&
        px <= s.x + s.w / 2 &&
        py >= s.y - s.h / 2 &&
        py <= s.y + s.h / 2
      );
    }

    // Polygon/path point-in-polygon not implemented (complex)
    // Delegated to fogRenderer.ts for now
    return false;
  },

  /**
   * Get bounding box of a fog operation
   * Useful for optimization and culling
   * 
   * @param op - FogOp
   * @returns {minX, minY, maxX, maxY}
   */
  getBounds(op: FogOp): { minX: number; minY: number; maxX: number; maxY: number } {
    if (op.type === 'circle') {
      const c = op.geom as FogGeomCircle;
      return {
        minX: c.x - c.r,
        minY: c.y - c.r,
        maxX: c.x + c.r,
        maxY: c.y + c.r,
      };
    }

    if (op.type === 'square') {
      const s = op.geom as FogGeomSquare;
      return {
        minX: s.x - s.w / 2,
        minY: s.y - s.h / 2,
        maxX: s.x + s.w / 2,
        maxY: s.y + s.h / 2,
      };
    }

    if (op.type === 'polygon' || op.type === 'path') {
      const p = op.geom as any;
      const xs = p.points.map((pt: any) => pt.x);
      const ys = p.points.map((pt: any) => pt.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }

    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  },
};

// ============================================================================
// EVENT EMITTERS (for React components)
// ============================================================================

/**
 * Subscribe to fog operation changes
 * @example
 *   useEffect(() => {
 *     const handler = () => setFogOps(FogOfWar.getOps());
 *     window.addEventListener('fog-changed', handler);
 *     return () => window.removeEventListener('fog-changed', handler);
 *   }, []);
 */
export function onFogChanged(callback: () => void): () => void {
  window.addEventListener('fog-changed', callback);
  return () => window.removeEventListener('fog-changed', callback);
}

/**
 * Subscribe to Yjs fog ops changes (real-time sync)
 */
export function onFogOpsSync(callback: () => void): () => void {
  state.fogOps.observe(callback);
  return () => state.fogOps.unobserve(callback);
}
