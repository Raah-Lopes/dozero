import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GlossaryEntry, MapLocation } from "../types";
import Glossary from "./Glossary";

const location: MapLocation = {
  id: "city-1",
  name: "Vila das Brumas",
  x: 640,
  y: 420,
  description: "Uma vila entre as colinas.",
  type: "city",
  icon: "city",
  color: "#c8954a",
  notes: "",
  tags: [],
};

const entry: GlossaryEntry = {
  id: "entry-1",
  name: "Vila das Brumas",
  description: "Registro da cidade no Códice.",
  type: "local",
  tags: [],
  locationId: location.id,
};

describe("Glossary", () => {
  it("mantém a ação de localizar dentro da entrada vinculada", () => {
    const onLocateLocation = vi.fn();

    render(
      <Glossary
        entries={[entry]}
        locations={[location]}
        onAddEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
        onDeleteEntry={vi.fn()}
        onLocateLocation={onLocateLocation}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Localizar Vila das Brumas no mapa",
      }),
    );

    expect(onLocateLocation).toHaveBeenCalledOnce();
    expect(onLocateLocation).toHaveBeenCalledWith(location.id);
  });
});
