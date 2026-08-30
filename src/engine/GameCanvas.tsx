import React, { useEffect, useRef } from 'react';
import { Tokens, Config, FogOfWar } from '../store/modules';
import { Application, Graphics, Rectangle, Assets, Sprite, Container, Text, AlphaFilter, Texture, FillGradient, BlurFilter } from 'pixi.js';
import { state, updateTokenPosition, toggleTarget, localState, getMapConfig, getSelectedTokens, clearTokenSelection, selectTokensBulk, toggleTokenSelection, getSelectedProps, clearPropSelection, selectPropsBulk, togglePropSelection, clearTargets, updateDrawing, updateDrawingProps, addDrawing, removeDrawing, getFogOps, updateLorePinPosition, removeLorePin, addLorePin, getLorePins, LorePinData, createLorePinFromWikiEntry } from '../store';
import { resolveMediaUrl } from '../services/wiki/mediaResolver';
import { toast } from '../components/UI/Toast';
import { useAuthStore } from '../store/authStore';

import { hexRound, euclideanDistance, pixelToHex, hexToPixel, snapToGrid } from './utils/gridUtils';
import { renderGrid } from './renderers/gridRenderer';
import { renderRuler, clearRuler } from './renderers/rulerRenderer';
import { renderFogOfWar } from './renderers/fogRenderer';
import { addMapWall, removeMapWall } from '../store/walls';

