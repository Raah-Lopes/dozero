export function hexRound(q: number, r: number) {
  let s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const q_diff = Math.abs(rq - q);
  const r_diff = Math.abs(rr - r);
  const s_diff = Math.abs(rs - s);
  if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
  else if (r_diff > s_diff) rr = -rq - rs;
  return { q: rq, r: rr };
}

export function euclideanDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function pixelToHex(x: number, y: number, type: 'hex_h' | 'hex_v', size: number) {
  let q: number, r: number;
  if (type === 'hex_h') { // flat-top
    q = (2/3 * x) / size;
    r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
  } else { // pointy-top
    q = (Math.sqrt(3)/3 * x - 1/3 * y) / size;
    r = (2/3 * y) / size;
  }
  return hexRound(q, r);
}

export function hexToPixel(q: number, r: number, type: 'hex_h' | 'hex_v', size: number) {
  let x: number, y: number;
  if (type === 'hex_h') { // flat-top
    x = size * (3/2 * q);
    y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  } else { // pointy-top
    x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    y = size * (3/2 * r);
  }
  return { x, y };
}

export function snapToGrid(x: number, y: number, config: any) {
  if (config.gridType === 'square' || config.gridType === 'dots_square') {
    return {
      x: Math.round(x / config.gridSize) * config.gridSize,
      y: Math.round(y / config.gridSize) * config.gridSize
    };
  } else if (config.gridType === 'hex_h' || config.gridType === 'hex_v' || config.gridType === 'dots_hex') {
    const hexType = (config.gridType === 'hex_h') ? 'hex_h' : 'hex_v';
    const hex = pixelToHex(x, y, hexType, config.gridSize);
    return hexToPixel(hex.q, hex.r, hexType, config.gridSize);
  }
  return { x, y };
}
