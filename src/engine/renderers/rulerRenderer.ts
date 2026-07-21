import { Graphics, Text } from 'pixi.js';
import { euclideanDistance } from '../utils/gridUtils';

export function renderRuler(
  rulerGraphic: Graphics,
  rulerText: Text,
  measureStart: { x: number; y: number },
  currentPos: { x: number; y: number },
  gridSize: number,
  scale: number
) {
  const distPx = euclideanDistance(measureStart.x, measureStart.y, currentPos.x, currentPos.y);
  const distMeters = (distPx / gridSize) * 1.5;

  rulerGraphic.clear();
  rulerGraphic.moveTo(measureStart.x, measureStart.y);
  rulerGraphic.lineTo(currentPos.x, currentPos.y);
  rulerGraphic.stroke({ width: 4 / scale, color: 0xff0000, alpha: 0.8 });

  rulerText.text = `${distMeters.toFixed(1)}m`;
  rulerText.x = currentPos.x + 15 / scale;
  rulerText.y = currentPos.y + 15 / scale;
  rulerText.scale.set(1 / scale);
  rulerText.visible = true;
}

export function clearRuler(rulerGraphic: Graphics, rulerText: Text) {
  rulerGraphic.clear();
  rulerText.visible = false;
}
