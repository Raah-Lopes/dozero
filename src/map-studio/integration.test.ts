import { describe, expect, it } from "vitest";
import type { MapProject } from "./types";
import {
  createMapStudioBackground,
  mapStudioAssetName,
  mapStudioVttUrl,
} from "./integration";
import {
  clearMapStudioHandoff,
  queueMapStudioHandoff,
  readMapStudioHandoff,
} from "../services/mapStudioHandoff";

const project = {
  id: "atlas-1",
  name: "Costa da Névoa",
  imageUrl: null,
  imageWidth: 2000,
  imageHeight: 1500,
  locations: [],
  annotations: [],
} as MapProject;

describe("integração do Atlas com o Grid", () => {
  it("preserva a sala ao voltar para o VTT", () => {
    expect(mapStudioVttUrl("mesa com espaços")).toBe("/vtt.html?room=mesa%20com%20espa%C3%A7os");
  });

  it("cria um fundo do Grid com as dimensões do projeto", () => {
    expect(createMapStudioBackground(project, "https://cdn.test/mapa.webp", "fixed-id")).toEqual({
      id: "map_studio_fixed-id",
      name: "Costa da Névoa",
      imageUrl: "https://cdn.test/mapa.webp",
      x: 1000,
      y: 750,
      width: 2000,
      height: 1500,
      scale: 1,
      opacity: 1,
      locked: false,
      hidden: false,
    });
  });

  it("gera um nome seguro para o arquivo do Storage", () => {
    expect(mapStudioAssetName("Costa da Névoa / Norte")).toBe("mapa_Costa_da_N_voa_Norte.webp");
  });

  it("mantém a entrega pendente até o VTT confirmar o fundo", () => {
    const background = createMapStudioBackground(project, "https://cdn.test/mapa.webp", "handoff-id");
    queueMapStudioHandoff("mesa-qa", background, 70);

    expect(readMapStudioHandoff("outra-mesa")).toBeNull();
    expect(readMapStudioHandoff("mesa-qa")).toMatchObject({
      roomCode: "mesa-qa",
      background: { id: "map_studio_handoff-id" },
      gridSize: 70,
    });

    clearMapStudioHandoff("mesa-qa", "id-errado");
    expect(readMapStudioHandoff("mesa-qa")).not.toBeNull();
    clearMapStudioHandoff("mesa-qa", "map_studio_handoff-id");
    expect(readMapStudioHandoff("mesa-qa")).toBeNull();
  });
});
