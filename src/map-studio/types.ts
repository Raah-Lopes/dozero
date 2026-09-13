export interface MapLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
  type: LocationType;
  icon: string;
  iconId?: LocationIconId;
  color: string;
  notes: string;
  tags: string[];
  linkedMapId?: string;
  hidden?: boolean;
}

export type LocationType =
  | "city"
  | "town"
  | "village"
  | "dungeon"
  | "forest"
  | "mountain"
  | "river"
  | "lake"
  | "castle"
  | "temple"
  | "cave"
  | "camp"
  | "port"
  | "bridge"
  | "tower"
  | "ruins"
  | "custom";

export type LocationIconId = LocationType | "entrance" | "room";

export interface Drawing {
  id: string;
  type: string;
  data: any;
}
export interface MapProject {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  thumbnailUrl?: string;
  imageWidth: number;
  imageHeight: number;
  locations: MapLocation[];
  annotations: MapAnnotation[];
  createdAt: Date;
  updatedAt: Date;
  style: MapStyle;
  gridEnabled: boolean;
  gridSize: number;
  gridType?: "square" | "hex";
  scaleUnit?: string;
  unitsPerCell?: number;
  hiddenLayers?: string[];
  lockedLayers?: string[];
  generatorConfig?: ProceduralConfig;
  generatorMode?: "world" | "dungeon" | "cave";
  drawings?: Drawing[];
}

export type MapStyle =
  | "fantasy"
  | "medieval"
  | "modern"
  | "sci-fi"
  | "nautical"
  | "dungeon"
  | "world"
  | "custom";

export interface MapAnnotation {
  id: string;
  type:
    | "text"
    | "line"
    | "circle"
    | "rectangle"
    | "path"
    | "arrow"
    | "symbol"
    | "wall"
    | "door"
    | "light";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  text?: string;
  name?: string;
  interaction?: "focus";
  color: string;
  strokeWidth: number;
  fontSize?: number;
  points?: { x: number; y: number }[];
  fill?: string;
  rotation?: number;
  layer?: string;
  material?: "grass" | "stone" | "water" | "wood";
  hidden?: boolean;
}

export interface GlossaryEntry {
  id: string;
  name: string;
  description: string;
  type: string;
  tags: string[];
  mapId?: string;
  locationId?: string;
}

export type Tool =
  | "select"
  | "pan"
  | "addLocation"
  | "addText"
  | "addLine"
  | "addRectangle"
  | "addCircle"
  | "addArrow"
  | "draw"
  | "eraser"
  | "measure"
  | "addSymbol"
  | "addWall"
  | "addDoor"
  | "addLight";

export interface ProceduralConfig {
  width: number;
  height: number;
  seed: string;
  style: MapStyle;
  terrain: TerrainConfig;
  features: FeatureConfig;
  shape?: "island" | "continents" | "archipelago" | "inland";
  rooms?: number;
  caveDensity?: number;
  routeStyle?: "classic" | "natural";
  cartography?: {
    mode: "classic" | "relief";
    relief: number;
    coast: number;
    biomes?: number;
    texture?: number;
  };
}

export interface TerrainConfig {
  waterLevel: number;
  mountainLevel: number;
  forestDensity: number;
  desertChance: number;
  snowLevel: number;
  noiseScale: number;
  octaves: number;
}

export interface FeatureConfig {
  cities: number;
  towns: number;
  roads: boolean;
  rivers: boolean;
  dungeons: number;
  forests: number;
  mountains: number;
}

export interface ExportOptions {
  format: "png" | "webp" | "jpeg" | "svg" | "json";
  quality: number;
  scale: number;
  includeAnnotations: boolean;
  includeLocations: boolean;
  includeGrid: boolean;
}
