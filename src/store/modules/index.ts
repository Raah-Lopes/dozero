/**
 * CENTRALIZED STORE MODULES - PUBLIC API
 * 
 * This file re-exports all centralized store modules with a unified API.
 * 
 * NEW PATTERN (Recommended):
 *   import { Tokens } from '../../store/modules';
 *   import { FogOfWar } from '../../store/modules';
 *   import { Config } from '../../store/modules';
 * 
 * OLD PATTERN (Deprecated):
 *   import { getSelectedTokens, toggleTokenSelection } from '../../store';
 *   ⚠️ These will be removed in v2.0
 * 
 * ============================================================================
 * MIGRATION GUIDE
 * ============================================================================
 * 
 * This module consolidates token management, fog of war, and configuration
 * into three focused namespaces with clear, consistent APIs.
 * 
 * ### TOKENS
 * 
 * Old (scattered):
 *   import { state, getSelectedTokens, applyDamageToToken, toggleTokenSelection } from '../../store';
 *   const selected = getSelectedTokens();
 *   applyDamageToToken(tokenId, 10);
 *   toggleTokenSelection(tokenId, true);
 * 
 * New (unified):
 *   import { Tokens } from '../../store/modules';
 *   const selected = Tokens.getSelected();
 *   Tokens.applyDamage(tokenId, 10);
 *   Tokens.toggleSelected(tokenId, true);
 * 
 * ### FOG OF WAR
 * 
 * Old (fragmented):
 *   import { state, addFogOp, removeFogOp, getFogOps } from '../../store';
 *   addFogOp({ id, type: 'circle', mode: 'reveal', geom: { x, y, r } });
 *   const ops = getFogOps();
 * 
 * New (intuitive):
 *   import { FogOfWar } from '../../store/modules';
 *   FogOfWar.createCircle(x, y, r, 'reveal');
 *   const ops = FogOfWar.getOps();
 * 
 * ### CONFIGURATION
 * 
 * Old (no single source):
 *   import { getMapConfig, updateMapConfig, state } from '../../store';
 *   const config = getMapConfig();
 *   updateMapConfig({ gridSize: 75 });
 * 
 * New (centralized):
 *   import { Config } from '../../store/modules';
 *   const config = Config.getAll();
 *   Config.setGridSize(75);
 *   Config.applyDungeonPreset();
 * 
 * ============================================================================
 * QUICK REFERENCE
 * ============================================================================
 * 
 * ### Tokens
 * Getters:     Tokens.getAll(), getById(), getSelected(), getTargets()
 * Create:      Tokens.create(data)
 * Modify:      Tokens.update(), applyDamage(), heal(), delete()
 * Select:      Tokens.toggleSelected(), selectBulk(), clearSelection()
 * Target:      Tokens.toggleTarget(), addTarget(), setTargets()
 * Visibility:  Tokens.hide(), show(), toggleVisibility()
 * Effects:     Tokens.addEffect(), removeEffect(), clearEffects()
 * Clone:       Tokens.clone(id)
 * Events:      onTokenSelectionChanged(), onTargetsChanged()
 * 
 * ### FogOfWar
 * Getters:     FogOfWar.getOps(), getById(), getReveals(), getHides()
 * Create:      FogOfWar.createCircle(), createSquare(), createPolygon(), createPath()
 * Modify:      FogOfWar.updateOp(), removeOp(), toggleMode()
 * Batch:       FogOfWar.createGrid(), deleteMultiple()
 * Clear:       FogOfWar.clear(), clearReveals(), clearHides()
 * Geometry:    FogOfWar.pointInOp(), getBounds()
 * Events:      onFogChanged(), onFogOpsSync()
 * 
 * ### Config
 * Getters:     Config.getAll(), getMapConfig(), getFogConfig()
 * Map:         Config.setGridSize(), setGridType(), setGridColor()
 * Fog:         Config.setFogRadius(), setFogShape(), toggleFog()
 * Rendering:   Config.setMaxTokens(), toggleAntiAlias()
 * Presets:     Config.applyDungeonPreset(), applyTacticalPreset()
 * Helpers:     Config.export(), import(), isValid()
 * Events:      onConfigChanged(), onMapConfigChanged(), onFogConfigChanged()
 */

// ============================================================================
// EXPORT ALL MODULES
// ============================================================================

// Token Management Module
export {
  Tokens,
  localState as TokenLocalState,
  type Token,
  type TokenLocalState,
  onTokenSelectionChanged,
  onTargetsChanged,
  onTokensChanged,
} from './tokenModule';

// Fog of War Module
export {
  FogOfWar,
  type FogOp,
  type FogOpType,
  type FogOpMode,
  type FogGeometry,
  type FogGeomCircle,
  type FogGeomSquare,
  type FogGeomPolygon,
  type FogGeomPath,
  type FogConfig,
  onFogChanged,
  onFogOpsSync,
} from './fogModule';

// Configuration Module
export {
  Config,
  type GameConfig,
  type MapConfig,
  type FogConfig,
  type RenderingConfig,
  onConfigChanged,
  onConfigSync,
  onMapConfigChanged,
  onFogConfigChanged,
} from './configModule';

// ============================================================================
// DEPRECATION NOTICES
// ============================================================================

/**
 * @deprecated Use Tokens.getSelected() instead
 */
export function getSelectedTokensDeprecated() {
  console.warn(
    '[DEPRECATED] getSelectedTokens() is deprecated. Use Tokens.getSelected() instead.'
  );
  const { Tokens } = require('./tokenModule');
  return Tokens.getSelected();
}

/**
 * @deprecated Use Tokens.toggleSelected() instead
 */
export function toggleTokenSelectionDeprecated(tokenId: string, multi: boolean) {
  console.warn(
    '[DEPRECATED] toggleTokenSelection() is deprecated. Use Tokens.toggleSelected() instead.'
  );
  const { Tokens } = require('./tokenModule');
  return Tokens.toggleSelected(tokenId, multi);
}

/**
 * @deprecated Use Tokens.applyDamage() instead
 */
export function applyDamageToTokenDeprecated(tokenId: string, damage: number) {
  console.warn(
    '[DEPRECATED] applyDamageToToken() is deprecated. Use Tokens.applyDamage() instead.'
  );
  const { Tokens } = require('./tokenModule');
  return Tokens.applyDamage(tokenId, damage);
}

/**
 * @deprecated Use FogOfWar.getOps() instead
 */
export function getFogOpsDeprecated() {
  console.warn('[DEPRECATED] getFogOps() is deprecated. Use FogOfWar.getOps() instead.');
  const { FogOfWar } = require('./fogModule');
  return FogOfWar.getOps();
}

/**
 * @deprecated Use FogOfWar.addOp() instead
 */
export function addFogOpDeprecated(op: any) {
  console.warn('[DEPRECATED] addFogOp() is deprecated. Use FogOfWar.addOp() instead.');
  const { FogOfWar } = require('./fogModule');
  return FogOfWar.addOp(op);
}

/**
 * @deprecated Use Config.getMapConfig() instead
 */
export function getMapConfigDeprecated() {
  console.warn('[DEPRECATED] getMapConfig() is deprecated. Use Config.getMapConfig() instead.');
  const { Config } = require('./configModule');
  return Config.getMapConfig();
}

/**
 * @deprecated Use Config.updateMap() or Config.update() instead
 */
export function updateMapConfigDeprecated(partial: any) {
  console.warn(
    '[DEPRECATED] updateMapConfig() is deprecated. Use Config.updateMap() or Config.update() instead.'
  );
  const { Config } = require('./configModule');
  return Config.update({ map: partial });
}
