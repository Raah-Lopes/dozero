import re

filepath = r'D:\DOZERO\src\components\Wiki\WikiGraph.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Container and Canvas CSS to prevent ResizeObserver layout loops
content = content.replace(
    '''<div ref={containerRef} className="wiki-graph-container" style={{ width: '100%', height: '100%', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.3s', touchAction: 'none' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }} />''',
    '''<div ref={containerRef} className="wiki-graph-container" style={{ width: '100%', height: '100%', opacity: isSearching ? 0.5 : 1, transition: 'opacity 0.3s', touchAction: 'none', position: 'relative', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'grab' }} />'''
)

# Fix 2: Safe Dimensions update to prevent unnecessary re-renders
content = content.replace(
    '''        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });''',
    '''        setDimensions(prev => {
          if (prev.width === containerRef.current!.clientWidth && prev.height === containerRef.current!.clientHeight) return prev;
          return {
            width: containerRef.current!.clientWidth,
            height: containerRef.current!.clientHeight
          };
        });'''
)

# Fix 3: Clean Context Save/Restore inside render loop
# Find the render loop and rewrite the node drawing safely
render_loop_regex = r"      // Draw Nodes\n      nodes\.forEach\(\(node\) => \{.*?\n      \}\);\n      \n      context\.restore\(\); // Final restore"

new_render_loop = '''      // Draw Nodes
      nodes.forEach((node) => {
        const size = node.val || 10;
        
        context.save(); // Save global transform state for this node
        context.globalAlpha = 1.0;
        if (vs.searchResults && !vs.searchResults.includes(node.id)) {
          context.globalAlpha = 0.2;
        }

        context.beginPath();
        if (node.avatar && imageCache.has(node.avatar)) {
          const cached = imageCache.get(node.avatar);
          if (cached && cached.loaded) {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
            context.lineWidth = node.id === vs.linkingSourceNode?.id ? 4 : 2;
            context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#facc15' : 'rgba(255,255,255,0.8)';
            context.stroke();
            context.clip();
            context.drawImage(cached.img, node.x! - size, node.y! - size, size * 2, size * 2);
          } else {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
            context.fillStyle = node.group === '.' ? vs.settings.nodePrimaryColor : vs.settings.nodeSecondaryColor;
            context.fill();
          }
        } else {
          // No avatar
          if (node.group === '.') {
            context.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
          } else {
            context.rect(node.x! - size, node.y! - size, size * 2, size * 2);
          }
          context.fillStyle = node.group === '.' ? vs.settings.nodePrimaryColor : vs.settings.nodeSecondaryColor;
          context.fill();
          context.strokeStyle = node.id === vs.linkingSourceNode?.id ? '#facc15' : 'rgba(255,255,255,0.2)';
          context.lineWidth = node.id === vs.linkingSourceNode?.id ? 4 : 1.5;
          context.stroke();
        }
        
        context.restore(); // Restore to remove any clip masks applied above
        
        // Draw Label
        if (globalScale >= 1.2 || nodes.length < 50) {
          context.save(); // Push global transform again to draw text
          if (vs.searchResults && !vs.searchResults.includes(node.id)) {
            context.globalAlpha = 0.2;
          }

          const label = node.name;
          const fontSize = vs.settings.fontSizeBase / globalScale;
          context.font = `${fontSize}px Inter, sans-serif`;
          
          const textWidth = context.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          context.fillStyle = 'rgba(15, 23, 42, 0.8)';
          context.fillRect(node.x! - bckgDimensions[0] / 2, node.y! + size + 2, bckgDimensions[0], bckgDimensions[1]);

          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = 'rgba(255, 255, 255, 0.9)';
          context.fillText(label, node.x!, node.y! + size + 2 + bckgDimensions[1] / 2);
          node.__bckgDimensions = bckgDimensions;
          context.restore(); // Pop text state
        }
      });
      
      context.restore(); // Final restore (pops the global translation/scale applied at the top of render)'''

content = re.sub(render_loop_regex, new_render_loop, content, flags=re.DOTALL)

# Fix 4: Drag Subject pointer coordinates
content = content.replace(
    '''      .subject((event) => {
        const node = getNodeAt(event.sourceEvent.offsetX, event.sourceEvent.offsetY);
        if (node) {
          return { x: event.sourceEvent.offsetX, y: event.sourceEvent.offsetY, node: node };
        }
        return null;
      })''',
    '''      .subject((event) => {
        const node = getNodeAt(event.x, event.y);
        if (node) {
          return { x: event.x, y: event.y, node: node };
        }
        return null;
      })'''
)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch 2 successful!")
