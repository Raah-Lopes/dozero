import type { MapAnnotation } from "../types";

export interface MapSymbolDefinition {
  value: string;
  label: string;
  interaction?: "focus";
}

export interface MapSymbolGroup {
  label: string;
  symbols: MapSymbolDefinition[];
}

export const mapSymbolGroups: MapSymbolGroup[] = [
  {
    label: "Montanhas e relevo",
    symbols: [
      { value: "⛰️", label: "Montanha" },
      { value: "🏔️", label: "Montanha nevada" },
      { value: "🌋", label: "Vulcão" },
      { value: "🪨", label: "Rocha ou formação" },
    ],
  },
  {
    label: "Florestas e natureza",
    symbols: [
      { value: "🌲", label: "Floresta de coníferas" },
      { value: "🌳", label: "Floresta temperada" },
      { value: "🌴", label: "Palmeiral ou selva" },
      { value: "🍄", label: "Bosque de fungos" },
      { value: "🌾", label: "Campos ou pradaria" },
    ],
  },
  {
    label: "Pontos de marcação",
    symbols: [
      {
        value: "📍",
        label: "Ponto de foco — clique para aproximar",
        interaction: "focus",
      },
      { value: "🚩", label: "Bandeira" },
      { value: "✦", label: "Ponto de interesse" },
      { value: "⚠️", label: "Perigo" },
      { value: "❓", label: "Local desconhecido" },
    ],
  },
  {
    label: "Construções e viagem",
    symbols: [
      { value: "🏰", label: "Castelo" },
      { value: "🏠", label: "Assentamento" },
      { value: "⛪", label: "Templo" },
      { value: "⛺", label: "Acampamento" },
      { value: "⚓", label: "Porto" },
      { value: "🌉", label: "Ponte" },
      { value: "🔥", label: "Fogueira" },
      { value: "💀", label: "Ruína ou ameaça" },
    ],
  },
  {
    label: "Interiores",
    symbols: [
      { value: "🚪", label: "Porta" },
      { value: "🛏️", label: "Cama" },
      { value: "🪑", label: "Assento" },
      { value: "🕯️", label: "Vela" },
      { value: "📦", label: "Baú ou carga" },
    ],
  },
];

export const mapSymbols = mapSymbolGroups.flatMap((group) => group.symbols);

export const getMapSymbol = (value: string) =>
  mapSymbols.find((symbol) => symbol.value === value);

export const isFocusSymbol = (annotation: MapAnnotation) =>
  annotation.type === "symbol" &&
  (annotation.interaction === "focus" || annotation.text === "📍");

export const appearsInAnnotationsList = (annotation: MapAnnotation) =>
  annotation.type !== "symbol" || Boolean(annotation.name?.trim());
