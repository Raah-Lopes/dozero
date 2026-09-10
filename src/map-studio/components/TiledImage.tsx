import { useEffect, useMemo, useRef, useState } from "react";
interface Props {
  src: string;
  width: number;
  height: number;
  view: { scale: number; positionX: number; positionY: number };
  viewport: { width: number; height: number };
}
// Keep only tiles around the viewport; a decoded source is owned by the worker.
export default function TiledImage({
  src,
  width,
  height,
  view,
  viewport,
}: Props) {
  const worker = useRef<Worker | null>(null),
    pending = useRef(new Set<string>()),
    cache = useRef(new Map<string, string>());
  const [ready, setReady] = useState(false),
    [version, setVersion] = useState(0),
    [error, setError] = useState("");
  const level = Math.max(0, Math.floor(Math.log2(1 / view.scale))),
    factor = 2 ** level,
    size = 512 * factor;
  const tiles = useMemo(() => {
    const x0 = Math.max(0, Math.floor(-view.positionX / view.scale / size) - 1),
      y0 = Math.max(0, Math.floor(-view.positionY / view.scale / size) - 1),
      x1 = Math.min(
        Math.ceil(width / size) - 1,
        Math.floor((viewport.width - view.positionX) / view.scale / size) + 1,
      ),
      y1 = Math.min(
        Math.ceil(height / size) - 1,
        Math.floor((viewport.height - view.positionY) / view.scale / size) + 1,
      );
    const result = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const sw = Math.min(size, width - x * size),
          sh = Math.min(size, height - y * size);
        result.push({
          id: level + ":" + x + ":" + y,
          x: x * size,
          y: y * size,
          sourceWidth: sw,
          sourceHeight: sh,
          width: Math.ceil(sw / factor),
          height: Math.ceil(sh / factor),
        });
      }
    return result;
  }, [
    level,
    view.positionX,
    view.positionY,
    view.scale,
    viewport.width,
    viewport.height,
    width,
    height,
  ]);
  const active = useRef(new Set<string>());
  active.current = new Set(tiles.map((t) => t.id));
  useEffect(() => {
    setReady(false);
    setError("");
    pending.current.clear();
    cache.current.forEach((url) => URL.revokeObjectURL(url));
    cache.current.clear();
    const w = new Worker(new URL("../utils/tiles.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      if (e.data.ready) {
        setReady(true);
        return;
      }
      if (e.data.error) {
        setError("Falha ao carregar os blocos do mapa. Reabra o projeto.");
        return;
      }
      pending.current.delete(e.data.id);
      if (!active.current.has(e.data.id)) return;
      cache.current.set(e.data.id, URL.createObjectURL(e.data.blob));
      setVersion((v) => v + 1);
    };
    w.postMessage({ source: src });
    return () => {
      w.terminate();
      cache.current.forEach((url) => URL.revokeObjectURL(url));
      cache.current.clear();
    };
  }, [src]);
  useEffect(() => {
    if (!ready) return;
    for (const [id, url] of cache.current)
      if (!active.current.has(id)) {
        URL.revokeObjectURL(url);
        cache.current.delete(id);
      }
    const missing = tiles.filter(
      (t) => !cache.current.has(t.id) && !pending.current.has(t.id),
    );
    missing.forEach((t) => pending.current.add(t.id));
    if (missing.length) worker.current?.postMessage({ tiles: missing });
  }, [ready, tiles, version]);
  return (
    <div
      data-tiled-image="true"
      role="img"
      aria-label="Mapa em alta resolução"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {tiles.map((t) => {
        const url = cache.current.get(t.id);
        return url ? (
          <img
            key={t.id}
            alt=""
            src={url}
            draggable={false}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              width: t.sourceWidth,
              height: t.sourceHeight,
            }}
          />
        ) : null;
      })}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
