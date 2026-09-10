/// <reference lib="webworker" />
let source: ImageBitmap | null = null;
self.onmessage = async (e: MessageEvent) => {
  try {
    if (e.data.source) {
      source?.close();
      source = await createImageBitmap(
        await (await fetch(e.data.source)).blob(),
      );
      self.postMessage({ ready: true });
      return;
    }
    if (!source) return;
    for (const t of e.data.tiles) {
      const canvas = new OffscreenCanvas(t.width, t.height),
        ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        source,
        t.x,
        t.y,
        t.sourceWidth,
        t.sourceHeight,
        0,
        0,
        t.width,
        t.height,
      );
      const blob = await canvas.convertToBlob({
        type: "image/webp",
        quality: 0.9,
      });
      self.postMessage({ id: t.id, blob });
    }
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
export {};
