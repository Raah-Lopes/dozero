import { describe, expect, it } from "vitest";
import { getLocationFocusScale } from "./mapViewport";

describe("getLocationFocusScale", () => {
  it("zooms a fitted map in when locating a city", () => {
    expect(getLocationFocusScale(0.5)).toBe(1.25);
  });

  it("preserves a closer zoom chosen by the user", () => {
    expect(getLocationFocusScale(2)).toBe(2);
  });
});
