import type { LocationType, MapLocation } from "../types";

export type LocationFilters = { query: string; types: LocationType[] };
export const emptyLocationFilters: LocationFilters = { query: "", types: [] };
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
export function matchesLocationSearch(location: MapLocation, query: string) {
  const haystack = normalizeSearch(
    [location.name, location.description, ...location.tags].join(" "),
  );
  return normalizeSearch(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
export function matchesLocation(
  location: MapLocation,
  filters: LocationFilters,
) {
  return (
    (!filters.types.length || filters.types.includes(location.type)) &&
    matchesLocationSearch(location, filters.query)
  );
}
