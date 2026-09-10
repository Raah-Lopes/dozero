import { useState, useEffect } from "react";
import type { MapLocation } from "../types";
import {
  isLocationIconId,
  locationIcons,
  locationIconIds,
} from "../utils/locationIcons";
import LocationIcon from "./LocationIcon";
import { LucideIcons } from "../icons/LucideIcons";
export default function LocationIconPicker({
  location,
  onChange,
  disabled = false,
}: {
  location: MapLocation;
  onChange: (updates: Partial<MapLocation>) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const known = isLocationIconId(location.iconId);
  const searchable = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const matches = locationIconIds.filter((id) =>
    searchable(locationIcons[id].label).includes(searchable(debouncedSearch.trim())),
  );
  return (
    <details className="border border-stone-700 rounded p-2" key={location.id}>
      <summary className="text-xs cursor-pointer">
        Ícone ·{" "}
        {known ? locationIcons[location.iconId!].label : "Personalizado"}
      </summary>
      <fieldset disabled={disabled} className="space-y-3 pt-3">
        <input
          aria-label="Pesquisar ícones"
          placeholder="Pesquisar ícones..."
          className="w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          className="grid grid-cols-3 gap-1 max-h-56 overflow-auto"
          role="group"
          aria-label="Catálogo de ícones"
        >
          {matches.map((id) => {
            const LucideComp = (LucideIcons as any)[id];
            return (
              <button
                key={id}
                type="button"
                aria-label={"Usar ícone " + locationIcons[id].label}
                aria-pressed={location.iconId === id}
                className="flex flex-col items-center gap-1 rounded p-2 text-[10px] border focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                style={{
                  borderColor: location.iconId === id ? "#dfb978" : "#493b2d",
                  background: location.iconId === id ? "#483722" : "#191713",
                }}
                onClick={() => onChange({ iconId: id })}
              >
                {LucideComp ? (
                  <LucideComp size={30} />
                ) : (
                  <LocationIcon location={{ ...location, iconId: id }} />
                )}
                <span>{locationIcons[id].label}</span>
              </button>
            );
          })}
        </div>
        {!matches.length && (
          <p className="text-xs text-stone-400">Nenhum ícone encontrado.</p>
        )}
        <label className="block text-xs">
          Cor do marcador{" "}
          <input
            aria-label="Cor do local"
            type="color"
            value={
              /^#[0-9a-f]{6}$/i.test(location.color)
                ? location.color
                : "#795337"
            }
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </label>
        <button
          className="dz-button text-xs"
          type="button"
          aria-pressed={!known}
          onClick={() => onChange({ iconId: undefined })}
        >
          Usar ícone personalizado
        </button>
        <label className="block text-xs">
          Emoji ou texto personalizado
          <input
            aria-label="Ícone do local"
            className="w-full mt-1"
            value={location.icon}
            onChange={(e) =>
              onChange({ icon: e.target.value, iconId: undefined })
            }
          />
        </label>
      </fieldset>
    </details>
  );
}
