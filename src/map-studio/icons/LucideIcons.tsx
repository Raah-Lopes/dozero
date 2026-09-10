import React from "react";
import {
  TreePine,
  Square,
  DoorOpen,
  Sun,
  Eraser,
  Ruler,
} from "lucide-react";

/**
 * Map semantic icon names to Lucide React components.
 * Exported as a plain object for easy lookup.
 */
export const LucideIcons: Record<string, React.ReactNode> = {
  addSymbol: <TreePine size={15} />, // tree symbol
  addWall: <Square size={15} />, // generic wall
  addDoor: <DoorOpen size={15} />, // door
  addLight: <Sun size={15} />, // light source
  eraser: <Eraser size={15} />, // eraser
  measure: <Ruler size={15} />, // measure tool
};