const prevHpMap: Record<string, number> = {};
let lastTokenClickTime = 0;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    let isDestroyed = false;

    // GM check
    // const isGM = localStorage.getItem('isGM') === 'true';

    const initPixi = async () => {
      const app = new Application();
      appRef.current = app;

      try {
        await app.init({
          resizeTo: window,
          backgroundAlpha: 0,
          antialias: true,
        });
      } catch (_e) {
        console.warn("PixiJS Init failed (likely aborted by React):", _e);
        return;
      }

      if (isDestroyed) {
        try { app.destroy(true); } catch (_e) {}
        return;
      }

      if (!canvasRef.current) return;
      canvasRef.current.appendChild(app.canvas as unknown as Node);
      
      const canvasEl = app.canvas as HTMLCanvasElement;
      canvasEl.style.pointerEvents = 'auto';
      canvasEl.style.touchAction = 'none';

      // HTML Text Editor Overlay
      const textEditorInput = document.createElement('textarea');
      textEditorInput.style.position = 'absolute';
      textEditorInput.style.display = 'none';
      textEditorInput.style.background = 'transparent';
      textEditorInput.style.border = '1px dashed rgba(255,255,255,0.5)';
      textEditorInput.style.outline = 'none';
      textEditorInput.style.resize = 'none';
      textEditorInput.style.overflow = 'hidden';
      textEditorInput.style.textAlign = 'center';
      textEditorInput.style.fontFamily = 'Inter, sans-serif';
      textEditorInput.style.zIndex = '1000';
      textEditorInput.style.fontWeight = 'bold';
      textEditorInput.style.margin = '0';
      textEditorInput.style.padding = '0';
      textEditorInput.style.whiteSpace = 'pre-wrap';
      textEditorInput.style.wordBreak = 'break-word';
      
      // Auto resize height when typing
      textEditorInput.addEventListener('input', () => {
        textEditorInput.style.height = 'auto';
        textEditorInput.style.height = textEditorInput.scrollHeight + 'px';
        if (localState.editingTextId) {
           import('../store').then(s => {
             s.updateMapTextProps(localState.editingTextId!, { text: textEditorInput.value });
           }).catch(() => {});
        }
      });

      // Also allow clicking outside to close
      textEditorInput.addEventListener('blur', () => {
         // Keep editing id active for the context bar, or close it?
         // In Photoshop, clicking outside finishes. Let's let the user finish via the context bar or clicking background.
      });

      canvasRef.current.appendChild(textEditorInput);

      // Master Camera Container
      const viewport = new Container();
      viewport.x = window.innerWidth / 2;
      viewport.y = window.innerHeight / 2;
      app.stage.addChild(viewport);

      // UI Overlay for Selection
      const uiLayer = new Container();
      app.stage.addChild(uiLayer);
      
      const selectionBox = new Graphics();
      selectionBox.visible = false;
      uiLayer.addChild(selectionBox);

      // Camera & Selection Controls
      let isPanning = false;
      let panStart = { x: 0, y: 0 };
      
      let isSelecting = false;
      let selectionStart = { x: 0, y: 0 };
      
      let isMeasuring = false;
      let measureStart = { x: 0, y: 0 };
      
      let isDrawing = false;
      let currentDrawingPoints: {x: number, y: number}[] = [];
      const currentDrawingGraphics = new Graphics();
      const drawingSprites: Record<string, Graphics> = {};

      // Touch / Pinch-to-zoom
      const activePointers = new Map<number, {x: number, y: number}>();
      let isPinching = false;
      let pinchStartDist = 0;
      let pinchStartScale = 1;
      let isTouchPanning = false;
      let touchPanStart = { x: 0, y: 0 };
      
      let isEraserActive = false;
      let isFogBrushing = false;
      let fogBrushPoints: { x: number, y: number }[] = [];
      let fogPolygonPoints: {x: number, y: number}[] = [];
      // ponytail: drag-based fog shapes share a single start point
      let fogShapeDragStart: { x: number, y: number } | null = null;
      let isFogLassoing = false;
      let fogLassoPoints: { x: number, y: number }[] = [];
      let wallDrawingStart: { x: number; y: number } | null = null;
      
      let longPressTimer: any = null;
      let longPressStart = { x: 0, y: 0 };

      const getWorldPos = (clientX: number, clientY: number) => ({
        x: (clientX - viewport.x) / viewport.scale.x,
        y: (clientY - viewport.y) / viewport.scale.y
      });

      const removeNearestWallAt = (clientX: number, clientY: number) => {
        const localPos = getWorldPos(clientX, clientY);
        let nearestId: string | null = null;
        let nearestDistance = 18 / Math.max(viewport.scale.x, 0.01);
        const distanceToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const lengthSq = dx * dx + dy * dy;
          const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
          return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
        };
        state.walls.forEach((wall: any, id: string) => {
          if (wall.hidden || wall.locked || !wall.a || !wall.b) return;
          const distance = distanceToSegment(localPos, wall.a, wall.b);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestId = id;
          }
        });
        if (!nearestId) return false;
        removeMapWall(nearestId);
        toast.info('Parede removida.');
        return true;
      };
      
      const handleInsertCanvasImage = (e: Event) => {
        const { src, name } = (e as CustomEvent).detail;
        if (!src) return;
        const img = new Image();
        img.onload = () => {
          import('../store').then(s => {
            const activeLayerId = s.localState.activeLayerId || 'default';
            // Find max zIndex
            let maxZ = 0;
            for (const d of s.state.drawings.values()) {
              if (d.zIndex > maxZ) maxZ = d.zIndex;
            }
            s.addDrawing({
              id: 'draw_' + Date.now() + Math.random().toString(36).substr(2, 5),
              name: name || 'Imagem',
              type: 'image',
              points: [{ x: (window.innerWidth / 2 - viewport.x) / viewport.scale.x, y: (window.innerHeight / 2 - viewport.y) / viewport.scale.y }],
              color: '#ffffff',
              width: 0,
              zIndex: maxZ + 1,
              layerId: activeLayerId,
              imageUrl: src,
              imageWidth: img.naturalWidth || 400,
              imageHeight: img.naturalHeight || 300,
              locked: false,
              hidden: false,
              flipX: false,
              flipY: false,
              rotation: 0,
              skewX: 0,
              skewY: 0
            });
          });
        };
        img.src = src;
      };
      window.addEventListener('insert-canvas-image', handleInsertCanvasImage);

      const handleCanvasZoom = (e: Event) => {
        const delta = (e as CustomEvent).detail || 0;
        const newScale = Math.max(0.15, Math.min(viewport.scale.x + delta, 4));
        viewport.scale.set(newScale);
      };
      const handleCanvasResetView = () => {
        viewport.scale.set(1);
        viewport.x = window.innerWidth / 2;
        viewport.y = window.innerHeight / 2;
      };

      const handleCanvasCenterMap = () => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasItems = false;
        
        const addPoint = (x: number, y: number, hw: number, hh: number) => {
          if (x - hw < minX) minX = x - hw;
          if (x + hw > maxX) maxX = x + hw;
          if (y - hh < minY) minY = y - hh;
          if (y + hh > maxY) maxY = y + hh;
          hasItems = true;
        };

        const bgEntries = Object.values(bgSprites).filter(bg => bg.visible);
        bgEntries.forEach(bg => {
          const hw = Math.abs(bg.width) / 2 || 0;
          const hh = Math.abs(bg.height) / 2 || 0;
          addPoint(bg.x, bg.y, hw, hh);
        });
        
        Array.from(state.drawings.values()).forEach((draw: any) => {
          if (draw.type === 'image' && draw.points && draw.points.length > 0) {
            const hw = (draw.imageWidth || 400) / 2;
            const hh = (draw.imageHeight || 300) / 2;
            addPoint(draw.points[0].x, draw.points[0].y, hw, hh);
          }
        });
        
        if (!hasItems) {
          handleCanvasResetView();
          return;
        }
        
        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const effWidth = mapWidth > 10 ? mapWidth : 1000;
        const effHeight = mapHeight > 10 ? mapHeight : 1000;
        
        const scaleX = window.innerWidth / effWidth;
        const scaleY = window.innerHeight / effHeight;
        
        let newScale = Math.min(scaleX, scaleY) * 0.90;
        if (newScale > 2) newScale = 2;
        if (newScale < 0.01) newScale = 0.01;
        
        viewport.scale.set(newScale);
        viewport.x = window.innerWidth / 2 - centerX * newScale;
        viewport.y = window.innerHeight / 2 - centerY * newScale;
      };

      const handleCanvasFocusSelected = () => {
        const selected = Tokens.getSelectedIds();
        if (selected.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let count = 0;

        selected.forEach(id => {
          const ts = tokenSprites[id];
          if (ts && ts.container) {
            const w = ts.container.width || 100;
            const h = ts.container.height || 100;
            const hw = Math.abs(w) / 2;
            const hh = Math.abs(h) / 2;
            const x = ts.container.x;
            const y = ts.container.y;
            
            if (x - hw < minX) minX = x - hw;
            if (x + hw > maxX) maxX = x + hw;
            if (y - hh < minY) minY = y - hh;
            if (y + hh > maxY) maxY = y + hh;
            count++;
          }
        });

        if (count > 0) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const width = maxX - minX + 300; // Padding
          const height = maxY - minY + 300;
          
          const effWidth = width > 10 ? width : 300;
          const effHeight = height > 10 ? height : 300;

          const scaleX = window.innerWidth / effWidth;
          const scaleY = window.innerHeight / effHeight;
          
          let newScale = Math.min(scaleX, scaleY);
          if (newScale > 2.0) newScale = 2.0;
          if (newScale < 0.1) newScale = 0.1;

          viewport.scale.set(newScale);
          viewport.x = window.innerWidth / 2 - centerX * newScale;
          viewport.y = window.innerHeight / 2 - centerY * newScale;
        }
      };

      const handleCanvasFitAll = () => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasItems = false;
        const addPoint = (x: number, y: number, w: number, h: number) => {
          const hw = Math.abs(w)/2 || 0;
          const hh = Math.abs(h)/2 || 0;
          if (x - hw < minX) minX = x - hw;
          if (y - hh < minY) minY = y - hh;
          if (x + hw > maxX) maxX = x + hw;
          if (y + hh > maxY) maxY = y + hh;
          hasItems = true;
        };
        Object.values(tokenSprites).forEach(ts => {
           if (ts.container && ts.container.visible) addPoint(ts.container.x, ts.container.y, ts.container.width, ts.container.height);
        });
        Object.values(bgSprites).forEach(bg => {
           if (bg.visible) addPoint(bg.x, bg.y, bg.width, bg.height);
        });
        Object.values(propSprites).forEach(prop => {
           if (prop.visible) addPoint(prop.x, prop.y, prop.width, prop.height);
        });
        Array.from(state.drawings.values()).forEach((draw: any) => {
          if (draw.type === 'image' && draw.points && draw.points.length > 0) {
            addPoint(draw.points[0].x, draw.points[0].y, draw.imageWidth || 400, draw.imageHeight || 300);
          } else if (draw.points && draw.points.length > 0) {
            draw.points.forEach((p: any) => addPoint(p.x, p.y, 10, 10));
          }
        });
        if (hasItems && maxX !== -Infinity) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          const width = maxX - minX + 200;
          const height = maxY - minY + 200;
          
          const effWidth = width > 10 ? width : 1000;
          const effHeight = height > 10 ? height : 1000;
          
          const scaleX = window.innerWidth / effWidth;
          const scaleY = window.innerHeight / effHeight;
          let newScale = Math.min(scaleX, scaleY) * 0.90;
          if (newScale > 2) newScale = 2;
          if (newScale < 0.01) newScale = 0.01;
          viewport.scale.set(newScale);
          viewport.x = window.innerWidth / 2 - centerX * newScale;
          viewport.y = window.innerHeight / 2 - centerY * newScale;
        } else {
          handleCanvasResetView();
        }
      };

      const handleCanvasFocusToken = (e: any) => {
        const tokenId = e?.detail?.tokenId;
        if (!tokenId) return;
        const ts = tokenSprites[tokenId];
        if (ts && ts.container) {
          const targetX = ts.container.x;
          const targetY = ts.container.y;
          const targetScale = e?.detail?.scale || 1.2;
          viewport.scale.set(targetScale);
          viewport.x = window.innerWidth / 2 - targetX * targetScale;
          viewport.y = window.innerHeight / 2 - targetY * targetScale;
        }
      };

      const handleCanvasFocusPoint = (e: any) => {
        const { x, y, scale } = e?.detail || {};
        if (typeof x !== 'number' || typeof y !== 'number') return;
        const targetScale = scale || viewport.scale.x || 1;
        viewport.scale.set(targetScale);
        viewport.x = window.innerWidth / 2 - x * targetScale;
        viewport.y = window.innerHeight / 2 - y * targetScale;
      };

      window.addEventListener('canvas-zoom', handleCanvasZoom);
      window.addEventListener('canvas-reset-view', handleCanvasResetView);
      window.addEventListener('canvas-center-map', handleCanvasCenterMap);
      window.addEventListener('canvas-focus-selected', handleCanvasFocusSelected);
      window.addEventListener('canvas-fit-all', handleCanvasFitAll);
      window.addEventListener('canvas-focus-token', handleCanvasFocusToken);
      window.addEventListener('canvas-focus-point', handleCanvasFocusPoint);

      canvasEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = viewport.scale.x * zoomDelta;
        // Limit zoom
        if (newScale > 0.1 && newScale < 5) {
          // Zoom towards mouse
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          const worldX = (mouseX - viewport.x) / viewport.scale.x;
          const worldY = (mouseY - viewport.y) / viewport.scale.y;

          viewport.scale.set(newScale);

          viewport.x = mouseX - worldX * newScale;
          viewport.y = mouseY - worldY * newScale;
        }
      });

      canvasEl.addEventListener('pointerdown', (e) => {

        if (localState.activeTool === 'wall' && e.button === 2) {
          removeNearestWallAt(e.clientX, e.clientY);
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if ((e.shiftKey || localState.activeTool === 'ruler') && e.button === 0) {
           isMeasuring = true;
           measureStart = getWorldPos(e.clientX, e.clientY);
           return;
        }
        if (localState.activeTool === 'fog_brush' && e.button === 0) {
           isFogBrushing = true;
           fogBrushPoints = [getWorldPos(e.clientX, e.clientY)];
           return;
        }
        if (localState.activeTool === 'fog_polygon' && e.button === 0) {
           const pos = getWorldPos(e.clientX, e.clientY);
           if (fogPolygonPoints.length > 2) {
              const first = fogPolygonPoints[0];
              const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
              if (dist < 15 / viewport.scale.x) {
                 FogOfWar.addOp({
                   id: 'fog_' + Date.now() + Math.random().toString(36).substring(2, 7),
                   type: 'polygon',
                   mode: localState.fogMode,
                   geom: { points: [...fogPolygonPoints] }
                 });
                 fogPolygonPoints = [];
                 return;
              }
           }
           fogPolygonPoints.push(pos);
           return;
        }
        // ponytail: drag-based fog shapes (rect, circle, triangle)
        if (['fog_rect', 'fog_circle', 'fog_triangle'].includes(localState.activeTool) && e.button === 0) {
           fogShapeDragStart = getWorldPos(e.clientX, e.clientY);
           return;
        }
        if (localState.activeTool === 'fog_lasso' && e.button === 0) {
           isFogLassoing = true;
           fogLassoPoints = [getWorldPos(e.clientX, e.clientY)];
           return;
        }
        if (localState.activeTool === 'fog_erase' && e.button === 0) {
           const pos = getWorldPos(e.clientX, e.clientY);
           const ops = FogOfWar.getOps();
           for (let i = ops.length - 1; i >= 0; i--) {
             const op = ops[i];
             let hit = false;
             if (op.type === 'circle') {
               const g = op.geom as any;
               hit = Math.hypot(pos.x - g.x, pos.y - g.y) <= g.r;
             } else if (op.type === 'square') {
               const g = op.geom as any;
               hit = pos.x >= g.x - g.w/2 && pos.x <= g.x + g.w/2 && pos.y >= g.y - g.h/2 && pos.y <= g.y + g.h/2;
             } else if (op.type === 'polygon' || op.type === 'path') {
               const g = op.geom as any;
               let inside = false;
               const pts = g.points;
               if (pts && pts.length > 2) {
                 for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
                   const xi = pts[j].x, yi = pts[j].y;
                   const xj = pts[k].x, yj = pts[k].y;
                   const intersect = ((yi > pos.y) !== (yj > pos.y))
                        && (pos.x < (xj - xi) * (pos.y - yi) / (yj - yi) + xi);
                   if (intersect) inside = !inside;
                 }
               }
               hit = inside;
             }
             if (hit) {
               FogOfWar.removeOp(op.id);
               return;
             }
           }
           return;
        }
        
        if (localState.activeTool === 'pan' && e.button === 0) {
          isPanning = true;
          panStart = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
          canvasEl.style.cursor = 'grabbing';
          return;
        }
        if (e.button === 2 || e.button === 1) { // Middle or Right click
          isPanning = true;
          panStart = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
          canvasEl.style.cursor = 'grabbing';
        }
        
        if (e.pointerType === 'touch') {
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointers.size === 2) {
            clearTimeout(longPressTimer);
            isPinching = true;
            isTouchPanning = false;
            const pts = Array.from(activePointers.values());
            pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            pinchStartScale = viewport.scale.x;
          } else if (activePointers.size === 1 && !['eraser', 'pen', 'shape', 'arrow', 'fog-add', 'fog-remove', 'fog_brush', 'fog_polygon', 'fog_rect', 'fog_circle', 'fog_triangle', 'fog_lasso'].includes(localState.activeTool)) {
            isTouchPanning = true;
            touchPanStart = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
            longPressStart = { x: e.clientX, y: e.clientY };
            longPressTimer = setTimeout(() => {
               if (activePointers.size === 1 && isTouchPanning) {
                 isTouchPanning = false;
                 isSelecting = true;
                 const rect = canvasEl.getBoundingClientRect();
                 selectionStart = { x: longPressStart.x - rect.left, y: longPressStart.y - rect.top };
                 selectionBox.clear();
                 selectionBox.visible = true;
                 Tokens.clearSelection();
               }
            }, 500);
          }
        }
        
        // --- ERASER GLOBAL LISTENER ---
        if (localState.activeTool === 'eraser' && e.button === 0) {
            const doErase = (localPos: {x: number, y: number}) => {
                const drawRadius = (localState.drawWidth || 4) * 3 + 10;
                let erasedAnything = false;
                for (const [id, d] of state.drawings.entries()) {
                   const draw = d as any;
                   if (draw.layerId) {
                      const layer = state.drawingLayers?.get(draw.layerId) as any;
                      if (layer && layer.hidden) continue;
                   }
                   if (draw.type === 'path' || draw.type === 'pen' || draw.type === 'arrow') {
                       if (draw.points && draw.points.length > 0) {
                           if (e.shiftKey) {
                               let hit = false;
                               for (let i = 0; i < draw.points.length - 1; i++) {
                                   const p1 = draw.points[i];
                                   const p2 = draw.points[i+1];
                                   const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                                   let t = 0;
                                   if (l2 !== 0) {
                                       t = ((localPos.x - p1.x) * (p2.x - p1.x) + (localPos.y - p1.y) * (p2.y - p1.y)) / l2;
                                       t = Math.max(0, Math.min(1, t));
                                   }
                                   const projX = p1.x + t * (p2.x - p1.x);
                                   const projY = p1.y + t * (p2.y - p1.y);
                                   if (Math.hypot(localPos.x - projX, localPos.y - projY) < drawRadius) {
                                       hit = true; break;
                                   }
                               }
                               if (!hit && draw.points.length === 1 && Math.hypot(localPos.x - draw.points[0].x, localPos.y - draw.points[0].y) < drawRadius) hit = true;
                               if (hit) {
                                   removeDrawing(id);
                                   erasedAnything = true;
                               }
                           } else {
                               let wasErased = false;
                               const chunks: any[][] = [];
                               
                               const pathsToCheck = draw.subPaths && draw.subPaths.length > 0 ? draw.subPaths : [draw.points];
                               
                               for (const path of pathsToCheck) {
                                   let currentChunk: any[] = [];
                                   for (let i = 0; i < path.length; i++) {
                                       const p = path[i];
                                       const hitVertex = Math.hypot(localPos.x - p.x, localPos.y - p.y) <= drawRadius;
                                       let hitSegment = false;
                                       if (i > 0 && !hitVertex) {
                                           const pPrev = path[i-1];
                                           const l2 = Math.pow(pPrev.x - p.x, 2) + Math.pow(pPrev.y - p.y, 2);
                                           let t = 0;
                                           if (l2 !== 0) {
                                               t = ((localPos.x - pPrev.x) * (p.x - pPrev.x) + (localPos.y - pPrev.y) * (p.y - pPrev.y)) / l2;
                                               t = Math.max(0, Math.min(1, t));
                                           }
                                           const projX = pPrev.x + t * (p.x - pPrev.x);
                                           const projY = pPrev.y + t * (p.y - pPrev.y);
                                           hitSegment = Math.hypot(localPos.x - projX, localPos.y - projY) <= drawRadius;
                                       }
                                       if (hitVertex || hitSegment) {
                                           wasErased = true;
                                           if (currentChunk.length > 0) chunks.push(currentChunk);
                                           currentChunk = [];
                                           if (hitSegment) currentChunk.push(p);
                                       } else {
                                           currentChunk.push(p);
                                       }
                                   }
                                   if (currentChunk.length > 0) chunks.push(currentChunk);
                               }
                               
                               if (wasErased) {
                                   const validChunks = chunks.filter(c => c.length > 1);
                                   if (validChunks.length === 0) removeDrawing(id);
                                   else {
                                       updateDrawing(id, { points: validChunks[0], subPaths: validChunks });
                                   }
                                   erasedAnything = true;
                               }
                           }
                       }
                   } else if (draw.type === 'shape') {
                       if (draw.points && draw.points.length >= 2) {
                          const p1 = draw.points[0];
                          const p2 = draw.points[draw.points.length - 1];
                          const minX = Math.min(p1.x, p2.x); const minY = Math.min(p1.y, p2.y);
                          const w = Math.abs(p2.x - p1.x); const h = Math.abs(p2.y - p1.y);
                          if (localPos.x >= minX - drawRadius && localPos.x <= minX + w + drawRadius && localPos.y >= minY - drawRadius && localPos.y <= minY + h + drawRadius) {
                             removeDrawing(id);
                             erasedAnything = true;
                          }
                       }
                   } else if (draw.type === 'image') {
                       const p = draw.points[0];
                       const w = draw.imageWidth || 400;
                       const h = draw.imageHeight || 300;
                       const minX = p.x - w/2; const minY = p.y - h/2;
                       if (localPos.x >= minX - drawRadius && localPos.x <= minX + w + drawRadius && localPos.y >= minY - drawRadius && localPos.y <= minY + h + drawRadius) {
                          removeDrawing(id);
                          erasedAnything = true;
                       }
                   }
                }
                return erasedAnything;
            };
            const rect = canvasEl.getBoundingClientRect();
            doErase(viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top }));
            
            const onEraseMove = (moveEvent: PointerEvent) => doErase(viewport.toLocal({ x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top }));
            const onEraseUp = () => { window.removeEventListener('pointermove', onEraseMove); window.removeEventListener('pointerup', onEraseUp); };
            window.addEventListener('pointermove', onEraseMove);
            window.addEventListener('pointerup', onEraseUp);
            return;
        }

        // Select logic moved to Pixi bgCatcher
      });

      const handleMainPointerMove = (e: PointerEvent) => {
        if (wallDrawingStart && localState.activeTool === 'wall') {
          const currentPos = getWorldPos(e.clientX, e.clientY);
          const wallThickness = Math.max(4, (localState.drawWidth || 4) * 2);
          wallPreview.clear();
          wallPreview.moveTo(wallDrawingStart.x, wallDrawingStart.y);
          wallPreview.lineTo(currentPos.x, currentPos.y);
          wallPreview.stroke({ width: wallThickness + 2, color: '#f97316', alpha: 0.5, cap: 'round' });
          wallPreview.moveTo(wallDrawingStart.x, wallDrawingStart.y);
          wallPreview.lineTo(currentPos.x, currentPos.y);
          wallPreview.stroke({ width: Math.max(1.5, wallThickness * 0.28), color: '#fff1c2', alpha: 0.85, cap: 'round' });
        }

        if (isFogBrushing) {
          const pos = getWorldPos(e.clientX, e.clientY);
          if (fogBrushPoints.length > 0) {
            const last = fogBrushPoints[fogBrushPoints.length - 1];
            if (Math.hypot(pos.x - last.x, pos.y - last.y) > 10) {
              fogBrushPoints.push(pos);
            }
          }
        }
        
        if (isFogLassoing) {
          const pos = getWorldPos(e.clientX, e.clientY);
          if (fogLassoPoints.length > 0) {
            const last = fogLassoPoints[fogLassoPoints.length - 1];
            if (Math.hypot(pos.x - last.x, pos.y - last.y) > 8) {
              fogLassoPoints.push(pos);
            }
          }
        }

        if (localState.activeTool === 'eraser') {
           eraserCursor.visible = true;
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           const drawRadius = (localState.drawWidth || 4) * 3 + 10;
           eraserCursor.clear();
           eraserCursor.circle(localPos.x, localPos.y, drawRadius);
           eraserCursor.stroke({ color: 0xef4444, width: 2 / viewport.scale.x, alpha: 0.9 });
           eraserCursor.fill({ color: 0xef4444, alpha: 0.2 });
        } else if (localState.activeTool === 'wall') {
          eraserCursor.visible = false;
        } else if (localState.activeTool === 'fog_brush') {
           eraserCursor.visible = true;
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           const drawRadius = (localState.drawWidth || 4) * 5 + 10;
           eraserCursor.clear();
           const color = localState.fogMode === 'reveal' ? 0x0ea5e9 : 0x475569;
           
           if (isFogBrushing && fogBrushPoints.length > 0) {
             eraserCursor.moveTo(fogBrushPoints[0].x, fogBrushPoints[0].y);
             for (let i = 1; i < fogBrushPoints.length; i++) {
               eraserCursor.lineTo(fogBrushPoints[i].x, fogBrushPoints[i].y);
             }
             eraserCursor.lineTo(localPos.x, localPos.y);
             eraserCursor.stroke({ color, width: drawRadius * 2, cap: 'round', join: 'round', alpha: 0.5 });
           } else {
             eraserCursor.circle(localPos.x, localPos.y, drawRadius);
             eraserCursor.stroke({ color, width: 2 / viewport.scale.x, alpha: 0.9 });
             eraserCursor.fill({ color, alpha: 0.2 });
           }
        } else if (localState.activeTool === 'fog_polygon') {
           eraserCursor.visible = true;
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           eraserCursor.clear();
           const color = localState.fogMode === 'reveal' ? 0x0ea5e9 : 0x475569;
           if (fogPolygonPoints.length > 0) {
              eraserCursor.moveTo(fogPolygonPoints[0].x, fogPolygonPoints[0].y);
              for (let i = 1; i < fogPolygonPoints.length; i++) eraserCursor.lineTo(fogPolygonPoints[i].x, fogPolygonPoints[i].y);
              eraserCursor.lineTo(localPos.x, localPos.y);
              eraserCursor.stroke({ color, width: 2 / viewport.scale.x, alpha: 0.9 });
              
              const first = fogPolygonPoints[0];
              const screenFirstX = viewport.x + first.x * viewport.scale.x;
              const screenFirstY = viewport.y + first.y * viewport.scale.y;
              if (Math.hypot(e.clientX - screenFirstX, e.clientY - screenFirstY) < 15) {
                 eraserCursor.circle(first.x, first.y, 10 / viewport.scale.x);
                 eraserCursor.fill({ color: 0x10b981, alpha: 0.8 });
              }
           }
        } else if (['fog_rect', 'fog_circle', 'fog_triangle'].includes(localState.activeTool)) {
           eraserCursor.visible = true;
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           eraserCursor.clear();
           const color = localState.fogMode === 'reveal' ? 0x0ea5e9 : 0x475569;
           if (fogShapeDragStart) {
             const s = fogShapeDragStart;
             if (localState.activeTool === 'fog_rect') {
               const x = Math.min(s.x, localPos.x), y = Math.min(s.y, localPos.y);
               const w = Math.abs(localPos.x - s.x), h = Math.abs(localPos.y - s.y);
               eraserCursor.rect(x, y, w, h);
             } else if (localState.activeTool === 'fog_circle') {
               const cx = (s.x + localPos.x) / 2, cy = (s.y + localPos.y) / 2;
               const r = Math.hypot(localPos.x - s.x, localPos.y - s.y) / 2;
               eraserCursor.circle(cx, cy, r);
             } else if (localState.activeTool === 'fog_triangle') {
               const cx = (s.x + localPos.x) / 2;
               eraserCursor.moveTo(cx, s.y);
               eraserCursor.lineTo(localPos.x, localPos.y);
               eraserCursor.lineTo(s.x, localPos.y);
               eraserCursor.lineTo(cx, s.y);
             }
             eraserCursor.stroke({ color, width: 2 / viewport.scale.x, alpha: 0.9 });
             eraserCursor.fill({ color, alpha: 0.15 });
           } else {
             eraserCursor.circle(localPos.x, localPos.y, 6 / viewport.scale.x);
             eraserCursor.fill({ color, alpha: 0.5 });
           }
        } else if (localState.activeTool === 'fog_lasso') {
           eraserCursor.visible = true;
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           eraserCursor.clear();
           const color = localState.fogMode === 'reveal' ? 0x0ea5e9 : 0x475569;
           if (fogLassoPoints.length > 0) {
             eraserCursor.moveTo(fogLassoPoints[0].x, fogLassoPoints[0].y);
             for (let i = 1; i < fogLassoPoints.length; i++) eraserCursor.lineTo(fogLassoPoints[i].x, fogLassoPoints[i].y);
             eraserCursor.lineTo(localPos.x, localPos.y);
             eraserCursor.lineTo(fogLassoPoints[0].x, fogLassoPoints[0].y);
             eraserCursor.stroke({ color, width: 2 / viewport.scale.x, alpha: 0.9 });
             eraserCursor.fill({ color, alpha: 0.1 });
           } else {
             eraserCursor.circle(localPos.x, localPos.y, 6 / viewport.scale.x);
             eraserCursor.fill({ color, alpha: 0.5 });
           }
        } else {
           if (eraserCursor.visible) eraserCursor.visible = false;
        }

        if (e.pointerType === 'touch' && activePointers.has(e.pointerId)) {
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          
          if (activePointers.size === 2 && isPinching) {
            const pts = Array.from(activePointers.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const zoomDelta = dist / pinchStartDist;
            let newScale = pinchStartScale * zoomDelta;
            
            if (newScale > 0.1 && newScale < 5) {
              const centerX = (pts[0].x + pts[1].x) / 2;
              const centerY = (pts[0].y + pts[1].y) / 2;
              const worldX = (centerX - viewport.x) / viewport.scale.x;
              const worldY = (centerY - viewport.y) / viewport.scale.y;

              viewport.scale.set(newScale);
              viewport.x = centerX - worldX * newScale;
              viewport.y = centerY - worldY * newScale;
            }
          } else if (activePointers.size === 1 && isTouchPanning && !draggingTokenId && !draggingBgId && !draggingTextId) {
            if (longPressTimer) {
              const dist = Math.hypot(e.clientX - longPressStart.x, e.clientY - longPressStart.y);
              if (dist > 10) {
                 clearTimeout(longPressTimer);
                 longPressTimer = null;
              }
            }
            viewport.x = e.clientX - touchPanStart.x;
            viewport.y = e.clientY - touchPanStart.y;
          }
        }

        if (isPanning) {
          viewport.x = e.clientX - panStart.x;
          viewport.y = e.clientY - panStart.y;
        }
        if (isSelecting) {
          const width = e.clientX - selectionStart.x;
          const height = e.clientY - selectionStart.y;
          selectionBox.clear();
          selectionBox.rect(selectionStart.x, selectionStart.y, width, height);
          selectionBox.fill({ color: 0x0ea5e9, alpha: 0.15 });
          selectionBox.stroke({ width: 1, color: 0x0ea5e9, alpha: 0.8 });
        }
        if (isMeasuring) {
          const currentPos = getWorldPos(e.clientX, e.clientY);
          const config = Config.getAll();
          renderRuler(rulerGraphic, rulerText, measureStart, currentPos, config.map.gridSize, viewport.scale.x);
        }
        
        if (isDrawing) {
            const currentPos = getWorldPos(e.clientX, e.clientY);
            currentDrawingPoints.push(currentPos);
            
            const colorStr = localState.drawColor || '#ef4444';
            const color = colorStr.startsWith('#') ? parseInt(colorStr.replace('#', '0x'), 16) : parseInt(colorStr, 16);
            const width = localState.drawWidth || 4;
            
            currentDrawingGraphics.clear();
            if (localState.activeTool === 'pen') {
               if (currentDrawingPoints.length < 3) {
                  currentDrawingGraphics.moveTo(currentDrawingPoints[0].x, currentDrawingPoints[0].y);
                  for (let i = 1; i < currentDrawingPoints.length; i++) {
                    currentDrawingGraphics.lineTo(currentDrawingPoints[i].x, currentDrawingPoints[i].y);
                  }
               } else {
                  currentDrawingGraphics.moveTo(currentDrawingPoints[0].x, currentDrawingPoints[0].y);
                  let i = 1;
                  for (i = 1; i < currentDrawingPoints.length - 2; i++) {
                    const xc = (currentDrawingPoints[i].x + currentDrawingPoints[i + 1].x) / 2;
                    const yc = (currentDrawingPoints[i].y + currentDrawingPoints[i + 1].y) / 2;
                    currentDrawingGraphics.quadraticCurveTo(currentDrawingPoints[i].x, currentDrawingPoints[i].y, xc, yc);
                  }
                  currentDrawingGraphics.quadraticCurveTo(currentDrawingPoints[i].x, currentDrawingPoints[i].y, currentDrawingPoints[i + 1].x, currentDrawingPoints[i + 1].y);
               }
               currentDrawingGraphics.stroke({ width, color, alpha: 1, cap: 'round', join: 'round' });
            } else if (localState.activeTool === 'shape') {
               const p1 = currentDrawingPoints[0];
               const p2 = currentDrawingPoints[currentDrawingPoints.length - 1];
               const minX = Math.min(p1.x, p2.x);
               const minY = Math.min(p1.y, p2.y);
               const w = Math.abs(p2.x - p1.x);
               const h = Math.abs(p2.y - p1.y);
               if (localState.activeShapeType === 'rectangle') {
                 currentDrawingGraphics.rect(minX, minY, w, h);
               } else if (localState.activeShapeType === 'circle') {
                 currentDrawingGraphics.ellipse(minX + w/2, minY + h/2, w/2, h/2);
               } else if (localState.activeShapeType === 'triangle') {
                 currentDrawingGraphics.moveTo(minX + w/2, minY);
                 currentDrawingGraphics.lineTo(minX + w, minY + h);
                 currentDrawingGraphics.lineTo(minX, minY + h);
                 currentDrawingGraphics.closePath();
               }
               currentDrawingGraphics.stroke({ width, color, alpha: 1 });
            } else if (localState.activeTool === 'arrow') {
               const p1 = currentDrawingPoints[0];
               const p2 = currentDrawingPoints[currentDrawingPoints.length - 1];
               currentDrawingGraphics.moveTo(p1.x, p1.y);
               currentDrawingGraphics.lineTo(p2.x, p2.y);
               
               const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
               const headlen = width * 3;
               currentDrawingGraphics.moveTo(p2.x, p2.y);
               currentDrawingGraphics.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
               currentDrawingGraphics.moveTo(p2.x, p2.y);
               currentDrawingGraphics.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
               currentDrawingGraphics.stroke({ width, color, alpha: 1 });
            }
        }
      };

      window.addEventListener('pointermove', handleMainPointerMove);
      const handlePointerUp = (e: PointerEvent) => {
        if (wallDrawingStart && localState.activeTool === 'wall') {
          const end = getWorldPos(e.clientX, e.clientY);
          const start = wallDrawingStart;
          wallDrawingStart = null;
          wallPreview.clear();
          wallPreview.visible = false;
          if (Math.hypot(end.x - start.x, end.y - start.y) > 12) {
            addMapWall({
              a: start,
              b: end,
              thickness: Math.max(4, (localState.drawWidth || 4) * 2),
              color: '#f97316',
            });
            toast.success('Parede criada — ela bloqueia a luz.');
          }
        }

        if (isFogBrushing) {
          if (fogBrushPoints.length > 1) {
            FogOfWar.addOp({
              id: 'fog_' + Date.now() + Math.random().toString(36).substring(2, 7),
              type: 'path',
              mode: localState.fogMode,
              geom: { points: [...fogBrushPoints], width: (localState.drawWidth || 4) * 5 * 2 + 20 }
            });
          } else if (fogBrushPoints.length === 1) {
            FogOfWar.addOp({
              id: 'fog_' + Date.now() + Math.random().toString(36).substring(2, 7),
              type: 'circle',
              mode: localState.fogMode,
              geom: { x: fogBrushPoints[0].x, y: fogBrushPoints[0].y, r: (localState.drawWidth || 4) * 5 + 10 }
            });
          }
          fogBrushPoints = [];
          isFogBrushing = false;
        }
        // ponytail: drag-based fog shapes commit on mouseup
        if (fogShapeDragStart && ['fog_rect', 'fog_circle', 'fog_triangle'].includes(localState.activeTool)) {
          const end = getWorldPos(e.clientX, e.clientY);
          const s = fogShapeDragStart;
          const dx = end.x - s.x, dy = end.y - s.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            const id = 'fog_' + Date.now() + Math.random().toString(36).substring(2, 7);
            if (localState.activeTool === 'fog_rect') {
              FogOfWar.addOp({ id, type: 'square', mode: localState.fogMode, geom: { x: (s.x + end.x) / 2, y: (s.y + end.y) / 2, w: Math.abs(dx), h: Math.abs(dy) } });
            } else if (localState.activeTool === 'fog_circle') {
              const r = Math.hypot(dx, dy) / 2;
              FogOfWar.addOp({ id, type: 'circle', mode: localState.fogMode, geom: { x: (s.x + end.x) / 2, y: (s.y + end.y) / 2, r } });
            } else if (localState.activeTool === 'fog_triangle') {
              const cx = (s.x + end.x) / 2;
              FogOfWar.addOp({ id, type: 'polygon', mode: localState.fogMode, geom: { points: [{ x: cx, y: s.y }, { x: end.x, y: end.y }, { x: s.x, y: end.y }] } });
            }
          }
          fogShapeDragStart = null;
        }
        if (isFogLassoing) {
          if (fogLassoPoints.length > 2) {
            FogOfWar.addOp({ id: 'fog_' + Date.now() + Math.random().toString(36).substring(2, 7), type: 'polygon', mode: localState.fogMode, geom: { points: [...fogLassoPoints] } });
          }
          fogLassoPoints = [];
          isFogLassoing = false;
        }
        clearTimeout(longPressTimer);
        longPressTimer = null;
        
        if (e.pointerType === 'touch') {
          activePointers.delete(e.pointerId);
          if (activePointers.size < 2) isPinching = false;
          if (activePointers.size === 0) isTouchPanning = false;
          if (activePointers.size === 1) {
            const remaining = Array.from(activePointers.values())[0];
            touchPanStart = { x: remaining.x - viewport.x, y: remaining.y - viewport.y };
          }
        }

        if (isPanning) {
          isPanning = false;
          canvasEl.style.cursor = 'default';
        }
        if (isMeasuring) {
          isMeasuring = false;
          clearRuler(rulerGraphic, rulerText);
        }
        
        if (isDrawing) {
            isDrawing = false;
            currentDrawingGraphics.visible = false;
            
            if (currentDrawingPoints.length > 1) {
                import('../store').then(s => {
                   const layerId = localState.activeDrawingLayerId || 'default';
                   const newPoints = [...currentDrawingPoints];
                   const activeShape = localState.activeTool === 'shape' ? localState.activeShapeType : undefined;

                   // Se a auto-fusão estiver ligada e for ferramenta de forma, fundir com formas sobrepostas
                   if (localState.activeTool === 'shape' && (localState as any).autoFuseShapes) {
                      const candidate = { points: newPoints, subShapes: [{ shapeType: activeShape || 'rectangle', points: newPoints }] };
                      const shapesOnLayer = Array.from(state.drawings.values() as IterableIterator<any>).filter(
                         d => d.type === 'shape' && (d.layerId || 'default') === layerId
                      );

                      const targetToMerge = shapesOnLayer.find(d => s.doShapesOverlap(d, candidate));
                      if (targetToMerge) {
                         const currentSubShapes = targetToMerge.subShapes && targetToMerge.subShapes.length > 0
                            ? [...targetToMerge.subShapes]
                            : [{ shapeType: targetToMerge.shapeType || 'rectangle', points: [...targetToMerge.points] }];
                         
                         currentSubShapes.push({
                            shapeType: activeShape || 'rectangle',
                            points: newPoints
                         });

                         s.updateDrawing(targetToMerge.id, {
                            subShapes: currentSubShapes,
                            shapeType: 'fused',
                            isFused: true,
                            name: targetToMerge.name ? `${targetToMerge.name} (Fundida)` : 'Forma Fundida'
                         });
                         return;
                      }
                   }

                   const maxZ = Math.max(
                      ...Array.from(state.backgrounds.values()).map((b: any) => b.zIndex || 0),
                      ...Array.from(state.drawings.values()).map((d: any) => d.zIndex || 0),
                      0
                   );
                   s.addDrawing({
                      id: 'draw_' + Date.now() + Math.random().toString(36).substr(2, 5),
                      type: localState.activeTool === 'shape' ? 'shape' : (localState.activeTool as any),
                      shapeType: localState.activeTool === 'shape' ? localState.activeShapeType : undefined,
                      points: newPoints,
                      color: localState.drawColor || '#ef4444',
                      width: localState.drawWidth || 4,
                      zIndex: maxZ + 1,
                      layerId: layerId
                   });
                });
            }
        }
        if (isSelecting) {
          isSelecting = false;
          selectionBox.visible = false;
          
          const selectRect = new Rectangle(
            Math.min(selectionStart.x, e.clientX),
            Math.min(selectionStart.y, e.clientY),
            Math.abs(e.clientX - selectionStart.x),
            Math.abs(e.clientY - selectionStart.y)
          );
          
          const toSelectTokens: string[] = [];
          for (const id in tokenSprites) {
            const t = tokenSprites[id].container;
            const globalPos = t.getGlobalPosition();
            if (selectRect.contains(globalPos.x, globalPos.y)) {
              toSelectTokens.push(id);
            }
          }
          
          const toSelectProps: string[] = [];
          for (const id in propSprites) {
            const pState = state.props.get(id) as any;
            if (pState && pState.isLocked) continue; // Do not select locked props
            const sprite = propSprites[id];
            const globalPos = sprite.getGlobalPosition();
            if (selectRect.contains(globalPos.x, globalPos.y)) {
              toSelectProps.push(id);
            }
          }
          
          if (toSelectTokens.length > 0) {
            Tokens.selectBulk(toSelectTokens);
          } else {
            Tokens.clearSelection();
          }
          
          if (toSelectProps.length > 0) {
            selectPropsBulk(toSelectProps);
          } else {
            clearPropSelection();
          }
        }
      };

      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);

      const baseCleanup = (app as any)._cleanupNativeEvents;
      (app as any)._cleanupNativeEvents = () => {
        if (baseCleanup) baseCleanup();
        window.removeEventListener('pointermove', handleMainPointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      // HTML5 Drag and Drop to spawn/move tokens
      canvasEl.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer!.dropEffect = 'move';
      });

      canvasEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const tokenId = e.dataTransfer?.getData('tokenId');
        const lorePinWikiPath = e.dataTransfer?.getData('lorePinWikiPath');
        const wikiPath = e.dataTransfer?.getData('wikiPath');
        const textData = e.dataTransfer?.getData('application/json');

        if (tokenId || lorePinWikiPath || wikiPath || textData) {
          const rect = canvasEl.getBoundingClientRect();
          const dropX = e.clientX - rect.left;
          const dropY = e.clientY - rect.top;
          
          // Convert to world coordinates
          const worldPoint = viewport.toLocal({ x: dropX, y: dropY });
          
          // Snap to grid
          const config = Config.getAll();
          const snapped = snapToGrid(worldPoint.x, worldPoint.y, config);
          
          if (lorePinWikiPath) {
            const title = e.dataTransfer?.getData('lorePinTitle') || 'Ponto de Interesse';
            const entityType = e.dataTransfer?.getData('lorePinType') || 'local';
            addLorePin({
              x: snapped.x,
              y: snapped.y,
              title,
              wikiPath: lorePinWikiPath,
              entityType
            });
            toast.success(`📍 Pin "${title}" fixado no mapa!`);
          } else if (tokenId) {
            Tokens.update(tokenId, { x: snapped.x, y: snapped.y });
          } else if (wikiPath) {
            // Se segurar Shift ou Alt durante o drop, cria um Pin de Lore em vez de Token
            if (e.shiftKey || e.altKey) {
              const fileName = wikiPath.split('/').pop()?.replace(/\.md$/i, '').replace(/_/g, ' ') || 'Ponto de Interesse';
              addLorePin({
                x: snapped.x,
                y: snapped.y,
                title: fileName,
                wikiPath,
                entityType: 'local'
              });
              toast.success(`📍 Pin de Lore "${fileName}" adicionado!`);
            } else {
              window.dispatchEvent(new CustomEvent('spawn-token-from-wiki', {
                detail: { wikiPath, x: snapped.x, y: snapped.y }
              }));
            }
          } else if (textData) {
            try {
              const parsed = JSON.parse(textData);
              if (parsed.type === 'lore-pin' || parsed.type === 'lorePin') {
                addLorePin({
                  x: snapped.x,
                  y: snapped.y,
                  title: parsed.title || parsed.name || 'Ponto de Interesse',
                  wikiPath: parsed.wikiPath || parsed.path,
                  entityType: parsed.entityType || 'local',
                  description: parsed.description
                });
                toast.success(`📍 Pin de Lore fixado no mapa!`);
              } else if (parsed.type === 'prop') {
                import('../store/props').then(m => {
                  m.addMapProp({
                    name: parsed.name,
                    imageUrl: parsed.url,
                    x: snapped.x,
                    y: snapped.y,
                    scale: 1 / viewport.scale.x, // Start proportional to current zoom
                    rotation: 0
                  });
                });
              }
            } catch(err) {}
          }
        }
      });
      // Prevent context menu
      canvasEl.addEventListener('contextmenu', e => e.preventDefault());

      // Backgrounds Container (under the grid)
      const propsContainer = new Container();
      propsContainer.eventMode = 'static';
      viewport.addChild(propsContainer);

      const bgsContainer = new Container();
      bgsContainer.sortableChildren = true;
      viewport.addChild(bgsContainer);
      bgsContainer.addChild(currentDrawingGraphics);

      // Gizmo Container for selected backgrounds
      const gizmoContainer = new Container();
      viewport.addChild(gizmoContainer);

      // Create an infinite grid background
      const grid = new Graphics();
      viewport.addChild(grid);

      // Paredes táticas ficam acima do mapa e abaixo dos tokens. A mesma
      // geometria é enviada ao raycasting para impedir que a luz atravesse.
      const wallsContainer = new Container();
      wallsContainer.eventMode = 'none';
      wallsContainer.interactiveChildren = false;
      viewport.addChild(wallsContainer);
      const wallPreview = new Graphics();
      wallPreview.visible = false;
      wallPreview.eventMode = 'none';
      wallsContainer.addChild(wallPreview);

      let tokensContainer = new Container();
      tokensContainer.zIndex = 100;
      viewport.addChild(tokensContainer);

      let textsContainer = new Container();
      textsContainer.zIndex = 110;
      viewport.addChild(textsContainer);

      let lorePinsContainer = new Container();
      lorePinsContainer.zIndex = 115;
      viewport.addChild(lorePinsContainer);

      // Fog of War Overlay System
      const fogContainer = new Container();
      fogContainer.zIndex = 500;
      fogContainer.eventMode = 'none';
      fogContainer.interactiveChildren = false;
      fogContainer.filters = [new AlphaFilter({ alpha: 1 })]; // Forces it to render to an offscreen texture, allowing ERASE blend mode to work safely
      viewport.addChild(fogContainer);

      const fogOverlay = new Graphics();
      fogOverlay.eventMode = 'none';
      fogContainer.addChild(fogOverlay);

      // Ruler Graphics
      const rulerGraphic = new Graphics();
      viewport.addChild(rulerGraphic);
      const rulerText = new Text({
        text: '0m',
        style: {
          fontFamily: 'Arial',
          fontSize: 24,
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 4 },
          dropShadow: { color: 0x000000, alpha: 0.8, distance: 2, blur: 2 }
        }
      });
      rulerText.visible = false;
      viewport.addChild(rulerText);

      // Visual Eraser Cursor
      const eraserCursor = new Graphics();
      eraserCursor.eventMode = 'none';
      eraserCursor.visible = false;
      viewport.addChild(eraserCursor);

      const drawGrid = () => {
        grid.clear();
        const config = Config.getAll();
        
        if (config.map.mapBackgroundColor && config.map.mapBackgroundColor !== 'transparent') {
          app.renderer.background.alpha = 1;
          app.renderer.background.color = config.map.mapBackgroundColor.startsWith('#') 
            ? parseInt(config.map.mapBackgroundColor.replace('#', '0x'), 16) 
            : 0x000000;
        } else {
          app.renderer.background.alpha = 0;
        }

        renderGrid(grid, config);
      };

      let lastFowHash = '';
      
      const propSprites: Record<string, Sprite> = {};
      const propHoverTexts: Record<string, Text> = {};

      const drawFogOfWar = () => {
        const config = Config.getAll();
        const tokens = Array.from(state.tokens.values()) as any[];
        
        // Determinar quais tokens geram visão (apenas os que tem hasVision ativo, default true).
        // Se fowHideTokens estiver ativo e houver tokens selecionados, a visão é gerada APENAS pelos tokens selecionados (Player View).
        // Assim, os monstros deselecionados não geram buracos na névoa e podem ser escondidos.
        let visionSources = tokens.filter(t => t.hasVision !== false);
        if (localState.selectedTokens && localState.selectedTokens.size > 0) {
           // Se houver seleção, apenas os tokens selecionados geram visão (útil pro GM testar visão de NPC)
           visionSources = visionSources.filter(t => localState.selectedTokens.has(t.id));
        } else {
           // Por padrão, apenas personagens dos jogadores geram visão
           visionSources = visionSources.filter(t => t.isPlayer);
        }

        const currentHash = JSON.stringify({
          enabled: config.fog.enabled,
          radius: config.fog.radius,
          shape: config.fog.shape,
          color: config.fog.color,
          viewport: { x: viewport.x, y: viewport.y, scale: viewport.scale.x },
          visionSources: visionSources.map(t => ({ id: t.id, x: t.x, y: t.y, visionRadius: t.visionRadius, visionStyle: t.visionStyle })),
          walls: Array.from(state.walls.values()),
          opsCount: FogOfWar.getOps().length
        });
        
        if (currentHash === lastFowHash) return;
        lastFowHash = currentHash;

        renderFogOfWar(fogContainer, fogOverlay, config, viewport, visionSources, Array.from(state.walls.values()));
        
        if (config.fog.enabled) {

          // Hide tokens if requested
          if (config.fog.hideTokens) {
            Object.entries(tokenSprites).forEach(([id, spriteRecord]) => {
              const t = state.tokens.get(id) as any;
              if (!t) return;
              
              // Se o token for a fonte de visão, sempre visível
              if (visionSources.some(src => src.id === id)) {
                spriteRecord.container.visible = true;
                return;
              }

              // Checar se o token t está dentro do buraco de visão de ALGUMA visionSource
              let isVisible = false;
              for (const src of visionSources) {
                const radius = src.visionRadius || ((config.fog.radius || 6) * config.map.gridSize);
                const dx = Math.abs(t.x - src.x);
                const dy = Math.abs(t.y - src.y);
                
                if (config.fog.shape === 'square') {
                  if (dx <= radius && dy <= radius) isVisible = true;
                } else if (config.fog.shape === 'hexagon') {
                  // Aproximação hexagonal simples
                  if (euclideanDistance(t.x, t.y, src.x, src.y) <= radius * 1.1) isVisible = true;
                } else {
                  if (euclideanDistance(t.x, t.y, src.x, src.y) <= radius) isVisible = true;
                }
                if (isVisible) break;
              }
              
              spriteRecord.container.visible = isVisible;
            });

            // Hide Props as well
            Object.entries(propSprites).forEach(([id, sprite]) => {
              const p = state.props.get(id) as any;
              if (!p) return;
              if (p.isHidden) {
                 sprite.visible = false;
                 if (propHoverTexts[id]) propHoverTexts[id].visible = false;
                 return;
              }
              
              let isVisible = false;
              for (const src of visionSources) {
                const radius = src.visionRadius || ((config.fog.radius || 6) * config.map.gridSize);
                const dx = Math.abs(p.x - src.x);
                const dy = Math.abs(p.y - src.y);
                
                if (config.fog.shape === 'square') {
                  if (dx <= radius && dy <= radius) isVisible = true;
                } else if (config.fog.shape === 'hexagon') {
                  if (euclideanDistance(p.x, p.y, src.x, src.y) <= radius * 1.1) isVisible = true;
                } else {
                  if (euclideanDistance(p.x, p.y, src.x, src.y) <= radius) isVisible = true;
                }
                if (isVisible) break;
              }
              sprite.visible = isVisible;
              if (propHoverTexts[id]) propHoverTexts[id].visible = isVisible;
            });

          } else {
            // Restore visibility for all if fowHideTokens is off
            Object.values(tokenSprites).forEach(spriteRecord => {
               spriteRecord.container.visible = true;
            });
            Object.entries(propSprites).forEach(([id, sprite]) => {
               const p = state.props.get(id) as any;
               if (!p || p.isHidden) {
                  sprite.visible = false;
                  if (propHoverTexts[id]) propHoverTexts[id].visible = false;
               } else {
                  sprite.visible = true;
                  if (propHoverTexts[id]) propHoverTexts[id].visible = true;
               }
            });
          }

        } else {
          fogContainer.visible = false;
          // Restore visibility when FOW is off
          Object.values(tokenSprites).forEach(spriteRecord => {
             spriteRecord.container.visible = true;
          });
        }
      };

      drawGrid();

      let draggingTokenId: string | null = null;
      let tokenDragOffsets: Record<string, {x: number, y: number}> = {};
      let tokenStartPositions: Record<string, {x: number, y: number}> = {};
      
      let propDragOffsets: Record<string, {x: number, y: number}> = {};
      let propStartPositions: Record<string, {x: number, y: number}> = {};

      // Grid Texts Container
      const textSprites: Record<string, Container> = {};
      let draggingTextId: string | null = null;
      let textDragOffset = {x: 0, y: 0};

      const syncTexts = () => {
        const textsState = state.mapTexts;
        
        Object.keys(textSprites).forEach(id => {
          if (!textsState.has(id)) {
            textsContainer.removeChild(textSprites[id]);
            textSprites[id].destroy({ children: true });
            delete textSprites[id];
          }
        });

        Array.from(textsState.entries()).forEach(([id, textData]) => {
          const t = textData as any;
          if (!textSprites[id]) {
            const container = new Container();
            
            const bg = new Graphics();
            container.addChild(bg);
            
            const textEl = new Text({
              text: t.text,
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: t.fontSize || 24,
                fill: t.color || '#ffffff',
                align: 'center',
                fontWeight: 'bold',
                wordWrap: true,
                wordWrapWidth: t.wordWrapWidth || 300,
                lineHeight: (t.fontSize || 24) * 1.2
              }
            });
            textEl.anchor.set(0.5);
            container.addChild(textEl);
            
            container.eventMode = 'static';
            container.cursor = 'grab';
            
            let lastClickTime = 0;
            container.on('pointerdown', (e) => {
              if (e.button === 0) {
                e.stopPropagation();
                
                const now = Date.now();
                
                // 1. Se estiver com a ferramenta de Texto, um clique APENAS EDITA (NÃO arrasta).
                if (localState.activeTool === 'text') {
                   import('../store').then(s => {
                      s.setEditingTextId(id);
                      textEditorInput.value = t.text;
                      setTimeout(() => textEditorInput.focus(), 50);
                   });
                   return; // Não permite arrastar com a ferramenta de texto ativa
                }
                
                // 2. Se estiver com a ferramenta de Seleção, duplo clique EDITA.
                if (now - lastClickTime < 300) {
                   import('../store').then(s => {
                      s.setEditingTextId(id);
                      s.setActiveTool('text');
                      textEditorInput.value = t.text;
                      setTimeout(() => textEditorInput.focus(), 50);
                   });
                   return; // Não permite arrastar no duplo clique
                }
                
                lastClickTime = now;

                // 3. Se for um clique simples com a ferramenta de Seleção, ARRASTA.
                draggingTextId = id;
                const localPos = viewport.toLocal(e.global);
                textDragOffset = { x: container.x - localPos.x, y: container.y - localPos.y };
                container.alpha = 0.5;
                container.cursor = 'grabbing';
              }
            });
            
            textsContainer.addChild(container);
            textSprites[id] = container;
          }

          const container = textSprites[id];
          const textEl = container.children[1] as Text;
          const bg = container.children[0] as Graphics;

          textEl.text = t.text;
          textEl.style.fill = t.color || '#ffffff';
          textEl.style.fontSize = t.fontSize || 24;
          textEl.style.wordWrapWidth = t.wordWrapWidth || 300;
          
          if (t.backgroundColor && t.backgroundColor !== 'transparent') {
             bg.clear();
             const w = textEl.width + 16;
             const h = textEl.height + 8;
             bg.roundRect(-w/2, -h/2, w, h, 8);
             bg.fill({ color: t.backgroundColor, alpha: 0.6 });
             bg.visible = true;
          } else {
             bg.visible = false;
          }

          container.visible = !t.hidden;

          if (draggingTextId !== id) {
            container.x = t.x;
            container.y = t.y;
            container.alpha = 1;
            container.cursor = 'grab';
          }
        });
      };

      state.mapTexts.observe(syncTexts);
      syncTexts();
      (app as any)._yjsTextObserver = syncTexts;

      // Lore Pins Container & Sprites
      const lorePinSprites: Record<string, Container> = {};
      let draggingLorePinId: string | null = null;
      let lorePinDragOffset = { x: 0, y: 0 };

      const syncLorePins = () => {
        if (!state.lorePins) return;
        const pinsState = state.lorePins;
        const isGM = localStorage.getItem('isGM') === 'true';

        Object.keys(lorePinSprites).forEach(id => {
          if (!pinsState.has(id)) {
            lorePinsContainer.removeChild(lorePinSprites[id]);
            lorePinSprites[id].destroy({ children: true });
            delete lorePinSprites[id];
          }
        });

        Array.from(pinsState.entries()).forEach(([id, pinData]) => {
          const pin = pinData as LorePinData;
          if (pin.gmOnly && !isGM) {
            if (lorePinSprites[id]) {
              lorePinSprites[id].visible = false;
            }
            return;
          }

          if (!lorePinSprites[id]) {
            const container = new Container();
            
            // 1. Sombra
            const shadow = new Graphics();
            shadow.ellipse(0, 16, 12, 5);
            shadow.fill({ color: 0x000000, alpha: 0.4 });
            container.addChild(shadow);

            // 2. Marcador Pin
            const pinMarker = new Graphics();
            container.addChild(pinMarker);

            // 3. Ícone / Círculo interno
            const iconBadge = new Graphics();
            container.addChild(iconBadge);

            // 4. Badge com fundo translúcido
            const labelBg = new Graphics();
            container.addChild(labelBg);

            const labelText = new Text({
              text: pin.title || 'Ponto de Interesse',
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fill: '#ffffff',
                align: 'center',
                fontWeight: 'bold'
              }
            });
            labelText.anchor.set(0.5, 0);
            labelText.y = 18;
            container.addChild(labelText);

            container.eventMode = 'static';
            container.cursor = 'pointer';

            container.on('pointerover', () => {
              container.scale.set(1.15);
            });

            container.on('pointerout', () => {
              container.scale.set(1.0);
            });

            container.on('pointerdown', (e) => {
              if (e.button === 0) {
                e.stopPropagation();
                
                if (pin.wikiPath) {
                  window.dispatchEvent(new CustomEvent('open-wiki-file', { detail: { path: pin.wikiPath } }));
                  toast.success(`📖 Abrindo nota: ${pin.title}`);
                } else {
                  toast.info(`📍 ${pin.title}${pin.description ? ' — ' + pin.description : ''}`);
                }

                if (isGM) {
                  draggingLorePinId = id;
                  const localPos = viewport.toLocal(e.global);
                  lorePinDragOffset = { x: container.x - localPos.x, y: container.y - localPos.y };
                  container.alpha = 0.7;
                  container.cursor = 'grabbing';
                }
              } else if (e.button === 2 && isGM) {
                e.stopPropagation();
                if (confirm(`Remover Pin de Lore "${pin.title}" do mapa?`)) {
                  removeLorePin(id);
                  toast.info(`Pin "${pin.title}" removido.`);
                }
              }
            });

            lorePinsContainer.addChild(container);
            lorePinSprites[id] = container;
          }

          const container = lorePinSprites[id];
          container.visible = true;

          const pinMarker = container.children[1] as Graphics;
          const iconBadge = container.children[2] as Graphics;
          const labelBg = container.children[3] as Graphics;
          const labelText = container.children[4] as Text;

          labelText.text = pin.title || 'Ponto de Interesse';

          const colorHex = pin.color || '#34d399';
          pinMarker.clear();
          pinMarker.circle(0, 0, 15);
          pinMarker.poly([
            { x: -10, y: 7 },
            { x: 0, y: 20 },
            { x: 10, y: 7 }
          ]);
          pinMarker.fill({ color: colorHex });
          pinMarker.stroke({ color: '#1a110a', width: 2 });

          iconBadge.clear();
          iconBadge.circle(0, 0, 5);
          iconBadge.fill({ color: '#ffffff' });

          labelBg.clear();
          const textW = labelText.width + 12;
          const textH = labelText.height + 4;
          labelBg.roundRect(-textW / 2, 16, textW, textH, 6);
          labelBg.fill({ color: '#120d0a', alpha: 0.85 });
          labelBg.stroke({ color: colorHex, width: 1 });

          if (draggingLorePinId !== id) {
            container.x = pin.x;
            container.y = pin.y;
            container.alpha = pin.gmOnly ? 0.65 : 1.0;
          }
        });
      };

      if (state.lorePins) {
        state.lorePins.observe(syncLorePins);
        syncLorePins();
        (app as any)._yjsLorePinsObserver = syncLorePins;
      }

      interface TokenSpriteRecord {
        container: Container;
        glow: Graphics;
        lightAura: Graphics | null;
        hpFill: Graphics;
        targetRing: Graphics;
        selectionRing: Graphics;
        visualHash: string;
        hpBarY: number;
      }
      let tokenSprites: Record<string, TokenSpriteRecord> = {};

      // Draw initial FOW after tokenSprites is defined
      drawFogOfWar();

      const conditionEmojis: Record<string, string> = {
        fogo: '🔥',
        gelo: '❄️',
        queda: '🤕',
        envenenado: '🤢',
        cego: '👁️',
        sono: '💤',
        sangrando: '🩸',
        confuso: '😵',
        morto: '💀'
      };

      const drawTokenShape = (
        g: Graphics,
        shape: string,
        size: number,
        isFill: boolean,
        colorVal: number,
        strokeWidth: number = 0,
        strokeAlpha: number = 1
      ) => {
        g.clear();
        if (shape === 'hexagon') {
          g.moveTo(size, 0);
          for (let i = 1; i <= 6; i++) {
            const angle = (i * Math.PI) / 3;
            g.lineTo(size * Math.cos(angle), size * Math.sin(angle));
          }
          g.closePath();
        } else if (shape === 'square') {
          g.roundRect(-size, -size, size * 2, size * 2, size * 0.25);
        } else if (shape === 'standee') {
          const w = size * 0.85;
          const h = size * 1.3;
          g.roundRect(-w, -h, w * 2, h * 2, size * 0.2);
        } else {
          g.circle(0, 0, size);
        }

        if (isFill) {
          g.fill(colorVal);
        } else {
          g.stroke({ width: strokeWidth, color: colorVal, alpha: strokeAlpha });
        }
      };

      const wallSprites: Record<string, Graphics> = {};
      const syncWalls = () => {
        const walls = Array.from(state.walls.values()) as any[];
        Object.keys(wallSprites).forEach(id => {
          if (!walls.some(w => w.id === id)) {
            wallsContainer.removeChild(wallSprites[id]);
            wallSprites[id].destroy();
            delete wallSprites[id];
          }
        });

        walls.forEach(wall => {
          if (!wall?.a || !wall?.b || wall.hidden) {
            if (wallSprites[wall.id]) wallSprites[wall.id].visible = false;
            return;
          }
          const graphic = wallSprites[wall.id] || new Graphics();
          if (!wallSprites[wall.id]) {
            wallsContainer.addChild(graphic);
            wallSprites[wall.id] = graphic;
          }
          graphic.visible = true;
          graphic.clear();
          graphic.moveTo(wall.a.x, wall.a.y);
          graphic.lineTo(wall.b.x, wall.b.y);
          graphic.stroke({ width: Math.max(2, Number(wall.thickness) || 8), color: wall.color || '#f97316', alpha: 0.9, cap: 'round' });
          // Highlight central keeps the wall legible over dark maps.
          graphic.moveTo(wall.a.x, wall.a.y);
          graphic.lineTo(wall.b.x, wall.b.y);
          graphic.stroke({ width: Math.max(1, (Number(wall.thickness) || 8) * 0.28), color: '#fff1c2', alpha: 0.8, cap: 'round' });
        });
      };

      const renderProps = () => {
        const pState = Array.from(state.props.values()) as any[];
        
        // Remover apagados
        for (const id in propSprites) {
          if (!pState.find(p => p.id === id)) {
            propsContainer.removeChild(propSprites[id]);
            if (propHoverTexts[id]) propsContainer.removeChild(propHoverTexts[id]);
            delete propSprites[id];
            delete propHoverTexts[id];
          }
        }

        // Adicionar/Atualizar
        pState.forEach(p => {
          if (!propSprites[p.id]) {
            const sprite = new Sprite();
            Assets.load(p.imageUrl).then(texture => {
               sprite.texture = texture;
               requestAnimationFrame(renderProps);
            }).catch(console.error);
            sprite.anchor.set(0.5);
            sprite.eventMode = 'static';
            sprite.cursor = 'pointer';

            const tooltip = new Text({
              text: p.name,
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: 16,
                fill: 0xffffff,
                align: 'center',
                dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.8 }
              }
            });
            tooltip.anchor.set(0.5, 1);
            tooltip.alpha = 0; // Oculto por padrão

            sprite.on('pointerover', () => {
               tooltip.alpha = 1;
            });
            sprite.on('pointerout', () => {
               tooltip.alpha = 0;
            });
            
            let lastClickTime = 0;
            sprite.on('pointerdown', (e) => {
               if (e.button === 0) {
                  if (localState.activeTool !== 'select') {
                     // 
                  }
               }
            });

            propSprites[p.id] = sprite;
            propHoverTexts[p.id] = tooltip;
            propsContainer.addChild(sprite);
            propsContainer.addChild(tooltip);
          }

          const sprite = propSprites[p.id];
          const tooltip = propHoverTexts[p.id];
          const config = Config.getAll();
          
          sprite.x = p.x;
          sprite.y = p.y;
          
          if (sprite.texture && sprite.texture.width > 1) {
             const maxDim = Math.max(sprite.texture.width, sprite.texture.height);
             const baseScale = config.map.gridSize / maxDim;
             sprite.scale.set(baseScale * p.scale);
          } else {
             sprite.scale.set(p.scale);
          }
          
          sprite.rotation = p.rotation;

          tooltip.x = p.x;
          tooltip.y = p.y - (sprite.height / 2) - 10;
          tooltip.text = p.name;
        });
      };

      const syncTokens = () => {
        const tokensState = state.tokens;
        const tokenVisualConfig = Config.getAll();

        // Remove deleted tokens
        Object.keys(tokenSprites).forEach(id => {
          if (!tokensState.has(id)) {
            tokensContainer.removeChild(tokenSprites[id].container);
            tokenSprites[id].container.destroy({ children: true });
            delete tokenSprites[id];
          }
        });

        // Add or update tokens
        Array.from(tokensState.entries()).forEach(([id, tokenData]) => {
          const t = tokenData as any;
          // Only render tokens that have been placed on the map (x,y > -1000)
          if (t.x < -1000 || t.y < -1000) return;

          const shape = t.tokenShape || 'circle';
          const scale = t.sizeScale ?? 1;
          const borderColHex = t.borderColor ? t.borderColor.replace('#', '0x') : '0x06b6d4';
          const borderCol = parseInt(borderColHex, 16);
          const glowColHex = t.borderColor ? t.borderColor.replace('#', '0x') : '0x0ea5e9';
          const glowCol = parseInt(glowColHex, 16);
          const hpBarMode = t.hpBarMode || 'always';
          const showName = t.showName || false;
          const activeConditions = t.status_efeitos || [];
          const visionRadius = Number(t.visionRadius || ((tokenVisualConfig.fog.radius || 6) * tokenVisualConfig.map.gridSize));

          const visualHash = `${shape}_${t.borderColor || ''}_${t.imageUrl || ''}_${scale}_${showName}_${hpBarMode}_${t.name || ''}_${activeConditions.join(',')}_${t.hasVision !== false}_${visionRadius}`;

          // If visual state changed, destroy and recreate
          if (tokenSprites[id] && tokenSprites[id].visualHash !== visualHash) {
            tokensContainer.removeChild(tokenSprites[id].container);
            tokenSprites[id].container.destroy({ children: true });
            delete tokenSprites[id];
          }

          if (!tokenSprites[id]) {
            const token = new Container();
            let lightAura: Graphics | null = null;

            // Halo de luz suave: a pulsação fica no token, enquanto a visão
            // continua sendo calculada pelo renderer de névoa/raycasting.
            if (shape !== 'figure' && t.hasVision !== false && visionRadius > 0) {
              lightAura = new Graphics();
              const auraRadius = 34 + Math.min(28, visionRadius / 12);
              lightAura.circle(0, 0, auraRadius);
              lightAura.fill({ color: glowCol, alpha: 0.2 });
              lightAura.filters = [new BlurFilter({ strength: 10, quality: 3 })];
              lightAura.alpha = 0.7;
              token.addChild(lightAura);
            }
            
            // Base background and border (Ignorado no modo "figure" / boneco recortado)
            if (shape !== 'figure') {
              const tokenBorder = new Graphics();
              drawTokenShape(tokenBorder, shape, 26, true, 0x020617);
              drawTokenShape(tokenBorder, shape, 26, false, borderCol, 3, 0.9);
              if (shape === 'standee') {
                tokenBorder.ellipse(0, 26 * 1.3, 26 * 0.9, 26 * 0.2);
                tokenBorder.fill(0x020617);
                drawTokenShape(tokenBorder, shape, 26, false, borderCol, 3, 0.9);
              }
              token.addChild(tokenBorder);
            }

            // Async load portrait image (Support custom imageUrl)
            let imgPath = t.imageUrl ? t.imageUrl : (id === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg');
            
            // Resolve path for local wiki images
            if (imgPath && !imgPath.startsWith('http') && !imgPath.startsWith('data:') && !imgPath.startsWith('/')) {
              const repoPath = 'D:/DOZERO/wikidozero';
              // ponytail: resolve via bundle in PROD, ou fallback
              imgPath = resolveMediaUrl(imgPath, repoPath);
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (isDestroyed) return;
              // Verifica se o token ainda existe no estado antes de criar textura
              if (!state.tokens.has(id)) {
                console.log(`[GameCanvas] Token ${id} removido durante carregamento de imagem, descartando.`);
                return;
              }
              if (!tokenSprites[id]) {
                console.log(`[GameCanvas] Token ${id} não está mais em tokenSprites, descartando imagem.`);
                return;
              }
              try {
                const texture = Texture.from(img);
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5);
                
                if (shape === 'standee') {
                  sprite.width = 44;
                  sprite.height = 66;
                  sprite.y = -2;
                } else if (shape === 'figure') {
                  // Modo Boneco: Mantém proporção e escala sem recortar com máscara
                  const maxDim = Math.max(img.width || 1, img.height || 1);
                  const targetSize = 56;
                  const aspect = (img.width || 1) / (img.height || 1);
                  if (aspect >= 1) {
                    sprite.width = targetSize;
                    sprite.height = targetSize / aspect;
                  } else {
                    sprite.height = targetSize;
                    sprite.width = targetSize * aspect;
                  }
                  sprite.y = 0;
                } else {
                  sprite.width = 50;
                  sprite.height = 50;
                  sprite.y = 0;
                }
                
                // No modo figure não aplica máscara de recorte
                if (shape !== 'figure') {
                  const mask = new Graphics();
                  drawTokenShape(mask, shape, 24, true, 0xffffff);
                  sprite.mask = mask;
                  token.addChild(mask);
                }

                token.addChild(sprite);
              } catch (texErr) {
                console.warn('[GameCanvas] Erro ao criar textura para token:', id, texErr);
              }
            };
            img.onerror = () => {
              console.warn('[GameCanvas] Falha ao carregar imagem do token:', imgPath);
            };
            img.src = imgPath;

            // Pulsing Neon Glow (Ignorado no modo figure)
            let glow: Graphics | null = null;
            if (shape !== 'figure') {
              glow = new Graphics();
              drawTokenShape(glow, shape, 30, false, glowCol, 6, 1);
              glow.filters = [new BlurFilter({ strength: 4, quality: 2 })];
              if (shape === 'standee') {
                glow.ellipse(0, 30 * 1.3, 30 * 0.9, 30 * 0.2);
                glow.stroke({ width: 6, color: glowCol, alpha: 1 });
              }
              token.addChild(glow);
            }

            // Attached Mini HP Bar
            const hpBarY = shape === 'standee' ? 48 : 35;
            const hpBarContainer = new Container();

            const hpBarBg = new Graphics();
            hpBarBg.rect(-20, hpBarY, 40, 6);
            hpBarBg.fill(0x000000);
            hpBarBg.stroke({ width: 1, color: 0x1e293b });
            hpBarContainer.addChild(hpBarBg);

            const hpBarFill = new Graphics();
            hpBarFill.rect(-19, hpBarY + 1, 38, 4);
            hpBarFill.fill(0xef4444);
            hpBarContainer.addChild(hpBarFill);

            token.addChild(hpBarContainer);

            // HP Bar visibility triggers
            hpBarContainer.visible = hpBarMode === 'always';
            token.on('pointerover', () => {
              if (hpBarMode === 'hover') hpBarContainer.visible = true;
            });
            token.on('pointerout', () => {
              if (hpBarMode === 'hover') hpBarContainer.visible = false;
            });

            // Selection Ring
            const selectionRing = new Graphics();
            drawTokenShape(selectionRing, shape, 32, false, glowCol, 3, 0.8);
            if (shape === 'standee') {
              selectionRing.ellipse(0, 32 * 1.3, 32 * 0.9, 32 * 0.2);
              selectionRing.stroke({ width: 3, color: glowCol, alpha: 0.8 });
            }
            selectionRing.visible = false;
            token.addChild(selectionRing);

            // Target Ring (Hidden by default)
            const targetRing = new Graphics();
            drawTokenShape(targetRing, shape, 36, false, 0xef4444, 4, 0.8);
            if (shape === 'standee') {
              targetRing.ellipse(0, 36 * 1.3, 36 * 0.9, 36 * 0.2);
              targetRing.stroke({ width: 4, color: 0xef4444, alpha: 0.8 });
            }
            targetRing.visible = false;
            token.addChild(targetRing);

            // Name Label
            if (showName) {
              const nameLabel = new Text({
                text: t.name || 'Sem Nome',
                style: {
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 10,
                  fill: 0xffffff,
                  align: 'center',
                  fontWeight: 'bold'
                }
              });
              nameLabel.anchor.set(0.5);
              const labelY = hpBarY + 14;
              nameLabel.y = labelY;
              
              const nameBg = new Graphics();
              const textWidth = Math.max(30, nameLabel.width);
              nameBg.roundRect(-textWidth / 2 - 4, labelY - 7, textWidth + 8, 14, 4);
              nameBg.fill(0x0f172a);
              nameBg.stroke({ width: 1, color: 0x334155 });
              
              token.addChild(nameBg);
              token.addChild(nameLabel);
            }

            // Active Condition Badges
            if (activeConditions.length > 0) {
              const badgeContainer = new Container();
              const badgeX = shape === 'standee' ? -22 : -26;
              const badgeY = shape === 'standee' ? -36 : -26;
              badgeContainer.x = badgeX;
              badgeContainer.y = badgeY;
              
              let currentX = 0;
              activeConditions.forEach((effId: string) => {
                const emoji = conditionEmojis[effId];
                if (!emoji) return;
                
                const emojiText = new Text({
                  text: emoji,
                  style: {
                    fontSize: 10
                  }
                });
                emojiText.anchor.set(0.5);
                emojiText.x = currentX;
                
                badgeContainer.addChild(emojiText);
                currentX += 11;
              });
              token.addChild(badgeContainer);
            }

            // Set scale
            token.scale.set(scale);

            token.eventMode = 'static';
            token.cursor = 'pointer';
            token.hitArea = new Rectangle(-30, -30, 60, 60);

            token.on('pointerdown', (e) => {
              // Right click to target
              if (e.button === 2) {
                e.stopPropagation();
                Tokens.toggleTarget(id);
                return;
              }
              
              if (localState.activeTool !== 'select') {
                 // Prevent drag on pen mode etc if needed
              }
            });

            // Prevent context menu on right click on tokens
            token.on('rightdown', (e) => e.stopPropagation());

            tokensContainer.addChild(token);
            tokenSprites[id] = { 
              container: token, 
              glow, 
              lightAura,
              hpFill: hpBarFill, 
              targetRing, 
              selectionRing,
              visualHash,
              hpBarY
            };
            
            token.x = t.x;
            token.y = t.y;
          } else {
            // If not dragging, animate to new position (or just set it)
            let isBeingDragged = false;
            if (draggingTokenId) {
               const selected = Tokens.getSelectedIds();
               if (selected.includes(id)) {
                  isBeingDragged = true;
               }
            }
            if ((window as any).__IS_GIZMO_DRAGGING && localState.selectedTokens?.has(id)) {
               isBeingDragged = true;
            }

            if (!isBeingDragged) {
              const dx = t.x - tokenSprites[id].container.x;
              const dy = t.y - tokenSprites[id].container.y;
              if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                tokenSprites[id].container.x = t.x;
                tokenSprites[id].container.y = t.y;
              }
            }
          }
          
          // Animação Dinâmica da Barra de Vida (HP)
          const hp = t.hp !== undefined ? Number(t.hp) : 100;
          const maxHp = t.maxHp ? Number(t.maxHp) : 100;
          const hpPct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
          
          const fill = tokenSprites[id].hpFill;
          if (fill && tokenSprites[id].hpBarY !== undefined) {
            fill.clear();
            fill.rect(-19, tokenSprites[id].hpBarY + 1, 38 * hpPct, 4);
            fill.fill(0xef4444);
          }
        });
      };

      state.tokens.observe(syncTokens);
      syncTokens();
      const mapConfigObserver = () => {
        drawGrid();
      };
      state.mapConfig.observe(mapConfigObserver);

      const propsObserver = () => {
         requestAnimationFrame(renderProps);
      };

      state.props.observe(propsObserver);
      state.walls.observe(syncWalls);
      syncWalls();

      const updateSelectionVisuals = () => {
        const selected = Tokens.getSelectedIds();
        for (const id in tokenSprites) {
          if (tokenSprites[id] && tokenSprites[id].selectionRing) {
            tokenSprites[id].selectionRing.visible = selected.includes(id);
          }
        }
      };
      window.addEventListener('token-selection-updated', updateSelectionVisuals);

      (app as any)._yjsObserver = syncTokens;

      const onDragEnd = () => {
        const config = Config.getAll();
        let deltaX = 0; let deltaY = 0;
        let foundLeader = false;
        
        if (draggingTokenId) {
          const leaderToken = tokenSprites[draggingTokenId]?.container;
          const leaderStart = tokenStartPositions[draggingTokenId];
          if (leaderToken && leaderStart) {
            const leaderSnapped = snapToGrid(leaderToken.x, leaderToken.y, config);
            deltaX = leaderSnapped.x - leaderStart.x;
            deltaY = leaderSnapped.y - leaderStart.y;
            foundLeader = true;
          }
        } else if (draggingTextId && draggingTextId.startsWith('prop_')) {
          const leaderId = draggingTextId.replace('prop_', '');
          const leaderProp = propSprites[leaderId];
          const leaderStart = propStartPositions[leaderId];
          if (leaderProp && leaderStart) {
             const snapped = snapToGrid(leaderProp.x, leaderProp.y, config);
             deltaX = snapped.x - leaderStart.x;
             deltaY = snapped.y - leaderStart.y;
             foundLeader = true;
          }
        }
        
        if (!foundLeader) return;

        Object.keys(tokenDragOffsets).forEach(selId => {
          const tokenData = tokenSprites[selId];
          if (!tokenData) return;
          const token = tokenData.container;
          token.alpha = 1;
          
          const startPos = tokenStartPositions[selId];
          if (startPos) {
             token.x = startPos.x + deltaX;
             token.y = startPos.y + deltaY;
          }
          Tokens.update(selId, { x: token.x, y: token.y });
        });
        
        import('../store/props').then(m => {
           Object.keys(propDragOffsets).forEach(selId => {
              const selProp = propSprites[selId];
              if (!selProp) return;
              
              const startPos = propStartPositions[selId];
              if (startPos) {
                 selProp.x = startPos.x + deltaX;
                 selProp.y = startPos.y + deltaY;
              }
              m.updatePropProps(selId, { x: selProp.x, y: selProp.y });
           });
        });
        
        draggingTokenId = null;
        if (draggingTextId && draggingTextId.startsWith('prop_')) draggingTextId = null;
      };

      // ── Stage-level drag: use Pixi events so coordinates are always correct on mobile ──
      // The Pixi event system already accounts for devicePixelRatio and canvas offset,
      // avoiding the DOM vs Pixi coordinate mismatch that causes jank/snapping on touch.
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(-1e6, -1e6, 2e6, 2e6);

      app.stage.on('pointermove', (e: any) => {
        if (draggingTokenId || (draggingTextId && draggingTextId.startsWith('prop_'))) {
          // e.getLocalPosition(viewport) gives world coords via Pixi event system (handles devicePixelRatio correctly)
          const worldPoint = e.getLocalPosition(viewport);

          Object.keys(tokenDragOffsets).forEach(selId => {
            const selToken = tokenSprites[selId]?.container;
            const offset = tokenDragOffsets[selId];
            if (selToken && offset) {
              selToken.x = worldPoint.x + offset.x;
              selToken.y = worldPoint.y + offset.y;
            }
          });

          Object.keys(propDragOffsets).forEach(selId => {
            const selProp = propSprites[selId];
            const offset = propDragOffsets[selId];
            if (selProp && offset) {
              selProp.x = worldPoint.x + offset.x;
              selProp.y = worldPoint.y + offset.y;
              if (propHoverTexts[selId]) {
                propHoverTexts[selId].x = selProp.x;
                propHoverTexts[selId].y = selProp.y - (selProp.height / 2) - 10;
              }
            }
          });

          if (Object.keys(propDragOffsets).length > 0) {
            window.dispatchEvent(new Event('prop-selection-updated'));
          }
          if (Object.keys(tokenDragOffsets).length > 0) {
            window.dispatchEvent(new Event('token-selection-updated'));
          }
        }
      });

      const onStageDragEnd = () => {
        if (draggingTokenId || (draggingTextId && draggingTextId.startsWith('prop_'))) {
          onDragEnd();
        }
      };
      app.stage.on('pointerup', onStageDragEnd);
      app.stage.on('pointerupoutside', onStageDragEnd);

      // Text and LorePin drag stays on window
      const handleNativeMove = (e: PointerEvent) => {
        if (draggingLorePinId) {
          const container = lorePinSprites[draggingLorePinId];
          if (container) {
            const rect = app.canvas.getBoundingClientRect();
            const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            container.x = localPos.x + lorePinDragOffset.x;
            container.y = localPos.y + lorePinDragOffset.y;
          }
          return;
        }

        if (!draggingTextId || draggingTextId.startsWith('prop_')) return;
        const container = textSprites[draggingTextId];
        if (container) {
          const rect = app.canvas.getBoundingClientRect();
          const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          container.x = localPos.x + textDragOffset.x;
          container.y = localPos.y + textDragOffset.y;
        }
      };

      const handleNativeUp = (e: PointerEvent) => {
        if (draggingLorePinId) {
          const container = lorePinSprites[draggingLorePinId];
          if (container) {
            updateLorePinPosition(draggingLorePinId, container.x, container.y);
            container.alpha = 1;
            container.cursor = 'pointer';
          }
          draggingLorePinId = null;
        }

        if (draggingTextId && !draggingTextId.startsWith('prop_')) {
          const container = textSprites[draggingTextId];
          if (container) {
            import('../store').then(s => {
              s.updateMapTextPosition(draggingTextId!, container.x, container.y);
            });
            container.alpha = 1;
            container.cursor = 'grab';
          }
          draggingTextId = null;
        }
      };

      window.addEventListener('pointermove', handleNativeMove);
      window.addEventListener('pointerup', handleNativeUp);
      window.addEventListener('pointercancel', handleNativeUp);

      window.addEventListener('locate-texts', () => {
         const texts = Array.from(state.mapTexts.values()) as any[];
         if (texts.length === 0) return;
         
         let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
         texts.forEach(t => {
            if (t.x < minX) minX = t.x;
            if (t.x > maxX) maxX = t.x;
            if (t.y < minY) minY = t.y;
            if (t.y > maxY) maxY = t.y;
         });
         
         const cx = (minX + maxX) / 2;
         const cy = (minY + maxY) / 2;
         
         // Animação suave para focar
         const targetX = window.innerWidth / 2 - cx * viewport.scale.x;
         const targetY = window.innerHeight / 2 - cy * viewport.scale.y;
         
         const startX = viewport.x;
         const startY = viewport.y;
         const duration = 400;
         const startTime = Date.now();
         
         const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            
            viewport.x = startX + (targetX - startX) * ease;
            viewport.y = startY + (targetY - startY) * ease;
            
            if (progress < 1) {
               requestAnimationFrame(animate);
            }
         };
         animate();
      });

      let lastCentralClickTime = 0;
      const centralSelectHandler = (e: any) => {
         if (localState.activeTool !== 'select') return;
         if (e.button !== 0 && e.button !== 2) return;
         
         // Allow gizmo interactions to proceed natively
         let target = e.target;
         while (target) {
            if (target === gizmoBox || gizmoCorners.includes(target)) return;
            target = target.parent;
         }
         
         const localPos = viewport.toLocal(e.global);
         const now = Date.now();
         const isDoubleClick = now - lastCentralClickTime < 300;
         lastCentralClickTime = now;
         const shift = e.nativeEvent?.shiftKey || e.shiftKey || false;
         
         if (e.button === 2) {
             let hitTokenId: string | null = null;
             for (const [id, tSprite] of Object.entries(tokenSprites)) {
                 if (!tSprite || !tSprite.container) continue;
                 const c = tSprite.container;
                 if (Math.hypot(c.x - localPos.x, c.y - localPos.y) < 30 * c.scale.x) { hitTokenId = id; break; }
             }
             if (hitTokenId) Tokens.toggleTarget(hitTokenId);
             return;
         }
         
         // 1. Tokens
         let hitTokenId: string | null = null;
         for (const [id, tSprite] of Object.entries(tokenSprites)) {
             if (!tSprite || !tSprite.container) continue;
             const c = tSprite.container;
             if (Math.hypot(c.x - localPos.x, c.y - localPos.y) < 30 * c.scale.x) { hitTokenId = id; break; }
         }
         if (hitTokenId) {
            e.stopPropagation();
            const tData = state.tokens.get(hitTokenId) as any;
            const isGM = localStorage.getItem('isGM') === 'true';
            const curUser = useAuthStore.getState().user;
            const curPlayerName = localStorage.getItem('playerName') || 'Jogador';
            const canControl = Tokens.canControl(tData, curUser?.id, curPlayerName, isGM);

            if (isDoubleClick) {
               if (canControl) {
                 window.dispatchEvent(new CustomEvent('token-dblclick', { detail: { tokenId: hitTokenId } }));
               } else {
                 toast.info(`Personagem atribuído a ${tData?.ownerName || 'outro jogador'}.`);
               }
            }
            
            // Set up instant drag if not locked and has control permission
            if (canControl && (!tData || !tData.locked)) {
               draggingTokenId = hitTokenId;
               tokenDragOffsets = {};
               tokenStartPositions = {};
               
               const selectedTokens = localState.selectedTokens ? Array.from(localState.selectedTokens) : [];
               const isAlreadySelected = selectedTokens.includes(hitTokenId);
               
               // If dragging a token not in current selection (and not holding shift), it becomes the only selection
               if (!shift && !isAlreadySelected) {
                  tokenDragOffsets[hitTokenId] = { x: tokenSprites[hitTokenId].container.x - localPos.x, y: tokenSprites[hitTokenId].container.y - localPos.y };
                  tokenStartPositions[hitTokenId] = { x: tokenSprites[hitTokenId].container.x, y: tokenSprites[hitTokenId].container.y };
               } else {
                  // Drag all currently selected tokens + the hit one
                  const toDrag = new Set([...selectedTokens, hitTokenId]);
                  toDrag.forEach(tId => {
                     if (tokenSprites[tId]?.container) {
                        tokenDragOffsets[tId] = { x: tokenSprites[tId].container.x - localPos.x, y: tokenSprites[tId].container.y - localPos.y };
                        tokenStartPositions[tId] = { x: tokenSprites[tId].container.x, y: tokenSprites[tId].container.y };
                     }
                  });
               }
            }

            import('../store').then(s => {
               if (!shift && !Tokens.getSelectedIds().includes(hitTokenId!)) {
                  Tokens.clearSelection(); s.clearPropSelection(); s.clearDrawingSelection(); s.clearBgSelection();
               }
               if (Tokens.getSelectedIds().includes(hitTokenId!) && shift) {
                   Tokens.toggleSelected(hitTokenId!, true);
               } else if (!Tokens.getSelectedIds().includes(hitTokenId!)) {
                   Tokens.toggleSelected(hitTokenId!, shift);
               }
            });
            return;
         }
         
         // 2. Props
         let hitPropId: string | null = null;
         const propEntries = Object.entries(propSprites).reverse();
         for (const [id, sprite] of propEntries) {
             if (!sprite) continue;
             const pData = state.props.get(id) as any;
             if (pData && pData.isLocked) continue;
             const hw = sprite.width / 2; const hh = sprite.height / 2;
             if (localPos.x >= sprite.x - hw && localPos.x <= sprite.x + hw && localPos.y >= sprite.y - hh && localPos.y <= sprite.y + hh) { hitPropId = id; break; }
         }
         if (hitPropId) {
            e.stopPropagation();
            if (isDoubleClick) window.dispatchEvent(new CustomEvent('open-prop-interaction', { detail: hitPropId }));
            
            // Set up instant drag!
            draggingTextId = 'prop_' + hitPropId;
            propDragOffsets = {};
            propStartPositions = {};
            
            const selectedProps = Array.from(localState.selectedProps || []);
            const isAlreadySelected = selectedProps.includes(hitPropId);
            
            if (!shift && !isAlreadySelected) {
               propDragOffsets[hitPropId] = { x: propSprites[hitPropId].x - localPos.x, y: propSprites[hitPropId].y - localPos.y };
               propStartPositions[hitPropId] = { x: propSprites[hitPropId].x, y: propSprites[hitPropId].y };
            } else {
               const toDrag = new Set([...selectedProps, hitPropId]);
               toDrag.forEach(pId => {
                  if (propSprites[pId]) {
                     propDragOffsets[pId] = { x: propSprites[pId].x - localPos.x, y: propSprites[pId].y - localPos.y };
                     propStartPositions[pId] = { x: propSprites[pId].x, y: propSprites[pId].y };
                  }
               });
            }

            import('../store').then(s => {
               if (!shift && !s.getSelectedProps().includes(hitPropId!)) {
                  Tokens.clearSelection(); s.clearPropSelection(); s.clearDrawingSelection(); s.clearBgSelection();
               }
               if (s.getSelectedProps().includes(hitPropId!) && shift) {
                   s.togglePropSelection(hitPropId!, true);
               } else if (!s.getSelectedProps().includes(hitPropId!)) {
                   s.togglePropSelection(hitPropId!, shift);
               }
            });
            return;
         }
         
         // 3. Drawings
         const radius = 20 / viewport.scale.x;
         let hitDrawingId: string | null = null;
         if (isDoubleClick) {
            let hitId: string | null = null;
            let currentText = "";
            for (const [id, d] of state.drawings.entries()) {
               const draw = d as any;
               if (draw.type === 'shape' && draw.points && draw.points.length >= 2) {
                  const p1 = draw.points[0]; const p2 = draw.points[draw.points.length - 1];
                  const minX = Math.min(p1.x, p2.x); const minY = Math.min(p1.y, p2.y);
                  const w = Math.abs(p2.x - p1.x); const h = Math.abs(p2.y - p1.y);
                  if (localPos.x >= minX && localPos.x <= minX + w && localPos.y >= minY && localPos.y <= minY + h) { hitId = id; currentText = draw.text || ""; break; }
               }
            }
            if (hitId) {
               const d = state.drawings.get(hitId) as any;
               const p1 = d.points[0]; const p2 = d.points[d.points.length - 1];
               const minX = Math.min(p1.x, p2.x); const minY = Math.min(p1.y, p2.y);
               const w = Math.abs(p2.x - p1.x); const h = Math.abs(p2.y - p1.y);
               const pMin = viewport.toGlobal({x: minX, y: minY});
               const pMax = viewport.toGlobal({x: minX + w, y: minY + h});
               const shapeTextInput = document.createElement('textarea');
               shapeTextInput.style.position = 'absolute';
               shapeTextInput.style.left = pMin.x + 'px'; shapeTextInput.style.top = pMin.y + 'px';
               shapeTextInput.style.width = (pMax.x - pMin.x) + 'px'; shapeTextInput.style.height = (pMax.y - pMin.y) + 'px';
               shapeTextInput.style.background = 'transparent'; shapeTextInput.style.border = '1px dashed #a855f7';
               shapeTextInput.style.outline = 'none'; shapeTextInput.style.resize = 'none';
               shapeTextInput.style.color = '#ffffff'; shapeTextInput.style.textAlign = 'center';
               shapeTextInput.style.fontFamily = 'Inter, sans-serif'; shapeTextInput.style.fontSize = (24 * viewport.scale.x) + 'px';
               shapeTextInput.style.zIndex = '1000';
               shapeTextInput.value = currentText;
               shapeTextInput.addEventListener('input', () => updateDrawing(hitId!, { text: shapeTextInput.value }));
               shapeTextInput.addEventListener('blur', () => { if (shapeTextInput.parentNode) shapeTextInput.parentNode.removeChild(shapeTextInput); });
               if (canvasRef.current) { canvasRef.current.appendChild(shapeTextInput); shapeTextInput.focus(); }
               return;
            }
         }
         
         for (const [id, d] of state.drawings.entries()) {
            const draw = d as any;
            if (draw.layerId) {
               const layer = state.drawingLayers?.get(draw.layerId) as any;
               if (layer && (layer.hidden || layer.locked)) continue;
            }
            if (draw.hidden || draw.locked) continue;
            let hit = false;
            if (draw.type === 'path' || draw.type === 'pen' || draw.type === 'arrow') {
               if (draw.points && draw.points.length > 0) {
                  for (let i = 0; i < draw.points.length - 1; i++) {
                    const p1 = draw.points[i]; const p2 = draw.points[i+1];
                    const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                    let t = 0;
                    if (l2 !== 0) {
                      t = ((localPos.x - p1.x) * (p2.x - p1.x) + (localPos.y - p1.y) * (p2.y - p1.y)) / l2;
                      t = Math.max(0, Math.min(1, t));
                    }
                    const projX = p1.x + t * (p2.x - p1.x); const projY = p1.y + t * (p2.y - p1.y);
                    if (Math.hypot(localPos.x - projX, localPos.y - projY) < radius) { hit = true; break; }
                  }
                  if (!hit && draw.points.length === 1 && Math.hypot(localPos.x - draw.points[0].x, localPos.y - draw.points[0].y) < radius) hit = true;
               }
            } else if (draw.type === 'shape') {
               if (draw.points && draw.points.length >= 2) {
                  const p1 = draw.points[0]; const p2 = draw.points[draw.points.length - 1];
                  const minX = Math.min(p1.x, p2.x); const minY = Math.min(p1.y, p2.y);
                  const w = Math.abs(p2.x - p1.x); const h = Math.abs(p2.y - p1.y);
                  if (localPos.x >= minX - radius && localPos.x <= minX + w + radius && localPos.y >= minY - radius && localPos.y <= minY + h + radius) hit = true;
               }
            } else if (draw.type === 'image') {
               const p = draw.points[0];
               const w = draw.imageWidth || 400;
               const h = draw.imageHeight || 300;
               const minX = p.x - w/2; const minY = p.y - h/2;
               if (localPos.x >= minX - radius && localPos.x <= minX + w + radius && localPos.y >= minY - radius && localPos.y <= minY + h + radius) hit = true;
            }
            if (hit) { hitDrawingId = id; break; }
         }
         if (hitDrawingId) {
            e.stopPropagation();
            import('../store').then(s => {
               if (!shift && !s.getSelectedDrawings().has(hitDrawingId!)) {
                  Tokens.clearSelection(); s.clearPropSelection(); s.clearDrawingSelection(); s.clearBgSelection();
               }
               if (s.getSelectedDrawings().has(hitDrawingId!) && shift) {
                   s.toggleDrawingSelection(hitDrawingId!, true);
               } else if (!s.getSelectedDrawings().has(hitDrawingId!)) {
                   s.toggleDrawingSelection(hitDrawingId!, shift);
               }
            });
            return;
         }
         
         // 4. Backgrounds
         if ((window as any).__IS_MAP_MENU_OPEN__) {
            let hitBgId: string | null = null;
            const bgEntries = Object.entries(bgSprites).reverse();
            for (const [id, sprite] of bgEntries) {
                if (!sprite) continue;
                const bgData = state.backgrounds.get(id) as any;
                if (bgData && bgData.locked) continue;
                const hw = sprite.width / 2; const hh = sprite.height / 2;
                if (localPos.x >= sprite.x - hw && localPos.x <= sprite.x + hw && localPos.y >= sprite.y - hh && localPos.y <= sprite.y + hh) { hitBgId = id; break; }
            }
            if (hitBgId) {
               e.stopPropagation();
               import('../store').then(s => {
                  if (!shift && !s.getSelectedBgs().has(hitBgId!)) {
                     Tokens.clearSelection(); s.clearPropSelection(); s.clearDrawingSelection(); s.clearBgSelection();
                  }
                  if (s.getSelectedBgs().has(hitBgId!) && shift) {
                     s.toggleBgSelection(hitBgId!, true);
                  } else if (!s.getSelectedBgs().has(hitBgId!)) {
                     s.toggleBgSelection(hitBgId!, shift);
                  }
               });
               return;
            }
         }
         
         // 5. Nothing hit (Clear selection)
         if (!shift) {
            import('../store').then(s => { Tokens.clearSelection(); s.clearPropSelection(); s.clearDrawingSelection(); s.clearBgSelection(); });
         }
      };
      
      app.stage.addEventListener('pointerdown', centralSelectHandler, { capture: true });

      // Cleanup on unmountive events
      const prevTokenCleanup = (app as any)._cleanupNativeEvents;
      (app as any)._cleanupNativeEvents = () => {
        if (prevTokenCleanup) prevTokenCleanup();
        app.stage.removeEventListener('pointerdown', centralSelectHandler, { capture: true });
        window.removeEventListener('pointermove', handleNativeMove);
        window.removeEventListener('pointerup', handleNativeUp);
        window.removeEventListener('pointercancel', handleNativeUp);
        window.removeEventListener('token-selection-updated', updateSelectionVisuals);
      };

      const bgSprites: Record<string, Sprite> = {};
      let draggingBgId: string | null = null;
      let groupDragOffsets: Record<string, {x: number, y: number}> = {};
      
      const marqueeGraphics = new Graphics();
      let isMarquee = false;
      let marqueeStart = { x: 0, y: 0 };
      viewport.addChild(marqueeGraphics);
      const snapGuidesGraphics = new Graphics();
      viewport.addChild(snapGuidesGraphics);

      const bgCatcher = new Graphics();
      bgCatcher.rect(-100000, -100000, 200000, 200000);
      bgCatcher.fill({ color: 0x000000, alpha: 0.001 });
      bgCatcher.eventMode = 'static';
      viewport.addChildAt(bgCatcher, 0);

      bgCatcher.on('pointerdown', (e) => {
        if (localState.activeTool === 'wall') {
          if (e.button === 2) {
            // Right-click removal is handled by the canvas listener above.
            // Keeping this branch inert avoids deleting two intersecting walls
            // from the same native/Pixi pointer event.
            return;
          }
          if (e.button === 0) {
            e.stopPropagation();
            const localPos = viewport.toLocal(e.global);
            wallDrawingStart = localPos;
            wallPreview.visible = true;
            const wallThickness = Math.max(4, (localState.drawWidth || 4) * 2);
            wallPreview.clear();
            wallPreview.moveTo(localPos.x, localPos.y);
            wallPreview.lineTo(localPos.x, localPos.y);
            wallPreview.stroke({ width: wallThickness + 2, color: '#f97316', alpha: 0.45, cap: 'round' });
          }
          return;
        }
        if (e.button === 0) {

           // Pen, shape, arrow logic remains here since they track dragging in PIXI coordinate space
           if (localState.activeTool === 'pen' || localState.activeTool === 'shape' || localState.activeTool === 'arrow') {
             e.stopPropagation();
             isDrawing = true;
             const localPos = viewport.toLocal(e.global);
             currentDrawingPoints = [localPos];
             currentDrawingGraphics.clear();
             currentDrawingGraphics.visible = true;
             
             // Temporarily highest zIndex for the drawing in progress
             const maxZ = Math.max(
                ...Array.from(state.backgrounds.values()).map((b: any) => b.zIndex || 0),
                ...Array.from(state.drawings.values()).map((d: any) => d.zIndex || 0),
                0
             );
             currentDrawingGraphics.zIndex = maxZ + 1;
             return;
          }
          if (localState.activeTool === 'text') {
             e.stopPropagation();
             const now = Date.now();
             if ((window as any).__lastTextTime && now - (window as any).__lastTextTime < 300) {
                 return;
             }
             (window as any).__lastTextTime = now;
             
             // Se já estiver editando um texto e clicar fora, apenas fecha a edição
             if (localState.editingTextId) {
                import('../store').then(s => {
                   s.setEditingTextId(null);
                });
                return;
             }
             
             const localPos = viewport.toLocal(e.global);
             import('../store').then(s => {
                const newId = 'txt_' + Date.now();
                s.addMapText({
                   id: newId,
                   text: 'Novo Texto',
                   x: localPos.x,
                   y: localPos.y,
                   color: localState.drawColor || '#ffffff',
                   backgroundColor: 'transparent',
                   fontSize: 24
                });
                s.setEditingTextId(newId);
             });
             return;
          }

          // Fecha a edição de texto ao clicar no mapa com a ferramenta de Seleção
          if (localState.editingTextId) {
             import('../store').then(s => s.setEditingTextId(null)).catch(() => {});
          }

          if (e.pointerType === 'touch') {
             // On mobile, touching the background is reserved for panning.
             // We allow text tool above, but skip selection box to prevent conflicts.
             if (!e.shiftKey) Tokens.clearSelection();
             return;
          }

          if (localState.activeTool === 'pan') {
             if (!e.shiftKey) Tokens.clearSelection();
             return;
          }

          if ((window as any).__IS_MAP_MENU_OPEN__) {
             isMarquee = true;
             const localPos = viewport.toLocal(e.global);
             marqueeStart = { x: localPos.x, y: localPos.y };
             marqueeGraphics.clear();
          } else {
             isSelecting = true;
             selectionStart = { x: e.global.x, y: e.global.y };
             selectionBox.clear();
             selectionBox.visible = true;
             if (!e.shiftKey) Tokens.clearSelection();
          }
        }
      });

      window.addEventListener('pointermove', (e) => {
        if (isMarquee) {
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           
           const w = localPos.x - marqueeStart.x;
           const h = localPos.y - marqueeStart.y;
           
           marqueeGraphics.clear();
           marqueeGraphics.rect(marqueeStart.x, marqueeStart.y, w, h);
           marqueeGraphics.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x, alpha: 0.8 });
           marqueeGraphics.fill({ color: 0xa855f7, alpha: 0.1 });
        }
      });

      window.addEventListener('pointerup', (e) => {
        if (isMarquee) {
           isMarquee = false;
           const rect = canvasEl.getBoundingClientRect();
           const localPos = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
           
           const minX = Math.min(marqueeStart.x, localPos.x);
           const maxX = Math.max(marqueeStart.x, localPos.x);
           const minY = Math.min(marqueeStart.y, localPos.y);
           const maxY = Math.max(marqueeStart.y, localPos.y);

           marqueeGraphics.clear();

           if (maxX - minX > 10 && maxY - minY > 10) {
             import('../store').then(store => {
                store.clearBgSelection();
                Array.from(state.backgrounds.entries()).forEach(([id, bgData]: [string, any]) => {
                  if (bgData.locked) return;
                  const sprite = bgSprites[id];
                  if (!sprite) return;
                  
                  const bgMinX = sprite.x - (sprite.width / 2);
                  const bgMaxX = sprite.x + (sprite.width / 2);
                  const bgMinY = sprite.y - (sprite.height / 2);
                  const bgMaxY = sprite.y + (sprite.height / 2);

                  const intersect = !(maxX < bgMinX || minX > bgMaxX || maxY < bgMinY || minY > bgMaxY);
                  if (intersect) store.toggleBgSelection(id, true);
                });
             });
           } else {
             import('../store').then(store => store.clearBgSelection()).catch(() => {});
           }
        }
      });

      const mapObserver = () => {
        const bgsState = state.backgrounds;
        
        // Remove sprites that are no longer in state
        Object.keys(bgSprites).forEach(id => {
          if (!bgsState.has(id)) {
            bgsContainer.removeChild(bgSprites[id]);
            bgSprites[id].destroy();
            delete bgSprites[id];
          }
        });

        // Add or update sprites
        Array.from(bgsState.entries()).forEach(([id, bgData]) => {
          const bg = bgData as any;
          if (!bgSprites[id]) {
            const sprite = new Sprite();
            sprite.anchor.set(0.5);
            sprite.eventMode = 'static';
            sprite.cursor = 'grab';
            
            // Interaction logic (now centralized in app.stage)
            sprite.on('pointerdown', (e) => {
               if (e.button !== 0) return;
            });

            bgsContainer.addChild(sprite);
            bgSprites[id] = sprite;

            // Load texture
            Assets.load(bg.imageUrl).then(texture => {
              if (!isDestroyed && bgSprites[id]) {
                bgSprites[id].texture = texture;
              }
            }).catch(() => console.error('Failed to load WebP map'));
          }

          const isMenuOpen = (window as any).__IS_MAP_MENU_OPEN__ === true;
          bgSprites[id].eventMode = isMenuOpen && !bg.locked ? 'static' : 'none';
          bgSprites[id].cursor = (isMenuOpen && !bg.locked) ? 'grab' : 'default';

          // Update position if not currently dragging it
          if (draggingBgId !== id) {
            bgSprites[id].x = bg.x;
            bgSprites[id].y = bg.y;
          }

          // Apply Scale, Opacity, and Hidden state
          bgSprites[id].scale.set(bg.scale ?? 1);
          bgSprites[id].alpha = bg.opacity ?? 1;
          bgSprites[id].visible = !bg.hidden;
          bgSprites[id].zIndex = bg.zIndex ?? 0;
        });
        bgsContainer.sortChildren();
        syncGizmo();
      };
      // GIZMO LOGIC
      // Persist gizmo graphics so we don't memory leak every frame
      const gizmoBox = new Graphics();
      const gizmoCorners = [new Graphics(), new Graphics(), new Graphics(), new Graphics()];
      gizmoContainer.addChild(gizmoBox);
      gizmoCorners.forEach(c => gizmoContainer.addChild(c));

      const syncGizmo = () => {
         const hideMenu = () => {
             const bar = document.getElementById('image-context-bar');
             if (bar) {
                bar.style.top = '-1000px';
                if ((window as any).__LAST_SELECTED_IMAGE_ID !== null) {
                   (window as any).__LAST_SELECTED_IMAGE_ID = null;
                   window.dispatchEvent(new CustomEvent('image-selected', { detail: null }));
                }
             }
         };

        const isMapOpen = (window as any).__IS_MAP_MENU_OPEN__ === true;
        const isSelectMode = localState.activeTool === 'select';
        
        const hasBgs = isMapOpen && localState.selectedBgs.size > 0;
        const hasTokens = isSelectMode && localState.selectedTokens && localState.selectedTokens.size > 0;
        const hasProps = isSelectMode && localState.selectedProps && localState.selectedProps.size > 0;
        const hasDrawings = isSelectMode && localState.selectedDrawings && localState.selectedDrawings.size > 0;

        if (!hasBgs && !hasTokens && !hasProps && !hasDrawings) {
          gizmoContainer.visible = false;
          hideMenu();
          return;
        }
        
        // If ONLY tokens are selected, we don't need the purple gizmo box, as they have their own selection rings and drag handlers.
        if (hasTokens && !hasBgs && !hasProps && !hasDrawings) {
          gizmoContainer.visible = false;
          hideMenu();
          return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasUnlocked = false;

        if (isMapOpen && localState.selectedBgs.size > 0) {
          Array.from(localState.selectedBgs).forEach(id => {
            const bgData = state.backgrounds.get(id) as any;
            const sprite = bgSprites[id];
            if (sprite && bgData && !bgData.locked && !bgData.hidden) {
              hasUnlocked = true;
              const hw = sprite.width / 2;
              const hh = sprite.height / 2;
              if (sprite.x - hw < minX) minX = sprite.x - hw;
              if (sprite.y - hh < minY) minY = sprite.y - hh;
              if (sprite.x + hw > maxX) maxX = sprite.x + hw;
              if (sprite.y + hh > maxY) maxY = sprite.y + hh;
            }
          });
        }
        
        if (isSelectMode && localState.selectedTokens && localState.selectedTokens.size > 0) {
           Array.from(localState.selectedTokens).forEach((id: string) => {
              const spriteData = tokenSprites[id];
              if (spriteData && spriteData.container) {
                 hasUnlocked = true;
                 const container = spriteData.container;
                 const hw = 30 * container.scale.x; // approx radius
                 const hh = 30 * container.scale.y;
                 if (container.x - hw < minX) minX = container.x - hw;
                 if (container.y - hh < minY) minY = container.y - hh;
                 if (container.x + hw > maxX) maxX = container.x + hw;
                 if (container.y + hh > maxY) maxY = container.y + hh;
              }
           });
        }
        
        if (isSelectMode && localState.selectedProps && localState.selectedProps.size > 0) {
           Array.from(localState.selectedProps).forEach(id => {
              const pData = state.props.get(id) as any;
              const sprite = propSprites[id];
              if (sprite && pData && !pData.isLocked) {
                 hasUnlocked = true;
                 const hw = sprite.width / 2;
                 const hh = sprite.height / 2;
                 if (sprite.x - hw < minX) minX = sprite.x - hw;
                 if (sprite.y - hh < minY) minY = sprite.y - hh;
                 if (sprite.x + hw > maxX) maxX = sprite.x + hw;
                 if (sprite.y + hh > maxY) maxY = sprite.y + hh;
              }
           });
        }
         
         if (isSelectMode && localState.selectedDrawings && localState.selectedDrawings.size > 0) {
            Array.from(localState.selectedDrawings).forEach(id => {
              const drawData = state.drawings.get(id) as any;
              const sprite = drawingSprites[id];
              const offsetX = sprite ? sprite.x : 0;
              const offsetY = sprite ? sprite.y : 0;
              if (drawData) {
                 hasUnlocked = true;
                 if (drawData.type === 'image' && drawData.points && drawData.points.length > 0) {
                    const p = drawData.points[0];
                    const hw = (drawData.imageWidth || 400) / 2;
                    const hh = (drawData.imageHeight || 300) / 2;
                    const minPx = p.x - hw + offsetX;
                    const minPy = p.y - hh + offsetY;
                    const maxPx = p.x + hw + offsetX;
                    const maxPy = p.y + hh + offsetY;
                    if (minPx < minX) minX = minPx;
                    if (minPy < minY) minY = minPy;
                    if (maxPx > maxX) maxX = maxPx;
                    if (maxPy > maxY) maxY = maxPy;
                 } else if (drawData.type === 'shape' && drawData.points && drawData.points.length >= 2) {
                    const p1 = drawData.points[0];
                    const p2 = drawData.points[drawData.points.length - 1];
                    const minPx = Math.min(p1.x, p2.x) + offsetX;
                    const minPy = Math.min(p1.y, p2.y) + offsetY;
                    const maxPx = Math.max(p1.x, p2.x) + offsetX;
                    const maxPy = Math.max(p1.y, p2.y) + offsetY;
                    if (minPx < minX) minX = minPx;
                    if (minPy < minY) minY = minPy;
                    if (maxPx > maxX) maxX = maxPx;
                    if (maxPy > maxY) maxY = maxPy;
                 } else if (drawData.points) {
                    drawData.points.forEach((p: any) => {
                       const px = p.x + offsetX;
                       const py = p.y + offsetY;
                       if (px < minX) minX = px;
                       if (py < minY) minY = py;
                       if (px > maxX) maxX = px;
                       if (py > maxY) maxY = py;
                    });
                 }
              }
            });
         }

         if (!hasUnlocked) {
           gizmoContainer.visible = false;
           hideMenu();
           return;
         }

         gizmoContainer.visible = true;
         gizmoContainer.x = 0;
         gizmoContainer.y = 0;

         const w = Math.max(1, maxX - minX);
         const h = Math.max(1, maxY - minY);

        // Determine if we are in Arrow Edit Mode (only 1 arrow selected)
        let isArrowMode = false;
        
        const imageContextBar = document.getElementById('image-context-bar');
        if (imageContextBar) {
           if (isSelectMode && localState.selectedDrawings && localState.selectedDrawings.size === 1 && localState.selectedBgs.size === 0 && (!localState.selectedProps || localState.selectedProps.size === 0)) {
              const id = Array.from(localState.selectedDrawings)[0];
              const d = state.drawings.get(id) as any;
              if (d && d.type === 'image') {
                 const pMin = viewport.toGlobal({ x: minX, y: minY });
                 const pMax = viewport.toGlobal({ x: maxX, y: maxY });
                 imageContextBar.style.top = `${pMax.y + 10}px`;
                 imageContextBar.style.left = `${(pMin.x + pMax.x) / 2}px`;
                 
                 if ((window as any).__LAST_SELECTED_IMAGE_ID !== id) {
                    (window as any).__LAST_SELECTED_IMAGE_ID = id;
                    window.dispatchEvent(new CustomEvent('image-selected', { detail: id }));
                 }
              } else {
                 imageContextBar.style.top = '-1000px';
                 if ((window as any).__LAST_SELECTED_IMAGE_ID !== null) {
                    (window as any).__LAST_SELECTED_IMAGE_ID = null;
                    window.dispatchEvent(new CustomEvent('image-selected', { detail: null }));
                 }
              }
           } else {
              imageContextBar.style.top = '-1000px';
              if ((window as any).__LAST_SELECTED_IMAGE_ID !== null) {
                 (window as any).__LAST_SELECTED_IMAGE_ID = null;
                 window.dispatchEvent(new CustomEvent('image-selected', { detail: null }));
              }
           }
        }
        let arrowData: any = null;
        let arrowId: string | null = null;
        
        if (isSelectMode && localState.selectedDrawings && localState.selectedDrawings.size === 1 && localState.selectedBgs.size === 0 && (!localState.selectedProps || localState.selectedProps.size === 0)) {
           const id = Array.from(localState.selectedDrawings)[0];
           const d = state.drawings.get(id) as any;
           if (d && (d.type === 'arrow' || d.type === 'pen' || d.type === 'path') && d.points && d.points.length >= 2) {
              // We'll allow dragging endpoints for any path/arrow, very excalidraw!
              isArrowMode = true;
              arrowData = d;
              arrowId = id;
           }
        }

        gizmoBox.clear();
        
        if (isArrowMode) {
           // Em modo seta, não desenhamos a caixa ao redor.
        } else {
           // Draw bounding box
           gizmoBox.rect(minX, minY, w, h);
           gizmoBox.fill({ color: 0xffffff, alpha: 0.001 }); // Transparent fill for click detection
           gizmoBox.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });
        }
        
        gizmoBox.eventMode = 'static';
        gizmoBox.cursor = 'move';
        gizmoBox.removeAllListeners();
        gizmoBox.on('pointerdown', (e) => {
           if (isArrowMode) return;
           e.stopPropagation();
           const rect = canvasEl.getBoundingClientRect();
           const startX = e.clientX - rect.left;
           const startY = e.clientY - rect.top;
           
           const originalStates: any[] = [];
           if (isMapOpen && localState.selectedBgs.size > 0) {
              Array.from(localState.selectedBgs).forEach(id => {
                const bgData = state.backgrounds.get(id) as any;
                const sprite = bgSprites[id];
                if (sprite && bgData && !bgData.locked && !bgData.hidden) {
                   originalStates.push({ type: 'bg', id, sprite, origX: sprite.x, origY: sprite.y });
                }
              });
           }
           if (isSelectMode && localState.selectedTokens && localState.selectedTokens.size > 0) {
              Array.from(localState.selectedTokens).forEach(id => {
                 const spriteData = tokenSprites[id];
                 if (spriteData && spriteData.container) {
                    originalStates.push({ type: 'token', id, sprite: spriteData.container, origX: spriteData.container.x, origY: spriteData.container.y });
                 }
              });
           }
           if (isSelectMode && localState.selectedProps && localState.selectedProps.size > 0) {
              Array.from(localState.selectedProps).forEach(id => {
                const pData = state.props.get(id) as any;
                const sprite = propSprites[id];
                if (sprite && pData && !pData.isLocked) {
                   originalStates.push({ type: 'prop', id, sprite, origX: sprite.x, origY: sprite.y });
                }
              });
           }
           if (isSelectMode && localState.selectedDrawings && localState.selectedDrawings.size > 0) {
              Array.from(localState.selectedDrawings).forEach(id => {
                 const drawData = state.drawings.get(id) as any;
                 const sprite = drawingSprites[id];
                 if (drawData && drawData.points && sprite) {
                    originalStates.push({ type: 'drawing', id, sprite, origX: sprite.x, origY: sprite.y, origPoints: drawData.points.map((p:any) => ({...p})) });
                 }
              });
           }
           
           const onDragMove = (moveEvent: PointerEvent) => {
              const currentX = moveEvent.clientX - rect.left;
              const currentY = moveEvent.clientY - rect.top;
              const dx = (currentX - startX) / viewport.scale.x;
              const dy = (currentY - startY) / viewport.scale.y;
              
              originalStates.forEach(item => {
                 if (item.type === 'bg' || item.type === 'prop' || item.type === 'drawing' || item.type === 'token') {
                     item.sprite.x = item.origX + dx;
                     item.sprite.y = item.origY + dy;
                 }
              });
              syncGizmo();
           };
           
           (window as any).__IS_GIZMO_DRAGGING = true;
           
           const onDragUp = () => {
              (window as any).__IS_GIZMO_DRAGGING = false;
              window.removeEventListener('pointermove', onDragMove);
              window.removeEventListener('pointerup', onDragUp);
              
              import('../store').then(s => {
                 import('../store/props').then(m => {
                    originalStates.forEach(item => {
                       if (item.type === 'bg') {
                          s.updateBackgroundProps(item.id, { x: item.sprite.x, y: item.sprite.y });
                       } else if (item.type === 'prop') {
                          m.updateMapProp(item.id, { x: item.sprite.x, y: item.sprite.y });
                       } else if (item.type === 'token') {
                          Tokens.update(item.id, { x: item.sprite.x, y: item.sprite.y });
                       } else if (item.type === 'drawing') {
                          const dx = item.sprite.x - item.origX;
                          const dy = item.sprite.y - item.origY;
                          const newPoints = item.origPoints.map((p: any) => ({ x: p.x + dx, y: p.y + dy }));
                          s.updateDrawing(item.id, { points: newPoints });
                          item.sprite.x = item.origX; 
                          item.sprite.y = item.origY;
                       }
                    });
                    setTimeout(syncGizmo, 10);
                 });
              });
           };
           
           window.addEventListener('pointermove', onDragMove);
           window.addEventListener('pointerup', onDragUp);
        });

        // Draw aesthetic corners
        const cornerSize = 8 / viewport.scale.x;
        
        let corners: any[] = [];
        if (isArrowMode) {
           corners = [
              {x: arrowData.points[0].x, y: arrowData.points[0].y, cursor: 'move', isPointIndex: 0},
              {x: arrowData.points[arrowData.points.length-1].x, y: arrowData.points[arrowData.points.length-1].y, cursor: 'move', isPointIndex: arrowData.points.length-1}
           ];
           gizmoCorners[2].visible = false;
           gizmoCorners[3].visible = false;
        } else {
           corners = [
             {x: minX, y: minY, cursor: 'nwse-resize'},
             {x: maxX, y: minY, cursor: 'nesw-resize'},
             {x: minX, y: maxY, cursor: 'nesw-resize'},
             {x: maxX, y: maxY, cursor: 'nwse-resize'}
           ];
           gizmoCorners[2].visible = true;
           gizmoCorners[3].visible = true;
        }
        
        corners.forEach((c, idx) => {
          const corner = gizmoCorners[idx];
          corner.clear();
          
          if (isArrowMode) {
             corner.circle(c.x, c.y, cornerSize);
          } else {
             corner.rect(c.x - cornerSize/2, c.y - cornerSize/2, cornerSize, cornerSize);
          }
          corner.fill({ color: 0xffffff });
          corner.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });
          corner.visible = true;
          
          corner.eventMode = 'static';
          corner.cursor = c.cursor;
          
          // Remove all previous event listeners to avoid duplication memory leaks
          corner.removeAllListeners();
          
          // Adicionar o evento de resize para todos os cantos
          corner.on('pointerdown', (e) => {
            e.stopPropagation();

            if (isArrowMode) {
               // ARROW DRAG LOGIC
               const pointIndex = c.isPointIndex;
               const originalPoints = arrowData.points.map((p:any)=>({...p}));
               
               const onArrowMove = (moveEvent: PointerEvent) => {
                  const rect = canvasEl.getBoundingClientRect();
                  const localPoint = viewport.toLocal({ x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top });
                  
                  const sprite = drawingSprites[arrowId!];
                  if (sprite) {
                     // We just update the points array in the state visually first (by bypassing Yjs for 60fps)
                     // Actually, manipulating Graphics directly is hard, we can just update Yjs! Yjs is fast enough locally.
                     // But to be smooth, we update Yjs.
                     const newPoints = [...originalPoints];
                     newPoints[pointIndex] = { x: localPoint.x, y: localPoint.y };
                     updateDrawing(arrowId!, { points: newPoints });
                  }
               };
               
               const onArrowUp = () => {
                  window.removeEventListener('pointermove', onArrowMove);
                  window.removeEventListener('pointerup', onArrowUp);
               };
               
               window.addEventListener('pointermove', onArrowMove);
               window.addEventListener('pointerup', onArrowUp);
               return;
            }

            let pivotX: number, pivotY: number, dirX: number;
            if (idx === 0) { pivotX = maxX; pivotY = maxY; dirX = -1; } // Top-Left
            else if (idx === 1) { pivotX = minX; pivotY = maxY; dirX = 1; } // Top-Right
            else if (idx === 2) { pivotX = maxX; pivotY = minY; dirX = -1; } // Bottom-Left
            else { pivotX = minX; pivotY = minY; dirX = 1; } // Bottom-Right

            const origW = maxX - minX;
            const origH = maxY - minY;

            const originalStates: any[] = [];
            
            if (isMapOpen && localState.selectedBgs.size > 0) {
               Array.from(localState.selectedBgs).forEach(id => {
                 const bgData = state.backgrounds.get(id) as any;
                 const sprite = bgSprites[id];
                 if (sprite && bgData && !bgData.locked && !bgData.hidden) {
                    originalStates.push({ type: 'bg', id, sprite, origX: sprite.x, origY: sprite.y, origScale: sprite.scale.x });
                 }
               });
            }
            if (isSelectMode && localState.selectedProps && localState.selectedProps.size > 0) {
               Array.from(localState.selectedProps).forEach(id => {
                 const pData = state.props.get(id) as any;
                 const sprite = propSprites[id];
                 if (sprite && pData && !pData.isLocked) {
                    originalStates.push({ type: 'prop', id, sprite, origX: sprite.x, origY: sprite.y, origDataScale: pData.scale, origScale: sprite.scale.x });
                 }
               });
             }
             
             if (isSelectMode && localState.selectedDrawings && localState.selectedDrawings.size > 0) {
                Array.from(localState.selectedDrawings).forEach(id => {
                   const drawData = state.drawings.get(id) as any;
                   const sprite = drawingSprites[id];
                   if (drawData && drawData.points && sprite) {
                      originalStates.push({ 
                         type: drawData.type === 'image' ? 'drawing-image' : 'drawing', 
                         id, 
                         sprite, 
                         origX: sprite.x, 
                         origY: sprite.y, 
                         origScale: sprite.scale.x, 
                         origPoints: drawData.points.map((p:any) => ({...p})),
                         origImgWidth: drawData.imageWidth || 400,
                         origImgHeight: drawData.imageHeight || 300
                      });
                   }
                });
             }

             let finalScaleRatio = 1;

            const onScaleMove = (moveEvent: PointerEvent) => {
              const rect = canvasEl.getBoundingClientRect();
              const localPoint = viewport.toLocal({ x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top });
              
              const dx = localPoint.x - pivotX;
              const scaleRatio = Math.max(0.1, (dx * dirX) / origW);
              finalScaleRatio = scaleRatio;
              
              originalStates.forEach(item => {
                item.sprite.scale.set(item.origScale * scaleRatio);
                item.sprite.x = pivotX + (item.origX - pivotX) * scaleRatio;
                item.sprite.y = pivotY + (item.origY - pivotY) * scaleRatio;
              });
              
              const newW = origW * scaleRatio;
              const newH = origH * scaleRatio;
              
              let newMinX, newMinY;
              if (idx === 0) { newMinX = pivotX - newW; newMinY = pivotY - newH; }
              else if (idx === 1) { newMinX = pivotX; newMinY = pivotY - newH; }
              else if (idx === 2) { newMinX = pivotX - newW; newMinY = pivotY; }
              else { newMinX = pivotX; newMinY = pivotY; }
              
              gizmoBox.clear();
              gizmoBox.rect(newMinX, newMinY, newW, newH);
              gizmoBox.fill({ color: 0xffffff, alpha: 0.001 });
              gizmoBox.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });
              
              gizmoCorners.forEach(c => c.visible = false);
            };

            const onScaleUp = () => {
              window.removeEventListener('pointermove', onScaleMove);
              window.removeEventListener('pointerup', onScaleUp);
              gizmoCorners.forEach(c => c.visible = true);
              
              import('../store').then(s => {
                import('../store/props').then(m => {
                   originalStates.forEach(item => {
                     if (item.type === 'bg') {
                        s.updateBackgroundProps(item.id, { 
                          scale: item.sprite.scale.x,
                          x: item.sprite.x,
                          y: item.sprite.y
                        });
                       } else if (item.type === 'prop') {
                        m.updateMapProp(item.id, {
                           scale: item.origDataScale * finalScaleRatio,
                           x: item.sprite.x,
                           y: item.sprite.y
                        });
                     } else if (item.type === 'drawing-image') {
                        const newPoints = item.origPoints.map((p: any) => ({
                           x: pivotX + (p.x - pivotX) * finalScaleRatio,
                           y: pivotY + (p.y - pivotY) * finalScaleRatio
                        }));
                        s.updateDrawing(item.id, { 
                          points: newPoints,
                          imageWidth: item.origImgWidth * finalScaleRatio,
                          imageHeight: item.origImgHeight * finalScaleRatio
                        });
                        item.sprite.scale.set(1);
                        item.sprite.x = 0;
                        item.sprite.y = 0;
                     } else if (item.type === 'drawing') {
                        const newPoints = item.origPoints.map((p: any) => ({
                           x: pivotX + (p.x - pivotX) * finalScaleRatio,
                           y: pivotY + (p.y - pivotY) * finalScaleRatio
                        }));
                        s.updateDrawing(item.id, { points: newPoints });
                        item.sprite.scale.set(1);
                        item.sprite.x = 0;
                        item.sprite.y = 0;
                     }
                   });
                   // Call syncGizmo AFTER all updates
                   setTimeout(syncGizmo, 10);
                });
              });
            };

            window.addEventListener('pointermove', onScaleMove);
            window.addEventListener('pointerup', onScaleUp);
          });
        });
      };

      state.backgrounds.observe(mapObserver);
      mapObserver();
      
      const drawObserver = () => {
        const drawingsState = state.drawings;
        
        Object.keys(drawingSprites).forEach(id => {
          const d = drawingsState.get(id) as any;
          let shouldRemove = !d || d.hidden;
          if (d && d.layerId) {
             const layer = state.drawingLayers?.get(d.layerId) as any;
             if (layer && layer.hidden) shouldRemove = true;
          }
          if (shouldRemove) {
            bgsContainer.removeChild(drawingSprites[id]);
            drawingSprites[id].destroy();
            delete drawingSprites[id];
          }
        });

        Array.from(drawingsState.entries()).forEach(([id, drawData]) => {
          const d = drawData as any;
          if (d.hidden) return;
          if (d.layerId) {
             const layer = state.drawingLayers?.get(d.layerId) as any;
             if (layer && layer.hidden) return;
          }
          if (!drawingSprites[id]) {
            const g = new Graphics();
            bgsContainer.addChild(g);
            drawingSprites[id] = g;
          }
          const g = drawingSprites[id];
          g.clear();
          g.zIndex = d.zIndex || 0;
          
          if (!d.points || d.points.length === 0) return;
          
          const colorStr = d.color || '#ef4444';
          const color = colorStr.startsWith('#') ? parseInt(colorStr.replace('#', '0x'), 16) : parseInt(colorStr, 16);
          const width = d.width || 4;

          if (d.type === 'path' || d.type === 'pen') {
            const paths = d.subPaths && d.subPaths.length > 0 ? d.subPaths : [d.points];
            for (const pts of paths) {
              if (pts.length < 3) {
                g.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                  g.lineTo(pts[i].x, pts[i].y);
                }
              } else {
                g.moveTo(pts[0].x, pts[0].y);
                let i = 1;
                for (i = 1; i < pts.length - 2; i++) {
                  const xc = (pts[i].x + pts[i + 1].x) / 2;
                  const yc = (pts[i].y + pts[i + 1].y) / 2;
                  g.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
                }
                g.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
              }
            }
            g.stroke({ width, color, alpha: 1, cap: 'round', join: 'round' });
          } else if (d.type === 'shape') {
            const subShapes = d.subShapes && d.subShapes.length > 0
              ? d.subShapes
              : (d.points.length >= 2 ? [{ shapeType: d.shapeType || 'rectangle', points: d.points }] : []);
            
            if (subShapes.length > 0) {
               for (const s of subShapes) {
                  if (s.points && s.points.length >= 2) {
                     const p1 = s.points[0];
                     const p2 = s.points[s.points.length - 1];
                     const minX = Math.min(p1.x, p2.x);
                     const minY = Math.min(p1.y, p2.y);
                     const w = Math.abs(p2.x - p1.x);
                     const h = Math.abs(p2.y - p1.y);
                     
                     if (s.shapeType === 'circle') {
                       g.ellipse(minX + w/2, minY + h/2, w/2, h/2);
                     } else if (s.shapeType === 'triangle') {
                       g.moveTo(minX + w/2, minY);
                       g.lineTo(minX + w, minY + h);
                       g.lineTo(minX, minY + h);
                       g.closePath();
                     } else {
                       g.rect(minX, minY, w, h);
                     }
                  }
               }

               if (d.fillColor || d.isFused) {
                  g.fill({ color: d.fillColor || color, alpha: 0.25 });
               }
               g.stroke({ width, color, alpha: 1 });
               
               g.removeChildren().forEach((c: any) => c.destroy());
               if (d.text && d.points.length >= 2) {
                  const p1 = d.points[0];
                  const p2 = d.points[d.points.length - 1];
                  const minX = Math.min(p1.x, p2.x);
                  const minY = Math.min(p1.y, p2.y);
                  const w = Math.abs(p2.x - p1.x);
                  const h = Math.abs(p2.y - p1.y);

                  const textStyle = {
                     fontFamily: 'Inter, sans-serif',
                     fontSize: 24,
                     fill: color,
                     wordWrap: true,
                     wordWrapWidth: Math.max(w - 10, 50),
                     align: 'center'
                  };
                  const textObj = new Text({ text: d.text, style: textStyle as any });
                  textObj.anchor.set(0.5);
                  textObj.x = minX + w/2;
                  textObj.y = minY + h/2;
                  g.addChild(textObj);
               }
            }
          } else if (d.type === 'arrow') {
             const paths = d.subPaths && d.subPaths.length > 0 ? d.subPaths : [d.points];
             for (const pts of paths) {
               if (pts.length >= 2) {
                 const p1 = pts[0];
                 const p2 = pts[pts.length - 1];
                 g.moveTo(p1.x, p1.y);
                 g.lineTo(p2.x, p2.y);
                 
                 const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                 const headlen = width * 3;
                 g.moveTo(p2.x, p2.y);
                 g.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
                 g.moveTo(p2.x, p2.y);
                 g.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
               }
             }
             g.stroke({ width, color, alpha: 1 });
          } else if (d.type === 'image' && d.imageUrl) {
             const p = d.points[0];
             const w = d.imageWidth || 400;
             const h = d.imageHeight || 300;
             
             let s = g.children[0] as Sprite;
             if (!s) {
                g.removeChildren().forEach((c: any) => c.destroy());
                s = new Sprite();
                s.anchor.set(0.5);
                g.addChild(s);
             }
             
             s.x = p.x;
             s.y = p.y;
             s.alpha = d.opacity !== undefined ? d.opacity : 1;
             
             const applyTransform = () => {
                 s.width = w;
                 s.height = h;
                 s.rotation = d.rotation || 0;
                 s.scale.x = Math.abs(s.scale.x) * (d.flipX ? -1 : 1);
                 s.scale.y = Math.abs(s.scale.y) * (d.flipY ? -1 : 1);
                 s.skew.x = d.skewX || 0;
                 s.skew.y = d.skewY || 0;
             };
             
             if ((s as any)._lastUrl !== d.imageUrl) {
                (s as any)._lastUrl = d.imageUrl;
                Assets.load(d.imageUrl).then(tex => { 
                  if (!g.destroyed) {
                      s.texture = tex;
                      applyTransform();
                  }
                }).catch(()=>{});
             } else if (s.texture) {
                applyTransform();
             }
          }
        });
        bgsContainer.sortChildren();
      };
      
      state.drawings.observe(drawObserver);
      drawObserver();
      window.addEventListener('map-menu-toggle', mapObserver);
      window.addEventListener('bg-selection-updated', syncGizmo);
      window.addEventListener('prop-selection-updated', syncGizmo);
      window.addEventListener('drawing-selection-updated', syncGizmo);
      window.addEventListener('token-selection-updated', syncGizmo);
      window.addEventListener('map-menu-toggle', syncGizmo);
      window.addEventListener('tool-changed', syncGizmo);

      const handleFocusToken = (e: any) => {
        const { tokenId } = e.detail;
        if (!tokenId) return;
        const token = state.tokens.get(tokenId) as any;
        if (token && token.x > -1000 && token.y > -1000) {
          const scale = viewport.scale.x;
          viewport.x = window.innerWidth / 2 - token.x * scale;
          viewport.y = window.innerHeight / 2 - token.y * scale;
        }
      };
      window.addEventListener('focus-token', handleFocusToken);
      
      mapObserver(); // initial load

      // Cleanup for observers
      (app as any)._cleanupMapObservers = () => {
        state.backgrounds.unobserve(mapObserver);
        state.drawings.unobserve(drawObserver);
        state.mapConfig.unobserve(mapConfigObserver);
        state.props.unobserve(propsObserver);
        state.walls.unobserve(syncWalls);
        window.removeEventListener('map-menu-toggle', mapObserver);
        window.removeEventListener('bg-selection-updated', syncGizmo);
        window.removeEventListener('prop-selection-updated', syncGizmo);
        window.removeEventListener('drawing-selection-updated', syncGizmo);
        window.removeEventListener('token-selection-updated', syncGizmo);
        window.removeEventListener('map-menu-toggle', syncGizmo);
        window.removeEventListener('tool-changed', syncGizmo);
        window.removeEventListener('focus-token', handleFocusToken);
      };

      // Add Native Window Dragging for Backgrounds (so they don't get stuck)
      const handleNativeBgMove = (e: PointerEvent) => {
        if (draggingBgId && bgSprites[draggingBgId]) {
          const sprite = bgSprites[draggingBgId];
          const primaryOffset = groupDragOffsets[draggingBgId];
          if (!primaryOffset) return;

          const rect = canvasEl.getBoundingClientRect();
          const worldPoint = viewport.toLocal({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          
          let targetX = worldPoint.x + primaryOffset.x;
          let targetY = worldPoint.y + primaryOffset.y;

          // Snapping Logic
          const snapThreshold = 15 / viewport.scale.x;
          const myHWidth = sprite.width / 2;
          const myHHeight = sprite.height / 2;
          
          const myEdges = {
             left: targetX - myHWidth, right: targetX + myHWidth,
             top: targetY - myHHeight, bottom: targetY + myHHeight,
             centerX: targetX, centerY: targetY
          };

          snapGuidesGraphics.clear();
          let snappedX: number | null = null;
          let snappedY: number | null = null;

          for (const [id, otherSprite] of Object.entries(bgSprites)) {
             if (groupDragOffsets[id]) continue;
             const otherHWidth = otherSprite.width / 2;
             const otherHHeight = otherSprite.height / 2;
             
             const otherEdges = {
                left: otherSprite.x - otherHWidth, right: otherSprite.x + otherHWidth,
                top: otherSprite.y - otherHHeight, bottom: otherSprite.y + otherHHeight,
                centerX: otherSprite.x, centerY: otherSprite.y
             };

             // X Snapping
             if (Math.abs(myEdges.left - otherEdges.right) < snapThreshold) { targetX = otherEdges.right + myHWidth; snappedX = otherEdges.right; }
             else if (Math.abs(myEdges.right - otherEdges.left) < snapThreshold) { targetX = otherEdges.left - myHWidth; snappedX = otherEdges.left; }
             else if (Math.abs(myEdges.left - otherEdges.left) < snapThreshold) { targetX = otherEdges.left + myHWidth; snappedX = otherEdges.left; }
             else if (Math.abs(myEdges.right - otherEdges.right) < snapThreshold) { targetX = otherEdges.right - myHWidth; snappedX = otherEdges.right; }
             else if (Math.abs(myEdges.centerX - otherEdges.centerX) < snapThreshold) { targetX = otherEdges.centerX; snappedX = otherEdges.centerX; }

             // Y Snapping
             if (Math.abs(myEdges.top - otherEdges.bottom) < snapThreshold) { targetY = otherEdges.bottom + myHHeight; snappedY = otherEdges.bottom; }
             else if (Math.abs(myEdges.bottom - otherEdges.top) < snapThreshold) { targetY = otherEdges.top - myHHeight; snappedY = otherEdges.top; }
             else if (Math.abs(myEdges.top - otherEdges.top) < snapThreshold) { targetY = otherEdges.top + myHHeight; snappedY = otherEdges.top; }
             else if (Math.abs(myEdges.bottom - otherEdges.bottom) < snapThreshold) { targetY = otherEdges.bottom - myHHeight; snappedY = otherEdges.bottom; }
             else if (Math.abs(myEdges.centerY - otherEdges.centerY) < snapThreshold) { targetY = otherEdges.centerY; snappedY = otherEdges.centerY; }
          }
          
          if (snappedX !== null) {
            snapGuidesGraphics.moveTo(snappedX, -100000);
            snapGuidesGraphics.lineTo(snappedX, 100000);
            snapGuidesGraphics.stroke({ color: 0xec4899, width: 2 / viewport.scale.x, alpha: 0.8 });
          }
          if (snappedY !== null) {
            snapGuidesGraphics.moveTo(-100000, snappedY);
            snapGuidesGraphics.lineTo(100000, snappedY);
            snapGuidesGraphics.stroke({ color: 0xec4899, width: 2 / viewport.scale.x, alpha: 0.8 });
          }

          const dx = targetX - sprite.x;
          const dy = targetY - sprite.y;

          Object.keys(groupDragOffsets).forEach(selId => {
            const selSprite = bgSprites[selId];
            if (selSprite) {
              selSprite.x += dx;
              selSprite.y += dy;
            }
          });

          syncGizmo();
        }
      };

      const handleNativeBgUp = () => {
        if (draggingBgId && bgSprites[draggingBgId]) {
          (window as any).__IS_DRAGGING_MAP__ = false;
          window.dispatchEvent(new Event('bg-drag-state'));
          snapGuidesGraphics.clear();
          Object.keys(groupDragOffsets).forEach(selId => {
            const selSprite = bgSprites[selId];
            if (selSprite) {
              selSprite.cursor = 'grab';
              state.backgrounds.set(selId, {
                ...(state.backgrounds.get(selId) as any),
                x: selSprite.x,
                y: selSprite.y
              });
            }
          });
          draggingBgId = null;
          groupDragOffsets = {};
        }
      };

      window.addEventListener('pointermove', handleNativeBgMove);
      window.addEventListener('pointerup', handleNativeBgUp);

      // Clean up native events later
      const originalCleanup = (app as any)._cleanupNativeEvents;
      (app as any)._cleanupNativeEvents = () => {
        if (originalCleanup) originalCleanup();
        window.removeEventListener('pointermove', handleNativeBgMove);
        window.removeEventListener('pointerup', handleNativeBgUp);
      };

      // Animation Loop for smooth sliding (LERP) and real-time state updates
      app.ticker.add(() => {
        // Redraw grid and FOW on ticker (only updates if changed internally)
        drawFogOfWar();

        // Update all tokens
        Object.entries(tokenSprites).forEach(([id, tokenData]) => {
          const tState = state.tokens.get(id) as any;
          if (!tState) return;

          // Combat Turn Highlight logic
          const combatIsActive = state.combat.get('isActive') as boolean;
          const participants = state.combat.get('participants') as any[] || [];
          const turnIndex = state.combat.get('turnIndex') as number || 0;
          let isCurrentTurn = false;
          if (combatIsActive && participants.length > 0 && participants[turnIndex]) {
            isCurrentTurn = participants[turnIndex].tokenId === id;
          }

          // Pulse glow effect (apenas se o token tiver glow)
          if (tokenData.glow) {
            const isChronicles = document.documentElement.getAttribute('data-theme')?.startsWith('chronicles');
            if (isChronicles) {
              tokenData.glow.visible = false;
            } else {
              tokenData.glow.visible = true;
              if (isCurrentTurn) {
                tokenData.glow.tint = 0xeab308;
                tokenData.glow.alpha = 0.6 + Math.abs(Math.sin(Date.now() / 200)) * 0.4;
              } else {
                tokenData.glow.tint = 0xffffff; // Reset tint
                tokenData.glow.alpha = 0.3 + Math.abs(Math.sin(Date.now() / 400)) * 0.7;
              }
            }
          }

          if (tokenData.lightAura) {
            const lightEnabled = tState.hasVision !== false;
            tokenData.lightAura.visible = lightEnabled;
            if (lightEnabled) {
              const pulse = 0.78 + Math.sin(Date.now() / 420) * 0.12;
              tokenData.lightAura.alpha = pulse;
              tokenData.lightAura.scale.set(0.96 + Math.sin(Date.now() / 420) * 0.05);
            }
          }
            
            // HP Change Detection (Floating Text)
            const currentHp = tState.hp;
            const previousHp = prevHpMap[id];
            
            if (previousHp !== undefined && currentHp !== previousHp) {
              const diff = currentHp - previousHp;
              const color = diff < 0 ? 0xff0000 : 0x22c55e;
              const sign = diff > 0 ? '+' : '';
              
              const floatText = new Text({ 
                text: `${sign}${diff}`, 
                style: { fontFamily: 'Inter', fontSize: 32, fill: color, fontWeight: '900', stroke: { color: 0x000000, width: 5 } } 
              });
              floatText.anchor.set(0.5);
              floatText.x = tokenData.container.x;
              floatText.y = tokenData.container.y - 40;
              tokensContainer.addChild(floatText);
              
              let life = 1.5;
              const ticker = app.ticker;
              const animateText = () => {
                life -= ticker.deltaTime * 0.02;
                floatText.y -= ticker.deltaTime * 1.5;
                floatText.alpha = Math.max(0, life);
                if (life <= 0) {
                  ticker.remove(animateText);
                  if (floatText.parent) floatText.parent.removeChild(floatText);
                  floatText.destroy();
                }
              };
              ticker.add(animateText);
            }
            prevHpMap[id] = currentHp;

          // Target ring rotation and visibility
          const isTargeted = localState.targets.has(id);
          tokenData.targetRing.visible = isTargeted;
          if (isTargeted) {
             tokenData.targetRing.rotation += 0.05;
          }

          // Update Mini HP Bar live (Optimize: only redraw if changed)
          const curHp = Number(tState.hp);
          const maxHp = Number(tState.maxHp || 1);
          const validHp = isNaN(curHp) ? 100 : curHp;
          const validMax = isNaN(maxHp) || maxHp === 0 ? Math.max(100, validHp) : maxHp;
          const hpPercent = Math.max(0, Math.min(1, validHp / validMax));
          const hpY = tokenData.hpBarY !== undefined ? tokenData.hpBarY + 1 : 36;
          
          if ((tokenData as any).lastHpPercent !== hpPercent) {
             (tokenData as any).lastHpPercent = hpPercent;
             tokenData.hpFill.clear();
             tokenData.hpFill.rect(-19, hpY, 38 * hpPercent, 4);
             tokenData.hpFill.fill(0xef4444);
          }
          
          // LERP position if someone else moved it
          let isBeingDragged = false;
          if (draggingTokenId) {
             const selected = Tokens.getSelectedIds();
             if (selected.includes(id)) {
                isBeingDragged = true;
             }
          }
          if ((window as any).__IS_GIZMO_DRAGGING && localState.selectedTokens?.has(id)) {
             isBeingDragged = true;
          }

           if (!isBeingDragged) {
             const dx = tState.x - tokenData.container.x;
             const dy = tState.y - tokenData.container.y;
             if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                tokenData.container.x += dx * 0.15;
                tokenData.container.y += dy * 0.15;
             }
          }
        });

        // Sync HTML Textarea Position
        if (localState.editingTextId && textSprites[localState.editingTextId]) {
           const container = textSprites[localState.editingTextId];
           const textEl = container.children[1] as Text;
           const globalPos = textEl.getGlobalPosition();
           const tState = state.mapTexts.get(localState.editingTextId) as any;
           
           if (tState) {
              textEditorInput.style.display = 'block';
              textEditorInput.style.left = `${globalPos.x}px`;
              textEditorInput.style.top = `${globalPos.y}px`;
              textEditorInput.style.transform = 'translate(-50%, -50%)'; // Anchor is 0.5
              
              const scale = viewport.scale.x;
              const currentFs = tState.fontSize || 24;
              const currentWidth = tState.wordWrapWidth || 300;
              
              if ((textEditorInput as any)._lastFs !== currentFs || (textEditorInput as any)._lastW !== currentWidth || (textEditorInput as any)._lastScale !== scale) {
                 textEditorInput.style.fontSize = `${currentFs * scale}px`;
                 textEditorInput.style.width = `${currentWidth * scale}px`;
                 textEditorInput.style.lineHeight = `${currentFs * 1.2 * scale}px`;
                 (textEditorInput as any)._lastFs = currentFs;
                 (textEditorInput as any)._lastW = currentWidth;
                 (textEditorInput as any)._lastScale = scale;
              }
              
              // Sempre ajusta a altura para bater exatamente com a altura do PIXI Text (evita pulos)
              // e forçamos box-sizing: border-box
              textEditorInput.style.boxSizing = 'border-box';
              textEditorInput.style.height = `${textEl.height * scale + 4}px`; // +4px para compensar a borda invisivel do textarea
              
              textEditorInput.style.color = tState.color || '#ffffff';
              
              // Sempre oculta o texto original enquanto está editando, evitando ver "dois textos"
              textEl.alpha = 0;
              
              // Move a barra de contexto para ficar logo abaixo do texto
              const contextBar = document.getElementById('text-context-bar');
              if (contextBar) {
                 const textHeight = textEl.height * scale;
                 contextBar.style.top = `${globalPos.y + textHeight / 2 + 10}px`;
                 contextBar.style.left = `${globalPos.x}px`;
              }
           }
        } else {
           textEditorInput.style.display = 'none';
           textEditorInput.blur();
           Object.values(textSprites).forEach(sprite => {
              if (sprite.children[1]) sprite.children[1].alpha = 1;
           });
           
           const contextBar = document.getElementById('text-context-bar');
           if (contextBar) {
              contextBar.style.top = '-1000px';
           }
        }
      });
    };

    initPixi();

    return () => {
      isDestroyed = true;
      
      if (appRef.current) {
        try {
          if ((appRef.current as any)._cleanupNativeEvents) {
            (appRef.current as any)._cleanupNativeEvents();
          }
          if ((appRef.current as any)._yjsObserver) {
            state.tokens.unobserve((appRef.current as any)._yjsObserver);
          }
          if ((appRef.current as any)._yjsTextObserver) {
            state.mapTexts.unobserve((appRef.current as any)._yjsTextObserver);
          }
          if ((appRef.current as any)._yjsLorePinsObserver && state.lorePins) {
            state.lorePins.unobserve((appRef.current as any)._yjsLorePinsObserver);
          }
          if ((appRef.current as any)._cleanupMapObservers) {
            (appRef.current as any)._cleanupMapObservers();
          }
          appRef.current.destroy(true);
        } catch (_e) {
          // Ignoramos erros de unmount
        }
        appRef.current = null;
      }
    };
  }, []);

  return <div ref={canvasRef} style={{ width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', position: 'relative', touchAction: 'none' }} />;
};
