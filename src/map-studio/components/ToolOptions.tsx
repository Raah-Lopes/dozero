import type { MapAnnotation, Tool } from "../types";
import { getMapSymbol, mapSymbolGroups } from "../utils/mapSymbols";

export const toolGuidance: Record<Tool, string> = {
  select:
    "Arraste objetos para mover. Shift seleciona vários desenhos; Delete remove. Ctrl+C / Ctrl+V copia e cola.",
  pan: "Arraste para navegar. Use a roda do mouse ou os botões + e − para aproximar.",
  addLocation:
    "Clique para registrar um local. Nome e categoria serão escolhidos na próxima janela.",
  addText:
    "Clique para escrever um texto. Cor e tamanho abaixo valem para os próximos textos.",
  draw: "Arraste para desenhar. Solte para concluir o traçado.",
  addLine: "Clique no início e no fim da linha. Escape cancela.",
  addArrow: "Clique no início e na ponta da seta. Escape cancela.",
  addRectangle: "Clique em dois cantos opostos do retângulo. Escape cancela.",
  addCircle: "Clique no centro e depois na borda do círculo. Escape cancela.",
  addSymbol: "Escolha um símbolo e clique para inseri-lo no mapa.",
  addWall: "Clique nas duas extremidades da parede. Escape cancela.",
  addDoor: "Clique nas duas extremidades da porta. Escape cancela.",
  addLight:
    "Clique para inserir uma luz. Selecione-a para ajustar a cor e o alcance.",
  eraser:
    "Clique em um desenho ou local para enviá-lo à lixeira. Ctrl+Z desfaz.",
  measure:
    "Clique em dois pontos para medir. Ajuste as unidades em Grade e escala.",
};
export const hasToolOptions = (tool: Tool) =>
  !["select", "pan", "addLocation", "addLight", "eraser", "measure"].includes(
    tool,
  );
export default function ToolOptions({
  tool,
  color,
  onColor,
  stroke,
  onStroke,
  fontSize,
  onFontSize,
  filled,
  onFilled,
  material,
  onMaterial,
  symbol,
  onSymbol,
  symbolName,
  onSymbolName,
}: {
  tool: Tool;
  color: string;
  onColor: (value: string) => void;
  stroke: number;
  onStroke: (value: number) => void;
  fontSize: number;
  onFontSize: (value: number) => void;
  filled: boolean;
  onFilled: (value: boolean) => void;
  material?: MapAnnotation["material"];
  onMaterial: (value: MapAnnotation["material"]) => void;
  symbol: string;
  onSymbol: (value: string) => void;
  symbolName: string;
  onSymbolName: (value: string) => void;
}) {
  const text = ["addText", "addSymbol"].includes(tool);
  const area = ["draw", "addRectangle", "addCircle"].includes(tool);
  return (
    <div
      id="tool-options"
      role="group"
      aria-label="Opções da ferramenta ativa"
      className="flex flex-wrap gap-3 items-center px-3 py-2 text-xs border-b border-[#3d2e22]"
    >
      <label>
        Cor{" "}
        <input
          aria-label="Cor do desenho"
          type="color"
          value={color}
          onChange={(e) => onColor(e.target.value)}
        />
      </label>
      {!text && (
        <label>
          Traço{" "}
          <input
            aria-label="Espessura"
            type="number"
            min="1"
            max="100"
            value={stroke}
            onChange={(e) =>
              onStroke(Math.max(1, Math.min(100, +e.target.value)))
            }
            className="w-16"
          />
        </label>
      )}
      {text && (
        <label>
          Tamanho{" "}
          <input
            aria-label="Tamanho do texto"
            type="number"
            min="8"
            max="500"
            value={fontSize}
            onChange={(e) =>
              onFontSize(Math.max(8, Math.min(500, +e.target.value)))
            }
            className="w-16"
          />
        </label>
      )}
      {area && (
        <>
          <label>
            <input
              type="checkbox"
              checked={filled}
              onChange={(e) => onFilled(e.target.checked)}
            />{" "}
            Preencher
          </label>
          <label>
            Piso/terreno{" "}
            <select
              aria-label="Material"
              value={material || ""}
              onChange={(e) =>
                onMaterial(
                  (e.target.value || undefined) as MapAnnotation["material"],
                )
              }
            >
              <option value="">Sem textura</option>
              <option value="grass">Grama</option>
              <option value="stone">Pedra</option>
              <option value="wood">Madeira</option>
              <option value="water">Água</option>
            </select>
          </label>
        </>
      )}
      {tool === "addSymbol" && (
        <>
          <label>
            Símbolo{" "}
            <select
              aria-label="Símbolo"
              value={symbol}
              onChange={(e) => onSymbol(e.target.value)}
            >
              {mapSymbolGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.symbols.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.value} {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Nome/descrição{" "}
            <input
              aria-label="Nome ou descrição do símbolo"
              value={symbolName}
              onChange={(e) => onSymbolName(e.target.value)}
              placeholder="Opcional"
              className="w-48"
            />
          </label>
          <span className="text-stone-400">
            {getMapSymbol(symbol)?.interaction === "focus"
              ? "Este marcador aproxima o mapa quando acionado."
              : "Sem nome, o símbolo não aparece na lista de anotações."}
          </span>
        </>
      )}
      <span className="text-stone-400">Para novos desenhos</span>
    </div>
  );
}
