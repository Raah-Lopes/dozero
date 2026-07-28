import { Graphics, Container, Texture, Matrix, BlurFilter } from 'pixi.js';
import { getFogOps, FogGeomCircle, FogGeomSquare, FogGeomPolygon, localState } from '../../store';
import { extractWallSegments, visibilityPolygon } from './fogVisibility';

let sharedGlowTex: Texture | null = null;
function getSharedGlow(): Texture {
  if (sharedGlowTex) return sharedGlowTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const center = size / 2;
  ctx.globalCompositeOperation = "screen";

  const g1 = ctx.createRadialGradient(center, center, 0, center, center, center);
  g1.addColorStop(0,    "rgba(255,244,214,0.30)");
  g1.addColorStop(0.45, "rgba(230,197,123,0.12)");
  g1.addColorStop(1,    "rgba(230,197,123,0.00)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, size, size);

  const g2 = ctx.createRadialGradient(center, center, 0, center, center, center * 0.35);
  g2.addColorStop(0,    "rgba(255,247,224,0.35)");
  g2.addColorStop(0.45, "rgba(243,214,144,0.18)");
  g2.addColorStop(1,    "rgba(243,214,144,0.00)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  
  sharedGlowTex = Texture.from(canvas);
  return sharedGlowTex;
}

let sharedLightMaskTex: Texture | null = null;
function getSharedLightMask(): Texture {
  if (sharedLightMaskTex) return sharedLightMaskTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const center = size / 2;
  const g = ctx.createRadialGradient(center, center, 0, center, center, center);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.6, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  
  sharedLightMaskTex = Texture.from(canvas);
  return sharedLightMaskTex;
}

export function renderFogOfWar(
  fogContainer: Container,
  fogOverlay: Graphics,
  config: any,
  viewport: { x: number; y: number; scale: { x: number; y: number } },
  visionSources: any[]
) {
  if (!config.fog.enabled) {
    fogContainer.visible = false;
    return;
  }
  
  fogContainer.visible = true;

  // 1. Reset and manage pool
  const pool = (fogContainer as any).fogPool || [];
  (fogContainer as any).fogPool = pool;
  
  // hide all pool items
  pool.forEach((g: Graphics) => {
     g.clear();
     g.visible = false;
     g.mask = null;
     g.filters = null;
  });

  let poolIdx = 0;
  const getGfx = (mode: string) => {
    if (poolIdx >= pool.length) {
       const newGfx = new Graphics();
       pool.push(newGfx);
       fogContainer.addChild(newGfx);
    }
    const g = pool[poolIdx];
    g.visible = true;
    g.blendMode = mode as any;
    poolIdx++;
    return g;
  };

  // 2. Draw fog darkness over visible viewport
  fogOverlay.clear();
  const wl = -viewport.x / viewport.scale.x - 1000;
  const wt = -viewport.y / viewport.scale.y - 1000;
  const ww = window.innerWidth / viewport.scale.x + 2000;
  const wh = window.innerHeight / viewport.scale.y + 2000;

  fogOverlay.rect(wl, wt, ww, wh);
  let fowColor = 0x000000;
  if (config.fog.color && config.fog.color.startsWith('#')) {
    fowColor = parseInt(config.fog.color.replace('#', '0x'), 16);
  }
  fogOverlay.fill({ color: fowColor, alpha: 0.82 });

  const fogOps = getFogOps();

  // 3. Token Vision via Raycasting (Dynamic Lighting)
  if (visionSources.length > 0) {
    const segments = extractWallSegments(fogOps);

    visionSources.forEach(t => {
      const radius = t.visionRadius || ((config.fog.radius || 6) * config.map.gridSize);
      
      const poly = visibilityPolygon(t.x, t.y, segments, radius);
      
      if (poly.length > 2) {
        const visionStyle = (t as any).visionStyle || 'gradient';
        const tokenGfx = getGfx('erase');
        
        if (visionStyle === 'gradient') {
           tokenGfx.filters = [new BlurFilter({ strength: 24, quality: 3 })];
        } else {
           tokenGfx.filters = null;
        }

        tokenGfx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) {
          tokenGfx.lineTo(poly[i].x, poly[i].y);
        }
        tokenGfx.lineTo(poly[0].x, poly[0].y);
        
        tokenGfx.fill({ color: 0xffffff });
      }
    });
  }

  // 4. Draw GM Ops 
  // 'reveal' permanently opens an area.
  // 'hide' acts as an INVISIBLE WALL for players, but we draw a red outline for the GM.
  fogOps.forEach(op => {
    const isReveal = op.mode === 'reveal';
    const g = getGfx(isReveal ? 'erase' : 'normal');
    let gmGfx = null;
    if (localState.isGM) {
       gmGfx = getGfx('normal'); // Separate graphics object for GM lines so it doesn't use erase blend mode
    }

    if (op.type === 'circle') {
      const geom = op.geom as FogGeomCircle;
      g.circle(geom.x, geom.y, geom.r);
      if (gmGfx) gmGfx.circle(geom.x, geom.y, geom.r);
    } else if (op.type === 'square') {
      const geom = op.geom as FogGeomSquare;
      g.rect(geom.x - geom.w / 2, geom.y - geom.h / 2, geom.w, geom.h);
      if (gmGfx) gmGfx.rect(geom.x - geom.w / 2, geom.y - geom.h / 2, geom.w, geom.h);
    } else if (op.type === 'polygon') {
      const geom = op.geom as FogGeomPolygon;
      if (geom.points && geom.points.length > 2) {
        g.moveTo(geom.points[0].x, geom.points[0].y);
        if (gmGfx) gmGfx.moveTo(geom.points[0].x, geom.points[0].y);
        for (let i = 1; i < geom.points.length; i++) {
          g.lineTo(geom.points[i].x, geom.points[i].y);
          if (gmGfx) gmGfx.lineTo(geom.points[i].x, geom.points[i].y);
        }
        g.lineTo(geom.points[0].x, geom.points[0].y);
        if (gmGfx) gmGfx.lineTo(geom.points[0].x, geom.points[0].y);
      }
    } else if (op.type === 'path') {
      const geom = op.geom as any;
      if (geom.points && geom.points.length > 1) {
        g.moveTo(geom.points[0].x, geom.points[0].y);
        if (gmGfx) gmGfx.moveTo(geom.points[0].x, geom.points[0].y);
        for (let i = 1; i < geom.points.length; i++) {
          g.lineTo(geom.points[i].x, geom.points[i].y);
          if (gmGfx) gmGfx.lineTo(geom.points[i].x, geom.points[i].y);
        }
      }
    }

    if (isReveal) {
      if (op.type === 'path') {
        g.stroke({ color: 0xffffff, width: (op.geom as any).width, cap: 'round', join: 'round' });
      } else {
        g.fill({ color: 0xffffff, alpha: 1 });
      }
      if (gmGfx) {
         if (op.type === 'path') {
            gmGfx.stroke({ color: 0x475569, alpha: 0.8, width: 2, cap: 'round', join: 'round' });
         } else {
            gmGfx.stroke({ width: 2, color: 0x475569, alpha: 0.8 });
         }
      }
    } else {
      // 'hide' ops act purely as invisible walls that block light. 
      // They do NOT paint explicit black areas on top of tokens (so tokens inside them can illuminate them).
      // However, we draw a very faint stroke on the erase layer so players see a subtle outline of the wall.
      const maskGfx = getGfx('erase');
      if (op.type === 'circle') {
        const geom = op.geom as FogGeomCircle;
        maskGfx.circle(geom.x, geom.y, geom.r);
      } else if (op.type === 'square') {
        const geom = op.geom as FogGeomSquare;
        maskGfx.rect(geom.x - geom.w / 2, geom.y - geom.h / 2, geom.w, geom.h);
      } else if (op.type === 'polygon' || op.type === 'path') {
        const geom = op.geom as any;
        if (geom.points && geom.points.length > 0) {
          maskGfx.moveTo(geom.points[0].x, geom.points[0].y);
          for (let i = 1; i < geom.points.length; i++) maskGfx.lineTo(geom.points[i].x, geom.points[i].y);
          if (op.type === 'polygon') maskGfx.lineTo(geom.points[0].x, geom.points[0].y);
        }
      }
      maskGfx.stroke({ color: 0xffffff, width: 2, alpha: 0.15 });

      if (gmGfx) {
        if (op.type === 'path') {
          gmGfx.stroke({ color: 0x475569, alpha: 0.8, width: 2, cap: 'round', join: 'round' });
        } else {
          gmGfx.stroke({ width: 2, color: 0x475569, alpha: 0.8 });
        }
      }
    }
  });

  fogContainer.visible = true;
}
