const VIEWPORT_MARGIN = 8;

type TooltipRect = Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left'>;

export const getTooltipViewportAdjustment = (
  rect: TooltipRect,
  viewportWidth: number,
  viewportHeight: number,
  margin = VIEWPORT_MARGIN
) => ({
  x: rect.left < margin
    ? margin - rect.left
    : rect.right > viewportWidth - margin
      ? viewportWidth - margin - rect.right
      : 0,
  y: rect.top < margin
    ? margin - rect.top
    : rect.bottom > viewportHeight - margin
      ? viewportHeight - margin - rect.bottom
      : 0
});
