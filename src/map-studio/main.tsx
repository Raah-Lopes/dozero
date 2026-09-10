import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./components/ToastProvider";
import type { MapProject } from "./types";
import { renderMap } from "./utils/renderMap";
import { uploadToSupabaseStorage } from "../services/storageService";
import { queueMapStudioHandoff } from "../services/mapStudioHandoff";
import {
  createMapStudioBackground,
  mapStudioAssetName,
  mapStudioVttUrl,
} from "./integration";

const params = new URLSearchParams(window.location.search);
const roomCode = params.get("room") || "dozero-mesa-principal-v2";
const vttUrl = () => mapStudioVttUrl(roomCode);

async function insertProjectOnGrid(project: MapProject) {
  const image = await renderMap(project, {
    format: "webp",
    scale: 1,
    quality: 0.9,
    annotations: true,
    locations: true,
    grid: false,
  });
  const imageUrl = await uploadToSupabaseStorage(image, mapStudioAssetName(project.name));
  if (!imageUrl) {
    throw new Error("Não foi possível enviar o mapa ao armazenamento da campanha. Entre na sua conta e tente novamente.");
  }

  const background = createMapStudioBackground(project, imageUrl);
  queueMapStudioHandoff(
    roomCode,
    background,
    project.gridEnabled ? project.gridSize : undefined,
  );
  window.location.assign(vttUrl());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    <App onBackToVtt={() => window.location.assign(vttUrl())} onInsertOnGrid={insertProjectOnGrid} />
  </ToastProvider>
);
