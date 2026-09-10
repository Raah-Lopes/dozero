export type LabelMode = "auto" | "all" | "selected";
export type LabelPlacement = {
  x: number;
  y: number;
  anchor: "middle" | "start" | "end";
};
export type LabelPoint = { id: string; name: string; x: number; y: number };
type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  owner?: string;
};
const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const candidates: LabelPlacement[] = [
  { x: 0, y: -44, anchor: "middle" },
  { x: 27, y: -11, anchor: "start" },
  { x: 0, y: 29, anchor: "middle" },
  { x: -27, y: -11, anchor: "end" },
];
// Screen-space buckets keep collision checks local on large collections.
class Occupancy {
  cells = new Map<string, Box[]>();
  keys(box: Box) {
    const keys: string[] = [];
    for (
      let x = Math.floor(box.left / 128);
      x <= Math.floor(box.right / 128);
      x++
    )
      for (
        let y = Math.floor(box.top / 128);
        y <= Math.floor(box.bottom / 128);
        y++
      )
        keys.push(`${x}:${y}`);
    return keys;
  }
  add(box: Box) {
    for (const key of this.keys(box)) {
      const cell = this.cells.get(key);
      if (cell) cell.push(box);
      else this.cells.set(key, [box]);
    }
  }
  collides(box: Box, owner: string) {
    return this.keys(box).some((key) =>
      this.cells
        .get(key)
        ?.some((other) => other.owner !== owner && overlaps(box, other)),
    );
  }
}

/** Points, bounds and measured widths are CSS pixels, independent of map zoom. */
export function arrangeLocationLabels(
  points: LabelPoint[],
  bounds: Box,
  selectedId: string | null,
  mode: LabelMode,
  measure: (name: string) => number,
) {
  const result = new Map<string, LabelPlacement>();
  if (mode === "all") {
    points.forEach((p) => result.set(p.id, candidates[0]));
    return result;
  }
  const visible = points.filter(
    (p) =>
      p.x >= bounds.left - 24 &&
      p.x <= bounds.right + 24 &&
      p.y >= bounds.top &&
      p.y <= bounds.bottom + 36,
  );
  const occupancy = new Occupancy();
  visible.forEach((p) =>
    occupancy.add({
      left: p.x - 21,
      right: p.x + 21,
      top: p.y - 37,
      bottom: p.y + 5,
      owner: p.id,
    }),
  );
  const ordered = [...visible].sort(
    (a, b) => Number(b.id === selectedId) - Number(a.id === selectedId),
  );
  for (const point of ordered) {
    const selected = point.id === selectedId;
    if (mode === "selected" && !selected) continue;
    const width = measure(point.name);
    const boxFor = (placement: LabelPlacement): Box => {
      const left =
        point.x +
        placement.x -
        (placement.anchor === "middle"
          ? width / 2
          : placement.anchor === "end"
            ? width
            : 0);
      return {
        left: left - 5,
        right: left + width + 5,
        top: point.y + placement.y - 21,
        bottom: point.y + placement.y + 7,
      };
    };
    const fits = (box: Box) =>
      box.left >= bounds.left &&
      box.right <= bounds.right &&
      box.top >= bounds.top &&
      box.bottom <= bounds.bottom;
    let placement = candidates.find(
      (c) => fits(boxFor(c)) && !occupancy.collides(boxFor(c), point.id),
    );
    if (!placement && selected) {
      placement = candidates.find((c) => fits(boxFor(c))) || {
        ...candidates[0],
        x:
          Math.max(
            bounds.left + width / 2 + 5,
            Math.min(bounds.right - width / 2 - 5, point.x),
          ) - point.x,
        y:
          Math.max(bounds.top + 21, Math.min(bounds.bottom - 7, point.y - 44)) -
          point.y,
      };
    }
    if (placement) {
      result.set(point.id, placement);
      occupancy.add(boxFor(placement));
    }
  }
  return result;
}

let context: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();
export function measureLocationName(name: string) {
  if (widths.has(name)) return widths.get(name)!;
  if (context === undefined)
    context = document.createElement("canvas").getContext("2d");
  if (context) context.font = "18px Georgia,serif";
  const width = context ? context.measureText(name).width : name.length * 18;
  if (widths.size >= 4096) widths.clear();
  widths.set(name, width);
  return width;
}
