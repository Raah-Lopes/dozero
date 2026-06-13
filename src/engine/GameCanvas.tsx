import React, { useEffect, useRef } from 'react';
import { Application, Graphics, Rectangle, Assets, Sprite, Container } from 'pixi.js';
import { state, updateTokenPosition } from '../store';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    let isDestroyed = false;

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
        if (e.button === 1 || e.button === 2) { // Middle or Right click
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
      // Prevent context menu
      canvasEl.addEventListener('contextmenu', e => e.preventDefault());

      // Backgrounds Container (under the grid)
      const bgsContainer = new Container();
      viewport.addChild(bgsContainer);

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

      // Add a mock token (Omega Sentinel) with premium sci-fi styling
      const token = new Container();

      // Base background and border
      const tokenBorder = new Graphics();
      tokenBorder.circle(0, 0, 26);
      tokenBorder.fill(0x020617);
      tokenBorder.stroke({ width: 3, color: 0x06b6d4, alpha: 0.9 });
      token.addChild(tokenBorder);

      // Async load portrait image
      Assets.load('/omega_sentinel.png').then((texture) => {
        if (isDestroyed) return;
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.width = 50;
        sprite.height = 50;
        
        // Circular mask for the sprite
        const mask = new Graphics();
        mask.circle(0, 0, 24);
        mask.fill(0xffffff);
        sprite.mask = mask;

        token.addChild(mask);
        token.addChild(sprite);
      });

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
      
      // Read initial position from Yjs
      const sentinelData = state.tokens.get('omega_sentinel') as any;
      const initialX = sentinelData?.x ?? 800;
      const initialY = sentinelData?.y ?? 400;
      token.x = initialX;
      token.y = initialY;
      
      // Variables for LERP animation
      let targetX = initialX;
      let targetY = initialY;
      let dragging = false;

      // Make token interactive using PixiJS EventSystem
      token.eventMode = 'static';
      token.cursor = 'pointer';
      // In PixiJS v8, Graphics objects do NOT automatically get a hit area from their drawn shapes!
      token.hitArea = new Rectangle(-30, -30, 60, 60);

      // Visual Debugger Container
      const debugContainer = new Graphics();
      viewport.addChild(token);
      viewport.addChild(debugContainer);

      let offset = { x: 0, y: 0 };

      const onDragEnd = () => {
        if (!dragging) return;
        dragging = false; 
        token.alpha = 1;

        if ((window as any).__PIXI_DIAGNOSTICS__) {
          (window as any).__PIXI_DIAGNOSTICS__.dragging = false;
        }

        let snapX = Math.round(token.x / gridSize) * gridSize;
        let snapY = Math.round(token.y / gridSize) * gridSize;
        
        // --- DINAMIC RADAR: SAFE AREA CLAMPING ---
        // (Disabled globally inside camera world, as UI panels are screen-space)
        // You could convert snapX/snapY back to screen coordinates to check, 
        // but for a VTT, locking to grid is sufficient.
        
        token.x = snapX;
        token.y = snapY;
        targetX = snapX;
        targetY = snapY;

        updateTokenPosition('omega_sentinel', snapX, snapY);
      };

      let lastTokenClickTime = 0;

      // Handle pointerdown natively on the token via PixiJS (because we need to know what we clicked)
      token.on('pointerdown', (e) => {
        // Prevent multi-selecting map when touching token
        e.stopPropagation();
        
        // Double-click detection
        const now = Date.now();
        if (now - lastTokenClickTime < 300) {
           window.dispatchEvent(new CustomEvent('token-dblclick', { detail: { tokenId: 'omega_sentinel' } }));
        }
        lastTokenClickTime = now;

        dragging = true;
        token.alpha = 0.5;
        
        const localPos = viewport.toLocal(e.global);
        offset = {
          x: token.x - localPos.x,
          y: token.y - localPos.y
        };

        if ((window as any).__PIXI_DIAGNOSTICS__) {
          (window as any).__PIXI_DIAGNOSTICS__.hovered = true;
          (window as any).__PIXI_DIAGNOSTICS__.dragging = true;
        }
        
        debugContainer.clear();
        debugContainer.circle(token.x, token.y, 10);
        debugContainer.fill(0x00ff00);
        setTimeout(() => debugContainer.clear(), 1000);
      });

      // USE NATIVE WINDOW EVENTS FOR MOVE AND UP
      // This makes the token completely immune to React UI intercepting the mouse!
      const handleNativeMove = (e: PointerEvent) => {
        if (dragging) {
          // Convert screen point to viewport world point
          const worldPoint = viewport.toLocal({ x: e.clientX, y: e.clientY });
          token.x = worldPoint.x + offset.x;
          token.y = worldPoint.y + offset.y;
          targetX = token.x;
          targetY = token.y;
        }
      };

      const handleNativeUp = () => {
        if (dragging) onDragEnd();
      };

      window.addEventListener('pointermove', handleNativeMove);
      window.addEventListener('pointerup', handleNativeUp);
      
      // Cleanup for native events
      (app as any)._cleanupNativeEvents = () => {
        window.removeEventListener('pointermove', handleNativeMove);
        window.removeEventListener('pointerup', handleNativeUp);
      };

      // Dictionary to keep track of generated map sprites
      const bgSprites: Record<string, Sprite> = {};
      let draggingBgId: string | null = null;
      let bgDragOffset = { x: 0, y: 0 };

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
              const currentBg = state.backgrounds.get(id) as any;
              if (!currentBg) return;

              const isMenuOpen = (window as any).__IS_MAP_MENU_OPEN__ === true;
              
              if (!isMenuOpen) return; // Ignore completely if menu is closed

              if (currentBg.locked) {
                // If locked, just select it but don't drag
                window.dispatchEvent(new CustomEvent('bg-select', { detail: { id, multi: e.shiftKey || e.ctrlKey } }));
                return;
              }

              draggingBgId = id;
              sprite.cursor = 'grabbing';
              
              const localPos = viewport.toLocal(e.global);
              bgDragOffset = {
                x: sprite.x - localPos.x,
                y: sprite.y - localPos.y
              };
              
              // Select it
              window.dispatchEvent(new CustomEvent('bg-select', { detail: { id, multi: e.shiftKey || e.ctrlKey } }));
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
        });
      };

      state.backgrounds.observe(mapObserver);
      window.addEventListener('map-menu-toggle', mapObserver);
      mapObserver(); // initial load

      // Cleanup for observers
      (app as any)._yjsMapObserver = mapObserver;

      // Add Native Window Dragging for Backgrounds (so they don't get stuck)
      const handleNativeBgMove = (e: PointerEvent) => {
        if (draggingBgId && bgSprites[draggingBgId]) {
          const sprite = bgSprites[draggingBgId];
          const worldPoint = viewport.toLocal({ x: e.clientX, y: e.clientY });
          sprite.x = worldPoint.x + bgDragOffset.x;
          sprite.y = worldPoint.y + bgDragOffset.y;
        }
      };

      const handleNativeBgUp = () => {
        if (draggingBgId && bgSprites[draggingBgId]) {
          const sprite = bgSprites[draggingBgId];
          sprite.cursor = 'grab';
          // Save to Yjs
          state.backgrounds.set(draggingBgId, {
            ...(state.backgrounds.get(draggingBgId) as any),
            x: sprite.x,
            y: sprite.y
          });
          draggingBgId = null;
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
        if ((window as any).__PIXI_DIAGNOSTICS__) {
          (window as any).__PIXI_DIAGNOSTICS__.tokenX = token.x;
          (window as any).__PIXI_DIAGNOSTICS__.tokenY = token.y;
        }

        // Pulse glow effect
        glow.alpha = 0.3 + Math.abs(Math.sin(Date.now() / 400)) * 0.7;

        // Update Mini HP Bar live
        const sentinelData = state.tokens.get('omega_sentinel') as any;
        if (sentinelData) {
          const hpPercent = Math.max(0, sentinelData.hp / sentinelData.maxHp);
          hpBarFill.clear();
          hpBarFill.rect(-19, 36, 38 * hpPercent, 4);
          hpBarFill.fill(0xef4444);
        }

        if (!dragging && (token.x !== targetX || token.y !== targetY)) {
          const dx = targetX - token.x;
          const dy = targetY - token.y;
          
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            token.x = targetX;
            token.y = targetY;
          } else {
            token.x += dx * 0.15;
            token.y += dy * 0.15;
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
          if ((appRef.current as any)._yjsMapObserver) {
            state.backgrounds.unobserve((appRef.current as any)._yjsMapObserver);
            window.removeEventListener('map-menu-toggle', (appRef.current as any)._yjsMapObserver);
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
