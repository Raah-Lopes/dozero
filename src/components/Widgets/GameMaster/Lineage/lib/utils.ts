import { FamilyTree } from "../model/tree";

export function uid(prefix = "p"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function roman(n: number): string {
  if (n <= 0) return "—";
  let out = "";
  let v = n;
  for (const [num, sym] of ROMAN) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out;
}

/* ---------------- cores heráldicas por afiliação ---------------- */

export interface HouseColors {
  accent: string;
  deep: string;
}

const HERALDRY: HouseColors[] = [
  { accent: "#d4a73c", deep: "#57430f" }, // ouro
  { accent: "#c05038", deep: "#54201a" }, // carmesim
  { accent: "#4f9e8b", deep: "#1d4238" }, // verdete
  { accent: "#9a6fc0", deep: "#3c2a52" }, // ametista
  { accent: "#6f93b5", deep: "#2c3f52" }, // aço
  { accent: "#8fae4a", deep: "#39491c" }, // musgo
  { accent: "#c9803f", deep: "#553317" }, // cobre
  { accent: "#b56576", deep: "#4d2430" }, // rosa-antiga
];

export function houseColors(key: string): HouseColors {
  const clean = key.trim().toLowerCase();
  if (!clean) return { accent: "#7d8a76", deep: "#333d31" };
  return HERALDRY[hashString(clean) % HERALDRY.length];
}

/* ---------------- retratos (sempre convertidos para WebP) ---------------- */

export async function fileToWebpPortrait(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo precisa ser uma imagem.");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      i.src = url;
    });
    const MAX = 380;
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível neste navegador.");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/webp", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- persistência local ---------------- */

const storageKey = (roomCode = "local") => `dozero:linhagem:${roomCode}:v1`;

export function loadSavedTree(roomCode?: string): FamilyTree | null {
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    if (!raw) return null;
    return FamilyTree.from(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveTree(tree: FamilyTree, roomCode?: string): void {
  try {
    localStorage.setItem(storageKey(roomCode), tree.serialize());
  } catch {
    /* quota excedida — ignora silenciosamente */
  }
}

/* ---------------- exportação ---------------- */

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
