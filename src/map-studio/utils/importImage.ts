import { MapProject } from "../types";
export function importMapImage(
  file: File,
  signal?: AbortSignal,
): Promise<Partial<MapProject>> {
  return new Promise((resolve, reject) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      reject(new Error("Escolha um arquivo PNG, JPG ou WebP."));
      return;
    }
    if (file.size > 256 * 1024 * 1024) {
      reject(new Error("O arquivo excede 256 MB. Importe uma região menor."));
      return;
    }
    const worker = new Worker(new URL("./image.worker.ts", import.meta.url), {
      type: "module",
    });
    const done = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      done();
      reject(new Error("Importação cancelada."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    worker.onmessage = (e) => {
      done();
      if (e.data.error)
        reject(new Error("Não foi possível importar: " + e.data.error));
      else resolve(e.data);
    };
    worker.onerror = () => {
      done();
      reject(new Error("Falha ao converter a imagem. Tente um arquivo menor."));
    };
    worker.postMessage({ file });
  });
}
