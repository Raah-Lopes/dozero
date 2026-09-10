/// <reference lib="webworker" />
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const bitmap = await createImageBitmap(event.data.file);
    const { width, height } = bitmap;
    if (width > 16000 || height > 16000 || width * height > 64000000) {
      bitmap.close();
      throw new Error(
        "Limite desta versão: 64 megapixels e 16.000 pixels por lado. Divida a imagem em regiões antes de importar.",
      );
    }
    const canvas = new OffscreenCanvas(width, height),
      ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a imagem.");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.92,
    });
    const ratio = Math.min(1, 400 / width, 300 / height),
      small = new OffscreenCanvas(
        Math.max(1, Math.round(width * ratio)),
        Math.max(1, Math.round(height * ratio)),
      );
    small.getContext("2d")!.drawImage(canvas, 0, 0, small.width, small.height);
    const thumbnailUrl = new FileReaderSync().readAsDataURL(
      await small.convertToBlob({ type: "image/webp", quality: 0.8 }),
    );
    self.postMessage({
      imageUrl: new FileReaderSync().readAsDataURL(blob),
      thumbnailUrl,
      imageWidth: width,
      imageHeight: height,
    });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "Imagem inválida. Escolha um PNG, JPEG ou WebP válido.",
    });
  }
};
export {};
