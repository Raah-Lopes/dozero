const LOCATION_FOCUS_SCALE = 1.25;

export const getLocationFocusScale = (currentScale: number) =>
  Math.max(currentScale, LOCATION_FOCUS_SCALE);
