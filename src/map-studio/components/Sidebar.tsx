import { useState, useEffect } from "react";
import { MapProject, MapLocation, MapAnnotation, LocationType } from "../types";
import LocationIcon from "./LocationIcon";
import LocationIconPicker from "./LocationIconPicker";
import { locationTypes, locationTypeLabel } from "../utils/locationIcons";
import {
  MapPin,
  FileText,
  Info,
  X,
  ScrollText,
  AlertCircle,
} from "lucide-react";

import LocationFiltersPanel from "./LocationFiltersPanel";
import {
  matchesLocation,
  type LocationFilters,
} from "../utils/locationFilters";
import { appearsInAnnotationsList } from "../utils/mapSymbols";


import CodexHeader from "./CodexHeader";
// New Drawer component for selected location details
import LocationDetailDrawer from "./LocationDetailDrawer";

interface SidebarProps {
  locationFilters: LocationFilters;
  onChangeFilters: (filters: LocationFilters) => void;
  project: MapProject;
  selectedLocationId: string | null;
  onSelectLocation: (id: string | null) => void;
  onUpdateLocation: (id: string, updates: Partial<MapLocation>) => void;
  onDeleteLocation: (id: string) => void;
  onAddLocation: (location: MapLocation) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddAnnotation?: (annotation: MapAnnotation) => void;
  projects?: MapProject[];
  onOpenMap?: (id: string) => void;
}

