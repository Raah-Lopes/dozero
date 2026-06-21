import React, { useEffect, useRef } from 'react';
// @ts-ignore - auto fix
import { Application, Graphics, Rectangle, Assets, Sprite, Container, Text, AlphaFilter } from 'pixi.js';
import { state, updateTokenPosition, toggleTarget, localState, getMapConfig, getSelectedTokens, clearTokenSelection, selectTokensBulk, toggleTokenSelection } from '../store';

function hexRound(q: number, r: number) {
  let s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const q_diff = Math.abs(rq - q);
  const r_diff = Math.abs(rr - r);
  const s_diff = Math.abs(rs - s);
  if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
  else if (r_diff > s_diff) rr = -rq - rs;
  return { q: rq, r: rr };
}

function pixelToHex(x: number, y: number, type: 'hex_h' | 'hex_v', size: number) {
  let q: number, r: number;
  if (type === 'hex_h') { // flat-top
    q = (2/3 * x) / size;
    r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
  } else { // pointy-top
    q = (Math.sqrt(3)/3 * x - 1/3 * y) / size;
    r = (2/3 * y) / size;
  }
  return hexRound(q, r);
}

function hexToPixel(q: number, r: number, type: 'hex_h' | 'hex_v', size: number) {
  let x: number, y: number;
  if (type === 'hex_h') { // flat-top
    x = size * (3/2 * q);
    y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  } else { // pointy-top
    x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
    y = size * (3/2 * r);
  }
  return { x, y };
}

