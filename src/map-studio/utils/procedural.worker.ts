/// <reference lib="webworker" />
import { generateProceduralMap, generateDungeonMap, generateCaveMap } from "./proceduralUtils";
import { ProceduralConfig } from "../types";
self.onmessage = async (
  e: MessageEvent<{ config: ProceduralConfig; mode: string }>,
) => {
  try {
    const c = e.data.config,
      result =
        e.data.mode === "cave"
          ? generateCaveMap(c)
          : e.data.mode === "dungeon"
            ? generateDungeonMap(c)
            : generateProceduralMap(c);
    const canvas = new OffscreenCanvas(c.width, c.height),
      ctx = canvas.getContext("2d")!;
    ctx.putImageData(result.imageData, 0, 0);
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.95,
    });
    const ratio = Math.min(400 / c.width, 300 / c.height, 1),
      small = new OffscreenCanvas(
        Math.round(c.width * ratio),
        Math.round(c.height * ratio),
      );
    small.getContext("2d")!.drawImage(canvas, 0, 0, small.width, small.height);
    const thumbnailUrl = new FileReaderSync().readAsDataURL(
      await small.convertToBlob({ type: "image/webp", quality: 0.8 }),
    );
    self.postMessage({
      imageUrl: new FileReaderSync().readAsDataURL(blob),
      thumbnailUrl,
      imageWidth: c.width,
      imageHeight: c.height,
      locations: result.locations,
      annotations: result.annotations,
      style: c.style,
      generatorConfig: c,
      generatorMode: e.data.mode === "cave" ? "cave" : e.data.mode === "dungeon" ? "dungeon" : "world",
      name: "Forja — " + c.seed,
      description:
        (e.data.mode === "cave" ? "Caverna" : e.data.mode === "dungeon" ? "Masmorra" : "Mundo") +
        " · gerador v2 · semente: " +
        c.seed +
        (e.data.mode !== "dungeon" && e.data.mode !== "cave" && c.cartography?.mode === "relief"
          ? " · relevo sombreado"
          : ""),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Falha ao gerar o mapa.",
    });
  }
};
export {};
