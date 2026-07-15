import re
import os

filepath = r'D:\DOZERO\src\components\Wiki\WikiGraph.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add visualStateRef
content = content.replace(
    '  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);',
    '''  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

  const visualStateRef = useRef({ isSearching, searchResults, settings, linkingSourceNode });
  useEffect(() => {
    visualStateRef.current = { isSearching, searchResults, settings, linkingSourceNode };
    if (simulationRef.current && simulationRef.current.alpha() < 0.05) {
      simulationRef.current.alpha(0.02).restart();
    }
  }, [isSearching, searchResults, settings, linkingSourceNode]);'''
)

# 2. Remove filteredData and use data
filter_data_regex = r"  // Filter Data\n  const filteredData = useMemo\(\(\) => \{.*?\n  \}, \[data, searchResults\]\);\n"
content = re.sub(filter_data_regex, "", content, flags=re.DOTALL)

content = content.replace(
    '    if (!canvasRef.current || filteredData.nodes.length === 0) return;',
    '    if (!canvasRef.current || data.nodes.length === 0) return;'
)

content = content.replace(
    '    const nodes = filteredData.nodes;',
    '    const nodes = data.nodes;'
)
content = content.replace(
    '    const links = filteredData.links.map(d => Object.assign({}, d));',
    '    const links = data.links.map(d => Object.assign({}, d));'
)

# 3. Replace render and drag and dependencies
render_start = content.index('    const render = () => {')
dependency_end = content.index('  }, [filteredData, dimensions, isSearching, settings, linkingSourceNode, onNodeClick]);') + len('  }, [filteredData, dimensions, isSearching, settings, linkingSourceNode, onNodeClick]);')

new_d3_section = '''    const render = () => {
      const vs = visualStateRef.current;
      context.save();
      context.clearRect(0, 0, width, height);
      context.translate(transformRef.current.x, transformRef.current.y);
      context.scale(transformRef.current.k, transformRef.current.k);
      
      const globalScale = transformRef.current.k;

      // Draw Links
      context.globalAlpha = vs.isSearching ? 0.4 : 1.0;
      links.forEach((d: any) => {
        context.beginPath();
        context.moveTo(d.source.x, d.source.y);
        context.lineTo(d.target.x, d.target.y);
        context.strokeStyle = vs.settings.linkColor;
        context.lineWidth = vs.settings.linkWidth / globalScale;
        context.stroke();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const size = node.val || 10;
        
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
        
        // Draw Label
        if (globalScale >= 1.2 || nodes.length < 50) {
          context.restore(); // Undo clip for text
          context.save();
          context.translate(transformRef.current.x, transformRef.current.y);
          context.scale(transformRef.current.k, transformRef.current.k);
          
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
        }
        
        context.restore(); // Restore global context translation
        context.save();
        context.translate(transformRef.current.x, transformRef.current.y);
        context.scale(transformRef.current.k, transformRef.current.k);
      });
      
      context.restore(); // Final restore
    };

    simulation.on("tick", render);

    // D3 Zoom & Pan
    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        render();
      });
      
    d3.select(canvas).call(zoom);

    // Node hit detection
    const getNodeAt = (x: number, y: number) => {
      const transform = transformRef.current;
      const invX = transform.invertX(x);
      const invY = transform.invertY(y);
      let found: NodeData | null = null;
      
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        const size = node.val || 10;
        const dx = invX - node.x!;
        const dy = invY - node.y!;
        if (dx * dx + dy * dy < size * size) {
          found = node;
          break;
        }
      }
      return found;
    };

    // D3 Drag
    const drag = d3.drag<HTMLCanvasElement, unknown>()
      .subject((event) => {
        const node = getNodeAt(event.sourceEvent.offsetX, event.sourceEvent.offsetY);
        if (node) {
          return { x: event.sourceEvent.offsetX, y: event.sourceEvent.offsetY, node: node };
        }
        return null;
      })
      .on("start", (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        const subject = event.subject as any;
        const node = subject.node;
        node.fx = node.x;
        node.fy = node.y;
      })
      .on("drag", (event) => {
        const subject = event.subject as any;
        const node = subject.node;
        if (node) {
          node.fx = transformRef.current.invertX(event.x);
          node.fy = transformRef.current.invertY(event.y);
        }
      })
      .on("end", (event) => {
        if (!event.active) simulation.alphaTarget(0);
        const subject = event.subject as any;
        const node = subject.node;
        if (node) {
          node.fx = null;
          node.fy = null;
        }
      });

    d3.select(canvas).call(drag);

    // Click / Right Click
    const handleClick = (e: MouseEvent) => {
      const vs = visualStateRef.current;
      const node = getNodeAt(e.offsetX, e.offsetY);
      if (node && !vs.linkingSourceNode) {
        window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: node.path }));
        if (onNodeClick) onNodeClick(node);
      }
    };
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const vs = visualStateRef.current;
      const node = getNodeAt(e.offsetX, e.offsetY);
      if (node) {
        if (!vs.linkingSourceNode) {
          setLinkingSourceNode(node);
        } else if (vs.linkingSourceNode.id !== node.id) {
          linkNodes(vs.linkingSourceNode, node);
          setLinkingSourceNode(null);
        } else {
          setLinkingSourceNode(null); // Cancel
        }
      } else {
        setLinkingSourceNode(null);
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      simulation.stop();
      d3.select(canvas).on(".zoom", null);
      d3.select(canvas).on(".drag", null);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [data, dimensions, onNodeClick]);'''

content = content[:render_start] + new_d3_section + content[dependency_end:]

# 4. Fix TS error repoPath -> repoUrl
content = content.replace(
    'const { repoPath } = getWikiConfig();',
    'const { repoUrl } = getWikiConfig();\n      const repoPath = repoUrl;'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch successful!")
