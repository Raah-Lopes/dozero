import { TILE, type MapData, type ViewOpts } from "./core";
import { renderFull, getStyle } from "./render";

export type ImageFormat = "png" | "jpeg" | "webp";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(filename: string, text: string, mime: string) {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function exportImage(
  map: MapData,
  view: ViewOpts,
  scale: number,
  format: ImageFormat,
  transparent: boolean,
  filename: string,
  onDone: (ok: boolean, msg: string) => void
) {
  try {
    const src = renderFull(map, view, TILE * scale);
    let out = src;
    const useAlpha = transparent && format !== "jpeg";
    if (!useAlpha) {
      out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const c = out.getContext("2d")!;
      c.fillStyle = getStyle(map.styleId).bg;
      c.fillRect(0, 0, out.width, out.height);
      c.drawImage(src, 0, 0);
    }
    out.toBlob(
      (b) => {
        if (!b) {
          onDone(false, "Falha ao gerar a imagem.");
          return;
        }
        const ext = format === "jpeg" ? "jpg" : format;
        downloadBlob(`${filename || "mapa"}.${ext}`, b);
        onDone(true, `${ext.toUpperCase()} exportado · ${src.width}×${src.height}px`);
      },
      `image/${format}`,
      0.92
    );
  } catch {
    onDone(false, "Erro ao exportar a imagem.");
  }
}

/* ---------------- projeto (.json) ---------------- */

function toB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode(...Array.from(u8.subarray(i, i + 0x8000)));
  }
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export function serializeMap(map: MapData): string {
  return JSON.stringify({
    app: "atlas-arcano",
    v: 1,
    name: map.name,
    seed: map.seed,
    w: map.w,
    h: map.h,
    styleId: map.styleId,
    terrain: toB64(map.terrain),
    objects: map.objects,
    labels: map.labels,
    drawings: (map as any).drawings || [],
  });
}

export function deserializeMap(raw: string): MapData {
  const j = JSON.parse(raw);
  if (!j || j.app !== "atlas-arcano" || typeof j.w !== "number" || typeof j.h !== "number") {
    throw new Error("Arquivo de projeto inválido");
  }
  const terrain = fromB64(j.terrain);
  if (terrain.length !== j.w * j.h) throw new Error("Dados de terreno corrompidos");
  return {
    name: String(j.name ?? "Mapa sem nome"),
    seed: Number(j.seed ?? 1),
    w: j.w,
    h: j.h,
    styleId: String(j.styleId ?? "pergaminho"),
    terrain,
    objects: Array.isArray(j.objects) ? j.objects : [],
    labels: Array.isArray(j.labels) ? j.labels : [],
    drawings: Array.isArray(j.drawings) ? j.drawings : [],
  } as any;
}
