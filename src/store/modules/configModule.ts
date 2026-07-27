/**
 * CENTRALIZED GAME CONFIGURATION MODULE
 * 
 * Single source of truth for all game configuration.
 * Consolidates map, fog, grid, and rendering settings into one unified schema.
 * 
 * Usage:
 *   import { Config } from '../../store/modules/configModule';
 *   
 *   Config.getAll()
 *   Config.getMapConfig()
 *   Config.getFogConfig()
 *   Config.update({ fog: { enabled: true } })
 */

import { state } from '../../services/yjs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Map/Grid configuration
 */
export interface MapConfig {
  // Grid display settings
  gridSize: number;                                           // pixels per square
  gridType: 'square' | 'hex_v' | 'hex_h' | 'dots_square' | 'dots_hex';
  gridColor: string;                                         // hex color
  gridAlpha: number;                                         // 0-1 opacity
  
  // Canvas background
  mapBackgroundColor: string;                                // hex or 'transparent'
}

/**
 * Fog of War configuration
 */
export interface FogConfig {
  // Master controls
  enabled: boolean;                                          // FOW on/off
  
  // Vision
  radius: number;                                            // grid squares
  shape: 'circle' | 'square' | 'hexagon';
  
  // Appearance
  color: string;                                             // hex color of darkness
  
  // Behavior
  hideTokens: boolean;                                       // hide non-vision-source tokens
  visionMode: 'dynamic' | 'static' | 'none';                // how vision is calculated
}

/**
 * Rendering performance settings
 */
export interface RenderingConfig {
  // Performance
  maxTokens: number;                                         // render limit
  maxDrawings: number;                                       // draw objects limit
  
  // Visual quality
  antiAlias: boolean;
  resolution: number;                                        // pixel density (1, 2, etc)
  
  // Debug
  showBounds: boolean;                                       // show collision boxes
  showGrid: boolean;                                         // always show grid
}

/**
 * Complete game configuration
 * This is the single source of truth for all settings
 */
