import React, { useEffect, useRef } from 'react';
import { Application, Graphics, Rectangle, Assets, Sprite, Container } from 'pixi.js';
import { state, updateTokenPosition, toggleTarget, localState } from '../store';

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

      const tokensContainer = new Container();
      viewport.addChild(tokensContainer);

      // Visual Debugger Container
      const debugContainer = new Graphics();
      viewport.addChild(debugContainer);

      const tokenSprites: Record<string, { container: Container, glow: Graphics, hpFill: Graphics, targetRing: Graphics }> = {};
      let draggingTokenId: string | null = null;
      let tokenDragOffset = { x: 0, y: 0 };
      let lastTokenClickTime = 0;

      const tokenObserver = () => {
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
                // Simple LERP is handled in ticker, we just set target here
                // For simplicity, just snap for now, LERP requires separate state
                tokenSprites[id].container.x = t.x;
                tokenSprites[id].container.y = t.y;
              }
            }
          }
        });
      };

      state.tokens.observe(tokenObserver);
      tokenObserver();
      (app as any)._yjsObserver = tokenObserver;

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
        if (draggingTokenId && tokenSprites[draggingTokenId]) {
          const token = tokenSprites[draggingTokenId].container;
          const worldPoint = viewport.toLocal({ x: e.clientX, y: e.clientY });
          token.x = worldPoint.x + tokenDragOffset.x;
          token.y = worldPoint.y + tokenDragOffset.y;
        }
      };

      const handleNativeUp = () => {
        if (draggingTokenId) onDragEnd();
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
