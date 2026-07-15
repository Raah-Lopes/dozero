const fs = require('fs');

let code = fs.readFileSync('D:/DOZERO/src/components/Wiki/WikiGraph.tsx', 'utf8');

code = code.replace('import ForceGraph2D from \'react-force-graph-2d\';', 'import ForceGraph from \'force-graph\';');

const fgStart = code.indexOf('<ForceGraph2D');
const beforeFg = code.substring(0, fgStart);

const endOfFg = code.indexOf('/>', fgStart) + 2;
const afterFg = code.substring(endOfFg);

const refLine = 'const fgRef = useRef<any>(null);';
const refIndex = beforeFg.indexOf(refLine);

let newCode = beforeFg.substring(0, refIndex + refLine.length) + '\n  const graphContainerRef = useRef<HTMLDivElement>(null);\n';
const restBeforeFg = beforeFg.substring(refIndex + refLine.length);

const returnLine = 'return (';
const returnIndex = restBeforeFg.lastIndexOf(returnLine);

const beforeReturn = restBeforeFg.substring(0, returnIndex);
const afterReturn = restBeforeFg.substring(returnIndex);

const d3Hooks = `
  useEffect(() => {
    if (!graphContainerRef.current) return;
    const graph = ForceGraph()(graphContainerRef.current);
    fgRef.current = graph;
    return () => {
      graph._destructor();
    };
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;
    const graph = fgRef.current;
    
    graph
      .width(dimensions.width)
      .height(dimensions.height)
      .graphData(filteredData)
      .nodeLabel('name')
      .nodeColor((node) => node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor)
      .linkColor(() => settings.linkColor)
      .linkWidth(settings.linkWidth)
      .backgroundColor('transparent')
      .onNodeClick(handleNodeClick)
      .onNodeRightClick(handleNodeRightClick)
      .onLinkRightClick(handleLinkRightClick)
      .linkDirectionalParticles(settings.particleCount)
      .linkDirectionalParticleWidth(settings.linkWidth * 1.5)
      .linkDirectionalParticleSpeed(0.008)
      .linkCanvasObjectMode(() => 'replace')
      .linkCanvasObject((link, ctx, globalScale) => {
            const start = link.source;
            const end = link.target;
            
            if (typeof start !== 'object' || typeof end !== 'object') return;
            if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return;
            if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) return;

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = settings.linkColor || 'rgba(168, 85, 247, 0.4)';
            ctx.lineWidth = (settings.linkWidth || 1) / Math.max(1, globalScale * 0.5);
            ctx.stroke();

            if (!link.label) return;

            const textPos = {
              x: start.x + (end.x - start.x) / 2,
              y: start.y + (end.y - start.y) / 2
            };
            
            const relLink = { x: end.x - start.x, y: end.y - start.y };
            let textAngle = Math.atan2(relLink.y, relLink.x);
            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

            const fontSize = (settings.fontSizeBase * 0.8) / globalScale;
            ctx.font = \`\${fontSize}px Inter, sans-serif\`;
            const textWidth = ctx.measureText(link.label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.save();
            ctx.translate(textPos.x, textPos.y);
            ctx.rotate(textAngle);
            
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(link.label, 0, 0);
            ctx.restore();
      })
      .nodeCanvasObject((node, ctx, globalScale) => {
            if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
            const size = 16; 

            const drawShape = () => {
              ctx.beginPath();
              if (settings.nodeShape === 'square') {
                ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
              } else if (settings.nodeShape === 'shield') {
                const x = node.x; const y = node.y;
                ctx.moveTo(x - size, y - size);
                ctx.lineTo(x + size, y - size);
                ctx.lineTo(x + size, y + size * 0.2);
                ctx.quadraticCurveTo(x + size, y + size, x, y + size);
                ctx.quadraticCurveTo(x - size, y + size, x - size, y + size * 0.2);
                ctx.lineTo(x - size, y - size);
                ctx.closePath();
              } else if (settings.nodeShape === 'hexagon') {
                const x = node.x; const y = node.y;
                ctx.moveTo(x, y - size);
                ctx.lineTo(x + size * 0.866, y - size * 0.5);
                ctx.lineTo(x + size * 0.866, y + size * 0.5);
                ctx.lineTo(x, y + size);
                ctx.lineTo(x - size * 0.866, y + size * 0.5);
                ctx.lineTo(x - size * 0.866, y - size * 0.5);
                ctx.closePath();
              } else {
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.closePath();
              }
            };

            if (node.avatar) {
              if (!imageCache[node.id]) {
                const img = new Image();
                const config = getWikiConfig();
                const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
                img.src = \`/api/wiki/raw?repoPath=\${encodeURIComponent(repoPath)}&path=\${encodeURIComponent(node.avatar)}&t=\${Date.now()}\`;
                
                imageCache[node.id] = { img, status: 'loading' };
                
                img.onload = () => {
                   if (imageCache[node.id]) imageCache[node.id].status = 'loaded';
                   setRenderTrigger(prev => prev + 1);
                };
                img.onerror = () => {
                   if (imageCache[node.id]) imageCache[node.id].status = 'error';
                };
              }

              const cached = imageCache[node.id];
              if (cached && cached.status === 'loaded' && cached.img.naturalWidth !== 0) {
                ctx.save();
                drawShape();
                ctx.strokeStyle = node.id === (typeof linkingSourceNode !== 'undefined' && linkingSourceNode?.id) ? '#facc15' : (node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor);
                ctx.lineWidth = node.id === (typeof linkingSourceNode !== 'undefined' && linkingSourceNode?.id) ? 4 : 2;
                ctx.stroke();
                ctx.clip();
                ctx.drawImage(cached.img, node.x - size, node.y - size, size * 2, size * 2);
                ctx.restore();
              } else {
                drawShape();
                ctx.fillStyle = node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor;
                ctx.fill();
                ctx.strokeStyle = node.id === (typeof linkingSourceNode !== 'undefined' && linkingSourceNode?.id) ? '#facc15' : 'rgba(255,255,255,0.2)';
                ctx.lineWidth = node.id === (typeof linkingSourceNode !== 'undefined' && linkingSourceNode?.id) ? 4 : 1.5;
                ctx.stroke();
              }
            } else {
              drawShape();
              ctx.fillStyle = node.group === '.' ? settings.nodePrimaryColor : settings.nodeSecondaryColor;
              ctx.fill();
              ctx.strokeStyle = node.id === (typeof linkingSourceNode !== 'undefined' && linkingSourceNode?.id) ? '#facc15' : 'rgba(255,255,255,0.2)';
              ctx.lineWidth = node.id === (typeof linkingSourceNode !== 'undefined' && linkingSourceNode?.id) ? 4 : 1.5;
              ctx.stroke();
            }

            if (globalScale >= 1.2 || filteredData.nodes.length < 50) {
              const label = node.name;
              const fontSize = Math.max(10, settings.fontSizeBase / globalScale);
              ctx.font = \`\${fontSize}px Inter, sans-serif\`;
              
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

              ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + size + 2, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.fillText(label, node.x, node.y + size + 2 + bckgDimensions[1] / 2);
              
              node.__bckgDimensions = bckgDimensions;
            } else {
              node.__bckgDimensions = null;
            }
      })
      .onNodeDragEnd((node) => {
        delete node.fx;
        delete node.fy;
        graph.d3ReheatSimulation();
      })
      .nodePointerAreaPaint((node, color, ctx) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, 2 * Math.PI);
        ctx.fill();
      });
  }, [filteredData, dimensions, settings, handleNodeClick, handleNodeRightClick, handleLinkRightClick]);
`;

const newCodeFinal = newCode + beforeReturn + d3Hooks + '\n  ' + afterReturn + '<div ref={graphContainerRef} style={{ width: \'100%\', height: \'100%\' }} />\n' + afterFg;

fs.writeFileSync('D:/DOZERO/src/components/Wiki/WikiGraph.tsx', newCodeFinal);
console.log('Patched WikiGraph.tsx');
