import { Graphics } from 'pixi.js';
import { pixelToHex, hexToPixel } from '../utils/gridUtils';

export function renderGrid(grid: Graphics, config: any) {
  grid.clear();
  if (config.map.gridType === 'none' || config.map.gridAlpha <= 0) return;

  let colorNum = 0x00f3ff;
  if (config.map.gridColor && config.map.gridColor.startsWith('#')) {
    colorNum = parseInt(config.map.gridColor.replace('#', '0x'), 16);
  }

  const size = config.map.gridSize || 50;
  const range = 2500; // Limits grid to 5000x5000 bounds to prevent WebGL buffer overflow

  if (config.map.gridType === 'square') {
    grid.setStrokeStyle({ width: 1, color: colorNum, alpha: config.map.gridAlpha });
    for (let i = -range; i < range; i += size) {
      grid.moveTo(i, -range);
      grid.lineTo(i, range);
    }
    for (let j = -range; j < range; j += size) {
      grid.moveTo(-range, j);
      grid.lineTo(range, j);
    }
    grid.stroke();
  } else if (config.map.gridType === 'dots_square') {
    const radius = Math.max(2, size * 0.05);
    for (let i = -range; i < range; i += size) {
      for (let j = -range; j < range; j += size) {
        grid.rect(i - radius, j - radius, radius * 2, radius * 2);
      }
    }
    grid.fill({ color: colorNum, alpha: config.map.gridAlpha });
  } else if (config.map.gridType === 'hex_v' || config.map.gridType === 'hex_h') {
    grid.setStrokeStyle({ width: 1, color: colorNum, alpha: config.map.gridAlpha });
    const type = config.map.gridType;
    const stepX = (type === 'hex_v') ? size * Math.sqrt(3) : size * 1.5;
    const stepY = (type === 'hex_v') ? size * 1.5 : size * Math.sqrt(3);

    const drawnHexes = new Set<string>();
    for (let i = -range; i < range; i += stepX) {
      for (let j = -range; j < range; j += stepY) {
        const { q, r } = pixelToHex(i, j, type, size);
        const key = `${q},${r}`;
        if (drawnHexes.has(key)) continue;
        drawnHexes.add(key);

        const center = hexToPixel(q, r, type, size);
        for (let angle_i = 0; angle_i < 6; angle_i++) {
          const angle_deg = type === 'hex_v' ? 60 * angle_i - 30 : 60 * angle_i;
          const angle_rad = Math.PI / 180 * angle_deg;
          const px = center.x + size * Math.cos(angle_rad);
          const py = center.y + size * Math.sin(angle_rad);
          if (angle_i === 0) grid.moveTo(px, py);
          else grid.lineTo(px, py);
        }
        grid.closePath();
      }
    }
    grid.stroke();
  } else if (config.map.gridType === 'dots_hex') {
    const radius = Math.max(2, size * 0.05);
    const stepX = size * Math.sqrt(3);
    const stepY = size * 1.5;
    const drawnHexes = new Set<string>();
    for (let i = -range; i < range; i += stepX) {
      for (let j = -range; j < range; j += stepY) {
        const { q, r } = pixelToHex(i, j, 'hex_v', size);
        const key = `${q},${r}`;
        if (drawnHexes.has(key)) continue;
        drawnHexes.add(key);

        const center = hexToPixel(q, r, 'hex_v', size);
        grid.rect(center.x - radius, center.y - radius, radius * 2, radius * 2);
      }
    }
    grid.fill({ color: colorNum, alpha: config.map.gridAlpha });
  }
}
