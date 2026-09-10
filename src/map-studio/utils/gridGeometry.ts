// Pixel coordinates use the same flat-top hex layout drawn by MapDrawing.Grid.
export function snapGridPoint(
  x: number,
  y: number,
  size: number,
  type: "square" | "hex" = "square",
) {
  if (type === "square")
    return { x: Math.round(x / size) * size, y: Math.round(y / size) * size };
  const radius = size / 2,
    rowHeight = Math.sqrt(3) * radius;
  const px = x - radius,
    py = y - rowHeight / 2;
  const q = (2 * px) / (3 * radius),
    r = (-px / 3 + (Math.sqrt(3) * py) / 3) / radius,
    s = -q - r;
  let rq = Math.round(q),
    rr = Math.round(r),
    rs = Math.round(s);
  const dq = Math.abs(rq - q),
    dr = Math.abs(rr - r),
    ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return {
    x: radius + radius * 1.5 * rq,
    y: rowHeight / 2 + rowHeight * (rr + rq / 2),
  };
}
