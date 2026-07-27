const fs = require('fs');

function migrateConfigUsages(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Replace config fetching
  content = content.replace(/Config\.getMapConfig\(\)/g, 'Config.getAll()');

  // Replace specific properties
  // Map props
  content = content.replace(/config\.gridSize/g, 'config.map.gridSize');
  content = content.replace(/config\.gridType/g, 'config.map.gridType');
  content = content.replace(/config\.gridColor/g, 'config.map.gridColor');
  content = content.replace(/config\.gridAlpha/g, 'config.map.gridAlpha');
  content = content.replace(/config\.mapBackgroundColor/g, 'config.map.mapBackgroundColor');

  // Fog props
  content = content.replace(/config\.fogOfWar/g, 'config.fog.enabled');
  content = content.replace(/config\.fowRadius/g, 'config.fog.radius');
  content = content.replace(/config\.fowShape/g, 'config.fog.shape');
  content = content.replace(/config\.fowColor/g, 'config.fog.color');
  content = content.replace(/config\.fowHideTokens/g, 'config.fog.hideTokens');

  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed config usages in ' + path);
}

migrateConfigUsages('src/engine/GameCanvas.tsx');
migrateConfigUsages('src/engine/renderers/fogRenderer.ts');
migrateConfigUsages('src/engine/renderers/gridRenderer.ts');
migrateConfigUsages('src/engine/renderers/rulerRenderer.ts');
