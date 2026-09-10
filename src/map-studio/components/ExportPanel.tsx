import { useRef, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { MapProject, GlossaryEntry } from "../types";
import { MapArtwork } from "./MapDrawing";
import { renderMap, RenderOptions, exportVTT } from "../utils/renderMap";
import { downloadBlob, exportBackup } from "../utils/backup";
export default function ExportPanel({
  project,
  glossary = [],
}: {
  project: MapProject;
  glossary?: GlossaryEntry[];
}) {
  const [options, setOptions] = useState<RenderOptions>({
    format: "png",
    scale: 1,
    quality: 0.95,
    locations: true,
    annotations: true,
    grid: false,
  });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [progress, setProgress] = useState("");
  const cancel = useRef(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    cancel.current = false;
    try {
      await action();
      if (!cancel.current) setMessage("Exportação concluída.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };
  const image = () =>
    run(async () =>
      downloadBlob(
        await renderMap(project, options),
        project.name + "." + options.format,
      ),
    );
  const tiled = () =>
    run(async () => {
      const size = 2048,
        files: Record<string, Uint8Array> = {},
        regions = [];
      const total =
        Math.ceil(project.imageWidth / size) *
        Math.ceil(project.imageHeight / size);
      let count = 0;
      for (let y = 0; y < project.imageHeight; y += size)
        for (let x = 0; x < project.imageWidth; x += size) {
          if (cancel.current) {
            setMessage("Exportação cancelada.");
            return;
          }
          const region = {
              x,
              y,
              width: Math.min(size, project.imageWidth - x),
              height: Math.min(size, project.imageHeight - y),
            },
            name = "regiao-" + x + "-" + y + ".png";
          setProgress("Região " + ++count + " de " + total);
          const blob = await renderMap(
            project,
            { ...options, format: "png", scale: 1 },
            region,
          );
          files[name] = new Uint8Array(await blob.arrayBuffer());
          regions.push({ file: name, ...region });
          await new Promise((r) => setTimeout(r, 0));
        }
      files["regioes.json"] = strToU8(
        JSON.stringify(
          { width: project.imageWidth, height: project.imageHeight, regions },
          null,
          2,
        ),
      );
      downloadBlob(
        new Blob([zipSync(files, { level: 0 }) as BlobPart], {
          type: "application/zip",
        }),
        project.name + "-regioes.zip",
      );
    });
  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-3xl font-display mb-2">Exportar mapa</h1>
      <p className="text-stone-400 mb-6">
        A prévia inclui exatamente as camadas e os elementos selecionados. A
        busca, as categorias e o modo de nomes do editor não limitam a
        exportação. Com locais incluídos, todos os locais visíveis e seus nomes
        aparecem.
      </p>
      <div className="grid grid-cols-[300px_1fr] gap-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["png", "webp", "jpeg", "svg"] as const).map((format) => (
              <button
                key={format}
                className={
                  "dz-button " +
                  (options.format === format ? "bg-amber-900" : "")
                }
                onClick={() => setOptions((o) => ({ ...o, format }))}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="block">
            Qualidade {Math.round(options.quality * 100)}%
            <input
              aria-label="Qualidade da exportação"
              type="range"
              className="w-full"
              min=".1"
              max="1"
              step=".05"
              disabled={["png", "svg"].includes(options.format)}
              value={options.quality}
              onChange={(e) =>
                setOptions((o) => ({ ...o, quality: +e.target.value }))
              }
            />
          </label>
          <div className="flex gap-2">
            {[0.5, 1, 1.5, 2].map((scale) => (
              <button
                key={scale}
                className="dz-button"
                onClick={() => setOptions((o) => ({ ...o, scale }))}
              >
                {scale}×
              </button>
            ))}
          </div>
          <p>
            {Math.round(project.imageWidth * options.scale)} ×{" "}
            {Math.round(project.imageHeight * options.scale)} px
          </p>
          {(
            [
              ["annotations", "Anotações"],
              ["locations", "Locais"],
              ["grid", "Grade"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <input
                aria-label={"Incluir " + label.toLowerCase()}
                type="checkbox"
                checked={options[key]}
                onChange={(e) =>
                  setOptions((o) => ({ ...o, [key]: e.target.checked }))
                }
              />{" "}
              {label}
            </label>
          ))}
          <button className="dz-button w-full" disabled={busy} onClick={image}>
            Exportar Imagem
          </button>
          <button className="dz-button w-full" disabled={busy} onClick={tiled}>
            Exportar regiões (ZIP)
          </button>
          <p className="text-xs text-stone-400">
            Regiões PNG de até 2.048 × 2.048 pixels, escala original, com
            coordenadas para remontagem.
          </p>
          <button
            className="dz-button w-full"
            disabled={busy || project.gridType === "hex"}
            onClick={() =>
              run(async () =>
                downloadBlob(
                  new Blob([JSON.stringify(await exportVTT(project))], {
                    type: "application/json",
                  }),
                  project.name + ".dd2vtt",
                ),
              )
            }
          >
            Exportar Universal VTT
          </button>
          <p className="text-xs text-stone-400">
            Grade quadrada, paredes, portas fechadas e luzes. Requer importador
            compatível no VTT de destino.
          </p>
          <button
            className="dz-button w-full"
            disabled={busy}
            onClick={() =>
              exportBackup(
                { projects: [project], glossary, trash: [] },
                project.name + "-mapa",
              )
            }
          >
            Exportar Dados (JSON)
          </button>
          <p className="text-xs text-stone-400">
            Inclui imagem, objetos editáveis, parâmetros da geração e códice
            deste projeto. Pode ser importado pelo Arquivo.
          </p>
          {busy && (
            <p role="status">
              {progress || "Exportando..."}{" "}
              {progress && (
                <button
                  className="dz-button"
                  onClick={() => {
                    cancel.current = true;
                  }}
                >
                  Cancelar exportação
                </button>
              )}
            </p>
          )}
          {message && <p role="alert">{message}</p>}
        </div>
        <div className="border border-stone-700 p-4 bg-[#10151a] min-w-0">
          <svg
            role="img"
            aria-label="Prévia da exportação"
            viewBox={"0 0 " + project.imageWidth + " " + project.imageHeight}
            className="w-full max-h-[75vh]"
          >
            <MapArtwork
              project={project}
              annotations={options.annotations}
              locations={options.locations}
              grid={options.grid}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