export interface GameConfig {
  map: MapConfig;
  fog: FogConfig;
  rendering: RenderingConfig;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_CONFIG: GameConfig = {
  map: {
    gridSize: 50,
    gridType: 'square',
    gridColor: '#1e293b',
    gridAlpha: 0.5,
    mapBackgroundColor: 'transparent',
  },
  fog: {
    enabled: false,
    radius: 6,
    shape: 'circle',
    color: '#000000',
    hideTokens: false,
    visionMode: 'dynamic',
  },
  rendering: {
    maxTokens: 100,
    maxDrawings: 500,
    antiAlias: true,
    resolution: 1,
    showBounds: false,
    showGrid: true,
  },
};

// ============================================================================
// PUBLIC API - NAMESPACE PATTERN
// ============================================================================

/**
 * Primary interface for all configuration operations
 * Organized by: getters, setters, partials, helpers
 */
export const Config = {
  // ========================================================================
  // GETTERS - Read-only access to config
  // ========================================================================

  /**
   * Get complete game configuration
   * @returns Full GameConfig object
   */
  getAll(): GameConfig {
    const stored = state.mapConfig.get('global');
    if (stored) {
      // Legacy config check (flat schema migration)
      if (!('map' in stored) && !('fog' in stored)) {
        console.warn('[Config] Migrating legacy flat config to new nested format');
        const legacy = stored as any;
        const migrated: GameConfig = this.getDefaults();
        
        // Migrate map settings
        if (legacy.gridSize !== undefined) migrated.map.gridSize = legacy.gridSize;
        if (legacy.gridType !== undefined) migrated.map.gridType = legacy.gridType;
        if (legacy.gridColor !== undefined) migrated.map.gridColor = legacy.gridColor;
        if (legacy.gridAlpha !== undefined) migrated.map.gridAlpha = legacy.gridAlpha;
        if (legacy.mapBackgroundColor !== undefined) migrated.map.mapBackgroundColor = legacy.mapBackgroundColor;
        
        // Migrate fog settings
        if (legacy.fogOfWar !== undefined) migrated.fog.enabled = legacy.fogOfWar;
        if (legacy.fowRadius !== undefined) migrated.fog.radius = legacy.fowRadius;
        if (legacy.fowShape !== undefined) migrated.fog.shape = legacy.fowShape;
        if (legacy.fowColor !== undefined) migrated.fog.color = legacy.fowColor;
        if (legacy.fowHideTokens !== undefined) migrated.fog.hideTokens = legacy.fowHideTokens;
        
        // Save back the migrated format
        state.mapConfig.set('global', migrated);
        return migrated;
      }
      
      return stored as GameConfig;
    }
    return this.getDefaults();
  },

  /**
   * Get default configuration (reset values)
   * @returns Fresh GameConfig with defaults
   */
  getDefaults(): GameConfig {
    // Deep clone to prevent mutations
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  },

  /**
   * Get map/grid configuration only
   * @returns MapConfig subset
   */
  getMapConfig(): MapConfig {
    return this.getAll().map;
  },

  /**
   * Get fog of war configuration only
   * @returns FogConfig subset
   */
  getFogConfig(): FogConfig {
    return this.getAll().fog;
  },

  /**
   * Get rendering configuration only
   * @returns RenderingConfig subset
   */
  getRenderingConfig(): RenderingConfig {
    return this.getAll().rendering;
  },

  /**
   * Check if fog of war is enabled
   */
  isFogEnabled(): boolean {
    return this.getAll().fog.enabled;
  },

  // ========================================================================
  // COMPLETE CONFIG UPDATES
  // ========================================================================

  /**
   * Update complete configuration
   * Performs deep merge with existing config
   * 
   * @param partial - Partial GameConfig object
   * 
   * @example
   *   Config.update({
   *     map: { gridSize: 75 },
   *     fog: { enabled: true, radius: 8 }
   *   })
   */
  update(partial: Partial<GameConfig>): void {
    const current = this.getAll();
    const merged: GameConfig = {
      map: { ...current.map, ...partial.map },
      fog: { ...current.fog, ...partial.fog },
      rendering: { ...current.rendering, ...partial.rendering },
    };
    state.mapConfig.set('global', merged);
    window.dispatchEvent(new Event('config-changed'));
  },

  /**
   * Reset configuration to defaults
   * Useful for "restore defaults" button
   */
  reset(): void {
    state.mapConfig.set('global', this.getDefaults());
    window.dispatchEvent(new Event('config-changed'));
  },

  // ========================================================================
  // MAP/GRID UPDATES
  // ========================================================================

  /**
   * Update map/grid configuration
   * 
   * @param props - Partial MapConfig properties
   * 
   * @example
   *   Config.updateMap({
   *     gridSize: 75,
   *     gridColor: '#00ff00',
   *     gridAlpha: 0.8
   *   })
   */
  updateMap(props: Partial<MapConfig>): void {
    const current = this.getAll();
    this.update({
      map: { ...current.map, ...props },
    });
  },

  /**
   * Update grid size
   * @param size - Pixel size per grid square
   */
  setGridSize(size: number): void {
    this.updateMap({ gridSize: size });
  },

  /**
   * Update grid type
   * @param type - Grid geometry type
   */
  setGridType(type: MapConfig['gridType']): void {
    this.updateMap({ gridType: type });
  },

  /**
   * Update grid color
   * @param color - Hex color string
   */
  setGridColor(color: string): void {
    this.updateMap({ gridColor: color });
  },

  /**
   * Update grid opacity
   * @param alpha - 0-1 opacity value
   */
  setGridAlpha(alpha: number): void {
    this.updateMap({ gridAlpha: Math.max(0, Math.min(1, alpha)) });
  },

  /**
   * Update map background color
   * @param color - Hex color or 'transparent'
   */
  setMapBackground(color: string): void {
    this.updateMap({ mapBackgroundColor: color });
  },

  // ========================================================================
  // FOG OF WAR UPDATES
  // ========================================================================

  /**
   * Update fog of war configuration
   * 
   * @param props - Partial FogConfig properties
   * 
   * @example
   *   Config.updateFog({
   *     enabled: true,
   *     radius: 8,
   *     color: '#1a1a2e'
   *   })
   */
  updateFog(props: Partial<FogConfig>): void {
    const current = this.getAll();
    this.update({
      fog: { ...current.fog, ...props },
    });
  },

  /**
   * Toggle fog of war on/off
   */
  toggleFog(): void {
    const current = this.getAll().fog;
    this.updateFog({ enabled: !current.enabled });
  },

  /**
   * Enable fog of war
   */
  enableFog(): void {
    this.updateFog({ enabled: true });
  },

  /**
   * Disable fog of war
   */
  disableFog(): void {
    this.updateFog({ enabled: false });
  },

  /**
   * Update fog vision radius (in grid squares)
   * @param radius - Grid squares (e.g., 6, 8, 10)
   */
  setFogRadius(radius: number): void {
    this.updateFog({ radius: Math.max(1, radius) });
  },

  /**
   * Update fog vision shape
   * @param shape - 'circle', 'square', or 'hexagon'
   */
  setFogShape(shape: FogConfig['shape']): void {
    this.updateFog({ shape });
  },

  /**
   * Update fog darkness color
   * @param color - Hex color string
   */
  setFogColor(color: string): void {
    this.updateFog({ color });
  },

  /**
   * Toggle hiding of non-vision-source tokens
   * When enabled, only tokens that are vision sources are visible
   */
  toggleHideTokens(): void {
    const current = this.getAll().fog;
    this.updateFog({ hideTokens: !current.hideTokens });
  },

  /**
   * Set whether to hide tokens outside vision
   */
  setHideTokens(hide: boolean): void {
    this.updateFog({ hideTokens: hide });
  },

  /**
   * Update vision calculation mode
   * - 'dynamic': calculate based on walls and obstacles
   * - 'static': simple radius (no wall blocking)
   * - 'none': no vision (fog disabled)
   */
  setVisionMode(mode: FogConfig['visionMode']): void {
    this.updateFog({ visionMode: mode });
  },

  // ========================================================================
  // RENDERING UPDATES
  // ========================================================================

  /**
   * Update rendering configuration
   * 
   * @param props - Partial RenderingConfig properties
   */
  updateRendering(props: Partial<RenderingConfig>): void {
    const current = this.getAll();
    this.update({
      rendering: { ...current.rendering, ...props },
    });
  },

  /**
   * Set maximum tokens to render
   * Beyond this, tokens may be culled for performance
   */
  setMaxTokens(count: number): void {
    this.updateRendering({ maxTokens: Math.max(1, count) });
  },

  /**
   * Set maximum drawing objects
   * Beyond this, drawings may be culled
   */
  setMaxDrawings(count: number): void {
    this.updateRendering({ maxDrawings: Math.max(1, count) });
  },

  /**
   * Toggle anti-aliasing
   * Smoother rendering but slightly slower
   */
  toggleAntiAlias(): void {
    const current = this.getAll().rendering;
    this.updateRendering({ antiAlias: !current.antiAlias });
  },

  /**
   * Set pixel resolution (devicePixelRatio)
   * 1 = normal, 2 = retina (4x pixels), higher = sharper but slower
   */
  setResolution(resolution: number): void {
    this.updateRendering({ resolution: Math.max(0.5, resolution) });
  },

  /**
   * Toggle debug bounds visualization
   */
  toggleDebugBounds(): void {
    const current = this.getAll().rendering;
    this.updateRendering({ showBounds: !current.showBounds });
  },

  /**
   * Toggle grid visibility
   */
  toggleShowGrid(): void {
    const current = this.getAll().rendering;
    this.updateRendering({ showGrid: !current.showGrid });
  },

  // ========================================================================
  // PRESETS - Common configurations
  // ========================================================================

  /**
   * Apply "Performance Mode" - reduces detail for better FPS
   */
  applyPerformanceMode(): void {
    this.updateRendering({
      antiAlias: false,
      resolution: 0.75,
      maxTokens: 50,
      maxDrawings: 200,
    });
  },

  /**
   * Apply "Quality Mode" - better visuals, more demanding
   */
  applyQualityMode(): void {
    this.updateRendering({
      antiAlias: true,
      resolution: 2,
      maxTokens: 150,
      maxDrawings: 1000,
    });
  },

  /**
   * Apply "Dungeon Crawler" preset
   * Small grid, fog enabled, hide tokens
   */
  applyDungeonPreset(): void {
    this.update({
      map: {
        gridSize: 40,
        gridType: 'square',
        gridColor: '#475569',
        gridAlpha: 0.6,
        mapBackgroundColor: '#0f172a',
      },
      fog: {
        enabled: true,
        radius: 5,
        shape: 'circle',
        color: '#1e293b',
        hideTokens: true,
        visionMode: 'dynamic',
      },
    });
  },

  /**
   * Apply "Wilderness" preset
   * Large grid, no fog, tokens visible
   */
  applyWildernessPreset(): void {
    this.update({
      map: {
        gridSize: 60,
        gridType: 'square',
        gridColor: '#64748b',
        gridAlpha: 0.3,
        mapBackgroundColor: 'transparent',
      },
      fog: {
        enabled: false,
        radius: 10,
        shape: 'circle',
        color: '#000000',
        hideTokens: false,
        visionMode: 'none',
      },
    });
  },

  /**
   * Apply "Tactical Battle" preset
   * Medium grid, fog enabled, static vision
   */
  applyTacticalPreset(): void {
    this.update({
      map: {
        gridSize: 50,
        gridType: 'square',
        gridColor: '#1e293b',
        gridAlpha: 0.7,
        mapBackgroundColor: '#0f172a',
      },
      fog: {
        enabled: true,
        radius: 6,
        shape: 'circle',
        color: '#000000',
        hideTokens: false,
        visionMode: 'static',
      },
    });
  },

  // ========================================================================
  // VALIDATION & HELPERS
  // ========================================================================

  /**
   * Validate configuration object
   * Returns true if valid, false otherwise
   * 
   * @param config - GameConfig to validate
   */
  isValid(config: GameConfig): boolean {
    try {
      // Check map
      if (config.map.gridSize < 10 || config.map.gridSize > 500) return false;
      if (config.map.gridAlpha < 0 || config.map.gridAlpha > 1) return false;

      // Check fog
      if (config.fog.radius < 1 || config.fog.radius > 50) return false;

      // Check rendering
      if (config.rendering.maxTokens < 1) return false;
      if (config.rendering.maxDrawings < 1) return false;
      if (config.rendering.resolution < 0.5 || config.rendering.resolution > 3) return false;

      return true;
    } catch (e) {
      console.warn('[Config] Validation failed:', e);
      return false;
    }
  },

  /**
   * Export configuration as JSON string
   * Useful for sharing or backup
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  },

  /**
   * Import configuration from JSON string
   * Validates before applying
   */
  import(json: string): boolean {
    try {
      const config = JSON.parse(json) as GameConfig;
      if (!this.isValid(config)) {
        console.warn('[Config] Imported config failed validation');
        return false;
      }
      this.update(config);
      return true;
    } catch (e) {
      console.error('[Config] Import failed:', e);
      return false;
    }
  },
};

// ============================================================================
// EVENT EMITTERS (for React components)
// ============================================================================

/**
 * Subscribe to configuration changes
 * Fires whenever any config value changes
 * 
 * @example
 *   useEffect(() => {
 *     const unsubscribe = onConfigChanged(() => {
 *       const config = Config.getAll();
 *       // React to changes
 *     });
 *     return unsubscribe;
 *   }, []);
 */
export function onConfigChanged(callback: () => void): () => void {
  window.addEventListener('config-changed', callback);
  return () => window.removeEventListener('config-changed', callback);
}

/**
 * Subscribe to Yjs config store changes (real-time sync)
 */
export function onConfigSync(callback: () => void): () => void {
  state.mapConfig.observe(callback);
  return () => state.mapConfig.unobserve(callback);
}

/**
 * Subscribe only to map config changes
 */
export function onMapConfigChanged(callback: (config: MapConfig) => void): () => void {
  const handler = () => callback(Config.getMapConfig());
  return onConfigChanged(handler);
}

/**
 * Subscribe only to fog config changes
 */
export function onFogConfigChanged(callback: (config: FogConfig) => void): () => void {
  const handler = () => callback(Config.getFogConfig());
  return onConfigChanged(handler);
}