function snapToGrid(x: number, y: number, config: any) {
  if (config.gridType === 'square' || config.gridType === 'dots_square') {
    return {
      x: Math.round(x / config.gridSize) * config.gridSize,
      y: Math.round(y / config.gridSize) * config.gridSize
    };
  } else if (config.gridType === 'hex_h' || config.gridType === 'hex_v' || config.gridType === 'dots_hex') {
    const hexType = (config.gridType === 'hex_h') ? 'hex_h' : 'hex_v';
    const hex = pixelToHex(x, y, hexType, config.gridSize);
    return hexToPixel(hex.q, hex.r, hexType, config.gridSize);
  }
  return { x, y };
}

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
        if (isSelecting) {
          const width = e.clientX - selectionStart.x;
          const height = e.clientY - selectionStart.y;
          selectionBox.clear();
          selectionBox.rect(selectionStart.x, selectionStart.y, width, height);
          selectionBox.fill({ color: 0x0ea5e9, alpha: 0.15 });
          selectionBox.stroke({ width: 1, color: 0x0ea5e9, alpha: 0.8 });
        }
      });
      window.addEventListener('pointerup', (e) => {
        if (e.button === 1 || e.button === 2) {
          isPanning = false;
          canvasEl.style.cursor = 'default';
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
          
          const toSelect: string[] = [];
          for (const id in tokenSprites) {
            const t = tokenSprites[id].container;
            const globalPos = t.getGlobalPosition();
            if (selectRect.contains(globalPos.x, globalPos.y)) {
              toSelect.push(id);
            }
          }
          if (toSelect.length > 0) {
            selectTokensBulk(toSelect);
          }
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
        const wikiPath = e.dataTransfer?.getData('wikiPath');
        if (tokenId || wikiPath) {
          const rect = canvasEl.getBoundingClientRect();
          const dropX = e.clientX - rect.left;
          const dropY = e.clientY - rect.top;
          
          // Convert to world coordinates
          const worldPoint = viewport.toLocal({ x: dropX, y: dropY });
          
          // Snap to grid
          const config = getMapConfig();
          const snapped = snapToGrid(worldPoint.x, worldPoint.y, config);
          
          if (tokenId) {
            updateTokenPosition(tokenId, snapped.x, snapped.y);
          } else if (wikiPath) {
            window.dispatchEvent(new CustomEvent('spawn-token-from-wiki', {
              detail: {
                wikiPath,
                x: snapped.x,
                y: snapped.y
              }
            }));
          }
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
      viewport.addChild(grid);

      const drawGrid = () => {
        grid.clear();
        const config = getMapConfig();
        if (config.gridAlpha <= 0) return;
        
        let colorNum = 0x1e293b;
        if (config.gridColor.startsWith('#')) {
           colorNum = parseInt(config.gridColor.replace('#', '0x'), 16);
        }

        const size = config.gridSize;
        const range = 2500; // Limits grid to 5000x5000 bounds to prevent WebGL buffer overflow
        
        if (config.gridType === 'square') {
          grid.setStrokeStyle({ width: 1, color: colorNum, alpha: config.gridAlpha });
          for (let i = -range; i < range; i += size) {
            grid.moveTo(i, -range);
            grid.lineTo(i, range);
          }
          for (let j = -range; j < range; j += size) {
            grid.moveTo(-range, j);
            grid.lineTo(range, j);
          }
          grid.stroke();
        } else if (config.gridType === 'dots_square') {
          const radius = Math.max(2, size * 0.05);
          for (let i = -range; i < range; i += size) {
            for (let j = -range; j < range; j += size) {
               grid.rect(i - radius, j - radius, radius * 2, radius * 2);
            }
          }
          grid.fill({ color: colorNum, alpha: config.gridAlpha });
        } else if (config.gridType === 'hex_v' || config.gridType === 'hex_h') {
          grid.setStrokeStyle({ width: 1, color: colorNum, alpha: config.gridAlpha });
          const type = config.gridType;
          const stepX = (type === 'hex_v') ? size * Math.sqrt(3) : size * 1.5;
          const stepY = (type === 'hex_v') ? size * 1.5 : size * Math.sqrt(3);
          
          const drawnHexes = new Set<string>();
          for (let i = -range; i < range; i += stepX) {
            for (let j = -range; j < range; j += stepY) {
               const { q, r } = pixelToHex(i, j, type, size);
               const key = `${q},${r}`;
               if (drawnHexes.has(key)) continue;
               drawnHexes.add(key);

               const center = hexToPixel(q, r, type, size);
               for (let angle_i = 0; angle_i < 6; angle_i++) {
                 const angle_deg = type === 'hex_v' ? 60 * angle_i - 30 : 60 * angle_i;
                 const angle_rad = Math.PI / 180 * angle_deg;
                 const px = center.x + size * Math.cos(angle_rad);
                 const py = center.y + size * Math.sin(angle_rad);
                 if (angle_i === 0) grid.moveTo(px, py);
                 else grid.lineTo(px, py);
               }
               grid.closePath();
            }
          }
          grid.stroke();
        } else if (config.gridType === 'dots_hex') {
          const radius = Math.max(2, size * 0.05);
          const stepX = size * Math.sqrt(3);
          const stepY = size * 1.5;
          const drawnHexes = new Set<string>();
          for (let i = -range; i < range; i += stepX) {
            for (let j = -range; j < range; j += stepY) {
               const { q, r } = pixelToHex(i, j, 'hex_v', size);
               const key = `${q},${r}`;
               if (drawnHexes.has(key)) continue;
               drawnHexes.add(key);

               const center = hexToPixel(q, r, 'hex_v', size);
               grid.rect(center.x - radius, center.y - radius, radius * 2, radius * 2);
            }
          }
          grid.fill({ color: colorNum, alpha: config.gridAlpha });
        }
      };

      drawGrid();

      let draggingTokenId: string | null = null;
      let tokenDragOffsets: Record<string, {x: number, y: number}> = {};
      let tokenStartPositions: Record<string, {x: number, y: number}> = {};
      let tokensContainer = new Container();
      viewport.addChild(tokensContainer);

      interface TokenSpriteRecord {
        container: Container;
        glow: Graphics;
        hpFill: Graphics;
        targetRing: Graphics;
        selectionRing: Graphics;
        visualHash: string;
        hpBarY: number;
      }
      let tokenSprites: Record<string, TokenSpriteRecord> = {};

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

          const shape = t.tokenShape || 'circle';
          const scale = t.sizeScale ?? 1;
          const borderColHex = t.borderColor ? t.borderColor.replace('#', '0x') : '0x06b6d4';
          const borderCol = parseInt(borderColHex, 16);
          const glowColHex = t.borderColor ? t.borderColor.replace('#', '0x') : '0x0ea5e9';
          const glowCol = parseInt(glowColHex, 16);
          const hpBarMode = t.hpBarMode || 'always';
          const showName = t.showName || false;
          const activeConditions = t.status_efeitos || [];

          const visualHash = `${shape}_${t.borderColor || ''}_${t.imageUrl || ''}_${scale}_${showName}_${hpBarMode}_${t.name || ''}_${activeConditions.join(',')}`;

          // If visual state changed, destroy and recreate
          if (tokenSprites[id] && tokenSprites[id].visualHash !== visualHash) {
            tokensContainer.removeChild(tokenSprites[id].container);
            tokenSprites[id].container.destroy({ children: true });
            delete tokenSprites[id];
          }

          if (!tokenSprites[id]) {
            const token = new Container();
            
            // Base background and border
            const tokenBorder = new Graphics();
            drawTokenShape(tokenBorder, shape, 26, true, 0x020617);
            drawTokenShape(tokenBorder, shape, 26, false, borderCol, 3, 0.9);
            if (shape === 'standee') {
              tokenBorder.ellipse(0, 26 * 1.3, 26 * 0.9, 26 * 0.2);
              tokenBorder.fill(0x020617);
              tokenBorder.stroke({ width: 3, color: borderCol, alpha: 0.9 });
            }
            token.addChild(tokenBorder);

            // Async load portrait image (Support custom imageUrl)
            const imgPath = t.imageUrl ? t.imageUrl : (id === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg');
            
            Assets.load(imgPath).then((texture) => {
              if (isDestroyed || !tokenSprites[id]) return;
              const sprite = new Sprite(texture);
              sprite.anchor.set(0.5);
              
              if (shape === 'standee') {
                sprite.width = 44;
                sprite.height = 66;
                sprite.y = -2;
              } else {
                sprite.width = 50;
                sprite.height = 50;
                sprite.y = 0;
              }
              
              const mask = new Graphics();
              drawTokenShape(mask, shape, 24, true, 0xffffff);
              sprite.mask = mask;

              token.addChild(mask);
              token.addChild(sprite);
            }).catch(() => {});

            // Pulsing Neon Glow
            const glow = new Graphics();
            drawTokenShape(glow, shape, 30, false, glowCol, 6, 1);
            if (shape === 'standee') {
              glow.ellipse(0, 30 * 1.3, 30 * 0.9, 30 * 0.2);
              glow.stroke({ width: 6, color: glowCol, alpha: 1 });
            }
            token.addChild(glow);

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

              const selected = getSelectedTokens();
              if (!selected.includes(id)) {
                if (!e.shiftKey) clearTokenSelection();
                toggleTokenSelection(id, false);
              }

              draggingTokenId = id;
              tokenDragOffsets = {};
              
              const localPos = viewport.toLocal(e.global);
              const currentSelected = getSelectedTokens();
              currentSelected.forEach(selId => {
                const selToken = tokenSprites[selId]?.container;
                if (selToken) {
                  selToken.alpha = 0.5;
                  tokenDragOffsets[selId] = { x: selToken.x - localPos.x, y: selToken.y - localPos.y };
                  tokenStartPositions[selId] = { x: selToken.x, y: selToken.y };
                }
              });
            });

            // Prevent context menu on right click on tokens
            token.on('rightdown', (e) => e.stopPropagation());

            tokensContainer.addChild(token);
            tokenSprites[id] = { 
              container: token, 
              glow, 
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
               const selected = getSelectedTokens();
               if (selected.includes(id)) {
                  isBeingDragged = true;
               }
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
        });
      };

      state.tokens.observe(syncTokens);
      syncTokens();
      const mapConfigObserver = () => {
        drawGrid();
      };
      state.mapConfig.observe(mapConfigObserver);

      const updateSelectionVisuals = () => {
        const selected = getSelectedTokens();
        for (const id in tokenSprites) {
          if (tokenSprites[id] && tokenSprites[id].selectionRing) {
            tokenSprites[id].selectionRing.visible = selected.includes(id);
          }
        }
      };
      window.addEventListener('token-selection-updated', updateSelectionVisuals);

      (app as any)._yjsObserver = syncTokens;

      const onDragEnd = () => {
        if (!draggingTokenId) return;
        const leaderId = draggingTokenId;
        draggingTokenId = null;
        
        const currentSelected = getSelectedTokens();
        const config = getMapConfig();
        
        const leaderToken = tokenSprites[leaderId]?.container;
        if (!leaderToken) return;

        const leaderStart = tokenStartPositions[leaderId];
        const leaderSnapped = snapToGrid(leaderToken.x, leaderToken.y, config);
        
        const deltaX = leaderStart ? (leaderSnapped.x - leaderStart.x) : 0;
        const deltaY = leaderStart ? (leaderSnapped.y - leaderStart.y) : 0;

        currentSelected.forEach(selId => {
          const tokenData = tokenSprites[selId];
          if (!tokenData) return;
          const token = tokenData.container;
          token.alpha = 1;
          
          if (selId === leaderId) {
             token.x = leaderSnapped.x;
             token.y = leaderSnapped.y;
          } else {
             const startPos = tokenStartPositions[selId];
             if (startPos) {
                token.x = startPos.x + deltaX;
                token.y = startPos.y + deltaY;
             }
          }
          
          updateTokenPosition(selId, token.x, token.y);
        });
      };

      const handleNativeMove = (e: PointerEvent) => {
        const worldPoint = viewport.toLocal({ x: e.clientX, y: e.clientY });

        if (draggingTokenId) {
          const currentSelected = getSelectedTokens();
          currentSelected.forEach(selId => {
            const selToken = tokenSprites[selId]?.container;
            const offset = tokenDragOffsets[selId];
            if (selToken && offset) {
              selToken.x = worldPoint.x + offset.x;
              selToken.y = worldPoint.y + offset.y;
            }
          });
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
        window.removeEventListener('token-selection-updated', updateSelectionVisuals);
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
        if (e.button === 0) {
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
             if (!e.shiftKey) clearTokenSelection();
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
          
          // Adicionar o evento de resize para todos os cantos
          corner.on('pointerdown', (e) => {
            e.stopPropagation();

            let pivotX: number, pivotY: number, dirX: number;
            if (idx === 0) { pivotX = maxX; pivotY = maxY; dirX = -1; } // Top-Left
            else if (idx === 1) { pivotX = minX; pivotY = maxY; dirX = 1; } // Top-Right
            else if (idx === 2) { pivotX = maxX; pivotY = minY; dirX = -1; } // Bottom-Left
            else { pivotX = minX; pivotY = minY; dirX = 1; } // Bottom-Right

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
              const scaleRatio = Math.max(0.1, (dx * dirX) / origW);
              
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
              gizmoBox.stroke({ color: 0xa855f7, width: 2 / viewport.scale.x });
              
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
        });
      };

      state.backgrounds.observe(mapObserver);
      window.addEventListener('map-menu-toggle', mapObserver);
      window.addEventListener('bg-selection-updated', syncGizmo);
      window.addEventListener('map-menu-toggle', syncGizmo);

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
        window.removeEventListener('map-menu-toggle', mapObserver);
        window.removeEventListener('bg-selection-updated', syncGizmo);
        window.removeEventListener('map-menu-toggle', syncGizmo);
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
          const hpPercent = Math.max(0, tState.hp / (tState.maxHp || 1));
          const hpY = tokenData.hpBarY !== undefined ? tokenData.hpBarY + 1 : 36;
          tokenData.hpFill.clear();
          tokenData.hpFill.rect(-19, hpY, 38 * hpPercent, 4);
          tokenData.hpFill.fill(0xef4444);
          
          // LERP position if someone else moved it
          let isBeingDragged = false;
          if (draggingTokenId) {
             const selected = getSelectedTokens();
             if (selected.includes(id)) {
                isBeingDragged = true;
             }
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
