import React, { useEffect, useRef } from 'react';
import { Application, Graphics, Rectangle, Assets, Sprite, Container, Text, AlphaFilter } from 'pixi.js';
import { state, updateTokenPosition, toggleTarget, localState, addTensionClock, removeTensionClock, updateTensionClockProps, triggerClockConsequence } from '../store';

const prevHpMap: Record<string, number> = {};
let lastTokenClickTime = 0;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    let isDestroyed = false;

    // GM check
    const isGM = localStorage.getItem('isGM') === 'true';

    const initPixi = async () => {
      const app = new Application();
      appRef.current = app;

      try {
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x18181b, // --bg-secondary
          antialias: true,
        });
      } catch (e) {
        console.warn("PixiJS Init failed (likely aborted by React):", e);
        return;
      }

      if (isDestroyed) {
        try { app.destroy(true); } catch (e) {}
        return;
      }

      if (!canvasRef.current) return;
      canvasRef.current.appendChild(app.canvas as unknown as Node);
      
      const canvasEl = app.canvas as HTMLCanvasElement;
      canvasEl.style.pointerEvents = 'auto';
      canvasEl.style.touchAction = 'none';

      // Master Camera Container
      const viewport = new Container();
      viewport.x = window.innerWidth / 2;
      viewport.y = window.innerHeight / 2;
      app.stage.addChild(viewport);

      // Camera Controls
      let isPanning = false;
      let panStart = { x: 0, y: 0 };
      
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
        if (e.button === 2 || e.button === 1) { // Middle or Right click
          isPanning = true;
          panStart = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
          canvasEl.style.cursor = 'grabbing';
        }
      });
      window.addEventListener('pointermove', (e) => {
        if (isPanning) {
          viewport.x = e.clientX - panStart.x;
          viewport.y = e.clientY - panStart.y;
        }
      });
      window.addEventListener('pointerup', (e) => {
        if (e.button === 1 || e.button === 2) {
          isPanning = false;
          canvasEl.style.cursor = 'default';
        }
      });

      // HTML5 Drag and Drop to spawn/move tokens
      canvasEl.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer!.dropEffect = 'move';
      });

      canvasEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const tokenId = e.dataTransfer?.getData('tokenId');
        if (tokenId) {
          const rect = canvasEl.getBoundingClientRect();
          const dropX = e.clientX - rect.left;
          const dropY = e.clientY - rect.top;
          
          // Convert to world coordinates
          const worldPoint = viewport.toLocal({ x: dropX, y: dropY });
          
          // Snap to grid
          const gridSize = 50;
          const snapX = Math.round(worldPoint.x / gridSize) * gridSize;
          const snapY = Math.round(worldPoint.y / gridSize) * gridSize;
          
          updateTokenPosition(tokenId, snapX, snapY);
        }
      });

      // Prevent context menu
      canvasEl.addEventListener('contextmenu', e => e.preventDefault());

      // Backgrounds Container (under the grid)
      const bgsContainer = new Container();
      bgsContainer.sortableChildren = true;
      viewport.addChild(bgsContainer);

      // Gizmo Container for selected backgrounds
      const gizmoContainer = new Container();
      viewport.addChild(gizmoContainer);

      // Create an infinite grid background
      const grid = new Graphics();
      grid.setStrokeStyle({ width: 1, color: 0x1e293b, alpha: 0.5 });
      
      const gridSize = 50;
      const gridRange = 10000;
      for (let i = -gridRange; i < gridRange; i += gridSize) {
        grid.moveTo(i, -gridRange);
        grid.lineTo(i, gridRange);
      }
      for (let j = -gridRange; j < gridRange; j += gridSize) {
        grid.moveTo(-gridRange, j);
        grid.lineTo(gridRange, j);
      }
      grid.stroke();
      viewport.addChild(grid);

      // Tokens Layer
      const tokensContainer = new Container();
      viewport.addChild(tokensContainer);

      const tokenSprites: Record<string, { container: Container, glow: Graphics, hpFill: Graphics, targetRing: Graphics }> = {};
      let draggingTokenId: string | null = null;
      let tokenDragOffset = { x: 0, y: 0 };

      const syncTokens = () => {
        const tokensState = state.tokens;

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

          if (!tokenSprites[id]) {
            const token = new Container();
            
            // Base background and border
            const tokenBorder = new Graphics();
            tokenBorder.circle(0, 0, 26);
            tokenBorder.fill(0x020617);
            tokenBorder.stroke({ width: 3, color: 0x06b6d4, alpha: 0.9 });
            token.addChild(tokenBorder);

            // Async load portrait image (Support custom imageUrl)
            const imgPath = t.imageUrl ? t.imageUrl : (id === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg');
            
            Assets.load(imgPath).then((texture) => {
              if (isDestroyed || !tokenSprites[id]) return;
              const sprite = new Sprite(texture);
              sprite.anchor.set(0.5);
              sprite.width = 50;
              sprite.height = 50;
              
              const mask = new Graphics();
              mask.circle(0, 0, 24);
              mask.fill(0xffffff);
              sprite.mask = mask;

              token.addChild(mask);
              token.addChild(sprite);
            }).catch(() => {});

            // Pulsing Neon Glow
            const glow = new Graphics();
            glow.circle(0, 0, 30);
            glow.stroke({ width: 6, color: 0x0ea5e9, alpha: 1 });
            token.addChild(glow);

            // Attached Mini HP Bar
            const hpBarBg = new Graphics();
            hpBarBg.rect(-20, 35, 40, 6);
            hpBarBg.fill(0x000000);
            hpBarBg.stroke({ width: 1, color: 0x1e293b });
            token.addChild(hpBarBg);

            const hpBarFill = new Graphics();
            hpBarFill.rect(-19, 36, 38, 4);
            hpBarFill.fill(0xef4444);
            token.addChild(hpBarFill);

            // Target Ring (Hidden by default)
            const targetRing = new Graphics();
            targetRing.circle(0, 0, 36);
            targetRing.stroke({ width: 4, color: 0xef4444, alpha: 0.8 });
            targetRing.visible = false;
            token.addChild(targetRing);

            token.eventMode = 'static';
            token.cursor = 'pointer';
            token.hitArea = new Rectangle(-30, -30, 60, 60);

            token.on('pointerdown', (e) => {
              e.stopPropagation();

              // Right click to target
              if (e.button === 2) {
                toggleTarget(id);
                return;
              }
              
              const now = Date.now();
              if (now - lastTokenClickTime < 300) {
                 window.dispatchEvent(new CustomEvent('token-dblclick', { detail: { tokenId: id } }));
              }
              lastTokenClickTime = now;

              draggingTokenId = id;
              token.alpha = 0.5;
              
              const localPos = viewport.toLocal(e.global);
              tokenDragOffset = { x: token.x - localPos.x, y: token.y - localPos.y };
            });

            // Prevent context menu on right click on tokens
            token.on('rightdown', (e) => e.stopPropagation());

            tokensContainer.addChild(token);
            tokenSprites[id] = { container: token, glow, hpFill: hpBarFill, targetRing };
            
            token.x = t.x;
            token.y = t.y;
          } else {
            // If not dragging, animate to new position (or just set it)
            if (draggingTokenId !== id) {
              const dx = t.x - tokenSprites[id].container.x;
              const dy = t.y - tokenSprites[id].container.y;
              if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                tokenSprites[id].container.x = t.x;
                tokenSprites[id].container.y = t.y;
              }
            }
          }
        });
      };

      state.tokens.observe(syncTokens);
      syncTokens();
      (app as any)._yjsObserver = syncTokens;

      const onDragEnd = () => {
        if (!draggingTokenId) return;
        const id = draggingTokenId;
        const tokenData = tokenSprites[id];
        if (!tokenData) return;
        
        const token = tokenData.container;
        draggingTokenId = null; 
        token.alpha = 1;

        const gridSize = 50;
        let snapX = Math.round(token.x / gridSize) * gridSize;
        let snapY = Math.round(token.y / gridSize) * gridSize;
        
        token.x = snapX;
        token.y = snapY;

        updateTokenPosition(id, snapX, snapY);
      };

      const handleNativeMove = (e: PointerEvent) => {
        const worldPoint = viewport.toLocal({ x: e.clientX, y: e.clientY });

        if (draggingTokenId && tokenSprites[draggingTokenId]) {
          const token = tokenSprites[draggingTokenId].container;
          token.x = worldPoint.x + tokenDragOffset.x;
          token.y = worldPoint.y + tokenDragOffset.y;
        }
      };

      const handleNativeUp = () => {
        if (draggingTokenId) onDragEnd();
      };

      window.addEventListener('pointermove', handleNativeMove);
      window.addEventListener('pointerup', handleNativeUp);

      // Cleanup on unmountive events
      const prevTokenCleanup = (app as any)._cleanupNativeEvents;
      (app as any)._cleanupNativeEvents = () => {
        if (prevTokenCleanup) prevTokenCleanup();
        window.removeEventListener('pointermove', handleNativeMove);
        window.removeEventListener('pointerup', handleNativeUp);
      };

      const bgSprites: Record<string, Sprite> = {};
      let draggingBgId: string | null = null;
      let groupDragOffsets: Record<string, {x: number, y: number}> = {};
      
      // Marquee Selection Logic
      let isMarquee = false;
      let marqueeStart = { x: 0, y: 0 };
      const marqueeGraphics = new Graphics();
      viewport.addChild(marqueeGraphics);

      // Snap Guides
      const snapGuidesGraphics = new Graphics();
      viewport.addChild(snapGuidesGraphics);

      // Background Catcher for Marquee (foolproof way to catch empty space clicks)
      const bgCatcher = new Graphics();
      bgCatcher.rect(-100000, -100000, 200000, 200000);
      bgCatcher.fill({ color: 0x000000, alpha: 0.001 });
      bgCatcher.eventMode = 'static';
      viewport.addChildAt(bgCatcher, 0);

      bgCatcher.on('pointerdown', (e) => {
        if (e.button === 0 && (window as any).__IS_MAP_MENU_OPEN__) {
           isMarquee = true;
           const localPos = viewport.toLocal(e.global);
           marqueeStart = { x: localPos.x, y: localPos.y };
           marqueeGraphics.clear();
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
             import('../store').then(store => store.clearBgSelection());
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
            
            // Interaction logic
            sprite.on('pointerdown', (e) => {
              if (e.button !== 0) return; // Only left click
              
              if ((window as any).__IS_MAP_MENU_OPEN__) {
                e.stopPropagation();
                import('../store').then(s => {
                  s.toggleBgSelection(id, e.shiftKey || e.ctrlKey);
                });
                
                if (!bg.locked) {
                  draggingBgId = id;
                  (window as any).__IS_DRAGGING_MAP__ = true;
                  window.dispatchEvent(new Event('bg-drag-state'));
                  groupDragOffsets = {};
                  const localPoint = viewport.toLocal(e.global);
                  
                  const isSelected = localState.selectedBgs.has(id);
                  if (!isSelected) {
                    groupDragOffsets[id] = { x: sprite.x - localPoint.x, y: sprite.y - localPoint.y };
                  } else {
                    localState.selectedBgs.forEach(selId => {
                       const selSprite = bgSprites[selId];
                       const selData = state.backgrounds.get(selId) as any;
                       if (selSprite && selData && !selData.locked) {
                          groupDragOffsets[selId] = { x: selSprite.x - localPoint.x, y: selSprite.y - localPoint.y };
                       }
                    });
                  }
                }
              }
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
          bgSprites[id].eventMode = isMenuOpen ? 'static' : 'none';
          bgSprites[id].cursor = (isMenuOpen && !bg.locked) ? 'grab' : (isMenuOpen ? 'pointer' : 'default');

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
        syncGizmo();
      };

      // GIZMO LOGIC
      // Persist gizmo graphics so we don't memory leak every frame
      const gizmoBox = new Graphics();
      const gizmoCorners = [new Graphics(), new Graphics(), new Graphics(), new Graphics()];
      gizmoContainer.addChild(gizmoBox);
      gizmoCorners.forEach(c => gizmoContainer.addChild(c));

      const syncGizmo = () => {
        if (localState.selectedBgs.size === 0 || !(window as any).__IS_MAP_MENU_OPEN__) {
          gizmoContainer.visible = false;
          return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const selectedIds = Array.from(localState.selectedBgs);
        let hasUnlocked = false;

        selectedIds.forEach(id => {
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

        if (!hasUnlocked) {
          gizmoContainer.visible = false;
          return;
        }

        gizmoContainer.visible = true;
        gizmoContainer.x = 0;
        gizmoContainer.y = 0;

        const w = maxX - minX;
        const h = maxY - minY;

        // Draw bounding box
        gizmoBox.clear();
        gizmoBox.rect(minX, minY, w, h);
        gizmoBox.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });

        // Draw aesthetic corners
        const cornerSize = 8 / viewport.scale.x;
        const corners = [
          {x: minX, y: minY, cursor: 'nwse-resize'},
          {x: maxX, y: minY, cursor: 'nesw-resize'},
          {x: minX, y: maxY, cursor: 'nesw-resize'},
          {x: maxX, y: maxY, cursor: 'nwse-resize'}
        ];
        
        corners.forEach((c, idx) => {
          const corner = gizmoCorners[idx];
          corner.clear();
          corner.rect(c.x - cornerSize/2, c.y - cornerSize/2, cornerSize, cornerSize);
          corner.fill({ color: 0xffffff });
          corner.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });
          
          corner.eventMode = 'static';
          corner.cursor = c.cursor;
          
          // Remove all previous event listeners to avoid duplication memory leaks
          corner.removeAllListeners();
          
          // Make bottom-right corner the scaler for ANY number of items!
          if (idx === 3) {
            corner.on('pointerdown', (e) => {
              e.stopPropagation();

              const pivotX = minX;
              const pivotY = minY;
              const origW = maxX - minX;
              const origH = maxY - minY;

              // Filter out locked backgrounds from moving
              const originalStates = selectedIds
                .filter(id => !(state.backgrounds.get(id) as any).locked)
                .map(id => {
                  const sprite = bgSprites[id];
                  return {
                    id,
                    sprite,
                    origX: sprite.x,
                    origY: sprite.y,
                    origScale: sprite.scale.x
                  };
                });

              const onScaleMove = (moveEvent: PointerEvent) => {
                const rect = canvasEl.getBoundingClientRect();
                const localPoint = viewport.toLocal({ x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top });
                
                const dx = localPoint.x - pivotX;
                const scaleRatio = Math.max(0.1, dx / origW);
                
                originalStates.forEach(item => {
                  item.sprite.scale.set(item.origScale * scaleRatio);
                  item.sprite.x = pivotX + (item.origX - pivotX) * scaleRatio;
                  item.sprite.y = pivotY + (item.origY - pivotY) * scaleRatio;
                });
                
                // Only redraw the box visually, do NOT recreate objects
                const newW = origW * scaleRatio;
                const newH = origH * scaleRatio;
                
                gizmoBox.clear();
                gizmoBox.rect(pivotX, pivotY, newW, newH);
                gizmoBox.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });
                
                // Hide corners while dragging to avoid lag
                gizmoCorners.forEach(c => c.visible = false);
              };

              const onScaleUp = () => {
                window.removeEventListener('pointermove', onScaleMove);
                window.removeEventListener('pointerup', onScaleUp);
                gizmoCorners.forEach(c => c.visible = true);
                
                import('../store').then(s => {
                  originalStates.forEach(item => {
                    s.updateBackgroundProps(item.id, { 
                      scale: item.sprite.scale.x,
                      x: item.sprite.x,
                      y: item.sprite.y
                    });
                  });
                });
                syncGizmo();
              };

              window.addEventListener('pointermove', onScaleMove);
              window.addEventListener('pointerup', onScaleUp);
            });
          }
        });
      };

      state.backgrounds.observe(mapObserver);
      window.addEventListener('map-menu-toggle', mapObserver);
      window.addEventListener('bg-selection-updated', syncGizmo);
      window.addEventListener('map-menu-toggle', syncGizmo);
      
      mapObserver(); // initial load

      // Cleanup for observers
      (app as any)._cleanupMapObservers = () => {
        state.backgrounds.unobserve(mapObserver);
        window.removeEventListener('map-menu-toggle', mapObserver);
        window.removeEventListener('bg-selection-updated', syncGizmo);
        window.removeEventListener('map-menu-toggle', syncGizmo);
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

          // Pulse glow effect
          if (isCurrentTurn) {
            // Strong yellow/gold glow for current turn
            tokenData.glow.clear();
            tokenData.glow.circle(0, 0, 40);
            tokenData.glow.fill({ color: 0xeab308, alpha: 0.6 + Math.abs(Math.sin(Date.now() / 200)) * 0.4 });
            tokenData.glow.alpha = 1;
          } else {
            // Default cyan subtle glow
            tokenData.glow.clear();
            tokenData.glow.circle(0, 0, 40);
            tokenData.glow.fill({ color: 0x06b6d4, alpha: 0.4 });
            tokenData.glow.alpha = 0.3 + Math.abs(Math.sin(Date.now() / 400)) * 0.7;
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

          tokenData.container.visible = true;

          // Target ring rotation and visibility
          const isTargeted = localState.targets.has(id);
          tokenData.targetRing.visible = isTargeted;
          if (isTargeted) {
             tokenData.targetRing.rotation += 0.05;
          }

          // Update Mini HP Bar live
          const hpPercent = Math.max(0, tState.hp / tState.maxHp);
          tokenData.hpFill.clear();
          tokenData.hpFill.rect(-19, 36, 38 * hpPercent, 4);
          tokenData.hpFill.fill(0xef4444);
          
          // LERP position if someone else moved it
          if (draggingTokenId !== id) {
             const dx = tState.x - tokenData.container.x;
             const dy = tState.y - tokenData.container.y;
             if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                tokenData.container.x += dx * 0.15;
                tokenData.container.y += dy * 0.15;
             }
          }
        });
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
          if ((appRef.current as any)._cleanupMapObservers) {
            (appRef.current as any)._cleanupMapObservers();
          }
          appRef.current.destroy(true);
        } catch (e) {
          // Ignoramos erros de unmount
        }
        appRef.current = null;
      }
    };
  }, []);

  return <div ref={canvasRef} style={{ width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }} />;
};
