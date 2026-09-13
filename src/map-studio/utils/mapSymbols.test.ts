import { describe, expect, it } from "vitest";
import type { MapAnnotation } from "../types";
import {
  appearsInAnnotationsList,
  getMapSymbol,
  isFocusSymbol,
  mapSymbolGroups,
} from "./mapSymbols";

const symbol = (updates: Partial<MapAnnotation> = {}): MapAnnotation => ({
  id: "symbol-1",
  type: "symbol",
  x: 50,
  y: 50,
  text: "🌲",
  color: "#ffffff",
  strokeWidth: 1,
  ...updates,
});

describe("símbolos cartográficos", () => {
  it("organiza uma biblioteca com relevo, natureza e marcadores", () => {
    expect(mapSymbolGroups.map((group) => group.label)).toEqual(
      expect.arrayContaining([
        "Montanhas e relevo",
        "Florestas e natureza",
        "Pontos de marcação",
      ]),
    );
  });

  it("só lista símbolos que receberam nome ou descrição", () => {
    expect(appearsInAnnotationsList(symbol())).toBe(false);
    expect(appearsInAnnotationsList(symbol({ name: "Bosque Antigo" }))).toBe(
      true,
    );
    expect(
      appearsInAnnotationsList({ ...symbol(), type: "line", name: undefined }),
    ).toBe(true);
  });

  it("reconhece o marcador que aproxima o mapa", () => {
    const focus = getMapSymbol("📍");

    expect(focus?.interaction).toBe("focus");
    expect(isFocusSymbol(symbol({ text: "📍" }))).toBe(true);
  });
});
