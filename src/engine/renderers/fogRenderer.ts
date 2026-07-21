import { Graphics, Container } from 'pixi.js';

export function renderFogOfWar(
  fogContainer: Container,
  fogOverlay: Graphics,
  fogHoles: Graphics,
  config: any,
  viewport: { x: number; y: number; scale: { x: number; y: number } },
  visionSources: any[]
) {
  fogOverlay.clear();
  fogHoles.clear();

  if (!config.fogOfWar) {
    fogContainer.visible = false;
    return;
  }

  // Draw fog darkness over visible viewport
  const wl = -viewport.x / viewport.scale.x - 1000;
  const wt = -viewport.y / viewport.scale.y - 1000;
  const ww = window.innerWidth / viewport.scale.x + 2000;
  const wh = window.innerHeight / viewport.scale.y + 2000;

  fogOverlay.rect(wl, wt, ww, wh);
  let fowColor = 0x000000;
  if (config.fowColor && config.fowColor.startsWith('#')) {
    fowColor = parseInt(config.fowColor.replace('#', '0x'), 16);
  }
  fogOverlay.fill({ color: fowColor, alpha: 0.95 });

  // Draw vision holes
  visionSources.forEach(t => {
    const radius = t.visionRadius || ((config.fowRadius || 6) * config.gridSize);
    if (config.fowShape === 'square') {
      fogHoles.rect(t.x - radius, t.y - radius, radius * 2, radius * 2);
    } else if (config.fowShape === 'hexagon') {
      fogHoles.moveTo(t.x + radius, t.y);
      for (let i = 1; i <= 6; i++) {
        fogHoles.lineTo(t.x + radius * Math.cos(i * Math.PI / 3), t.y + radius * Math.sin(i * Math.PI / 3));
      }
    } else {
      fogHoles.circle(t.x, t.y, radius);
    }
  });

  fogHoles.fill({ color: 0xffffff });
  fogContainer.visible = true;
}
