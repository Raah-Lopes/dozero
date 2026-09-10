import type { MapLocation } from "../types";
import {
  emptyLocationFilters,
  matchesLocation,
  matchesLocationSearch,
  type LocationFilters,
} from "../utils/locationFilters";
import { locationIcons, locationTypes } from "../utils/locationIcons";
import LocationIcon from "./LocationIcon";
import { LucideIcons } from "../icons/LucideIcons";

export default function LocationFiltersPanel({
  locations,
  value,
  onChange,
  layerHidden,
}: {
  locations: MapLocation[];
  value: LocationFilters;
  onChange: (filters: LocationFilters) => void;
  layerHidden: boolean;
}) {
  const matchingSearch = locations.filter((l) =>
    matchesLocationSearch(l, value.query),
  );
  const counts = new Map<string, number>();
  matchingSearch.forEach((l) =>
    counts.set(l.type, (counts.get(l.type) || 0) + 1),
  );
  const filtered = locations.filter((l) => matchesLocation(l, value));
  return (
    <div className="space-y-2 mb-3">
      <input
        aria-label="Buscar locais"
        placeholder="Buscar locais..."
        value={value.query}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        className="w-full text-xs"
      />
      <p className="text-[11px] opacity-70">
        Busque por nome, descrição ou etiqueta.
      </p>
      <details>
        <summary className="cursor-pointer text-xs py-2">
          Categorias ·{" "}
          {value.types.length ? `${value.types.length} selecionadas` : "todas"}
        </summary>
        <div
          className="grid grid-cols-2 gap-1 max-h-52 overflow-auto py-1"
          aria-label="Filtrar categorias"
        >
          {locationTypes.map((type) => {
            const item = locationIcons[type];
            const active = value.types.includes(type);
            const LucideComp = (LucideIcons as any)[type];
            return (
              <button
                key={type}
                type="button"
                aria-label={`Filtrar ${item.label}`}
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    ...value,
                    types: active
                      ? value.types.filter((t) => t !== type)
                      : [...value.types, type],
                  })
                }
                className="flex items-center gap-1 text-[11px] text-left p-1 rounded border"
                style={{
                  borderColor: active ? "var(--dz-amber)" : "var(--dz-stone)",
                  background: active ? "#503c24" : "var(--dz-graphite-2)",
                }}
              >
                {LucideComp ? (
                  <LucideComp size={24} />
                ) : (
                  <LocationIcon
                    location={{
                      iconId: type,
                      icon: item.legacy,
                      color: item.color,
                    }}
                    size={24}
                  />
                )}
                <span className="flex-1 truncate">{item.label}</span>
                <span data-category-count={type}>{counts.get(type) || 0}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] opacity-70 pt-1">
          Combine categorias. As contagens acompanham a busca e incluem locais
          ocultos.
        </p>
      </details>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span role="status" data-filter-count>
          {filtered.length} de {locations.length} locais ·{" "}
          {layerHidden ? 0 : filtered.filter((l) => !l.hidden).length} no mapa
        </span>
        {(value.query || value.types.length > 0) && (
          <button
            className="underline shrink-0"
            onClick={() => onChange(emptyLocationFilters)}
          >
            Limpar filtros
          </button>
        )}
      </div>
      <p className="text-[11px] opacity-70">
        Filtros valem para lista, mapa e minimapa nesta sessão. Exportações
        mantêm todos os locais visíveis.
      </p>
    </div>
  );
}