export default function Sidebar({
  locationFilters,
  onChangeFilters,
  project,
  selectedLocationId,
  onSelectLocation,
  onUpdateLocation,
  onDeleteLocation,
  onAddLocation,
  onDeleteAnnotation,
  onAddAnnotation,
  projects = [],
  onOpenMap,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<
    "locations" | "annotations" | "details"
  >("locations");

  useEffect(() => {
    if (selectedLocationId) {
      setActiveTab("details");
    }
  }, [selectedLocationId]);

  const selectedLocation = project.locations.find(
    (l) => l.id === selectedLocationId,
  );

  const filteredLocations = project.locations.filter((loc) =>
    matchesLocation(loc, locationFilters),
  );
  const listedAnnotations = project.annotations.filter(
    appearsInAnnotationsList,
  );

  const tabs = [
    {
      id: "locations" as const,
      label: "Locais",
      icon: <MapPin size={12} />,
      count: project.locations.length,
    },
    {
      id: "annotations" as const,
      label: "Anotações",
      icon: <FileText size={12} />,
      count: listedAnnotations.length,
    },
    { id: "details" as const, label: "Detalhes", icon: <Info size={12} /> },
  ];

  // Handlers for toolbar actions
  const handleAddLocation = () => {
    const newLoc: MapLocation = {
      id: `loc-${Date.now()}`,
      name: "Novo Local",
      description: "",
      notes: "",
      tags: [],
      type: "generic" as LocationType,
      hidden: false,
      color: "#ffffff",
      x: 50,
      y: 50,
    };
    onAddLocation(newLoc);
    onSelectLocation(newLoc.id);
    setActiveTab("locations");
  };

  const handleAddAnnotation = () => {
    if (!onAddAnnotation) return;
    const newAnn: MapAnnotation = {
      id: `ann-${Date.now()}`,
      type: "text",
      text: "Nova anotação",
      x: 50,
      y: 50,
    };
    onAddAnnotation(newAnn);
    setActiveTab("annotations");
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name || "codex"}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      className="w-80 flex flex-col shrink-0 overflow-hidden border-r"
      style={{
        background: "var(--dz-graphite)",
        borderColor: "var(--dz-stone)",
      }}
    >
      <CodexHeader
          onAddLocation={handleAddLocation}
          onAddAnnotation={handleAddAnnotation}
          onExport={handleExport}
          query={locationFilters.query}
          onQueryChange={(q) => onChangeFilters({ ...locationFilters, query: q })}
        />

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--dz-stone)" }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-0 flex flex-wrap items-center justify-center gap-1 px-1 py-3 text-[9px] font-semibold uppercase tracking-wide transition-colors relative"
              style={{
                color: active ? "var(--dz-amber-2)" : "var(--dz-parchment-3)",
                background: active ? "rgba(200, 149, 74, 0.06)" : "transparent",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: active
                      ? "rgba(200, 149, 74, 0.2)"
                      : "var(--dz-graphite-3)",
                    color: active
                      ? "var(--dz-amber-2)"
                      : "var(--dz-parchment-3)",
                  }}
                >
                  {tab.count}
                </span>
              )}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-px"
                  style={{ background: "var(--dz-amber)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Left column */}
        <div className={`h-full overflow-auto ${activeTab === "details" ? "hidden" : "block"}`}>
          {activeTab === "locations" && (
            <div className="p-3">
              <LocationFiltersPanel
                locations={project.locations}
                value={locationFilters}
                onChange={onChangeFilters}
                layerHidden={!!project.hiddenLayers?.includes("locais")}
              />

              {/* Lista de locais */}
              <div className="space-y-1">
                {filteredLocations.map((loc) => {
                  const selected = selectedLocationId === loc.id;
                  return (
                    <div
                      key={loc.id}
                      onClick={() => onSelectLocation(loc.id)}
                      onKeyDown={(e) => {
                        if (
                          e.target === e.currentTarget &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          onSelectLocation(loc.id);
                        }
                      }}
                      tabIndex={0}
                      aria-label={"Local " + loc.name}
                      className="group p-2.5 cursor-pointer transition-all"
                      style={{
                        background: selected
                          ? "rgba(200, 149, 74, 0.1)"
                          : "transparent",
                        border: `1px solid ${selected ? "var(--dz-amber)" : "transparent"}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!selected)
                          e.currentTarget.style.background =
                            "var(--dz-graphite-2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!selected)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ opacity: loc.hidden ? 0.4 : 1 }}>
                          <LocationIcon
                            location={loc}
                            size={30}
                            selected={selected}
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-medium truncate"
                            style={{ color: "var(--dz-parchment)" }}
                          >
                            {loc.name}
                          </p>
                          <p
                            className="label-caps mt-0.5"
                            style={{ color: "var(--dz-ash)" }}
                          >
                            {locationTypeLabel(loc.type)}
                            {loc.hidden ? " · oculto" : ""}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLocation(loc.id);
                          }}
                          aria-label="Remover local"
                          title="Remover local"
                          className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                          style={{ color: "var(--dz-ash)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--dz-danger-2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--dz-ash)";
                          }}
                        >
                          <X size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                      {loc.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {loc.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider"
                              style={{
                                background: "var(--dz-graphite-3)",
                                color: "var(--dz-parchment-3)",
                                border: "1px solid var(--dz-stone)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredLocations.length === 0 && (
                  <div className="text-center py-10">
                    <AlertCircle
                      size={24}
                      className="mx-auto mb-2"
                      style={{ color: "var(--dz-ash)" }}
                      strokeWidth={1}
                    />
                    <p className="text-[12px]" style={{ color: "var(--dz-ash)" }}>
                      {project.locations.length === 0
                        ? "Nenhum local registrado"
                        : "Nenhum resultado encontrado"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "annotations" && (
            <div className="p-3 space-y-1">
              {listedAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  className="group p-2.5 flex items-center gap-2"
                  style={{
                    background: "var(--dz-graphite-2)",
                    border: "1px solid var(--dz-stone)",
                  }}
                >
                  <span className="text-sm" style={{ color: "var(--dz-copper)" }}>
                    {ann.type === "symbol"
                      ? ann.text || "✦"
                      : ann.type === "text"
                      ? "✦"
                      : ann.type === "line"
                        ? "―"
                        : ann.type === "arrow"
                          ? "→"
                          : ann.type === "rectangle"
                            ? "□"
                            : ann.type === "circle"
                              ? "○"
                              : "✎"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] truncate"
                      style={{ color: "var(--dz-parchment)" }}
                    >
                      {ann.type === "symbol"
                        ? ann.name
                        : ann.type === "text"
                          ? ann.text
                          : `${ann.type}`}
                    </p>
                    <p
                      className="font-mono text-[10px] mt-0.5"
                      style={{ color: "var(--dz-ash)" }}
                    >
                      ({Math.round(ann.x)}%, {Math.round(ann.y)}%)
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteAnnotation(ann.id)}
                    aria-label="Remover anotação"
                    title="Remover anotação"
                    className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                    style={{ color: "var(--dz-ash)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--dz-danger-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--dz-ash)";
                    }}
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              {listedAnnotations.length === 0 && (
                <div className="text-center py-10">
                  <ScrollText
                    size={24}
                    className="mx-auto mb-2"
                    style={{ color: "var(--dz-ash)" }}
                    strokeWidth={1}
                  />
                  <p className="text-[12px]" style={{ color: "var(--dz-ash)" }}>
                    Nenhuma anotação nomeada
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {activeTab === "details" && selectedLocation && (
          <LocationDetailDrawer
            location={selectedLocation}
            onClose={() => {
              onSelectLocation(null);
              setActiveTab("locations");
            }}
            onUpdateLocation={onUpdateLocation}
            onOpenMap={onOpenMap}
            projects={projects}
          />
        )}
        {activeTab === "details" && !selectedLocation && (
          <div className="h-full flex items-center justify-center p-6 text-center text-xs text-stone-500">
            Selecione um local para consultar e editar seus detalhes.
          </div>
        )}
      </div>
    </aside>
  );
}
